import { ChevronDown, CircleAlert, LockKeyhole, Router, ShieldCheck, TriangleAlert } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import type { PanelRouteId } from "../../routes/panelRoutes";
import type { OverviewPanelProps } from "../index";
import { buildOverviewEvidenceModel } from "../evidence-model/buildOverviewEvidenceModel";
import { MobileFocusObject } from "./MobileFocusObject";
import { MobilePriorityQueue } from "./MobilePriorityQueue";
import { MobileWanInstrument } from "./MobileWanInstrument";
import "./styles/mobile-overview-tokens.css";
import "./styles/mobile-overview.css";
import "./styles/mobile-overview-responsive.css";

function VerdictIcon({ tone }: { tone: string }) {
  if (tone === "danger") return <CircleAlert aria-hidden="true" size={22} />;
  if (tone === "warn" || tone === "missing") return <TriangleAlert aria-hidden="true" size={22} />;
  return <ShieldCheck aria-hidden="true" size={22} />;
}

export interface MobileOverviewScreenProps extends OverviewPanelProps {
  onNavigate: (route: PanelRouteId) => void;
  runtimeManaged?: boolean;
}

export function MobileOverviewScreen({ snapshot, state, onNavigate, runtimeManaged = false }: MobileOverviewScreenProps) {
  const model = useMemo(() => buildOverviewEvidenceModel(snapshot, state), [snapshot, state]);
  const incident = model.priorityObjects.length > 0;
  const evidenceLedgerRef = useRef<HTMLDetailsElement>(null);
  const evidenceDefaultOpen = useRef(model.evidenceMode === "unavailable" || (
    typeof window !== "undefined" && window.matchMedia("(min-width: 600px) and (max-width: 899px) and (min-height: 700px)").matches
  ));
  useEffect(() => {
    if (evidenceLedgerRef.current) evidenceLedgerRef.current.open = evidenceDefaultOpen.current;
  }, []);
  return (
    <main
      className={`mo-shell is-${model.verdictTone} is-${model.evidenceMode} ${incident ? "has-priority" : "has-instrument"} ${model.focusObject ? "has-focus" : ""}`}
      data-mobile-overview
      data-mobile-overview-scenario={model.scenario}
      data-mobile-overview-risk={model.risk}
      data-mobile-evidence-mode={model.evidenceMode}
    >
      {!runtimeManaged ? (
        <header className="mo-fixture-toolbar" data-mobile-fixture-toolbar>
          <span><Router aria-hidden="true" size={20} /><span><b>{model.device}</b><small>{model.deviceNote}</small></span></span>
          <span><LockKeyhole aria-hidden="true" size={16} />只读</span>
        </header>
      ) : null}

      {!runtimeManaged ? (
        <div className={`mo-evidence is-${model.evidenceTone}`} role="status" data-mobile-evidence-strip>
          <span><b>{model.evidenceLabel}</b><small>{model.evidenceNote}</small></span>
          <time>{model.evidenceTime}</time>
        </div>
      ) : null}

      <section className={`mo-verdict is-${model.verdictTone}`} aria-labelledby="mo-verdict-title" data-mobile-verdict>
        <div className="mo-verdict-inner">
          <span className="mo-verdict-icon"><VerdictIcon tone={model.verdictTone} /></span>
          <span><small>{model.verdictLabel}</small><h1 id="mo-verdict-title" tabIndex={-1} data-panel-route-title>{model.verdictTitle}</h1><p>{model.verdictSummary}</p></span>
        </div>
      </section>

      <div className="mo-content">
        <section className="mo-decision" aria-labelledby="mo-decision-title">
          <header><h2 id="mo-decision-title">判断依据</h2><span>{model.evidenceLabel}</span></header>
          <div className="mo-facts" aria-label="三个核心判断事实" data-mobile-core-facts>
            {model.facts.map((item) => (
              <div className={`is-${item.tone}`} data-mobile-core-fact={item.key} key={item.key}>
                <small>{item.label}</small><b>{item.value}</b>{item.note ? <em>{item.note}</em> : null}
              </div>
            ))}
          </div>
        </section>

        <div className="mo-workflow">
          <MobilePriorityQueue
            label={model.priorityLabel}
            total={model.priorityTotal}
            objects={model.priorityObjects}
            onNavigate={onNavigate}
          />
          {model.traffic ? <MobileWanInstrument traffic={model.traffic} onOpen={() => onNavigate("trafficLoad")} /> : null}
          {model.focusObject ? <MobileFocusObject object={model.focusObject} onOpen={() => onNavigate(model.focusObject!.route)} /> : null}
        </div>

        <details
          className="mo-evidence-ledger"
          data-mobile-evidence-ledger
          ref={evidenceLedgerRef}
        >
          <summary><span>来源与边界</span><small>{model.evidenceRows.length} 项</small><ChevronDown aria-hidden="true" size={18} /></summary>
          <dl>
            {model.evidenceRows.map((row) => (
              <div className={`is-${row.tone}`} key={row.key}>
                <dt>{row.label}</dt><dd><b>{row.value}</b><small>{row.note}</small></dd>
              </div>
            ))}
          </dl>
        </details>
      </div>
    </main>
  );
}
