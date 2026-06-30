export type OverviewScenarioKey =
  | "single"
  | "fleet"
  | "all-offline"
  | "no-snapshot"
  | "collection-down"
  | "resource-full"
  | "interfaces-down";

export type OverviewTone = "ok" | "trust" | "warn" | "danger" | "missing";
export type OverviewDataCredibility = "realtime" | "cache" | "unavailable";

export interface OverviewEndpointFailureEntry {
  group?: string;
  name?: string;
  message?: string;
  at?: string;
  [key: string]: unknown;
}

export interface OverviewRawCapabilityFlags {
  restTrusted?: boolean;
  sshRead?: boolean;
  externalAccess?: string;
  routerosWrite?: boolean;
  localAliasWrite?: boolean;
  ipAliasWrite?: boolean;
}

export interface OverviewRawMeta {
  target?: string;
  routerHost?: string;
  statusUpdatedAt?: string;
  pollSeconds?: number;
  scaleScenario?: string;
  realtimeUpdatedAt?: string;
  realtimeError?: string | null;
  staticUpdatedAt?: string;
  staticError?: string | null;
  slowRestUpdatedAt?: string;
  slowRestError?: string | null;
  connectionDetailUpdatedAt?: string;
  connectionDetailError?: string | null;
  connectionProtocolUpdatedAt?: string;
  connectionProtocolError?: string | null;
  capabilities?: OverviewRawCapabilityFlags;
  staticEndpointFailures?: OverviewEndpointFailureEntry[];
  realtimeEndpointFailures?: OverviewEndpointFailureEntry[];
  slowRestEndpointFailures?: OverviewEndpointFailureEntry[];
  detailEndpointFailures?: OverviewEndpointFailureEntry[];
  [key: string]: unknown;
}

export interface OverviewRawDevice {
  identity?: string;
  version?: string;
  boardName?: string;
  architecture?: string;
  uptime?: string;
  systemTime?: string;
  cpuLoad?: number;
  memoryUsage?: number;
  diskUsage?: number;
  connectionTotal?: number;
  onlineTerminals?: number;
  history?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface OverviewRawRoute {
  table?: string;
  routingTable?: string;
  gateway?: string;
  gatewayStatus?: string;
  distance?: number | string;
  active?: boolean;
  disabled?: boolean;
  [key: string]: unknown;
}

export interface OverviewRawRoutes {
  items?: OverviewRawRoute[];
  defaultRoutes?: OverviewRawRoute[];
  [key: string]: unknown;
}

export interface OverviewRawWanRow {
  name?: string;
  interface?: string;
  kind?: string;
  access?: string;
  parent?: string;
  running?: boolean;
  disabled?: boolean;
  upRate?: number;
  downRate?: number;
  routes?: OverviewRawRoute[];
  [key: string]: unknown;
}

export interface OverviewRawInterfaceRow {
  name?: string;
  interface?: string;
  type?: string;
  role?: string;
  running?: boolean;
  disabled?: boolean;
  parent?: string;
  master?: string;
  bridge?: string;
  vlan?: string | number;
  vlanId?: string | number;
  pppoeOut?: string;
  pppoe?: string;
  txRate?: number;
  rxRate?: number;
  upRate?: number;
  downRate?: number;
  [key: string]: unknown;
}

export interface OverviewRawConnections {
  total?: number;
  active?: unknown[];
  topIps?: unknown[];
  [key: string]: unknown;
}

export interface OverviewRawSnapshot {
  status?: string;
  updatedAt?: string;
  error?: string | null;
  meta?: OverviewRawMeta;
  overview?: OverviewRawDevice;
  interfaces?: OverviewRawInterfaceRow[];
  pppoe?: OverviewRawWanRow[];
  wan?: OverviewRawWanRow[];
  terminals?: unknown[];
  routes?: OverviewRawRoutes;
  connections?: OverviewRawConnections;
  dns?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface OverviewCounts {
  wanTotal: number;
  wanOnline: number;
  wanOffline: number;
  interfacesTotal: number;
  interfacesDown: number;
  failures: number;
  connections: number;
}

export interface OverviewDeviceFacts {
  identity: string;
  version: string;
  boardName: string;
  architecture: string;
  uptime: string;
  systemTime: string;
  routerHost: string;
  target: string;
}

export interface OverviewFreshnessState {
  label: string;
  level: OverviewTone;
  stale: boolean;
  history: boolean;
  missing: boolean;
  credibility: OverviewDataCredibility;
  credibilityLabel: string;
  credibilityTone: OverviewTone;
  seconds: number | null;
  text: string;
  source: string;
}

export interface OverviewFailureState {
  count: number;
  text: string;
  entries: OverviewEndpointFailureEntry[];
}

export interface OverviewCollectionState {
  level: OverviewTone;
  label: string;
  credibility: OverviewDataCredibility;
  credibilityLabel: string;
  credibilityTone: OverviewTone;
  restLabel: string;
  sshLabel: string;
  channelStateText: string;
  dataStateText: string;
  dataText: string;
  channelText: string;
  channelDegraded: boolean;
  dataStale: boolean;
  text: string;
  summaryText: string;
  failedEndpointText: string;
}

export interface OverviewRouteState {
  label: string;
  text: string;
  level: OverviewTone;
  rawSummary: string;
}

export interface OverviewResourceState {
  level: OverviewTone;
  available: boolean;
  cpu: number;
  memory: number;
  disk: number;
  summaryText: string;
}

export interface OverviewWanState {
  available: boolean;
  total: number;
  online: number;
  offline: number;
  allOffline: boolean;
  label: string;
  text: string;
}

export interface OverviewInterfaceState {
  available: boolean;
  total: number;
  down: number;
  downNames: string[];
  text: string;
}

export interface OverviewTopbarItem {
  label: string;
  value: string;
  note: string;
  tone: OverviewTone;
}

export interface OverviewTopbarState {
  device: OverviewTopbarItem;
  conclusion: OverviewTopbarItem;
  routeros: OverviewTopbarItem;
  rest: OverviewTopbarItem;
  ssh: OverviewTopbarItem;
  recentSuccess: OverviewTopbarItem;
}

export interface OverviewFacts {
  device: OverviewDeviceFacts;
  freshness: OverviewFreshnessState;
  collection: OverviewCollectionState;
  route: OverviewRouteState;
  resource: OverviewResourceState;
  wan: OverviewWanState;
  interfaces: OverviewInterfaceState;
  failures: OverviewFailureState;
  connections: {
    total: number;
    active: number;
    topIps: number;
  };
}

export interface OverviewVerdict {
  key: OverviewScenarioKey;
  level: OverviewTone;
  label: string;
  topLabel: string;
  detail: string;
  summary: string;
}

export interface OverviewDerivedState {
  scenario: OverviewScenarioKey;
  scale: "single" | "fleet";
  verdict: OverviewVerdict;
  counts: OverviewCounts;
  facts: OverviewFacts;
  topbar: OverviewTopbarState;
}

export interface DeriveOverviewOptions {
  now?: number;
  scenarioHint?: OverviewScenarioKey;
}
