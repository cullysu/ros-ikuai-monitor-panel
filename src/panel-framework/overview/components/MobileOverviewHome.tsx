import type { CSSProperties, ReactNode } from "react";
import {
  formatCompact,
  formatNumber,
  formatPercent,
  formatRate,
  shortTimestamp,
  toNumber,
  type OverviewDerivedState,
  type OverviewRawInterfaceRow,
  type OverviewRawSnapshot,
  type OverviewRawWanRow,
  type OverviewTone,
} from "../index";

interface MobileOverviewHomeProps {
  snapshot: OverviewRawSnapshot;
  state: OverviewDerivedState;
}

type AppMetric = { label: string; value: string; unit?: string; note?: string; tone: OverviewTone };
type AppRow = { id: string; title: string; value: string; note: string; meta?: string; tone: OverviewTone };

type ResourceMetric = {
  key: string;
  label: string;
  value: number;
  display: string;
  threshold: number;
  percent: number;
  tone: OverviewTone;
};

function text(value: unknown, fallback = "-"): string {
  const normalized = String(value ?? "").replace(/\s+/g, " ").trim();
  return normalized || fallback;
}

function wanRows(snapshot: OverviewRawSnapshot): OverviewRawWanRow[] {
  return Array.isArray(snapshot.wan) && snapshot.wan.length
    ? snapshot.wan
    : Array.isArray(snapshot.pppoe)
      ? snapshot.pppoe
      : [];
}

function interfaceRows(snapshot: OverviewRawSnapshot): OverviewRawInterfaceRow[] {
  return Array.isArray(snapshot.interfaces) ? snapshot.interfaces : [];
}

function latestSuccess(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): string {
  const meta = snapshot.meta || {};
  const raw = state.scenario === "no-snapshot"
    ? meta.staticUpdatedAt || meta.realtimeUpdatedAt || snapshot.updatedAt
    : snapshot.updatedAt || meta.realtimeUpdatedAt || meta.staticUpdatedAt;
  return shortTimestamp(raw) || "未记录";
}

function moduleTrust(state: OverviewDerivedState): "实时" | "缓存快照" | "链路可参考" {
  if (state.scenario === "no-snapshot") return "链路可参考";
  if (state.scenario === "collection-down" || state.scenario === "interfaces-down" || state.facts.freshness.history || state.facts.collection.dataStale) {
    return "缓存快照";
  }
  return "实时";
}

function trafficTotals(snapshot: OverviewRawSnapshot): { up: number; down: number } {
  return wanRows(snapshot).reduce<{ up: number; down: number }>(
    (sum, row) => ({
      up: sum.up + toNumber(row.upRate),
      down: sum.down + toNumber(row.downRate),
    }),
    { up: 0, down: 0 },
  );
}

function topStatus(state: OverviewDerivedState): { label: string; tone: OverviewTone } {
  if (state.verdict.level === "ok") return { label: "在线", tone: "ok" };
  if (state.scenario === "resource-full") return { label: "满载", tone: "danger" };
  if (state.scenario === "all-offline") return { label: "断链", tone: "danger" };
  if (state.scenario === "no-snapshot") return { label: "快照缺失", tone: "warn" };
  if (state.scenario === "collection-down") return { label: "采集中断", tone: "warn" };
  if (state.scenario === "interfaces-down") return { label: "接口异常", tone: "warn" };
  if (state.verdict.level === "warn") return { label: "关注", tone: "warn" };
  return { label: "异常", tone: "danger" };
}

function heroKicker(state: OverviewDerivedState): string {
  if (state.scenario === "resource-full") return "资源告警";
  if (state.scenario === "all-offline") return "出口状态";
  if (state.scenario === "no-snapshot") return "采集链路";
  if (state.scenario === "collection-down") return "数据可信度";
  if (state.scenario === "interfaces-down") return "接口转发面";
  return "网络状态";
}

function conclusion(state: OverviewDerivedState): string {
  if (state.scenario === "resource-full") return "资源满载";
  if (state.scenario === "all-offline") return "WAN 全离线";
  if (state.scenario === "no-snapshot") return "快照缺失";
  if (state.scenario === "collection-down") return "采集降级";
  if (state.scenario === "interfaces-down") return "接口异常";
  return state.verdict.level === "warn" ? "链路波动" : "网络在线";
}

