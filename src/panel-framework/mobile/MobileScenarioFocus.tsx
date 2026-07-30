import { ChevronRight, CircleAlert, Network } from "lucide-react";
import type { PanelNavigate } from "../routes/panelRoutes";
import type {
  OverviewScenarioFocus,
  OverviewScenarioFocusKind,
} from "../overview/evidence-model/overviewEvidenceTypes";

function FocusIcon({ kind }: { kind: OverviewScenarioFocusKind }) {
  return kind === "planes"
    ? <Network aria-hidden="true" size={19} />
    : <CircleAlert aria-hidden="true" size={19} />;
}

export function MobileScenarioFocus({
  focus,
  onNavigate,
}: {
  focus: OverviewScenarioFocus;
  onNavigate: PanelNavigate;
}) {
  return (
    <section
      className={`mp-scenario-focus is-${focus.kind}`}
      data-mobile-scenario-focus={focus.kind}
      data-mobile-visual-level="secondary"
      data-overview-task-landmark="scenario-focus"
      data-overview-task-focus={focus.kind}
      aria-labelledby="mp-scenario-focus-title"
    >
      <header>
        <span className="mp-scenario-focus-icon"><FocusIcon kind={focus.kind} /></span>
        <div>
          <span className="mp-section-kicker">{focus.label}</span>
          <h2 id="mp-scenario-focus-title">{focus.title}</h2>
          <p>{focus.summary}</p>
        </div>
      </header>
      <div className="mp-scenario-focus-grid">
        {focus.items.map((item) => {
          const content = (
            <>
              <span className="mp-scenario-focus-mark" aria-hidden="true" />
              <span>
                <small>{item.label}</small>
                <b>{item.value}</b>
                <em>{item.note}</em>
              </span>
            </>
          );
          if (!item.actionable) {
            return (
              <div
                className={`mp-scenario-focus-item is-evidence is-${item.tone}`}
                data-mobile-scenario-focus-item={item.key}
                data-mobile-scenario-evidence={item.key}
                key={item.key}
              >
                {content}
              </div>
            );
          }
          return (
            <button
              className={`mp-scenario-focus-item is-action is-${item.tone}`}
              type="button"
              data-mobile-scenario-focus-item={item.key}
              data-mobile-scenario-action={item.key}
              data-mobile-destination={item.route}
              onClick={() => onNavigate(item.route)}
              aria-label={`${item.label}：${item.value}。${item.note}`}
              key={item.key}
            >
              {content}
              <ChevronRight aria-hidden="true" size={17} />
            </button>
          );
        })}
      </div>
    </section>
  );
}
