import { formatNumber, formatRate, type OverviewTone } from "../index";
import type { MobileOverviewModel } from "../mobileOverviewModel";
import type { MobileBottomTabId } from "./BottomTabs";
import type { MobileOverviewHomeProps } from "./MobileOverviewTypes";

type DetailTabId = Exclude<MobileBottomTabId, "home">;

interface MobileTabRow {
  id: string;
  label: string;
  value: string;
  note: string;
  tone: OverviewTone;
}

interface MobileOverviewTabViewProps extends MobileOverviewHomeProps {
  activeTab: DetailTabId;
  model: MobileOverviewModel;
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

function text(value: unknown, fallback = "未记录"): string {
  const normalized = String(value ?? "").trim();
  return normalized || fallback;
}

function number(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function wanRows(model: MobileOverviewModel): MobileTabRow[] {
  return model.wanPorts.slice(0, 8).map((port) => ({
    id: port.id,
    label: port.name,
    value: port.stateText,
    note: `${port.roleLabel} · ${port.carrier || port.note}`,
    tone: port.tone,
  }));
}

function interfaceRows(snapshot: MobileOverviewHomeProps["snapshot"]): MobileTabRow[] {
  const rows = Array.isArray(snapshot.interfaces) ? snapshot.interfaces : [];
  return rows.slice(0, 8).map((item, index) => {
    const name = text(item.name || item.interface, `接口 ${index + 1}`);
    const running = item.running !== false && item.disabled !== true;
    const carrier = text(item.parent || item.master || item.bridge || item.pppoeOut || item.pppoe, "独立接口");
    const rate = number(item.rxRate ?? item.downRate) + number(item.txRate ?? item.upRate);
    return {
      id: `${name}-${index}`,
      label: name,
      value: running ? "运行" : "Down",
      note: `${text(item.type || item.role, "接口")} · ${carrier}${rate > 0 ? ` · ${formatRate(rate)}` : ""}`,
      tone: running ? "trust" : "danger",
    };
  });
}

function terminalRows(snapshot: MobileOverviewHomeProps["snapshot"]): MobileTabRow[] {
  const source = Array.isArray(snapshot.terminals) && snapshot.terminals.length > 0
    ? snapshot.terminals
    : Array.isArray(snapshot.connections?.topIps)
      ? snapshot.connections.topIps
      : [];
  return source.slice(0, 8).map((item, index) => {
    const value = record(item);
    const address = text(value.ip || value.address || value.host, `终端 ${index + 1}`);
    const name = text(value.name || value.hostname || value.device, address);
    const rate = number(value.rate ?? value.bytes ?? value.traffic ?? value.value);
    return {
      id: `${address}-${index}`,
      label: name,
      value: rate > 0 ? formatRate(rate) : "在线",
      note: address === name ? "连接记录" : address,
      tone: "trust",
    };
  });
}

function logRows(model: MobileOverviewModel, state: MobileOverviewHomeProps["state"]): MobileTabRow[] {
  const channels = model.collectionTrust.map((channel, index) => ({
    id: `channel-${index}`,
    label: channel.label,
    value: channel.value,
    note: "只读采集通道",
    tone: channel.tone,
  }));
  const failures = state.facts.failures.entries.slice(0, 5).map((entry, index) => ({
    id: `failure-${index}`,
    label: text(entry.name || entry.group, "采集失败"),
    value: "需确认",
    note: text(entry.message || entry.at, "未记录详情"),
    tone: "warn" as OverviewTone,
  }));
  return [...channels, ...failures].slice(0, 8);
}

export function MobileOverviewTabView({ activeTab, model, snapshot, state }: MobileOverviewTabViewProps) {
  const config = activeTab === "wan"
    ? {
        eyebrow: "出口与默认路由",
        title: "WAN",
        summary: `${formatNumber(state.facts.wan.online)}/${formatNumber(state.facts.wan.total)} 在线`,
        note: state.facts.route.label,
        tone: state.facts.wan.allOffline ? "danger" as OverviewTone : state.facts.wan.offline ? "warn" as OverviewTone : "trust" as OverviewTone,
        rows: wanRows(model),
      }
    : activeTab === "interface"
      ? {
          eyebrow: "承载接口",
          title: "接口",
          summary: state.facts.interfaces.down > 0 ? `${formatNumber(state.facts.interfaces.down)} 个 Down` : "全部运行",
          note: `${formatNumber(state.facts.interfaces.total)} 个接口`,
          tone: state.facts.interfaces.down > 0 ? "warn" as OverviewTone : "trust" as OverviewTone,
          rows: interfaceRows(snapshot),
        }
      : activeTab === "terminal"
        ? {
            eyebrow: "在线终端与连接",
            title: "终端",
            summary: `${formatNumber(state.facts.connections.active)} 活动`,
            note: `${formatNumber(state.facts.connections.total)} 条连接`,
            tone: "trust" as OverviewTone,
            rows: terminalRows(snapshot),
          }
        : {
            eyebrow: "只读采集记录",
            title: "日志",
            summary: state.facts.collection.credibilityLabel,
            note: `失败 ${formatNumber(state.facts.failures.count)} 项 · 最近 ${model.header.recent}`,
            tone: state.facts.collection.credibilityTone,
            rows: logRows(model, state),
          };
  const rows = config.rows.length > 0 ? config.rows : [{
    id: "empty",
    label: "暂无明细",
    value: "等待采集",
    note: "当前快照没有可展示记录",
    tone: "missing" as OverviewTone,
  }];

  return (
    <section
      className="ik-mobile-tab-view"
      id={`mobile-${activeTab}-view`}
      data-overview-mobile-tab-view={activeTab}
      data-overview-mobile-tab-view-contract="mobile-native-summary-flat-list-no-desktop-table"
    >
      <header className="ik-mobile-tab-head">
        <div>
          <span>{config.eyebrow}</span>
          <h1>{config.title}</h1>
        </div>
        <strong data-tone={config.tone}>{config.summary}</strong>
        <p>{config.note}</p>
      </header>
      <div className="ik-mobile-tab-list" role="list">
        {rows.map((row) => (
          <article data-tone={row.tone} key={row.id} role="listitem">
            <i aria-hidden="true" />
            <div><b>{row.label}</b><small>{row.note}</small></div>
            <strong>{row.value}</strong>
          </article>
        ))}
      </div>
    </section>
  );
}
