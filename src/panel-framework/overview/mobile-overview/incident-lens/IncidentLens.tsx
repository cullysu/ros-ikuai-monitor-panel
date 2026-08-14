import { MoreHorizontal, Route } from "lucide-react";
import { useId, useLayoutEffect, useSyncExternalStore } from "react";
import type { IncidentLensModel } from "./types";
import { PatrolLens } from "./PatrolLens";
import { IncidentWorkspace } from "./IncidentWorkspace";
import { useIncidentLensSelectionHistory } from "./useIncidentLensSelectionHistory";
import "./styles/tokens.css";
import "./styles/patrol-next.css";
import "./styles/incidents-next.css";
import "./styles/shell-next.css";
import "./styles/motion.css";

type Capability = "phone" | "short-landscape" | "tablet" | "desktop";
function capability(): Capability {
  if (typeof window === "undefined") return "phone";
  if (window.innerWidth >= 1200) return "desktop";
  if (window.innerWidth >= 600 && window.innerHeight <= 500) return "short-landscape";
  return window.innerWidth >= 600 ? "tablet" : "phone";
}
function subscribe(listener: () => void) { window.addEventListener("resize", listener); window.addEventListener("orientationchange", listener); return () => { window.removeEventListener("resize", listener); window.removeEventListener("orientationchange", listener); }; }
function useCapability() { return useSyncExternalStore(subscribe, capability, () => "phone" as Capability); }

function activeScene(model: IncidentLensModel): IncidentLensModel["scenario"] {
  if (model.surface !== "incident") return model.scenario;
  if (model.risk === "interfaces" || model.risk === "interface-review") return "interfaces-down";
  if (model.risk === "resource") return "resource-full";
  if (model.risk === "collection") return "collection-down";
  if (model.risk === "evidence") return "no-snapshot";
  if (model.risk === "wan" && model.scenario === "all-offline") return "all-offline";
  return model.scenario;
}

export interface IncidentLensProps {
  model: IncidentLensModel;
  scope?: string;
  runtimeManaged?: boolean;
  onNavigate?: (route: "overview" | "interfaces" | "terminals" | "logs" | "more") => void;
  onOpenObject?: (objectId: string) => void;
}

export function IncidentLens({ model, scope = "overview", runtimeManaged = false, onNavigate, onOpenObject }: IncidentLensProps) {
  const titleId = `incident-lens-title-${useId().replace(/:/g, "")}`;
  const capabilityMode = useCapability();
  const objectIds = [model.incident, ...model.patrolObjects, ...model.secondaryObjects].filter(Boolean).map((object) => object!.id).filter((value, index, values) => values.indexOf(value) === index);
  const { selectedId, select } = useIncidentLensSelectionHistory(objectIds, model.defaultSelectedId, scope);
  useLayoutEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
    document.querySelector<HTMLElement>("[data-incident-lens-root]")?.scrollTo({ top: 0, behavior: "instant" });
  }, [model.scenario, model.surface, model.risk]);
  const hasVerifiedRoute = model.command.routeVerified;
  const selectedObject = [model.incident, ...model.patrolObjects, ...model.secondaryObjects]
    .find((object) => object?.id === selectedId);
  const routeTitle = model.surface === "incident"
    ? selectedObject?.title || model.incident?.title || "当前风险"
    : selectedObject?.title || "默认路径";
  const sceneLabel = model.surface === "incident" ? "事故检查" : "巡检";
  const allOfflineSummary = model.surface === "incident" && model.scenario === "all-offline"
    ? `${model.incident?.state || "0 / 0"} 可用 · 无活动默认路径`
    : null;
  const scene = activeScene(model);
  return <main className="incident-lens" data-incident-lens-root data-incident-lens-scope={scope} data-incident-lens-scenario={model.scenario} data-incident-lens-scene={scene} data-incident-lens-scale={model.scale} data-incident-lens-surface={model.surface} data-incident-lens-mode={model.surface} data-incident-lens-risk={model.risk} data-incident-lens-evidence-mode={model.command.mode} data-incident-lens-capability={capabilityMode} data-incident-lens-current-numbers={model.currentNumbersAllowed ? "allowed" : "withdrawn"} data-incident-lens-forbids-current={model.currentNumbersAllowed ? "false" : "true"} data-incident-lens-runtime-managed={runtimeManaged ? "true" : "false"} aria-labelledby={titleId}>
    {!runtimeManaged ? <header className="incident-lens__chrome" data-incident-lens-command-chrome>
      <span className="incident-lens__brand"><strong>RouterOS</strong><small>只读巡检</small></span>
      <button type="button" aria-label="更多操作" title="更多操作" onClick={() => onNavigate?.("more")}><MoreHorizontal size={20} aria-hidden="true" /></button>
    </header> : null}
    <section className="incident-lens__status-spine" data-incident-lens-command data-incident-lens-evidence-boundary data-incident-lens-tone={model.command.tone} role="status" aria-live="polite" aria-atomic="true" aria-label="当前证据与检查对象">
      <span className="incident-lens__proof"><span><i aria-hidden="true" />{model.command.label}</span><time dateTime={model.command.observedAt || undefined}>{model.command.time}</time></span>
      <h1 id={titleId} data-panel-route-title data-incident-lens-route-title tabIndex={-1} className="incident-lens__route-title">
        <small>{sceneLabel}</small>
        {allOfflineSummary ? "全部 WAN 未运行" : routeTitle}
        {allOfflineSummary ? <span className="incident-lens__route-subtitle">{allOfflineSummary}</span> : null}
      </h1>
    </section>
    {model.surface === "incident" ? <IncidentWorkspace model={model} selectedId={selectedId} onSelect={select} onOpen={onOpenObject} /> : <PatrolLens model={model} selectedId={selectedId} onSelect={select} onOpen={onOpenObject} />}
    <footer className="incident-lens__route-fact"><Route size={16} aria-hidden="true" /><span>{hasVerifiedRoute ? "路径由当前 route / WAN 记录明确关联" : "路径状态未由当前 route / WAN 记录确认"}</span></footer>
  </main>;
}
