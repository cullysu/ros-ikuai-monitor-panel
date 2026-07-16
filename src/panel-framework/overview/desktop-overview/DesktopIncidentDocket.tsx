import { CircleAlert, TriangleAlert } from "lucide-react";
import type { PanelRouteId } from "../../routes/panelRoutes";
import type { OverviewEvidenceModel } from "../evidence-model/overviewEvidenceTypes";
import { DesktopLedger } from "./DesktopLedger";
import type { DesktopLedgerRow } from "./desktopOverviewModel";

export function DesktopIncidentDocket({
  model,
  onNavigate,
}: {
  model: OverviewEvidenceModel;
  onNavigate: (route: PanelRouteId) => void;
}) {
  const rows: DesktopLedgerRow[] = model.priorityObjects.map((object) => ({
    id: object.id,
    category: object.category,
    object: object.name,
    state: object.state,
    evidence: object.reason,
    source: object.sourcePath,
    tone: object.tone,
    route: object.route,
  }));
  return (
    <section className={`do-incident is-${model.verdictTone}`} aria-labelledby="do-incident-title" data-desktop-incident={model.risk}>
      <header className="do-incident-heading">
        <span aria-hidden="true">{model.verdictTone === "danger" ? <CircleAlert size={22} /> : <TriangleAlert size={22} />}</span>
        <div><small>{model.risk === "resource" ? "压力采样" : "影响与来源"}</small><h2 id="do-incident-title">处置证据</h2><p>先核对判断依据，再进入对应对象；此处不重复顶层结论。</p></div>
        <b>{model.priorityTotal ? `${model.priorityTotal} 项` : "需核对"}</b>
      </header>
      <div className="do-incident-facts" aria-label="事故判断依据">
        {model.facts.map((fact) => (
          <div className={`is-${fact.tone}`} data-desktop-incident-fact={fact.key} key={fact.key}>
            <small>{fact.label}</small><b>{fact.value}</b><span>{fact.note || "来源见下方账本"}</span>
          </div>
        ))}
      </div>
      <DesktopLedger
        title="影响对象"
        subtitle="按判断优先级列出；每项保留详情入口和原始来源路径"
        rows={rows}
        onNavigate={onNavigate}
        module="incident-objects"
        emptyLabel="当前没有可安全列出的对象；请按证据边界核对采集来源。"
      />
    </section>
  );
}
