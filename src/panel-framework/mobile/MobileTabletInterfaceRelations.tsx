import type { InterfaceRowEvidence } from "../sections/sectionRowEvidenceTypes";
import { interfaceRouteRelationCopy } from "../sections/interfaceRouteRelation";
import type { PanelNavigate } from "../routes/panelRoutes";
import type { WorkspaceRow } from "./mobileDomainWorkspaceModel";
import { Fragment } from "react";
import { ChevronRight } from "lucide-react";
import "./mobile-tablet-interface-relations.css";

interface MobileTabletInterfaceRelationsProps {
  rows: WorkspaceRow[];
  onNavigate: PanelNavigate;
  evidenceAt: string | null;
}

export function MobileTabletInterfaceRelations({
  rows,
  onNavigate,
  evidenceAt,
}: MobileTabletInterfaceRelationsProps) {
  const interfaceRows = rows.filter((row) => row.evidence.kind === "interface");
  if (!interfaceRows.length) return null;

  const directCount = interfaceRows.filter((row) => {
    const evidence = row.evidence as InterfaceRowEvidence;
    return evidence.defaultRouteRelation === "direct";
  }).length;
  const unverifiedCount = interfaceRows.length - directCount;

  return (
    <section
      className="mdw-domain-context mdw-tablet-interface-relations"
      data-tablet-interface-relations="true"
      aria-labelledby="mdw-tablet-interface-relations-title"
    >
      <header className="mdw-list-heading">
        <span>
          <b id="mdw-tablet-interface-relations-title" role="heading" aria-level={2}>接口路径证据</b>
        </span>
        <span aria-hidden="true" />
        <small>关系摘要</small>
      </header>
      <div className="mdw-metrics mdw-tablet-interface-comparison" data-tablet-interface-comparison="true">
        <div>
          <small>关联覆盖</small>
          <b>{directCount} / {interfaceRows.length}</b>
          <em>明确接口—路由关系</em>
        </div>
        <div className={unverifiedCount ? "is-warn" : ""}>
          <small>待核对</small>
          <b>{unverifiedCount} 个</b>
          <em>不推断默认出口</em>
        </div>
        <div>
          <small>证据来源</small>
          <b>接口 + 路由表</b>
          <em>{interfaceRows.length} 个对象</em>
        </div>
      </div>
      {unverifiedCount > 0 ? (
        <section
          className="mdw-tablet-next-step"
          data-tablet-workspace-next-step="true"
          aria-labelledby="mdw-tablet-next-step-title"
        >
          <header className="mdw-list-heading">
            <span>
              <b id="mdw-tablet-next-step-title" role="heading" aria-level={2}>下一步检查</b>
            </span>
            <small>仅针对未关联对象</small>
          </header>
          <div
            className="mdw-metrics mdw-tablet-next-step-body"
            style={{ gridTemplateColumns: "minmax(0, 1fr) auto" }}
          >
            <div className="mdw-tablet-next-step-copy">
              <small>当前优先级</small>
              <b>核对未关联接口</b>
              <em>打开路由表确认默认出口</em>
            </div>
            <button
              type="button"
              className="mdw-reset-controls"
              onClick={() => onNavigate("routes", { returnRoute: "interfaces", evidenceAt })}
            >
              查看路由表
              <ChevronRight aria-hidden="true" size={17} />
            </button>
          </div>
        </section>
      ) : null}
      <div className="mdw-tablet-interface-route-ledger" data-tablet-interface-route-evidence="true">
        <header className="mdw-list-heading">
          <b>路径关系</b>
          <small>接口对象 ↔ 默认路由</small>
        </header>
        <div className="mdw-metrics" style={{ gridTemplateColumns: "1fr 1.4fr 1fr" }}>
          {interfaceRows.slice(0, 8).map((row) => {
          const evidence = row.evidence as InterfaceRowEvidence;
          const route = evidence.defaultRoutes[0] || null;
          const relation = interfaceRouteRelationCopy(evidence);
          const status = evidence.defaultRouteRelation === "direct" ? "已关联" : "待核对";
          return (
            <Fragment key={row.id}>
              <div data-tablet-interface-relation-row={row.id} key={`${row.id}-identity`}>
                <small>接口</small>
                <b>{row.primary}</b>
                <em>{evidence.role || "角色未记录"} · {evidence.running === true ? "运行" : evidence.running === false ? "未运行" : "运行状态未取得"}</em>
              </div>
              <div key={`${row.id}-route`}>
                <small>路径</small>
                <b>{route ? `${route.destination} → ${route.gateway}` : "未取得直接关联"}</b>
                <em>{route ? `${route.table} · distance ${route.distance === null ? "未记录" : route.distance}` : relation.detail}</em>
              </div>
              <div className={evidence.defaultRouteRelation === "direct" ? "is-direct" : "is-unverified"} key={`${row.id}-relation`}>
                <small>关系</small>
                <b>{status}</b>
                <em>{evidence.defaultRouteRelation === "direct" ? "来自明确对象匹配" : "不推断默认出口"}</em>
              </div>
            </Fragment>
          );
          })}
        </div>
      </div>
      <div className="mdw-status-row"><p>只接受接口对象与默认路由表的明确关联；未取得关系时保持待核对。</p></div>
    </section>
  );
}