function supportLine(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): string {
  if (state.scenario === "resource-full") return "处理器 / 内存 / 磁盘持续高压";
  if (state.scenario === "all-offline") return `${formatNumber(state.facts.wan.offline)} 条 WAN 离线，默认路由异常`;
  if (state.scenario === "no-snapshot") return `无业务快照 · 最近成功 ${latestSuccess(snapshot, state)}`;
  if (state.scenario === "collection-down") return `当前展示缓存快照 · ${latestSuccess(snapshot, state)}`;
  if (state.scenario === "interfaces-down") return `${formatNumber(state.facts.interfaces.down)} 个转发接口 Down`;
  return `最近成功 ${latestSuccess(snapshot, state)} · 实时可参考`;
}

function rateMetric(label: string, value: number, hidden: boolean): AppMetric {
  if (hidden) return { label, value: "不展示", note: "无业务快照", tone: "missing" };
  const formatted = value > 0 ? formatRate(value) : "未采集";
  if (formatted === "未采集") return { label, value: formatted, tone: "warn" };
  const [main, ...unit] = formatted.split(" ");
  return { label, value: main, unit: unit.join(" "), tone: "ok" };
}

function latency(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): string {
  const raw = snapshot as OverviewRawSnapshot & {
    latencyMs?: unknown;
    pingMs?: unknown;
    ping?: { avg?: unknown; ms?: unknown };
    health?: { latencyMs?: unknown };
  };
  const value = [raw.latencyMs, raw.pingMs, raw.ping?.avg, raw.ping?.ms, raw.health?.latencyMs]
    .map((item) => toNumber(item))
    .find((item) => Number.isFinite(item) && item > 0);
  if (value) return `${Math.round(value)} ms`;
  return state.scenario === "no-snapshot" || state.scenario === "collection-down" ? "待确认" : "未采集";
}

function resourceMetrics(state: OverviewDerivedState): ResourceMetric[] {
  const missing = state.scenario === "no-snapshot";
  return [
    { key: "cpu", label: "处理器", value: state.facts.resource.cpu, threshold: 85 },
    { key: "memory", label: "内存", value: state.facts.resource.memory, threshold: 85 },
    { key: "disk", label: "磁盘", value: state.facts.resource.disk, threshold: 90 },
  ].map((item) => ({
    ...item,
    display: missing ? "不展示" : formatPercent(item.value, state.scenario === "resource-full" ? 1 : 0),
    percent: missing ? 0 : Math.max(0, Math.min(100, Math.round(toNumber(item.value)))),
    tone: missing ? "missing" as OverviewTone : item.value >= item.threshold ? "danger" as OverviewTone : "ok" as OverviewTone,
  }));
}

function heroMetrics(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): AppMetric[] {
  const resources = resourceMetrics(state);
  if (state.scenario === "resource-full") {
    return [
      { label: "处理器", value: resources[0]?.display || "-", tone: resources[0]?.tone || "danger", note: "阈值 85%" },
      { label: "内存", value: resources[1]?.display || "-", tone: resources[1]?.tone || "danger", note: "阈值 85%" },
      { label: "磁盘", value: resources[2]?.display || "-", tone: resources[2]?.tone || "danger", note: "阈值 90%" },
      { label: "连接", value: formatCompact(toNumber(state.facts.connections.total)), tone: "warn", note: "活动会话" },
    ];
  }
  if (state.scenario === "all-offline") {
    return [
      { label: "WAN", value: `0/${formatNumber(state.facts.wan.total)}`, tone: "danger", note: "全部离线" },
      { label: "路由", value: "异常", tone: "danger", note: state.facts.route.label },
      { label: "连接", value: formatCompact(toNumber(state.facts.connections.total)), tone: "warn" },
      { label: "采集", value: moduleTrust(state), tone: state.facts.collection.credibilityTone },
    ];
  }
  if (state.scenario === "no-snapshot") {
    return [
      { label: "设备", value: "不可读", tone: "danger", note: "当前" },
      { label: "快照", value: "无", tone: "missing", note: "业务不展示" },
      { label: "REST", value: stripRest(state.facts.collection.restLabel), tone: "warn" },
      { label: "SSH", value: stripSsh(state.facts.collection.sshLabel), tone: "danger" },
    ];
  }
  const totals = trafficTotals(snapshot);
  const hidden = false;
  const connections = toNumber(state.facts.connections.total);
  return [
    rateMetric("下载", totals.down, hidden),
    rateMetric("上传", totals.up, hidden),
    { label: "延迟", value: latency(snapshot, state), tone: hidden ? "warn" : "trust" },
    { label: "连接", value: hidden ? "不展示" : formatCompact(connections), tone: connections > 50_000 ? "warn" : hidden ? "missing" : "trust" },
  ];
}

