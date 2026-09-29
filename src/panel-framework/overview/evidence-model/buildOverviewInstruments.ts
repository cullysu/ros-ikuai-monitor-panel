import {
  formatRate,
  rateUnit,
  type OverviewRawSnapshot,
  type OverviewRawWanRow,
} from "../index";
import { parseRfc3339Timestamp } from "../../timeContract";
import {
  compareResourceRisk,
  RESOURCE_METRIC_DEFINITIONS,
  resourceEvidenceWindow,
} from "./resourceHistorySamples";
import type {
  OverviewEvidenceMode,
  OverviewEvidenceRisk,
  OverviewResourceInstrument,
  OverviewTrafficInstrument,
  OverviewTrafficPoint,
} from "./overviewEvidenceTypes";

function finite(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function wanRows(snapshot: OverviewRawSnapshot): OverviewRawWanRow[] {
  if (Array.isArray(snapshot.wan) && snapshot.wan.length) return snapshot.wan;
  return Array.isArray(snapshot.pppoe) ? snapshot.pppoe : [];
}

function timestampOf(value: unknown): number | null {
  const numeric = finite(value);
  if (numeric !== null) return numeric < 1e12 ? numeric * 1000 : numeric;
  return parseRfc3339Timestamp(value);
}

function atomicTrafficSampleTimestamp(value: unknown): number | null {
  // Epoch values and timezone-less text are not interchangeable evidence for
  // a public traffic observation. The atomic payload contract requires RFC3339
  // with an explicit timezone.
  return typeof value === "string" ? parseRfc3339Timestamp(value) : null;
}

function currentRates(snapshot: OverviewRawSnapshot): { down: number; up: number } | null {
  const rows = wanRows(snapshot).filter((row) => row.running !== false && row.disabled !== true);
  if (!rows.length) return null;
  let down = 0;
  let up = 0;
  for (const row of rows) {
    const rowDown = finite(row.downRate);
    const rowUp = finite(row.upRate);
    if (rowDown === null || rowUp === null) return null;
    down += rowDown;
    up += rowUp;
  }
  return { down, up };
}

function closeObservation(left: number, right: number): boolean {
  return Math.abs(left - right) <= Math.max(1, Math.abs(right) * 0.01);
}

function trafficPoints(history: Record<string, unknown>): OverviewTrafficPoint[] {
  const samples = Array.isArray(history.trafficSamples) ? history.trafficSamples : [];
  const points: OverviewTrafficPoint[] = [];
  for (const sample of samples) {
    if (!sample || typeof sample !== "object") continue;
    const record = sample as Record<string, unknown>;
    // Legacy parallel arrays lack per-sample provenance. An old snapshot may show
    // its current readout, but never a timestamped trend reconstructed from them.
    if (record.evidenceMode !== "current") {
      // A collector reset or degraded observation is a hard chart boundary: do
      // not connect later current samples to an earlier counter generation.
      points.length = 0;
      continue;
    }
    if (typeof record.source !== "string" || !record.source.trim()) continue;
    const timestamp = atomicTrafficSampleTimestamp(record.timestamp);
    const down = finite(record.downlink);
    const up = finite(record.uplink);
    if (timestamp === null || down === null || up === null) continue;
    if (points.length && timestamp <= points[points.length - 1].timestamp) continue;
    points.push({ timestamp, down, up });
  }
  return points;
}

export function buildTrafficInstrument(
  snapshot: OverviewRawSnapshot,
  mode: OverviewEvidenceMode,
  risk: OverviewEvidenceRisk,
): OverviewTrafficInstrument | null {
  if (mode !== "current" || (risk !== "none" && risk !== "interfaces" && risk !== "interface-review")) return null;
  const interfaceContext = risk === "interfaces" || risk === "interface-review";
  const title = risk === "interfaces"
    ? "接口依赖异常期间的 WAN 吞吐"
    : risk === "interface-review"
      ? "接口待确认期间的 WAN 吞吐"
      : "WAN 双向吞吐";
  const rates = currentRates(snapshot);
  if (!rates) return null;
  const history = snapshot.overview?.history || {};
  // Old snapshots retain no atomic proof that a pair of rates belongs to a
  // particular instant. Keep their fields readable elsewhere, but withhold the
  // traffic instrument rather than labelling those values as a current trend.
  if (!Array.isArray(history.trafficSamples)) return null;
  const points = trafficPoints(history);
  if (!points.length) return null;
  const last = points[points.length - 1];
  if (!closeObservation(last.down, rates.down) || !closeObservation(last.up, rates.up)) return null;
  const snapshotAt = timestampOf(snapshot.updatedAt);
  const maxAge = Math.max(120_000, Number(snapshot.meta?.pollSeconds || 5) * 3000);
  if (snapshotAt !== null && Math.abs(snapshotAt - last.timestamp) > maxAge) return null;
  const durationSeconds = Math.max(0, Math.round((last.timestamp - points[0].timestamp) / 1000));
  const windowLabel = durationSeconds >= 60 ? `最近 ${Math.max(1, Math.round(durationSeconds / 60))} 分钟` : `最近 ${Math.max(1, durationSeconds)} 秒`;
  const peak = Math.max(...points.flatMap((point) => [point.down, point.up]), rates.down, rates.up);
  const unit = rateUnit(peak);
  if (!unit) return null;
  const currentDown = formatRate(rates.down);
  const currentUp = formatRate(rates.up);
  const peakLabel = formatRate(peak);
  return {
    status: points.length >= 2 ? "ready" : "accumulating",
    title,
    windowLabel,
    sampleCount: points.length,
    points,
    unit,
    currentDown,
    currentUp,
    peak: peakLabel,
    accessibleSummary: `${windowLabel}，${points.length} 个当前样本，最新下载 ${currentDown}，最新上传 ${currentUp}，窗口峰值 ${peakLabel}${interfaceContext ? "；该趋势不证明未运行接口已经影响或没有影响业务" : ""}。`,
  };
}

export function buildResourceInstrument(
  snapshot: OverviewRawSnapshot,
  risk: OverviewEvidenceRisk,
): OverviewResourceInstrument | null {
  if (risk !== "resource") return null;
  const window = resourceEvidenceWindow(snapshot);
  const metrics: OverviewResourceInstrument["metrics"] = RESOURCE_METRIC_DEFINITIONS.map(({ key, label }) => {
    const metric = window.metrics[key];
    return { key, label, value: metric.current, threshold: metric.threshold, points: metric.points };
  });
  metrics.sort((left, right) => compareResourceRisk(
    window.metrics[left.key].evidence,
    window.metrics[right.key].evidence,
  ));
  const points = window.points;
  const sampleCount = Math.max(0, ...metrics.map((metric) => metric.points.length));
  const ready = metrics.some((metric) => metric.points.length >= 2);
  const durationSeconds = points.length >= 2
    ? Math.max(0, Math.round((points[points.length - 1].timestamp - points[0].timestamp) / 1000))
    : 0;
  const windowLabel = ready && points.length >= 2
    ? durationSeconds >= 60
      ? `最近 ${Math.max(1, Math.round(durationSeconds / 60))} 分钟`
      : `最近 ${Math.max(1, durationSeconds)} 秒`
    : "当前采样";
  return {
    status: ready ? "ready" : "accumulating",
    windowLabel,
    sampleCount,
    metrics,
    points,
    accessibleSummary: metrics
      .map((metric) => metric.value === null
        ? `${metric.label} 未记录，策略阈值 ${metric.threshold}%`
        : `${metric.label} ${Math.round(metric.value)}%，策略阈值 ${metric.threshold}%`)
      .join("；"),
  };
}
