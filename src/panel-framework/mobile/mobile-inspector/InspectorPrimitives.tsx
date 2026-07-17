import { ChevronDown, CircleAlert, Clock3, ShieldCheck, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";
import { formatRate } from "../../overview";
import type { SectionModel } from "../../sections/sectionModels";
import { formatRfc3339Local } from "../../timeContract";

export interface InspectorFact {
  label: string;
  value: string;
  note?: string;
  tone?: "neutral" | "trust" | "warn" | "danger";
}

export function displayValue(value: string | number | null | undefined, fallback = "未取得"): string {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "string" && value.trim()) return value.trim();
  return fallback;
}

export function displayState(value: string | null, fallback = "未确认"): string {
  const normalized = String(value || "").trim().toLowerCase();
  if (["running", "up", "online", "reachable", "bound"].includes(normalized)) return "运行";
  if (["stopped", "down", "offline", "unreachable"].includes(normalized)) return "未运行";
  if (normalized === "searching") return "搜索中";
  if (normalized === "disabled") return "已停用";
  return displayValue(value, fallback);
}

export function displayRate(value: number | null): string {
  return value === null ? "未取得" : formatRate(value);
}

export function displayBytes(value: number | null): string {
  if (value === null) return "未取得";
  if (value < 1024) return `${value} B`;
  const units = ["KiB", "MiB", "GiB", "TiB"];
  let current = value / 1024;
  let unit = units[0];
  for (let index = 1; index < units.length && current >= 1024; index += 1) {
    current /= 1024;
    unit = units[index];
  }
  const precision = current >= 100 ? 0 : current >= 10 ? 1 : 2;
  return `${current.toFixed(precision)} ${unit}`;
}

export function displayPercent(value: number | null): string {
  return value === null ? "未取得" : `${value}%`;
}

export function displayList(values: string[], fallback = "未取得"): string {
  return values.length ? values.join("、") : fallback;
}

export function observedLabel(value: boolean | null, truthy: string, falsy: string): string {
  return value === true ? truthy : value === false ? falsy : "未确认";
}

export function EvidenceBoundary({ model }: { model: SectionModel }) {
  const label = model.evidenceMode === "current"
    ? "当前证据"
    : model.evidenceMode === "historical"
      ? "历史证据"
      : "证据不可用";
  const Icon = model.evidenceMode === "current"
    ? ShieldCheck
    : model.evidenceMode === "historical"
      ? TriangleAlert
      : CircleAlert;
  const absolute = formatRfc3339Local(model.observedAt);
  return (
    <section className={`mdi-evidence is-${model.evidenceMode}`} aria-label="证据边界">
      <Icon aria-hidden="true" size={16} />
      <span><b>{label}</b><small>{model.status}</small></span>
      {absolute ? <time dateTime={model.observedAt || undefined}><Clock3 aria-hidden="true" size={13} />{absolute}</time> : <em>成功时间未记录</em>}
    </section>
  );
}

export function InspectorSection({
  title,
  note,
  tone = "neutral",
  children,
}: {
  title: string;
  note?: string;
  tone?: "neutral" | "warn" | "danger";
  children: ReactNode;
}) {
  return (
    <section className={`mdi-section is-${tone}`}>
      <header><h3>{title}</h3>{note ? <p>{note}</p> : null}</header>
      {children}
    </section>
  );
}

export function InspectorFacts({ facts }: { facts: InspectorFact[] }) {
  return (
    <div className="mdi-facts">
      {facts.map((fact) => (
        <div className={`is-${fact.tone || "neutral"}`} key={fact.label}>
          <small>{fact.label}</small>
          <b>{fact.value}</b>
          {fact.note ? <em>{fact.note}</em> : null}
        </div>
      ))}
    </div>
  );
}

export function InspectorReadings({
  left,
  right,
}: {
  left: InspectorFact;
  right: InspectorFact;
}) {
  return (
    <div className="mdi-readings">
      {[left, right].map((item) => (
        <div className={`is-${item.tone || "neutral"}`} key={item.label}>
          <small>{item.label}</small>
          <b>{item.value}</b>
          {item.note ? <em>{item.note}</em> : null}
        </div>
      ))}
    </div>
  );
}

export function InspectorRelations({
  rows,
}: {
  rows: Array<{ primary: string; secondary: string; status?: string; tone?: "neutral" | "warn" | "danger" }>;
}) {
  return (
    <div className="mdi-relations">
      {rows.map((row, index) => (
        <div className={`is-${row.tone || "neutral"}`} key={`${row.primary}-${row.secondary}-${index}`}>
          <span><b>{row.primary}</b><small>{row.secondary}</small></span>
          {row.status ? <em>{row.status}</em> : null}
        </div>
      ))}
    </div>
  );
}

export function InspectorMessage({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "warn" | "danger";
}) {
  return <div className={`mdi-message is-${tone}`}>{children}</div>;
}

export function InspectorDisclosure({
  title,
  note,
  facts,
}: {
  title: string;
  note: string;
  facts: InspectorFact[];
}) {
  return (
    <details className="mdi-disclosure">
      <summary>
        <span>
          <b>{title}</b>
          <small>{note}</small>
        </span>
        <ChevronDown aria-hidden="true" size={17} />
      </summary>
      <InspectorFacts facts={facts} />
    </details>
  );
}