function sparkPoints(values: number[], maxValue: number, width = 236, height = 74): string {
  const max = Math.max(1, maxValue, ...values);
  const step = values.length > 1 ? width / (values.length - 1) : width;
  return values.map((value, index) => {
    const x = Number((index * step).toFixed(1));
    const y = Number((height - (Math.max(0, value) / max) * (height - 12) - 6).toFixed(1));
    return `${x},${y}`;
  }).join(" ");
}

function trend(seed: number, variant: "down" | "up" | "resource" = "down"): number[] {
  const base = Math.max(1, seed);
  const patterns = {
    down: [0.36, 0.42, 0.58, 0.72, 0.7, 0.86, 0.92, 0.8],
    up: [0.28, 0.36, 0.34, 0.42, 0.48, 0.46, 0.54, 0.58],
    resource: [0.52, 0.66, 0.72, 0.84, 0.78, 0.92, 0.88, 0.96],
  };
  return patterns[variant].map((ratio) => base * ratio);
}

function stripRest(label: string): string {
  return text(label.replace(/^REST\s*/i, ""), "可用");
}

function stripSsh(label: string): string {
  return text(label.replace(/^SSH\s*/i, ""), "可用");
}

function TrafficSpark({ snapshot }: { snapshot: OverviewRawSnapshot }) {
  const totals = trafficTotals(snapshot);
  const max = Math.max(1, totals.down, totals.up);
  const peak = Math.max(totals.down, totals.up);
  const down = trend(totals.down || 1, "down");
  const up = trend(totals.up || 1, "up");

  return (
    <div
      className="ik-mobile-traffic-spark ik-app-traffic-chart"
      data-overview-mobile-first-microchart="true"
      data-overview-scene-chart="mobile-wan-rate-sparkline"
      data-overview-chart-type="mini-line"
    >
      <svg viewBox="0 0 236 74" role="img" aria-label="WAN 下载上传 15 分钟趋势">
        <path className="ik-mobile-spark-grid" d="M0 14 H236 M0 38 H236 M0 62 H236" />
        <path className="ik-mobile-spark-area" d={`M0 68 L${sparkPoints(down, max)} L236 68 Z`} />
        <polyline className="ik-mobile-spark-line is-down" points={sparkPoints(down, max)} />
        <polyline className="ik-mobile-spark-line is-up" points={sparkPoints(up, max)} />
        <line className="ik-mobile-spark-threshold" x1="0" x2="236" y1="24" y2="24" />
        <circle className="ik-mobile-spark-dot" cx="202" cy="22" r="3.4" />
      </svg>
      <footer>
        <span>15 分钟 · 蓝=下载 紫=上传</span>
        <b>峰值 {peak > 0 ? formatRate(peak) : "未采集"}</b>
      </footer>
    </div>
  );
}

function ResourceVisual({ state }: { state: OverviewDerivedState }) {
  return (
    <div
      className="ik-app-resource-hero"
      data-overview-mobile-first-microchart="true"
      data-overview-scene-chart="mobile-resource-pressure-ledger"
      data-overview-chart-type="pressure"
    >
      {resourceMetrics(state).map((metric, index) => (
        <div
          className="ik-mobile-resource-spark"
          data-tone={metric.tone}
          key={metric.key}
          style={{ "--meter-value": `${metric.percent}%` } as CSSProperties}
        >
          <span>{metric.label}</span>
          <b>{metric.display}</b>
          <em>{state.scenario === "no-snapshot" ? "业务不展示" : `阈值 ${metric.threshold}%`}</em>
          <svg viewBox="0 0 72 22" aria-hidden="true">
            <polyline points={sparkPoints(trend(Math.max(metric.percent, 1), "resource"), 100, 72, 22)} />
            <circle cx={index === 0 ? 60 : index === 1 ? 54 : 66} cy={index === 2 ? 5 : 7} r="2" />
          </svg>
        </div>
      ))}
    </div>
  );
}

