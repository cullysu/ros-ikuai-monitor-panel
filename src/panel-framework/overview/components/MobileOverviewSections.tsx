import type { CSSProperties } from "react";
import {
  formatNumber,
  formatPercent,
  shortTimestamp,
  toNumber,
  type OverviewDerivedState,
  type OverviewRawInterfaceRow,
  type OverviewRawSnapshot,
  type OverviewRawWanRow,
  type OverviewTone,
} from "../index";
import { buildMobileOverviewModel, type MobileOverviewModel, type MobileTrendChartModel } from "../mobileOverviewModel";

export interface MobileOverviewHomeProps {
  snapshot: OverviewRawSnapshot;
  state: OverviewDerivedState;
}

type ResourceReading = {
  key: "processor" | "memory" | "disk";
  label: string;
  value: number;
  display: string;
  threshold: number;
  tone: OverviewTone;
};

type NativeRow = {
  id: string;
  title: string;
  value: string;
  note: string;
  tone: OverviewTone;
};

type AppRankingRow = {
  id: string;
  rank: number | "";
  name: string;
  kind?: string;
  meta: string;
  value: string;
  status?: string;
  percent: number;
  tone: OverviewTone;
};

type ChannelReading = {
  label: string;
  value: string;
  tone: OverviewTone;
};

function clean(value: unknown, fallback = "-"): string {
  const normalized = String(value ?? "").replace(/\s+/g, " ").trim();
  return normalized || fallback;
}

function wanRows(snapshot: OverviewRawSnapshot): OverviewRawWanRow[] {
  if (Array.isArray(snapshot.wan) && snapshot.wan.length) return snapshot.wan;
  return Array.isArray(snapshot.pppoe) ? snapshot.pppoe : [];
}

function interfaceRows(snapshot: OverviewRawSnapshot): OverviewRawInterfaceRow[] {
  return Array.isArray(snapshot.interfaces) ? snapshot.interfaces : [];
}

function twoDigit(value: number): string {
  return String(value).padStart(2, "0");
}

function mobileTime(raw: unknown): string {
  const source = String(raw ?? "").trim();
  if (!source) return "未记录";
  const numeric = typeof raw === "number" || /^\d+$/.test(source) ? Number(raw) : Number.NaN;
  const date = Number.isFinite(numeric)
    ? new Date(numeric < 1_000_000_000_000 ? numeric * 1000 : numeric)
    : new Date(source);
  if (Number.isNaN(date.getTime())) {
    const fallback = shortTimestamp(raw);
    return fallback && !/\d{4}-\d{2}-\d{2}T/.test(fallback) ? fallback : "未记录";
  }
  const now = new Date();
  const time = `${twoDigit(date.getHours())}:${twoDigit(date.getMinutes())}`;
  if (
    date.getFullYear() === now.getFullYear()
    && date.getMonth() === now.getMonth()
    && date.getDate() === now.getDate()
  ) {
    return time;
  }
  return `${twoDigit(date.getMonth() + 1)}-${twoDigit(date.getDate())} ${time}`;
}

function latestSuccess(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): string {
  const meta = snapshot.meta || {};
  const raw = state.scenario === "no-snapshot"
    ? meta.staticUpdatedAt || meta.realtimeUpdatedAt || snapshot.updatedAt
    : snapshot.updatedAt || meta.realtimeUpdatedAt || meta.staticUpdatedAt || meta.slowRestUpdatedAt;
  return mobileTime(raw);
}

function toneClass(tone: OverviewTone): string {
  return `is-${tone}`;
}

function screenTone(state: OverviewDerivedState): OverviewTone {
  if (state.scenario === "no-snapshot") return "missing";
  if (state.scenario === "single") return "ok";
  return state.verdict.level;
}

function statusLabel(state: OverviewDerivedState): string {
  if (state.scenario === "no-snapshot") return "快照缺";
  if (state.scenario === "all-offline" || state.facts.wan.allOffline) return "断链";
  if (state.scenario === "resource-full") return "超阈";
  if (state.scenario === "interfaces-down") return "异常";
  if (state.scenario === "collection-down") return "缓存";
  if (state.scenario === "single") return "良好";
  if (state.verdict.level === "warn") return "需确认";
  return "在线";
}

