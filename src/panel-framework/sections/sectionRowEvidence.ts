import type { PanelRouteId } from "../routes/panelRoutes";
import { parseRfc3339Timestamp } from "../timeContract";
import { objectRows, record, type UnknownRecord } from "./rawValue";
import { logEvidence, serviceLogEvidence } from "./serviceLogEvidence";
import type {
  InterfaceDefaultRouteEvidence,
  InterfaceRowEvidence,
  RouteInterfaceEvidence,
  RouteRowEvidence,
  TerminalRowEvidence,
  EvidenceSeverity,
  SecurityRowEvidence,
  ArpAlertRowEvidence,
  GenericRowEvidence,
  DnsRowEvidence,
  ResourceRowEvidence,
  ConnectionRowEvidence,
  DiagnosticRowEvidence,
  DhcpClientRowEvidence,
  DhcpPoolRowEvidence,
  BalanceRuleRowEvidence,
  BalanceDistributionRowEvidence,
  SectionRowEvidence,
  SectionEvidenceContext,
} from "./sectionRowEvidenceTypes";
import {
  assessInterfaceOperationalState,
  directDefaultRoutesForInterface,
} from "./interfaceOperationalAssessment";
import { buildDiagnosticRowEvidence } from "./diagnosticRowEvidence";
export type {
  InterfaceDefaultRouteEvidence,
  InterfaceRowEvidence,
  RouteInterfaceEvidence,
  RouteRowEvidence,
  TerminalRowEvidence,
  EvidenceSeverity,
  LogNeighborEvidence,
  LogRowEvidence,
  SecurityRowEvidence,
  ArpAlertRowEvidence,
  GenericRowEvidence,
  DnsRowEvidence,
  ResourceRowEvidence,
  ConnectionRowEvidence,
  DiagnosticRowEvidence,
  DhcpClientRowEvidence,
  DhcpPoolRowEvidence,
  BalanceRuleRowEvidence,
  BalanceDistributionRowEvidence,
  SectionRowEvidence,
  SectionEvidenceContext,
} from "./sectionRowEvidenceTypes";
function stringValue(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
    if (typeof value !== "string") continue;
    const normalized = value.trim();
    if (normalized && !["-", "—", "未记录", "未取得"].includes(normalized)) return normalized;
  }
  return null;
}
function numberValue(...values: unknown[]): number | null {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value !== "string" || !value.trim()) continue;
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}
function booleanValue(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  if (["true", "yes", "running", "active", "bound", "online", "enabled", "up"].includes(normalized)) return true;
  if (["false", "no", "stopped", "inactive", "unbound", "offline", "disabled", "down"].includes(normalized)) return false;
  return null;
}
function stringList(value: unknown): string[] {
  const source = Array.isArray(value) ? value : typeof value === "string" ? value.split(",") : [];
  return source
    .map((item) => stringValue(item))
    .filter((item): item is string => Boolean(item));
}
function observedSum(...values: unknown[]): number | null {
  const observed = values.map((value) => numberValue(value)).filter((value): value is number => value !== null);
  return observed.length ? observed.reduce((sum, value) => sum + value, 0) : null;
}
function severityFrom(...values: unknown[]): EvidenceSeverity {
  const source = values.map((value) => stringValue(value)?.toLowerCase() || "").filter(Boolean).join(" ");
  if (/(?:^|[\s,;:/_-])(critical|fatal|emergency|alert)(?:$|[\s,;:/_-])/.test(source)) return "critical";
  if (/(?:^|[\s,;:/_-])(error|failed|failure)(?:$|[\s,;:/_-])/.test(source)) return "error";
  if (/(?:^|[\s,;:/_-])(warning|warn|degraded)(?:$|[\s,;:/_-])/.test(source)) return "warning";
  if (/(?:^|[\s,;:/_-])(info|notice|debug)(?:$|[\s,;:/_-])/.test(source)) return "info";
  return "unknown";
}
function isDefaultRoute(row: UnknownRecord): boolean {
  const destination = stringValue(row.dstAddress, row.destination);
  return row.default === true || destination === "0.0.0.0/0" || destination === "::/0";
}
function exactGatewayMatch(gateway: string | null, interfaceName: string | null): boolean {
  if (!gateway || !interfaceName) return false;
  return gateway === interfaceName || gateway.endsWith(`%${interfaceName}`);
}
function routeEvidence(row: UnknownRecord): InterfaceDefaultRouteEvidence {
  return {
    destination: stringValue(row.dstAddress, row.destination) || "0.0.0.0/0",
    gateway: stringValue(row.gateway) || "未取得",
    table: stringValue(row.table, row.routingTable) || "main",
    distance: numberValue(row.distance),
    active: booleanValue(row.active),
    disabled: booleanValue(row.disabled),
  };
}
function interfaceEvidence(title: string, row: UnknownRecord, context: SectionEvidenceContext): InterfaceRowEvidence {
  const name = stringValue(row.name, row.interface, row.lineId);
  const directRouteRows = directDefaultRoutesForInterface(name || "", context.routes);
  const directRoutes = directRouteRows.map(routeEvidence);
  const attachedRoutes = objectRows(row.routes).map((candidate) => ({
    ...routeEvidence(candidate),
    gateway: name || "未取得",
  }));
  const uniqueRoutes = [...directRoutes, ...attachedRoutes].filter((candidate, index, items) => (
    items.findIndex((item) => JSON.stringify(item) === JSON.stringify(candidate)) === index
  ));
  const operational = assessInterfaceOperationalState({
    running: booleanValue(row.running),
    disabled: booleanValue(row.disabled),
    directDefaultRoutes: directRouteRows,
  });
  return {
    kind: "interface",
    sourceTable: title,
    role: stringValue(row.role),
    interfaceType: stringValue(row.type, row.kind, row.access),
    running: booleanValue(row.running),
    disabled: booleanValue(row.disabled),
    parent: stringValue(row.parentInterface, row.parent, row.master, row.bridge),
    mac: stringValue(row.mac, row.macAddress),
    vlanId: stringValue(row.vlanId),
    addresses: [...stringList(row.ips), ...stringList(row.addresses)],
    networks: stringList(row.networks),
    rxRate: numberValue(row.rxRate, row.downRate),
    txRate: numberValue(row.txRate, row.upRate),
    rxBytes: numberValue(row.rxBytes),
    txBytes: numberValue(row.txBytes),
    rxPackets: numberValue(row.rxPackets),
    txPackets: numberValue(row.txPackets),
    dropTotal: observedSum(row.rxDrop, row.txDrop),
    errorTotal: observedSum(row.rxError, row.txError),
    lossRate: numberValue(row.lossRate),
    errorRate: numberValue(row.errorRate),
    qualityUpdatedAt: stringValue(row.qualityUpdatedAt),
    qualitySampleCount: numberValue(row.qualitySampleCount),
    qualitySampleReady: booleanValue(row.qualitySampleReady),
    defaultRouteRelation: uniqueRoutes.length ? "direct" : "unverified",
    defaultRoutes: uniqueRoutes,
    operationalImpact: operational.impact,
    operationalReason: operational.reason,
  };
}
function buildRouteEvidence(
  title: string,
  row: UnknownRecord,
  context: SectionEvidenceContext,
): RouteRowEvidence {
  const protocol = row.static === true
    ? "static"
    : row.dynamic === true
      ? "dynamic"
      : stringValue(row.protocol);
  const gateway = stringValue(row.gateway, row.gatewayStatus);
  const explicitInterface = stringValue(row.interface, row.outInterface);
  const candidates = [...objectRows(context.interfaces), ...objectRows(context.wan)];
  const related = candidates.find((candidate) => {
    const name = stringValue(candidate.name, candidate.interface, candidate.lineId);
    return Boolean(name && (name === explicitInterface || exactGatewayMatch(gateway, name)));
  }) || null;
  const relatedName = related ? stringValue(related.name, related.interface, related.lineId) : null;
  const relatedInterface = related && relatedName ? {
    name: relatedName,
    role: stringValue(related.role),
    interfaceType: stringValue(related.type, related.kind, related.access),
    running: booleanValue(related.running),
    disabled: booleanValue(related.disabled),
    rxRate: numberValue(related.rxRate, related.downRate),
    txRate: numberValue(related.txRate, related.upRate),
  } : null;
  return {
    kind: "route",
    sourceTable: title,
    destination: stringValue(row.dstAddress, row.destination) || (row.default === true ? "0.0.0.0/0" : null),
    gateway,
    table: stringValue(row.table, row.routingTable) || "main",
    distance: numberValue(row.distance),
    active: booleanValue(row.active),
    disabled: booleanValue(row.disabled),
    isDefault: isDefaultRoute(row),
    protocol,
    family: stringValue(row.family),
    comment: stringValue(row.comment),
    interfaceRelation: relatedInterface ? "direct" : "unverified",
    relatedInterface,
  };
}
function terminalEvidence(title: string, row: UnknownRecord, context: SectionEvidenceContext): TerminalRowEvidence {
  const ip = stringValue(row.ip, row.address);
  const mac = stringValue(row.mac, row.macAddress)?.toLowerCase() || null;
  const dhcp = record(context.dhcp);
  const lease = objectRows(dhcp.leases).find((candidate) => {
    const candidateIp = stringValue(candidate.address, candidate.ip);
    const candidateMac = stringValue(candidate.mac, candidate.macAddress)?.toLowerCase() || null;
    return Boolean((ip && candidateIp === ip) || (mac && candidateMac === mac));
  });
  const arpRoot = Array.isArray(context.arp) ? {} : record(context.arp);
  const arpItems = Array.isArray(context.arp) ? objectRows(context.arp) : objectRows(arpRoot.items);
  const arp = arpItems.find((candidate) => {
    const candidateIp = stringValue(candidate.ip, candidate.address);
    const candidateMac = stringValue(candidate.mac, candidate.macAddress)?.toLowerCase() || null;
    return Boolean((ip && candidateIp === ip) || (mac && candidateMac === mac));
  });
  const hasConnectionEvidence = [row.connections, row.downRate, row.upRate, row.sessionBytes]
    .some((value) => numberValue(value) !== null);
  const identitySources = [
    arp ? "ARP" : null,
    lease ? "DHCP" : null,
    hasConnectionEvidence ? "连接跟踪" : null,
  ].filter((item): item is string => Boolean(item));
  return {
    kind: "terminal",
    sourceTable: title,
    hostname: stringValue(row.displayName, row.hostname, row.name, lease?.hostname, lease?.hostName),
    ip,
    mac: stringValue(row.mac, row.macAddress),
    status: stringValue(row.status),
    online: booleanValue(row.online),
    lastSeen: stringValue(row.lastSeen, lease?.lastSeen),
    interfaceName: stringValue(row.interface, arp?.interface),
    dhcpStatus: stringValue(lease?.status),
    dhcpServer: stringValue(lease?.server),
    arpStatus: stringValue(arp?.status),
    downRate: numberValue(row.downRate),
    upRate: numberValue(row.upRate),
    connections: numberValue(row.connections),
    sessionBytes: numberValue(row.sessionBytes),
    identitySources,
  };
}
function genericEvidence(title: string): GenericRowEvidence {
  return { kind: "generic", sourceTable: title };
}
function arpAlertEvidence(title: string, row: UnknownRecord): ArpAlertRowEvidence {
  return {
    kind: "arp-alert",
    sourceTable: title,
    address: stringValue(row.ip, row.address),
    mac: stringValue(row.mac, row.macAddress),
    alertType: stringValue(row.type, row.level, row.kind),
    detail: stringValue(row.message, row.detail, row.abnormal),
    severity: severityFrom(row.severity, row.level, row.type, row.message),
    interfaceName: stringValue(row.interface, row.iface),
  };
}
function securityEvidence(title: string, row: UnknownRecord): SecurityRowEvidence {
  const time = stringValue(row.time, row.lastConfirmed, row.firstSeen);
  return {
    kind: "security",
    sourceTable: title,
    objectType: title === "安全告警" ? "alert" : title === "地址集" ? "address-list" : "rule",
    time,
    timestamp: time ? parseRfc3339Timestamp(time) : null,
    severity: severityFrom(row.severity, row.level, row.topics),
    chain: stringValue(row.chain),
    action: stringValue(row.action),
    order: numberValue(row.rawOrder, row.order),
    disabled: booleanValue(row.disabled),
    packets: numberValue(row.packets),
    bytes: numberValue(row.bytes),
    inInterface: stringValue(row.inInterface),
    outInterface: stringValue(row.outInterface),
    sourceAddress: stringValue(row.srcAddress, title === "地址集" ? row.list || row.name : undefined),
    destinationAddress: stringValue(row.dstAddress, title === "地址集" ? row.address || row.ip : undefined),
    comment: stringValue(row.comment),
    affected: stringValue(row.affected, row.scope, row.topics),
    message: stringValue(row.abnormal, row.message),
  };
}
function dnsEvidence(route: PanelRouteId, title: string, row: UnknownRecord, context: SectionEvidenceContext): DnsRowEvidence {
  const dns = record(context.dns);
  const objectType = route === "dns4"
    ? "rule"
    : Object.prototype.hasOwnProperty.call(row, "advertiseDns")
      ? "ipv6-nd"
      : "ipv6-dhcp";
  return {
    kind: "dns",
    sourceTable: title,
    objectType,
    name: stringValue(row.name),
    recordType: stringValue(row.type),
    target: stringValue(row.value, row.address, row.prefix),
    ttl: stringValue(row.ttl),
    comment: stringValue(row.comment),
    disabled: booleanValue(row.disabled),
    interfaceName: stringValue(row.interface),
    status: stringValue(row.status),
    advertiseDns: booleanValue(row.advertiseDns),
    peerDns: booleanValue(row.usePeerDns),
    addDefaultRoute: booleanValue(row.addDefaultRoute),
    publishedDns: stringList(row.dnsServers),
    upstreamServers: stringList(dns.servers),
    remoteRequests: booleanValue(dns.running),
    dohServer: stringValue(dns.dohServer),
    verifyDohCert: booleanValue(dns.verifyDohCert),
  };
}
function resourceEvidence(title: string, row: UnknownRecord): ResourceRowEvidence {
  const rawValues = Array.isArray(row.values) ? row.values : [];
  const values = rawValues
    .map((value) => numberValue(value)).filter((value): value is number => value !== null);
  const sampleSource = Array.isArray(row.sampleSequence)
    ? row.sampleSequence
    : Array.isArray(row.timestamps) && row.timestamps.length === rawValues.length
      ? row.timestamps.map((timestamp, index) => ({ timestamp, value: rawValues[index] }))
      : [];
  const timestampedSamples = sampleSource.flatMap((sample) => {
    if (!sample || typeof sample !== "object") return [];
    const candidate = sample as UnknownRecord;
    const timestampValue = stringValue(candidate.timestamp);
    const timestamp = timestampValue ? parseRfc3339Timestamp(timestampValue) : null;
    const value = numberValue(candidate.value);
    if (timestamp === null || value === null || value < 0 || value > 100) return [];
    return [{ timestamp: new Date(timestamp).toISOString(), value }];
  });
  return {
    kind: "resource",
    sourceTable: title,
    series: stringValue(row.key, row.series),
    values,
    samples: timestampedSamples,
    sampleCount: timestampedSamples.length,
    latest: numberValue(row.latest),
    threshold: numberValue(row.threshold),
    delta: numberValue(row.delta),
    trailing: numberValue(row.trailing) ?? 0,
    durationSeconds: numberValue(row.durationSeconds),
    evidenceAt: stringValue(row.evidenceAt),
  };
}
function connectionEvidence(title: string, row: UnknownRecord): ConnectionRowEvidence {
  return {
    kind: "connection",
    sourceTable: title,
    source: stringValue(row.source, row.localIp, row.srcAddress, row.src, row.ip, row.name),
    target: stringValue(row.destination, row.remoteIp, row.dstAddress, row.dst),
    protocol: stringValue(row.protocol, row.label),
    connections: numberValue(row.connections, row.count),
    trafficBps: numberValue(row.totalRate, row.rate, row.bytes, row.value),
    sessionBytes: numberValue(row.sessionBytes),
    sourcePort: stringValue(row.sourcePort, row.srcPort),
    targetPort: stringValue(row.destinationPort, row.dstPort),
  };
}
function dhcpClientEvidence(title: string, row: UnknownRecord): DhcpClientRowEvidence {
  return { kind: "dhcp-client", sourceTable: title, interfaceName: stringValue(row.interface), status: stringValue(row.status, row.state), addDefaultRoute: booleanValue(row.addDefaultRoute), usePeerDns: booleanValue(row.usePeerDns) };
}
function dhcpPoolEvidence(title: string, row: UnknownRecord): DhcpPoolRowEvidence {
  return {
    kind: "dhcp-pool",
    sourceTable: title,
    name: stringValue(row.name, row.pool),
    ranges: stringValue(row.ranges, row.range),
    used: numberValue(row.used, row.usedCount),
    total: numberValue(row.total, row.capacity),
  };
}
function balanceRuleEvidence(title: string, row: UnknownRecord): BalanceRuleRowEvidence {
  return {
    kind: "balance-rule",
    sourceTable: title,
    chain: stringValue(row.chain),
    mark: stringValue(row.newRoutingMark, row.table, row.routingMark),
    interfaceName: stringValue(row.inInterface, row.outInterface, row.interface),
    comment: stringValue(row.comment),
    status: stringValue(row.status, row.state),
  };
}
function balanceDistributionEvidence(title: string, row: UnknownRecord): BalanceDistributionRowEvidence {
  return {
    kind: "balance-distribution",
    sourceTable: title,
    name: stringValue(row.name, row.interface, row.lineId),
    share: numberValue(row.share, row.percent),
    active: booleanValue(row.active ?? row.running),
    upRate: numberValue(row.upRate, row.txRate),
    downRate: numberValue(row.downRate, row.rxRate),
  };
}
export function buildSectionRowEvidence(
  route: PanelRouteId,
  title: string,
  row: UnknownRecord,
  context: SectionEvidenceContext = {},
): SectionRowEvidence {
  if (route === "interfaces" || route === "lineStatus") return interfaceEvidence(title, row, context);
  if (route === "routes" || (route === "balance" && title === "默认路由") || (route === "overview" && title === "路由记录")) return buildRouteEvidence(title, row, context);
  if (route === "balance" && title === "策略规则") return balanceRuleEvidence(title, row);
  if (route === "balance" && title === "线路分布") return balanceDistributionEvidence(title, row);
  if (route === "terminals") return terminalEvidence(title, row, context);
  if (route === "dhcp" && title === "地址租约") return terminalEvidence(title, row, context);
  if (route === "dhcp" && title === "DHCP 客户端") return dhcpClientEvidence(title, row);
  if (route === "dhcp" && title === "地址池") return dhcpPoolEvidence(title, row);
  if (route === "arp" && title === "ARP 对象") return terminalEvidence(title, row, context);
  if (route === "serviceLogs") return serviceLogEvidence(title, row, context);
  if (route === "logs") return logEvidence(title, row, context);
  if (route === "arp" && title === "身份告警") return arpAlertEvidence(title, row);
  if (route === "security") return securityEvidence(title, row);
  if (route === "dns4" || route === "dns6") return dnsEvidence(route, title, row, context);
  if (route === "trafficLoad" || route === "loadAudit") return resourceEvidence(title, row);
  if (route === "connections" || route === "trafficAudit") return connectionEvidence(title, row);
  if (route === "readonlyDiagnostics") return buildDiagnosticRowEvidence(title, row);
  throw new Error("Unsupported section evidence route/title: " + route + "/" + title);
}
