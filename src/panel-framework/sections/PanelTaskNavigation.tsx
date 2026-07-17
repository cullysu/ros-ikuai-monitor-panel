import { Cable, Gauge, ScrollText, UsersRound } from "lucide-react";
import { PANEL_ROUTES, PANEL_TASK_ROUTES, type PanelRouteId } from "../routes/panelRoutes";

const ITEMS: Record<(typeof PANEL_TASK_ROUTES)[number], { label: string; icon: typeof Gauge }> = {
  overview: { label: "概览", icon: Gauge },
  interfaces: { label: "网络", icon: Cable },
  terminals: { label: "终端", icon: UsersRound },
  logs: { label: "日志", icon: ScrollText },
};

function selectedDestination(route: PanelRouteId): (typeof PANEL_TASK_ROUTES)[number] {
  return PANEL_ROUTES[route].primaryDestination;
}

export function PanelTaskNavigation({
  route,
  onNavigate,
}: {
  route: PanelRouteId;
  onNavigate: (route: PanelRouteId) => void;
}) {
  const selected = selectedDestination(route);
  return (
    <nav className="panel-task-navigation" aria-label="手机主要任务">
      {PANEL_TASK_ROUTES.map((destination) => {
        const item = ITEMS[destination];
        const Icon = item.icon;
        const active = destination === selected;
        return (
          <button
            type="button"
            className={active ? "is-active" : ""}
            aria-current={active ? "page" : undefined}
            data-section={destination}
            onClick={() => onNavigate(destination)}
            key={destination}
          >
            <Icon aria-hidden="true" size={20} strokeWidth={1.8} />
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
