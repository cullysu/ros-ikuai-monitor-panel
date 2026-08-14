import { Activity, ArrowUpRight, ChevronRight, CircleHelp, Link2, RotateCcw, ServerOff, ShieldAlert } from "lucide-react";
import type { IncidentLensFact, IncidentLensModel, IncidentLensObject } from "./types";
import { incidentLensObjectDomId } from "./useIncidentLensSelectionHistory";
import "./styles/incidents-next.css";

type FactMarker = "impact" | "evidence" | "proof";

function FactGrid({ title, facts, marker, note }: { title: string; facts: IncidentLensFact[]; marker: FactMarker; note?: string }) {
  if (!facts.length) return null;
  return <section className="incident-lens__next-facts" data-incident-lens-lens={marker} data-incident-lens-impact={marker === "impact" ? "true" : undefined} data-incident-lens-evidence={marker === "evidence" ? "true" : undefined} data-incident-lens-proof={marker === "proof" ? "true" : undefined} aria-label={title}>
    <header><strong>{title}</strong>{note ? <small>{note}</small> : null}</header>
    <dl>{facts.map((fact) => <div key={`${marker}-${fact.label}`} data-incident-lens-tone={fact.tone}><dt>{fact.label}</dt><dd>{fact.value}</dd>{fact.note ? <small>{fact.note}</small> : null}</div>)}</dl>
  </section>;
}

function ObjectWorklist({ objects, selectedId, onSelect, limit, label = "相关对象" }: { objects: IncidentLensObject[]; selectedId: string; onSelect: (id: string) => void; limit?: number; label?: string }) {
  const visible = objects.slice(0, limit);
  if (!visible.length) return null;
  return <section className="incident-lens__next-objects" data-incident-lens-object-worklist aria-label={label}>
    <header><strong>{label}</strong><small>{objects.length > visible.length ? `先显示 ${visible.length} 项` : "按风险排序"}</small></header>
    <div>{visible.map((object) => <button type="button" key={object.id} data-incident-lens-claim-control data-incident-lens-claim-id={object.id} data-incident-lens-secondary={object.kind} data-incident-lens-tone={object.tone} aria-pressed={selectedId === object.id} onClick={() => onSelect(object.id)}>
      <span><small>{object.category}</small><strong>{object.title}</strong><em>{object.state}</em></span><ChevronRight size={18} aria-hidden="true" />
    </button>)}</div>
  </section>;
}

function PrimaryAction({ object, onOpen, label }: { object: IncidentLensObject; onOpen?: (id: string) => void; label?: string }) {
  if (!object.action) return null;
  return <section className="incident-lens__next-action" data-incident-lens-action-zone aria-label="下一检查">
    <header><strong>{label || "下一检查"}</strong></header>
    <button type="button" data-incident-lens-action data-incident-lens-action-route={object.action.route} data-incident-lens-action-target={object.action.targetObjectId} onClick={() => onOpen?.(object.id)}>
      <span><small>{object.action.note}</small><strong>{object.action.label}</strong></span><ArrowUpRight size={18} aria-hidden="true" />
    </button>
  </section>;
}

function SceneIdentity({ object, fleet, icon }: { object: IncidentLensObject; fleet: boolean; icon: React.ReactNode }) {
  const state = object.signal?.kind === "pressure" ? "超阈值" : object.state;
  return <header className="incident-lens__next-identity" data-incident-lens-risk-identity data-incident-lens-tone={object.tone}>
    <span className="incident-lens__next-identity-icon" aria-hidden="true">{icon}</span>
    <span><small>{fleet ? `多对象范围 · ${object.category}` : object.category}</small><h2>{object.title}</h2></span>
    <strong>{state}</strong>
  </header>;
}

function ResourceScene({ incident, activeObject, secondaryObjects, selectedId, onSelect, onOpen, fleet }: SceneProps) {
  const pressure = incident.signal?.kind === "pressure" ? incident.signal : null;
  const comparison = [
    pressure ? { label: pressure.label, value: `${Math.round(pressure.value)}%`, note: `阈值 ${Math.round(pressure.threshold)}%`, tone: incident.tone } : null,
    ...incident.impact,
  ].filter(Boolean) as IncidentLensFact[];
  return <>
    <section className="incident-lens__next-case incident-lens__next-case--resource" data-incident-lens-workspace data-incident-lens-evidence-deck data-incident-lens-expanded-claim={activeObject.id} data-incident-lens-claim-kind={activeObject.kind} id={incidentLensObjectDomId(activeObject.id)} tabIndex={-1} aria-label="资源压力">
      <SceneIdentity object={incident} fleet={fleet} icon={<Activity size={21} />} />
      <PrimaryAction object={activeObject} onOpen={onOpen} label="查看资源样本" />
      <section className="incident-lens__next-pressure" data-incident-lens-resource-geometry aria-label={pressure ? `${pressure.label} 当前 ${Math.round(pressure.value)}%，阈值 ${Math.round(pressure.threshold)}%` : "资源压力"}>
        <header><strong>当前值与策略阈值</strong><small>{pressure?.note || "缺少当前样本"}</small></header>
        <div>{comparison.map((item) => <article key={item.label} data-incident-lens-tone={item.tone}><small>{item.label}</small><strong>{item.value}</strong><span>{item.note}</span></article>)}</div>
      </section>
      <FactGrid title="连续性证据" facts={[...incident.facts, ...incident.evidence]} marker="proof" note="只统计尾部连续超限样本" />
    </section>
    <ObjectWorklist objects={secondaryObjects} selectedId={selectedId} onSelect={onSelect} label="相关运行对象" />
  </>;
}

