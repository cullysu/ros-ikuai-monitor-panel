import type { OverviewRawSnapshot, OverviewScenarioKey } from "./types";

const now = new Date().toISOString();
const nowMilliseconds = Date.parse(now);
const rateTimestamps = () => Array.from(
  { length: 6 },
  (_, index) => new Date(nowMilliseconds - (5 - index) * 180_000).toISOString(),
);
const trafficSamples = (downlink: number[], uplink: number[]) => rateTimestamps().map((timestamp, index) => ({
  timestamp,
  downlink: downlink[index],
  uplink: uplink[index],
  source: "scenario-fixture",
  evidenceMode: "current" as const,
}));
const resourceHistory = (cpu: number[], memory: number[], disk: number[]) => {
  const timestamps = rateTimestamps();
  return {
    timestamps,
    resourceSamples: timestamps.map((timestamp, index) => ({
      timestamp,
      cpu: cpu[index],
      memory: memory[index],
      disk: disk[index],
      source: "scenario-fixture",
      evidenceMode: "current" as const,
    })),
    cpu,
    memory,
    disk,
  };
};

const base = (scenario: OverviewScenarioKey): OverviewRawSnapshot => ({
  status: "ok",
  updatedAt: now,
  meta: {
    scaleScenario: scenario,
    configuredIdentity: scenario === "fleet" ? "Fleet-Core" : "RouterOS",
    target: "10.0.0.1",
    routerHost: "10.0.0.1",
    pollSeconds: 5,
    realtimeUpdatedAt: now,
    slowRestUpdatedAt: now,
    staticUpdatedAt: now,
    capabilities: { restTrusted: true, sshRead: true },
  },
  overview: {
    identity: "RouterOS",
    version: "7.15",
    boardName: "RB5009",
    architecture: "arm64",
    uptime: "2d4h",
    cpuLoad: 28,
    memoryUsage: 34,
    diskUsage: 22,
    history: {
      ...resourceHistory([22, 25, 24, 27, 26, 28], [31, 32, 32, 33, 33, 34], [22, 22, 22, 22, 22, 22]),
      trafficSamples: trafficSamples([2100, 2600, 2300, 3100, 2900, 3400], [800, 920, 760, 1080, 1010, 1200]),
    },
  },
  wan: [{ name: "pppoe-out10", parent: "ether1", running: true, upRate: 1200, downRate: 3400 }],
  pppoe: [{ name: "pppoe-out10", parent: "ether1", running: true, upRate: 1200, downRate: 3400 }],
  interfaces: [{ name: "ether1", type: "ether", running: true, bridge: "bridge-lan" }],
  routes: { defaultRoutes: [{ table: "main", gateway: "pppoe-out10", distance: 1, active: true, disabled: false }] },
  connections: { total: 1234, active: [{}, {}], topIps: [{}] },
  terminals: [{ name: "client-1", ip: "192.168.88.10", status: "online" }],
});

