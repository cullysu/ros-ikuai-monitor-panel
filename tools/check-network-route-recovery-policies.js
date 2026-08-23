#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = path.join(root, "src", "panel-framework", "sections", "route-recovery", "networkRecoveryPolicies.ts");
const source = fs.readFileSync(sourcePath, "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
  fileName: sourcePath,
});

const module = { exports: {} };
vm.runInNewContext(compiled.outputText, { module, exports: module.exports }, { filename: sourcePath });
const policies = module.exports.networkRecoveryPolicies;

const expected = ["lineStatus", "balance", "routes"];
const allowedReadonlyTargets = new Set(["interfaces", "lineStatus", "balance", "routes", "logs", "readonlyDiagnostics"]);
const requiredStates = ["partial", "historical", "unavailable"];
const boundaryTerms = ["不", "不能", "不可", "缺失", "未取得", "没有"];
const requiredPartialEvidence = {
  lineStatus: {
    terms: ["WAN", "快照", "未返回"],
    routes: ["interfaces", "readonlyDiagnostics"],
  },
  balance: {
    terms: ["策略标记", "默认路由", "缺失规则"],
    routes: ["routes", "readonlyDiagnostics"],
  },
  routes: {
    terms: ["默认", "静态", "动态", "缺失条目"],
    routes: ["interfaces", "readonlyDiagnostics"],
  },
};
const forbiddenActionLanguage = /配置|修改|启用|停用|删除|保存|应用|重试/;
const violations = [];

if (!policies || typeof policies !== "object" || Array.isArray(policies)) {
  violations.push("networkRecoveryPolicies must execute to an object");
} else {
  const actual = Object.keys(policies).sort();
  if (JSON.stringify(actual) !== JSON.stringify([...expected].sort())) {
    violations.push(`coverage must be exactly ${expected.join(", ")}; received ${actual.join(", ") || "none"}`);
  }

  for (const route of expected) {
    const policy = policies[route];
    if (!policy || typeof policy.heading !== "string" || !policy.heading.trim()) {
      violations.push(`${route}: heading must be non-empty`);
    }

    for (const state of requiredStates) {
      const copy = policy && policy[state];
      if (!copy || typeof copy.title !== "string" || !copy.title.trim() || typeof copy.body !== "string" || !copy.body.trim()) {
        violations.push(`${route}.${state}: title and body must be non-empty`);
        continue;
      }
      if (!boundaryTerms.some((term) => copy.body.includes(term))) {
        violations.push(`${route}.${state}: body must state an evidence boundary`);
      }
      if (/网络健康|业务健康|外网可达/.test(copy.body) && !/(不|不能|不可|未)/.test(copy.body)) {
        violations.push(`${route}.${state}: must not assert network or business health`);
      }
    }

    for (const term of requiredPartialEvidence[route].terms) {
      if (!policy?.partial?.body?.includes(term)) {
        violations.push(`${route}.partial: must name verifiable collection evidence ${term}`);
      }
    }

    const actions = policy && policy.actions;
    if (!Array.isArray(actions) || actions.length !== 2) {
      violations.push(`${route}: exactly two read-only navigation actions are required`);
      continue;
    }
    const seenRoutes = new Set();
    const seenLabels = new Set();
    for (const action of actions) {
      if (!action || typeof action.route !== "string" || !allowedReadonlyTargets.has(action.route) || action.route === "more") {
        violations.push(`${route}: action target must be an existing read-only route, never more`);
      }
      if (!action || typeof action.label !== "string" || !action.label.trim()) {
        violations.push(`${route}: action label must be non-empty`);
      }
      if (forbiddenActionLanguage.test(action?.label || "")) {
        violations.push(`${route}: actions must navigate read-only evidence, never mutate configuration`);
      }
      if (seenRoutes.has(action && action.route)) violations.push(`${route}: action routes must be unique`);
      if (seenLabels.has(action && action.label)) violations.push(`${route}: action labels must be unique`);
      seenRoutes.add(action && action.route);
      seenLabels.add(action && action.label);
    }
    for (const requiredTarget of requiredPartialEvidence[route].routes) {
      if (!seenRoutes.has(requiredTarget)) {
        violations.push(`${route}: actions must include the evidence next step ${requiredTarget}`);
      }
    }
  }
}

if (violations.length) {
  console.error("network route recovery policy check failed:\n- " + violations.join("\n- "));
  process.exit(1);
}

console.log("network route recovery policies passed");
