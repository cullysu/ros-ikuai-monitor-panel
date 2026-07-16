import {
  formatRate,
  type OverviewDerivedState,
  type OverviewRawSnapshot,
  type OverviewRawWanRow,
} from "../index";
import { parseRfc3339Timestamp } from "../../timeContract";
import type {
  OverviewEvidenceMode,
  OverviewEvidenceRisk,
  OverviewResourceInstrument,
  OverviewResourcePoint,
  OverviewTrafficInstrument,
  OverviewTrafficPoint,
} from "./overviewEvidenceTypes";

export const CPU_THRESHOLD = 85;
export const MEMORY_THRESHOLD = 85;
export const DISK_THRESHOLD = 90;

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

function currentTrafficInstrument(
  rates: { down: number; up: number },
  title: string,
  points: OverviewTrafficPoint[] = [],
): OverviewTrafficInstrument {
  const currentDown = formatRate(rates.down);
  const currentUp = formatRate(rates.up);
  const peak = Math.max(rates.down, rates.up);
  const boundary = title === "接口异常期间的 WAN 吞吐" ? "；该读数不证明 Down 接口无影响" : "";
  return {
    status: "accumulating",
    title,
    windowLabel: "当前采样",
    sampleCount: points.length,
    points,
    currentDown,
    currentUp,
    peak: formatRate(peak),
    accessibleSummary: `当前完整 WAN 观测，下载 ${currentDown}，上传 ${currentUp}；尚无足够同窗样本形成趋势${boundary}。`,
  };
}

export function buildTrafficInstrument(
  snapshot: OverviewRawSnapshot,
  mode: OverviewEvidenceMode,
  risk: OverviewEvidenceRisk,
): OverviewTrafficInstrument | null {
  if (mode !== "current" || (risk !== "none" && risk !== "interfaces")) return null;
  const title = risk === "interfaces" ? "接口异常期间的 WAN 吞吐" : "WAN 双向吞吐";
  const rates = currentRates(snapshot);
  if (!rates) return null;
  const history = snapshot.overview?.history || {};
  const timestamps = Array.isArray(history.timestamps) ? history.timestamps : [];
  const down = Array.isArray(history.downlink) ? history.downlink : [];
  const up = Array.isArray(history.uplink) ? history.uplink : [];
  const length = Math.min(timestamps.length, down.length, up.length);
  const points: OverviewTrafficPoint[] = [];
  for (let offset = length; offset > 0; offset -= 1) {
    const timestamp = timestampOf(timestamps[timestamps.length - offset]);
    const pointDown = finite(down[down.length - offset]);
    const pointUp = finite(up[up.length - offset]);
    if (timestamp !== null && pointDown !== null && pointUp !== null) points.push({ timestamp, down: pointDown, up: pointUp });
  }
  if (!points.length) return currentTrafficInstrument(rates, title);
  const last = points[points.length - 1];
  if (!closeObservation(last.down, rates.down) || !closeObservation(last.up, rates.up)) return currentTrafficInstrument(rates, title);
  const snapshotAt = timestampOf(snapshot.updatedAt);
  const maxAge = Math.max(120_000, Number(snapshot.meta?.pollSeconds || 5) * 3000);
  if (snapshotAt !== null && Math.abs(snapshotAt - last.timestamp) > maxAge) return currentTrafficInstrument(rates, title);
  const durationSeconds = Math.max(0, Math.round((last.timestamp - points[0].timestamp) / 1000));
  const windowLabel = durationSeconds >= 60 ? `最近 ${Math.max(1, Math.round(durationSeconds / 60))} 分钟` : `最近 ${Math.max(1, durationSeconds)} 秒`;
  const peak = Math.max(...points.flatMap((point) => [point.down, point.up]), rates.down, rates.up);
  const currentDown = formatRate(rates.down);
  const currentUp = formatRate(rates.up);
  return {
    status: points.length >= 2 ? "ready" : "accumulating",
    title,
    windowLabel,
    sampleCount: points.length,
    points,
    currentDown,
    currentUp,
    peak: formatRate(peak),
    accessibleSummary: `${windowLabel}，${points.length} 个当前样本，最新下载 ${currentDown}，最新上传 ${currentUp}，窗口峰值 ${formatRate(peak)}${risk === "interfaces" ? "；该趋势不证明 Down 接口无影响" : ""}。`,
  };
}

