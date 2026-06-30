import { MetricMarkers, type MetricMarker } from "./MetricMarkers";

interface ValueBarRow {
  label: string;
  value: string;
  percent: number;
  tone?: "ok" | "warn" | "danger" | "muted";
  note?: string;
  markers?: MetricMarker[];
}

interface ValueBarsProps {
  rows: ValueBarRow[];
  compact?: boolean;
}

export function ValueBars({ rows, compact }: ValueBarsProps) {
  return (
    <div className={["value-bars", compact ? "value-bars--compact" : ""].filter(Boolean).join(" ")}>
      {rows.map((row) => (
        <div className="value-bars__row" key={row.label}>
          <div className="value-bars__meta">
            <span className="value-bars__label">{row.label}</span>
            <span className={`value-bars__value value-bars__value--${row.tone ?? "muted"}`}>{row.value}</span>
          </div>
          <div className="value-bars__track" aria-hidden="true">
            <span
              className={`value-bars__fill value-bars__fill--${row.tone ?? "muted"}`}
              style={{ width: `${Math.max(0, Math.min(100, row.percent))}%` }}
            />
          </div>
          {row.markers?.length ? <MetricMarkers compact={compact} markers={row.markers} /> : null}
          {row.note ? <div className="value-bars__note">{row.note}</div> : null}
        </div>
      ))}
    </div>
  );
}
