const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const root = process.cwd();

function loadTypeScript(module, filename) {
  const source = fs.readFileSync(filename, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      moduleResolution: ts.ModuleResolutionKind.NodeJs,
      target: ts.ScriptTarget.ES2020,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
    fileName: filename,
  });
  module._compile(compiled.outputText, filename);
}

require.extensions[".ts"] = loadTypeScript;
require.extensions[".tsx"] = loadTypeScript;

const { buildSectionModel } = require(path.join(
  root,
  "src",
  "panel-framework",
  "sections",
  "sectionModels.ts",
));
const { OVERVIEW_SCENARIO_FIXTURES } = require(path.join(
  root,
  "src",
  "panel-framework",
  "overview",
  "scenarios.ts",
));
const { rowsFromModel } = require(path.join(
  root,
  "src",
  "panel-framework",
  "domain-workspace",
  "workspaceRows.ts",
));
const { stablePanelObjectId } = require(path.join(
  root,
  "src",
  "panel-framework",
  "sections",
  "panelObjectIdentity.ts",
));
const { selectSemanticWorkspacePreview } = require(path.join(
  root,
  "src",
  "panel-framework",
  "domain-workspace",
  "workspacePreview.ts",
));
const { diagnosticChannelSummaries, diagnosticFailureLabel } = require(path.join(
  root,
  "src",
  "panel-framework",
  "sections",
  "diagnosticFailureModel.ts",
));
const { deriveOverviewState } = require(path.join(
  root,
  "src",
  "panel-framework",
  "overview",
  "deriveOverviewState.ts",
));
const { sectionRecoveryState } = require(path.join(
  root,
  "src",
  "panel-framework",
  "sections",
  "route-recovery",
  "routeRecoveryState.ts",
));

assert.equal(
  diagnosticFailureLabel(true),
  "采集失败",
  "current diagnostic evidence must remain explicit about a current collection failure",
);
assert.equal(
  diagnosticFailureLabel(false),
  "失败记录",
  "historical or unavailable diagnostic objects must remain self-contained away from the page boundary",
);
assert.equal(`${diagnosticFailureLabel(false)}证据`, "失败记录证据");

