import { toNumber, type OverviewDerivedState, type OverviewRawSnapshot, type OverviewTone } from "./index";
import { firstNumber, isRecord, mobileRate, recordArray, totals } from "./mobileOverviewData";
import type { MobileTrendChartModel, MobileTrendChartPlotModel, MobileTrendChartPoint } from "./mobileOverviewModel";

const CHART_WIDTH = 312;
const CHART_VIEW_HEIGHT = 118;
const CHART_TOP_Y = 12;
const CHART_BASELINE_Y = 94;
const CHART_AXIS_Y = 112;
const CHART_GRID_YS: [number, number, number] = [32, 58, 84];

function trend(seed: number, variant: "down" | "up" | "hot" | "quiet" = "down"): number[] {
  const base = Math.max(1, seed);
  const pattern = {
    down: [0.34, 0.42, 0.36, 0.55, 0.50, 0.70, 0.86, 0.78],
    up: [0.18, 0.27, 0.22, 0.33, 0.40, 0.36, 0.48, 0.44],
    hot: [0.52, 0.60, 0.72, 0.84, 0.78, 0.96, 0.90, 1],
    quiet: [0.32, 0.31, 0.33, 0.32, 0.34, 0.33, 0.35, 0.34],
  }[variant];
  return pattern.map((ratio) => base * ratio);
}

function chartPointString(
  values: number[],
  maxValue: number,
  width = CHART_WIDTH,
  topY = CHART_TOP_Y,
  baselineY = CHART_BASELINE_Y,
): string {
  const max = Math.max(1, maxValue, ...values);
  const step = values.length > 1 ? width / (values.length - 1) : width;
  return values.map((value, index) => {
    const x = Number((index * step).toFixed(1));
    const y = Number((baselineY - (Math.max(0, value) / max) * (baselineY - topY)).toFixed(1));
    return `${x},${y}`;
  }).join(" ");
}

function chartLastPoint(points: string): MobileTrendChartPoint {
  const last = points.trim().split(/\s+/).pop() || "0,0";
  const [x, y] = last.split(",").map((item) => Number(item));
  return { x: Number.isFinite(x) ? x : 0, y: Number.isFinite(y) ? y : 0 };
}

function trendChartPlot(down: number[], up: number[], referenceRatio: number): MobileTrendChartPlotModel {
  const normalizedDown = down.length ? down : [1, 1, 1];
  const normalizedUp = up.length ? up : [0.45, 0.45, 0.45];
  const max = Math.max(1, ...normalizedDown, ...normalizedUp);
  const downPoints = chartPointString(normalizedDown, max);
  const upPoints = chartPointString(normalizedUp, max);
  const peakValue = Math.max(...normalizedDown);
  const peakIndex = Math.max(0, normalizedDown.findIndex((value) => value === peakValue));
  const ratio = Math.max(0, Math.min(1, referenceRatio));
  const thresholdValue = max * ratio;
  const breachIndex = normalizedDown.findIndex((value) => value >= thresholdValue);
  const startParts = downPoints.trim().split(/\s+/)[0]?.split(",").map((item) => Number(item)) || [0, CHART_BASELINE_Y];
  return {
    viewHeight: CHART_VIEW_HEIGHT,
    topY: CHART_TOP_Y,
    baselineY: CHART_BASELINE_Y,
    axisY: CHART_AXIS_Y,
    gridYs: CHART_GRID_YS,
    downPoints,
    upPoints,
    start: {
      x: Number.isFinite(startParts[0]) ? startParts[0] : 0,
      y: Number.isFinite(startParts[1]) ? startParts[1] : CHART_BASELINE_Y,
    },
    focus: chartLastPoint(downPoints),
    peak: {
      x: normalizedDown.length > 1 ? Number(((peakIndex * CHART_WIDTH) / (normalizedDown.length - 1)).toFixed(1)) : CHART_WIDTH / 2,
      y: Number((CHART_BASELINE_Y - (Math.max(0, peakValue) / max) * (CHART_BASELINE_Y - CHART_TOP_Y)).toFixed(1)),
    },
    referenceY: Number((CHART_BASELINE_Y - ratio * (CHART_BASELINE_Y - CHART_TOP_Y)).toFixed(1)),
    breachX: breachIndex >= 0 && normalizedDown.length > 1 ? Number(((breachIndex * CHART_WIDTH) / (normalizedDown.length - 1)).toFixed(1)) : null,
  };
}

function sampleTrafficRow(row: Record<string, unknown>): { down: number; up: number } {
  const down = firstNumber(row, ["downRate", "downloadRate", "rxRate", "inRate", "down", "download", "rx", "in"]);
  const up = firstNumber(row, ["upRate", "uploadRate", "txRate", "outRate", "up", "upload", "tx", "out"]);
  return { down, up };
}

