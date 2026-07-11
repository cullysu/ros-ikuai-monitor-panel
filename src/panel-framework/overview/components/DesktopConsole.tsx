import { formatNumber, type OverviewDerivedState, type OverviewTone } from "../index";
import { OVERVIEW_LOW_NOISE_CONSOLE_TOKEN_CONTRACT } from "../mobileOverviewTokens";
import {
  DESKTOP_IKUAI_SHORT_NAV_CONTRACT,
  desktopCoreText,
  verdictContractText,
  type OverviewPanelProps,
} from "../desktopOverviewHelpers";
import { buildDesktopOverviewScene } from "../desktopOverviewScenes";
import { DesktopDecisionRail } from "./DesktopDecisionRail";

function DesktopShortNav({ state }: { state: OverviewDerivedState }) {
  const items = [
    { id: "overview", label: "状态总览", value: state.verdict.level === "ok" ? "正常" : state.verdict.level === "danger" ? "异常" : "关注", tone: state.verdict.level },
    { id: "wan", label: "多出口", value: state.scenario === "no-snapshot" ? "待判" : `${formatNumber(state.facts.wan.online)}/${formatNumber(state.facts.wan.total)}`, tone: state.facts.wan.allOffline ? "danger" : state.facts.wan.offline ? "warn" : "ok" },
    { id: "interface", label: "接口/VLAN", value: state.facts.interfaces.down > 0 ? `${formatNumber(state.facts.interfaces.down)} Down` : "承载可用", tone: state.facts.interfaces.down > 0 ? "warn" : "trust" },
    { id: "terminal", label: "在线终端", value: state.scenario === "no-snapshot" ? "隐藏" : formatNumber(state.facts.connections.active), tone: state.scenario === "no-snapshot" ? "missing" : "trust" },
    { id: "log", label: "采集日志", value: state.facts.collection.credibilityLabel, tone: state.facts.collection.credibilityTone },
  ] satisfies { id: string; label: string; value: string; tone: OverviewTone }[];
  return (
    <nav
      className="ro-desktop-nav"
      aria-label="桌面导航"
      data-overview-desktop-nav="ikuai-short-left-rail"
      data-overview-desktop-nav-contract={DESKTOP_IKUAI_SHORT_NAV_CONTRACT}
      data-overview-desktop-nav-labels="状态总览/多出口/接口/VLAN/在线终端/采集日志"
      data-overview-desktop-nav-no-explainer-copy="true"
      data-overview-desktop-v1069-nav-active="neutral-console-ink-no-blue-glow"
    >
      {items.map((item, index) => (
        <span className={index === 0 ? "is-active" : undefined} data-overview-desktop-nav-item={item.id} data-tone={item.tone} key={item.id}>
          <b>{item.label}</b>
          <em>{item.value}</em>
        </span>
      ))}
    </nav>
  );
}

