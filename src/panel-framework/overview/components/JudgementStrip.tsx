import type { MobileOverviewResolvedProps } from "./MobileOverviewTypes";
import { toneClass } from "./MobileOverviewUtils";

export function JudgementStrip({ model }: MobileOverviewResolvedProps) {
  const [status] = model.coreMetrics;
  return (
    <section
      className={`ik-v960-judgement-strip ${toneClass(status.tone)}`}
      aria-label="移动端核心判断"
      data-overview-mobile-core-block="compact-conclusion"
      data-overview-mobile-v1044-judgement-strip="compact-conclusion-only"
      data-overview-mobile-v960-judgement="conclusion-and-impact"
      data-overview-mobile-normal-summary="compact-status-and-impact"
      data-overview-mobile-v1090-decision-strip="conclusion-only-metrics-separated"
      data-overview-mobile-priority={model.priority}
    >
      <strong className="ik-v1080-conclusion">
        <i aria-hidden="true" />
        <span>网络结论</span>
        <b
          data-overview-mobile-v1010-no-ellipsis-label="true"
          style={{ maxWidth: "none", overflow: "visible", textOverflow: "clip", whiteSpace: "nowrap" }}
        >
          {status.value}
        </b>
        <em>{status.note}</em>
        <small>{model.impactScope.label} · {model.impactScope.value}</small>
      </strong>
    </section>
  );
}
