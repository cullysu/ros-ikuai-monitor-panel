import { ChevronLeft, ChevronRight, Clock3, LockKeyhole, Server } from "lucide-react";
import type { OverviewRawSnapshot, OverviewTone } from "../overview";
import { MobileDomainWorkspace } from "../mobile/MobileDomainWorkspace";
import { useMobilePanelSurface } from "../mobile/useMobilePanelSurface";
import { PANEL_ROUTES, type PanelRouteId } from "../routes/panelRoutes";
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

function OverviewBackCommand({ onNavigate }: { onNavigate: (route: PanelRouteId) => void }) {
  return <button className="panel-overview-back" type="button" data-panel-overview-back onClick={() => onNavigate("overview")}><ChevronLeft aria-hidden="true" size={18} />返回运行概览</button>;
}

function MorePage({ onNavigate }: { onNavigate: (route: PanelRouteId) => void }) {
  const routes = Object.values(PANEL_ROUTES)
    .filter((definition) => definition.placement === "more")
    .map((definition) => definition.id);
  return (
    <section id="more" className="section panel-operational-section" data-panel-route="more">
      <header className="panel-section-heading">
        <div><OverviewBackCommand onNavigate={onNavigate} /><span>只读工具</span><h1 tabIndex={-1} data-panel-route-title>更多工具</h1><p>路由、DNS、安全、审计与连接检查。</p></div>
        <LockKeyhole className="panel-more-lock" aria-label="只读" size={20} />
      </header>
      <div className="panel-more-list">
        {routes.map((route) => (
          <button type="button" data-section={route} onClick={() => onNavigate(route)} key={route}>
            <span><b>{PANEL_ROUTES[route].shortTitle}</b><small>{PANEL_ROUTES[route].description}</small></span>
            <ChevronRight aria-hidden="true" size={18} />
          </button>
        ))}
      </div>
    </section>
  );
}

export function OperationalSectionPage({ route, snapshot, onNavigate }: { route: PanelRouteId; snapshot: OverviewRawSnapshot; onNavigate: (route: PanelRouteId) => void }) {
  const mobile = useMobilePanelSurface();
  if (mobile) return <MobileDomainWorkspace route={route} snapshot={snapshot} onNavigate={onNavigate} />;
  if (route === "more") return <MorePage onNavigate={onNavigate} />;
  const model = buildSectionModel(route, snapshot);
  const timeLabel = model.evidenceMode === "current" ? "业务成功" : model.evidenceMode === "historical" ? "上次成功" : "成功时间";
  return (
    <section id={route} className="section panel-operational-section" data-panel-route={route} data-panel-route-content={route} data-panel-evidence-mode={model.evidenceMode}>
      <header className="panel-section-heading">
        <div>
          <OverviewBackCommand onNavigate={onNavigate} />
          <span>{model.status}</span>
          <h1 tabIndex={-1} data-panel-route-title>{model.title}</h1>
          <p>{model.description}</p>
        </div>
        <div className={`panel-section-freshness is-${model.statusTone}`}><Clock3 aria-hidden="true" size={16} /><span>{timeLabel} {model.updatedAt || "未记录"}</span></div>
      </header>

      <section className="panel-section-metrics" aria-label="本页关键指标">
        {model.metrics.map((metric) => (
          <div className={`is-${metric.tone || "trust"}`} key={metric.label}>
            <ToneMark tone={metric.tone} />
            <span><small>{metric.label}</small><b>{metric.value}</b>{metric.note ? <em>{metric.note}</em> : null}</span>
          </div>
        ))}
      </section>

      {model.visualization ? <SectionTimeSeriesChart visualization={model.visualization} /> : null}

      {route === "readonlyDiagnostics" ? (
        <nav className="readonly-feature-nav" aria-label="只读状态入口">
          {READONLY_DESTINATIONS.map((item) => (
            <button className="readonly-feature-link" type="button" data-section={item.route} onClick={() => onNavigate(item.route)} key={item.label}>
              <span>{item.label}</span><ChevronRight aria-hidden="true" size={17} />
            </button>
          ))}
        </nav>
      ) : null}

      <DesktopDomainWorkspace route={route} model={model} />

      <footer className="panel-readonly-footer"><Server aria-hidden="true" size={16} /><span><b>只读快照</b><small>本页不会修改 RouterOS 配置</small></span></footer>
    </section>
  );
}
