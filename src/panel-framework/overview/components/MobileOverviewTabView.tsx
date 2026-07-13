import { formatNumber, type OverviewTone } from "../index";
import type { MobileOverviewModel } from "../mobileOverviewModel";
import type { MobileBottomTabId } from "./BottomTabs";
import {
  mobileInterfaceRows,
  mobileLogRows,
  mobileTerminalRows,
  mobileWanRows,
  type MobileTabRow,
} from "./mobileOverviewTabRows";
import type { MobileOverviewHomeProps } from "./MobileOverviewTypes";

type DetailTabId = Exclude<MobileBottomTabId, "home">;

interface MobileOverviewTabViewProps extends MobileOverviewHomeProps {
  activeTab: DetailTabId;
  model: MobileOverviewModel;
}

interface MobileTabViewConfig {
  eyebrow: string;
  title: string;
  summary: string;
  note: string;
  tone: OverviewTone;
  rows: MobileTabRow[];
}

function tabConfig({ activeTab, model, snapshot, state }: MobileOverviewTabViewProps): MobileTabViewConfig {
  if (activeTab === "wan") {
    return {
      eyebrow: "出口与默认路由",
      title: "WAN",
      summary: `${formatNumber(state.facts.wan.online)}/${formatNumber(state.facts.wan.total)} 在线`,
      note: state.facts.route.label,
      tone: state.facts.wan.allOffline ? "danger" : state.facts.wan.offline ? "warn" : "trust",
      rows: mobileWanRows(model),
    };
  }
  if (activeTab === "interface") {
    return {
      eyebrow: "承载接口",
      title: "接口",
      summary: state.facts.interfaces.down > 0 ? `${formatNumber(state.facts.interfaces.down)} 个 Down` : "全部运行",
      note: `${formatNumber(state.facts.interfaces.total)} 个接口`,
      tone: state.facts.interfaces.down > 0 ? "warn" : "trust",
      rows: mobileInterfaceRows(snapshot),
    };
  }
  if (activeTab === "terminal") {
    return {
      eyebrow: "在线终端与连接",
      title: "终端",
      summary: `${formatNumber(state.facts.connections.active)} 活动`,
      note: `${formatNumber(state.facts.connections.total)} 条连接`,
      tone: "trust",
      rows: mobileTerminalRows(snapshot),
    };
  }
  return {
    eyebrow: "只读采集记录",
    title: "日志",
    summary: state.facts.collection.credibilityLabel,
    note: `失败 ${formatNumber(state.facts.failures.count)} 项 · 最近 ${model.header.recent}`,
    tone: state.facts.collection.credibilityTone,
    rows: mobileLogRows(model, state),
  };
}

export function MobileOverviewTabView(props: MobileOverviewTabViewProps) {
  const { activeTab, model, state } = props;
  const businessHidden = state.scenario === "no-snapshot" && activeTab !== "log";
  const baseConfig = tabConfig(props);
  const config = businessHidden ? {
    ...baseConfig,
    summary: "不可判",
    note: "无业务快照，不展示不可验证数值",
    tone: "missing" as OverviewTone,
    rows: [{
      id: `${activeTab}-credibility-boundary`,
      label: "可信边界",
      value: "等待快照",
      note: `${baseConfig.title} 数据暂不展示`,
      tone: "missing" as OverviewTone,
    }],
  } : baseConfig;
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
      data-overview-mobile-tab-credibility={businessHidden ? "business-hidden" : activeTab === "log" ? "collection-evidence" : "business-visible"}
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