function trustText(state: OverviewDerivedState): string {
  if (state.scenario === "no-snapshot") return "业务快照缺失";
  if (state.scenario === "collection-down" || state.facts.collection.dataStale || state.facts.freshness.history) return "缓存快照";
  return "实时可信";
}

function stripRest(label: string): string {
  return clean(label.replace(/^REST\s*/i, ""), "可用");
}

function stripSsh(label: string): string {
  return clean(label.replace(/^SSH\s*/i, ""), "可用");
}

function channelStatus(state: OverviewDerivedState): ChannelReading[] {
  if (state.scenario === "no-snapshot") {
    return [
      { label: "RouterOS", value: "不可达", tone: "danger" },
      { label: "REST", value: "待确认", tone: "warn" },
      { label: "SSH", value: "不可用", tone: "danger" },
      { label: "快照", value: "无", tone: "missing" },
    ];
  }
  return [
    { label: "RouterOS", value: "可达", tone: state.facts.collection.level },
    { label: "REST", value: stripRest(state.facts.collection.restLabel), tone: state.facts.collection.level },
    { label: "SSH", value: stripSsh(state.facts.collection.sshLabel), tone: state.facts.collection.level },
    { label: "快照", value: trustText(state), tone: state.facts.collection.credibilityTone },
  ];
}

function resourceMetrics(state: OverviewDerivedState): ResourceReading[] {
  const hidden = state.scenario === "no-snapshot";
  return [
    { key: "processor" as const, label: "处理器", value: toNumber(state.facts.resource.cpu), threshold: 85 },
    { key: "memory" as const, label: "内存", value: toNumber(state.facts.resource.memory), threshold: 85 },
    { key: "disk" as const, label: "磁盘", value: toNumber(state.facts.resource.disk), threshold: 90 },
  ].map((item) => ({
    ...item,
    display: hidden ? "不展示" : formatPercent(item.value, state.scenario === "resource-full" ? 1 : 0),
    tone: hidden ? "missing" : item.value >= item.threshold ? "danger" : "ok",
  }));
}

function sparkPoints(values: number[], maxValue: number, width = 312, height = 62): string {
  const max = Math.max(1, maxValue, ...values);
  const step = values.length > 1 ? width / (values.length - 1) : width;
  return values.map((value, index) => {
    const x = Number((index * step).toFixed(1));
    const y = Number((height - (Math.max(0, value) / max) * (height - 12) - 6).toFixed(1));
    return `${x},${y}`;
  }).join(" ");
}

function lastSparkPoint(points: string): { x: number; y: number } {
  const last = points.trim().split(/\s+/).pop() || "0,0";
  const [x, y] = last.split(",").map((item) => Number(item));
  return { x: Number.isFinite(x) ? x : 0, y: Number.isFinite(y) ? y : 0 };
}

function V420Nav({ snapshot, state }: MobileOverviewHomeProps) {
  const name = clean(snapshot.identity || snapshot.name || snapshot.deviceName || state.facts.device.identity || "爱快路由");
  const version = clean(snapshot.version || snapshot.routerosVersion || state.facts.device.version || "RouterOS");
  const recent = latestSuccess(snapshot, state);
  return (
    <nav className="ik-v420-nav ik-v240-nav" aria-label="手机导航" data-overview-mobile-v420-nav="ios-navigation" data-overview-mobile-v240-nav="app-navigation">
      <button aria-label="打开菜单" type="button">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
      </button>
      <div className="ik-v240-title" data-overview-mobile-primary-title="device">
        <b>{name}</b>
        <span>RouterOS {version} · 最近 {recent}</span>
      </div>
      <strong className={`ik-v240-status ${toneClass(screenTone(state))}`} data-overview-mobile-primary-status="device-state"><i />{statusLabel(state)}</strong>
    </nav>
  );
}

