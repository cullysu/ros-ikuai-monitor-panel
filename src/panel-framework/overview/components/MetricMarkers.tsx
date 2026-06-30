import type { ReactNode } from "react";

export type MetricMarkerKind =
  | "current"
  | "peak"
  | "mean"
  | "window"
  | "threshold"
  | "trust"
  | "unavailable";

export type MetricMarkerTone = "ok" | "warn" | "danger" | "muted" | "trust" | "unavailable";

export interface MetricMarker {
  kind: MetricMarkerKind;
  value?: ReactNode;
  label?: string;
  tone?: MetricMarkerTone;
}

interface MetricMarkersProps {
  markers: MetricMarker[];
  compact?: boolean;
  className?: string;
}

const DEFAULT_LABELS: Record<MetricMarkerKind, string> = {
  current: "current",
  peak: "peak",
  mean: "mean",
  window: "window",
  threshold: "threshold",
  trust: "trust",
  unavailable: "unavailable",
};

export function MetricMarkers({ markers, compact, className }: MetricMarkersProps) {
  if (!markers.length) return null;

  return (
    <div className={["metric-markers", compact ? "metric-markers--compact" : "", className].filter(Boolean).join(" ")}>
      {markers.map((marker) => (
        <span
          className={`metric-markers__item metric-markers__item--${marker.tone ?? marker.kind}`}
          data-marker-kind={marker.kind}
          data-marker-tone={marker.tone ?? marker.kind}
          key={`${marker.kind}-${String(marker.label ?? marker.value ?? "")}`}
        >
          <em className="metric-markers__label">{marker.label ?? DEFAULT_LABELS[marker.kind]}</em>
          {marker.value !== undefined ? <b className="metric-markers__value">{marker.value}</b> : null}
        </span>
      ))}
    </div>
  );
}
