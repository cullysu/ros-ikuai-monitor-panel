#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const scriptPath = path.join(
  root,
  ".agents",
  "skills",
  "router-panel-product-loop",
  "scripts",
  "release_checkpoint.py",
);
const testPath = path.join(
  root,
  ".agents",
  "skills",
  "router-panel-product-loop",
  "tests",
  "test_release_checkpoint.py",
);

const script = fs.readFileSync(scriptPath, "utf8");
const tests = fs.readFileSync(testPath, "utf8");
const failures = [];

const finalBlockMatch = script.match(/if final:\r?\n([\s\S]*?)\r?\n    result = \{/);
const finalBlock = finalBlockMatch ? finalBlockMatch[1] : "";

if (!finalBlock) {
  failures.push("cannot locate the final verification block");
}
if (!finalBlock.includes('git(workspace, "rev-parse", "HEAD")')) {
  failures.push("final verification must compare the live HEAD with the candidate commit");
}
if (
  !finalBlock.includes(
    'git(workspace, "status", "--porcelain=v1", "--untracked-files=all")',
  )
) {
  failures.push("final verification must reject a dirty worktree including untracked files");
}
if (!finalBlock.includes("HEAD to equal candidate commit")) {
  failures.push("HEAD mismatch must be reported as a final identity error");
}
if (!finalBlock.includes("clean worktree")) {
  failures.push("dirty worktree must be reported as a final identity error");
}

if (!tests.includes("TemporaryDirectory")) {
  failures.push("release-checkpoint tests must use an isolated temporary repository");
}
if (!tests.includes('self.git("init")') && !tests.includes('["git", "init"]')) {
  failures.push("release-checkpoint tests must initialize a clean temporary Git repository");
}
if (!tests.includes("clean worktree")) {
  failures.push("release-checkpoint tests must cover final rejection of a dirty worktree");
}
if (!tests.includes("HEAD to equal candidate commit")) {
  failures.push("release-checkpoint tests must cover final rejection of a HEAD mismatch");
}
if (tests.includes('"--workspace",\n                str(WORKSPACE)')) {
  failures.push("release-checkpoint tests must not verify final state against the current project worktree");
}

const result = {
  pass: failures.length === 0,
  checks: 8,
  failures,
  files: [scriptPath, testPath],
};
console.log(JSON.stringify(result, null, 2));
process.exitCode = result.pass ? 0 : 1;
