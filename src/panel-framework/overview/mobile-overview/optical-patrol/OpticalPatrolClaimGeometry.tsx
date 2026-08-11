import {
  Activity,
  ArrowDown,
  ArrowUp,
  ArrowUpRight,
  Cable,
  CircleAlert,
  Gauge,
  Network,
  Route,
  Unplug,
} from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import type { OpticalPatrolModel } from "./opticalPatrolTypes";

export type OpticalPatrolClaimView = OpticalPatrolModel["claims"][number];

interface FactView {
  label: string;
  value: string | number | null;
  note?: string | null;
  dateTime?: string | null;
  tone?: string | null;
}

function claimFacts(claim: OpticalPatrolClaimView): FactView[] {
  return claim.evidence.map((item) => ({
    label: item.label,
    value: item.value,
    note: item.note,
    dateTime: item.observedAt,
    tone: item.tone,
  }));
}

function factValue(fact: FactView): ReactNode {
  if (fact.value === null || fact.value === "") return "—";
  if (fact.dateTime && typeof fact.value === "string") return <time dateTime={fact.dateTime}>{fact.value}</time>;
  return fact.value;
}

function formatMeasurement(value: number | null, maximumFractionDigits = 1): string {
  if (value === null) return "—";
  return new Intl.NumberFormat("zh-CN", {
    maximumFractionDigits,
    minimumFractionDigits: 0,
    useGrouping: false,
  }).format(value);
}

function evidenceModeLabel(mode: OpticalPatrolClaimView["evidenceMode"]): string {
  if (mode === "current") return "当前";
  if (mode === "historical") return "历史";
  return "不可用";
}

function sourceLabel(source: string): string {
  if (/resourceSamples/i.test(source)) return "资源当前值 + 历史样本";
  if (/interfaces?/i.test(source) && /routes\.(?:defaultRoutes|items)/i.test(source)) return "接口记录 → 默认路由记录";
  if (/routes\.(?:defaultRoutes|items)/i.test(source)) return "默认路由记录";
  if (/meta\.rest/i.test(source)) return "REST 采集记录";
  if (/meta\.ssh/i.test(source)) return "SSH 采集记录";
  if (/evidenceRows|evidence boundary/i.test(source)) return "证据边界记录";
  if (/interfaces?/i.test(source)) return "接口运行记录";
  return source;
}

export function OpticalPatrolClaimIcon({ kind, size = 22 }: { kind: OpticalPatrolClaimView["kind"]; size?: number }) {
  const props = { size, strokeWidth: 1.85, "aria-hidden": true } as const;
  if (kind === "route") return <Route {...props} />;
  if (kind === "wan") return <Network {...props} />;
  if (kind === "collection") return <Cable {...props} />;
  if (kind === "resource") return <Gauge {...props} />;
  if (kind === "interface") return <Unplug {...props} />;
  return <Activity {...props} />;
}

function EvidenceRail({ facts }: { facts: FactView[] }) {
  if (!facts.length) return null;
  return (
    <dl className="op__proof-rail">
      {facts.map((fact, index) => (
        <div key={`${fact.label}-${index}`} data-optical-patrol-tone={fact.tone || undefined}>
          <dt>{fact.label}</dt>
          <dd>{factValue(fact)}{fact.note ? <small>{fact.note}</small> : null}</dd>
        </div>
      ))}
    </dl>
  );
}

function RouteGeometry({ claim }: { claim: OpticalPatrolClaimView }) {
  const facts = claimFacts(claim);
  const destination = facts.find((fact) => /目标|目的|destination/i.test(fact.label)) || null;
  const gateway = facts.find((fact) => /网关|出口|gateway/i.test(fact.label)) || null;
  const pathFacts = new Set([destination, gateway].filter(Boolean));
  const supporting = facts.filter((fact) => !pathFacts.has(fact) && !/^来源$/.test(fact.label));
  return (
    <div className="op__route-geometry" data-optical-patrol-route-geometry>
      {(destination || gateway) ? (
        <div className="op__route-path" aria-label="路由对象关系">
          <span>{destination ? factValue(destination) : "默认路由"}</span>
          <ArrowUpRight size={18} aria-hidden="true" />
          <strong>{gateway ? factValue(gateway) : claim.title}</strong>
        </div>
      ) : null}
      <EvidenceRail facts={supporting} />
    </div>
  );
}

function TrafficGeometry({ claim }: { claim: OpticalPatrolClaimView }) {
  const down = claim.measurements.find((measurement) => measurement.key === "traffic-down" || /下载/.test(measurement.label));
  const up = claim.measurements.find((measurement) => measurement.key === "traffic-up" || /上传/.test(measurement.label));
  if (!down && !up) return null;
  const unit = down?.unit || up?.unit || "Mbps";
  const note = down?.windowLabel || up?.windowLabel || "";
  return (
    <div className="op__traffic" data-optical-patrol-traffic-geometry>
      <div><ArrowDown size={19} aria-hidden="true" /><span><strong>{formatMeasurement(down?.value ?? null)}</strong><small>{unit}</small></span><em>下载</em></div>
      <div><ArrowUp size={19} aria-hidden="true" /><span><strong>{formatMeasurement(up?.value ?? null)}</strong><small>{unit}</small></span><em>上传</em></div>
      {note ? <p>{note}</p> : null}
    </div>
  );
}

