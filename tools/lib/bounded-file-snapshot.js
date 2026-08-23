"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const { constants: bufferConstants } = require("node:buffer");
const { TextDecoder } = require("node:util");

const DEFAULT_MAX_BYTES = 1024 * 1024;

function snapshotError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function assertMaxBytes(maxBytes) {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 0 || maxBytes >= bufferConstants.MAX_LENGTH) {
    throw snapshotError(
      "ERR_BOUNDED_FILE_SNAPSHOT_MAX_BYTES",
      `maxBytes must be a non-negative safe integer smaller than ${bufferConstants.MAX_LENGTH}`
    );
  }
}

function metadataFromStat(stat) {
  return Object.freeze({
    size: stat.size,
    mtimeMs: stat.mtimeMs,
    ctimeMs: stat.ctimeMs,
    ino: stat.ino,
    dev: stat.dev,
  });
}

function hasReliablePosixIdentity(metadata) {
  return process.platform !== "win32" && metadata.ino !== 0 && metadata.dev !== 0;
}

function sameMetadata(before, after) {
  if (
    before.size !== after.size ||
    before.mtimeMs !== after.mtimeMs ||
    before.ctimeMs !== after.ctimeMs
  ) {
    return false;
  }

  // Windows does expose ino/dev, but their stability is not a portable identity contract.
  // Size, timestamps, and the already-open handle remain mandatory on every platform.
  return !hasReliablePosixIdentity(before) || (before.ino === after.ino && before.dev === after.dev);
}

function assertRegularStat(stat, filePath) {
  if (!stat.isFile()) {
    throw snapshotError(
      "ERR_BOUNDED_FILE_SNAPSHOT_NOT_REGULAR",
      `Refusing to snapshot non-regular file: ${filePath}`
    );
  }
}

function decodeContent(content, filePath, decodeUtf8) {
  if (!decodeUtf8) return null;
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(content);
  } catch {
    throw snapshotError(
      "ERR_BOUNDED_FILE_SNAPSHOT_INVALID_UTF8",
      `File is not valid UTF-8: ${filePath}`
    );
  }
}

function snapshotValue(content, text, metadata) {
  const bytes = Object.freeze(Array.from(content));
  return Object.freeze({
    bytes,
    text,
    digest: `sha256:${crypto.createHash("sha256").update(content).digest("hex")}`,
    metadata,
  });
}

function openFlags() {
  const noFollow = Number.isInteger(fs.constants.O_NOFOLLOW) ? fs.constants.O_NOFOLLOW : 0;
  return fs.constants.O_RDONLY | noFollow;
}

async function assertPathMatchesHandle(filePath, handleMetadata) {
  const pathStat = await fs.promises.lstat(filePath);
  if (pathStat.isSymbolicLink()) {
    throw snapshotError(
      "ERR_BOUNDED_FILE_SNAPSHOT_SYMLINK",
      `Refusing symbolic link snapshot: ${filePath}`
    );
  }
  assertRegularStat(pathStat, filePath);

  if (!sameMetadata(handleMetadata, metadataFromStat(pathStat))) {
    throw snapshotError(
      "ERR_BOUNDED_FILE_SNAPSHOT_PATH_CHANGED",
      `Path no longer matches the opened file: ${filePath}`
    );
  }
}

/**
 * Read one UTF-8 regular file through a verified descriptor, returning an immutable value snapshot.
 *
 * @param {string | Buffer | URL} filePath
 * @param {{ maxBytes?: number, decodeUtf8?: boolean, beforeRead?: (context: { metadata: Readonly<object> }) => Promise<void> | void }} [options]
 * @returns {Promise<Readonly<{ bytes: readonly number[], text: string | null, digest: string, metadata: Readonly<object> }>>}
 */
