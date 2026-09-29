import type { OverviewResourceInstrument } from "../overview/evidence-model/overviewEvidenceTypes";
import type { SectionTimeSeriesVisualization } from "./sectionModels";
import { resourcePercentDomain } from "./timeSeriesGeometry";

type ResourceTimeSeriesInput = Pick<OverviewResourceInstrument, "metrics"> & Partial<Pick<OverviewResourceInstrument, "windowLabel" | "accessibleSummary">>;

export function resourceTimeSeries(resource: ResourceTimeSeriesInput): SectionTimeSeriesVisualization | undefined {
  const series = resource.metrics.filter((metric) => metric.points.length >= 2);
  if (!series.length) return undefined;
  const domain = resourcePercentDomain(resource.metrics.flatMap((metric) => [metric.threshold, ...metric.points.map((point) => point.value)]));
  return {
    kind: "time-series",
    title: "资源压力时间序列",
    windowLabel: resource.windowLabel || "采样",
    ...domain,
    series: resource.metrics.filter((metric) => metric.points.length >= 2).map((metric) => ({
      key: metric.key,
      label: metric.label,
      unit: "%",
      threshold: metric.threshold,
      points: metric.points,
    })),
    accessibleSummary: resource.accessibleSummary || "",
  };
}