function ResourceGeometry({ claim }: { claim: OpticalPatrolClaimView }) {
  const current = claim.measurements.find((measurement) => measurement.key === "resource-current");
  const threshold = claim.measurements.find((measurement) => measurement.key === "resource-threshold");
  const delta = claim.measurements.find((measurement) => measurement.key === "resource-delta");
  const trailing = claim.measurements.find((measurement) => measurement.key === "resource-trailing");
  if (!current && !threshold && !delta && !trailing) return null;
  const unit = current?.unit || threshold?.unit || "%";
  const boundedCurrent = current?.value === null || current?.value === undefined ? null : Math.max(0, Math.min(current.value, 100));
  const boundedThreshold = threshold?.value === null || threshold?.value === undefined ? null : Math.max(0, Math.min(threshold.value, 100));
  const deltaText = delta?.value === null || delta?.value === undefined ? "" : `${delta.value} ${delta.unit}`;
  const consecutive = trailing?.value === null || trailing?.value === undefined ? "" : String(trailing.value);
  const sampleCount = Math.max(0, Math.min(trailing?.value || 0, trailing?.sampleCount || 12, 12));
  const window = current?.windowLabel || threshold?.windowLabel || "";
  return (
    <div className="op__resource" data-optical-patrol-resource-geometry>
      <div className="op__resource-value">
        <strong>{formatMeasurement(current?.value ?? null)}</strong><span>{unit}</span>
        {(threshold?.value !== null && threshold?.value !== undefined || deltaText) ? (
          <small>策略阈值 {formatMeasurement(threshold?.value ?? null)}{unit}{deltaText ? ` · 超出 ${deltaText}` : ""}</small>
        ) : null}
      </div>
      {(boundedCurrent !== null && boundedThreshold !== null) ? (
        <div
          className="op__threshold"
          style={{ "--op-current": `${boundedCurrent}%`, "--op-threshold": `${boundedThreshold}%` } as CSSProperties}
          role="img"
          aria-label={`当前 ${current?.value}${unit}，策略阈值 ${threshold?.value}${unit}`}
        ><i aria-hidden="true" /><b aria-hidden="true" /></div>
      ) : null}
      {sampleCount ? <div className="op__samples" role="list" aria-label={`末尾连续 ${sampleCount} 个样本越过策略阈值`}>
        {Array.from({ length: sampleCount }, (_, index) => (
          <i key={index} role="listitem" aria-label={`连续样本 ${index + 1}，越过策略阈值`} />
        ))}
      </div> : null}
      {(consecutive || window) ? <div className="op__sample-proof">
        <span>{consecutive ? `连续 ${consecutive} 个样本越阈` : "连续性未提供"}</span>
        {window ? <strong>窗口 {window}</strong> : null}
      </div> : null}
    </div>
  );
}

function RelationshipGeometry({ relationship }: { relationship: OpticalPatrolClaimView["relationship"] }) {
  if (!relationship) return null;
  return (
    <div className="op__relationship" data-optical-patrol-relationship>
      <span>{relationship.label}</span>
      <strong>{relationship.value}</strong>
      <code title={relationship.source}>{sourceLabel(relationship.source)}</code>
    </div>
  );
}

export function OpticalPatrolClaimGeometry({
  claim,
  forbidsCurrentData,
  action,
}: {
  claim: OpticalPatrolClaimView;
  forbidsCurrentData: boolean;
  action: ReactNode;
}) {
  const currentAllowed = !forbidsCurrentData && claim.evidenceMode === "current";
  const facts = claimFacts(claim);
  const visibleFacts = claim.kind === "interface" && claim.relationship?.verified
    ? facts.filter((fact) => !/默认路由目标|默认路由网关|接口来源/.test(fact.label))
    : facts;
  const isRoute = claim.kind === "route";
  const isResource = claim.kind === "resource";
  return (
    <div className="op__claim-evidence">
      {isRoute ? <RouteGeometry claim={claim} /> : null}
      {isResource && currentAllowed ? <ResourceGeometry claim={claim} /> : null}
      {currentAllowed ? <TrafficGeometry claim={claim} /> : null}
      {(isRoute || isResource) ? action : null}
      {!isRoute && !isResource ? <EvidenceRail facts={visibleFacts} /> : null}
      {isResource ? <EvidenceRail facts={facts.filter((fact) => !/^来源$/.test(fact.label))} /> : null}
      {!isRoute ? <RelationshipGeometry relationship={claim.relationship} /> : null}
      {(!isRoute && !isResource) ? action : null}
      {!currentAllowed && claim.measurements.length ? <p className="op__withdrawn"><CircleAlert size={18} aria-hidden="true" />当前测量已按证据边界撤回</p> : null}
      <div className="op__source-boundary">
        <span>{evidenceModeLabel(claim.evidenceMode)}</span>
        <code title={claim.source}>{sourceLabel(claim.source)}</code>
      </div>
    </div>
  );
}

export function opticalPatrolFollowupSummary(claim: OpticalPatrolClaimView): string {
  if (claim.kind !== "resource") return claim.summary;
  const current = claim.measurements.find((measurement) => measurement.key === "resource-current");
  const threshold = claim.measurements.find((measurement) => measurement.key === "resource-threshold");
  if (current?.value === null || current?.value === undefined || threshold?.value === null || threshold?.value === undefined) return claim.summary;
  return `当前 ${formatMeasurement(current.value)}${current.unit} · 阈值 ${formatMeasurement(threshold.value)}${threshold.unit}`;
}