function V420LineChart({ chart }: { chart: MobileTrendChartModel }) {
  const down = chart.down.length ? chart.down : [1, 1, 1];
  const up = chart.up.length ? chart.up : [0.45, 0.45, 0.45];
  const max = Math.max(1, ...down, ...up);
  const downPoints = sparkPoints(down, max, 312, 52);
  const upPoints = sparkPoints(up, max, 312, 52);
  const focus = lastSparkPoint(downPoints);
  const peakValue = Math.max(...down);
  const peakIndex = Math.max(0, down.findIndex((value) => value === peakValue));
  const peakX = down.length > 1 ? Number(((peakIndex * 312) / (down.length - 1)).toFixed(1)) : 156;
  const peakY = Number((52 - (Math.max(0, peakValue) / max) * 40 - 6).toFixed(1));
  return (
    <svg
      className="ik-v420-line-chart"
      viewBox="0 0 312 72"
      role="img"
      aria-label={`${chart.windowText} WAN 下载上传趋势，峰值 ${chart.peakLabel}，采样 ${chart.sampleText}`}
      data-overview-chart-type="mini-line"
      data-overview-scene-chart="mobile-wan-rate-sparkline"
      data-overview-mobile-first-visual="thin-wan-sparkline"
      data-overview-mobile-v420-visual="thin-wan-sparkline"
      data-overview-line-source={chart.source}
      data-overview-mobile-chart-window={chart.windowText}
      data-overview-mobile-chart-peak={chart.peakLabel}
      data-overview-mobile-chart-sample={chart.sampleText}
    >
      <path className="ik-v420-gridline" d="M0 13 H312 M0 31 H312 M0 47 H312" />
      <path className="ik-v420-area" d={`M0 52 L${downPoints} L312 52 Z`} />
      <polyline className="ik-v420-curve is-main" points={downPoints} />
      <polyline className="ik-v420-curve is-soft" points={upPoints} />
      <circle className="ik-v420-peak-dot" cx={peakX} cy={peakY} r="2.6" />
      <circle className="ik-v420-focus-dot" cx={focus.x} cy={focus.y} r="2.8" />
      <text x="0" y="68">{chart.windowText}</text>
      <text x="156" y="68" textAnchor="middle">峰 {chart.peakLabel}</text>
      <text x="312" y="68" textAnchor="end">当前 {chart.currentLabel}</text>
    </svg>
  );
}

function V420TrendVisual({ model }: { model: MobileOverviewModel }) {
  const chart = model.hero.trend;
  return (
    <div className="ik-v812-trend-visual" data-overview-mobile-chart-readout="current-peak-window">
      <V420LineChart chart={chart} />
      <aside>
        {chart.readouts.map((item) => (
          <span className={toneClass(item.tone)} key={`${item.label}-${item.value}`}>
            <em>{item.label}</em>
            <b>{item.value}</b>
          </span>
        ))}
      </aside>
    </div>
  );
}

function V420PortMatrix({ snapshot, state }: MobileOverviewHomeProps) {
  const ports = buildMobileOverviewModel(snapshot, state).wanPorts;
  return (
    <div
      className="ik-v420-port-matrix"
      data-overview-chart-type="matrix"
      data-overview-mobile-first-visual="wan-eight-port-matrix"
      data-overview-mobile-v420-visual="wan-eight-port-matrix"
    >
      {ports.map((port) => {
        const offline = port.tone === "danger";
        return (
          <span className={offline ? "is-danger" : "is-ok"} data-port={port.label} key={port.id}>
            <i />
            <b>{port.label}</b>
            <small>{port.name}</small>
            <em>{port.note}</em>
          </span>
        );
      })}
    </div>
  );
}

function V420ChannelRail({ state }: { state: OverviewDerivedState }) {
  return (
    <div
      className="ik-v420-channel-rail"
      data-overview-chart-type="matrix"
      data-overview-mobile-first-visual="routeros-rest-ssh-snapshot-status-line"
      data-overview-mobile-v420-visual="routeros-rest-ssh-snapshot-status-line"
    >
      {channelStatus(state).map((item) => (
        <span className={toneClass(item.tone)} key={item.label}>
          <i />
          <b>{item.label}</b>
          <em>{item.value}</em>
        </span>
      ))}
    </div>
  );
}

function firstDownInterface(snapshot: OverviewRawSnapshot): OverviewRawInterfaceRow | undefined {
  return interfaceRows(snapshot).find((row) => row.running === false) || interfaceRows(snapshot)[0];
}

