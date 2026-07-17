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

export type EvidenceSeverity = "critical" | "error" | "warning" | "info" | "unknown";

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

export interface SecurityRowEvidence extends BaseRowEvidence {
  kind: "security";
  objectType: "alert" | "rule";
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
  values: number[];
  sampleCount: number;
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

export interface GenericRowEvidence extends BaseRowEvidence {
  kind: "generic";
  status: string | null;
}

export type SectionRowEvidence =
  | InterfaceRowEvidence
  | RouteRowEvidence
  | TerminalRowEvidence
  | LogRowEvidence
  | SecurityRowEvidence
  | DnsRowEvidence
  | ResourceRowEvidence
  | ConnectionRowEvidence
  | GenericRowEvidence;

export interface SectionEvidenceContext {
  routes?: unknown;
  interfaces?: unknown;
  wan?: unknown;
  dhcp?: unknown;
  arp?: unknown;
  dns?: unknown;
  logs?: unknown;
}
