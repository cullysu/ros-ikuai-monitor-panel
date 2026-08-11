import { ChevronRight, Ellipsis } from "lucide-react";
import {
  PANEL_ROUTES,
  PANEL_ROUTE_MATURITY_LABELS,
  type PanelNavigate,
} from "../routes/panelRoutes";
import type { SectionModel } from "../sections/sectionModels";
import { PANEL_MORE_ROUTE_GROUPS, PANEL_MORE_ROUTES } from "../routes/panelWorkspaceCatalog";
import { routeIcon } from "./mobileDomainWorkspaceModel";

export function DomainMenu({ onNavigate }: { onNavigate: PanelNavigate }) {
  return (
    <details className="mdw-more">
      <summary aria-label="更多只读工具"><Ellipsis aria-hidden="true" size={21} /></summary>
      <div>
        {PANEL_MORE_ROUTES.map((item) => (
          <button type="button" data-section={item.route} onClick={() => onNavigate(item.route)} key={item.route}>
            <span>{item.label}</span><ChevronRight aria-hidden="true" size={16} />
          </button>
        ))}
      </div>
    </details>
  );
}

export function MobileMoreDirectory({
  model,
  onNavigate,
}: {
  model: SectionModel;
  onNavigate: PanelNavigate;
}) {
  return (
    <main
      className="mdw-shell mdw-directory-shell"
      data-mobile-domain-workspace="more"
      data-mobile-evidence-mode={model.evidenceMode}
    >
      <header className="mdw-header mdw-directory-header">
        <div className="mdw-title-row">
          <span className="mdw-title-icon"><Ellipsis aria-hidden="true" size={22} /></span>
          <div>
            <small>只读工具目录</small>
            <h1 tabIndex={-1} data-panel-route-title>更多工具</h1>
          </div>
        </div>
        <p>{PANEL_ROUTES.more.description}</p>
      </header>
      <div className="mdw-directory-list" aria-label="更多只读工具">
        {PANEL_MORE_ROUTE_GROUPS.map((group) => (
          <section className="mdw-directory-group" aria-labelledby={`mdw-directory-${group.id}`} key={group.id}>
            <h2 id={`mdw-directory-${group.id}`}>{group.label}</h2>
            <div>
              {PANEL_MORE_ROUTES.filter((item) => item.group === group.id).map((item) => {
                const ItemIcon = routeIcon(item.route);
                return (
                  <button type="button" data-section={item.route} onClick={() => onNavigate(item.route)} key={item.route}>
                    <span className="mdw-directory-icon"><ItemIcon aria-hidden="true" size={19} /></span>
                    <span className="mdw-directory-copy">
                      <b>{item.label}</b>
                      <small>{PANEL_ROUTES[item.route].description}</small>
                      <em>{PANEL_ROUTE_MATURITY_LABELS[PANEL_ROUTES[item.route].maturity]}</em>
                    </span>
                    <ChevronRight aria-hidden="true" size={17} />
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