const clone = (value) => structuredClone(value);
const metric = (model, label) => model.metrics.find((item) => item.label === label);
const localShortTimestamp = (value) => {
  const date = new Date(value);
  const pad = (part) => String(part).padStart(2, "0");
  return `${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const localeStableSource = fs.readFileSync(
  path.join(root, "src/panel-framework/sections/panelObjectIdentity.ts"),
  "utf8",
);
assert.doesNotMatch(localeStableSource, /toLocaleLowerCase/, "deep-link IDs must not depend on the viewer locale");
assert.notEqual("ISTANBUL".toLocaleLowerCase("tr"), "istanbul", "Turkish casing must exercise a distinct locale path");
assert.equal(
  stablePanelObjectId("interfaces", "interface", ["ISTANBUL"]),
  stablePanelObjectId("interfaces", "interface", ["istanbul"]),
  "stable deep-link IDs must use locale-independent normalization",
);

const missingRate = clone(OVERVIEW_SCENARIO_FIXTURES.single);
delete missingRate.wan[0].downRate;
delete missingRate.pppoe[0].downRate;
const missingRateModel = buildSectionModel("lineStatus", missingRate);
assert.equal(missingRateModel.evidenceMode, "current");
assert.equal(metric(missingRateModel, "当前下载").value, "未取得", "missing WAN rate must remain unavailable");
assert.equal(metric(missingRateModel, "当前上传").value, "未取得", "an incomplete aggregate must not mix observed and missing rates");

const zeroRate = clone(OVERVIEW_SCENARIO_FIXTURES.single);
zeroRate.wan[0].downRate = 0;
zeroRate.wan[0].upRate = 0;
zeroRate.pppoe[0].downRate = 0;
zeroRate.pppoe[0].upRate = 0;
const zeroRateModel = buildSectionModel("lineStatus", zeroRate);
assert.equal(metric(zeroRateModel, "当前下载").value, "0 bps", "explicit zero must remain a measured zero");
assert.equal(metric(zeroRateModel, "当前上传").value, "0 bps", "explicit zero must remain a measured zero");

const resourceHistory = clone(OVERVIEW_SCENARIO_FIXTURES.single);
resourceHistory.updatedAt = "2026-07-16T10:00:00Z";
resourceHistory.overview.cpuLoad = 20;
resourceHistory.overview.memoryUsage = 40;
resourceHistory.overview.diskUsage = 60;
resourceHistory.overview.history = {
  resourceSamples: [
    { timestamp: "2026-07-16T09:59:50Z", cpu: 10, memory: 30, disk: 50, source: "section-model-test", evidenceMode: "current" },
    { timestamp: "2026-07-16T10:00:00Z", cpu: 20, memory: 40, disk: 60, source: "section-model-test", evidenceMode: "current" },
  ],
};
assert.equal(buildSectionModel("loadAudit", resourceHistory).visualization?.series[0].points.length, 2);
const singleResourcePoint = clone(resourceHistory);
singleResourcePoint.overview.history.resourceSamples = [resourceHistory.overview.history.resourceSamples[1]];
assert.equal(
  buildSectionModel("loadAudit", singleResourcePoint).visualization,
  undefined,
  "a single timestamped resource sample must remain a summary, not a trend",
);
const invalidResourceHistory = clone(resourceHistory);
invalidResourceHistory.overview.history.resourceSamples[0].timestamp = 1721123990;
assert.equal(buildSectionModel("loadAudit", invalidResourceHistory).visualization, undefined, "numeric epoch resource history must not be guessed by the frontend");
const legacyParallelResourceHistory = clone(resourceHistory);
legacyParallelResourceHistory.overview.history = {
  timestamps: ["2026-07-16T09:59:50Z", "2026-07-16T10:00:00Z"],
  cpu: [10, 20],
  memory: [30, 40],
  disk: [50, 60],
};
assert.equal(buildSectionModel("loadAudit", legacyParallelResourceHistory).visualization, undefined, "parallel resource arrays must not be reconstructed into a trend");

const missingConnections = clone(OVERVIEW_SCENARIO_FIXTURES.single);
delete missingConnections.connections.total;
assert.equal(metric(buildSectionModel("connections", missingConnections), "连接总数").value, "未取得");
missingConnections.connections.total = 0;
assert.equal(metric(buildSectionModel("connections", missingConnections), "连接总数").value, "0");

const missingObservationCounts = clone(OVERVIEW_SCENARIO_FIXTURES.single);
delete missingObservationCounts.interfaces;
missingObservationCounts.connections.total = null;
const missingObservationState = deriveOverviewState(missingObservationCounts);
assert.equal(missingObservationState.counts.interfacesTotal, null, "missing interface collection count must remain unavailable");
assert.equal(missingObservationState.counts.connections, null, "missing protocol total must remain unavailable");
const observedZeroCounts = clone(OVERVIEW_SCENARIO_FIXTURES.single);
observedZeroCounts.interfaces = [];
observedZeroCounts.connections.total = 0;
const observedZeroState = deriveOverviewState(observedZeroCounts);
assert.equal(observedZeroState.counts.interfacesTotal, 0, "observed empty interface collection must preserve zero");
assert.equal(observedZeroState.counts.connections, 0, "observed protocol zero must preserve zero");

const undeclaredConnectionCoverage = clone(OVERVIEW_SCENARIO_FIXTURES.single);
undeclaredConnectionCoverage.connections.total = 42;
undeclaredConnectionCoverage.connections.active = [{}];
const undeclaredCoverageMetric = metric(buildSectionModel("connections", undeclaredConnectionCoverage), "活动明细样本");
assert.equal(undeclaredCoverageMetric.value, "1 / 42", "connection detail rows must be compared with the reported total");
assert.equal(undeclaredCoverageMetric.note, "完整性未声明", "missing coverage metadata must remain explicitly unknown");
assert.equal(undeclaredCoverageMetric.tone, "warn", "unknown connection coverage must not receive a trusted tone");

const sampledConnectionCoverage = clone(undeclaredConnectionCoverage);
sampledConnectionCoverage.connections.meta = {
  active: { actualCount: 42, totalCount: 42, shownCount: 1, hasMore: true, sampled: true },
};
const sampledCoverageMetric = metric(buildSectionModel("connections", sampledConnectionCoverage), "活动明细样本");
assert.equal(sampledCoverageMetric.value, "1 / 42");
assert.equal(sampledCoverageMetric.note, "非全量枚举 · 活动速率样本");
assert.equal(sampledCoverageMetric.tone, "warn");

const completeConnectionCoverage = clone(undeclaredConnectionCoverage);
completeConnectionCoverage.connections.total = 1;
completeConnectionCoverage.connections.meta = {
  active: { actualCount: 1, totalCount: 1, shownCount: 1, hasMore: false, sampled: false },
};
const completeCoverageMetric = metric(buildSectionModel("connections", completeConnectionCoverage), "活动明细样本");
assert.equal(completeCoverageMetric.value, "1 / 1");
assert.equal(completeCoverageMetric.note, "快照声明完整枚举");
assert.equal(completeCoverageMetric.tone, "trust");

const missingOperationalCollections = clone(OVERVIEW_SCENARIO_FIXTURES.single);
delete missingOperationalCollections.terminals;
missingOperationalCollections.routes = {};
missingOperationalCollections.dhcp = {};
missingOperationalCollections.arp = {};
missingOperationalCollections.connections = {};
missingOperationalCollections.dns = {};
missingOperationalCollections.security = {};
missingOperationalCollections.logs = {};
assert.equal(metric(buildSectionModel("routes", missingOperationalCollections), "路由记录").value, "未取得");
assert.equal(metric(buildSectionModel("terminals", missingOperationalCollections), "终端记录").value, "未取得");
assert.equal(metric(buildSectionModel("dhcp", missingOperationalCollections), "租约").value, "未取得");
assert.equal(metric(buildSectionModel("arp", missingOperationalCollections), "身份告警").value, "未取得");
assert.equal(metric(buildSectionModel("connections", missingOperationalCollections), "活动明细样本").value, "未取得");
assert.equal(metric(buildSectionModel("dns4", missingOperationalCollections), "静态规则").value, "未取得");
assert.equal(metric(buildSectionModel("security", missingOperationalCollections), "告警记录").value, "未取得");
assert.equal(metric(buildSectionModel("logs", missingOperationalCollections), "全部记录").value, "未取得");

const staticRouteFallback = clone(OVERVIEW_SCENARIO_FIXTURES.single);
delete staticRouteFallback.routes.items;
delete staticRouteFallback.routes.defaultRoutes;
staticRouteFallback.routes.staticRoutes = [{ dstAddress: "0.0.0.0/0", gateway: "192.0.2.1", active: true, default: true }];
assert.equal(buildSectionModel("routes", staticRouteFallback).tables[0].rows[0].destination, "0.0.0.0/0");

const categorizedLogsFallback = clone(OVERVIEW_SCENARIO_FIXTURES.single);
categorizedLogsFallback.logs = {
  system: [{ time: "2026-07-17T10:03:12Z", topics: "system,info", message: "categorized event" }],
  firewall: [],
  dhcp: [],
  dns: [],
};
const categorizedLogRows = rowsFromModel("logs", buildSectionModel("logs", categorizedLogsFallback));
assert.equal(categorizedLogRows[0].primary, "categorized event", "categorized logs must remain visible when logs.all is absent");

const routeModel = buildSectionModel("routes", clone(OVERVIEW_SCENARIO_FIXTURES.single));
assert.equal(metric(routeModel, "默认路由").value, "1", "defaultRoutes collection is itself default-route evidence");

const missingObjectArrays = clone(OVERVIEW_SCENARIO_FIXTURES.single);
delete missingObjectArrays.wan;
delete missingObjectArrays.pppoe;
delete missingObjectArrays.interfaces;
assert.equal(metric(buildSectionModel("lineStatus", missingObjectArrays), "运行线路").value, "未取得");
assert.equal(metric(buildSectionModel("interfaces", missingObjectArrays), "接口总数").value, "未取得");

const unknownObjectState = clone(OVERVIEW_SCENARIO_FIXTURES.single);
unknownObjectState.routes.defaultRoutes = [{ dstAddress: "0.0.0.0/0", gateway: "192.0.2.1", distance: 1 }];
const unknownRouteTable = buildSectionModel("routes", unknownObjectState).tables[0];
assert.equal(unknownRouteTable.rows[0].status, "未确认");
assert.equal(unknownRouteTable.rowMeta[0].active, null);
unknownObjectState.dns = { forwardRules: [{ name: "router.local", type: "A", value: "192.0.2.1" }] };
const unknownDnsTable = buildSectionModel("dns4", unknownObjectState).tables[0];
assert.equal(unknownDnsTable.rows[0].status, "未确认");
assert.equal(unknownDnsTable.rowMeta[0].tags.includes("enabled"), false);

const productionTerminalShape = clone(OVERVIEW_SCENARIO_FIXTURES.single);
productionTerminalShape.terminals = [{
  ip: "192.0.2.21",
  mac: "02:00:00:00:00:21",
  hostname: "workstation",
  status: "reachable",
  connections: 7,
  downRate: 1200,
  upRate: 300,
}];
const terminalModel = buildSectionModel("terminals", productionTerminalShape);
assert.equal(metric(terminalModel, "在线标记").value, "1", "RouterOS reachable state is current terminal evidence");
assert.equal(metric(terminalModel, "连接合计").value, "7", "production connections field must be aggregated");

const productionConnectionShape = clone(OVERVIEW_SCENARIO_FIXTURES.single);
productionConnectionShape.connections.active = [{
  localIp: "192.0.2.21",
  remoteIp: "198.51.100.8",
  protocol: "TCP",
  totalRate: 1500,
}];
const connectionModel = buildSectionModel("connections", productionConnectionShape);
assert.equal(connectionModel.tables[0].rows[0].source, "192.0.2.21", "production localIp must be the connection source");
assert.equal(connectionModel.tables[0].rows[0].target, "198.51.100.8 / TCP", "production remoteIp and protocol must identify the connection target");
const connectionRows = rowsFromModel("connections", connectionModel);
assert.equal(connectionRows[0].primary, "192.0.2.21");
assert.equal(connectionRows[0].secondary, "198.51.100.8 / TCP");
assert.equal(connectionRows[0].trailing, "1500");
assert.equal(connectionRows[0].meta.protocol, "tcp");
assert.equal(connectionRows[0].meta.trafficBps, 1500);
assert.equal(connectionRows[0].meta.address, "192.0.2.21");
assert.equal(connectionRows[0].meta.targetAddress, "198.51.100.8");

const securityShape = clone(OVERVIEW_SCENARIO_FIXTURES.single);
securityShape.security = {
  filters: [{
    chain: "input",
    action: "accept",
    comment: "allow established",
    packets: 12,
    bytes: 1024,
    disabled: false,
  }],
  alerts: [],
  addressLists: [],
};
const securityRows = rowsFromModel("security", buildSectionModel("security", securityShape));
assert.equal(securityRows[0].primary, "allow established", "rule comments must be the scannable object identity");
assert.equal(securityRows[0].secondary, "input · accept", "chain and action must remain visible without opening detail");
assert.equal(securityRows[0].trailing, "accept", "missing rule order must not become the primary label");

const logShape = clone(OVERVIEW_SCENARIO_FIXTURES.single);
logShape.logs = {
  all: [{ observedAt: "2026-07-17T12:00:01Z", topics: "system,info", message: "link state changed" }],
  system: [{ observedAt: "2026-07-17T12:00:01Z", topics: "system,info", message: "link state changed" }],
  firewall: [],
  dhcp: [],
  dns: [],
};
const logRows = rowsFromModel("logs", buildSectionModel("logs", logShape));
assert.equal(logRows[0].primary, "link state changed", "log message must be scannable before opening detail");
assert.equal(logRows[0].secondary, "2026-07-17T12:00:01Z");
assert.equal(logRows[0].trailing, "system · info");

const domainDetailShape = clone(OVERVIEW_SCENARIO_FIXTURES.single);
domainDetailShape.interfaces = [{
  name: "ether1",
  role: "WAN",
  type: "ether",
  running: false,
  disabled: false,
  parentInterface: "bridge-wan",
  mac: "02:00:00:00:00:01",
  vlanId: 20,
  ips: ["192.0.2.2/24"],
  networks: ["192.0.2.0"],
  rxRate: 2400,
  txRate: 800,
  rxBytes: 120000,
  txBytes: 44000,
  rxPackets: 300,
  txPackets: 220,
  rxDrop: 3,
  txDrop: 2,
  rxError: 1,
  txError: 0,
  lossRate: 0.5,
  errorRate: 0.1,
  qualityUpdatedAt: "2026-07-17T10:03:12Z",
  qualitySampleCount: 8,
  qualitySampleReady: true,
}];
domainDetailShape.routes = {
  items: [{
    dstAddress: "0.0.0.0/0",
    gateway: "ether1",
    table: "main",
    distance: 1,
    active: true,
    disabled: false,
    static: true,
    dynamic: false,
    default: true,
    family: "IPv4",
    comment: "primary uplink",
  }],
  defaultRoutes: [],
};
const interfaceEvidence = buildSectionModel("interfaces", domainDetailShape).tables[0].rowEvidence[0];
assert.equal(interfaceEvidence.kind, "interface");
assert.equal(interfaceEvidence.parent, "bridge-wan");
assert.deepEqual(interfaceEvidence.addresses, ["192.0.2.2/24"]);
assert.equal(interfaceEvidence.dropTotal, 5);
assert.equal(interfaceEvidence.errorTotal, 1);
assert.equal(interfaceEvidence.qualitySampleCount, 8);
assert.equal(interfaceEvidence.defaultRouteRelation, "direct");
assert.equal(interfaceEvidence.defaultRoutes.length, 1);

const routeEvidence = buildSectionModel("routes", domainDetailShape).tables[0].rowEvidence[0];
assert.equal(routeEvidence.kind, "route");
assert.equal(routeEvidence.isDefault, true);
assert.equal(routeEvidence.active, true);
assert.equal(routeEvidence.gateway, "ether1");
assert.equal(routeEvidence.protocol, "static");
assert.equal(routeEvidence.interfaceRelation, "direct");
assert.equal(routeEvidence.relatedInterface.name, "ether1");
assert.equal(routeEvidence.relatedInterface.running, false);

domainDetailShape.terminals = [{
  ip: "192.0.2.21",
  mac: "02:00:00:00:00:21",
  hostname: "workstation",
  status: "reachable",
  lastSeen: "12s",
  downRate: 1200,
  upRate: 300,
  connections: 7,
  sessionBytes: 9000,
}];
domainDetailShape.dhcp = {
  leases: [{ address: "192.0.2.21", macAddress: "02:00:00:00:00:21", hostName: "workstation", server: "lan-dhcp", status: "bound" }],
};
domainDetailShape.arp = {
  items: [{ ip: "192.0.2.21", mac: "02:00:00:00:00:21", interface: "bridge-lan", status: "reachable" }],
  alerts: [],
};
const terminalEvidence = buildSectionModel("terminals", domainDetailShape).tables[0].rowEvidence[0];
assert.equal(terminalEvidence.kind, "terminal");
assert.equal(terminalEvidence.interfaceName, "bridge-lan");
assert.equal(terminalEvidence.dhcpStatus, "bound");
assert.equal(terminalEvidence.arpStatus, "reachable");
assert.deepEqual(terminalEvidence.identitySources, ["ARP", "DHCP", "连接跟踪"]);

const dhcpLeaseEvidence = buildSectionModel("dhcp", domainDetailShape).tables
  .find((item) => item.title === "地址租约").rowEvidence[0];
assert.equal(dhcpLeaseEvidence.kind, "terminal");
assert.equal(dhcpLeaseEvidence.dhcpStatus, "bound");
assert.equal(dhcpLeaseEvidence.dhcpServer, "lan-dhcp");
assert.deepEqual(dhcpLeaseEvidence.identitySources, ["ARP", "DHCP"]);

const arpObjectEvidence = buildSectionModel("arp", domainDetailShape).tables
  .find((item) => item.title === "ARP 对象").rowEvidence[0];
assert.equal(arpObjectEvidence.kind, "terminal");
assert.equal(arpObjectEvidence.interfaceName, "bridge-lan");
assert.deepEqual(arpObjectEvidence.identitySources, ["ARP", "DHCP"]);

domainDetailShape.arp.alerts = [{ ip: "192.0.2.21", type: "conflict", message: "duplicate identity" }];
const arpAlertEvidence = buildSectionModel("arp", domainDetailShape).tables
  .find((item) => item.title === "身份告警").rowEvidence[0];
assert.equal(arpAlertEvidence.kind, "arp-alert", "ARP alerts must expose a dedicated evidence contract");
assert.equal(arpAlertEvidence.address, "192.0.2.21");
assert.equal(arpAlertEvidence.detail, "duplicate identity");

domainDetailShape.logs = {
  all: [
    { time: "2026-07-17T10:03:12Z", topics: "system,warning", message: "ether1 link down" },
    { time: "2026-07-17T10:04:12Z", topics: "system,info", message: "route recalculated" },
    { time: "2026-07-17T10:02:12Z", topics: "system,info", message: "carrier changed" },
  ],
  system: [], firewall: [], dhcp: [], dns: [],
};
const logEvidence = buildSectionModel("logs", domainDetailShape).tables[0].rowEvidence[0];
assert.equal(logEvidence.kind, "log");
assert.equal(logEvidence.timestamp, Date.parse("2026-07-17T10:03:12Z"));
assert.equal(logEvidence.severity, "warning");
assert.equal(logEvidence.neighbors.length, 2);
assert.equal(logEvidence.neighbors[0].relation, "newer");
assert.equal(logEvidence.neighbors[0].message, "route recalculated");
assert.equal(logEvidence.neighbors[1].relation, "older");
assert.equal(logEvidence.neighbors[1].message, "carrier changed");

domainDetailShape.security = {
  filters: [{ rawOrder: 4, id: "*4", chain: "forward", action: "drop", packets: 12, bytes: 2048, disabled: false, inInterface: "ether1", dstAddress: "192.0.2.0/24" }],
  alerts: [],
  addressLists: [],
};
const securityEvidence = buildSectionModel("security", domainDetailShape).tables.find((item) => item.title === "防火墙规则").rowEvidence[0];
assert.equal(securityEvidence.kind, "security");
assert.equal(securityEvidence.objectType, "rule");
assert.equal(securityEvidence.packets, 12);
assert.equal(securityEvidence.inInterface, "ether1");

domainDetailShape.dns = {
  running: true,
  servers: ["1.1.1.1", "2606:4700:4700::1111"],
  dohServer: "https://dns.example/dns-query",
  verifyDohCert: true,
  forwardRules: [{ name: "router.local", type: "A", value: "192.0.2.1", ttl: "1h", comment: "LAN", disabled: false }],
};
const dnsEvidence = buildSectionModel("dns4", domainDetailShape).tables[0].rowEvidence[0];
assert.equal(dnsEvidence.kind, "dns");
assert.deepEqual(dnsEvidence.upstreamServers, ["1.1.1.1", "2606:4700:4700::1111"]);
assert.equal(dnsEvidence.ttl, "1h");
assert.equal(dnsEvidence.verifyDohCert, true);

domainDetailShape.dns.ipv6Nd = [{
  interface: "bridge-lan",
  status: "running",
  advertiseDns: true,
  dnsServers: ["2001:db8::53"],
  addDefaultRoute: false,
}];
domainDetailShape.dns.ipv6DhcpClients = [{
  interface: "ether1",
  status: "bound",
  usePeerDns: true,
  addDefaultRoute: true,
}];
const dns6Table = buildSectionModel("dns6", domainDetailShape).tables[0];
assert.equal(dns6Table.rows[0].status, "运行");
const dns6Evidence = dns6Table.rowEvidence;
assert.equal(dns6Evidence[0].kind, "dns");
assert.equal(dns6Evidence[0].objectType, "ipv6-nd");
assert.deepEqual(dns6Evidence[0].publishedDns, ["2001:db8::53"]);
assert.equal(dns6Evidence[1].kind, "dns");
assert.equal(dns6Evidence[1].objectType, "ipv6-dhcp");
assert.equal(dns6Evidence[1].peerDns, true);
assert.equal(dns6Evidence[1].addDefaultRoute, true);

const historical = buildSectionModel("lineStatus", clone(OVERVIEW_SCENARIO_FIXTURES["collection-down"]));
assert.equal(historical.evidenceMode, "historical");
assert.ok(metric(historical, "历史下载"));
assert.equal(historical.status, "历史证据 · 不代表当前", "the first status statement must establish the historical boundary");
assert.equal(historical.metrics.every((item) => item.tone === "warn"), true, "historical metrics must not retain current-incident danger tone");
assert.equal(historical.metrics.some((item) => /历史记录，不代表当前/.test(item.note || "")), false, "the boundary belongs in the primary status, not repeated in every metric");
assert.ok(historical.tables.every((item) => /历史记录.*不代表当前/.test(item.note)));

const currentDiagnosticSnapshot = clone(OVERVIEW_SCENARIO_FIXTURES.single);
const currentDiagnosticModel = buildSectionModel("readonlyDiagnostics", currentDiagnosticSnapshot);
assert.equal(
  currentDiagnosticModel.metrics.some((item) => item.value === "已记录失败端点 0"),
  true,
  "an observed channel with zero failures must not be presented as an unobserved or generic healthy state",
);
const partialDiagnosticSnapshot = clone(OVERVIEW_SCENARIO_FIXTURES.single);
delete partialDiagnosticSnapshot.meta.detailEndpointFailures;
delete partialDiagnosticSnapshot.meta.connectionDetailError;
delete partialDiagnosticSnapshot.meta.connectionDetailUpdatedAt;
const partialDiagnosticModel = buildSectionModel("readonlyDiagnostics", partialDiagnosticSnapshot);
assert.equal(sectionRecoveryState(partialDiagnosticModel), "partial", "one missing diagnostic channel must produce an explicit partial recovery state");
assert.equal(
  partialDiagnosticModel.metrics.some((item) => item.label === "连接明细 REST" && item.value === "未取得"),
  true,
  "a channel without observations must remain unavailable instead of becoming zero failures",
);

const unattemptedDiagnosticSnapshot = clone(OVERVIEW_SCENARIO_FIXTURES.single);
for (const [failures, error, observedAt] of [
  ["realtimeEndpointFailures", "realtimeError", "realtimeUpdatedAt"],
  ["slowRestEndpointFailures", "slowRestError", "slowRestUpdatedAt"],
  ["staticEndpointFailures", "staticError", "staticUpdatedAt"],
  ["detailEndpointFailures", "connectionDetailError", "connectionDetailUpdatedAt"],
]) {
  unattemptedDiagnosticSnapshot.meta[failures] = [];
  delete unattemptedDiagnosticSnapshot.meta[error];
  delete unattemptedDiagnosticSnapshot.meta[observedAt];
}
assert.equal(
  diagnosticChannelSummaries(unattemptedDiagnosticSnapshot.meta).every((channel) => channel.observed === false),
  true,
  "an empty endpoint array without attempt or coverage evidence must stay unavailable",
);

const diagnosticSnapshot = clone(OVERVIEW_SCENARIO_FIXTURES["collection-down"]);
const diagnosticModel = buildSectionModel("readonlyDiagnostics", diagnosticSnapshot);
const diagnosticTable = diagnosticModel.tables[0];
assert.equal(diagnosticTable.rows.length, 4, "all realtime, slow, static and detail endpoint failures must remain visible");
assert.equal(diagnosticTable.rowEvidence.every((item) => item.kind === "diagnostic"), true);
assert.deepEqual(
  diagnosticTable.rowEvidence.map((item) => item.channel),
  ["realtime-rest", "slow-rest", "static-rest", "detail-rest"],
);
assert.equal(diagnosticTable.rowEvidence.every((item) => item.totalFailureCount === 4), true);
assert.equal(diagnosticTable.rowEvidence.every((item) => item.transport === "REST"), true);
assert.equal(diagnosticModel.metrics.some((item) => /SSH 采集/.test(item.label)), false, "static REST failures must not masquerade as SSH collection");
assert.equal(diagnosticModel.metrics.some((item) => item.label === "慢速 REST"), true);
assert.equal(diagnosticModel.status, "历史诊断记录 · 不代表当前");
assert.equal(diagnosticModel.metrics.every((item) => item.tone === "warn"), true, "historical endpoint records must render as historical evidence, not current incidents");
assert.equal(diagnosticModel.metrics.every((item) => /记录/.test(item.value)), true, "the compact channel ledger must identify each value as a record count");
assert.equal(diagnosticModel.metrics.every((item) => item.note !== "时间未取得"), true, "a channel ledger must reuse its endpoint record time when the channel timestamp is absent");
assert.equal(diagnosticModel.metrics.some((item) => item.value === "通道失败"), false, "historical summaries must not make an unqualified current failure claim");

const legacyDiagnosticSnapshot = clone(OVERVIEW_SCENARIO_FIXTURES.single);
const legacyAt = "2026-07-19T02:30:00Z";
Object.assign(legacyDiagnosticSnapshot.meta, {
  realtimeUpdatedAt: legacyAt,
  slowRestUpdatedAt: legacyAt,
  staticUpdatedAt: legacyAt,
  connectionDetailUpdatedAt: legacyAt,
  realtimeEndpointFailures: { interfaces: "legacy realtime failure" },
  slowRestEndpointFailures: { routes: "legacy slow failure" },
  staticEndpointFailures: { logs: "legacy static failure" },
  detailEndpointFailures: { ipv6_neighbors: "legacy detail failure" },
});
const legacyDiagnosticModel = buildSectionModel("readonlyDiagnostics", legacyDiagnosticSnapshot);
assert.equal(legacyDiagnosticModel.evidenceMode, "historical", "legacy dictionary failures must still degrade current evidence");
assert.equal(legacyDiagnosticModel.tables[0].rows.length, 4, "legacy dictionary failures must not be swallowed");
assert.equal(legacyDiagnosticModel.tables[0].rowEvidence.every((item) => item.kind === "diagnostic"), true);

const unavailableFixture = clone(OVERVIEW_SCENARIO_FIXTURES["no-snapshot"]);
const unavailable = buildSectionModel("trafficLoad", unavailableFixture);
assert.equal(unavailable.evidenceMode, "unavailable");
assert.equal(unavailable.metrics[0].value, "不可用");
assert.equal(
  unavailable.metrics[1].value,
  localShortTimestamp(unavailableFixture.meta.realtimeUpdatedAt),
  "the explicit last-success timestamp remains historical evidence in the viewer's local timezone",
);
assert.notEqual(
  unavailable.metrics[1].value,
  localShortTimestamp(unavailableFixture.updatedAt),
  "the failed attempt time must not replace the last successful evidence time",
);
assert.equal(unavailable.metrics[2].value, "不可判断");
assert.ok(unavailable.tables.every((item) => item.rows.length === 0));
assert.ok(unavailable.tables.every((item) => item.rowMeta.length === 0));
assert.ok(unavailable.tables.every((item) => item.rowEvidence.length === 0));
assert.doesNotMatch(JSON.stringify(unavailable), /0 bps|0%|当前下载|当前上传/);

const explicitZeroModel = {
  tables: [{
    title: "零值对象",
    columns: [{ key: "value", label: "值" }],
    rows: [{ value: "0" }],
    rowMeta: [],
    rowEvidence: [],
  }],
};
const explicitZeroRow = rowsFromModel("connections", explicitZeroModel)[0];
assert.equal(explicitZeroRow.primary, "0", "workspace rows must preserve an explicit zero string");
assert.equal(explicitZeroRow.trailing, "0", "workspace comparison state must preserve an explicit zero string");
assert.equal(
  selectSemanticWorkspacePreview([explicitZeroRow]),
  null,
  "a generic first row must not become an automatic inspector recommendation",
);
const desktopWorkspaceSource = fs.readFileSync(path.join(root, "src/panel-framework/sections/DesktopDomainWorkspace.tsx"), "utf8");
assert.match(desktopWorkspaceSource, /\{row\.primary\}/, "desktop object cells must render the normalized workspace value directly");
assert.doesNotMatch(desktopWorkspaceSource, /row\.primary\s*\|\|/, "desktop object cells must not convert zero to an em dash");
assert.match(desktopWorkspaceSource, /selectSemanticWorkspacePreview/, "desktop preview must consume the shared semantic policy");
assert.doesNotMatch(desktopWorkspaceSource, /function preferredRow/, "desktop must not maintain a second preview policy");
assert.doesNotMatch(desktopWorkspaceSource, /rows\[0\]/, "desktop automatic preview must not use positional fallback");
const desktopInspectorSource = fs.readFileSync(path.join(root, "src/panel-framework/sections/DesktopDomainInspector.tsx"), "utf8");
const desktopLogBlock = desktopInspectorSource.slice(
  desktopInspectorSource.indexOf("function LogEvidence"),
  desktopInspectorSource.indexOf("function SecurityEvidence"),
);
assert.match(desktopInspectorSource, /diagnosticEvidence \? diagnosticEvidence\.objectName : row\.primary/, "diagnostic detail must prioritize the endpoint object while log preview identifies the selected event");
assert.match(desktopInspectorSource, /diagnosticEvidence \? valueOf\(diagnosticEvidence\.endpoint\) : isLog \? `\$\{row\.trailing\} · \$\{row\.secondary\}`/, "diagnostic detail must retain the endpoint path while log detail retains topic and time");
assert.equal((desktopLogBlock.match(/evidence\.message/g) || []).length, 0, "log preview body must keep the event message out so its evidence remains novel");

console.log("section model evidence contract: PASS missing-zero-historical-unavailable");
