import { ChevronRight } from "lucide-react";
import type { PanelNavigate, PanelRouteId } from "../../routes/panelRoutes";
import type { DesktopLedgerRow } from "./desktopOverviewModel";

export function DesktopLedger({
  title,
  subtitle,
  rows,
  onNavigate,
  module,
  emptyLabel = "当前没有可列出的对象",
  taskLandmark,
  evidenceAt = null,
  presentation = "table",
}: {
  title: string;
  subtitle: string;
  rows: DesktopLedgerRow[];
  onNavigate: PanelNavigate;
  module: string;
  emptyLabel?: string;
  taskLandmark?: string;
  evidenceAt?: string | null;
  presentation?: "table" | "ledger";
}) {
  return (
    <section className={`do-ledger is-${presentation}`} aria-labelledby={`do-ledger-${module}`} data-desktop-ledger={module} data-desktop-ledger-presentation={presentation} data-overview-task-landmark={taskLandmark}>
      <header className="do-module-heading">
        <div><h2 id={`do-ledger-${module}`}>{title}</h2><p>{subtitle}</p></div>
        <span>{rows.length} 项</span>
      </header>
      {rows.length ? (
        <div className="do-ledger-table" role="table" aria-label={title}>
          <div className="do-ledger-head" role="row">
            <span role="columnheader">类型</span>
            <span role="columnheader">对象</span>
            <span role="columnheader">状态</span>
            <span role="columnheader">证据</span>
            <span role="columnheader">来源</span>
          </div>
          <div className="do-ledger-body" role="rowgroup">
            {rows.map((row) => (
              <div
                className={`do-ledger-row is-${row.tone}`}
                role="row"
                data-desktop-ledger-row={row.id}
                data-overview-object-detail={row.targetObjectId}
                key={row.id}
              >
                <span className="do-ledger-category" role="cell">{row.category}</span>
                <span className="do-ledger-object" role="cell">
                  {row.route ? (
                    <button
                      type="button"
                      onClick={() => onNavigate(row.route as PanelRouteId, row.targetObjectId ? {
                        objectId: row.targetObjectId,
                        returnRoute: "overview",
                        evidenceAt,
                      } : undefined)}
                      aria-label={`查看${row.object}详情`}
                      data-desktop-ledger-route={row.route}
                    >
                      <b>{row.object}</b><ChevronRight aria-hidden="true" size={15} />
                    </button>
                  ) : <b>{row.object}</b>}
                </span>
                <span className="do-ledger-state" role="cell"><i aria-hidden="true" /><b>{row.state}</b></span>
                <span className="do-ledger-evidence" role="cell">{row.evidence}</span>
                <details className="do-ledger-source" role="cell">
                  <summary aria-label={`查看${row.sourceLabel || "来源"}原始字段`}>
                    {row.sourceLabel || "当前快照字段"}
                  </summary>
                  <code>{row.source}</code>
                </details>
              </div>
            ))}
          </div>
        </div>
      ) : <p className="do-ledger-empty">{emptyLabel}</p>}
    </section>
  );
}
