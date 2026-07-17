import type { PanelRouteId } from "../routes/panelRoutes";

type RowValues = Record<string, string>;

function normalizePart(value: unknown): string {
  return String(value ?? "").replace(/\s+/g, " ").trim().toLocaleLowerCase();
}

function shortHash(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
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
): string {
  const identity = panelObjectIdentity(route, table, values);
  return stablePanelObjectId(route, identity.kind, identity.parts);
}
