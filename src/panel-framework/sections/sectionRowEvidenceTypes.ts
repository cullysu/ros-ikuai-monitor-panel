import type { InterfaceOperationalImpact, InterfaceOperationalReason } from "./interfaceOperationalAssessment";
interface BaseRowEvidence {
  sourceTable: string;
}
export interface InterfaceDefaultRouteEvidence {
  destination: string;
  gateway: string;
  table: string;
  distance: number | null;
  active: boolean | null;
  disabled: boolean | null;
}
export interface InterfaceRowEvidence extends BaseRowEvidence {
  kind: "interface";
  role: string | null;
  interfaceType: string | null;
  running: boolean | null;
  disabled: boolean | null;
  parent: string | null;
  mac: string | null;
  vlanId: string | null;
  addresses: string[];
  networks: string[];
  rxRate: number | null;
  txRate: number | null;
  rxBytes: number | null;
  txBytes: number | null;
  rxPackets: number | null;
  txPackets: number | null;
  dropTotal: number | null;
  errorTotal: number | null;
  lossRate: number | null;
  errorRate: number | null;
  qualityUpdatedAt: string | null;
  qualitySampleCount: number | null;
  qualitySampleReady: boolean | null;
  defaultRouteRelation: "direct" | "unverified";
  defaultRoutes: InterfaceDefaultRouteEvidence[];
  operationalImpact: InterfaceOperationalImpact;
  operationalReason: InterfaceOperationalReason;
}
export interface RouteInterfaceEvidence {
  name: string;
  role: string | null;
  interfaceType: string | null;
  running: boolean | null;
  disabled: boolean | null;
  rxRate: number | null;
  txRate: number | null;
}
export interface RouteRowEvidence extends BaseRowEvidence {
  kind: "route";
  destination: string | null;
  gateway: string | null;
  table: string | null;
  distance: number | null;
  active: boolean | null;
  disabled: boolean | null;
  isDefault: boolean;
  protocol: string | null;
  family: string | null;
  comment: string | null;
  interfaceRelation: "direct" | "unverified";
  relatedInterface: RouteInterfaceEvidence | null;
}
export interface TerminalRowEvidence extends BaseRowEvidence {
  kind: "terminal";
  hostname: string | null;
  ip: string | null;
  mac: string | null;
  status: string | null;
  online: boolean | null;
  lastSeen: string | null;
  interfaceName: string | null;
  dhcpStatus: string | null;
  dhcpServer: string | null;
  arpStatus: string | null;
  downRate: number | null;
  upRate: number | null;
  connections: number | null;
  sessionBytes: number | null;
  identitySources: string[];
}
export interface DhcpClientRowEvidence extends BaseRowEvidence { kind: "dhcp-client"; interfaceName: string | null; status: string | null; addDefaultRoute: boolean | null; usePeerDns: boolean | null; } export type EvidenceSeverity = "critical" | "error" | "warning" | "info" | "unknown";
export interface DhcpPoolRowEvidence extends BaseRowEvidence { kind: "dhcp-pool"; name: string | null; ranges: string | null; used: number | null; total: number | null; }
export interface LogNeighborEvidence {
  relation: "newer" | "older";
  time: string | null;
  timestamp: number | null;
  topics: string | null;
  severity: EvidenceSeverity;
  message: string | null;
}
export interface LogRowEvidence extends BaseRowEvidence {
  kind: "log";
  time: string | null;
  timestamp: number | null;
  topics: string | null;
  severity: EvidenceSeverity;
  source: string | null;
  message: string | null;
  neighbors: LogNeighborEvidence[];
}
export interface GenericRowEvidence extends BaseRowEvidence { kind: "generic"; }
export interface ArpAlertRowEvidence extends BaseRowEvidence { kind: "arp-alert"; address: string | null; mac: string | null; alertType: string | null; detail: string | null; severity: EvidenceSeverity; interfaceName: string | null; }
export interface SecurityRowEvidence extends BaseRowEvidence {
  kind: "security";
  objectType: "alert" | "rule" | "address-list";
  time: string | null;
  timestamp: number | null;
  severity: EvidenceSeverity;
  chain: string | null;
  action: string | null;
  order: number | null;
  disabled: boolean | null;
  packets: number | null;
  bytes: number | null;
  inInterface: string | null;
  outInterface: string | null;
  sourceAddress: string | null;
  destinationAddress: string | null;
  comment: string | null;
  affected: string | null;
  message: string | null;
}
export interface DnsRowEvidence extends BaseRowEvidence {
  kind: "dns";
  objectType: "rule" | "ipv6-nd" | "ipv6-dhcp";
  name: string | null;
  recordType: string | null;
  target: string | null;
  ttl: string | null;
  comment: string | null;
  disabled: boolean | null;
  interfaceName: string | null;
  status: string | null;
  advertiseDns: boolean | null;
  peerDns: boolean | null;
  addDefaultRoute: boolean | null;
  publishedDns: string[];
  upstreamServers: string[];
  remoteRequests: boolean | null;
  dohServer: string | null;
  verifyDohCert: boolean | null;
}
export interface ResourceRowEvidence extends BaseRowEvidence {
  kind: "resource";
  series: string | null;
  values: number[]; samples: Array<{ timestamp: string; value: number; }>;
  sampleCount: number;
  latest: number | null;
  threshold: number | null;
  delta: number | null;
  trailing: number;
  durationSeconds: number | null;
  evidenceAt: string | null;
}
export interface ConnectionRowEvidence extends BaseRowEvidence {
  kind: "connection";
  source: string | null;
  target: string | null;
  protocol: string | null;
  connections: number | null;
  trafficBps: number | null;
  sessionBytes: number | null;
  sourcePort: string | null;
  targetPort: string | null;
}
export interface DiagnosticRowEvidence extends BaseRowEvidence {
  kind: "diagnostic";
  channel: "realtime-rest" | "slow-rest" | "static-rest" | "detail-rest" | "unknown";
  group: string;
  transport: "REST";
  objectName: string;
  endpoint: string | null;
  message: string;
  recordedAt: string | null;
  channelError: string | null;
  sameChannelFailureCount: number;
  totalFailureCount: number;
}
export interface BalanceRuleRowEvidence extends BaseRowEvidence {
  kind: "balance-rule"; chain: string | null;
  mark: string | null; interfaceName: string | null;
  comment: string | null; status: string | null;
}
export interface BalanceDistributionRowEvidence extends BaseRowEvidence { kind: "balance-distribution"; name: string | null; share: number | null; active: boolean | null; upRate: number | null; downRate: number | null; }
export type SectionRowEvidence =
  | InterfaceRowEvidence
  | RouteRowEvidence
  | TerminalRowEvidence | DhcpClientRowEvidence
  | DhcpPoolRowEvidence
  | LogRowEvidence
  | GenericRowEvidence
  | ArpAlertRowEvidence
  | SecurityRowEvidence
  | DnsRowEvidence
  | ResourceRowEvidence
  | ConnectionRowEvidence
  | DiagnosticRowEvidence
  | BalanceRuleRowEvidence
  | BalanceDistributionRowEvidence;
export interface SectionEvidenceContext {
  routes?: unknown;
  interfaces?: unknown;
  wan?: unknown;
  dhcp?: unknown;
  arp?: unknown;
  dns?: unknown;
  logs?: unknown;
}