function V420InterfaceFlow({ snapshot, state }: MobileOverviewHomeProps) {
  const rows = interfaceRows(snapshot).filter((row) => row.running === false).slice(0, 2);
  const visible = rows.length ? rows : [firstDownInterface(snapshot)].filter(Boolean) as OverviewRawInterfaceRow[];
  return (
    <div
      className="ik-v420-interface-list"
      data-overview-chart-type="status-list"
      data-overview-mobile-first-visual="interface-parent-carrier-chain-list"
      data-overview-mobile-v420-visual="interface-parent-carrier-chain-list"
    >
      {visible.map((row, index) => (
        <span key={`${clean(row.name || row.interface, `接口${index + 1}`)}-${index}`}>
          <i />
          <b>{clean(row.name || row.interface, `接口${index + 1}`)}</b>
          <em>{clean(row.parent || row.master || row.bridge, "承载待确认")} · {index === 0 ? `${formatNumber(state.facts.interfaces.down)} Down` : "Down"}</em>
        </span>
      ))}
    </div>
  );
}

function V420ResourceVisual({ state }: { state: OverviewDerivedState }) {
  const metrics = resourceMetrics(state);
  const peakKey = metrics.reduce((max, item) => (item.value > max.value ? item : max), metrics[0]).key;
  return (
    <div
      className="ik-v420-resource-visual ik-mobile-resource-sparks ik-v420-resource-meter-set is-vertical-ledger ik-v620-pressure-visual"
      data-overview-chart-type="bar"
      data-overview-scene-chart="mobile-resource-vertical-ledger"
      data-overview-mobile-first-visual="processor-memory-disk"
      data-overview-mobile-v420-visual="processor-memory-disk-thin-bars"
    >
      <header aria-hidden="true">
        <b>资源</b>
        <span>阈值 / 持续</span>
      </header>
      {metrics.map((item) => {
        const value = Number.isFinite(item.value) ? Math.max(0, Math.min(100, item.value)) : 0;
        const meterStyle = { "--meter": `${value}%` } as CSSProperties;
        return (
          <span className={`ik-mobile-resource-spark ik-v420-resource-meter ${toneClass(item.tone)}${item.key === peakKey ? " is-peak" : ""}`} key={item.key} style={meterStyle}>
            <b>{item.label}</b>
            <strong className="ik-v802-ring-value">{item.display.replace(/\.0%$/, "%")}</strong>
            <small>阈{item.threshold}%</small>
            <em>持续{item.tone === "danger" ? "6/6" : "0/6"}</em>
            <i><i style={{ width: `${value}%` }} /></i>
          </span>
        );
      })}
    </div>
  );
}

function V420HeroVisual(props: MobileOverviewHomeProps & { model: MobileOverviewModel }) {
  if (props.model.hero.visualKind === "wan-ports") return <V420PortMatrix {...props} />;
  if (props.model.hero.visualKind === "resource-bars") return <V420ResourceVisual state={props.state} />;
  if (props.model.hero.visualKind === "interface-list") return <V420InterfaceFlow {...props} />;
  if (props.model.hero.visualKind === "trust-channels") return <V420ChannelRail state={props.state} />;
  return <V420TrendVisual model={props.model} />;
}

function V420HeroMetrics({ model }: { model: MobileOverviewModel }) {
  const readings = model.hero.facts;
  if (!model.hero.showMetrics || !readings.length) return null;
  return (
    <div className="ik-v420-hero-stats" data-overview-mobile-core-block="hero-stats" data-overview-mobile-hero-metrics="download-upload-latency-connections">
      {readings.map((item, index) => (
        <span className={`${toneClass(item.tone)} ${index === 0 ? "is-primary" : ""}`} key={`${item.label}-${item.value}`}>
          <em>{item.label}</em>
          <b>{item.value}</b>
          <small>{item.note}</small>
        </span>
      ))}
    </div>
  );
}

function V420HeroTrustRail({ model }: { model: MobileOverviewModel }) {
  return (
    <div className="ik-v503-hero-pills ik-v830-trust-rail" aria-label="网络可信度">
      {model.trustPlanes.map((item) => (
        <span className={toneClass(item.tone)} key={item.id}>
          <b>{item.label}</b>
          <strong>{item.value}</strong>
        </span>
      ))}
    </div>
  );
}

