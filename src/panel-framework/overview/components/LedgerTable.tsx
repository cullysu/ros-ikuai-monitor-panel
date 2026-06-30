import { MetricMarkers, type MetricMarker } from "./MetricMarkers";

interface LedgerRow {
  label: string;
  value: string;
  note?: string;
  tone?: "ok" | "warn" | "danger" | "muted";
  markers?: MetricMarker[];
}

interface LedgerTableProps {
  rows: LedgerRow[];
  compact?: boolean;
}

export function LedgerTable({ rows, compact }: LedgerTableProps) {
  return (
    <div className={["ledger-table", compact ? "ledger-table--compact" : ""].filter(Boolean).join(" ")}>
      {rows.map((row) => (
        <div className="ledger-table__row" key={`${row.label}-${row.value}`}>
          <div className="ledger-table__label">{row.label}</div>
          <div className={`ledger-table__value ledger-table__value--${row.tone ?? "muted"}`}>{row.value}</div>
          <div className="ledger-table__note">
            {row.note ? <span>{row.note}</span> : null}
            {row.markers?.length ? <MetricMarkers compact={compact} markers={row.markers} /> : null}
          </div>
        </div>
      ))}
    </div>
  );
}
