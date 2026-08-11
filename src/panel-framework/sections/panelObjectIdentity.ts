import type { PanelRouteId } from "../routes/panelRoutes";

type RowValues = Record<string, string>;

function normalizePart(value: unknown): string {
  // Deep-link identity must be stable across the viewer's locale (including Turkish).
  return String(value ?? "").replace(/\s+/g, " ").trim().toLowerCase();
}

function shortHash(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

type RawRowValues = Record<string, unknown>;

function rawIdentityString(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
    if (typeof value === "boolean") return value ? "true" : "false";
  }
  return "";
}

function canonicalRawIdentity(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalRawIdentity);
  if (value && typeof value === "object") {
    const source = value as RawRowValues;
    return Object.fromEntries(Object.keys(source).sort().map((key) => [key, canonicalRawIdentity(source[key])]));
  }
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string" || typeof value === "boolean" || value === null) return value;
  return null;
}

export function panelObjectIdentityPartsForRaw(
  route: PanelRouteId,
  table: string,
  row: RawRowValues,
): string[] {
  const immutableId = rawIdentityString(row.id, row[".id"]);
  if (immutableId) return [immutableId];

  let parts: string[];
  if (route === "interfaces") {
    parts = [rawIdentityString(row.name, row.interface), rawIdentityString(row.type), rawIdentityString(row.parent, row.master, row.bridge)];
  } else if (route === "lineStatus") {
    parts = [rawIdentityString(row.name, row.interface), rawIdentityString(row.parent), rawIdentityString(row.access, row.kind)];
  } else if (route === "terminals") {
    parts = [rawIdentityString(row.mac, row.macAddress), rawIdentityString(row.ip, row.address), rawIdentityString(row.hostname, row.displayName, row.name)];
  } else if (route === "dhcp" && table === "地址租约") {
    parts = [rawIdentityString(row.macAddress, row.mac, row.address), rawIdentityString(row.server)];
  } else if (route === "dhcp" && table === "地址池") {
    parts = [rawIdentityString(row.id, row[".id"]), rawIdentityString(row.name, row.pool), rawIdentityString(row.ranges, row.range)];
  } else if (route === "dhcp") {
    parts = [rawIdentityString(row.interface), rawIdentityString(row.server)];
  } else if (route === "arp") {
    parts = [rawIdentityString(row.mac, row.macAddress, row.ip, row.address), rawIdentityString(row.interface), rawIdentityString(row.type, row.level)];
  } else if (route === "routes") {
    parts = [
      rawIdentityString(row.dstAddress, row.destination, row.default === true ? "0.0.0.0/0" : ""),
      rawIdentityString(row.gateway, row.gatewayStatus),
      rawIdentityString(row.table, row.routingTable, "main"),
      rawIdentityString(row.distance),
      rawIdentityString(row.protocol, row.origin),
      rawIdentityString(row.scope),
      rawIdentityString(row.prefSrc, row.preferredSource),
      rawIdentityString(row.routingMark),
      rawIdentityString(row.interface),
      rawIdentityString(row.comment),
    ];
  } else if (route === "balance" && table === "默认路由") {
    parts = [rawIdentityString(row.dstAddress, row.destination, "0.0.0.0/0"), rawIdentityString(row.gateway), rawIdentityString(row.table, row.routingTable, "main"), rawIdentityString(row.distance), rawIdentityString(row.protocol, row.origin)];
  } else if (route === "balance" && table === "线路分布") {
    parts = [rawIdentityString(row.id, row[".id"]), rawIdentityString(row.name, row.interface, row.lineId)];
  } else if (route === "balance") {
    parts = [rawIdentityString(row.chain), rawIdentityString(row.action), rawIdentityString(row.newRoutingMark, row.table, row.routingMark), rawIdentityString(row.inInterface, row.outInterface, row.interface), rawIdentityString(row.comment), rawIdentityString(row.rawOrder, row.order)];
  } else if (route === "trafficLoad" || route === "loadAudit") {
    parts = [rawIdentityString(row.key, row.series)];
  } else if (route === "connections" || route === "trafficAudit") {
    parts = [
      rawIdentityString(row.source, row.localIp, row.srcAddress, row.src, row.ip, row.name),
      rawIdentityString(row.destination, row.remoteIp, row.dstAddress, row.dst),
      rawIdentityString(row.protocol, row.label),
      rawIdentityString(row.sourcePort, row.srcPort),
      rawIdentityString(row.destinationPort, row.dstPort),
    ];
  } else if (route === "logs" || route === "serviceLogs") {
    parts = [rawIdentityString(row.time, row.timestamp), rawIdentityString(row.group), rawIdentityString(row.topics), rawIdentityString(row.message)];
  } else if (route === "dns4" || route === "dns6") {
    parts = [rawIdentityString(row.name, row.interface), rawIdentityString(row.type, row.prefix), rawIdentityString(row.value, row.address, row.dnsServers), rawIdentityString(row.route, row.addDefaultRoute)];
  } else if (route === "security" && table === "安全告警") {
    parts = [rawIdentityString(row.time, row.lastConfirmed), rawIdentityString(row.affected, row.topics), rawIdentityString(row.abnormal, row.message)];
  } else if (route === "security" && table === "地址集") {
    parts = [rawIdentityString(row.id, row[".id"]), rawIdentityString(row.list, row.name), rawIdentityString(row.address, row.ip), rawIdentityString(row.timeout)];
  } else if (route === "security") {
    parts = [rawIdentityString(row.rawOrder, row.order), rawIdentityString(row.chain), rawIdentityString(row.action), rawIdentityString(row.comment), rawIdentityString(row.srcAddress), rawIdentityString(row.dstAddress), rawIdentityString(row.protocol)];
  } else if (route === "readonlyDiagnostics") {
    // A diagnostic timestamp changes on every collection cycle; including it
    // would invalidate an otherwise stable object deep link after a reload.
    parts = [rawIdentityString(row.group), rawIdentityString(row.name), rawIdentityString(row.message)];
  } else {
    parts = [table, JSON.stringify(canonicalRawIdentity(row))];
  }
  return parts.some(Boolean) ? parts : [table, JSON.stringify(canonicalRawIdentity(row))];
}

