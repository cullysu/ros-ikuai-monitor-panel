#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = path.join(root, "src", "panel-framework", "sections", "route-recovery", "addressRecoveryPolicies.ts");
const source = fs.readFileSync(sourcePath, "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  fileName: sourcePath,
});
const module = { exports: {} };
vm.runInNewContext(compiled.outputText, { module, exports: module.exports }, { filename: sourcePath });
const policies = module.exports.addressRecoveryPolicies;

const expectedRoutes = ["terminals", "dhcp", "arp"];
const expectedTargets = {
  terminals: ["dhcp", "arp"],
  dhcp: ["terminals", "arp"],
  arp: ["terminals", "dhcp"],
};
const requiredStates = ["partial", "historical", "unavailable"];
const boundaryTerms = ["不", "不能", "不可", "缺失", "未取得", "没有"];
const stateEvidenceTerms = {
  terminals: { partial: ["终端", "快照"], historical: ["历史", "终端"], unavailable: ["终端", "没有"] },
  dhcp: { partial: ["DHCP", "租约"], historical: ["历史", "租约"], unavailable: ["DHCP", "没有"] },
  arp: { partial: ["ARP", "映射"], historical: ["历史", "映射"], unavailable: ["ARP", "没有"] },
};
const forbiddenMutations = /配置|修改|启用|停用|删除|保存|应用|重试/;
const healthClaimPattern = /网络健康|业务健康|外网可达/;
function assertsHealthWithoutBoundary(body) {
  return body.split(/[。；]/).some((sentence) => {
    const match = healthClaimPattern.exec(sentence);
    return Boolean(match) && !/(不|不能|不可|未)/.test(sentence.slice(0, match.index));
  });
}
const violations = [];

if (!policies || typeof policies !== "object" || Array.isArray(policies)) {
  violations.push("addressRecoveryPolicies must execute to an object");
} else {
  const actualRoutes = Object.keys(policies).sort();
  if (JSON.stringify(actualRoutes) !== JSON.stringify([...expectedRoutes].sort())) {
    violations.push(`coverage must be exactly ${expectedRoutes.join(", ")}; received ${actualRoutes.join(", ") || "none"}`);
  }

  for (const route of expectedRoutes) {
    const policy = policies[route];
    if (!policy || typeof policy.heading !== "string" || !policy.heading.trim()) {
      violations.push(`${route}: heading must be non-empty`);
    }

    for (const state of requiredStates) {
      const copy = policy?.[state];
      if (!copy || typeof copy.title !== "string" || !copy.title.trim() || typeof copy.body !== "string" || !copy.body.trim()) {
        violations.push(`${route}.${state}: title and body must be non-empty`);
        continue;
      }
      if (!boundaryTerms.some((term) => copy.body.includes(term))) {
        violations.push(`${route}.${state}: body must state an evidence boundary`);
      }
      if (assertsHealthWithoutBoundary(copy.body)) {
        violations.push(`${route}.${state}: must not assert network or business health`);
      }
      for (const term of stateEvidenceTerms[route][state]) {
        if (!copy.body.includes(term)) {
          violations.push(`${route}.${state}: must name distinct ${route} evidence ${term}`);
        }
      }
    }

    const actions = policy?.actions;
    if (!Array.isArray(actions) || actions.length !== 2) {
      violations.push(`${route}: exactly two read-only navigation actions are required`);
      continue;
    }
    const routes = new Set();
    const labels = new Set();
    for (const action of actions) {
      if (!action || typeof action.route !== "string" || action.route === "more" || !expectedRoutes.includes(action.route)) {
        violations.push(`${route}: action target must be an address evidence route, never more`);
      }
      if (!action || typeof action.label !== "string" || !action.label.trim()) {
        violations.push(`${route}: action label must be non-empty`);
      }
      if (forbiddenMutations.test(action?.label || "")) {
        violations.push(`${route}: actions must navigate read-only evidence, never mutate configuration`);
      }
      if (routes.has(action?.route)) violations.push(`${route}: action targets must be unique`);
      if (labels.has(action?.label)) violations.push(`${route}: action labels must be unique`);
      routes.add(action?.route);
      labels.add(action?.label);
    }
    for (const target of expectedTargets[route]) {
      if (!routes.has(target)) violations.push(`${route}: actions must include real object relationship target ${target}`);
    }
  }
}

if (violations.length) {
  console.error("address route recovery policy check failed:\n- " + violations.join("\n- "));
  process.exit(1);
}

console.log("address route recovery policies passed");
