import { Activity, ChevronDown, ChevronUp, CircleAlert, LockKeyhole, Router, ShieldCheck } from "lucide-react";
import { useId, useMemo, useState } from "react";
import type { PanelNavigate } from "../../routes/panelRoutes";
import type { OverviewPanelProps } from "../index";
import type { OverviewEvidenceModel } from "../evidence-model/overviewEvidenceTypes";
import { DesktopIncidentDocket } from "./DesktopIncidentDocket";
import { DesktopLedger } from "./DesktopLedger";
import { DesktopWanEvidence } from "./DesktopWanEvidence";
import { buildDesktopOverviewModel, type DesktopLedgerRow } from "./desktopOverviewModel";
import { DesktopFocusObject, DesktopInvestigationActions } from "./DesktopOverviewTask";

const FLEET_PREVIEW_LIMIT = 12;

function VerdictIcon({ model }: { model: OverviewEvidenceModel }) {
  if (model.verdictTone !== "ok") return <CircleAlert aria-hidden="true" size={24} />;
  return <ShieldCheck aria-hidden="true" size={24} />;
}

function sourceRows(model: OverviewEvidenceModel): DesktopLedgerRow[] {
  const paths: Record<string, string> = {
    target: "meta.routerHost + meta.target",
    success: "latestBusinessSuccessTime(meta)",
    failures: "meta.*EndpointFailures",
    boundary: "capabilities + read-only policy",
  };
  const labels: Record<string, string> = {
    target: "设备与采集目标",
    success: "最近业务成功记录",
    failures: "采集端点记录",
    boundary: "只读能力策略",
  };
  return model.evidenceRows.map((row) => ({
    id: `source:${row.key}`,
    category: "来源",
    object: row.label,
    state: row.value,
    evidence: row.note,
    source: paths[row.key] || row.key,
    sourceLabel: labels[row.key] || "当前快照字段",
    tone: row.tone,
    route: "readonlyDiagnostics",
  }));
}

export interface DesktopOverviewScreenProps extends OverviewPanelProps {
  onNavigate: PanelNavigate;
  runtimeManaged?: boolean;
}