async function readBoundedFileSnapshot(filePath, options = {}) {
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;
  assertMaxBytes(maxBytes);

  const initialPathStat = await fs.promises.lstat(filePath);
  if (initialPathStat.isSymbolicLink()) {
    throw snapshotError(
      "ERR_BOUNDED_FILE_SNAPSHOT_SYMLINK",
      `Refusing symbolic link snapshot: ${filePath}`
    );
  }
  assertRegularStat(initialPathStat, filePath);

  // FileHandle.stat() is fstat on this opened descriptor, not a path re-stat.
  const handle = await fs.promises.open(filePath, openFlags());
  try {
    const openedStat = await handle.stat();
    assertRegularStat(openedStat, filePath);
    const before = metadataFromStat(openedStat);
    await assertPathMatchesHandle(filePath, before);

    if (before.size > maxBytes) {
      throw snapshotError(
        "ERR_BOUNDED_FILE_SNAPSHOT_TOO_LARGE",
        `File exceeds the ${maxBytes}-byte snapshot limit: ${filePath}`
      );
    }

    if (options.beforeRead !== undefined) {
      if (typeof options.beforeRead !== "function") {
        throw new TypeError("beforeRead must be a function when provided");
      }
      await options.beforeRead({ metadata: before });
    }

    const chunks = [];
    let bytesRead = 0;
    while (bytesRead <= maxBytes) {
      const capacity = Math.min(64 * 1024, maxBytes + 1 - bytesRead);
      if (capacity <= 0) break;
      const chunk = Buffer.allocUnsafe(capacity);
      const result = await handle.read(chunk, 0, capacity, bytesRead);
      if (result.bytesRead === 0) break;
      chunks.push(chunk.subarray(0, result.bytesRead));
      bytesRead += result.bytesRead;
    }
    if (bytesRead > maxBytes) throw snapshotError(
      "ERR_BOUNDED_FILE_SNAPSHOT_TOO_LARGE",
      `File exceeds the ${maxBytes}-byte snapshot limit: ${filePath}`
    );

    const after = metadataFromStat(await handle.stat());
    if (!sameMetadata(before, after)) {
      throw snapshotError(
        "ERR_BOUNDED_FILE_SNAPSHOT_CHANGED",
        `File changed while it was being read: ${filePath}`
      );
    }
    await assertPathMatchesHandle(filePath, after);

    const content = Buffer.concat(chunks, bytesRead);
    return snapshotValue(content, decodeContent(content, filePath, options.decodeUtf8 !== false), before);
  } finally {
    await handle.close();
  }
}

function assertPathMatchesHandleSync(filePath, handleMetadata) {
  const pathStat = fs.lstatSync(filePath);
  if (pathStat.isSymbolicLink()) throw snapshotError(
    "ERR_BOUNDED_FILE_SNAPSHOT_SYMLINK",
    `Refusing symbolic link snapshot: ${filePath}`
  );
  assertRegularStat(pathStat, filePath);
  if (!sameMetadata(handleMetadata, metadataFromStat(pathStat))) throw snapshotError(
    "ERR_BOUNDED_FILE_SNAPSHOT_PATH_CHANGED",
    `Path no longer matches the opened file: ${filePath}`
  );
}

function readBoundedFileSnapshotSync(filePath, options = {}) {
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;
  assertMaxBytes(maxBytes);
  const initialPathStat = fs.lstatSync(filePath);
  if (initialPathStat.isSymbolicLink()) throw snapshotError(
    "ERR_BOUNDED_FILE_SNAPSHOT_SYMLINK",
    `Refusing symbolic link snapshot: ${filePath}`
  );
  assertRegularStat(initialPathStat, filePath);
  const descriptor = fs.openSync(filePath, openFlags());
  try {
    const openedStat = fs.fstatSync(descriptor);
    assertRegularStat(openedStat, filePath);
    const before = metadataFromStat(openedStat);
    assertPathMatchesHandleSync(filePath, before);
    if (before.size > maxBytes) throw snapshotError(
      "ERR_BOUNDED_FILE_SNAPSHOT_TOO_LARGE",
      `File exceeds the ${maxBytes}-byte snapshot limit: ${filePath}`
    );
    if (options.beforeRead !== undefined) {
      if (typeof options.beforeRead !== "function") throw new TypeError("beforeRead must be a function when provided");
      options.beforeRead({ metadata: before });
    }
    const chunks = [];
    let total = 0;
    while (total <= maxBytes) {
      const capacity = Math.min(64 * 1024, maxBytes + 1 - total);
      if (capacity <= 0) break;
      const chunk = Buffer.allocUnsafe(capacity);
      const read = fs.readSync(descriptor, chunk, 0, capacity, total);
      if (read === 0) break;
      chunks.push(chunk.subarray(0, read));
      total += read;
    }
    if (total > maxBytes) throw snapshotError(
      "ERR_BOUNDED_FILE_SNAPSHOT_TOO_LARGE",
      `File exceeds the ${maxBytes}-byte snapshot limit: ${filePath}`
    );
    const after = metadataFromStat(fs.fstatSync(descriptor));
    if (!sameMetadata(before, after)) throw snapshotError(
      "ERR_BOUNDED_FILE_SNAPSHOT_CHANGED",
      `File changed while it was being read: ${filePath}`
    );
    assertPathMatchesHandleSync(filePath, after);
    const content = Buffer.concat(chunks, total);
    return snapshotValue(content, decodeContent(content, filePath, options.decodeUtf8 !== false), before);
  } finally {
    fs.closeSync(descriptor);
  }
}

module.exports = {
  DEFAULT_MAX_BYTES,
  readBoundedFileSnapshot,
  readBoundedFileSnapshotSync,
};
