import { Activity, Cable, ChevronDown, ChevronRight, CircleAlert, Clock3, Gauge, LockKeyhole, Router, ShieldCheck, TriangleAlert, UsersRound } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { PanelRouteId } from "../routes/panelRoutes";
import type { OverviewPanelProps, OverviewTone } from "../overview";
import { buildOverviewEvidenceModel } from "../overview/evidence-model/buildOverviewEvidenceModel";
import { MobileFocusObject } from "./MobileFocusObject";
import { MobilePatrolActions } from "./MobilePatrolActions";
import { IncidentInspector, IncidentRow } from "./MobileIncidentWorkspace";
import { MobilePatrolTraffic } from "./MobilePatrolTraffic";
import { MobileResourcePressure } from "./MobileResourcePressure";
import "./mobile-patrol.css";

function VerdictIcon({ tone }: { tone: OverviewTone }) {
  if (tone === "danger") return <CircleAlert aria-hidden="true" size={22} />;
  if (tone === "warn" || tone === "missing") return <TriangleAlert aria-hidden="true" size={22} />;
  return <ShieldCheck aria-hidden="true" size={22} />;
}


function observedCount(value: unknown): number | null {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export interface MobilePatrolScreenProps extends OverviewPanelProps {
  onNavigate: (route: PanelRouteId) => void;
  runtimeManaged?: boolean;
}

export function MobilePatrolScreen({
  snapshot,
  state,
  onNavigate,
  runtimeManaged = false,
}: MobilePatrolScreenProps) {
  const model = useMemo(() => buildOverviewEvidenceModel(snapshot, state), [snapshot, state]);
  const incident = model.priorityObjects.length > 0;
  const ledgerRef = useRef<HTMLDetailsElement>(null);
  const textScaleSentinelRef = useRef<HTMLSpanElement>(null);
  const [largeText, setLargeText] = useState(false);
  const [tablet, setTablet] = useState(false);
  const [selectedIncidentId, setSelectedIncidentId] = useState("");
  const terminals = Array.isArray(snapshot.terminals) ? snapshot.terminals.length : null;
  const connections = observedCount(snapshot.connections?.total);
  const runningInterfaces = state.facts.interfaces.available
    ? Math.max(0, state.facts.interfaces.total - state.facts.interfaces.down)
    : null;

  useEffect(() => {
    const syncLedger = () => {
      const ledger = ledgerRef.current;
      if (!ledger) return;
      const availableBelowSummary = window.innerHeight - ledger.getBoundingClientRect().top - 76;
      const estimatedLedgerBody = model.evidenceRows.length * 54;
      const fitsUsefulEvidence = availableBelowSummary >= Math.min(180, estimatedLedgerBody);
      const roomyIncident = incident && (
        window.innerHeight >= 720 ||
        window.innerWidth >= 600 ||
        model.priorityObjects.length <= 2
      );
      ledger.open = model.evidenceMode === "unavailable" || roomyIncident || fitsUsefulEvidence;
    };
    syncLedger();
    window.addEventListener("resize", syncLedger);
    return () => window.removeEventListener("resize", syncLedger);
  }, [incident, model.evidenceMode, model.evidenceRows.length, model.priorityObjects.length, tablet]);

  useEffect(() => {
    const sentinel = textScaleSentinelRef.current;
    if (!sentinel) return;
    const sync = () => setLargeText(sentinel.getBoundingClientRect().height >= 24);
    sync();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(sync);
    observer?.observe(sentinel);
    window.addEventListener("resize", sync);
    document.fonts?.ready.then(sync).catch(() => {});
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", sync);
    };
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 600px) and (max-width: 1023px)");
    const sync = () => setTablet(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  const visiblePriorityObjects = tablet ? model.priorityObjectsAll : model.priorityObjects;
  const remainingPriorityObjects = Math.max(0, model.priorityTotal - visiblePriorityObjects.length);
  const selectedIncident = visiblePriorityObjects.find((object) => object.id === selectedIncidentId) ||
    visiblePriorityObjects[0] ||
    null;
  const ledgerInPrimary = tablet && (model.risk === "evidence" || model.risk === "collection");
  const showPatrolActions = tablet || model.risk === "evidence" || model.risk === "collection";
  const evidenceLedger = (
    <details className="mp-ledger" data-mobile-evidence-ledger ref={ledgerRef}>
      <summary>
        <span><Gauge aria-hidden="true" size={17} /><span><b>证据边界</b><small>{model.evidenceNote}</small></span></span>
        <span>{model.evidenceRows.length} 项<ChevronDown aria-hidden="true" size={17} /></span>
      </summary>
      <dl>
        {model.evidenceRows.map((row) => (
          <div className={`is-${row.tone}`} key={row.key}>
            <dt>{row.label}</dt>
            <dd><b>{row.value}</b><small>{row.note}</small></dd>
          </div>
        ))}
      </dl>
    </details>
  );

  return (
    <main
      className={`mp-shell is-${model.verdictTone} is-${model.evidenceMode} ${incident ? "has-incident" : "is-steady"} ${largeText ? "is-large-text" : ""}`}
      data-mobile-overview
      data-mobile-overview-scenario={model.scenario}
      data-mobile-overview-risk={model.risk}
      data-mobile-evidence-mode={model.evidenceMode}
      data-mobile-large-text={largeText ? "true" : "false"}
    >
      <span className="mp-text-scale-sentinel" aria-hidden="true" ref={textScaleSentinelRef}>M</span>
      {!runtimeManaged ? (
        <header className="mp-device-context">
          <span><Router aria-hidden="true" size={19} /><span><b>{model.device}</b><small>{model.deviceNote}</small></span></span>
          <span><LockKeyhole aria-hidden="true" size={15} />只读</span>
        </header>
      ) : null}

      <section className="mp-command" aria-labelledby="mp-command-title" data-mobile-verdict>
        <div className="mp-evidence-line">
          <span className={`is-${model.evidenceTone}`}><Clock3 aria-hidden="true" size={14} />{model.evidenceLabel}</span>
          <time>{model.evidenceTime}</time>
        </div>
        <div className="mp-command-main">
          <span className="mp-command-icon"><VerdictIcon tone={model.verdictTone} /></span>
          <div>
            <h1 id="mp-command-title" tabIndex={-1} data-panel-route-title>{model.verdictTitle}</h1>
            <p>{model.verdictSummary}</p>
          </div>
        </div>
      </section>

      <div className="mp-workspace">
        <section className="mp-proof" aria-label="判断依据" data-mobile-core-facts>
          {model.facts.map((item) => (
            <div className={`is-${item.tone}`} data-mobile-core-fact={item.key} key={item.key}>
              <small>{item.label}</small>
              <b>{item.value}</b>
              {item.note ? <em>{item.note}</em> : null}
            </div>
          ))}
        </section>

        <div className="mp-workspace-body">
          <div className="mp-workspace-primary">
            {model.resource ? <MobileResourcePressure resource={model.resource} /> : null}
            {incident ? (
              <section className="mp-incident" data-mobile-incident-center aria-labelledby="mp-incident-title">
                <header>
                  <div><span className="mp-section-kicker">事故中心</span><h2 id="mp-incident-title">先检查这些对象</h2></div>
                  <b data-mobile-incident-count>{model.priorityTotal}</b>
                </header>
                <div className="mp-incident-list">
                  {visiblePriorityObjects.map((object) => (
                    <IncidentRow
                      object={object}
                      selected={tablet ? selectedIncident?.id === object.id : undefined}
                      onOpen={() => {
                        if (tablet) {
                          setSelectedIncidentId(object.id);
                          return;
                        }
                        onNavigate(object.route);
                      }}
                      key={object.id}
                    />
                  ))}
                </div>
                {remainingPriorityObjects > 0 && visiblePriorityObjects[0] ? (
                  <button
                    className="mp-incident-more"
                    type="button"
                    onClick={() => onNavigate(visiblePriorityObjects[0].route)}
                    data-mobile-destination={visiblePriorityObjects[0].route}
                  >
                    进入{visiblePriorityObjects[0].category}工作区查看其余 {remainingPriorityObjects} 个
                    <ChevronRight aria-hidden="true" size={17} />
                  </button>
                ) : null}
              </section>
            ) : null}
            {model.traffic ? (
              <MobilePatrolTraffic traffic={model.traffic} onOpen={() => onNavigate("trafficLoad")} />
            ) : null}
            {tablet && model.focusObject ? (
              <MobileFocusObject object={model.focusObject} onOpen={() => onNavigate(model.focusObject!.route)} />
            ) : null}
            {ledgerInPrimary ? evidenceLedger : null}
          </div>

          <div className="mp-workspace-context">
            {!incident ? (
              <section className="mp-load" aria-labelledby="mp-load-title">
                <header><span className="mp-section-kicker">当前负载</span><h2 id="mp-load-title">对象与连接</h2></header>
                <div>
                  <button type="button" data-mobile-destination="terminals" onClick={() => onNavigate("terminals")}>
                    <UsersRound aria-hidden="true" size={18} />
                    <span><small>终端记录</small><b>{terminals === null ? "未取得" : terminals}</b></span>
                    <ChevronRight aria-hidden="true" size={17} />
                  </button>
                  <button type="button" data-mobile-destination="connections" onClick={() => onNavigate("connections")}>
                    <Activity aria-hidden="true" size={18} />
                    <span><small>连接总数</small><b>{connections === null ? "未取得" : connections}</b></span>
                    <ChevronRight aria-hidden="true" size={17} />
                  </button>
                  <button type="button" data-mobile-destination="interfaces" onClick={() => onNavigate("interfaces")}>
                    <Cable aria-hidden="true" size={18} />
                    <span><small>运行接口</small><b>{runningInterfaces === null ? "未取得" : `${runningInterfaces} / ${state.facts.interfaces.total}`}</b></span>
                    <ChevronRight aria-hidden="true" size={17} />
                  </button>
                </div>
              </section>
            ) : null}
            {tablet && selectedIncident ? (
              <IncidentInspector object={selectedIncident} onOpen={() => onNavigate(selectedIncident.route)} />
            ) : null}
            {!ledgerInPrimary ? evidenceLedger : null}
            {showPatrolActions ? <MobilePatrolActions risk={model.risk} onNavigate={onNavigate} /> : null}
          </div>
        </div>
      </div>
    </main>
  );
}
