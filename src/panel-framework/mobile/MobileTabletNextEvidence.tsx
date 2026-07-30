import { ChevronRight, GitCompareArrows, Link2, Network } from "lucide-react";
import type { PanelNavigate } from "../routes/panelRoutes";
import type {
  OverviewComparisonObject,
  OverviewPriorityObject,
} from "../overview/evidence-model/overviewEvidenceTypes";
import { overviewObjectInvestigationAction } from "../overview/evidence-model/buildOverviewInvestigationActions";
import { formatRfc3339Local } from "../timeContract";
import { MobileTabletNormalComparisonInspector } from "./MobileTabletNormalComparisonInspector";
import "./mobile-tablet-next-evidence.css";

type TabletNextEvidenceKind = "normal" | "incident";

function attributeValue(object: OverviewPriorityObject, label: string): string {
  return object.attributes.find((attribute) => attribute.label === label)?.value || "未记录";
}

export function MobileTabletNextEvidence({
  kind,
  comparisonObjects,
  priorityObjects,
  evidenceAt,
  selectedObjectId,
  onOpen,
  onSelectObject,
  showInspector = true,
}: {
  kind: TabletNextEvidenceKind;
  comparisonObjects: OverviewComparisonObject[];
  priorityObjects: OverviewPriorityObject[];
  evidenceAt: string | null;
  selectedObjectId?: string;
  onOpen: (route: OverviewComparisonObject["route"] | OverviewPriorityObject["route"], targetObjectId?: string | null) => void;
  onSelectObject?: (objectId: string) => void;
  showInspector?: boolean;
}) {
  const isNormal = kind === "normal";
  const normalRows = comparisonObjects.filter((object, index, objects) => (
    objects.findIndex((candidate) => candidate.object === object.object) === index
  ));
  const rows = isNormal ? normalRows : priorityObjects;
  const selectedNormalObject = isNormal
    ? normalRows.find((object) => object.id === selectedObjectId) || null
    : null;
  const selectedNormalAction = selectedNormalObject
    ? overviewObjectInvestigationAction(selectedNormalObject, evidenceAt)
    : null;

  return (
    <section
      className={`mp-tablet-next-evidence is-${kind}`}
      data-tablet-next-evidence-workspace={kind}
      data-tablet-next-evidence-kind={isNormal ? "object-coverage" : "impact-trace"}
      data-tablet-next-evidence-new-decision="true"
      data-overview-task-landmark={isNormal && normalRows.length && normalRows.every((object) => object.route !== "routes") ? "comparison" : undefined}
      aria-labelledby={`mp-tablet-next-evidence-${kind}-title`}
    >
      <header className="mp-tablet-next-evidence-header">
        <span className="mp-section-kicker">
          {isNormal ? <GitCompareArrows aria-hidden="true" size={15} /> : <Link2 aria-hidden="true" size={15} />}
          {isNormal ? "对象关系" : "影响关系"}
        </span>
        <div>
          <h2 id={`mp-tablet-next-evidence-${kind}-title`}>
            {isNormal ? "对象比较" : "比较受影响对象"}
          </h2>
          <p>
            {isNormal
              ? `${normalRows.length} 个对象有独立来源；继续核对对象角色与路径关系。`
              : `${priorityObjects.length} 个对象有独立来源；比较依赖关系后再进入对象详情。`}
          </p>
        </div>
        {evidenceAt ? (
          <time dateTime={evidenceAt} data-tablet-next-evidence-at>
            {formatRfc3339Local(evidenceAt) || "证据时间未取得"}
          </time>
        ) : <span className="mp-tablet-next-evidence-unavailable">证据时间未取得</span>}
      </header>

      <div className="mp-tablet-next-evidence-list">
        {isNormal
          ? normalRows.map((object) => (
            <button
              type="button"
              key={object.id}
              id={object.id}
              className={selectedObjectId === object.id ? "is-selected" : ""}
              aria-current={selectedObjectId === object.id ? "true" : undefined}
              data-tablet-next-evidence-selected-object={selectedObjectId === object.id ? object.id : undefined}
              data-tablet-next-evidence-row="normal"
              data-tablet-next-evidence-source-path={object.source}
              onClick={() => onSelectObject?.(object.id)}
            >
              <span className="mp-tablet-next-evidence-icon"><Network aria-hidden="true" size={17} /></span>
              <span className="mp-tablet-next-evidence-copy">
                <b>{object.object}</b>
                <small>{object.category} · {object.state} · {object.evidence}</small>
              </span>
              <code>{object.source}</code>
              <ChevronRight aria-hidden="true" size={17} />
            </button>
          ))
          : priorityObjects.map((object) => (
            <button
              type="button"
              key={object.id}
              className={selectedObjectId === object.id ? "is-selected" : ""}
              data-tablet-next-evidence-row="incident"
              data-tablet-next-evidence-source-path={object.sourcePath}
              onClick={() => onSelectObject?.(object.id)}
            >
              <span className={`mp-tablet-next-evidence-status is-${object.tone}`} aria-hidden="true" />
              <span className="mp-tablet-next-evidence-copy">
                <b>{object.name}</b>
                <small>{attributeValue(object, "默认路由依赖")} · {attributeValue(object, "角色 / 类型")}</small>
              </span>
              <code>{object.sourcePath}</code>
              <ChevronRight aria-hidden="true" size={17} />
            </button>
          ))}
      </div>

      {showInspector && selectedNormalObject && selectedNormalAction ? (
        <MobileTabletNormalComparisonInspector
          object={selectedNormalObject}
          action={selectedNormalAction}
          evidenceAt={evidenceAt}
          onOpen={(action) => onOpen(action.route, action.navigation?.objectId || null)}
        />
      ) : null}

      {!rows.length ? (
        <p className="mp-tablet-next-evidence-empty" data-tablet-next-evidence-empty>
          当前没有足够的对象关系证据；不填入推测数据。
        </p>
      ) : null}
    </section>
  );
}
