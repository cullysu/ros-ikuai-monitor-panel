import type { PanelRouteId } from "../routes/panelRoutes";
import { parseRfc3339Timestamp } from "../timeContract";

type UnknownRecord = Record<string, unknown>;

import type {
  InterfaceDefaultRouteEvidence,
  InterfaceRowEvidence,
  RouteInterfaceEvidence,
  RouteRowEvidence,
  TerminalRowEvidence,
  EvidenceSeverity,
  LogNeighborEvidence,
  LogRowEvidence,
  SecurityRowEvidence,
  DnsRowEvidence,
  ResourceRowEvidence,
  ConnectionRowEvidence,
  GenericRowEvidence,
  SectionRowEvidence,
  SectionEvidenceContext,
} from "./sectionRowEvidenceTypes";
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
  DnsRowEvidence,
  ResourceRowEvidence,
  ConnectionRowEvidence,
  GenericRowEvidence,
  SectionRowEvidence,
  SectionEvidenceContext,
} from "./sectionRowEvidenceTypes";

function record(value: unknown): UnknownRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as UnknownRecord : {};
}

function objectRows(value: unknown): UnknownRecord[] {
  return Array.isArray(value)
    ? value.filter((item): item is UnknownRecord => Boolean(item && typeof item === "object" && !Array.isArray(item)))
    : [];
}

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
  const normalized = value.trim().toLocaleLowerCase();
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
  const source = values.map((value) => stringValue(value)?.toLocaleLowerCase() || "").filter(Boolean).join(" ");
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
  const routesRecord = record(context.routes);
  const routeCandidates = objectRows(routesRecord.items).length
    ? objectRows(routesRecord.items)
    : objectRows(routesRecord.defaultRoutes);
  const directRoutes = routeCandidates
    .filter((candidate) => isDefaultRoute(candidate) && exactGatewayMatch(stringValue(candidate.gateway), name))
    .map(routeEvidence);
  const attachedRoutes = objectRows(row.routes).map((candidate) => ({
    ...routeEvidence(candidate),
    gateway: name || "未取得",
  }));
  const uniqueRoutes = [...directRoutes, ...attachedRoutes].filter((candidate, index, items) => (
    items.findIndex((item) => JSON.stringify(item) === JSON.stringify(candidate)) === index
  ));

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
  const mac = stringValue(row.mac, row.macAddress)?.toLocaleLowerCase() || null;
  const dhcp = record(context.dhcp);
  const lease = objectRows(dhcp.leases).find((candidate) => {
    const candidateIp = stringValue(candidate.address, candidate.ip);
    const candidateMac = stringValue(candidate.mac, candidate.macAddress)?.toLocaleLowerCase() || null;
    return Boolean((ip && candidateIp === ip) || (mac && candidateMac === mac));
  });
  const arpRoot = Array.isArray(context.arp) ? {} : record(context.arp);
  const arpItems = Array.isArray(context.arp) ? objectRows(context.arp) : objectRows(arpRoot.items);
  const arp = arpItems.find((candidate) => {
    const candidateIp = stringValue(candidate.ip, candidate.address);
    const candidateMac = stringValue(candidate.mac, candidate.macAddress)?.toLocaleLowerCase() || null;
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

function logEvidence(
  title: string,
  row: UnknownRecord,
  context: SectionEvidenceContext,
): LogRowEvidence {
  const time = stringValue(row.time, row.lastConfirmed);
  const sourceRows = objectRows(record(context.logs).all);
  const ordered = sourceRows
    .map((item, sourceIndex) => {
      const itemTime = stringValue(item.time, item.lastConfirmed);
      return {
        item,
        sourceIndex,
        timestamp: itemTime ? parseRfc3339Timestamp(itemTime) : null,
      };
    })
    .sort((left, right) => {
      if (left.timestamp === null && right.timestamp === null) return left.sourceIndex - right.sourceIndex;
      if (left.timestamp === null) return 1;
      if (right.timestamp === null) return -1;
      return right.timestamp - left.timestamp || left.sourceIndex - right.sourceIndex;
    });
  const currentIndex = ordered.findIndex((candidate) => candidate.item === row);
  const neighbors = currentIndex < 0 ? [] : ordered
    .map((candidate, index) => ({ ...candidate, index }))
    .filter((candidate) => candidate.item !== row)
    .sort((left, right) => Math.abs(left.index - currentIndex) - Math.abs(right.index - currentIndex) || left.index - right.index)
    .slice(0, 2)
    .sort((left, right) => left.index - right.index)
    .map((candidate): LogNeighborEvidence => {
      const candidateTime = stringValue(candidate.item.time, candidate.item.lastConfirmed);
      return {
        relation: candidate.index < currentIndex ? "newer" : "older",
        time: candidateTime,
        timestamp: candidate.timestamp,
        topics: stringValue(candidate.item.topics),
        severity: severityFrom(candidate.item.severity, candidate.item.level, candidate.item.topics),
        message: stringValue(candidate.item.message, candidate.item.abnormal),
      };
    });
  return {
    kind: "log",
    sourceTable: title,
    time,
    timestamp: time ? parseRfc3339Timestamp(time) : null,
    topics: stringValue(row.topics),
    severity: severityFrom(row.severity, row.level, row.topics),
    source: stringValue(row.group, row.source),
    message: stringValue(row.message, row.abnormal),
    neighbors,
  };
}

function securityEvidence(title: string, row: UnknownRecord): SecurityRowEvidence {
  const time = stringValue(row.time, row.lastConfirmed, row.firstSeen);
  return {
    kind: "security",
    sourceTable: title,
    objectType: title === "安全告警" ? "alert" : "rule",
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
    sourceAddress: stringValue(row.srcAddress),
    destinationAddress: stringValue(row.dstAddress),
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
  const values = Array.isArray(row.values)
    ? row.values.map((value) => numberValue(value)).filter((value): value is number => value !== null)
    : [];
  return {
    kind: "resource",
    sourceTable: title,
    series: stringValue(row.key, row.series),
    values,
    sampleCount: values.length,
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

export function emptySectionRowEvidence(sourceTable = ""): GenericRowEvidence {
  return { kind: "generic", sourceTable, status: null };
}

export function buildSectionRowEvidence(
  route: PanelRouteId,
  title: string,
  row: UnknownRecord,
  context: SectionEvidenceContext = {},
): SectionRowEvidence {
  if (route === "interfaces" || route === "lineStatus") return interfaceEvidence(title, row, context);
  if (route === "routes" || (route === "balance" && title === "默认路由")) return buildRouteEvidence(title, row, context);
  if (route === "terminals") return terminalEvidence(title, row, context);
  if (route === "dhcp" && title === "地址租约") return terminalEvidence(title, row, context);
  if (route === "arp" && title === "ARP 对象") return terminalEvidence(title, row, context);
  if (route === "logs" || route === "serviceLogs") return logEvidence(title, row, context);
  if (route === "security") return securityEvidence(title, row);
  if (route === "dns4" || route === "dns6") return dnsEvidence(route, title, row, context);
  if (route === "trafficLoad" || route === "loadAudit") return resourceEvidence(title, row);
  if (route === "connections" || route === "trafficAudit") return connectionEvidence(title, row);
  return { kind: "generic", sourceTable: title, status: stringValue(row.status, row.state) };
}