export function stablePanelObjectId(
  route: PanelRouteId,
  kind: string,
  parts: readonly unknown[],
): string {
  const normalized = parts.map(normalizePart);
  const identity = [route, kind, ...normalized].join("\u001f");
  const slug = normalized.find(Boolean)?.replace(/[^a-z0-9._:-]+/g, "-").replace(/^-|-$/g, "").slice(0, 24) || "object";
  return `${route}-${kind}-${slug}-${shortHash(identity)}`;
}

export function panelObjectIdentity(
  route: PanelRouteId,
  table: string,
  values: RowValues,
): { kind: string; parts: string[] } {
  if (route === "interfaces") return { kind: "interface", parts: [values.name] };
  if (route === "lineStatus") return { kind: "wan", parts: [values.name] };
  if (route === "terminals") {
    return { kind: "terminal", parts: [values._mac || values.address, values.name] };
  }
  if (route === "dhcp") {
    if (table === "地址租约") return { kind: "lease", parts: [values._leaseId || values.mac || values.address, values.server] };
    if (table === "地址池") return { kind: "dhcp-pool", parts: [values.name, values.ranges] };
    return { kind: "dhcp-client", parts: [values.interface] };
  }
  if (route === "arp") {
    return { kind: table === "身份告警" ? "arp-alert" : "arp", parts: [values.mac || values.address, values.interface, values.kind] };
  }
  if (route === "routes") {
    return { kind: "route", parts: [values.destination, values.gateway, values.table] };
  }
  if (route === "balance") {
    return table === "默认路由"
      ? { kind: "route", parts: [values.gateway, values.table, values.distance] }
      : table === "线路分布"
        ? { kind: "balance-distribution", parts: [values.name] }
      : { kind: "policy", parts: [values.chain, values.mark, values.interface, values.comment] };
  }
  if (route === "trafficLoad" || route === "loadAudit") {
    return { kind: "resource", parts: [values.series] };
  }
  if (route === "connections") {
    return {
      kind: "connection",
      parts: [values._id || values.source, values.target, values._protocol, values._sourcePort, values._targetPort],
    };
  }
  if (route === "trafficAudit") {
    return { kind: "flow", parts: [values._id || values.source, values.target, values._protocol] };
  }
  if (route === "logs" || route === "serviceLogs") {
    return { kind: "log", parts: [values.time, values.topics, values.message] };
  }
  if (route === "dns4" || route === "dns6") {
    return { kind: "dns", parts: [values.name || values.interface, values.type || values.prefix, values.value || values.route] };
  }
  if (route === "security") {
    return table === "安全告警"
      ? { kind: "security-alert", parts: [values.time, values.scope, values.message] }
      : table === "地址集"
        ? { kind: "security-address-list", parts: [values.list, values.address, values.timeout] }
      : { kind: "firewall-rule", parts: [values.order, values.chain, values.action, values.comment] };
  }
  if (route === "readonlyDiagnostics") {
    return { kind: "diagnostic", parts: [values.group, values.name, values.message] };
  }
  const fallback = Object.keys(values).sort().map((key) => `${key}=${values[key]}`);
  return { kind: "object", parts: [table, ...fallback] };
}

export function panelObjectIdForValues(
  route: PanelRouteId,
  table: string,
  values: RowValues,
  identityParts?: readonly unknown[],
): string {
  const identity = panelObjectIdentity(route, table, values);
  const parts = identityParts?.some((part) => normalizePart(part)) ? identityParts : identity.parts;
  return stablePanelObjectId(route, identity.kind, parts);
}
