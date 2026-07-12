import type { LedgerRow } from "../desktopOverviewHelpers";

interface WanOfflineFocusProps {
  rows: LedgerRow[];
  total: number;
}

export function WanOfflineFocus({ rows, total }: WanOfflineFocusProps) {
  const visibleRows = rows.slice(0, 4);
  const hiddenCount = Math.max(0, rows.length - visibleRows.length);

  return (
    <div className="ro-wan-offline-focus" data-overview-wan-offline-focus="summary-top-objects-details-deferred">
      <div className="ro-wan-offline-verdict" aria-label="WAN 全离线判断">
        <span>
          <em>线路状态</em>
          <b>0/{total} 在线</b>
          <small>全部出口离线</small>
        </span>
        <span>
          <em>默认出口</em>
          <b>未承载</b>
          <small>活动默认路由 0</small>
        </span>
        <span>
          <em>速率</em>
          <b>无有效样本</b>
          <small>不展示 0 B/s</small>
        </span>
      </div>
      <div className="ro-wan-offline-objects" aria-label="优先核对的离线线路">
        {visibleRows.map((row) => (
          <div data-overview-wan-detail-row data-tone={row.tone || "danger"} key={row.id}>
            <span className="ro-wan-offline-object">{row.cells[0]}</span>
            <span>{row.cells[1]}</span>
            <em>{row.cells[2]}</em>
          </div>
        ))}
        {hiddenCount > 0 ? <p>其余 {hiddenCount} 条线路在详情中</p> : null}
      </div>
    </div>
  );
}
