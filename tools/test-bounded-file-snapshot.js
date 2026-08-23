"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs/promises");
const path = require("node:path");
const { readBoundedFileSnapshot, readBoundedFileSnapshotSync } = require("./lib/bounded-file-snapshot");

async function assertSnapshotError(promise, code) {
  await assert.rejects(promise, (error) => error?.code === code);
}

async function main() {
  const acceptanceRoot = path.join(__dirname, "..", "_acceptance");
  await fs.mkdir(acceptanceRoot, { recursive: true });
  const root = await fs.mkdtemp(path.join(acceptanceRoot, ".bounded-file-snapshot-"));
  try {
    const normalPath = path.join(root, "normal.txt");
    await fs.writeFile(normalPath, "safe text", "utf8");
    const snapshot = await readBoundedFileSnapshot(normalPath, { maxBytes: 32 });
    assert.deepEqual(snapshot.bytes, [...Buffer.from("safe text")]);
    assert.equal(snapshot.text, "safe text");
    assert.equal(
      snapshot.digest,
      `sha256:${crypto.createHash("sha256").update("safe text").digest("hex")}`
    );
    assert.equal(snapshot.metadata.size, 9);
    assert(Object.isFrozen(snapshot));
    assert(Object.isFrozen(snapshot.bytes));
    assert(Object.isFrozen(snapshot.metadata));
    const syncSnapshot = readBoundedFileSnapshotSync(normalPath, { maxBytes: 32 });
    assert.equal(syncSnapshot.text, "safe text");

    const limitPath = path.join(root, "limit.txt");
    await fs.writeFile(limitPath, "abc", "utf8");
    await assertSnapshotError(
      readBoundedFileSnapshot(limitPath, {
        maxBytes: 3,
        beforeRead: async () => fs.writeFile(limitPath, "abcd", "utf8"),
      }),
      "ERR_BOUNDED_FILE_SNAPSHOT_TOO_LARGE"
    );

    const invalidUtf8Path = path.join(root, "invalid-utf8.bin");
    await fs.writeFile(invalidUtf8Path, Buffer.from([0xc3, 0x28]));
    await assertSnapshotError(
      readBoundedFileSnapshot(invalidUtf8Path, { maxBytes: 16 }),
      "ERR_BOUNDED_FILE_SNAPSHOT_INVALID_UTF8"
    );
    const binarySnapshot = readBoundedFileSnapshotSync(invalidUtf8Path, { maxBytes: 16, decodeUtf8: false });
    assert.deepEqual(binarySnapshot.bytes, [0xc3, 0x28]);

    await assertSnapshotError(
      readBoundedFileSnapshot(root, { maxBytes: 16 }),
      "ERR_BOUNDED_FILE_SNAPSHOT_NOT_REGULAR"
    );

    const changingPath = path.join(root, "changing.txt");
    await fs.writeFile(changingPath, "before", "utf8");
    await assertSnapshotError(
      readBoundedFileSnapshot(changingPath, {
        maxBytes: 32,
        beforeRead: async () => fs.writeFile(changingPath, "after-change", "utf8"),
      }),
      "ERR_BOUNDED_FILE_SNAPSHOT_CHANGED"
    );
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
}

main()
  .then(() => console.log("[bounded-file-snapshot] PASS bounded, UTF-8, regular-file, and change protections"))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
