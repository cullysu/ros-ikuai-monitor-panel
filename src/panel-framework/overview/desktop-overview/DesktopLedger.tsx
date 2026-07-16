import { ChevronRight } from "lucide-react";
import type { PanelRouteId } from "../../routes/panelRoutes";
import type { DesktopLedgerRow } from "./desktopOverviewModel";

export function DesktopLedger({
  title,
  subtitle,
  rows,
  onNavigate,
  module,
  emptyLabel = "当前没有可列出的对象",
}: {
  title: string;
  subtitle: string;
  rows: DesktopLedgerRow[];
  onNavigate: (route: PanelRouteId) => void;
  module: string;
  emptyLabel?: string;
}) {
  return (
    <section className="do-ledger" aria-labelledby={`do-ledger-${module}`} data-desktop-ledger={module}>
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
              <div className={`do-ledger-row is-${row.tone}`} role="row" data-desktop-ledger-row={row.id} key={row.id}>
                <span className="do-ledger-category" role="cell">{row.category}</span>
                <span className="do-ledger-object" role="cell">
                  {row.route ? (
                    <button type="button" onClick={() => onNavigate(row.route as PanelRouteId)} aria-label={`查看${row.object}详情`} data-desktop-ledger-route={row.route}>
                      <b>{row.object}</b><ChevronRight aria-hidden="true" size={15} />
                    </button>
                  ) : <b>{row.object}</b>}
                </span>
                <span className="do-ledger-state" role="cell"><i aria-hidden="true" /><b>{row.state}</b></span>
                <span className="do-ledger-evidence" role="cell">{row.evidence}</span>
                <code className="do-ledger-source" role="cell">{row.source}</code>
              </div>
            ))}
          </div>
        </div>
      ) : <p className="do-ledger-empty">{emptyLabel}</p>}
    </section>
  );
}
