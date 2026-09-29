import { parseRfc3339Timestamp } from "../../timeContract";
import type { OverviewRawHistory, OverviewRawSnapshot } from "../types";
import type { OverviewResourcePoint } from "./overviewEvidenceTypes";

export type ResourceMetricKey = "cpu" | "memory" | "disk";

export interface ResourceMetricPoint {
  timestamp: number;
  value: number;
}

export interface ResourceMetricEvidence {
  latest: number | null;
  threshold: number;
  delta: number | null;
  observed: number;
  trailing: number;
  durationSeconds: number | null;
  evidenceAt: string | null;
}

export function compareResourceRisk(
  left: Pick<ResourceMetricEvidence, "delta" | "trailing" | "latest">,
  right: Pick<ResourceMetricEvidence, "delta" | "trailing" | "latest">,
): number {
  return (right.delta ?? -101) - (left.delta ?? -101)
    || right.trailing - left.trailing
    || (right.latest as number) - (left.latest as number);
}

export interface ResourceMetricWindow {
  current: number | null;
  threshold: number;
  points: ResourceMetricPoint[];
  evidence: ResourceMetricEvidence;
}

export interface ResourceEvidenceWindow {
  points: OverviewResourcePoint[];
  metrics: Record<ResourceMetricKey, ResourceMetricWindow>;
}

export const CPU_THRESHOLD = 85;
export const MEMORY_THRESHOLD = 85;
export const DISK_THRESHOLD = 90;
export const RESOURCE_METRIC_DEFINITIONS = [
  { key: "cpu", label: "CPU", threshold: CPU_THRESHOLD },
  { key: "memory", label: "内存", threshold: MEMORY_THRESHOLD },
  { key: "disk", label: "磁盘", threshold: DISK_THRESHOLD },
] as const;

function percentage(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 && number <= 100 ? number : null;
}

function appendPoint(
  points: OverviewResourcePoint[],
  observedAt: unknown,
  cpu: unknown,
  memory: unknown,
  disk: unknown,
): boolean {
  const timestamp = parseRfc3339Timestamp(observedAt);
  if (timestamp === null || (points.length > 0 && timestamp <= points[points.length - 1].timestamp)) return false;
  points.push({ timestamp, cpu: percentage(cpu), memory: percentage(memory), disk: percentage(disk) });
  return true;
}

export function resourceHistoryPoints(history: OverviewRawHistory): OverviewResourcePoint[] {
  if (!Object.prototype.hasOwnProperty.call(history, "resourceSamples") || !Array.isArray(history.resourceSamples)) return [];
  const points: OverviewResourcePoint[] = [];
  for (const sample of history.resourceSamples) {
    if (
      !sample ||
      typeof sample !== "object" ||
      sample.evidenceMode !== "current" ||
      typeof sample.source !== "string" ||
      !sample.source.trim() ||
      !appendPoint(points, sample.timestamp, sample.cpu, sample.memory, sample.disk)
    ) return [];
  }
  return points;
}

function alignedMetricPoints(
  points: OverviewResourcePoint[],
  key: ResourceMetricKey,
  current: number | null,
  currentAt: number | null,
  maxAge: number,
): ResourceMetricPoint[] {
  const latest = points[points.length - 1];
  const latestValue = latest?.[key];
  if (
    current === null ||
    currentAt === null ||
    latestValue === null ||
    latestValue === undefined ||
    Math.abs(latestValue - current) > 1 ||
    Math.abs(currentAt - latest.timestamp) > maxAge
  ) return [];

  const result: ResourceMetricPoint[] = [];
  for (let index = points.length - 1; index >= 0; index -= 1) {
    const value = points[index][key];
    if (value === null) break;
    result.push({ timestamp: points[index].timestamp, value });
  }
  return result.reverse();
}

export function resourceMetricEvidence(
  points: ResourceMetricPoint[],
  current: number | null,
  threshold: number,
  currentAt: number | null,
): ResourceMetricEvidence {
  let trailing = 0;
  for (let index = points.length - 1; index >= 0 && points[index].value >= threshold; index -= 1) trailing += 1;
  const latestPoint = points[points.length - 1];
  const firstTrailing = trailing ? points[points.length - trailing] : null;
  return {
    latest: current,
    threshold,
    delta: current === null ? null : current - threshold,
    observed: points.length,
    trailing,
    durationSeconds: trailing >= 2 && firstTrailing && latestPoint
      ? Math.max(0, Math.round((latestPoint.timestamp - firstTrailing.timestamp) / 1000))
      : null,
    evidenceAt: current !== null && currentAt !== null ? new Date(currentAt).toISOString() : null,
  };
}

export function resourceEvidenceWindow(snapshot: OverviewRawSnapshot): ResourceEvidenceWindow {
  const history = resourceHistoryPoints(snapshot.overview?.history || {});
  const currentAt = parseRfc3339Timestamp(snapshot.updatedAt);
  const maxAge = Math.min(60_000, Number(snapshot.meta?.pollSeconds || 5) * 3000);
  const metric = (key: ResourceMetricKey, current: number | null, threshold: number): ResourceMetricWindow => {
    const points = alignedMetricPoints(history, key, current, currentAt, maxAge);
    return { current, threshold, points, evidence: resourceMetricEvidence(points, current, threshold, currentAt) };
  };
  const metrics = {
    cpu: metric("cpu", percentage(snapshot.overview?.cpuLoad), CPU_THRESHOLD),
    memory: metric("memory", percentage(snapshot.overview?.memoryUsage), MEMORY_THRESHOLD),
    disk: metric("disk", percentage(snapshot.overview?.diskUsage), DISK_THRESHOLD),
  };
  const first = (key: ResourceMetricKey) => metrics[key].points[0]?.timestamp ?? Number.POSITIVE_INFINITY;
  return {
    metrics,
    points: history
      .filter((point) => point.timestamp >= Math.min(first("cpu"), first("memory"), first("disk")))
      .map((point) => ({
        timestamp: point.timestamp,
        cpu: point.timestamp >= first("cpu") ? point.cpu : null,
        memory: point.timestamp >= first("memory") ? point.memory : null,
        disk: point.timestamp >= first("disk") ? point.disk : null,
      })),
  };
}