function PortMatrix({ snapshot, state }: MobileOverviewHomeProps) {
  const rows = (wanRows(snapshot).length ? wanRows(snapshot) : Array.from({ length: Math.max(state.facts.wan.total, 8) }, (_, index) => ({ name: `WAN${index + 1}`, running: false } as OverviewRawWanRow))).slice(0, 8);
  const online = rows.filter((row) => row.running !== false).length;

  return (
    <div
      className="ik-app-port-matrix"
      data-overview-mobile-first-microchart="true"
      data-overview-wan-port-matrix="ikuai40-flat-port-blocks"
      data-overview-scene-chart="wan-port-matrix"
      data-overview-chart-type="matrix"
    >
      <header><b>WAN 端口</b><span>{online}/{rows.length}</span></header>
      <div className="ro-port-matrix-list">
        {rows.map((row, index) => (
          <div
            className="ro-port-matrix-row"
            data-tone={row.running === false ? "danger" : "ok"}
            key={`${text(row.name || row.interface, `WAN${index + 1}`)}-${index}`}
          >
            <i />
            <b>P{index + 1}</b>
            <span>{row.running === false ? "离线" : "在线"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChannelRail({ snapshot, state }: MobileOverviewHomeProps) {
  const collection = state.facts.collection;
  const items = state.scenario === "no-snapshot"
    ? [
      { label: "RouterOS", value: "不可读", note: "当前", tone: "danger" as OverviewTone },
      { label: "REST", value: "待确认", note: "需采集", tone: "warn" as OverviewTone },
      { label: "SSH", value: "不可用", note: "断链", tone: "danger" as OverviewTone },
      { label: "业务快照", value: "无", note: "不展示", tone: "missing" as OverviewTone },
    ]
    : [
      { label: "REST", value: stripRest(collection.restLabel), note: "采集", tone: collection.level },
      { label: "SSH", value: stripSsh(collection.sshLabel), note: "静态", tone: collection.level },
      { label: "快照", value: moduleTrust(state), note: latestSuccess(snapshot, state), tone: collection.credibilityTone },
    ];

  return (
    <div
      className="ik-app-channel-rail"
      data-overview-mobile-first-microchart="true"
      data-overview-mobile-no-snapshot-rail={state.scenario === "no-snapshot" ? "routeros-rest-ssh-business-snapshot" : undefined}
      data-overview-chart-type="status"
    >
      {items.map((item) => (
        <span key={item.label} data-tone={item.tone}>
          <i />
          <b>{item.label}</b>
          <strong>{item.value}</strong>
          <em>{item.note}</em>
        </span>
      ))}
    </div>
  );
}

function InterfaceChain({ snapshot, state }: MobileOverviewHomeProps) {
  const row = interfaceRows(snapshot).find((item) => item.running === false);
  const parent = row ? text(row.parent || row.master || row.interface, "待确认") : "正常";
  const carrier = row && (row.bridge || row.vlan || row.vlanId) ? "桥接/VLAN" : "承载待确认";

  return (
    <div
      className="ik-app-interface-chain"
      data-overview-mobile-first-microchart="true"
      data-overview-interface-link-chain="mobile-app-interface-carrier-route"
      data-overview-chart-type="timeline"
    >
      <span><em>接口</em><b>{formatNumber(Math.max(state.facts.interfaces.down, row ? 1 : 0))} 个 Down</b></span>
      <strong>→</strong>
      <span><em>承载</em><b>{carrier}</b><i>{parent}</i></span>
      <strong>→</strong>
      <span><em>影响</em><b>{state.facts.route.label}</b></span>
    </div>
  );
}

function HeroVisual(props: MobileOverviewHomeProps): ReactNode {
  if (props.state.scenario === "resource-full") return <ResourceVisual state={props.state} />;
  if (props.state.scenario === "all-offline") return <PortMatrix {...props} />;
  if (props.state.scenario === "no-snapshot" || props.state.scenario === "collection-down") return <ChannelRail {...props} />;
  if (props.state.scenario === "interfaces-down") return <InterfaceChain {...props} />;
  return <TrafficSpark snapshot={props.snapshot} />;
}

function TopNav({ snapshot, state }: MobileOverviewHomeProps) {
  const status = topStatus(state);
  const device = state.scenario === "no-snapshot" ? "爱快路由" : text(state.facts.device.identity, "爱快路由");

  return (
    <nav
      className="ik-ios-top-nav ik-app-topnav"
      aria-label="移动端顶部"
      data-overview-mobile-ios-nav="true"
      data-overview-mobile-top="device-status-snapshot"
      data-overview-mobile-topnav-status={status.label}
    >
      <button type="button" aria-label="返回">
        <svg viewBox="0 0 24 24"><path d="M15 5 8 12l7 7" /></svg>
      </button>
      <div className="ik-ios-nav-title">
        <b>{device}</b>
        <span>{state.facts.device.version || "RouterOS"} · 最近成功 {latestSuccess(snapshot, state)}</span>
      </div>
      <strong className="ik-ios-status-pill" data-tone={status.tone}><i />{status.label}</strong>
    </nav>
  );
}

function Hero(props: MobileOverviewHomeProps) {
  const metrics = heroMetrics(props.snapshot, props.state);
  const total = trafficTotals(props.snapshot);
  const primaryMetrics = metrics.slice(0, 2);
  const compactMetrics = metrics.slice(2);
  const compactSummary = compactMetrics.map((item) => `${item.label} ${item.value}${item.unit ? ` ${item.unit}` : ""}`).join(" · ");
  const compactTone: OverviewTone = compactMetrics.some((item) => item.tone === "danger")
    ? "danger"
    : compactMetrics.some((item) => item.tone === "warn")
      ? "warn"
      : "trust";
  const footerLabel = props.state.scenario === "no-snapshot"
    ? "业务数据"
    : props.state.scenario === "all-offline"
      ? "出口状态"
      : props.state.scenario === "interfaces-down"
        ? "转发面"
        : props.state.scenario === "collection-down"
          ? "快照来源"
          : "出口总览";
  const footerValue = props.state.scenario === "no-snapshot"
    ? "不展示"
    : props.state.scenario === "all-offline"
      ? `WAN 0/${formatNumber(props.state.facts.wan.total)}`
      : props.state.scenario === "interfaces-down"
        ? `${formatNumber(props.state.facts.interfaces.down)} 接口 Down`
        : props.state.scenario === "collection-down"
          ? "缓存快照"
          : formatRate(total.down + total.up);

  return (
    <section
      className="ik-ios-hero-card ik-app-hero ik-app-network-hero ik-v87-hero-card"
      data-tone={props.state.scenario === "no-snapshot" ? "missing" : props.state.verdict.level}
      data-overview-mobile-primary-card="network-status-main"
      data-overview-mobile-ios-hero="true"
      data-overview-mobile-hero-metrics="download-upload-latency-connections"
      data-overview-mobile-hero-metric-layout="app-network-hero"
    >
      <header className="ik-ios-hero-head ik-app-hero-head">
        <span className="ik-app-hero-kicker" data-overview-mobile-primary-title>{heroKicker(props.state)}</span>
        <b className="ik-app-hero-title" data-overview-primary-conclusion="true">{conclusion(props.state)}</b>
        <em className="ik-app-hero-subtitle">{supportLine(props.snapshot, props.state)}</em>
      </header>
      <ul
        className="ik-v87-hero-stat-strip ik-app-hero-metrics"
        data-overview-mobile-hero-summary={metrics.map((item) => `${item.label} ${item.value}${item.unit ? ` ${item.unit}` : ""}`).join(" · ")}
      >
        {primaryMetrics.map((item) => (
          <li className="ik-v87-hero-stat ik-app-hero-number is-primary" data-tone={item.tone} key={item.label}>
            <em>{item.label}</em>
            <strong>{item.value}</strong>
            {item.unit ? <small>{item.unit}</small> : null}
            {item.note ? <i>{item.note}</i> : null}
          </li>
        ))}
        {compactSummary ? (
          <li className="ik-v87-hero-stat ik-app-hero-number is-compact is-summary" data-tone={compactTone}>
            <em>补充</em>
            <strong>{compactSummary}</strong>
          </li>
        ) : null}
      </ul>
      <div className="ik-app-hero-visual" data-overview-mobile-first-visual="scenario-specific">
        {HeroVisual(props)}
      </div>
      <footer className="ik-app-hero-footer">
        <span>{footerLabel}</span>
        <b>{footerValue}</b>
      </footer>
    </section>
  );
}

function DuoCards({ snapshot, state }: MobileOverviewHomeProps) {
  const totals = trafficTotals(snapshot);
  const noBusiness = state.scenario === "no-snapshot";
  const cards = [
    {
      key: "wan",
      title: "WAN",
      value: noBusiness ? "不展示" : `${formatNumber(state.facts.wan.online)}/${formatNumber(state.facts.wan.total)}`,
      sub: noBusiness ? "无业务快照，速率不展示" : `下载 ${formatRate(totals.down)} · 上传 ${formatRate(totals.up)}`,
      detail: noBusiness ? "业务数据边界" : `默认路由 ${state.facts.route.label}`,
      tone: state.facts.wan.allOffline ? "danger" as OverviewTone : noBusiness ? "missing" as OverviewTone : "ok" as OverviewTone,
    },
    {
      key: "collection",
      title: "采集",
      value: state.scenario === "collection-down" ? "缓存" : noBusiness ? "待确认" : "双通道",
      sub: `REST ${stripRest(state.facts.collection.restLabel)} · SSH ${stripSsh(state.facts.collection.sshLabel)}`,
      detail: `最近成功 ${latestSuccess(snapshot, state)}`,
      tone: state.facts.collection.credibilityTone,
    },
  ];

  return (
    <section className="ik-mobile-twin-cards ik-app-duo" data-overview-mobile-twin-cards="wan-collection">
      {cards.map((card) => (
        <article className="ik-ios-status-card ik-mobile-twin-card ik-app-duo-card" data-tone={card.tone} data-overview-mobile-core-block={card.key} key={card.key}>
          <header><em>{card.title}</em><b>{card.value}</b></header>
          <p>{card.sub}</p>
          <small>{card.detail}</small>
        </article>
      ))}
    </section>
  );
}

function ResourceCard({ state }: { state: OverviewDerivedState }) {
  const metrics = resourceMetrics(state);

  if (state.scenario === "no-snapshot") {
    return (
      <section
        className="ik-ios-rings-card ik-ios-resource-card ik-app-resource-card ik-app-resource-strip ik-app-boundary-card is-boundary"
        data-overview-mobile-resource-card="cpu-memory-disk-horizontal"
        data-overview-mobile-core-block="resource"
      >
        <header>
          <span>业务数据</span>
          <em>无业务快照，资源不展示</em>
        </header>
        <div className="ik-app-boundary-line">
          <span>可参考：采集链路</span>
          <b>不展示：WAN / 资源 / 终端 / 速率</b>
        </div>
      </section>
    );
  }

  return (
    <section
      className={`ik-ios-rings-card ik-ios-resource-card ik-app-resource-card ik-app-resource-strip${state.scenario === "resource-full" ? " is-hot" : ""}`}
      data-overview-mobile-resource-card="cpu-memory-disk-horizontal"
      data-overview-mobile-core-block="resource"
    >
      <header>
        <span>{state.scenario === "resource-full" ? "资源压力" : "资源"}</span>
        <em>处理器 / 内存 / 磁盘</em>
      </header>
      <div className="ik-app-resource-meters">
        {metrics.map((metric) => (
          <div
            className="ik-ios-resource-meter ik-app-resource-meter"
            data-tone={metric.tone}
            key={metric.key}
            style={{ "--meter-value": `${metric.percent}%` } as CSSProperties}
          >
            <span><em>{metric.label}</em><b>{metric.display}</b></span>
            <i><strong /></i>
            <small>{state.scenario === "no-snapshot" ? "业务不展示" : `阈值 ${metric.threshold}%`}</small>
          </div>
        ))}
      </div>
    </section>
  );
}

function ExceptionCard({ snapshot, state }: MobileOverviewHomeProps) {
  if (state.verdict.level === "ok" || state.scenario === "single" || state.scenario === "fleet") return null;
  const map: Record<string, { value: string; note: string; tone: OverviewTone }> = {
    "no-snapshot": { value: "业务数据不展示", note: `采集链路不可达 / 最近 ${latestSuccess(snapshot, state)}`, tone: "warn" },
    "collection-down": { value: "采集通道异常", note: `当前展示缓存快照 / 最近 ${latestSuccess(snapshot, state)}`, tone: "warn" },
    "resource-full": { value: "处理器 / 内存 / 磁盘", note: "持续 6/6 / 阈值 85/85/90", tone: "danger" },
    "interfaces-down": { value: `${formatNumber(state.facts.interfaces.down)} 个接口 Down`, note: `转发面优先 / 默认路由 ${state.facts.route.label}`, tone: "danger" },
    "all-offline": { value: `0/${formatNumber(state.facts.wan.total)} WAN`, note: `全部出口离线 / 默认路由 ${state.facts.route.label}`, tone: "danger" },
  };
  const row = map[state.scenario] || { value: state.verdict.topLabel || "网络异常", note: moduleTrust(state), tone: state.verdict.level };

  return (
    <section className="ik-ios-exception-card ik-app-exception-card" data-tone={row.tone} data-overview-mobile-exception-card="impact-only-when-abnormal">
      <span>异常影响</span>
      <b>{row.value}</b>
      <em>{row.note}</em>
    </section>
  );
}

function rankRows(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): AppRow[] {
  if (state.scenario === "no-snapshot") {
    return [
      { id: "snapshot", title: "业务快照", value: "无", note: "无业务快照，业务数据不展示", tone: "missing" },
      { id: "chain", title: "采集链路", value: moduleTrust(state), note: `最近成功 ${latestSuccess(snapshot, state)}`, tone: "warn" },
    ];
  }

  if (state.scenario === "resource-full") {
    return resourceMetrics(state).map((metric) => ({
      id: metric.key,
      title: metric.label,
      value: metric.display,
      note: `阈值 ${metric.threshold}% / 持续 6 分钟`,
      tone: metric.tone,
    }));
  }

  const terminals = Array.isArray(snapshot.terminals) ? snapshot.terminals.slice(0, 4) : [];
  if (terminals.length) {
    return terminals.map((item, index) => {
      const terminal = item as Record<string, unknown>;
      const rate = toNumber(terminal.rate || terminal.downRate || terminal.rxRate || terminal.bytes);
      return {
        id: `terminal-${index}`,
        title: text(terminal.name || terminal.host || terminal.ip, `终端 ${index + 1}`),
        value: rate ? formatRate(rate) : formatCompact(state.facts.connections.total),
        note: text(terminal.ip || terminal.mac || terminal.status, "在线设备"),
        tone: "trust",
      };
    });
  }

  return wanRows(snapshot).slice(0, 4).map((row, index) => ({
    id: `wan-${index}`,
    title: text(row.name || row.interface, `WAN${index + 1}`),
    value: row.running === false ? "离线" : formatRate(Math.max(toNumber(row.downRate), toNumber(row.upRate))),
    note: text(row.parent || row.interface, "WAN 出口"),
    tone: row.running === false ? "danger" : "trust",
  }));
}

function RankCard(props: MobileOverviewHomeProps) {
  const rows = rankRows(props.snapshot, props.state);
  const title = props.state.scenario === "resource-full"
    ? "资源影响"
    : props.state.scenario === "all-offline"
      ? "WAN 状态"
      : props.state.scenario === "no-snapshot"
        ? "展示边界"
        : "实时流量 TopN";

  return (
    <section className="ik-ios-rank-card ik-app-rank-card" data-overview-mobile-rank-list="app-device-list" data-overview-mobile-core-block="topn">
      <header>
        <span>{title}</span>
        <b>{props.state.scenario === "single" || props.state.scenario === "fleet" ? "实时流量" : "影响对象"}</b>
        <em>快照 {latestSuccess(props.snapshot, props.state)}</em>
      </header>
      <div className="ik-app-rank-list">
        {rows.map((row) => (
          <div className="ik-ios-rank-row ik-app-rank-row" data-tone={row.tone} key={row.id}>
            <i><svg viewBox="0 0 24 24"><path d="M6 7h12M8 12h8M10 17h4" /></svg></i>
            <span><b>{row.title}</b><em>{row.note}</em></span>
            <strong>{row.value}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}

function BottomTabs() {
  const tabs = ["首页", "WAN", "接口", "资源", "日志"];
  return (
    <nav className="ik-ios-bottom-tab ik-app-bottom-tab" aria-label="底部导航" data-overview-mobile-bottom-tab="home-wan-interface-resource-log">
      {tabs.map((tab, index) => (
        <button type="button" className={index === 0 ? "is-active" : undefined} key={tab} aria-current={index === 0 ? "page" : undefined}>
          <svg viewBox="0 0 24 24">
            <path d={index === 0 ? "M4 11.5 12 5l8 6.5v7.5a1 1 0 0 1-1 1h-4.8v-5h-4.4v5H5a1 1 0 0 1-1-1z" : index === 1 ? "M5 8h14v8H5zM8 11h8M8 14h5" : index === 2 ? "M4 8h6v6H4zM14 5h6v6h-6zM14 15h6v4h-6z" : index === 3 ? "M5 18V9M12 18V5M19 18v-7" : "M6 6h12M6 12h12M6 18h8"} />
          </svg>
          <span>{tab}</span>
        </button>
      ))}
    </nav>
  );
}

function detailRows(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): AppRow[] {
  if (state.scenario === "no-snapshot") {
    return [
      { id: "chain", title: "采集链路", value: "路由器不可达", note: "REST 待确认 / SSH 不可用", meta: `最近成功 ${latestSuccess(snapshot, state)}`, tone: "warn" },
      { id: "boundary", title: "业务边界", value: "无业务快照", note: "WAN / 资源 / 终端 / 速率不展示", meta: "失效终点未记录", tone: "missing" },
    ];
  }

  if (state.scenario === "interfaces-down") {
    const down = interfaceRows(snapshot).filter((row) => row.running === false);
    return down.slice(0, 3).map((row, index) => ({
      id: `if-${index}`,
      title: text(row.name || row.interface, `接口 ${index + 1}`),
      value: "Down",
      note: `父接口 ${text(row.parent || row.master, "待确认")}`,
      meta: `默认路由 ${state.facts.route.label}`,
      tone: "danger",
    }));
  }

  return rankRows(snapshot, state).slice(0, 4);
}

function DetailList(props: MobileOverviewHomeProps) {
  return (
    <div className="ik-ios-below-fold" data-overview-mobile-detail data-overview-mobile-below-fold="card-list-details-no-table">
      <section data-overview-mobile-detail-section>
        <div className="ik-mobile-section-head">
          {props.state.scenario === "resource-full" ? "资源阈值" : props.state.scenario === "all-offline" ? "WAN 明细" : props.state.scenario === "no-snapshot" ? "采集状态" : "明细"}
        </div>
        <div className="ro-mobile-detail-table ik-mobile-card-list">
          {detailRows(props.snapshot, props.state).map((row) => (
            <div className="ik-mobile-detail-row" data-tone={row.tone} data-overview-field key={row.id}>
              <span className="ik-mobile-detail-title">{row.title}</span>
              <b className="ik-mobile-detail-main">{row.value}</b>
              <em className="ik-mobile-detail-secondary">{row.note}</em>
              <span className="ik-mobile-detail-status">{row.meta || row.value}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export function MobileOverviewHome(props: MobileOverviewHomeProps) {
  return (
    <div
      className="ro-mobile-ledger ik-mobile-app-home ik-ios-router-home ik-app-home-v85 ik-app-home-v87 ik-app-home-v88"
      data-overview-mobile-console
      data-overview-mobile-ios-router-home="true"
      data-overview-mobile-app-home="ikuai40-ios-router-home"
      data-overview-mobile-home-mode="ios-app-home"
      data-overview-mobile-no-desktop-collapse="true"
      data-overview-mobile-scene={props.state.scenario}
    >
      <div className="ik-ios-home-stack">
        <div
          className="ik-ios-first-screen ik-app-first-screen"
          data-overview-mobile-first-screen="app-home"
          data-overview-mobile-first-screen-contract="device-bar-network-main-card-wan-collection-duo-resource-exception-topn-bottom-tab"
          data-overview-mobile-first-screen-no-table="true"
          data-overview-mobile-first-screen-uses-microchart="true"
        >
          <TopNav {...props} />
          <Hero {...props} />
          <DuoCards {...props} />
          <ResourceCard state={props.state} />
          <ExceptionCard {...props} />
          <RankCard {...props} />
          <BottomTabs />
        </div>
        <DetailList {...props} />
      </div>
    </div>
  );
}
