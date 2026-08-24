#!/usr/bin/env node
'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const ALLOWED_BIT_DEPTHS = new Set([1, 2, 4, 8, 16]);
const ALLOWED_COLOR_TYPES = new Set([0, 2, 3, 4, 6]);

function portablePath(value) {
  return String(value || '').split(path.sep).join('/');
}

function isPathInside(parent, candidate) {
  const relative = path.relative(path.resolve(parent), path.resolve(candidate));
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (let offset = 0; offset < buffer.length; offset += 1) {
    crc ^= buffer[offset];
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// Decode the complete PNG chunk stream, including every CRC and the mandatory
// IHDR/IDAT/IEND contracts.  This intentionally rejects a renamed or appended
// non-PNG file even though it also exposes width and height early.
function decodePngIdentity(file) {
  const body = fs.readFileSync(file);
  if (body.length < 57 || !body.subarray(0, 8).equals(PNG_SIGNATURE)) {
    throw new Error(`file is not a PNG: ${portablePath(file)}`);
  }
  let offset = 8;
  let sawHeader = false;
  let sawImage = false;
  let sawEnd = false;
  let header = null;
  while (offset + 12 <= body.length) {
    const length = body.readUInt32BE(offset);
    const type = body.toString('ascii', offset + 4, offset + 8);
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    const crcOffset = dataEnd;
    if (length > 0x7fffffff || dataEnd + 4 > body.length) {
      throw new Error(`PNG chunk exceeds file boundary: ${type}`);
    }
    const expectedCrc = body.readUInt32BE(crcOffset);
    const actualCrc = crc32(body.subarray(offset + 4, dataEnd));
    if (actualCrc !== expectedCrc) throw new Error(`PNG chunk CRC mismatch: ${type}`);
    if (type === 'IHDR') {
      if (sawHeader || length !== 13) throw new Error('PNG has an invalid IHDR chunk');
      const width = body.readUInt32BE(dataStart);
      const height = body.readUInt32BE(dataStart + 4);
      const bitDepth = body[dataStart + 8];
      const colorType = body[dataStart + 9];
      const compression = body[dataStart + 10];
      const filter = body[dataStart + 11];
      const interlace = body[dataStart + 12];
      if (width === 0 || height === 0 || width > 1000000 || height > 1000000) {
        throw new Error('PNG dimensions are outside the accepted screenshot range');
      }
      if (!ALLOWED_BIT_DEPTHS.has(bitDepth) || !ALLOWED_COLOR_TYPES.has(colorType)) {
        throw new Error('PNG IHDR uses an unsupported bit depth or colour type');
      }
      if (compression !== 0 || filter !== 0 || (interlace !== 0 && interlace !== 1)) {
        throw new Error('PNG IHDR uses unsupported compression, filter, or interlace method');
      }
      header = { width, height, bitDepth, colorType, interlace };
      sawHeader = true;
    } else if (type === 'IDAT') {
      if (!sawHeader || length === 0) throw new Error('PNG has an invalid IDAT chunk');
      sawImage = true;
    } else if (type === 'IEND') {
      if (!sawHeader || !sawImage || length !== 0) throw new Error('PNG ended before complete image data');
      sawEnd = true;
      offset += 12 + length;
      break;
    }
    offset += 12 + length;
  }
  if (!sawHeader || !sawImage || !sawEnd) throw new Error('PNG stream is incomplete');
  if (offset !== body.length) throw new Error('PNG contains trailing bytes after IEND');
  return {
    ...header,
    bytes: body.length,
    sha256: crypto.createHash('sha256').update(body).digest('hex'),
  };
}

function cellKey(cell) {
  return `${cell?.scenario}::${cell?.viewport?.id}`;
}

function verifyCellPngEvidence(cell, rootDir, expectedWidth, expectedHeight) {
  const errors = [];
  const key = cellKey(cell);
  if (!cell || typeof cell !== 'object') return [`${key}: cell is not an object`];
  if (!cell.viewport || cell.viewport.width !== expectedWidth || cell.viewport.height !== expectedHeight) {
    errors.push(`${key}: declared viewport is not ${expectedWidth}x${expectedHeight}`);
  }
  const evidence = cell.png;
  if (!evidence || typeof evidence !== 'object') {
    errors.push(`${key}: decoded PNG evidence is missing`);
    return errors;
  }
  if (!Number.isInteger(evidence.width) || !Number.isInteger(evidence.height) ||
      !Number.isInteger(evidence.bytes) || evidence.bytes <= 0 ||
      !/^[0-9a-f]{64}$/.test(String(evidence.sha256 || ''))) {
    errors.push(`${key}: PNG evidence lacks valid dimensions, byte count, or SHA-256`);
  }
  if (typeof cell.file !== 'string' || !cell.file) {
    errors.push(`${key}: screenshot path is missing`);
    return errors;
  }
  const filePath = path.resolve(rootDir, cell.file);
  const relative = path.relative(path.resolve(rootDir), filePath);
  if (relative.startsWith('..') || path.isAbsolute(relative) || !isPathInside(rootDir, filePath)) {
    errors.push(`${key}: screenshot path escapes the worktree`);
    return errors;
  }
  let stat;
  try {
    stat = fs.lstatSync(filePath);
  } catch {
    errors.push(`${key}: screenshot file is missing`);
    return errors;
  }
  if (!stat.isFile() || stat.isSymbolicLink()) {
    errors.push(`${key}: screenshot is not a regular file`);
    return errors;
  }
  try {
    const actual = decodePngIdentity(filePath);
    if (actual.width !== expectedWidth || actual.height !== expectedHeight) {
      errors.push(`${key}: actual PNG is ${actual.width}x${actual.height}, expected ${expectedWidth}x${expectedHeight}`);
    }
    for (const field of ['width', 'height', 'bytes', 'sha256']) {
      if (actual[field] !== evidence[field]) {
        errors.push(`${key}: recorded PNG ${field} does not match the file`);
      }
    }
  } catch (error) {
    errors.push(`${key}: ${error.message}`);
  }
  return [...new Set(errors)];
}

module.exports = {
  PNG_SIGNATURE,
  cellKey,
  crc32,
  decodePngIdentity,
  isPathInside,
  portablePath,
  verifyCellPngEvidence,
};