function historyTraffic(snapshot: OverviewRawSnapshot): { down: number[]; up: number[]; source: "history" | "current" } {
  const raw = snapshot as unknown as Record<string, unknown>;
  const traffic = isRecord(raw.traffic) ? raw.traffic : {};
  const realtime = isRecord(raw.realtime) ? raw.realtime : {};
  const sources = [
    raw.history,
    raw.samples,
    raw.rateHistory,
    raw.trafficHistory,
    raw.wanHistory,
    traffic.history,
    traffic.samples,
    realtime.history,
    realtime.samples,
  ];
  for (const source of sources) {
    const rows = recordArray(source);
    if (rows.length >= 3) {
      const sampled = rows.map(sampleTrafficRow);
      const down = sampled.map((item) => item.down).filter((item) => Number.isFinite(item));
      const up = sampled.map((item) => item.up).filter((item) => Number.isFinite(item));
      if (down.some((item) => item > 0) || up.some((item) => item > 0)) {
        return { down: down.slice(-12), up: up.slice(-12), source: "history" };
      }
    }
    if (Array.isArray(source) && source.length >= 3 && source.every((item) => Number.isFinite(toNumber(item)))) {
      const values = source.map((item) => toNumber(item)).slice(-12);
      return { down: values, up: values.map((item, index) => item * (0.18 + (index % 3) * 0.05)), source: "history" };
    }
  }
  return { down: [], up: [], source: "current" };
}

function networkTrendSeries(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): { down: number[]; up: number[]; source: "history" | "current" } {
  const history = historyTraffic(snapshot);
  if (history.down.length >= 3 || history.up.length >= 3) return history;
  const rate = totals(snapshot);
  if (state.scenario === "no-snapshot") {
    return { down: trend(1, "quiet"), up: trend(0.45, "quiet"), source: "current" };
  }
  const hot = state.scenario === "resource-full" || state.scenario === "interfaces-down" || state.facts.wan.allOffline;
  return {
    down: trend(rate.down || Math.max(1, toNumber(state.facts.connections.total)), hot ? "hot" : "down"),
    up: trend(rate.up || Math.max(1, rate.down * 0.22), hot ? "up" : "quiet"),
    source: "current",
  };
}

export function buildMobileTrendChart(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): MobileTrendChartModel {
  const series = networkTrendSeries(snapshot, state);
  const down = series.down.length ? series.down : trend(1, "quiet");
  const up = series.up.length ? series.up : trend(0.45, "quiet");
  const peak = Math.max(...down);
  const current = down[down.length - 1] || 0;
  const referenceRatio = state.facts.wan.allOffline ? 0.08 : 0.78;
  const referenceValue = peak * referenceRatio;
  const highPointIndex = down.findIndex((value) => value >= referenceValue);
  const windowText = series.source === "history"
    ? `近 ${Math.max(down.length, up.length)} 点`
    : `近 ${Math.max(down.length, up.length)} 次`;
  const staleSample = state.scenario === "collection-down" || state.facts.collection.dataStale || state.facts.freshness.history;
  const sampleText = series.source === "history" ? `${Math.max(down.length, up.length)}点历史` : staleSample ? "缓存推算" : "当前快照";
  const sampleLabel = series.source === "history"
    ? "历史"
    : staleSample
      ? "缓存"
      : "快照";
  const anomalyLabel = highPointIndex >= 0 ? `高位点 ${highPointIndex + 1}` : "高位点 0";
  const anomalyTone: OverviewTone = "trust";
  const decisionLabel = `${windowText} · 当前 ${mobileRate(current)} · 峰值 ${mobileRate(peak)} · 参考 ${mobileRate(referenceValue)} · ${anomalyLabel} · 采样${sampleLabel}`;
  return {
    source: series.source,
    windowText,
    sampleText,
    sampleLabel,
    decisionContract: "window-current-peak-reference-sample-high-point-source",
    decisionLabel,
    anomalyLabel,
    anomalyTone,
    startLabel: series.source === "history" ? `${down.length} 点前` : "窗口起点",
    endLabel: "当前",
    referenceLabel: state.facts.wan.allOffline ? "离线参考" : "高位参考",
    referenceRatio,
    referenceValueLabel: mobileRate(referenceValue),
    breachLabel: highPointIndex >= 0 ? `第 ${highPointIndex + 1} 点` : "未到参考线",
    currentLabel: mobileRate(current),
    peakLabel: mobileRate(peak),
    down,
    up,
    readouts: [
      { label: "当前", value: mobileRate(current), note: "下载", tone: "trust" },
      { label: "峰值", value: mobileRate(peak), note: windowText, tone: "trust" },
      { label: "窗口", value: series.source === "history" ? "12 点" : "当前", note: sampleText, tone: state.facts.collection.credibilityTone },
      { label: "参考", value: mobileRate(referenceValue), note: "峰值参考", tone: "trust" },
      { label: "采样", value: sampleLabel, note: state.facts.collection.credibilityLabel, tone: state.facts.collection.credibilityTone },
      { label: "高位", value: highPointIndex >= 0 ? `${highPointIndex + 1}` : "0", note: anomalyLabel, tone: anomalyTone },
    ],
    plot: trendChartPlot(down, up, referenceRatio),
  };
}