export function DesktopWorkspace({ snapshot, state }: OverviewPanelProps) {
  const sections = buildDesktopOverviewScene(snapshot, state);

  return (
    <div
      className="ro-desktop-grid ik-home-layout"
      data-overview-desktop-layout="fixed-summary-keymetrics-left-right-bottom"
      data-overview-desktop-hierarchy="conclusion-key-metrics-evidence"
      data-overview-desktop-hierarchy-tier="3-evidence"
      data-overview-desktop-skeleton="top-six-summary-left-network-wan-right-resource-collection-bottom-interface-events"
      data-overview-desktop-surface="ikuai40-admin-console-not-consumer-app-cards"
      data-overview-desktop-left-rail="network-wan"
      data-overview-desktop-right-rail="resource-collection"
      data-overview-desktop-bottom-rail="interface-events"
      data-overview-desktop-detail
      data-overview-desktop-workspace
      data-overview-desktop-core-text={desktopCoreText(snapshot, state)}
      data-overview-low-noise-console-token-contract={OVERVIEW_LOW_NOISE_CONSOLE_TOKEN_CONTRACT}
      data-overview-desktop-v1020-public-product-polish="flat-status-bus-low-line-noise-integrated-wan-reading"
      data-overview-desktop-v1030-nav-polish="short-ikuai-left-rail-low-noise-status-bus"
      data-overview-desktop-copy-policy="business-first-routeros-fields-translated-in-evidence"
      data-overview-desktop-toy-nav-leak-guard="desktop-content-icon-tabs-removed"
      data-overview-desktop-content-icon-tabs="desktop-hides-content-icon-tabs"
      data-overview-verdict-panel={verdictContractText(snapshot, state)}
      data-overview-trend-compact="framework-ledger"
      data-overview-no-snapshot-grid={state.scenario === "no-snapshot" ? "collection-chain-business-boundary-recovery" : undefined}
      data-overview-no-snapshot-detail={state.scenario === "no-snapshot" ? "three-visible-evidence-sections-raw-fields-collapsed" : undefined}
      data-overview-desktop-v1042-no-snapshot-floor={state.scenario === "no-snapshot" ? "single-collapsed-raw-evidence" : undefined}
      data-overview-no-snapshot-left-main={state.scenario === "no-snapshot" ? "collection-chain-business-boundary" : undefined}
      data-overview-no-snapshot-right-side={state.scenario === "no-snapshot" ? "recovery-line" : undefined}
      data-overview-no-snapshot-wan-rate-layout-guard={state.scenario === "no-snapshot" ? "no-wan-rate-panel-no-zero-rate-no-rate-spacer" : undefined}
      data-overview-desktop-effective-content-height="760"
      data-overview-desktop-redline-markers="no-empty-left60-no-duplicate-boundary-no-nosnapshot-wan-rate-no-toy-tabs"
      data-overview-no-snapshot-no-wan-rate-placeholder={state.scenario === "no-snapshot" ? "business-rates-hidden" : undefined}
      data-overview-no-snapshot-zero-rate-guard={state.scenario === "no-snapshot" ? "replace-zero-rate-with-hidden" : undefined}
      data-overview-side-table-mode="three-col-no-badge"
      data-overview-desktop-fixed-skeleton="left-network-wan-right-resource-collection-bottom-interface-events"
      data-overview-side-column-ratio="24-24-52"
      data-overview-side-badge-mode="inline-text-no-column"
      data-overview-side-evidence-wrap="third-col-no-ellipsis"
      data-overview-side-evidence-no-ellipsis="true"
      data-overview-desktop-ratio="chart-table-52-48"
      data-overview-desktop-visual-table-balance="52-48-min45-each"
      data-overview-desktop-scene={state.scenario}
      data-overview-normal-first-screen={state.scenario === "single" || state.scenario === "fleet" ? "traffic-plus-evidence" : undefined}
      data-overview-normal-traffic-under-chart={state.scenario === "single" || state.scenario === "fleet" ? "current-wan-top3-route-sampling-samples-peak-success" : undefined}
      data-overview-normal-traffic-under-chart-facts={state.scenario === "single" || state.scenario === "fleet" ? "7" : undefined}
      data-overview-no-empty-traffic-panel={state.scenario === "single" || state.scenario === "fleet" ? "true" : undefined}
      data-overview-resource-first-screen={state.scenario === "resource-full" ? "danger-bars-three-metric-ledger-pressure-interface-top5" : undefined}
      data-overview-resource-first-screen-structure={state.scenario === "resource-full" ? "danger-bars-three-metric-ledger-pressure-interface-top5" : undefined}
      data-overview-resource-no-short-card={state.scenario === "resource-full" ? "content-sized-resource-evidence" : undefined}
      data-overview-resource-no-spark-duplicate={state.scenario === "resource-full" ? "danger-bars-replace-small-sparklines" : undefined}
      data-overview-collection-channel-priority={state.scenario === "collection-down" ? "rest-ssh-snapshot-before-resource" : undefined}
      data-overview-collection-resource-deferred={state.scenario === "collection-down" ? "true" : undefined}
      data-overview-collection-only-first-screen={state.scenario === "collection-down" ? "rest-ssh-snapshot-success-timeline-no-resource" : undefined}
      data-overview-interface-relation-mode={state.scenario === "interfaces-down" ? "deferred" : undefined}
      data-overview-interface-top-block={state.scenario === "interfaces-down" ? "object-status-only" : undefined}
      data-overview-interface-top-node={state.scenario === "interfaces-down" ? "object-status-only-no-relation-text" : undefined}
      data-overview-interface-relation-policy={state.scenario === "interfaces-down" ? "top-object-status-details-in-carrier-table" : undefined}
      data-overview-desktop-ikuai40-console="top-six-left-network-wan-right-resource-collection-bottom-interface-events"
    >
      <DesktopShortNav state={state} />
      <DesktopDecisionRail snapshot={snapshot} state={state} />
      <div className="ro-col is-main stack" data-overview-desktop-rail="network-wan" data-overview-desktop-fixed-area="left-main">{sections.main}</div>
      <div className="ro-col is-side stack ik-home-side-stack" data-overview-desktop-rail="resource-collection" data-overview-desktop-fixed-area="right-main">{sections.side}</div>
      {sections.bottom.length > 0 ? <div className={`ro-col is-bottom stack${state.scenario === "no-snapshot" ? " ro-no-snapshot-floor" : ""}`} style={{ gridColumn: "1 / -1" }} data-overview-desktop-rail="interface-events" data-overview-desktop-fixed-area="bottom" data-overview-desktop-v1042-no-snapshot-floor-rail={state.scenario === "no-snapshot" ? "single-collapsed-raw-evidence" : undefined}>{sections.bottom}</div> : null}
    </div>
  );
}