export function DesktopOverviewScreen({ snapshot, state, onNavigate, runtimeManaged = false }: DesktopOverviewScreenProps) {
  const view = useMemo(() => buildDesktopOverviewModel(snapshot, state), [snapshot, state]);
  const [fleetExpanded, setFleetExpanded] = useState(false);
  const fleetPreviewId = useId();
  const model = view.evidence;
  const incident = model.risk !== "none";
  const showTraffic = !incident && state.scale !== "fleet" && Boolean(model.traffic);
  const provenance = sourceRows(model);
  const fleetPreviewRows = state.scale === "fleet" && !fleetExpanded
    ? view.objectRows.slice(0, FLEET_PREVIEW_LIMIT)
    : view.objectRows;
  const fleetHiddenCount = view.objectRows.length - fleetPreviewRows.length;

  return (
    <main
      className={`do-shell is-${model.verdictTone} is-${model.evidenceMode} ${incident ? "has-incident" : "has-normal-workbench"}`}
      data-desktop-overview
      data-visual-grammar="network-console-v1"
      data-desktop-overview-scenario={model.scenario}
      data-desktop-overview-risk={model.risk}
      data-desktop-evidence-mode={model.evidenceMode}
      data-overview-task-contract="overview-task-v1"
      data-desktop-information-efficiency="v2"
    >
      {!runtimeManaged ? (
        <header className="do-fixture-bar" data-desktop-fixture-toolbar>
          <span><Router aria-hidden="true" size={18} /><b>{model.device}</b><small>{model.deviceNote}</small></span>
          <span><LockKeyhole aria-hidden="true" size={15} />只读监控</span>
        </header>
      ) : null}

      <section className="do-status-bus has-proof" aria-labelledby="do-verdict-title" data-desktop-status-bus data-overview-task-landmark="verdict" data-overview-visual-level="primary">
        <div className={`do-verdict is-${model.verdictTone}`}>
          <span className="do-verdict-icon"><VerdictIcon model={model} /></span>
          <div>
            <small data-overview-task-landmark="freshness">{model.evidenceLabel} · {model.evidenceTime}</small>
            <h1 id="do-verdict-title" tabIndex={-1} data-panel-route-title>{model.verdictTitle}</h1>
            <p>{model.verdictSummary}</p>
          </div>
        </div>
        <dl className="do-status-items" data-desktop-core-facts data-overview-task-focus="facts">
          {view.statusItems.map((item) => (
            <div
              className={`is-${item.tone}`}
              data-desktop-status-item={item.key}
              key={item.key}
            >
              <dt>{item.label}</dt><dd><b>{item.value}</b><small>{item.note}</small></dd>
            </div>
          ))}
        </dl>
      </section>
      {incident ? (
        <>
          <DesktopIncidentDocket
            model={model}
            onNavigate={onNavigate}
            investigationActions={<DesktopInvestigationActions model={model} onNavigate={onNavigate} />}
          />
          <div className="do-lower-grid">
            <DesktopLedger
              title="判断边界"
              subtitle="管理面、转发面与业务面分别陈述，不互相冒充"
              rows={view.decisionRows}
              onNavigate={onNavigate}
              module="plane-boundary"
            />
            <div className="do-main-stack">
              <DesktopLedger
                title="来源与操作边界"
                subtitle="成功时间、失败记录和只读约束"
                rows={provenance}
                onNavigate={onNavigate}
                module="provenance"
                taskLandmark="evidence-boundary"
              />
            </div>
          </div>
        </>
      ) : (
        <div className={`do-normal-workspace ${state.scale === "fleet" ? "is-fleet" : ""}`} data-desktop-normal-workspace data-desktop-normal-density="compact">
          <div className={`do-normal-top-band ${model.focusObject && state.scale !== "fleet" ? "has-focus-task" : ""}`} data-desktop-normal-top-band>
            {model.focusObject ? (
              <div className="do-normal-focus-column">
                <DesktopFocusObject object={model.focusObject} evidenceAt={model.evidenceAt} onNavigate={onNavigate} />
                <DesktopInvestigationActions model={model} onNavigate={onNavigate} placement="normal-primary-first" />
              </div>
            ) : null}
            <div className="do-normal-signal">
              {showTraffic && model.traffic ? (
                <DesktopWanEvidence traffic={model.traffic} onOpen={() => onNavigate("trafficAudit")} />
              ) : state.scale === "fleet" ? (
                <div className="do-fleet-preview" data-desktop-fleet-preview data-desktop-fleet-preview-limit={FLEET_PREVIEW_LIMIT}>
                  <div className="do-fleet-preview-content" id={fleetPreviewId}>
                    <DesktopLedger
                      title="当前对象覆盖"
                      subtitle={`按严重程度优先；已显示 ${fleetPreviewRows.length} / ${view.objectRows.length} 项；已隐藏 ${fleetHiddenCount} 项`}
                      rows={fleetPreviewRows}
                      onNavigate={onNavigate}
                      module="fleet-coverage"
                      taskLandmark="object-details"
                      evidenceAt={model.evidenceAt}
                    />
                  </div>
                  {view.objectRows.length > FLEET_PREVIEW_LIMIT ? (
                    <div className="do-fleet-preview-disclosure">
                      <span>{`当前范围共 ${view.objectRows.length} 项；已隐藏 ${fleetHiddenCount} 项`}</span>
                      <button
                        type="button"
                        aria-expanded={fleetExpanded}
                        aria-controls={fleetPreviewId}
                        onClick={() => setFleetExpanded((current) => !current)}
                      >
                        {fleetExpanded ? <ChevronUp aria-hidden="true" size={15} /> : <ChevronDown aria-hidden="true" size={15} />}
                        {fleetExpanded ? "收起对象" : `显示全部 ${view.objectRows.length} 项`}
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : (
                <section className="do-wan-empty" data-desktop-wan-unavailable aria-labelledby="do-wan-empty-title">
                  <Activity aria-hidden="true" size={22} />
                  <div><h2 id="do-wan-empty-title">WAN 趋势证据未形成</h2><p>当前值、历史尾点或采样时间窗不一致，因此不绘制看似实时的曲线。</p></div>
                  <button type="button" onClick={() => onNavigate("trafficAudit")}>查看流量证据</button>
                </section>
              )}
            </div>

          </div>
          {state.scale !== "fleet" && view.objectRows.length > 0 ? (
            <DesktopLedger
              title="对象比较"
              subtitle="WAN 与接口按状态、关系和速率对照"
              rows={view.objectRows}
              onNavigate={onNavigate}
              module="objects"
              taskLandmark="comparison"
              evidenceAt={model.evidenceAt}
            />
          ) : null}
          {!model.focusObject || state.scale === "fleet" ? (
            <DesktopInvestigationActions model={model} onNavigate={onNavigate} placement="normal-primary-first" />
          ) : null}
          <div className="do-normal-decision-band" data-desktop-normal-decision-band data-overview-visual-level="support">
            <DesktopLedger
              title="运行判断"
              subtitle="接口、资源与连接分别回答一个运维问题"
              rows={view.decisionRows}
              onNavigate={onNavigate}
              module="decisions"
            />
          </div>
          <DesktopLedger
            title="来源与操作边界"
            subtitle="成功时间、失败记录和只读约束"
            rows={provenance}
            onNavigate={onNavigate}
            module="provenance"
            taskLandmark="evidence-boundary"
          />
        </div>
      )}
    </main>
  );
}
