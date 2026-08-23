import { objectRows, record, type UnknownRecord } from "./rawValue";

export type InterfaceOperationalImpact = "none" | "risk" | "unverified";

export type InterfaceOperationalReason =
  | "running"
  | "administratively-disabled"
  | "enabled-default-route-not-running"
  | "impact-not-established"
  | "state-not-observed";

export interface InterfaceOperationalAssessment {
  observation: "running" | "not-running" | "disabled" | "unknown";
  impact: InterfaceOperationalImpact;
  reason: InterfaceOperationalReason;
  enabledDefaultRouteDependencies: UnknownRecord[];
}

export function observedBoolean(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  if (["true", "yes", "running", "active", "enabled", "up"].includes(normalized)) return true;
  if (["false", "no", "stopped", "inactive", "disabled", "down"].includes(normalized)) return false;
  return null;
}

function stringValue(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function isDefaultRoute(route: UnknownRecord): boolean {
  const destination = stringValue(route.dstAddress, route.destination);
  return route.default === true || destination === "0.0.0.0/0" || destination === "::/0";
}

export function defaultRouteRows(source: unknown): UnknownRecord[] {
  const root = record(source);
  const items = objectRows(root.items);
  if (items.length) return items.filter(isDefaultRoute);
  return objectRows(root.defaultRoutes);
}

export function routeGatewayMatchesInterface(route: UnknownRecord, interfaceName: string): boolean {
  const gateway = stringValue(route.gateway);
  if (!gateway || !interfaceName) return false;
  return gateway === interfaceName || gateway.endsWith(`%${interfaceName}`);
}

export function directDefaultRoutesForInterface(interfaceName: string, routeSource: unknown): UnknownRecord[] {
  if (!interfaceName) return [];
  return defaultRouteRows(routeSource).filter((route) => routeGatewayMatchesInterface(route, interfaceName));
}

export function assessInterfaceOperationalState({
  running,
  disabled,
  directDefaultRoutes,
}: {
  running: boolean | null;
  disabled: boolean | null;
  directDefaultRoutes: UnknownRecord[];
}): InterfaceOperationalAssessment {
  const enabledDefaultRouteDependencies = directDefaultRoutes.filter((route) => observedBoolean(route.disabled) === false);
  let observation: InterfaceOperationalAssessment["observation"] = "unknown";
  let impact: InterfaceOperationalImpact = "unverified";
  let reason: InterfaceOperationalReason = "state-not-observed";
  if (disabled === true) {
    observation = "disabled";
    impact = "none";
    reason = "administratively-disabled";
  } else if (running === true) {
    observation = "running";
    impact = "none";
    reason = "running";
  } else if (running === false) {
    observation = "not-running";
    if (disabled === false && enabledDefaultRouteDependencies.length > 0) {
      impact = "risk";
      reason = "enabled-default-route-not-running";
    } else {
      reason = "impact-not-established";
    }
  }
  return { observation, impact, reason, enabledDefaultRouteDependencies };
}

export function assessRawInterfaceOperationalState(row: UnknownRecord, routeSource: unknown): InterfaceOperationalAssessment {
  const interfaceName = stringValue(row.name, row.interface, row.lineId);
  return assessInterfaceOperationalState({
    running: observedBoolean(row.running),
    disabled: observedBoolean(row.disabled),
    directDefaultRoutes: directDefaultRoutesForInterface(interfaceName, routeSource),
  });
}
