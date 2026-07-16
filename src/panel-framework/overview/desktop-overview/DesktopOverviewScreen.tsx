import { Activity, CircleAlert, LockKeyhole, Router, ShieldCheck, TriangleAlert } from "lucide-react";
import { useMemo } from "react";
import type { PanelRouteId } from "../../routes/panelRoutes";
import type { OverviewPanelProps } from "../index";
import type { OverviewEvidenceModel } from "../evidence-model/overviewEvidenceTypes";
import { DesktopIncidentDocket } from "./DesktopIncidentDocket";
import { DesktopLedger } from "./DesktopLedger";
import { DesktopWanEvidence } from "./DesktopWanEvidence";
import { buildDesktopOverviewModel, type DesktopLedgerRow } from "./desktopOverviewModel";
import "./styles/desktop-overview-tokens.css";
import "./styles/desktop-overview.css";
import "./styles/desktop-overview-responsive.css";

function VerdictIcon({ model }: { model: OverviewEvidenceModel }) {
  if (model.verdictTone === "danger") return <CircleAlert aria-hidden="true" size={24} />;
  if (model.verdictTone === "warn" || model.verdictTone === "missing") return <TriangleAlert aria-hidden="true" size={24} />;
  return <ShieldCheck aria-hidden="true" size={24} />;
}

function sourceRows(model: OverviewEvidenceModel): DesktopLedgerRow[] {
  const paths: Record<string, string> = {
    target: "meta.routerHost + meta.target",
    success: "latestBusinessSuccessTime(meta)",
    failures: "meta.*EndpointFailures",
    boundary: "capabilities + read-only policy",
  };
  return model.evidenceRows.map((row) => ({
    id: `source:${row.key}`,
    category: "来源",
    object: row.label,
    state: row.value,
    evidence: row.note,
    source: paths[row.key] || row.key,
    tone: row.tone,
    route: "readonlyDiagnostics",
  }));
}

export interface DesktopOverviewScreenProps extends OverviewPanelProps {
  onNavigate: (route: PanelRouteId) => void;
  runtimeManaged?: boolean;
}

export function DesktopOverviewScreen({ snapshot, state, onNavigate, runtimeManaged = false }: DesktopOverviewScreenProps) {
  const view = useMemo(() => buildDesktopOverviewModel(snapshot, state), [snapshot, state]);
  const model = view.evidence;
  const incident = model.risk !== "none";
  const showTraffic = !incident && state.scale !== "fleet" && Boolean(model.traffic);
  const provenance = sourceRows(model);

  return (
    <main
      className={`do-shell is-${model.verdictTone} is-${model.evidenceMode} ${incident ? "has-incident" : "has-normal-workbench"}`}
      data-desktop-overview
      data-desktop-overview-scenario={model.scenario}
      data-desktop-overview-risk={model.risk}
      data-desktop-evidence-mode={model.evidenceMode}
    >
      {!runtimeManaged ? (
        <header className="do-fixture-bar" data-desktop-fixture-toolbar>
          <span><Router aria-hidden="true" size={18} /><b>{model.device}</b><small>{model.deviceNote}</small></span>
          <span><LockKeyhole aria-hidden="true" size={15} />只读监控</span>
        </header>
      ) : null}

      <section className="do-status-bus" aria-labelledby="do-verdict-title" data-desktop-status-bus>
        <div className={`do-verdict is-${model.verdictTone}`}>
          <span className="do-verdict-icon"><VerdictIcon model={model} /></span>
          <div><small>{model.verdictLabel}</small><h1 id="do-verdict-title" tabIndex={-1} data-panel-route-title>{model.verdictTitle}</h1><p>{model.verdictSummary}</p></div>
        </div>
        <dl className="do-status-items">
          {view.statusItems.map((item) => (
            <div className={`is-${item.tone}`} data-desktop-status-item={item.key} key={item.key}>
              <dt>{item.label}</dt><dd><b>{item.value}</b><small>{item.note}</small></dd>
            </div>
          ))}
        </dl>
      </section>

      {incident ? (
        <>
          <DesktopIncidentDocket model={model} onNavigate={onNavigate} />
          <div className="do-lower-grid">
            <DesktopLedger
              title="判断边界"
              subtitle="管理面、转发面与业务面分别陈述，不互相冒充"
              rows={view.decisionRows}
              onNavigate={onNavigate}
              module="plane-boundary"
            />
            <DesktopLedger
              title="来源与操作边界"
              subtitle="成功时间、失败记录和只读约束"
              rows={provenance}
              onNavigate={onNavigate}
              module="provenance"
            />
          </div>
        </>
      ) : (
        <>
          <div className="do-main-grid">
            {showTraffic && model.traffic ? (
              <DesktopWanEvidence traffic={model.traffic} onOpen={() => onNavigate("trafficAudit")} />
            ) : state.scale === "fleet" ? (
              <DesktopLedger
                title="当前对象覆盖"
                subtitle="Fleet 只表示范围；对象异常仍按实际风险排序"
                rows={view.objectRows}
                onNavigate={onNavigate}
                module="fleet-coverage"
              />
            ) : (
              <section className="do-wan-empty" data-desktop-wan-unavailable aria-labelledby="do-wan-empty-title">
                <Activity aria-hidden="true" size={22} />
                <div><h2 id="do-wan-empty-title">WAN 趋势证据未形成</h2><p>当前值、历史尾点或采样时间窗不一致，因此不绘制看似实时的曲线。</p></div>
                <button type="button" onClick={() => onNavigate("trafficAudit")}>查看流量证据</button>
              </section>
            )}
            <DesktopLedger
              title="运行判断"
              subtitle="每一行回答一个不同的运维问题"
              rows={view.decisionRows}
              onNavigate={onNavigate}
              module="decisions"
            />
          </div>
          <div className={`do-lower-grid ${state.scale === "fleet" ? "is-fleet" : ""}`}>
            {state.scale !== "fleet" ? (
              <DesktopLedger
                title="运行对象"
                subtitle="从聚合判断下钻到 WAN 与接口对象"
                rows={view.objectRows}
                onNavigate={onNavigate}
                module="objects"
              />
            ) : null}
            <DesktopLedger
              title="来源与操作边界"
              subtitle="成功时间、失败记录和只读约束"
              rows={provenance}
              onNavigate={onNavigate}
              module="provenance"
            />
          </div>
        </>
      )}
    </main>
  );
}
