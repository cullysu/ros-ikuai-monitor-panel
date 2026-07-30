import { ChevronRight } from "lucide-react";
import { Fragment } from "react";
import type { PanelNavigate } from "../routes/panelRoutes";
import type { InterfaceRowEvidence } from "../sections/sectionRowEvidenceTypes";
import type { WorkspaceRow } from "./mobileDomainWorkspaceModel";

interface MobileInterfaceRouteEvidenceProps {
  rows: WorkspaceRow[];
  onNavigate: PanelNavigate;
  evidenceAt: string | null;
  excludeObjectId?: string | null;
  showRouteAction?: boolean;
}

function relationLabel(evidence: InterfaceRowEvidence): string {
  if (evidence.defaultRouteRelation !== "direct") return "待核对";
  return evidence.defaultRoutes[0] ? "已关联" : "未取得";
}

function relationDetail(evidence: InterfaceRowEvidence): string {
  const route = evidence.defaultRoutes[0];
  if (!route) return "默认路由明细未取得";
  return `${route.destination} → ${route.gateway || "网关未记录"}`;
}

export function MobileInterfaceRouteEvidence({
  rows,
  onNavigate,
  evidenceAt,
  excludeObjectId = null,
  showRouteAction = true,
}: MobileInterfaceRouteEvidenceProps) {
  const interfaceRows = rows.filter((row) => row.evidence.kind === "interface");
  if (!interfaceRows.length) return null;

  const evidenceRows = interfaceRows.filter((row) => row.id !== excludeObjectId).slice(0, 6);
  if (!evidenceRows.length) return null;
  const needsRouteCheck = evidenceRows.some((row) => {
    const evidence = row.evidence as InterfaceRowEvidence;
    return evidence.defaultRouteRelation !== "direct" || !evidence.defaultRoutes[0];
  });

  return (
    <section
      className="mdw-domain-context"
      data-mobile-interface-route-evidence="true"
      aria-labelledby="mdw-mobile-interface-route-evidence-title"
    >
      <header className="mdw-list-heading">
        <span>
          <b id="mdw-mobile-interface-route-evidence-title" role="heading" aria-level={2}>接口路径证据</b>
        </span>
        <small>接口对象 ↔ 默认路由</small>
      </header>
      <div
        className="mdw-metrics"
        data-mobile-interface-route-evidence-list="true"
        style={{ gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1.35fr)" }}
      >
        {evidenceRows.map((row) => {
          const evidence = row.evidence as InterfaceRowEvidence;
          const status = relationLabel(evidence);
          const needsCheck = status !== "已关联";
          return (
            <Fragment key={row.id}>
              <div data-mobile-interface-route-row={row.id}>
                <small>接口</small>
                <b>{row.primary}</b>
                <em>{evidence.role || "角色未记录"}</em>
              </div>
              <div className={needsCheck ? "is-warn" : ""}>
                <small>{status}</small>
                <b>{relationDetail(evidence)}</b>
                <em>{needsCheck ? "不自动选择默认出口" : "来自明确对象匹配"}</em>
              </div>
            </Fragment>
          );
        })}
      </div>
      {needsRouteCheck && showRouteAction ? (
        <div className="mdw-status-row">
          <p>关系未完整取得，需核对路由表。</p>
          <button
            className="mdw-reset-controls"
            type="button"
            onClick={() => onNavigate("routes", { returnRoute: "interfaces", evidenceAt })}
          >
            查看路由表
            <ChevronRight aria-hidden="true" size={17} />
          </button>
        </div>
      ) : null}
    </section>
  );
}
