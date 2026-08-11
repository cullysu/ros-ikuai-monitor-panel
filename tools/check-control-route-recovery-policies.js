#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = path.join(root, "src", "panel-framework", "sections", "route-recovery", "controlRecoveryPolicies.ts");
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
const policies = module.exports.controlRecoveryPolicies;

const expected = ["dns4", "dns6", "security", "logs", "serviceLogs", "readonlyDiagnostics"];
const knownReadonlyRoutes = new Set([
  "overview", "interfaces", "lineStatus", "balance", "routes", "terminals", "dhcp", "arp",
  "trafficLoad", "loadAudit", "trafficAudit", "connections", "dns4", "dns6", "security",
  "logs", "serviceLogs", "readonlyDiagnostics",
]);
const requiredStates = ["partial", "historical", "unavailable"];
const boundaryTerms = ["不", "不能", "不可", "缺失", "未取得", "没有", "只"];
const forbiddenActionLanguage = /配置|修改|启用|停用|删除|保存|应用|重试/;
const positiveHealthClaim = /(?:网络|业务)(?:健康|正常|可用|已恢复|无异常)/;
const requiredEvidence = {
  dns4: {
    partialTerms: ["DNS", "上游", "静态规则", "缺失规则"],
    actionRoutes: ["dns6", "readonlyDiagnostics"],
  },
  dns6: {
    partialTerms: ["IPv6", "DHCPv6", "DNS", "缺失邻居"],
    actionRoutes: ["dns4", "readonlyDiagnostics"],
  },
  security: {
    partialTerms: ["防火墙规则", "地址集", "告警", "缺失规则"],
    actionRoutes: ["logs", "readonlyDiagnostics"],
  },
  logs: {
    partialTerms: ["系统", "网络", "服务事件", "截断窗口"],
    actionRoutes: ["serviceLogs", "readonlyDiagnostics"],
  },
  serviceLogs: {
    partialTerms: ["防火墙", "DHCP", "DNS", "缺失分类"],
    actionRoutes: ["logs", "readonlyDiagnostics"],
  },
  readonlyDiagnostics: {
    partialTerms: ["采集通道", "端点", "失败记录", "缺失通道"],
    actionRoutes: ["interfaces", "logs"],
  },
};
const violations = [];

if (!policies || typeof policies !== "object" || Array.isArray(policies)) {
  violations.push("controlRecoveryPolicies must execute to an object");
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
      if (positiveHealthClaim.test(copy.body) && !/(?:不|不能|不可|未|没有)/.test(copy.body)) {
        violations.push(`${route}.${state}: must not claim network or business health`);
      }
    }

    for (const term of requiredEvidence[route].partialTerms) {
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
      if (!action || typeof action.route !== "string" || action.route === "more" || !knownReadonlyRoutes.has(action.route)) {
        violations.push(`${route}: action target must be an existing read-only route, never more`);
      }
      if (!action || typeof action.label !== "string" || !action.label.trim()) {
        violations.push(`${route}: action label must be non-empty`);
      }
      if (forbiddenActionLanguage.test(action?.label || "")) {
        violations.push(`${route}: actions must navigate read-only evidence, never mutate configuration`);
      }
      if (seenRoutes.has(action?.route)) violations.push(`${route}: action routes must be unique`);
      if (seenLabels.has(action?.label)) violations.push(`${route}: action labels must be unique`);
      seenRoutes.add(action?.route);
      seenLabels.add(action?.label);
    }
    for (const requiredRoute of requiredEvidence[route].actionRoutes) {
      if (!seenRoutes.has(requiredRoute)) {
        violations.push(`${route}: actions must include the evidence next step ${requiredRoute}`);
      }
    }
  }
}

if (violations.length) {
  console.error("control route recovery policy check failed:\n- " + violations.join("\n- "));
  process.exit(1);
}

console.log("control route recovery policies passed");