function validPercentage(value: unknown): number | null {
  const number = finite(value);
  return number !== null && number >= 0 && number <= 100 ? number : null;
}

export function buildResourceInstrument(
  snapshot: OverviewRawSnapshot,
  state: OverviewDerivedState,
  risk: OverviewEvidenceRisk,
): OverviewResourceInstrument | null {
  if (risk !== "resource") return null;
  const metrics: OverviewResourceInstrument["metrics"] = [
    { key: "cpu", label: "CPU", value: state.facts.resource.cpu, threshold: CPU_THRESHOLD },
    { key: "memory", label: "内存", value: state.facts.resource.memory, threshold: MEMORY_THRESHOLD },
    { key: "disk", label: "磁盘", value: state.facts.resource.disk, threshold: DISK_THRESHOLD },
  ];
  const history = snapshot.overview?.history || {};
  const timestamps = Array.isArray(history.timestamps) ? history.timestamps : [];
  const cpu = Array.isArray(history.cpu) ? history.cpu : [];
  const memory = Array.isArray(history.memory) ? history.memory : [];
  const disk = Array.isArray(history.disk) ? history.disk : [];
  const length = Math.min(timestamps.length, cpu.length, memory.length, disk.length);
  let points: OverviewResourcePoint[] = [];
  for (let offset = length; offset > 0; offset -= 1) {
    const timestamp = timestampOf(timestamps[timestamps.length - offset]);
    const cpuValue = validPercentage(cpu[cpu.length - offset]);
    const memoryValue = validPercentage(memory[memory.length - offset]);
    const diskValue = validPercentage(disk[disk.length - offset]);
    if (
      timestamp === null ||
      cpuValue === null ||
      memoryValue === null ||
      diskValue === null ||
      (points.length > 0 && timestamp <= points[points.length - 1].timestamp)
    ) continue;
    points.push({ timestamp, cpu: cpuValue, memory: memoryValue, disk: diskValue });
  }
  if (points.length) {
    const latest = points[points.length - 1];
    const snapshotAt = timestampOf(snapshot.updatedAt);
    const maxAge = Math.max(120_000, Number(snapshot.meta?.pollSeconds || 5) * 3000);
    const matchesCurrent =
      Math.abs(latest.cpu - metrics[0].value) <= 1 &&
      Math.abs(latest.memory - metrics[1].value) <= 1 &&
      Math.abs(latest.disk - metrics[2].value) <= 1;
    const isCurrent = snapshotAt === null || Math.abs(snapshotAt - latest.timestamp) <= maxAge;
    if (!matchesCurrent || !isCurrent) points = [];
  }
  const durationSeconds = points.length >= 2
    ? Math.max(0, Math.round((points[points.length - 1].timestamp - points[0].timestamp) / 1000))
    : 0;
  const windowLabel = points.length >= 2
    ? durationSeconds >= 60
      ? `最近 ${Math.max(1, Math.round(durationSeconds / 60))} 分钟`
      : `最近 ${Math.max(1, durationSeconds)} 秒`
    : "当前采样";
  return {
    status: points.length >= 2 ? "ready" : "accumulating",
    windowLabel,
    sampleCount: points.length,
    metrics,
    points,
    accessibleSummary: metrics
      .map((metric) => `${metric.label} ${Math.round(metric.value)}%，策略阈值 ${metric.threshold}%`)
      .join("；"),
  };
}
