import { Search } from "lucide-react";
import type { PanelRouteId } from "../routes/panelRoutes";
import { missingEvidenceLabels } from "../sections/route-recovery/routeRecoveryState";
import type { SectionModel } from "../sections/sectionModels";
import { formatRfc3339Local } from "../timeContract";

interface MobileDomainEvidenceWorkspaceProps {
  route: PanelRouteId;
  model: SectionModel;
  objectLabel: string;
}

/**
 * Gives an empty collection a bounded evidence workspace instead of treating
 * the remaining viewport as an empty-state illustration. Recovery actions stay
 * owned by RouteEvidenceBoundary immediately before this component.
 */
export function MobileDomainEvidenceWorkspace({
  route,
  model,
  objectLabel,
}: MobileDomainEvidenceWorkspaceProps) {
  const missing = missingEvidenceLabels(model);
  const lastSuccessfulSnapshot = model.observedAt || null;
  const emptySummary = model.tables[0]?.empty || `当前快照没有${objectLabel}`;
  const evidenceLabel = model.evidenceMode === "historical"
    ? "历史参考"
    : model.evidenceMode === "unavailable"
      ? "当前不可用"
      : "部分证据";

  return (
    <aside
      className="mdw-inspector mdw-evidence-workspace"
      data-mobile-domain-evidence-workspace={route}
      data-mobile-evidence-workspace-mode={model.evidenceMode}
      data-mobile-evidence-workspace-actions="recovery-boundary"
      aria-labelledby="mdw-evidence-workspace-title"
    >
      <header>
        <span><Search aria-hidden="true" size={17} />{evidenceLabel}</span>
        <b id="mdw-evidence-workspace-title">证据与调查</b>
      </header>
      <div className="mdi-facts" role="list" aria-label="当前证据范围">
        <div role="listitem" data-mobile-evidence-workspace-fact="missing">
          <small>缺失范围</small>
          <b>{missing.length ? missing.join("、") : "当前集合未返回对象"}</b>
        </div>
        <div role="listitem" data-mobile-evidence-workspace-fact="impact">
          <small>影响边界</small>
          <b>{model.status}</b>
        </div>
        <div role="listitem" data-mobile-evidence-workspace-fact="last-success">
          <small>最近成功业务快照</small>
          <b>{lastSuccessfulSnapshot ? formatRfc3339Local(lastSuccessfulSnapshot) || "时间格式不可用" : "未记录"}</b>
        </div>
        <div role="listitem" data-mobile-evidence-workspace-fact="collection">
          <small>当前集合</small>
          <b>{emptySummary}</b>
        </div>
      </div>
      <p className="mdi-message" data-mobile-evidence-workspace-investigation>
        <b>调查入口</b><br />
        <span>使用紧邻的恢复入口继续核对；来源和证据时间会随跳转保留。</span>
      </p>
    </aside>
  );
}
