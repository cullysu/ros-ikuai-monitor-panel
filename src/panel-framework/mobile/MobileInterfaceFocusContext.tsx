import { ChevronRight, CircleHelp, CircleX, ShieldCheck } from "lucide-react";
import type { PanelNavigate } from "../routes/panelRoutes";
import type { InterfaceRowEvidence } from "../sections/sectionRowEvidenceTypes";
import type { WorkspaceRow } from "./mobileDomainWorkspaceModel";

interface MobileInterfaceFocusContextProps {
  rows: WorkspaceRow[];
  evidenceAt: string | null;
  onNavigate: PanelNavigate;
  onOpen: (row: WorkspaceRow) => void;
}

function rateLabel(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "未取得";
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)} Gbps`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)} Mbps`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)} Kbps`;
  return `${Math.round(value)} bps`;
}

function runningLabel(value: boolean | null): string {
  if (value === true) return "运行";
  if (value === false) return "未运行";
  return "未确认";
}

function routeLabel(evidence: InterfaceRowEvidence): string {
  const [route] = evidence.defaultRoutes;
  if (!route) return "默认路由明细未取得";
  return `${route.destination} → ${route.gateway || "网关未记录"}`;
}

function objectEvidence(row: WorkspaceRow): InterfaceRowEvidence {
  return row.evidence as InterfaceRowEvidence;
}

function directInterfaceRows(rows: WorkspaceRow[]): WorkspaceRow[] {
  return rows.filter((row) => {
    if (row.evidence.kind !== "interface") return false;
    const evidence = objectEvidence(row);
    return evidence.defaultRouteRelation === "direct" && evidence.defaultRoutes.length > 0;
  });
}

export function singleDirectInterfaceId(rows: WorkspaceRow[]): string | null {
  const directRows = directInterfaceRows(rows);
  const [directRow] = directRows;
  return directRows.length === 1 ? directRow?.id || null : null;
}

export function MobileInterfaceFocusContext({
  rows,
  evidenceAt,
  onNavigate,
  onOpen,
}: MobileInterfaceFocusContextProps) {
  const interfaceRows = rows.filter((row) => row.evidence.kind === "interface");
  if (!interfaceRows.length) return null;

  const directRows = directInterfaceRows(interfaceRows);
  const focusObjectId = singleDirectInterfaceId(rows);
  const focusRow = focusObjectId ? directRows.find((row) => row.id === focusObjectId) || null : null;
  const focusEvidence = focusRow ? objectEvidence(focusRow) : null;
  const hasUnknownRelation = interfaceRows.some((row) => {
    const evidence = objectEvidence(row);
    return evidence.defaultRouteRelation !== "direct" || evidence.defaultRoutes.length === 0;
  });
  const routeAction = hasUnknownRelation ? (
    <div className="mdw-status-row" data-mobile-interface-focus-route-action="true">
      <p>仍有接口关系待核对，先确认实际默认出口。</p>
      <button
        className="mdw-reset-controls"
        type="button"
        onClick={() => onNavigate("routes", { returnRoute: "interfaces", evidenceAt })}
      >
        核对路由表
        <ChevronRight aria-hidden="true" size={16} />
      </button>
    </div>
  ) : null;

  return (
    <section
      className="mdw-domain-context mdw-interface-focus-context"
      data-mobile-interface-focus-context="true"
      data-mobile-interface-focus-state={directRows.length === 1 ? "single" : directRows.length > 1 ? "multiple" : "unknown"}
      aria-labelledby="mdw-interface-focus-title"
    >
      <header className="mdw-list-heading">
        <span>
          <b id="mdw-interface-focus-title">当前接口对象</b>
        </span>
        <small>{directRows.length === 1 ? "明确承载默认出口" : directRows.length > 1 ? "多个明确出口对象" : "默认出口对象未确认"}</small>
      </header>

      {directRows.length === 1 && focusRow && focusEvidence ? (
        <>
          <div
            className="mdw-focus-object"
            data-mobile-interface-focus-object={focusRow.id}
            data-mobile-interface-focus-object-id={focusRow.id}
            data-mobile-interface-focus-evidence-at={evidenceAt || undefined}
          >
          <div className="mdw-list-heading mdw-focus-object-heading">
            <span className="mdw-focus-object-icon"><ShieldCheck aria-hidden="true" size={18} /></span>
            <div className="mdw-row-copy">
              <small>默认出口对象</small>
              <b>{focusRow.primary}</b>
              <small>{focusEvidence.role || "接口角色未记录"} · {runningLabel(focusEvidence.running)}</small>
            </div>
            <button
              className="mdw-reset-controls"
              type="button"
              onClick={() => onOpen(focusRow)}
              aria-label={`查看接口对象 ${focusRow.primary}`}
            >
              查看对象
              <ChevronRight aria-hidden="true" size={16} />
            </button>
          </div>
          <div className="mdw-metrics" aria-label="接口对象事实">
            <div>
              <small>默认路由</small>
              <b>{routeLabel(focusEvidence)}</b>
            </div>
            <div>
              <small>父接口</small>
              <b>{focusEvidence.parent || "未记录"}</b>
            </div>
            <div>
              <small>当前吞吐</small>
              <b>↓ {rateLabel(focusEvidence.rxRate)} · ↑ {rateLabel(focusEvidence.txRate)}</b>
            </div>
          </div>
          </div>
          {routeAction}
        </>
      ) : directRows.length > 1 ? (
        <>
          <div className="mdw-focus-choice" data-mobile-interface-focus-object="multiple" data-mobile-interface-focus-evidence-at={evidenceAt || undefined}>
          <div className="mdw-status-row mdw-focus-choice-note">
            <CircleHelp aria-hidden="true" size={18} />
            <p>检测到多个明确出口对象，请选择后查看对象状态。</p>
          </div>
          <div className="mdw-object-list mdw-focus-choice-list">
            {directRows.map((row) => {
              const evidence = objectEvidence(row);
              return (
                <button type="button" key={row.id} onClick={() => onOpen(row)} data-mobile-interface-focus-object-id={row.id}>
                  <span className="mdw-row-mark is-bound" aria-hidden="true" />
                  <span className="mdw-row-copy"><b>{row.primary}</b><small>{runningLabel(evidence.running)} · {evidence.parent || "父接口未记录"}</small></span>
                  <span className="mdw-row-state">查看对象</span>
                  <ChevronRight aria-hidden="true" size={16} />
                </button>
              );
            })}
          </div>
          </div>
          {routeAction}
        </>
      ) : (
        <>
          <div className="mdw-status-row mdw-focus-unknown" data-mobile-interface-focus-object="unknown" data-mobile-interface-focus-evidence-at={evidenceAt || undefined}>
            <CircleX aria-hidden="true" size={18} />
            <span className="mdw-row-copy"><b>当前对象未确认</b><small>接口与默认路由关系未形成 direct 证据，不自动选择出口。</small></span>
          </div>
          {routeAction}
        </>
      )}
    </section>
  );
}
