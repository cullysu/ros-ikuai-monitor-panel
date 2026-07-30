import { ChevronDown } from "lucide-react";
import type { SyntheticEvent } from "react";
import type {
  OverviewResourceInstrument,
} from "../overview/evidence-model/overviewEvidenceTypes";
import { SectionTimeSeriesChart } from "../sections/SectionTimeSeriesChart";
import { resourceTimeSeries } from "../sections/resourceTimeSeries";

function revealExpandedHistory(event: SyntheticEvent<HTMLDetailsElement>) {
  const details = event.currentTarget;
  if (!details.open || !event.nativeEvent.isTrusted) return;
  requestAnimationFrame(() => {
    if (details.open) details.scrollIntoView({ block: "center", behavior: "auto" });
  });
}

function ResourceHistoryBody({ resource }: { resource: OverviewResourceInstrument }) {
  const ready = resource.status === "ready" && resource.metrics.some((metric) => metric.points.length >= 2);
  const complete = resource.metrics.every((metric) => metric.value !== null);
  if (!ready) {
    return <p className="mp-resource-pending">{complete ? "只有当前完整资源采样；至少两个带时区样本后才绘制趋势。" : "当前仅取得部分资源采样；缺失项不按零处理，完整时间序列到达前不绘图。"}</p>;
  }

  return <SectionTimeSeriesChart visualization={resourceTimeSeries(resource)!} embedded />;
}

export function MobileResourceHistory({ resource, expanded }: { resource: OverviewResourceInstrument; expanded: boolean }) {
  const windowText = resource.status === "ready" ? `${resource.windowLabel} · ${resource.sampleCount} 点` : "当前采样不足";
  const heading = <><span className="mp-section-kicker">历史证据</span><h2 id="mp-resource-history-title">趋势与样本</h2></>;
  if (expanded) return <section
    className="mp-resource-history"
    data-mobile-resource-history
    data-resource-layer="history"
    data-resource-layer-question="sustained-pressure"
    data-resource-evidence-role="time-series"
    aria-labelledby="mp-resource-history-title"
  >
    <header><div>{heading}</div><span className="mp-window">{windowText}</span></header>
    <ResourceHistoryBody resource={resource} />
  </section>;
  return <details
    className="mp-resource-history"
    data-mobile-resource-history
    data-resource-layer="history"
    data-resource-layer-question="sustained-pressure"
    data-resource-evidence-role="time-series"
    onToggle={revealExpandedHistory}
  >
    <summary><span>{heading}</span><span className="mp-window">{windowText}<ChevronDown aria-hidden="true" size={17} /></span></summary>
    <ResourceHistoryBody resource={resource} />
  </details>;
}
