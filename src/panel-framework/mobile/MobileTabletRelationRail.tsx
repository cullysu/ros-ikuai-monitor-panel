import type {
  OverviewEvidenceFact,
  OverviewFocusObject,
  OverviewTrafficInstrument,
} from "../overview/evidence-model/overviewEvidenceTypes";
import { MobileProofStrip } from "./MobileProofStrip";

function attributeValue(object: OverviewFocusObject, label: string): string {
  return object.attributes.find((attribute) => attribute.label === label)?.value || "未取得";
}

export function MobileTabletRelationRail({
  object,
  traffic,
  evidenceAt,
  evidenceTime,
}: {
  object: OverviewFocusObject;
  traffic: OverviewTrafficInstrument;
  evidenceAt: string;
  evidenceTime: string;
}) {
  const gateway = attributeValue(object, "网关");
  const distance = attributeValue(object, "distance");
  const candidates = attributeValue(object, "活动候选");
  const sampleWindow = traffic.status === "ready"
    ? `${traffic.windowLabel} · ${traffic.sampleCount} 点`
    : `当前样本 ${traffic.sampleCount} 点`;
  const facts: [OverviewEvidenceFact, OverviewEvidenceFact, OverviewEvidenceFact] = [
    { key: "relation-route", label: "默认路由 → WAN", value: object.name, note: object.note, tone: "trust" },
    { key: "relation-gateway", label: "网关 / distance", value: `${gateway} · ${distance}`, note: `活动候选 ${candidates}`, tone: "trust" },
    { key: "relation-traffic", label: "吞吐样本窗口", value: sampleWindow, note: "趋势来源与当前快照同窗", tone: "trust" },
  ];

  return (
    <section
      className="mp-load mp-tablet-relation"
      data-overview-task-landmark="relation-evidence"
      aria-labelledby="mp-tablet-relation-title"
    >
      <header>
        <div>
          <span className="mp-section-kicker">关系证据</span>
          <h2 id="mp-tablet-relation-title">路径核对</h2>
        </div>
        <time className="mp-window" dateTime={evidenceAt}>{evidenceTime}</time>
      </header>
      <MobileProofStrip facts={facts} factAttribute="relation" />
    </section>
  );
}
