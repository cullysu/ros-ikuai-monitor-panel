import { Activity, Cable, ListFilter, LockKeyhole, Network, Router } from "lucide-react";
import { useId, useLayoutEffect, useRef, useSyncExternalStore } from "react";
import type { OpticalPatrolModel } from "./opticalPatrolTypes";
import { OpticalPatrolClaimFocus, OpticalPatrolFollowups } from "./OpticalPatrolClaim";
import { OpticalPatrolEvidenceDeck } from "./OpticalPatrolEvidenceDeck";
import "./styles/tokens.css";
import "./styles/shell.css";
import "./styles/claims.css";
import "./styles/workbench.css";
import "./styles/responsive.css";
import "./styles/motion.css";

type OpticalPatrolClaim = OpticalPatrolModel["claims"][number];
type OpticalPatrolAction = OpticalPatrolClaim["action"];

const protectedTitlePhrases = /(承载流量|WAN 未运行|当前采集状态|当前业务状态|当前快照|默认路由|运行记录|已核实依赖|接口未运行|资源策略)/g;
const protectedTitlePhrase = /^(承载流量|WAN 未运行|当前采集状态|当前业务状态|当前快照|默认路由|运行记录|已核实依赖|接口未运行|资源策略)$/;

export interface OpticalPatrolProps {
  model: OpticalPatrolModel;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onOpen: (action: OpticalPatrolAction) => void;
  runtimeManaged: boolean;
}

function evidenceAnnouncement(model: OpticalPatrolModel): string {
  if (model.evidence.mode === "current") {
    return `${model.evidence.label}：当前观测可用；页面只显示当前证据能够支持的值。`;
  }
  if (model.evidence.mode === "historical") {
    return `${model.evidence.label}：当前观测已撤回；页面只显示带时间来源的历史证据。`;
  }
  return `${model.evidence.label}：当前观测不可用；页面不显示未经观测的当前值。`;
}

function semanticStatusAnnouncement(model: OpticalPatrolModel, selected: OpticalPatrolClaim | null): string {
  const selectedStatus = selected
    ? `对象 ${selected.title}，状态 ${selected.state}。`
    : "当前没有可检查对象。";
  return `${evidenceAnnouncement(model)} ${model.decision.label}：${model.decision.statement.replace(/\s+/g, " ")}。${selectedStatus}`;
}

function decisionStatement(statement: string) {
  return statement.split("\n").map((line, lineIndex) => (
    <span className="op__title-line" key={`${line}-${lineIndex}`}>
      {line.split(protectedTitlePhrases).filter(Boolean).map((part, partIndex) => (
        protectedTitlePhrase.test(part)
          ? <span className="op__title-phrase" key={`${part}-${partIndex}`}>{part}</span>
          : part
      ))}
      {lineIndex < statement.split("\n").length - 1 ? <br /> : null}
    </span>
  ));
}

type OpticalPatrolCapability = "phone" | "short-landscape" | "tablet" | "desktop";

function viewportCapability(): OpticalPatrolCapability {
  if (typeof window === "undefined") return "phone";
  if (window.innerWidth >= 1200) return "desktop";
  if (window.innerWidth >= 600 && window.innerHeight <= 500) return "short-landscape";
  if (window.innerWidth >= 768) return "tablet";
  return "phone";
}

function subscribeViewportCapability(onChange: () => void): () => void {
  window.addEventListener("resize", onChange);
  window.addEventListener("orientationchange", onChange);
  return () => {
    window.removeEventListener("resize", onChange);
    window.removeEventListener("orientationchange", onChange);
  };
}

function useOpticalPatrolCapability(): OpticalPatrolCapability {
  return useSyncExternalStore(subscribeViewportCapability, viewportCapability, () => "phone");
}

function StandaloneChrome({ model }: { model: OpticalPatrolModel }) {
  return (
    <header className="op__chrome" data-optical-patrol-chrome>
      <span className="op__device-glyph" aria-hidden="true"><Router size={20} strokeWidth={1.9} /></span>
      <span className="op__device-copy">
        <strong>{model.scope.name}</strong>
        {model.scope.note ? <small>{model.scope.note}</small> : null}
      </span>
      <span className="op__readonly"><LockKeyhole size={16} aria-hidden="true" />只读</span>
    </header>
  );
}

