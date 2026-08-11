#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
const modelPath = path.join(root, "src", "panel-framework", "overview", "mobile-overview", "optical-patrol", "buildOpticalPatrolModel.ts");
const typesPath = path.join(root, "src", "panel-framework", "overview", "mobile-overview", "optical-patrol", "opticalPatrolTypes.ts");
const issues = [];
const observedAt = "2026-08-11T12:00:00Z";

function check(condition, message) {
  if (!condition) issues.push(message);
}

function priority(id, name, category, route, state = "未运行", attributes = []) {
  return {
    id,
    targetObjectId: id,
    category,
    name,
    state,
    reason: "来自当前快照",
    tone: state === "运行" ? "trust" : "danger",
    route,
    sourcePath: `snapshot.${id}`,
    attributes,
  };
}

function coverage(id, object, category = "WAN", route = "lineStatus", state = "运行") {
  return {
    id,
    targetObjectId: id,
    category,
    object,
    state,
    evidence: "来自当前快照",
    source: `snapshot.${id}`,
    tone: state === "运行" ? "trust" : "danger",
    route,
  };
}

function routePath(overrides = {}) {
  return {
    gateway: "pppoe-wan1",
    table: "main",
    destination: "0.0.0.0/0",
    source: "routes.defaultRoutes[0]",
    observedAt: null,
    ...overrides,
  };
}

function routeEvidence(overrides = {}) {
  return {
    activePath: null,
    interfaceDependencies: [],
    lastConfirmedActivePath: null,
    ...overrides,
  };
}

function trafficFixture(last = { timestamp: 2, down: 24_000_000, up: 8_000_000 }) {
  return {
    status: "ready",
    title: "WAN 双向吞吐",
    windowLabel: "最近 1 分钟",
    sampleCount: 2,
    points: [
      { timestamp: 1, down: 20_000_000, up: 7_000_000 },
      last,
    ],
    unit: "Mbps",
    currentDown: "formatted value must never be parsed",
    currentUp: "formatted value must never be parsed",
    peak: "formatted value must never be parsed",
    accessibleSummary: "2 个当前样本",
  };
}

function resourceFixture(current = 91) {
  return {
    status: "ready",
    windowLabel: "最近 1 分钟",
    sampleCount: 3,
    points: [
      { timestamp: 1, cpu: 80, memory: 42, disk: 31 },
      { timestamp: 2, cpu: 88, memory: 42, disk: 31 },
      { timestamp: 3, cpu: current, memory: 42, disk: 31 },
    ],
    accessibleSummary: "资源窗口",
    metrics: [
      {
        key: "cpu",
        label: "CPU",
        value: current,
        threshold: 85,
        points: [
          { timestamp: 1, value: 80 },
          { timestamp: 2, value: 88 },
          { timestamp: 3, value: current },
        ],
      },
      { key: "memory", label: "内存", value: 42, threshold: 90, points: [{ timestamp: 3, value: 42 }] },
      { key: "disk", label: "磁盘", value: 31, threshold: 90, points: [{ timestamp: 3, value: 31 }] },
    ],
  };
}

function evidenceFixture({
  scenario = "single",
  risk = "none",
  mode = "current",
  priorities = [],
  coverageObjects = [],
  routes = routeEvidence(),
  traffic = null,
  resource = null,
} = {}) {
  return {
    scenario,
    risk,
    riskQueue: [],
    evidenceMode: mode,
    evidenceLabel: mode === "current" ? "当前证据" : mode === "historical" ? "历史证据" : "证据不可用",
    evidenceAt: mode === "unavailable" ? null : observedAt,
    evidenceTime: mode === "unavailable" ? "当前时间未记录" : "08-11 20:00",
    evidenceNote: mode === "current" ? "仅显示已观测值" : "当前变化不可见",
    evidenceTone: mode === "current" ? "trust" : mode === "historical" ? "warn" : "missing",
    device: "smoke-router",
    deviceNote: "RouterOS 7.15-smoke",
    verdictLabel: risk === "none" ? "出口证据" : "需要检查",
    verdictTitle: risk === "none" ? "当前管理证据已核实" : "当前存在需检查对象",
    verdictSummary: "不据此声明外部业务可用",
    verdictTone: risk === "none" ? "trust" : "danger",
    scenarioFocus: null,
    facts: [
      { key: "route", label: "默认路由", value: routes.activePath ? "已核实" : "未核实", tone: routes.activePath ? "trust" : "warn" },
      { key: "wan", label: "WAN", value: "已观测", tone: "trust" },
      { key: "collection", label: "采集", value: "独立通道", tone: "trust" },
    ],
    priorityLabel: "运行对象",
    priorityTitle: "当前检查顺序",
    priorityObjects: priorities.slice(0, 3),
    priorityObjectsAll: priorities,
    priorityTotal: priorities.length,
    focusObject: null,
    coverageObjects,
    comparisonObjects: coverageObjects,
    tabletComparisonObjects: coverageObjects,
    secondaryDecisions: [],
    routeEvidence: routes,
    traffic,
    resource,
    evidenceRows: [
      { key: "target", label: "采集目标", value: "127.0.0.1", note: "只读连接", tone: "trust" },
      { key: "boundary", label: "操作边界", value: "只读监控", note: "不会修改配置", tone: "trust" },
    ],
    investigationActions: [],
  };
}

