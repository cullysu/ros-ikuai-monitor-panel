import { ChevronLeft, ChevronRight, Clock3, LockKeyhole, Router } from "lucide-react";
import type { OverviewRawSnapshot, OverviewTone } from "../overview";
import { PANEL_ROUTES, PANEL_ROUTE_MATURITY_LABELS, type PanelNavigate, type PanelRouteId } from "../routes/panelRoutes";
import { panelWorkspaceLabel, panelWorkspaceTabs } from "../routes/panelWorkspaceCatalog";
import { buildSectionModel } from "./sectionModels";
import { DesktopDomainWorkspace } from "./DesktopDomainWorkspace";
import { SectionTimeSeriesChart } from "./SectionTimeSeriesChart";

const READONLY_DESTINATIONS: Array<{ label: string; route: PanelRouteId }> = [
  { label: "采集状态", route: "readonlyDiagnostics" },
  { label: "DNS 状态", route: "dns4" },
  { label: "线路状态", route: "lineStatus" },
  { label: "终端状态", route: "terminals" },
  { label: "日志状态", route: "logs" },
];

function ToneMark({ tone = "trust" }: { tone?: OverviewTone }) {
  return <span className={`panel-tone-mark is-${tone}`} aria-hidden="true" />;
}

function DesktopWorkspaceTabs({ route, onNavigate }: { route: PanelRouteId; onNavigate: (route: PanelRouteId) => void }) {
  const tabs = panelWorkspaceTabs(route);
  if (!tabs.length) return null;
  return (
    <nav className="panel-workspace-tabs" aria-label={`${panelWorkspaceLabel(route)}导航`} data-panel-workspace-tabs>
      {tabs.map((item) => (
        <button
          type="button"
          className={route === item.route ? "is-active" : ""}
          aria-current={route === item.route ? "page" : undefined}
          data-section={item.route}
          onClick={() => onNavigate(item.route)}
          key={item.route}
        >
          {item.label}
        </button>
      ))}
    </nav>
  );
}

function OverviewBackCommand({ onNavigate }: { onNavigate: (route: PanelRouteId) => void }) {
  return <button className="panel-overview-back" type="button" data-panel-overview-back onClick={() => onNavigate("overview")}><ChevronLeft aria-hidden="true" size={18} />返回运行概览</button>;
}

function MorePage({ onNavigate }: { onNavigate: (route: PanelRouteId) => void }) {
  const routes = Object.values(PANEL_ROUTES)
    .filter((definition) => definition.placement === "more")
    .map((definition) => definition.id);
  return (
    <main id="more" className="section panel-operational-section" data-panel-route="more">
      <header className="panel-section-heading is-directory-heading">
        <div><OverviewBackCommand onNavigate={onNavigate} /><span>只读工具</span><h1 tabIndex={-1} data-panel-route-title>更多工具</h1><p>路由、DNS、安全、审计与连接检查。</p></div>
        <LockKeyhole className="panel-more-lock" aria-label="只读" size={20} />
      </header>
      <div className="panel-more-list">
        {routes.map((route) => (
          <button type="button" data-section={route} onClick={() => onNavigate(route)} key={route}>
            <span><b>{PANEL_ROUTES[route].shortTitle}</b><small>{PANEL_ROUTES[route].description}</small><em>{PANEL_ROUTE_MATURITY_LABELS[PANEL_ROUTES[route].maturity]}</em></span>
            <ChevronRight aria-hidden="true" size={18} />
          </button>
        ))}
      </div>
    </main>
  );
}

export function OperationalSectionPage({ route, snapshot, onNavigate }: { route: PanelRouteId; snapshot: OverviewRawSnapshot; onNavigate: PanelNavigate }) {
  if (route === "more") return <MorePage onNavigate={onNavigate} />;
  const model = buildSectionModel(route, snapshot);
  const metricColumnCount = Math.min(model.metrics.length, 4) || 1;
  const timeLabel = model.evidenceMode === "current" ? "业务成功" : model.evidenceMode === "historical" ? "上次成功" : "成功时间";
  return (
    <main id={route} className="section panel-operational-section" data-panel-route={route} data-panel-route-content={route} data-panel-evidence-mode={model.evidenceMode}>
      <header className="panel-section-heading is-workspace-heading">
        <div className="panel-section-identity">
          <span>{panelWorkspaceLabel(route)}</span>
          <div className="panel-section-title-line">
            <h1 tabIndex={-1} data-panel-route-title>{model.title}</h1>
            <strong className={`panel-section-status is-${model.statusTone}`}>{model.status}</strong>
          </div>
          <p>{model.description}</p>
        </div>
        <div className={`panel-section-freshness is-${model.statusTone}`}><Clock3 aria-hidden="true" size={16} /><span>{timeLabel} {model.updatedAt || "未记录"}</span></div>
      </header>

      <DesktopWorkspaceTabs route={route} onNavigate={onNavigate} />

      <section
        className="panel-section-metrics"
        data-metric-count={model.metrics.length}
        style={{ gridTemplateColumns: `repeat(${metricColumnCount}, minmax(0, 1fr))` }}
        aria-label={model.metrics.some(({ action }) => action) ? "资源风险决策" : "本页关键指标"}
      >
        {model.metrics.map(({ label, value, note, tone, action }) => (
          <div className={`is-${tone || "trust"}`} key={label}>
            <ToneMark tone={tone} />
            <span><small>{label}</small><b>{value}</b>{note ? <em>{note}</em> : null}{action ? <button data-section={action} onClick={() => onNavigate(action)}>资源审计</button> : null}</span>
          </div>
        ))}
      </section>

      {model.visualization ? <SectionTimeSeriesChart visualization={model.visualization} /> : null}

      <DesktopDomainWorkspace route={route} model={model} onNavigate={onNavigate} />

      {route === "readonlyDiagnostics" ? (
        <nav className="readonly-feature-nav" aria-label="只读状态入口">
          {READONLY_DESTINATIONS.map((item) => (
            <button className="readonly-feature-link" type="button" data-section={item.route} onClick={() => onNavigate(item.route)} key={item.label}>
              <span>{item.label}</span><ChevronRight aria-hidden="true" size={17} />
            </button>
          ))}
        </nav>
      ) : null}

      <footer className="panel-readonly-footer"><Router aria-hidden="true" size={16} /><span><b>只读快照</b><small>本页不会修改 RouterOS 配置</small></span></footer>
    </main>
  );
}
