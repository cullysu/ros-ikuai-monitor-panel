import type { OverviewRawSnapshot, OverviewScenarioKey } from "./types";

export const OVERVIEW_SCENARIO_KEYS: OverviewScenarioKey[] = [
  "single",
  "fleet",
  "all-offline",
  "no-snapshot",
  "collection-down",
  "resource-full",
  "interfaces-down",
];

const now = "2026-06-30T10:00:00+08:00";

const base = (scenario: OverviewScenarioKey): OverviewRawSnapshot => ({
  status: "ok",
  updatedAt: now,
  meta: {
    scaleScenario: scenario,
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
  },
  wan: [{ name: "pppoe-out10", parent: "ether1", running: true, upRate: 1200, downRate: 3400 }],
  pppoe: [{ name: "pppoe-out10", parent: "ether1", running: true, upRate: 1200, downRate: 3400 }],
  interfaces: [{ name: "ether1", type: "ether", running: true, bridge: "bridge-lan" }],
  routes: { defaultRoutes: [{ table: "main", gateway: "1.1.1.1", distance: 1, active: true, disabled: false }] },
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
    error: "RouterOS ???????????????????",
    meta: {
      scaleScenario: "no-snapshot",
      target: "10.0.0.1",
      routerHost: "10.0.0.1",
      pollSeconds: 5,
      realtimeError: "RouterOS ?????",
      staticError: "?????",
      connectionDetailError: "?????",
      realtimeUpdatedAt: "2026-06-21T02:51:00+08:00",
      staticUpdatedAt: "2026-06-21T02:51:00+08:00",
      capabilities: { restTrusted: false, sshRead: false },
    },
    overview: {},
    wan: [],
    pppoe: [],
    interfaces: [],
    routes: { defaultRoutes: [] },
    connections: { total: 0, active: [], topIps: [] },
    terminals: [],
  },
  "collection-down": {
    ...base("collection-down"),
    meta: {
      ...base("collection-down").meta,
      realtimeError: "REST ???",
      slowRestError: "REST ???",
      staticError: "SSH ???",
      connectionDetailError: "???????",
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
    },
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
      { name: "ether1", type: "ether", running: true, bridge: "bridge-lan" },
      { name: "ether2", type: "ether", running: false, bridge: "bridge-lan", parent: "switch1", vlan: 20, pppoeOut: "pppoe-out20" },
      { name: "ether3", type: "ether", running: false, bridge: "bridge-lan", parent: "switch1", vlan: 30, pppoeOut: "pppoe-out30" },
    ],
    routes: {
      defaultRoutes: [{ table: "main", gateway: "1.1.1.1", distance: 1, active: true, disabled: false }],
    },
  },
};
