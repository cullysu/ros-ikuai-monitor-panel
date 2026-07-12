import type { OverviewDerivedState, OverviewRawSnapshot } from "./index";
import type { LedgerRow } from "./desktopOverviewHelpers";
import { buildRouterOsRouteEvidenceModel } from "./routerosEvidenceModel";

export function routeFactRows(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): LedgerRow[] {
  const routeEvidence = buildRouterOsRouteEvidenceModel(snapshot, state);
  const summaryRow: LedgerRow = {
    id: "route-business-summary",
    attrs: {
      "data-overview-default-route-row": "true",
      "data-routeros-route-evidence-contract": routeEvidence.contract,
      "data-routeros-evidence-item": "business",
      "data-routeros-evidence-role": "business-summary-primary",
      "data-routeros-raw-field-mode": "hidden-secondary",
    },
    cells: [
      routeEvidence.summary.label,
      routeEvidence.summary.value,
      "业务结论",
      routeEvidence.summary.note,
    ],
    title: "RouterOS 原始 route 字段已标准化为业务出口结论；原始字段仅作为二级证据",
    tone: routeEvidence.summary.tone,
  };
  return [summaryRow, ...routeEvidence.businessRows.map((route) => ({
    id: route.id,
    attrs: {
      "data-overview-default-route-row": "true",
      "data-overview-route-copy": "business",
      "data-routeros-route-evidence-contract": routeEvidence.contract,
      "data-routeros-evidence-item": route.layer,
      "data-routeros-evidence-role": "business-main",
      "data-routeros-raw-field-mode": "business-translated-no-raw-attrs",
      "data-routeros-business-route-copy": "gateway-priority-status-no-routeros-raw-fields",
    },
    cells: [
      route.label,
      `网关 ${route.gateway}`,
      `优先级 ${route.priority}`,
      route.status,
    ],
    title: route.title,
    tone: route.tone,
  }))];
}

export function routeBusinessRows(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): LedgerRow[] {
  const routeEvidence = buildRouterOsRouteEvidenceModel(snapshot, state);
  return routeEvidence.businessRows.slice(0, 4).map((route) => ({
    id: `route-business-${route.routeIndex}`,
    attrs: {
      "data-overview-default-route-row": "true",
      "data-overview-route-copy": "business-main",
      "data-routeros-route-evidence-contract": routeEvidence.contract,
      "data-routeros-evidence-item": route.layer,
      "data-routeros-evidence-role": "business-main",
      "data-routeros-raw-field-mode": "business-translated-no-raw-attrs",
      "data-routeros-business-route-copy": "gateway-priority-status-no-routeros-raw-fields",
    },
    cells: [
      route.label,
      route.gateway,
      `优先级 ${route.priority}`,
      route.status,
    ],
    title: route.title,
    tone: route.tone,
  }));
}

export function routeRawEvidenceRows(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): LedgerRow[] {
  const routeEvidence = buildRouterOsRouteEvidenceModel(snapshot, state);
  return routeEvidence.rawRows.map((item) => ({
    id: item.id,
    attrs: {
      "data-overview-default-route-row": "true",
      "data-routeros-route-evidence-contract": routeEvidence.contract,
      "data-routeros-evidence-item": item.layer,
      "data-routeros-evidence-role": "raw-secondary",
      "data-routeros-raw-field-mode": "secondary-collapsed-evidence",
      "data-routeros-raw-field-contract": "table-gateway-distance-active-disabled-secondary",
      "data-routeros-raw-secondary-rail": "bottom-collapsed-low-noise",
      "data-routeros-raw-table": item.rawFields?.table || "",
      "data-routeros-raw-gateway": item.rawFields?.gateway || "",
      "data-routeros-raw-distance": item.rawFields?.distance || "",
      "data-routeros-raw-active": item.rawFields?.active || "",
      "data-routeros-raw-disabled": item.rawFields?.disabled || "",
    },
    cells: [
      item.label,
      item.value,
      "table / gateway / distance / active / disabled 二级证据",
    ],
    title: `${item.value} · ${item.note}`,
    tone: item.tone,
  }));
}
