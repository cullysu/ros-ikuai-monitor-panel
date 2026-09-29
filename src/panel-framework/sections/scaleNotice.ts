import type { PanelRouteId } from "../routes/panelRoutes";
import { record, type UnknownRecord } from "./rawValue";

/**
 * Sampling disclosure for list-shaped sections, mirroring the vanilla
 * panel-head.js `withScaleHint` semantics: the backend reports per-collection
 * sampling metadata under meta.scale[key] (list_scale_meta), and a badge is
 * shown ONLY when hasMore === true ("显示 shown / 共 total 条").
 */
export interface ScaleBadge {
  key: string;
  label: string;
  shownCount: number;
  totalCount: number;
}

const SCALE_KEY_LABELS: Record<string, string> = {
  wan: "WAN 线路",
  pppoe: "PPPoE 线路",
  interfaces: "接口对象",
  terminals: "终端记录",
  arp: "ARP 记录",
  dhcpLeases: "DHCP 租约",
  connectionsActive: "活跃连接",
  routes: "路由记录",
  securityFilters: "防火墙规则",
  addressLists: "安全地址集",
  mangleRules: "策略规则",
  routingRules: "路由规则",
};

/** Route -> snapshot.meta.scale keys whose sampled lists this page renders. */
const ROUTE_SCALE_KEYS: Partial<Record<PanelRouteId, readonly string[]>> = {
  interfaces: ["interfaces"],
  lineStatus: ["wan"],
  balance: ["pppoe", "mangleRules", "routingRules"],
  routes: ["routes"],
  terminals: ["terminals", "dhcpLeases"],
  dhcp: ["dhcpLeases"],
  arp: ["arp"],
  security: ["securityFilters", "addressLists"],
  trafficAudit: ["connectionsActive"],
};

function shownCountOf(meta: UnknownRecord): number | null {
  const value = meta.shownCount;
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : null;
}

function totalCountOf(meta: UnknownRecord): number | null {
  const value = meta.totalCount;
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : null;
}

export function routeScaleBadges(route: PanelRouteId, snapshot: unknown): ScaleBadge[] {
  const keys = ROUTE_SCALE_KEYS[route];
  if (!keys) return [];
  const scale = record(record(record(snapshot).meta).scale);
  const badges: ScaleBadge[] = [];
  for (const key of keys) {
    const meta = record(scale[key]);
    if (meta.hasMore !== true) continue;
    const shownCount = shownCountOf(meta);
    const totalCount = totalCountOf(meta);
    if (shownCount === null || totalCount === null || shownCount >= totalCount) continue;
    badges.push({ key, label: SCALE_KEY_LABELS[key] || key, shownCount, totalCount });
  }
  return badges;
}

export function scaleBadgeText(badge: ScaleBadge): string {
  return `显示 ${badge.shownCount} / 共 ${badge.totalCount} 条（${badge.label}）`;
}