function stateFixture(evidence, { scale = evidence.scenario === "fleet" ? "fleet" : "single", rest, ssh } = {}) {
  const unavailable = evidence.evidenceMode === "unavailable";
  const failed = evidence.risk === "collection" || evidence.risk === "evidence";
  const wanObjects = evidence.coverageObjects.filter((object) => object.category === "WAN");
  const onlineWan = wanObjects.filter((object) => object.tone === "trust").length;
  const offlineWan = wanObjects.filter((object) => object.tone === "danger").length;
  const unknownWan = Math.max(0, wanObjects.length - onlineWan - offlineWan);
  const channel = (name, override) => override || {
    status: unavailable ? "unavailable" : failed ? "failed" : "current",
    label: unavailable ? "不可用" : failed ? "失败" : "当前",
    successAt: unavailable ? "" : "2026-08-11T11:58:00Z",
    error: failed ? `${name} 采集失败` : "",
  };
  return {
    scenario: evidence.scenario,
    scale,
    verdict: { key: evidence.scenario, level: evidence.verdictTone, label: evidence.verdictLabel, topLabel: evidence.verdictTitle, detail: evidence.verdictSummary, summary: evidence.verdictSummary },
    counts: {},
    topbar: {},
    facts: {
      wan: {
        available: !unavailable,
        total: wanObjects.length,
        online: onlineWan,
        offline: offlineWan,
        unknown: unknownWan,
        allOffline: wanObjects.length > 0 && onlineWan === 0,
        label: wanObjects.length ? `${onlineWan} / ${wanObjects.length}` : "未记录",
        text: wanObjects.length ? "WAN 对象记录" : "WAN 对象未记录",
      },
      collection: {
        rest: channel("REST", rest),
        ssh: channel("SSH", ssh),
        channelStateText: failed ? "采集通道失败" : "REST 与 SSH 当前",
        dataStateText: evidence.evidenceLabel,
        label: failed ? "采集异常" : "采集正常",
        level: failed ? "danger" : "trust",
        businessEvidenceText: "外部业务未探测",
        businessEvidenceIncomplete: true,
      },
    },
  };
}

function loadBuild() {
  check(fs.existsSync(typesPath), "missing Optical Patrol types");
  check(fs.existsSync(modelPath), "missing Optical Patrol model");
  if (!fs.existsSync(typesPath) || !fs.existsSync(modelPath)) return null;

  for (const file of [typesPath, modelPath]) {
    const source = fs.readFileSync(file, "utf8");
    check(!/Pocket|pocket|pc__|data-pocket/.test(source), `${path.basename(file)} must reject Pocket identifiers`);
    check(!/parseFloat|parseInt/.test(source), `${path.basename(file)} must not parse formatted values`);
  }

  const source = fs.readFileSync(modelPath, "utf8");
  check(!/current(?:Down|Up)|accessibleSummary/.test(source), "model must not consume preformatted traffic labels");

  const moduleCache = new Map();
  function loadTypeScriptModule(filePath) {
    if (moduleCache.has(filePath)) return moduleCache.get(filePath).exports;
    const module = { exports: {} };
    moduleCache.set(filePath, module);
    const output = ts.transpileModule(fs.readFileSync(filePath, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
      fileName: filePath,
    }).outputText;
    const localRequire = (request) => {
      if (request.endsWith("/timeContract")) {
        return { formatRfc3339LocalTime: (value) => value === observedAt ? "20:00:00" : "19:58:00" };
      }
      if (!request.startsWith(".")) throw new Error(`unexpected Optical Patrol runtime dependency: ${request}`);
      const resolved = path.resolve(path.dirname(filePath), `${request}.ts`);
      check(fs.existsSync(resolved), `missing Optical Patrol model dependency: ${path.relative(root, resolved)}`);
      return fs.existsSync(resolved) ? loadTypeScriptModule(resolved) : {};
    };
    vm.runInNewContext(output, { module, exports: module.exports, require: localRequire }, { filename: filePath });
    return module.exports;
  }

  const module = loadTypeScriptModule(modelPath);
  check(typeof module.buildOpticalPatrolModel === "function", "model must export buildOpticalPatrolModel");
  return module.buildOpticalPatrolModel;
}

