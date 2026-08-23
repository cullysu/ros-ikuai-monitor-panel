const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const inventoryPath = path.join(root, 'docs', 'decision-system', 'document-authority.md');
const failures = [];

function fail(message) {
  failures.push(message);
}

function read(relativePath) {
  const absolutePath = path.join(root, relativePath);
  if (!fs.existsSync(absolutePath)) {
    fail(`missing file: ${relativePath}`);
    return '';
  }
  return fs.readFileSync(absolutePath, 'utf8');
}

function metadata(text, field) {
  const expression = new RegExp(`(?:^|\\n)\\s*(?:[-*>]\\s*)?${field}:\\s*([^\\n]+)`, 'm');
  const match = text.match(expression);
  if (!match) return null;
  return match[1].trim().replace(/^`|`$/g, '');
}

const inventoryText = read('docs/decision-system/document-authority.md');
const inventoryMatch = inventoryText.match(/```json\s*([\s\S]*?)\s*```/);
let registry = null;
if (!inventoryMatch) {
  fail('inventory JSON block missing');
} else {
  try {
    registry = JSON.parse(inventoryMatch[1]);
  } catch (error) {
    fail(`inventory JSON invalid: ${error.message}`);
  }
}

const allowedStatuses = new Set(['current', 'current-contract', 'superseded', 'reference']);
if (registry) {
  if (registry.schemaVersion !== 1) fail('schemaVersion must be 1');
  if (registry.soleCurrentConclusion !== 'docs/decision-system/current-state.md') {
    fail('soleCurrentConclusion must point to docs/decision-system/current-state.md');
  }
  if (registry.activeResponsiveAuthority !== 'docs/decision-system/responsive-capabilities.md') {
    fail('activeResponsiveAuthority must point to responsive-capabilities.md');
  }
  if (!Array.isArray(registry.entries) || registry.entries.length === 0) {
    fail('entries must be a non-empty array');
  } else {
    const seen = new Set();
    const currentConclusionCount = registry.entries.filter((entry) => entry.authorityStatus === 'current' && entry.path === registry.soleCurrentConclusion).length;
    if (currentConclusionCount !== 1) fail('sole current conclusion must have exactly one current entry');
    const responsiveEntry = registry.entries.find((entry) => entry.path === registry.activeResponsiveAuthority);
    if (!responsiveEntry || responsiveEntry.authorityStatus !== 'current') fail('responsive authority must be registered as current');

    for (const entry of registry.entries) {
      if (!entry || typeof entry !== 'object') {
        fail('entry must be an object');
        continue;
      }
      for (const field of ['path', 'authorityStatus', 'validForCommit', 'supersededBy', 'role']) {
        if (!(field in entry)) fail(`entry missing ${field}: ${JSON.stringify(entry)}`);
      }
      if (typeof entry.path !== 'string' || entry.path.includes('..') || path.isAbsolute(entry.path) || entry.path.includes('\\')) {
        fail(`entry path must be normalized and relative: ${entry.path}`);
        continue;
      }
      if (seen.has(entry.path)) fail(`duplicate entry: ${entry.path}`);
      seen.add(entry.path);
      if (!allowedStatuses.has(entry.authorityStatus)) fail(`invalid authorityStatus for ${entry.path}: ${entry.authorityStatus}`);
      if (typeof entry.validForCommit !== 'string' || entry.validForCommit.trim() === '') fail(`missing validForCommit: ${entry.path}`);
      if (typeof entry.role !== 'string' || entry.role.trim() === '') fail(`missing role: ${entry.path}`);
      if (entry.authorityStatus === 'superseded') {
        if (typeof entry.supersededBy !== 'string' || entry.supersededBy.trim() === '') fail(`superseded entry must name successor: ${entry.path}`);
      } else if (entry.supersededBy !== null && typeof entry.supersededBy !== 'string') {
        fail(`non-superseded entry must use null or a string successor: ${entry.path}`);
      }

      const text = read(entry.path);
      const sourceStatus = metadata(text, 'status');
      const sourceCommit = metadata(text, 'validForCommit');
      const sourceSuccessor = metadata(text, 'supersededBy');
      if (sourceStatus === null) fail(`source status metadata missing: ${entry.path}`);
      if (sourceCommit === null) fail(`source validForCommit metadata missing: ${entry.path}`);
      if (sourceSuccessor === null) fail(`source supersededBy metadata missing: ${entry.path}`);
      if (entry.authorityStatus === 'superseded' && !String(sourceStatus || '').startsWith('superseded')) {
        fail(`inventory/source status mismatch for superseded file: ${entry.path} (${sourceStatus})`);
      }
      if (entry.authorityStatus === 'superseded' && sourceSuccessor !== entry.supersededBy) {
        fail(`successor mismatch for ${entry.path}: inventory=${entry.supersededBy} source=${sourceSuccessor}`);
      }
      if (entry.authorityStatus !== 'superseded' && String(sourceStatus || '').startsWith('superseded')) {
        fail(`inventory/source status mismatch for active/reference file: ${entry.path} (${sourceStatus})`);
      }
    }
  }
}

const result = {
  pass: failures.length === 0,
  inventory: path.relative(root, inventoryPath).replaceAll(path.sep, '/'),
  entryCount: registry && Array.isArray(registry.entries) ? registry.entries.length : 0,
  failures,
};
console.log(JSON.stringify(result, null, 2));
if (!result.pass) process.exitCode = 1;
