import {
  type OverviewDerivedState,
  type OverviewRawRoute,
  type OverviewRawSnapshot,
  type OverviewTone,
} from "./types";

export type RouterOsEvidenceLayer = "business" | "semantic" | "raw";

export interface RouterOsEvidenceItem {
  id: string;
  label: string;
  value: string;
  note: string;
  tone: OverviewTone;
  layer: RouterOsEvidenceLayer;
  source: "route" | "collection" | "snapshot";
  rawFields?: Record<string, string>;
}

export interface RouterOsRouteEvidenceItem extends RouterOsEvidenceItem {
  routeIndex: number;
  table: string;
  gateway: string;
  priority: string;
  status: string;
  title: string;
}

export interface RouterOsRouteEvidenceModel {
  summary: RouterOsEvidenceItem;
  businessRows: RouterOsRouteEvidenceItem[];
  rawRows: RouterOsEvidenceItem[];
}

const ROUTE_UNKNOWN = "路由快照未取回，无法判断默认出口影响";

function clean(value: unknown, fallback = "-"): string {
  const normalized = String(value ?? "").replace(/\s+/g, " ").trim();
  return normalized || fallback;
}

function routeRows(snapshot: OverviewRawSnapshot): OverviewRawRoute[] {
  const rows = snapshot.routes?.defaultRoutes || snapshot.routes?.items || [];
  return Array.isArray(rows) ? rows : [];
}

export function routerOsRouteStatusText(active?: boolean, disabled?: boolean): "当前承载" | "已停用" | "备选未命中" {
  if (disabled) return "已停用";
  return active ? "当前承载" : "备选未命中";
}

export function routerOsRouteTableText(value: unknown): string {
  const table = clean(value, "main");
  return /^main$/i.test(table) ? "主业务域" : `策略域 ${table}`;
}

export function routerOsRouteGatewayText(value: unknown): string {
  return clean(value, "网关未记录");
}

export function routerOsRoutePriorityText(value: unknown): string {
  return clean(value, "未记录");
}

export function routerOsRouteBusinessSummary(value: unknown, fallback = ROUTE_UNKNOWN): string {
  return clean(value, fallback)
    .replace(/active\s*[:=]?\s*true/gi, "当前承载")
    .replace(/active\s*[:=]?\s*false/gi, "备选未命中")
    .replace(/disabled\s*[:=]?\s*false/gi, "允许参与选路")
    .replace(/disabled\s*[:=]?\s*true/gi, "已停用")
    .replace(/\brouting[-_\s]?table\b|\broutingTable\b/gi, "路由域")
    .replace(/\bgatewayStatus\b/gi, "网关状态")
    .replace(/\bdistance\b/gi, "优先级")
    .replace(/\bgateway\b/gi, "网关")
    .replace(/\bactive\b/gi, "承载状态")
    .replace(/\bdisabled\b/gi, "停用状态")
    .replace(/\btable\b/gi, "路由域")
    .replace(/\bmain\b/gi, "主业务域");
}

function routeTitle(table: string, gateway: string, distance: string | number, active?: boolean, disabled?: boolean): string {
  return `默认出口 ${routerOsRouteGatewayText(gateway)}，选路优先级 ${routerOsRoutePriorityText(distance)}，${routerOsRouteStatusText(active, disabled)}；${routerOsRouteTableText(table)}`;
}

function routeTone(route: OverviewRawRoute): OverviewTone {
  if (route.active && !route.disabled) return "ok";
  if (route.disabled) return "warn";
  return "warn";
}

function missingTone(state: OverviewDerivedState): OverviewTone {
  return state.scenario === "no-snapshot" ? "missing" : "warn";
}

function missingModel(state: OverviewDerivedState): RouterOsRouteEvidenceModel {
  const tone = missingTone(state);
  const summary: RouterOsEvidenceItem = {
    id: "route-summary-missing",
    label: "业务出口",
    value: "待判",
    note: state.scenario === "no-snapshot" ? "当前出口证据未返回，不推断承载" : "默认出口证据未采集，不推断承载",
    tone,
    layer: "business",
    source: "route",
  };
  return {
    summary,
    businessRows: [{
      ...summary,
      id: "route-missing",
      routeIndex: 0,
      table: "待判",
      gateway: "待判",
      priority: "证据缺失",
      status: "不推断承载状态",
      title: "默认出口证据缺失；不展示 RouterOS 原始字段推断",
    }],
    rawRows: [{
      id: "route-raw-missing",
      label: "RouterOS 原始字段",
      value: "未采集",
      note: "table / gateway / distance / active / disabled 缺失",
      tone,
      layer: "raw",
      source: "route",
      rawFields: {
        table: "-",
        gateway: "-",
        distance: "-",
        active: "-",
        disabled: "-",
      },
    }],
  };
}

export function buildRouterOsRouteEvidenceModel(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): RouterOsRouteEvidenceModel {
  const rows = routeRows(snapshot);
  if (!rows.length) return missingModel(state);

  const businessRows = rows.slice(0, 6).map((route, index) => {
    const rawTable = clean(route.table || route.routingTable, "main");
    const table = routerOsRouteTableText(rawTable);
    const gateway = routerOsRouteGatewayText(route.gateway || route.gatewayStatus);
    const priority = routerOsRoutePriorityText(route.distance);
    const status = routerOsRouteStatusText(route.active, route.disabled);
    return {
      id: `route-${index}`,
      label: index === 0 ? "默认出口" : `备用出口 ${index + 1}`,
      value: gateway,
      note: `${table} / 优先级 ${priority} / ${status}`,
      tone: routeTone(route),
      layer: "business",
      source: "route",
      routeIndex: index,
      table,
      gateway,
      priority,
      status,
      title: routeTitle(rawTable, gateway, priority, route.active, route.disabled),
      rawFields: {
        table: rawTable,
        gateway: clean(route.gateway || route.gatewayStatus, "-"),
        distance: clean(route.distance, "-"),
        active: route.active ? "true" : "false",
        disabled: route.disabled ? "true" : "false",
      },
    } satisfies RouterOsRouteEvidenceItem;
  });

  const active = rows.filter((route) => route.active && !route.disabled).length;
  const summaryTone: OverviewTone = active > 0 ? "ok" : state.facts.route.level;
  const summary: RouterOsEvidenceItem = {
    id: "route-summary",
    label: "默认出口",
    value: active > 0 ? `命中 ${active}/${rows.length}` : "未命中",
    note: businessRows[0]?.note || routerOsRouteBusinessSummary(state.facts.route.rawSummary),
    tone: summaryTone,
    layer: "business",
    source: "route",
  };

  const rawRows = rows.slice(0, 4).map((route, index) => {
    const rawFields = {
      table: clean(route.table || route.routingTable, "main"),
      gateway: clean(route.gateway || route.gatewayStatus, "未记录"),
      distance: clean(route.distance, "未记录"),
      active: route.active ? "true" : "false",
      disabled: route.disabled ? "true" : "false",
    };
    return {
      id: `route-raw-evidence-${index}`,
      label: index === 0 ? "RouterOS 原始字段" : `RouterOS 备用 ${index + 1}`,
      value: `table ${rawFields.table} / gateway ${rawFields.gateway}`,
      note: `distance ${rawFields.distance} / active ${rawFields.active} / disabled ${rawFields.disabled}`,
      tone: routeTone(route),
      layer: "raw",
      source: "route",
      rawFields,
    } satisfies RouterOsEvidenceItem;
  });

  return { summary, businessRows, rawRows };
}
