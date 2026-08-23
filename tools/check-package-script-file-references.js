#!/usr/bin/env node
"use strict";

/*
 * Package scripts are part of the public verification API. This intentionally
 * checks the statically resolvable file reads of every script-reachable local
 * validator so a deleted presentation owner cannot leave a script that only
 * fails later with ENOENT.
 *
 * It resolves literal reads made through the repository's common wrappers as
 * well as direct fs calls. Truly dynamic discovery still needs a dedicated
 * runtime contract rather than a brittle source-text approximation.
 */

const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const ROOT = path.resolve(__dirname, "..");
const PACKAGE_FILE = path.join(ROOT, "package.json");
const packageJson = JSON.parse(fs.readFileSync(PACKAGE_FILE, "utf8"));
const scripts = packageJson.scripts || {};
const failures = [];
const toolFiles = new Set();
const pythonToolFiles = new Set();
const seenScripts = new Set();
const checkedPaths = new Set();

function normalize(file) {
  return path.normalize(file);
}

function relative(file) {
  return path.relative(ROOT, file).split(path.sep).join("/");
}

function isRepositoryFile(value) {
  return /^(?:src|tools|panel_backend|public|docs|\.github)\//.test(value)
    || /^(?:app\.py|package\.json|Dockerfile|compose\.yml)$/.test(value);
}

function addCheckedPath(file, owner) {
  const normalized = normalize(file);
  if (!normalized.startsWith(`${ROOT}${path.sep}`) && normalized !== ROOT) return;
  checkedPaths.add(normalized);
  if (!fs.existsSync(normalized)) failures.push(`${owner} reads missing repository file: ${relative(normalized)}`);
}

function literalText(node) {
  if (ts.isStringLiteralLike(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  return null;
}

function pathFromExpression(node, constants) {
  const text = literalText(node);
  if (text !== null) return isRepositoryFile(text) ? path.join(ROOT, text) : null;
  if (ts.isIdentifier(node)) return constants.get(node.text) || null;
  if (!ts.isCallExpression(node) || !ts.isPropertyAccessExpression(node.expression)) return null;
  const operation = node.expression.name.text;
  const owner = node.expression.expression.getText();
  if (owner !== "path" || !["join", "resolve"].includes(operation)) return null;
  const segments = [];
  for (const argument of node.arguments) {
    const value = literalText(argument);
    if (value !== null) {
      segments.push(value);
      continue;
    }
    if (ts.isIdentifier(argument) && ["ROOT", "root", "projectRoot", "repoRoot"].includes(argument.text)) continue;
    return null;
  }
  const joined = segments.join("/").replaceAll("\\", "/");
  return isRepositoryFile(joined) ? path.join(ROOT, joined) : null;
}

function isReadCall(node) {
  if (!ts.isCallExpression(node)) return false;
  if (ts.isIdentifier(node.expression)) return ["read", "readText", "readFile", "source"].includes(node.expression.text);
  return ts.isPropertyAccessExpression(node.expression)
    && ["readFileSync", "readFile"].includes(node.expression.name.text);
}

function visit(node, callback) {
  callback(node);
  ts.forEachChild(node, (child) => visit(child, callback));
}

function collectToolReadPaths(source, fileName = "validator.js") {
  const ast = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const constants = new Map();
  const targets = [];
  visit(ast, (node) => {
    if (!ts.isVariableDeclaration(node) || !ts.isIdentifier(node.name) || !node.initializer) return;
    const resolved = pathFromExpression(node.initializer, constants);
    if (resolved) constants.set(node.name.text, resolved);
  });
  visit(ast, (node) => {
    if (!isReadCall(node) || node.arguments.length === 0) return;
    const target = pathFromExpression(node.arguments[0], constants);
    if (target) targets.push(target);
  });
  return [...new Set(targets.map(normalize))];
}

function missingToolReadFailures(source, owner, exists = fs.existsSync) {
  return collectToolReadPaths(source, owner)
    .filter((target) => !exists(target))
    .map((target) => `${owner} reads missing repository file: ${relative(target)}`);
}

function inspectTool(file) {
  const source = fs.readFileSync(file, "utf8");
  for (const target of collectToolReadPaths(source, file)) addCheckedPath(target, relative(file));
}

function inspectPythonTool(file) {
  const source = fs.readFileSync(file, "utf8");
  const expression = /\b(?:open|Path)\s*\(\s*(?:[rubfRUBF]{0,2})?["']([^"']+)["']/g;
  for (const match of source.matchAll(expression)) {
    if (!isRepositoryFile(match[1])) continue;
    addCheckedPath(path.join(ROOT, match[1]), relative(file));
  }
}

function inspectCommand(owner, command) {
  for (const match of command.matchAll(/\btools\/([A-Za-z0-9_./-]+\.(?:[cm]?js|py))\b/g)) {
    const file = path.join(ROOT, "tools", match[1]);
    addCheckedPath(file, `package script ${owner}`);
    if (!fs.existsSync(file)) continue;
    if (/\.(?:[cm]?js)$/.test(file)) toolFiles.add(file);
    if (/\.py$/.test(file)) pythonToolFiles.add(file);
  }
  for (const match of command.matchAll(/\bnpm\s+run\s+([A-Za-z0-9:_-]+)/g)) inspectScript(match[1]);
}

function inspectScript(name) {
  if (seenScripts.has(name)) return;
  seenScripts.add(name);
  if (!Object.hasOwn(scripts, name)) {
    failures.push(`package script references missing script: ${name}`);
    return;
  }
  inspectCommand(name, scripts[name]);
}

function main() {
  for (const name of Object.keys(scripts)) inspectScript(name);
  for (const file of toolFiles) inspectTool(file);
  for (const file of pythonToolFiles) inspectPythonTool(file);

  if (failures.length) {
    console.error("package script file-reference gate: FAIL");
    for (const failure of [...new Set(failures)].sort()) console.error(`- ${failure}`);
    process.exitCode = 1;
  } else {
    console.log("package script file-reference gate: PASS");
    console.log(`Checked ${seenScripts.size} package scripts, ${toolFiles.size} JavaScript validators, ${pythonToolFiles.size} Python validators, and ${checkedPaths.size} statically resolved repository file reads.`);
    console.log("LIMITATION: non-literal dynamically constructed file paths require their owning runtime contract.");
  }
}

if (require.main === module) main();

module.exports = { collectToolReadPaths, missingToolReadFailures };
