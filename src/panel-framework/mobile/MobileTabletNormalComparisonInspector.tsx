import type {
  OverviewComparisonObject,
  OverviewInvestigationAction,
} from "../overview/evidence-model/overviewEvidenceTypes";
import { ChevronRight } from "lucide-react";

function relationEvidence(value: string): string {
  return value.split(" · 下 ")[0] || value;
}

export function MobileTabletNormalComparisonInspector({
  object,
  action,
  evidenceAt,
  onOpen,
}: {
  object: OverviewComparisonObject;
  action: OverviewInvestigationAction;
  evidenceAt: string | null;
  onOpen: (action: OverviewInvestigationAction) => void;
}) {
  return (
    <section
      className="mp-tablet-normal-comparison-inspector"
      data-tablet-normal-comparison-inspector
      data-tablet-normal-comparison-object={object.id}
      data-tablet-object-workspace-inspector="true"
      aria-labelledby="mp-tablet-normal-comparison-inspector-title"
    >
      <header>
        <span className="mp-section-kicker">当前比较对象</span>
        <b id="mp-tablet-normal-comparison-inspector-title">{object.object}</b>
        <small>{object.category} · {object.state}</small>
      </header>
      <dl>
        <div><dt>关系证据</dt><dd>{relationEvidence(object.evidence)}</dd></div>
        <div><dt>采样来源</dt><dd><code>{object.source}</code></dd></div>
      </dl>
      <button
        type="button"
        data-tablet-normal-object-action="shared"
        data-tablet-normal-object-action-route={action.route}
        data-tablet-normal-object-action-object-id={action.navigation?.objectId || ""}
        data-tablet-normal-object-action-evidence-at={evidenceAt || ""}
        data-tablet-normal-object-action-return-route={action.navigation?.returnRoute || ""}
        aria-label={`${action.label}：${action.note}`}
        onClick={() => onOpen(action)}
      >
        <span className="mp-tablet-normal-object-action-copy">
          <b>{action.label}</b>
          <small>{action.note}</small>
        </span>
        <ChevronRight aria-hidden="true" size={16} />
      </button>
    </section>
  );
}
