import { ChevronRight, CircleAlert, History } from "lucide-react";
import type { CSSProperties } from "react";
import type { PanelNavigate, PanelRouteId } from "../routes/panelRoutes";
import { routeRecoveryPolicyFor } from "./route-recovery/routeRecoveryPolicies";
import { missingEvidenceLabels, sectionRecoveryState } from "./route-recovery/routeRecoveryState";
import type { SectionModel } from "./sectionModels";
import "./route-evidence-boundary.css";

const DESKTOP_RECOVERY_TOKENS = {
  "--mdw-line": "rgb(42 83 99 / 14%)",
  "--mdw-line-strong": "rgb(42 83 99 / 22%)",
  "--mdw-surface-tonal": "#f5f8f9",
  "--mdw-blue": "#245f78",
  "--mdw-ink": "#173641",
  "--mdw-muted": "#526e78",
  "--mdw-danger": "#8f3f49",
  "--mdw-blue-soft": "#e7f0f3",
} as CSSProperties;

const HISTORICAL_BOUNDARY_SUMMARY = "仅说明记录时刻已采集的内容；不代表当前状态，先核对最新采集时间。";

export function RouteEvidenceBoundary({
  route,
  model,
  onNavigate,
  surface,
}: {
  route: PanelRouteId;
  model: SectionModel;
  onNavigate: PanelNavigate;
  surface: "mobile" | "desktop";
}) {
  const policy = routeRecoveryPolicyFor(route);
  const state = sectionRecoveryState(model);
  if (!policy || !state) return null;

  const copy = policy[state];
  const missing = state === "partial" ? missingEvidenceLabels(model) : [];
  // Historical evidence can explain where to investigate, but it cannot name a
  // truthful "next" action. Keep both links equal and secondary even if a
  // future policy accidentally supplies a primaryAction value.
  const primaryActionRoute = state === "historical" ? undefined : copy.primaryAction;
  const StateIcon = state === "historical" ? History : CircleAlert;
  const titleId = `route-recovery-${surface}-${route}`;

  return (
    <section
      className={`mdw-domain-context mdw-interface-recovery route-evidence-boundary is-${surface} is-${state}`}
      data-route-recovery={route}
      data-route-recovery-state={state}
      data-mobile-interface-recovery-state={state}
      aria-labelledby={titleId}
      style={surface === "desktop" ? DESKTOP_RECOVERY_TOKENS : undefined}
    >
      <header className="mdw-interface-recovery-heading">
        <span><StateIcon aria-hidden="true" size={16} /><b id={titleId}>{state === "historical" ? copy.title : policy.heading}</b></span>
        <small>{state === "partial" ? "部分证据" : state === "historical" ? "历史参考" : "当前不可用"}</small>
      </header>
      <div
        className="mdw-interface-recovery-copy"
        data-route-recovery-explanation={state === "historical" ? "compact-history" : "full"}
      >
        {state === "historical" ? null : <b>{copy.title}</b>}
        <p>{state === "historical" ? HISTORICAL_BOUNDARY_SUMMARY : copy.body}</p>
        {missing.length ? <p>未取得：{missing.join("、")}</p> : null}
      </div>
      <div className="mdw-interface-recovery-actions" aria-label={`${policy.heading}调查入口`}>
        {policy.actions.map((action) => {
          const actionLevel = action.route === primaryActionRoute ? "primary" : "secondary";
          return (
          <button
            type="button"
            data-route-recovery-action={action.route}
            data-route-recovery-action-level={actionLevel}
            className={`is-${actionLevel}`}
            onClick={() => onNavigate(action.route, { returnRoute: route, evidenceAt: model.observedAt })}
            key={action.route}
          >
            <span>{action.label}</span><ChevronRight aria-hidden="true" size={16} />
          </button>
          );
        })}
      </div>
    </section>
  );
}
