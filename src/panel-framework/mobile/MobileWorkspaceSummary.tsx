import { PANEL_RISK_CONTEXT, type PanelRiskContext } from "../routes/panelRoutes";
import type { SectionModel } from "../sections/sectionModels";
import { formatRfc3339Local } from "../timeContract";
import { toneIcon } from "./mobileDomainWorkspaceModel";

export function EvidenceBadge({ model, compact = false }: { model: SectionModel; compact?: boolean }) {
  const Icon = toneIcon(model.statusTone);
  const label = model.evidenceMode === "current"
    ? "当前证据"
    : model.evidenceMode === "historical"
      ? "历史证据"
      : "证据不可用";
  const compactBoundary = model.evidenceMode === "historical"
    ? "不代表当前"
    : model.evidenceMode === "unavailable"
      ? "当前值不可用"
      : "";
  return (
    <span className={`mdw-evidence is-${model.statusTone}${compact ? " is-compact" : ""}`}>
      <Icon aria-hidden="true" size={15} />
      <span>
        <b>{label}</b>
        <small>{[compactBoundary, model.updatedAt || "时间未记录"].filter(Boolean).join(" · ")}</small>
      </span>
    </span>
  );
}

export function WorkspaceStatus({
  model,
  risk,
  selected,
  evidenceAt,
  matchingRiskObjects,
  stackContext,
  compact = false,
}: {
  model: SectionModel;
  risk: PanelRiskContext | null;
  selected: boolean;
  evidenceAt: string | null;
  matchingRiskObjects: number;
  stackContext: boolean;
  compact?: boolean;
}) {
  const investigating = Boolean(risk && !selected);
  return (
    <div
      className={`mdw-status-row${compact ? " is-compact" : ""}`}
      style={investigating && stackContext ? { flexWrap: "wrap", alignItems: "flex-start", paddingBlock: 8 } : undefined}
      data-investigation-risk={investigating && risk ? risk : undefined}
    >
      <EvidenceBadge model={model} compact={compact} />
      {investigating && risk ? (
        <div className="mdw-row-copy" style={stackContext ? { flexBasis: "100%" } : undefined}>
          <p>来自运行概览 · {PANEL_RISK_CONTEXT[risk][1]}</p>
          <p>{formatRfc3339Local(evidenceAt) || "证据时间未记录"}</p>
          <p>{matchingRiskObjects || "未取得"} 个匹配对象 · 未自动选择</p>
        </div>
      ) : compact ? null : <p>{model.status}</p>}
    </div>
  );
}

export function MetricStrip({ model }: { model: SectionModel }) {
  return (
    <section className="mdw-metrics" aria-label="领域摘要">
      {model.metrics.slice(0, 3).map((metric) => (
        <div className={`is-${metric.tone || "trust"}`} key={metric.label}>
          <small>{metric.label}</small>
          <b>{metric.value}</b>
          {metric.note ? <em>{metric.note}</em> : null}
        </div>
      ))}
    </section>
  );
}
