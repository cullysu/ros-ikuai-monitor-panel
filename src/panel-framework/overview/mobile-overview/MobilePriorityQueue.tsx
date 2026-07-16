import { Cable, ChevronRight, Database, Gauge, Route, WifiOff } from "lucide-react";
import type { PanelRouteId } from "../../routes/panelRoutes";
import type { OverviewPriorityObject } from "../evidence-model/overviewEvidenceTypes";

function PriorityIcon({ category }: { category: string }) {
  if (category === "WAN") return <WifiOff aria-hidden="true" size={19} />;
  if (category === "接口") return <Cable aria-hidden="true" size={19} />;
  if (category === "系统资源") return <Gauge aria-hidden="true" size={19} />;
  if (category === "默认路由") return <Route aria-hidden="true" size={19} />;
  return <Database aria-hidden="true" size={19} />;
}

export function MobilePriorityQueue({
  label,
  total,
  objects,
  onNavigate,
}: {
  label: string;
  total: number;
  objects: OverviewPriorityObject[];
  onNavigate: (route: PanelRouteId) => void;
}) {
  if (!objects.length) return null;
  return (
    <section className="mo-priority" aria-labelledby="mo-priority-title" data-mobile-priority-count={total}>
      <header><h2 id="mo-priority-title">{label}</h2><span>{total} 项</span></header>
      <div className="mo-priority-list">
        {objects.map((object) => (
          <button
            className={`is-${object.tone}`}
            type="button"
            onClick={() => onNavigate(object.route)}
            aria-label={`${object.category} ${object.name}，${object.state}，${object.reason}`}
            data-mobile-priority-object={object.id}
            data-mobile-priority-route={object.route}
            data-mobile-priority-category={object.category}
            key={object.id}
          >
            <span className="mo-priority-icon"><PriorityIcon category={object.category} /></span>
            <span className="mo-priority-identity"><small>{object.category}</small><b>{object.name}</b></span>
            <span className="mo-priority-state"><b>{object.state}</b><small>{object.reason}</small></span>
            <ChevronRight aria-hidden="true" size={18} />
          </button>
        ))}
      </div>
      {total > objects.length ? (
        <button className="mo-priority-more" type="button" onClick={() => onNavigate(objects[0].route)}>
          查看全部 {total} 项<ChevronRight aria-hidden="true" size={17} />
        </button>
      ) : null}
    </section>
  );
}
