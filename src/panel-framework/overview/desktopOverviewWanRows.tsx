import { formatRate, type OverviewDerivedState, type OverviewRawSnapshot } from "./index";
import { collectWanRows, text, type LedgerRow } from "./desktopOverviewHelpers";

export function wanRows(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): LedgerRow[] {
  const rows = collectWanRows(snapshot);
  if (!rows.length) {
    return [{ id: "wan-unavailable", attrs: { "data-overview-wan-detail-row": "true" }, cells: ["WAN", state.scenario === "no-snapshot" ? "隐藏" : "未采集", state.scenario === "no-snapshot" ? "无业务快照，业务数据不展示" : "无 WAN 清单"], tone: state.scenario === "no-snapshot" ? "missing" : "warn" }];
  }
  const orderedRows = state.scenario === "fleet" || state.scenario === "all-offline"
    ? rows.slice().sort((left, right) => Number(left.running !== false) - Number(right.running !== false))
    : rows;
  const visibleLimit = state.scenario === "all-offline" ? 8 : state.scenario === "fleet" ? 16 : 6;
  return orderedRows.slice(0, visibleLimit).map((row, index) => {
    const name = text(row.name || row.interface, `wan-${index + 1}`);
    const parent = text(row.parent || row.interface || row.kind || row.access, "-");
    const routeCarrying = Array.isArray(row.routes) && row.routes.some((route) => route.active && !route.disabled) ? "承载" : "未承载";
    const rate = state.scenario === "no-snapshot" ? "速率不展示" : row.running === false ? "离线无速率" : `${formatRate(row.upRate)} / ${formatRate(row.downRate)}`;
    return {
      id: `wan-${name}-${index}`,
      attrs: {
        "data-overview-wan-detail-row": "true",
        ...(row.running === false ? { "data-overview-anomaly-object": name } : {}),
      },
      cells: [<><b>{name}</b><small>{parent}</small></>, row.running === false ? "离线" : "在线", state.scenario === "no-snapshot" ? "速率不展示" : `${routeCarrying} · ${rate}`],
      tone: row.running === false ? "danger" : "ok",
    };
  });
}