const taskItems = [
  { label: "概览", icon: Activity, current: true },
  { label: "网络", icon: Network, current: false },
  { label: "终端", icon: Cable, current: false },
  { label: "日志", icon: ListFilter, current: false },
] as const;

function StandaloneTaskNavigation() {
  return (
    <div className="op__task-nav" aria-hidden="true" data-optical-patrol-task-navigation>
      <ul>
        {taskItems.map(({ label, icon: Icon, current }) => (
          <li key={label} aria-current={current ? "page" : undefined}>
            <Icon size={21} strokeWidth={1.8} aria-hidden="true" />
            <span>{label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function OpticalPatrol({
  model,
  selectedId,
  onSelect,
  onOpen,
  runtimeManaged,
}: OpticalPatrolProps) {
  const titleId = `optical-patrol-${useId().replace(/:/g, "")}`;
  const rootRef = useRef<HTMLElement>(null);
  const capability = useOpticalPatrolCapability();
  const selected = model.claims.find((claim) => claim.id === selectedId)
    || model.claims.find((claim) => claim.id === model.defaultSelectedId)
    || model.claims[0]
    || null;

  useLayoutEffect(() => {
    rootRef.current?.scrollTo({ top: 0, left: 0, behavior: "instant" });
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [model.evidence.mode, model.risk, model.scale, model.scene]);

  return (
    <main
      ref={rootRef}
      className="op"
      data-optical-patrol-root
      data-optical-patrol-scenario={model.scenario}
      data-optical-patrol-scene={model.scene}
      data-optical-patrol-scale={model.scale}
      data-optical-patrol-risk={model.risk}
      data-optical-patrol-evidence-mode={model.evidence.mode}
      data-optical-patrol-capability={capability}
      data-optical-patrol-forbids-current={model.forbidsCurrentData ? "true" : "false"}
      data-optical-patrol-runtime-managed={runtimeManaged ? "true" : "false"}
      aria-labelledby={titleId}
    >
      <p
        className="op__sr-only"
        data-optical-patrol-semantic-status
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {semanticStatusAnnouncement(model, selected)}
      </p>

      {!runtimeManaged ? <StandaloneChrome model={model} /> : null}

      <div className="op__canvas">
        <section className="op__summary" aria-label="巡检判断">
          <div
            className="op__evidence-boundary"
            data-optical-patrol-evidence-boundary
            data-optical-patrol-tone={model.evidence.tone}
            aria-label="证据边界"
          >
            <span className="op__evidence-state">
              <i aria-hidden="true" />
              <strong>{model.evidence.label}</strong>
            </span>
            <span className="op__evidence-time">
              {model.evidence.observedAt ? <time dateTime={model.evidence.observedAt}>{model.evidence.time}</time> : model.evidence.time}
              <small>{model.evidence.note || (model.evidence.currentAllowed ? "仅显示已观测值" : "当前值已撤回")}</small>
            </span>
          </div>

          <div
            className="op__decision"
            data-optical-patrol-decision
            data-optical-patrol-tone={model.decision.tone}
          >
            <span>{model.decision.label}</span>
            <h1 id={titleId} data-panel-route-title data-optical-patrol-route-title tabIndex={-1}>{decisionStatement(model.decision.statement)}</h1>
            <p>{model.decision.detail}</p>
            {model.decision.scopeFacts?.length ? (
              <dl className="op__scope-facts" aria-label="多出口巡检范围" data-optical-patrol-scope-facts>
                {model.decision.scopeFacts.map((fact) => (
                  <div key={fact.label} data-optical-patrol-tone={fact.tone}>
                    <dt>{fact.label}</dt>
                    <dd>{fact.value}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
          </div>
        </section>

        <OpticalPatrolClaimFocus
          claim={selected}
          forbidsCurrentData={model.forbidsCurrentData}
          onOpen={onOpen}
        />

        <OpticalPatrolFollowups
          claims={model.claims}
          selectedId={selected?.id || null}
          overflowCount={0}
          onSelect={onSelect}
        />

        <OpticalPatrolEvidenceDeck groups={model.tabletEvidenceGroups} />
      </div>

      {!runtimeManaged ? <StandaloneTaskNavigation /> : null}
    </main>
  );
}
