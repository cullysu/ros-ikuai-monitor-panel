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
export type OverviewCollectionChannelStatus = "current" | "degraded" | "failed" | "unavailable";

export const OVERVIEW_SCENARIO_KEYS: OverviewScenarioKey[] = [
  "single",
  "fleet",
  "all-offline",
  "no-snapshot",
  "collection-down",
  "resource-full",
  "interfaces-down",
];

export interface OverviewEndpointFailureEntry {
  channel?: "realtime-rest" | "slow-rest" | "static-rest" | "detail-rest";
  group?: string;
  name?: string;
  endpoint?: string;
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
  configuredIdentity?: string;
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
  clientEvidenceBoundary?: "stale" | "recovering" | "error";
  [key: string]: unknown;
}

export interface OverviewRawDevice {
  identity?: string;
  version?: string;
  boardName?: string;
  architecture?: string;
  uptime?: string;
  systemTime?: string | null;
  cpuLoad?: number | null;
  memoryUsage?: number | null;
  diskUsage?: number | null;
  connectionTotal?: number;
  onlineTerminals?: number;
  uplinkBps?: number | null;
  downlinkBps?: number | null;
  history?: OverviewRawHistory;
  [key: string]: unknown;
}

export interface OverviewTrafficHistorySample {
  timestamp: string;
  uplink: number | null;
  downlink: number | null;
  source: string;
  evidenceMode: "current" | "historical" | "unavailable";
  [key: string]: unknown;
}

/**
 * Compatibility-only fields from payloads emitted before traffic observations
 * were atomic. They remain readable as raw data, but never identify a chart
 * sample because independently appended arrays cannot be paired safely.
 */
export interface OverviewLegacyTrafficHistory {
  readonly timestamps?: readonly unknown[];
  readonly uplink?: readonly unknown[];
  readonly downlink?: readonly unknown[];
}

export interface OverviewResourceHistorySample {
  timestamp?: string;
  cpu?: number | null;
  memory?: number | null;
  disk?: number | null;
  source?: string;
  evidenceMode?: "current" | "historical" | "unavailable";
  [key: string]: unknown;
}

export interface OverviewRawHistory extends Record<string, unknown>, OverviewLegacyTrafficHistory {
  resourceSamples?: OverviewResourceHistorySample[];
  trafficSamples?: readonly OverviewTrafficHistorySample[];
}

export interface OverviewRawRoute {
  dstAddress?: string;
  default?: boolean;
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
  staticRoutes?: OverviewRawRoute[];
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
  upRate?: number | null;
  downRate?: number | null;
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
  txRate?: number | null;
  rxRate?: number | null;
  upRate?: number | null;
  downRate?: number | null;
  [key: string]: unknown;
}

export interface OverviewRawConnections {
  total?: number | null;
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
  wanUnknown: number;
  interfacesTotal: number | null;
  interfacesOnline: number | null;
  interfacesDown: number | null;
  interfacesUnknown: number | null;
  failures: number;
  connections: number | null;
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

export interface OverviewCollectionChannelState {
  status: OverviewCollectionChannelStatus;
  label: string;
  successAt: string;
  error: string;
}

export interface OverviewCollectionState {
  level: OverviewTone;
  label: string;
  credibility: OverviewDataCredibility;
  credibilityLabel: string;
  credibilityTone: OverviewTone;
  restLabel: string;
  sshLabel: string;
  rest: OverviewCollectionChannelState;
  ssh: OverviewCollectionChannelState;
  channelStateText: string;
  dataStateText: string;
  dataText: string;
  channelText: string;
  channelDegraded: boolean;
  dataStale: boolean;
  businessEvidenceIncomplete: boolean;
  businessEvidenceText: string;
  text: string;
  summaryText: string;
  failedEndpointText: string;
}

export interface OverviewRouteState {
  label: string;
  text: string;
  level: OverviewTone;
  rawSummary: string;
  selected: OverviewRawRoute | null;
  verified: boolean;
  candidates: number;
  activeCandidates: number;
}

export interface OverviewResourceState {
  level: OverviewTone;
  available: boolean;
  complete: boolean;
  observed: number;
  cpu: number | null;
  memory: number | null;
  disk: number | null;
  summaryText: string;
}

export interface OverviewWanState {
  available: boolean;
  total: number;
  online: number;
  offline: number;
  unknown: number;
  allOffline: boolean;
  label: string;
  text: string;
}

export interface OverviewInterfaceState {
  available: boolean;
  total: number;
  online: number;
  down: number;
  unknown: number;
  confirmedRisk: number;
  impactUnverified: number;
  disabled: number;
  downNames: string[];
  riskNames: string[];
  reviewNames: string[];
  label: string;
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
    total: number | null;
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

export interface OverviewPanelProps {
  snapshot: OverviewRawSnapshot;
  state: OverviewDerivedState;
}
