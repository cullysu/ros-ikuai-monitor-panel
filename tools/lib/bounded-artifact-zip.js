'use strict';

// Small, dependency-free ZIP reader for release evidence. GitHub artifact
// archives are untrusted remote input: keep both compressed and expanded work
// bounded, reject ambiguous paths, and never write extracted data to disk.
const zlib = require('node:zlib');

const MAX_ARCHIVE_BYTES = 128 * 1024 * 1024;
const MAX_ENTRY_BYTES = 64 * 1024 * 1024;
const MAX_TOTAL_BYTES = 192 * 1024 * 1024;
const MAX_ENTRIES = 4096;

class ArtifactZipError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'ArtifactZipError';
    this.code = code;
  }
}

function fail(code, message) {
  throw new ArtifactZipError(code, message);
}

function normalizedEntryName(name) {
  if (!name || name.includes('\0') || name.includes('\\') || name.startsWith('/') || /^[A-Za-z]:/.test(name)) {
    fail('ZIP_UNSAFE_PATH', 'Artifact ZIP contains an unsafe entry path.');
  }
  const parts = name.split('/');
  if (parts.some((part) => !part || part === '.' || part === '..')) {
    fail('ZIP_UNSAFE_PATH', 'Artifact ZIP contains an unsafe entry path.');
  }
  return name;
}

function findEocd(buffer) {
  const start = Math.max(0, buffer.length - 0xffff - 22);
  for (let offset = buffer.length - 22; offset >= start; offset -= 1) {
    if (buffer.readUInt32LE(offset) === 0x06054b50) return offset;
  }
  fail('ZIP_INVALID', 'Artifact ZIP has no end-of-central-directory record.');
}

function readEntries(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) fail('ZIP_EMPTY', 'Artifact ZIP is empty.');
  if (buffer.length > MAX_ARCHIVE_BYTES) fail('ZIP_TOO_LARGE', 'Artifact ZIP exceeds the compressed-size limit.');
  const eocd = findEocd(buffer);
  const disk = buffer.readUInt16LE(eocd + 4);
  const centralDisk = buffer.readUInt16LE(eocd + 6);
  const count = buffer.readUInt16LE(eocd + 10);
  const centralSize = buffer.readUInt32LE(eocd + 12);
  const centralOffset = buffer.readUInt32LE(eocd + 16);
  if (disk !== 0 || centralDisk !== 0 || count === 0xffff || centralSize === 0xffffffff || centralOffset === 0xffffffff) {
    fail('ZIP_UNSUPPORTED', 'Artifact ZIP uses unsupported multi-disk or ZIP64 metadata.');
  }
  if (count === 0 || count > MAX_ENTRIES || centralOffset + centralSize > eocd) fail('ZIP_INVALID', 'Artifact ZIP central directory is invalid.');
  const entries = [];
  let cursor = centralOffset;
  for (let index = 0; index < count; index += 1) {
    if (cursor + 46 > centralOffset + centralSize || buffer.readUInt32LE(cursor) !== 0x02014b50) fail('ZIP_INVALID', 'Artifact ZIP central directory entry is invalid.');
    const flags = buffer.readUInt16LE(cursor + 8);
    const method = buffer.readUInt16LE(cursor + 10);
    const compressedSize = buffer.readUInt32LE(cursor + 20);
    const uncompressedSize = buffer.readUInt32LE(cursor + 24);
    const nameLength = buffer.readUInt16LE(cursor + 28);
    const extraLength = buffer.readUInt16LE(cursor + 30);
    const commentLength = buffer.readUInt16LE(cursor + 32);
    const localOffset = buffer.readUInt32LE(cursor + 42);
    const end = cursor + 46 + nameLength + extraLength + commentLength;
    if (end > centralOffset + centralSize || flags & 1 || (method !== 0 && method !== 8)) fail('ZIP_UNSUPPORTED', 'Artifact ZIP uses unsupported encryption or compression.');
    if (uncompressedSize > MAX_ENTRY_BYTES || compressedSize > MAX_ARCHIVE_BYTES) fail('ZIP_BOMB', 'Artifact ZIP entry exceeds bounded extraction limits.');
    const name = normalizedEntryName(buffer.subarray(cursor + 46, cursor + 46 + nameLength).toString('utf8'));
    if (name.endsWith('/')) fail('ZIP_UNSAFE_PATH', 'Artifact ZIP directory entries are not permitted.');
    entries.push({ name, method, compressedSize, uncompressedSize, localOffset });
    cursor = end;
  }
  if (cursor !== centralOffset + centralSize) fail('ZIP_INVALID', 'Artifact ZIP central directory has trailing data.');
  return entries;
}

function readBoundedZip(buffer) {
  const entries = readEntries(buffer);
  const files = new Map();
  let total = 0;
  for (const entry of entries) {
    if (files.has(entry.name)) fail('ZIP_DUPLICATE_PATH', 'Artifact ZIP contains duplicate entry paths.');
    const local = entry.localOffset;
    if (local + 30 > buffer.length || buffer.readUInt32LE(local) !== 0x04034b50) fail('ZIP_INVALID', 'Artifact ZIP local entry is invalid.');
    const nameLength = buffer.readUInt16LE(local + 26);
    const extraLength = buffer.readUInt16LE(local + 28);
    const dataStart = local + 30 + nameLength + extraLength;
    const dataEnd = dataStart + entry.compressedSize;
    if (dataEnd > buffer.length) fail('ZIP_INVALID', 'Artifact ZIP entry extends beyond archive bounds.');
    const localName = buffer.subarray(local + 30, local + 30 + nameLength).toString('utf8');
    if (localName !== entry.name) fail('ZIP_INVALID', 'Artifact ZIP local and central entry paths disagree.');
    let data;
    try {
      data = entry.method === 0
        ? Buffer.from(buffer.subarray(dataStart, dataEnd))
        : zlib.inflateRawSync(buffer.subarray(dataStart, dataEnd), { maxOutputLength: MAX_ENTRY_BYTES });
    } catch {
      fail('ZIP_DEFLATE_INVALID', 'Artifact ZIP entry cannot be safely decompressed.');
    }
    if (data.length !== entry.uncompressedSize || data.length > MAX_ENTRY_BYTES) fail('ZIP_INVALID', 'Artifact ZIP entry size does not match its metadata.');
    total += data.length;
    if (total > MAX_TOTAL_BYTES) fail('ZIP_BOMB', 'Artifact ZIP exceeds the total extraction-size limit.');
    files.set(entry.name, data);
  }
  return files;
}

module.exports = { ArtifactZipError, MAX_ARCHIVE_BYTES, MAX_ENTRY_BYTES, MAX_TOTAL_BYTES, readBoundedZip };
