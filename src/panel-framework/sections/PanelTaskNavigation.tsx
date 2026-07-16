import { Cable, Gauge, Menu } from "lucide-react";
import { PANEL_ROUTES, PANEL_TASK_ROUTES, type PanelRouteId, type PanelTaskGroup } from "../routes/panelRoutes";

const ICONS = { overview: Gauge, interfaces: Cable, more: Menu };
const LABELS = { overview: "运行", interfaces: "网络", more: "工具" };

export function PanelTaskNavigation({ route, onNavigate }: { route: PanelRouteId; onNavigate: (route: PanelRouteId) => void }) {
  const taskGroup = PANEL_ROUTES[route].taskGroup;
  const selected = taskGroup === "terminals" || taskGroup === "logs" ? "more" : taskGroup;
  return (
    <nav className="panel-task-navigation" aria-label="手机主要任务">
      {PANEL_TASK_ROUTES.map((task) => {
        const Icon = ICONS[task as keyof typeof ICONS];
        const active = task === selected;
        return (
          <button
            type="button"
            className={active ? "is-active" : ""}
            aria-current={active ? "page" : undefined}
            data-section={task}
            onClick={() => onNavigate(task as PanelTaskGroup)}
            key={task}
          >
            <Icon aria-hidden="true" size={20} strokeWidth={1.8} />
            <span>{LABELS[task as keyof typeof LABELS]}</span>
          </button>
        );
      })}
    </nav>
  );
}