function statusTimelineRows(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): NativeRow[] {
  return buildMobileOverviewModel(snapshot, state).statusRows;
}

function V420StatusTimeline(props: MobileOverviewHomeProps) {
  const rows = statusTimelineRows(props.snapshot, props.state);
  return (
    <section className="ik-v420-timeline ik-v240-strip" data-overview-mobile-core-block="status-timeline" data-overview-mobile-v240-status-strip="timeline-not-kpi-grid" data-overview-mobile-no-four-kpi-grid="true">
      {rows.map((row) => (
        <article className={`ik-v420-timeline-row ${toneClass(row.tone)}`} data-row-id={row.id} key={row.id}>
          <i aria-hidden="true" />
          <b className="ik-v821-row-title">{row.title}</b>
          <strong>{row.value}</strong>
          <em className="ik-v821-row-note">{row.note}</em>
        </article>
      ))}
    </section>
  );
}

function V420Hero(props: MobileOverviewHomeProps) {
  const { snapshot, state } = props;
  const tone = screenTone(state);
  const model = buildMobileOverviewModel(snapshot, state);
  return (
    <section
      className={`ik-v420-hero ik-v240-hero ik-v159-network-hero ${toneClass(tone)}`}
      data-overview-mobile-alert={tone}
      data-overview-mobile-v420-hero="network-state-home"
      data-overview-mobile-v240-hero="network-state-home"
      data-overview-mobile-v159-main-hero="network-state-home"
      data-overview-mobile-first-visual="scenario-specific"
      data-overview-mobile-first-microchart="true"
      data-overview-mobile-v620-hero="conclusion-two-numbers-one-chart"
      data-overview-mobile-priority={model.priority}
      data-overview-mobile-visual-kind={model.hero.visualKind}
      data-overview-mobile-hero-metrics={model.hero.showMetrics ? "visible" : "suppressed"}
    >
      <header className="ik-v620-hero-head">
        <h1 data-overview-primary-conclusion="true">{model.hero.title}</h1>
        <p className="ik-v503-hero-copy">{model.hero.subtitle}</p>
      </header>
      <div className="ik-v620-hero-stage">
        <V420HeroMetrics model={model} />
        <div className="ik-v420-visual ik-v240-visual ik-v240-traffic">{V420HeroVisual({ ...props, model })}</div>
      </div>
      <V420HeroTrustRail model={model} />
    </section>
  );
}

function V420ResourceMeter({ metric }: { metric: ResourceReading }) {
  const value = Number.isFinite(metric.value) ? Math.max(0, Math.min(100, metric.value)) : 0;
  return (
    <span className={`ik-v420-resource-row ${toneClass(metric.tone)}`}>
      <b>{metric.label}</b>
      <strong>{metric.display}</strong>
      <i className="ik-v420-resource-line" aria-hidden="true">
        <i style={{ width: `${value}%` }} />
      </i>
      <em>阈值 {metric.threshold}%</em>
    </span>
  );
}

function V420Resource({ state }: { state: OverviewDerivedState }) {
  if (state.scenario === "no-snapshot") {
    const boundary = [
      { label: "WAN", value: "不展示", note: "无业务快照" },
      { label: "资源", value: "不展示", note: "不推断数值" },
      { label: "终端", value: "不展示", note: "业务列表禁显" },
    ];
    return (
      <section className="ik-v420-resource is-boundary" data-overview-mobile-core-block="resource">
        <header>
          <b>展示边界</b>
          <span>业务不展示</span>
        </header>
        <div>
          {boundary.map((item) => (
            <span className="ik-v420-boundary-row" key={item.label}>
              <b>{item.label}</b>
              <strong>{item.value}</strong>
              <em>{item.note}</em>
            </span>
          ))}
        </div>
      </section>
    );
  }
  return (
    <section className={`ik-v420-resource ${state.scenario === "resource-full" ? "is-hot" : ""}`} data-overview-mobile-core-block="resource">
      <header>
        <b>资源</b>
        <span>{state.scenario === "resource-full" ? "压力过高" : "余量正常"}</span>
      </header>
      <div>
        {resourceMetrics(state).map((metric) => <V420ResourceMeter metric={metric} key={metric.key} />)}
      </div>
    </section>
  );
}