function CollectionScene({ incident, activeObject, secondaryObjects, selectedId, onSelect, onOpen, fleet }: SceneProps) {
  return <>
    <section className="incident-lens__next-case incident-lens__next-case--collection" data-incident-lens-workspace data-incident-lens-evidence-deck data-incident-lens-expanded-claim={activeObject.id} data-incident-lens-claim-kind={activeObject.kind} id={incidentLensObjectDomId(activeObject.id)} tabIndex={-1} aria-label="采集边界">
      <SceneIdentity object={incident} fleet={fleet} icon={<ServerOff size={21} />} />
      <PrimaryAction object={activeObject} onOpen={onOpen} />
      <p className="incident-lens__next-summary">{incident.summary}</p>
      <FactGrid title="当前业务边界" facts={incident.impact} marker="impact" note="未观测不等于数值为零" />
      <FactGrid title="通道矩阵" facts={incident.facts} marker="proof" note="REST 与 SSH 分别判定" />
      <FactGrid title="最近可确认的证据" facts={incident.evidence} marker="evidence" />
    </section>
    <ObjectWorklist objects={secondaryObjects} selectedId={selectedId} onSelect={onSelect} label="需要交叉确认" />
  </>;
}

function InterfaceScene({ incident, activeObject, secondaryObjects, selectedId, onSelect, onOpen, fleet }: SceneProps) {
  const dependency = incident.impact;
  return <>
    <section className="incident-lens__next-case incident-lens__next-case--interfaces" data-incident-lens-workspace data-incident-lens-evidence-deck data-incident-lens-expanded-claim={activeObject.id} data-incident-lens-claim-kind={activeObject.kind} id={incidentLensObjectDomId(activeObject.id)} tabIndex={-1} aria-label="接口依赖链">
      <SceneIdentity object={incident} fleet={fleet} icon={<Link2 size={21} />} />
      <PrimaryAction object={activeObject} onOpen={onOpen} label="核对接口依赖" />
      <p className="incident-lens__next-summary">{incident.summary}</p>
      <section className="incident-lens__next-chain" data-incident-lens-dependency-chain aria-label="接口到默认路径的依赖关系">
        <header><strong>依赖链</strong><small>只列出明确关联</small></header>
        <div><span>{incident.title}</span><i aria-hidden="true" /><span>{dependency[0]?.value || "默认路径未证明"}</span>{dependency[1] ? <><i aria-hidden="true" /><span>{dependency[1].value}</span></> : null}</div>
      </section>
      <FactGrid title="运行标记" facts={incident.facts} marker="proof" />
    </section>
    <div className="incident-lens__next-interface-evidence">
      <FactGrid title="关联证据" facts={incident.evidence} marker="evidence" />
    </div>
    <ObjectWorklist objects={secondaryObjects} selectedId={selectedId} onSelect={onSelect} label={fleet ? "同范围风险对象" : "相邻检查对象"} />
  </>;
}

function OfflineScene({ incident, activeObject, secondaryObjects, selectedId, onSelect, onOpen, fleet }: SceneProps) {
  return <>
    <section className="incident-lens__next-case incident-lens__next-case--offline" data-incident-lens-workspace data-incident-lens-evidence-deck data-incident-lens-expanded-claim={activeObject.id} data-incident-lens-claim-kind={activeObject.kind} id={incidentLensObjectDomId(activeObject.id)} tabIndex={-1} aria-label="出口恢复路径">
      <SceneIdentity object={incident} fleet={fleet} icon={<RotateCcw size={21} />} />
      <PrimaryAction object={activeObject} onOpen={onOpen} label="查看出口对象" />
      <p className="incident-lens__next-summary">{incident.summary}</p>
      <ol className="incident-lens__next-recovery" data-incident-lens-recovery-sequence>
        <li><span>1</span><strong>确认出口范围</strong><small>{incident.facts[0]?.value || incident.state}</small></li>
        <li><span>2</span><strong>核对活动默认路径</strong><small>{incident.impact[0]?.value || "未核实"}</small></li>
        <li><span>3</span><strong>以最近证据判断恢复</strong><small>{incident.evidence[1]?.value || incident.evidence[0]?.value || "未记录"}</small></li>
      </ol>
    </section>
    <ObjectWorklist objects={secondaryObjects} selectedId={selectedId} onSelect={onSelect} limit={2} label="受影响对象" />
  </>;
}

