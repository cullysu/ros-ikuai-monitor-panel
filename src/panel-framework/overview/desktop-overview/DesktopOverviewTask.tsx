import {
  ChevronRight,
  Router,
  Search,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { PanelNavigate } from "../../routes/panelRoutes";
import { OverviewInvestigationGlyph } from "../components/OverviewInvestigationGlyph";
import { overviewInvestigationHeading, overviewNavigationRisk } from "../evidence-model/buildOverviewInvestigationActions";
import type {
  OverviewEvidenceModel,
  OverviewInvestigationAction,
  OverviewFocusObject,
  OverviewPriorityObject,
  OverviewScenarioFocus,
} from "../evidence-model/overviewEvidenceTypes";

export function DesktopScenarioFocus({ focus, onNavigate }: { focus: OverviewScenarioFocus; onNavigate: PanelNavigate }) {
  return (
    <section
      className={`do-task-focus is-${focus.kind}`}
      data-overview-task-landmark="scenario-focus"
      data-overview-task-focus={focus.kind}
      aria-labelledby="do-task-focus-title"
    >
      <header>
        <div><small>{focus.label}</small><h2 id="do-task-focus-title">{focus.title}</h2><p>{focus.summary}</p></div>
        <b>{focus.items.length} 面</b>
      </header>
      <div className="do-task-focus-grid">
        {focus.items.map((item) => (
          <button className={`is-${item.tone}`} type="button" onClick={() => onNavigate(item.route)} key={item.key}>
            <span><small>{item.label}</small><b>{item.value}</b><em>{item.note}</em></span>
            <ChevronRight aria-hidden="true" size={16} />
          </button>
        ))}
      </div>
    </section>
  );
}

export function DesktopFocusObject({ object, evidenceAt, onNavigate }: {
  object: OverviewFocusObject;
  evidenceAt: string | null;
  onNavigate: PanelNavigate;
}) {
  return (
    <section
      className="do-focus-object"
      data-overview-task-landmark="focus"
      data-overview-task-focus="active-object"
      data-overview-task-focus-object={object.id}
      aria-labelledby="do-focus-object-title"
    >
      <header><div><small>当前核对对象</small><h2 id="do-focus-object-title">{object.category}</h2></div><Router aria-hidden="true" size={18} /></header>
      <div className="do-focus-object-name"><b>{object.name}</b><small>{object.note}</small></div>
      <dl>
        {object.attributes.map((attribute) => <div key={attribute.label}><dt>{attribute.label}</dt><dd>{attribute.value}</dd></div>)}
      </dl>
      <button type="button" onClick={() => onNavigate(object.route, {
        objectId: object.targetObjectId || null,
        returnRoute: "overview",
        evidenceAt,
      })} data-overview-task-landmark="investigation-primary" data-overview-visual-level="next">
        检查路由证据<ChevronRight aria-hidden="true" size={16} />
      </button>
    </section>
  );
}

function IncidentObjectButton({ object, selected, onSelect }: {
  object: OverviewPriorityObject;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      className={`do-task-object is-${object.tone} ${selected ? "is-selected" : ""}`}
      type="button"
      aria-current={selected ? "true" : undefined}
      onClick={onSelect}
      data-overview-task-risk-object={object.id}
    >
      <span><small>{object.category}</small><b>{object.name}</b><em>{object.state}</em><p>{object.reason}</p></span>
      <ChevronRight aria-hidden="true" size={17} />
    </button>
  );
}

export function DesktopIncidentWorkspace({ model, onNavigate }: { model: OverviewEvidenceModel; onNavigate: PanelNavigate }) {
  const defaultObjectId = model.priorityObjectsAll[0]?.id || "";
  const objects = model.priorityObjectsAll;
  const objectIds = objects.map((object) => object.id).join("\u001f");
  const [selectedId, setSelectedId] = useState(defaultObjectId);

  useEffect(() => {
    setSelectedId((current) => (
      current && objects.some((object) => object.id === current)
        ? current
        : defaultObjectId
    ));
  }, [defaultObjectId, objectIds]);

  const effectiveSelectedId = objects.some((object) => object.id === selectedId)
    ? selectedId
    : defaultObjectId;
  const selected = objects.find((object) => object.id === effectiveSelectedId);
  const selectedAction: OverviewInvestigationAction | null = selected
    ? model.investigationActions.find((action) => action.route === selected.route && action.scope === "object") ||
      model.investigationActions.find((action) => action.route === selected.route) ||
      null
    : null;
  return (
    <section className="do-task-workspace" data-overview-task-landmark="risk-objects" data-desktop-incident-priority="primary-object" aria-labelledby="do-task-objects-title">
      <header className="do-task-workspace-heading">
        <div><small>{model.priorityLabel}</small><h2 id="do-task-objects-title">{model.priorityTitle}</h2><p>{objects.length ? "已预选最高优先级对象，可切换核对" : "暂无可安全列出的事故对象"}</p></div>
        <b>{model.priorityTotal} 项</b>
      </header>
      {objects.length ? (
        <div className="do-task-master-detail">
          <div className="do-task-object-list">
            {objects.map((object) => (
              <IncidentObjectButton object={object} selected={selected?.id === object.id} onSelect={() => setSelectedId(object.id)} key={object.id} />
            ))}
          </div>
          {selected ? <section className="do-task-inspector" data-overview-task-landmark="selected-inspector" data-overview-task-inspector={selected.id} aria-labelledby="do-task-inspector-title">
            <header><div><small>所选对象</small><h3 id="do-task-inspector-title">{selected.name}</h3></div><Search aria-hidden="true" size={18} /></header>
            <p><b>{selected.state}</b><span>{selected.reason}</span></p>
            <dl>{selected.attributes.map((attribute) => <div key={attribute.label}><dt>{attribute.label}</dt><dd>{attribute.value}</dd></div>)}</dl>
            <button
              type="button"
              data-desktop-inspector-action-language={selectedAction ? "shared" : "fallback"}
              data-desktop-inspector-action-route={selectedAction?.route || selected.route}
              data-desktop-inspector-action-object-id={selected.targetObjectId || selectedAction?.navigation?.objectId || undefined}
              data-desktop-inspector-action-evidence-at={model.evidenceAt || selectedAction?.navigation?.evidenceAt || undefined}
              onClick={() => onNavigate(selected.route, {
                ...(selectedAction?.navigation || {}),
                objectId: selected.targetObjectId || selectedAction?.navigation?.objectId || null,
                risk: selectedAction?.navigation?.risk || overviewNavigationRisk(model.investigationActions, selected.route),
                returnRoute: selectedAction?.navigation?.returnRoute || "overview",
                evidenceAt: model.evidenceAt || selectedAction?.navigation?.evidenceAt || null,
              })}
              aria-label={`${selectedAction?.label || `检查${selected.category}`}：${selectedAction?.note || selected.reason}`}
            >
              <span>
                <b>{selectedAction?.label || `检查${selected.category}`}</b>
                <small>{selectedAction?.note || selected.reason}</small>
              </span>
              <ChevronRight aria-hidden="true" size={16} />
            </button>
            <div className="do-task-source"><span>采样来源</span><code>{selected.sourcePath}</code></div>
          </section> : <p className="do-task-empty">选择对象查看证据</p>}
        </div>
      ) : <p className="do-task-empty">当前没有可安全列出的事故对象。</p>}
    </section>
  );
}

export function DesktopInvestigationActions({
  model,
  onNavigate,
  placement = "support",
}: {
  model: OverviewEvidenceModel;
  onNavigate: PanelNavigate;
  placement?: "support" | "normal-primary-first";
}) {
  const heading = overviewInvestigationHeading(model.risk === "none", model.investigationActions);
  return (
    <section className={`do-task-actions is-${placement}`} data-overview-task-landmark="investigation" data-overview-task-surface="secondary" data-overview-visual-level="context" aria-labelledby="do-task-actions-title">
      <header><div><small>{heading[0]}</small><h2 id="do-task-actions-title">{heading[1]}</h2></div></header>
      <div>
        {model.investigationActions.map((action) => {
          const navigation = action.navigation || {};
          return (
            <button
              type="button"
              id={action.route}
              data-desktop-action-scope={action.scope}
              data-desktop-action-priority={action.priority}
              data-overview-visual-level={action.priority === "primary" ? "next" : "context"}
              data-desktop-action-object-id={navigation.objectId || undefined}
              data-desktop-action-evidence-at={navigation.evidenceAt || undefined}
              data-desktop-action-from={navigation.returnRoute || undefined}
              aria-label={`${action.scope === "object" ? "对象级调查" : "集合工作区"}：${action.label}。${action.note}`}
              onClick={() => onNavigate(action.route, {
                ...navigation,
                focusId: action.route,
              })}
              key={action.route}
            >
              <span className="do-task-action-icon"><OverviewInvestigationGlyph icon={action.icon} size={17} /></span>
              <span><b>{action.label}</b><small>{action.note}</small></span>
              <ChevronRight aria-hidden="true" size={16} />
            </button>
          );
        })}
      </div>
    </section>
  );
}