function V420List(props: MobileOverviewHomeProps) {
  const model = buildMobileOverviewModel(props.snapshot, props.state);
  const rows: AppRankingRow[] = model.primaryList.rows;
  return (
    <section className="ik-v420-list ik-v420-app-list ik-v240-list" data-overview-mobile-rank-list="terminal-total-traffic-list" data-overview-mobile-v420-list="native-router-list" data-overview-mobile-v240-list="terminal-ranking">
      <header>
        <b>{model.primaryList.title}</b>
        <span>{model.primaryList.meta}</span>
      </header>
      {rows.map((row) => (
        <article className={`ik-v420-list-row ${toneClass(row.tone)}`} key={row.id}>
          <i className="ik-v503-device-icon" data-rank={row.rank}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d={rankingIconPath(row)} /></svg>
          </i>
          <span>
            <b>{row.name}{row.kind ? <small className="ik-v807-kind">{row.kind}</small> : null}</b>
            <em>{row.meta}</em>
            {row.percent > 0 ? <u aria-hidden="true"><i style={{ width: `${row.percent}%` }} /></u> : null}
          </span>
          <strong>
            <b>{row.value}</b>
            <small>{row.status || row.kind || "在线"}</small>
          </strong>
        </article>
      ))}
    </section>
  );
}

function rankingIconPath(row: AppRankingRow): string {
  const text = `${row.name} ${row.kind ?? ""} ${row.meta}`.toLowerCase();
  if (/iphone|手机|phone|访客/.test(text)) return "M8 3h8a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm3 15h2";
  if (/mac|book|电脑|pc|主机|下载/.test(text)) return "M4 5h16v10H4zM2 19h20M9 15v4M15 15v4";
  if (/nas|存储|server/.test(text)) return "M5 4h14v6H5zM5 14h14v6H5zM8 7h.01M8 17h.01";
  if (/tv|电视|盒子/.test(text)) return "M4 6h16v11H4zM9 20h6M12 17v3";
  if (/摄像|camera/.test(text)) return "M4 8h10v8H4zM14 11l6-3v8l-6-3z";
  if (/业务|快照|采集/.test(text)) return "M5 5h14v14H5zM8 9h8M8 13h8M8 17h5";
  return "M6 8h12v8H6zM9 5h6M9 19h6M12 5v3M12 16v3";
}

function V420HomeSurface(props: MobileOverviewHomeProps) {
  return (
    <section className="ik-v420-surface ik-v240-facts" data-overview-mobile-core-block="ios-router-home-surface" data-overview-mobile-v240-facts="timeline-resource-ranking">
      <V420StatusTimeline {...props} />
      <V420List {...props} />
    </section>
  );
}

function V420Tabs() {
  const tabs = [
    { label: "首页", active: true, path: "M4 11.5 12 5l8 6.5V20a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1z" },
    { label: "WAN", active: false, path: "M4 12h16M7 8h10M7 16h10" },
    { label: "接口", active: false, path: "M6 7h12v10H6zM9 17v3M15 17v3M9 4v3M15 4v3" },
    { label: "终端", active: false, path: "M5 7h14v8H5zM8 19h8M12 15v4M7 10h.01M11 10h.01M15 10h.01" },
    { label: "日志", active: false, path: "M7 5h10v14H7zM10 9h4M10 13h4" },
  ];
  return (
    <nav className="ik-v420-tabs ik-v240-tabs" aria-label="底部导航" data-overview-mobile-bottom-tab="home-wan-interface-terminal-log" data-overview-mobile-v159-tabbar="bottom-entry" data-overview-mobile-v240-tabs="bottom-entry">
      {tabs.map((item) => (
        <button className={item.active ? "is-active" : ""} type="button" key={item.label}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d={item.path} /></svg>
          {item.label}
        </button>
      ))}
    </nav>
  );
}



export {
  V420Nav as StatusHeader,
  V420Hero as IncidentHero,
  V420HomeSurface as HomeSurface,
  V420Tabs as BottomTabs,
};