export const OVERVIEW_SCENARIO_FIXTURES: Record<OverviewScenarioKey, OverviewRawSnapshot> = {
  single: base("single"),
  fleet: {
    ...base("fleet"),
    overview: {
      ...base("fleet").overview,
      identity: "Fleet-Core",
      cpuLoad: 42,
      memoryUsage: 51,
      diskUsage: 31,
      history: {
        ...resourceHistory([35, 38, 36, 40, 41, 42], [47, 48, 49, 50, 50, 51], [31, 31, 31, 31, 31, 31]),
        trafficSamples: trafficSamples([12400, 14600, 13900, 16200, 17100, 18000], [6100, 7300, 6800, 8100, 8500, 9000]),
      },
    },
    wan: [1, 2, 3, 4].map((index) => ({
      name: `pppoe-out${index}0`,
      parent: `ether${index}`,
      running: true,
      upRate: 2000 + index * 100,
      downRate: 4000 + index * 200,
    })),
    pppoe: [1, 2, 3, 4].map((index) => ({
      name: `pppoe-out${index}0`,
      parent: `ether${index}`,
      running: true,
      upRate: 2000 + index * 100,
      downRate: 4000 + index * 200,
    })),
    interfaces: [
      { name: "ether1", type: "ether", running: true, bridge: "bridge-lan" },
      { name: "ether9", type: "ether", running: false, disabled: false },
      { name: "vlan30", type: "vlan", running: false, disabled: false, parent: "ether9" },
      { name: "sfp-lan", type: "ether", running: false, disabled: false },
    ],
    routes: {
      defaultRoutes: [
        { table: "main", gateway: "1.1.1.1", distance: 1, active: true, disabled: false },
        { table: "main", gateway: "ether9", distance: 2, active: false, disabled: false },
        { table: "main", gateway: "vlan30", distance: 3, active: false, disabled: false },
        { table: "main", gateway: "sfp-lan", distance: 4, active: false, disabled: false },
      ],
    },
    connections: { total: 8600, active: [{}, {}, {}], topIps: [{}, {}] },
  },
  "all-offline": {
    ...base("all-offline"),
    wan: [1, 2, 3, 4, 5, 6, 7, 8].map((index) => ({
      name: `pppoe-wan${index}`,
      parent: `ether${index}`,
      running: false,
      upRate: 0,
      downRate: 0,
    })),
    pppoe: [1, 2, 3, 4, 5, 6, 7, 8].map((index) => ({
      name: `pppoe-wan${index}`,
      parent: `ether${index}`,
      running: false,
      upRate: 0,
      downRate: 0,
    })),
    routes: {
      defaultRoutes: [
        { table: "main", gateway: "pppoe-wan1", distance: 1, active: false, disabled: false },
        { table: "main", gateway: "pppoe-wan2", distance: 2, active: false, disabled: false },
        { table: "main", gateway: "pppoe-wan3", distance: 3, active: false, disabled: false },
      ],
    },
  },
  "no-snapshot": {
    status: "error",
    updatedAt: now,
    error: "设备当前不可达",
    meta: {
      scaleScenario: "no-snapshot",
      configuredIdentity: "RouterOS",
      target: "10.0.0.1",
      routerHost: "10.0.0.1",
      pollSeconds: 5,
      realtimeError: "设备当前不可达",
      staticError: "静态 REST 采集失败",
      connectionDetailError: "连接明细 REST 采集失败",
      realtimeEndpointFailures: [
        { channel: "realtime-rest", group: "实时 REST", name: "system_resource", endpoint: "/rest/system/resource", message: "设备当前不可达", at: "2026-06-21T02:51:00+08:00" },
      ],
      staticEndpointFailures: [
        { channel: "static-rest", group: "静态 REST", name: "system_resource", endpoint: "/rest/system/resource", message: "静态 REST 端点读取失败", at: "2026-06-21T02:51:00+08:00" },
      ],
      detailEndpointFailures: [
        { channel: "detail-rest", group: "连接明细 REST", name: "connections", endpoint: "/rest/ip/firewall/connection", message: "连接明细 REST 端点读取失败", at: "2026-06-21T02:51:00+08:00" },
      ],
      realtimeUpdatedAt: "2026-06-21T02:51:00+08:00",
      staticUpdatedAt: "2026-06-21T02:51:00+08:00",
      capabilities: { restTrusted: false, sshRead: false },
    },
    overview: {},
    wan: [],
    pppoe: [],
    interfaces: [],
    routes: { defaultRoutes: [] },
    connections: {},
    terminals: [],
  },
  "collection-down": {
    ...base("collection-down"),
    meta: {
      ...base("collection-down").meta,
      realtimeError: "实时 REST 采集失败",
      slowRestError: "慢速 REST 采集失败",
      staticError: "静态 REST 采集失败",
      connectionDetailError: "连接明细 REST 采集失败",
      realtimeEndpointFailures: [
        { channel: "realtime-rest", group: "实时 REST", name: "interfaces", endpoint: "/rest/interface", message: "实时接口端点读取失败", at: now },
      ],
      slowRestEndpointFailures: [
        { channel: "slow-rest", group: "慢速 REST", name: "routes", endpoint: "/rest/ip/route", message: "慢速路由端点读取失败", at: now },
      ],
      staticEndpointFailures: [
        { channel: "static-rest", group: "静态 REST", name: "system_resource", endpoint: "/rest/system/resource", message: "静态资源端点读取失败", at: now },
      ],
      detailEndpointFailures: [
        { channel: "detail-rest", group: "连接明细 REST", name: "connections", endpoint: "/rest/ip/firewall/connection", message: "连接明细端点读取失败", at: now },
      ],
      capabilities: { restTrusted: false, sshRead: false },
    },
  },
  "resource-full": {
    ...base("resource-full"),
    overview: {
      ...base("resource-full").overview,
      cpuLoad: 96,
      memoryUsage: 92,
      diskUsage: 97,
      history: {
        ...resourceHistory([88, 91, 94, 96, 96, 96], [86, 89, 90, 91, 92, 92], [91, 93, 95, 96, 97, 97]),
        trafficSamples: trafficSamples([4400, 5200, 6100, 7200, 6900, 7600], [1300, 1600, 1900, 2100, 2000, 2300]),
      },
    },
    wan: [{ name: "pppoe-out10", parent: "ether1", running: true, upRate: 2300, downRate: 7600 }],
    pppoe: [{ name: "pppoe-out10", parent: "ether1", running: true, upRate: 2300, downRate: 7600 }],
    interfaces: [
      { name: "ether1", type: "ether", running: true, bridge: "bridge-lan", txRate: 82000000, rxRate: 48000000 },
      { name: "ether2", type: "ether", running: true, bridge: "bridge-lan", txRate: 42000000, rxRate: 28000000 },
      { name: "sfp1", type: "sfp", running: true, bridge: "bridge-core", txRate: 120000000, rxRate: 76000000 },
    ],
    connections: { total: 54321, active: [{}, {}, {}, {}, {}, {}, {}, {}], topIps: [] },
    dns: { cache: "warm", pressure: "high" },
  },
  "interfaces-down": {
    ...base("interfaces-down"),
    interfaces: [
      { name: "ether1", type: "ether", role: "WAN", running: true, disabled: false, bridge: "bridge-lan" },
      { name: "ether2", type: "ether", role: "WAN", running: false, disabled: false, bridge: "bridge-lan", parent: "switch1", vlan: 20, pppoeOut: "pppoe-out20" },
      { name: "ether3", type: "ether", role: "WAN", running: false, disabled: false, bridge: "bridge-lan", parent: "switch1", vlan: 30, pppoeOut: "pppoe-out30" },
    ],
    routes: {
      defaultRoutes: [
        { default: true, dstAddress: "0.0.0.0/0", table: "main", gateway: "ether1", distance: 1, active: true, disabled: false },
        { default: true, dstAddress: "0.0.0.0/0", table: "main", gateway: "ether2", distance: 2, active: false, disabled: false },
        { default: true, dstAddress: "0.0.0.0/0", table: "main", gateway: "ether3", distance: 3, active: false, disabled: false },
      ],
    },
  },
};