function SnapshotScene({ incident, activeObject, secondaryObjects, selectedId, onSelect, onOpen, fleet }: SceneProps) {
  return <>
    <section className="incident-lens__next-case incident-lens__next-case--snapshot" data-incident-lens-workspace data-incident-lens-evidence-deck data-incident-lens-expanded-claim={activeObject.id} data-incident-lens-claim-kind={activeObject.kind} id={incidentLensObjectDomId(activeObject.id)} tabIndex={-1} aria-label="当前快照不可用">
      <SceneIdentity object={incident} fleet={fleet} icon={<CircleHelp size={21} />} />
      <PrimaryAction object={activeObject} onOpen={onOpen} label="查看快照边界" />
      <p className="incident-lens__next-summary">{incident.summary}</p>
      <section className="incident-lens__next-known-boundary" data-incident-lens-known-unknown aria-label="已知与未知边界">
        <div><header><strong>当前不可用</strong></header><p>{incident.impact.map((fact) => `${fact.label}：${fact.value}`).join(" · ")}</p></div>
        <div><header><strong>仍可确认</strong></header><p>{incident.evidence.map((fact) => `${fact.label}：${fact.value}`).join(" · ")}</p></div>
      </section>
      <FactGrid title="采集通道状态" facts={incident.facts} marker="proof" />
    </section>
    <ObjectWorklist objects={secondaryObjects} selectedId={selectedId} onSelect={onSelect} label="可继续核验的对象" />
  </>;
}

type SceneProps = {
  incident: IncidentLensObject;
  activeObject: IncidentLensObject;
  secondaryObjects: IncidentLensObject[];
  selectedId: string;
  onSelect: (id: string) => void;
  onOpen?: (id: string) => void;
  fleet: boolean;
};

function TabletIncidentRelations({ model }: { model: IncidentLensModel }) {
  const records = model.risk === "resource"
    ? [
      { label: "恢复判据", value: "尾部连续超限归零", note: "只使用同一资源序列的后续样本" },
      { label: "样本一致性", value: "当前值与历史末点对齐", note: "不把不同采样窗口拼成趋势" },
      { label: "业务边界", value: "资源压力不等于转发中断", note: "业务可用性需独立证据判断" },
    ]
    : model.risk === "wan"
      ? [
        { label: "出口恢复", value: "至少一个 WAN 重新运行", note: "以新的接口运行记录确认" },
        { label: "路径恢复", value: "出现可核验活动默认路径", note: "必须由 route 与 WAN 明确关联" },
        { label: "数值恢复", value: "新设备快照到达后再显示", note: "历史速率不冒充当前速率" },
      ]
      : model.risk === "collection" || model.risk === "evidence"
        ? [
          { label: "管理通道", value: "REST 与 SSH 分别恢复", note: "任一通道结果不替代另一通道" },
          { label: "转发边界", value: "不由管理连通性推断", note: "WAN 与默认路径需独立记录" },
          { label: "数值恢复", value: "新设备快照到达后再显示", note: "缺失观测保持不可用" },
        ]
        : [
          { label: "接口恢复", value: "运行标记回到预期状态", note: "以新的接口快照确认" },
          { label: "依赖恢复", value: "默认路径重新关联运行接口", note: "不使用名称相似作为关联证据" },
          { label: "业务边界", value: "终端与连接仍需独立检查", note: "接口恢复不自动证明业务恢复" },
        ];
  const title = model.risk === "resource"
    ? "恢复条件与判断边界"
    : model.risk === "wan"
      ? "出口恢复条件"
      : model.risk === "collection" || model.risk === "evidence"
        ? "采集恢复条件"
        : "接口恢复条件";
  return <section className="incident-lens__next-tablet-relations" data-incident-lens-tablet-relations aria-label={title}>
    <header><strong>{title}</strong><small>满足条件后才更新结论</small></header>
    <div>{records.map((record) => <article key={record.label}>
      <span><small>{record.label}</small><b>{record.value}</b></span>
      <p>{record.note}</p>
    </article>)}</div>
  </section>;
}

export function IncidentWorkspace({ model, selectedId, onSelect, onOpen }: { model: IncidentLensModel; selectedId: string; onSelect: (id: string) => void; onOpen?: (id: string) => void }) {
  const incident = model.incident;
  if (!incident) return null;
  const activeObject = [incident, ...model.secondaryObjects].find((object) => object.id === selectedId) || incident;
  const secondaryObjects = model.secondaryObjects.filter((object) => object.id !== activeObject.id);
  const props: SceneProps = { incident, activeObject, secondaryObjects, selectedId, onSelect, onOpen, fleet: model.scale === "fleet" };
  const scene = model.risk === "resource"
    ? <ResourceScene {...props} />
    : model.risk === "collection"
      ? <CollectionScene {...props} />
      : model.risk === "interfaces" || model.risk === "interface-review"
        ? <InterfaceScene {...props} />
        : model.risk === "wan" && model.scenario === "all-offline"
          ? <OfflineScene {...props} />
          : <SnapshotScene {...props} />;

  return <section className="incident-lens__incident incident-lens__incident--next" data-incident-lens-incident data-incident-lens-risk={model.risk} data-incident-lens-scene-next={model.risk} aria-label="异常核验工作区">
    {scene}
    <TabletIncidentRelations model={model} />
  </section>;
}