function measurement(claim, key) {
  return claim?.measurements?.find((item) => item.key === key) || null;
}

function evidenceItem(claim, key) {
  return claim?.evidence?.find((item) => item.key === key) || null;
}

function claimByObject(model, objectId) {
  return model.claims.find((claim) => claim.objectId === objectId) || null;
}

function tabletNoveltyRatio(model) {
  const primary = model.claims[0];
  if (!primary) return 1;
  const replayValues = new Set([
    primary.state,
    primary.source,
    primary.relationship?.value,
    ...primary.evidence.map((item) => item.value),
    ...primary.measurements.flatMap((item) => [item.value, item.value === null ? null : `${item.value} ${item.unit}`]),
  ].filter((value) => value !== null && value !== undefined).map(String));
  const rows = model.tabletEvidenceGroups.flatMap((group) => group.items.slice(0, 5));
  if (!rows.length) return 0;
  const novel = rows.filter((row) => !row.key.startsWith("measurement:") && !replayValues.has(String(row.value))).length;
  return novel / rows.length;
}

const build = loadBuild();
if (build) {
  const singleEvidence = evidenceFixture({
    scenario: "single",
    routes: routeEvidence({ activePath: routePath() }),
    coverageObjects: [coverage("wan:one", "WAN 1")],
    traffic: trafficFixture(),
  });
  const single = build(singleEvidence, stateFixture(singleEvidence));
  const routeClaim = single.claims.find((claim) => claim.kind === "route" && claim.relationship?.verified === true);
  check(single.scene === "single", "single must retain the single scene");
  check(single.decision.statement === "默认出口正在承载流量", "verified route plus current traffic must produce the operational outlet decision");
  check(routeClaim?.id === "claim:route:active-default", "verified route must use a stable claim id");
  check(single.defaultSelectedId === routeClaim?.id, "verified route must be selected by default");
  check(evidenceItem(routeClaim, "destination")?.value === "0.0.0.0/0", "route destination must come from the verified route record");
  check(evidenceItem(routeClaim, "gateway")?.value === "pppoe-wan1", "route gateway must come from the verified route record");
  check(evidenceItem(routeClaim, "table")?.value === "main", "route table must remain explicit");
  check(routeClaim?.action.route === "routes" && routeClaim.action.objectId === "route:active-default", "route action must be object-bound and use a PanelRoute");
  check(measurement(routeClaim, "traffic-down")?.value === 24, "current download must use the latest numeric sample");
  check(measurement(routeClaim, "traffic-up")?.value === 8, "current upload must use the latest numeric sample");
  check(measurement(routeClaim, "traffic-down")?.sampleTimestamp === measurement(routeClaim, "traffic-up")?.sampleTimestamp, "traffic directions must share one sample window");
  check(!JSON.stringify(single).includes("formatted value must never be parsed"), "formatted traffic labels must not enter the model");
  check(claimByObject(single, "collection:rest") && claimByObject(single, "collection:ssh"), "REST and SSH must remain independent claims");
  check(single.tabletEvidenceGroups.length >= 2 && single.tabletEvidenceGroups.every((group) => group.items.length > 0), "tablet must receive meaningful evidence groups");
  check(single.tabletEvidenceGroups.every((group) => group.items.length >= 5), "single tablet evidence groups must use the available workspace with at least five meaningful rows");
  check(tabletNoveltyRatio(single) >= 0.7, "single tablet deck must add at least 70% novel rows beyond the selected claim");
  check(single.tabletEvidenceGroups.every((group) => group.items.every((item) => !item.key.startsWith("measurement:"))), "tablet deck must not replay the selected claim measurement layer");

  const zeroEvidence = evidenceFixture({
    scenario: "single",
    routes: routeEvidence({ activePath: routePath() }),
    traffic: trafficFixture({ timestamp: 3, down: 0, up: 0 }),
  });
  const zero = build(zeroEvidence, stateFixture(zeroEvidence));
  const zeroRoute = zero.claims.find((claim) => claim.kind === "route");
  check(measurement(zeroRoute, "traffic-down")?.value === 0 && measurement(zeroRoute, "traffic-up")?.value === 0, "observed numeric zero must remain visible");

  const noRouteEvidence = evidenceFixture({ scenario: "single", routes: routeEvidence(), traffic: trafficFixture() });
  const noRoute = build(noRouteEvidence, stateFixture(noRouteEvidence));
  const unknownRoute = noRoute.claims.find((claim) => claim.kind === "route");
  check(unknownRoute?.relationship?.verified === null, "missing active route must remain unverified");
  check(!unknownRoute?.evidence.some((item) => item.key === "gateway" || item.key === "destination"), "missing active route must not receive an arbitrary fallback path");
  check(!unknownRoute?.measurements.some((item) => item.key.startsWith("traffic-")), "traffic must not attach to an unverified active route");

  const dependency = {
    interfaceId: "interface:ether9",
    interfaceName: "ether9",
    interfaceSource: "interfaces[16]",
    route: routePath({ gateway: "ether9" }),
  };
  const fleetEvidence = evidenceFixture({
    scenario: "fleet",
    risk: "interfaces",
    priorities: [priority("interface:ether9", "ether9", "接口", "interfaces")],
    routes: routeEvidence({ interfaceDependencies: [dependency] }),
  });
  const fleet = build(fleetEvidence, stateFixture(fleetEvidence));
  const fleetPrimary = fleet.claims[0];
  check(fleet.scene === "interfaces-down", "real interface risk must outrank fleet scale");
  check(fleetPrimary?.objectId === "interface:ether9" && fleet.defaultSelectedId === fleetPrimary.id, "fleet must select the highest real incident");
  check(fleetPrimary?.relationship?.verified === true, "explicit interface/route dependency must remain verified");
  check(evidenceItem(fleetPrimary, "route-gateway")?.value === "ether9", "dependency must retain its route gateway");

  const unknownDependencyEvidence = evidenceFixture({
    scenario: "interfaces-down",
    risk: "interfaces",
    priorities: [priority("interface:unproven", "ether10", "接口", "interfaces")],
  });
  const unknownDependency = build(unknownDependencyEvidence, stateFixture(unknownDependencyEvidence));
  check(unknownDependency.claims[0]?.relationship?.verified === null, "missing interface dependency must remain explicitly unknown");
  check(!JSON.stringify(unknownDependency.claims[0]).includes("0.0.0.0/0"), "unknown dependency must not invent a default route");

  const resourceEvidence = evidenceFixture({
    scenario: "resource-full",
    risk: "resource",
    priorities: [priority("resource:cpu", "CPU", "资源", "trafficLoad", "已超策略阈值")],
    resource: resourceFixture(),
  });
  const resource = build(resourceEvidence, stateFixture(resourceEvidence));
  const cpu = claimByObject(resource, "resource:cpu");
  check(resource.scene === "resource-full" && resource.defaultSelectedId === cpu?.id, "largest resource exceedance must lead the resource scene");
  check(measurement(cpu, "resource-current")?.value === 91, "resource current value must remain numeric");
  check(measurement(cpu, "resource-threshold")?.value === 85, "resource threshold must remain numeric");
  check(measurement(cpu, "resource-delta")?.value === 6, "resource delta must be current minus threshold");
  check(measurement(cpu, "resource-trailing")?.value === 2, "resource trailing count must include only consecutive ending breaches");
  check(measurement(cpu, "resource-current")?.windowLabel === "最近 1 分钟", "resource measurement must retain its observation window");
  check(resource.tabletEvidenceGroups.every((group) => group.items.length >= 5), "resource tablet evidence groups must expose measurements, sources, and object states without sparse empty columns");
  check(tabletNoveltyRatio(resource) >= 0.7, "resource tablet deck must add at least 70% novel rows beyond the selected resource claim");
  check(!resource.tabletEvidenceGroups.some((group) => group.items.some((item) => item.key.startsWith("measurement:"))), "resource tablet deck must not replay 91/85/6 measurements");

  const zeroResourceEvidence = evidenceFixture({
    scenario: "resource-full",
    risk: "resource",
    priorities: [priority("resource:cpu", "CPU", "资源", "trafficLoad", "阈值内")],
    resource: resourceFixture(0),
  });
  const zeroResource = build(zeroResourceEvidence, stateFixture(zeroResourceEvidence));
  check(measurement(claimByObject(zeroResource, "resource:cpu"), "resource-current")?.value === 0, "resource zero must not be rewritten as missing");

  const historicalResourceEvidence = evidenceFixture({
    scenario: "resource-full",
    risk: "resource",
    mode: "historical",
    priorities: [priority("resource:cpu", "CPU", "资源", "trafficLoad")],
    resource: resourceFixture(),
  });
  const historicalResource = build(historicalResourceEvidence, stateFixture(historicalResourceEvidence));
  const historicalCpu = claimByObject(historicalResource, "resource:cpu");
  check(measurement(historicalCpu, "resource-current")?.value === null, "historical evidence must withdraw resource current values");
  check(measurement(historicalCpu, "resource-delta")?.value === null && measurement(historicalCpu, "resource-trailing")?.value === null, "historical evidence must withdraw derived current resource measurements");

  const collectionEvidence = evidenceFixture({
    scenario: "collection-down",
    risk: "collection",
    mode: "historical",
    traffic: trafficFixture(),
  });
  const collectionState = stateFixture(collectionEvidence, {
    rest: { status: "failed", label: "失败", successAt: "2026-08-11T11:58:00Z", error: "REST timeout" },
    ssh: { status: "degraded", label: "降级", successAt: "2026-08-11T11:57:00Z", error: "SSH slow" },
  });
  const collection = build(collectionEvidence, collectionState);
  const rest = claimByObject(collection, "collection:rest");
  const ssh = claimByObject(collection, "collection:ssh");
  check(collection.scene === "collection-down" && collection.forbidsCurrentData, "collection-down must withdraw current evidence");
  check(rest?.state === "失败" && ssh?.state === "降级", "REST and SSH states must remain independent");
  check(evidenceItem(rest, "last-success")?.observedAt === "2026-08-11T11:58:00Z", "REST last success must retain RFC3339 source time");
  check(evidenceItem(rest, "last-success")?.value !== "2026-08-11T11:58:00Z", "REST last success must present compact local time instead of raw RFC3339 copy");
  check(!collection.claims.some((claim) => claim.measurements.some((item) => item.key.startsWith("traffic-"))), "collection-down must not leak current traffic");

  const compactCollection = build(collectionEvidence, stateFixture(collectionEvidence, {
    rest: {
      status: "failed",
      label: "失败",
      successAt: "2026-08-11T11:58:00Z",
      error: "实时 REST 通道未完成采集；慢速 REST 通道未完成采集；连接明细 REST 通道未完成采集",
    },
    ssh: {
      status: "failed",
      label: "失败",
      successAt: "2026-08-11T11:57:00Z",
      error: "静态 REST 采集失败",
    },
  }));
  const compactRest = claimByObject(compactCollection, "collection:rest");
  const compactSsh = claimByObject(compactCollection, "collection:ssh");
  check(evidenceItem(compactRest, "channel-error")?.value === "3 个 REST 端点未完成采集：实时、慢速、连接明细", "repeated REST endpoint failures must collapse into one bounded record");
  check(!/REST\s*采集失败/i.test(`${compactSsh?.summary || ""} ${evidenceItem(compactSsh, "channel-error")?.value || ""}`), "SSH copy must reject a legacy REST-only error");

  const noSnapshotEvidence = evidenceFixture({
    scenario: "no-snapshot",
    risk: "evidence",
    mode: "unavailable",
    traffic: trafficFixture(),
    resource: resourceFixture(),
  });
  const noSnapshot = build(noSnapshotEvidence, stateFixture(noSnapshotEvidence));
  check(noSnapshot.scene === "no-snapshot" && noSnapshot.forbidsCurrentData, "no-snapshot must use unavailable evidence semantics");
  check(noSnapshot.claims[0]?.kind === "evidence", "evidence loss must lead the no-snapshot scene");
  check(!noSnapshot.claims.some((claim) => claim.measurements.some((item) => item.value !== null)), "unavailable evidence must withdraw every current measurement");

  const offlineEvidence = evidenceFixture({
    scenario: "all-offline",
    risk: "wan",
    priorities: [priority("wan:one", "WAN 1", "WAN", "lineStatus")],
  });
  const offline = build(offlineEvidence, stateFixture(offlineEvidence));
  check(offline.scene === "all-offline" && offline.claims[0]?.objectId === "wan:one", "observed offline WAN must lead the outage scene");
  check(offline.claims[0]?.relationship?.verified === null, "missing route consequence must remain unknown");

  const historicalPathEvidence = evidenceFixture({
    scenario: "all-offline",
    risk: "wan",
    priorities: [priority("wan:one", "WAN 1", "WAN", "lineStatus")],
    routes: routeEvidence({ lastConfirmedActivePath: routePath({ observedAt: "2026-08-11T11:55:00Z", source: "history.routes[3]" }) }),
  });
  const historicalPath = build(historicalPathEvidence, stateFixture(historicalPathEvidence));
  check(historicalPath.claims[0]?.relationship?.evidenceMode === "historical", "last confirmed WAN route consequence must remain explicitly historical");
  check(historicalPath.claims[0]?.relationship?.observedAt === "2026-08-11T11:55:00Z", "historical route must retain its timestamp");

  const calmFleetEvidence = evidenceFixture({
    scenario: "fleet",
    risk: "none",
    routes: routeEvidence({ activePath: routePath() }),
    coverageObjects: [
      coverage("wan:one", "WAN 1"),
      coverage("wan:two", "WAN 2"),
      coverage("wan:three", "WAN 3"),
      coverage("wan:four", "WAN 4"),
    ],
  });
  const calmFleet = build(calmFleetEvidence, stateFixture(calmFleetEvidence));
  check(calmFleet.scene === "fleet", "fleet scene must remain available when no higher risk exists");
  check(calmFleet.decision.label === "多出口巡检" && calmFleet.decision.statement !== single.decision.statement, "calm fleet must have a first-screen identity distinct from single");
  check(JSON.stringify(calmFleet.decision.scopeFacts?.map((fact) => fact.value)) === JSON.stringify(["4 条", "4 条", "0 条"]), "calm fleet must expose WAN scope, running records, and unresolved count");
  check(calmFleet.claims[0]?.kind === "route" && calmFleet.defaultSelectedId === calmFleet.claims[0].id, "fleet scope must not replace the independently inspectable route claim");
  check(!fleet.decision.scopeFacts?.length && fleet.claims[0]?.kind === "interface", "real fleet risk must suppress scale decoration and keep the incident first");

  const scenes = new Set([single.scene, calmFleet.scene, fleet.scene, resource.scene, collection.scene, noSnapshot.scene, offline.scene]);
  check(["single", "fleet", "interfaces-down", "resource-full", "collection-down", "no-snapshot", "all-offline"].every((scene) => scenes.has(scene)), "model must support all seven Optical Patrol scenes");

  const repeated = build(singleEvidence, stateFixture(singleEvidence));
  check(JSON.stringify(single.claims.map((claim) => claim.id)) === JSON.stringify(repeated.claims.map((claim) => claim.id)), "claim IDs must remain stable for identical evidence");

  const panelRoutes = new Set(["overview", "interfaces", "lineStatus", "balance", "routes", "terminals", "dhcp", "arp", "trafficLoad", "loadAudit", "trafficAudit", "connections", "dns4", "dns6", "security", "logs", "serviceLogs", "readonlyDiagnostics", "more"]);
  for (const model of [single, noRoute, fleet, unknownDependency, resource, collection, noSnapshot, offline, historicalPath, calmFleet]) {
    check(model.claims.length > 0, `${model.scene} must expose claims`);
    check(model.claims.some((claim) => claim.id === model.defaultSelectedId), `${model.scene} defaultSelectedId must name a visible claim`);
    check(model.claims.every((claim) => claim.action.objectId === claim.objectId), `${model.scene} actions must remain object-bound`);
    check(model.claims.every((claim) => panelRoutes.has(claim.action.route)), `${model.scene} actions must use PanelRoute values`);
    check(model.tabletEvidenceGroups.every((group) => group.claimIds.every((id) => model.claims.some((claim) => claim.id === id))), `${model.scene} tablet groups must reference stable claims`);
    check(!/Pocket|pocket|pc__|data-pocket/.test(JSON.stringify(model)), `${model.scene} model must reject Pocket identifiers`);
  }
}

if (issues.length) {
  console.error("Optical Patrol model contract: FAIL");
  for (const issue of issues) console.error(`- ${issue}`);
  process.exit(1);
}

console.log("Optical Patrol model contract: PASS");
