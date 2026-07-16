import { ChevronRight, FileClock, Gauge, Network, PanelsTopLeft, Route as RouteIcon, ScanSearch } from "lucide-react";
import type { OverviewEvidenceRisk } from "../overview/evidence-model/overviewEvidenceTypes";
import type { PanelRouteId } from "../routes/panelRoutes";

type PatrolActionIcon = "diagnostic" | "logs" | "network" | "route" | "resource" | "more";

interface PatrolAction {
  route: PanelRouteId;
  label: string;
  note: string;
  icon: PatrolActionIcon;
}

function patrolActions(risk: OverviewEvidenceRisk): PatrolAction[] {
  if (risk === "evidence" || risk === "collection") {
    return [
      { route: "readonlyDiagnostics", label: "验证采集边界", note: "REST、SSH 与业务快照", icon: "diagnostic" },
      { route: "logs", label: "检查失败记录", note: "定位最近采集错误", icon: "logs" },
      { route: "more", label: "打开工具目录", note: "服务、DNS 与审计入口", icon: "more" },
    ];
  }
  if (risk === "wan") {
    return [
      { route: "lineStatus", label: "检查 WAN 对象", note: "运行、地址与父接口", icon: "network" },
      { route: "routes", label: "核对默认路由", note: "活动标记、网关与距离", icon: "route" },
      { route: "logs", label: "查看网络事件", note: "确认故障出现时间", icon: "logs" },
    ];
  }
  if (risk === "interfaces") {
    return [
      { route: "interfaces", label: "检查接口对象", note: "运行状态与依赖关系", icon: "network" },
      { route: "lineStatus", label: "核对 WAN 关联", note: "确认出口是否受影响", icon: "route" },
      { route: "logs", label: "查看接口事件", note: "定位状态变化时间", icon: "logs" },
    ];
  }
  if (risk === "resource") {
    return [
      { route: "trafficLoad", label: "进入资源负载", note: "当前压力与接口吞吐", icon: "resource" },
      { route: "loadAudit", label: "检查采样审计", note: "阈值、连续性与原始样本", icon: "diagnostic" },
      { route: "trafficAudit", label: "核对流量对象", note: "协议与高吞吐来源", icon: "network" },
    ];
  }
  if (risk === "route") {
    return [
      { route: "routes", label: "检查路由表", note: "查找活动默认路由", icon: "route" },
      { route: "lineStatus", label: "核对 WAN 状态", note: "确认可承载出口", icon: "network" },
      { route: "readonlyDiagnostics", label: "验证只读证据", note: "区分不可达与未采集", icon: "diagnostic" },
    ];
  }
  return [
    { route: "lineStatus", label: "巡检 WAN 线路", note: "出口对象与当前吞吐", icon: "network" },
    { route: "routes", label: "核对默认路由", note: "活动路径与网关", icon: "route" },
    { route: "readonlyDiagnostics", label: "查看只读诊断", note: "采集链路与证据边界", icon: "diagnostic" },
  ];
}

function PatrolActionGlyph({ icon }: { icon: PatrolActionIcon }) {
  if (icon === "diagnostic") return <ScanSearch aria-hidden="true" size={18} />;
  if (icon === "logs") return <FileClock aria-hidden="true" size={18} />;
  if (icon === "network") return <Network aria-hidden="true" size={18} />;
  if (icon === "route") return <RouteIcon aria-hidden="true" size={18} />;
  if (icon === "more") return <PanelsTopLeft aria-hidden="true" size={18} />;
  return <Gauge aria-hidden="true" size={18} />;
}

export function MobilePatrolActions({
  risk,
  onNavigate,
}: {
  risk: OverviewEvidenceRisk;
  onNavigate: (route: PanelRouteId) => void;
}) {
  const actions = patrolActions(risk);
  const steady = risk === "none";
  return (
    <section className="mp-actions" data-mobile-patrol-actions aria-labelledby="mp-actions-title">
      <header>
        <div>
          <span className="mp-section-kicker">{steady ? "巡检入口" : "处置入口"}</span>
          <h2 id="mp-actions-title">{steady ? "继续核对关键对象" : "沿证据继续检查"}</h2>
        </div>
        <b>{actions.length}</b>
      </header>
      <div className="mp-action-list">
        {actions.map((action) => (
          <button
            type="button"
            data-mobile-patrol-action={action.route}
            data-mobile-destination={action.route}
            onClick={() => onNavigate(action.route)}
            key={action.route}
          >
            <span className="mp-action-icon"><PatrolActionGlyph icon={action.icon} /></span>
            <span><b>{action.label}</b><small>{action.note}</small></span>
            <ChevronRight aria-hidden="true" size={17} />
          </button>
        ))}
      </div>
    </section>
  );
}
