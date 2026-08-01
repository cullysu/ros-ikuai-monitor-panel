import {
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Ellipsis,
  ListFilter,
  Search,
  X,
} from "lucide-react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { OverviewRawSnapshot } from "../overview";
import { PANEL_ROUTES, PANEL_ROUTE_MATURITY_LABELS, type PanelNavigate, type PanelRouteId } from "../routes/panelRoutes";
import { SectionTimeSeriesChart } from "../sections/SectionTimeSeriesChart";
import { buildSectionModel, type SectionModel } from "../sections/sectionModels";
import {
  MORE_ROUTE_GROUPS,
  MORE_ROUTES,
  rowMatchesRisk,
  routeIcon,
  routeTabs,
  rowsFromModel,
  useObjectHistory,
  workspaceLabel,
  type WorkspaceRow,
} from "./mobileDomainWorkspaceModel";
import { domainDefinitionFor, filterWorkspaceRows, sortWorkspaceRows } from "./mobileDomainDefinitions";
import { MobileWorkspaceObjectList } from "./MobileCollectionLedger";
import { MobileInterfaceRouteEvidence } from "./MobileInterfaceRouteEvidence";
import { MobileInterfaceFocusContext, singleDirectInterfaceId } from "./MobileInterfaceFocusContext";
import { MobileInterfaceEvidenceBoundary } from "./MobileInterfaceEvidenceBoundary";
import { MobileTabletInterfaceRelations } from "./MobileTabletInterfaceRelations";
import { MobileDomainInspector } from "./mobile-inspector/MobileDomainInspector";
import { MetricStrip, WorkspaceStatus } from "./MobileWorkspaceSummary";
import { selectSemanticWorkspacePreview } from "./mobileWorkspacePreview";
import { COMPACT_TASK_QUERY, DOMAIN_TABLET_WORKBENCH_QUERY, useMediaCapability } from "./useMobilePanelSurface";
import { useMobileLargeTextMode } from "./useMobileLargeTextMode";
import "./mobile-domain-foundation.css"; import "./mobile-domain.css";
import "./mobile-domain-large-text.css";
function DomainMenu({ onNavigate }: { onNavigate: PanelNavigate }) {
  return (
    <details className="mdw-more">
      <summary aria-label="更多只读工具"><Ellipsis aria-hidden="true" size={21} /></summary>
      <div>
        {MORE_ROUTES.map((item) => (
          <button type="button" data-section={item.route} onClick={() => onNavigate(item.route)} key={item.route}>
            <span>{item.label}</span><ChevronRight aria-hidden="true" size={16} />
          </button>
        ))}
      </div>
    </details>
  );
}

function MobileMoreDirectory({
  model,
  onNavigate,
}: {
  model: SectionModel;
  onNavigate: PanelNavigate;
}) {
  return (
    <main
      className="mdw-shell mdw-directory-shell"
      data-mobile-domain-workspace="more"
      data-mobile-evidence-mode={model.evidenceMode}
    >
      <header className="mdw-header mdw-directory-header">
        <div className="mdw-title-row">
          <span className="mdw-title-icon"><Ellipsis aria-hidden="true" size={22} /></span>
          <div>
            <small>只读工具目录</small>
            <h1 tabIndex={-1} data-panel-route-title>更多工具</h1>
          </div>
        </div>
        <p>{PANEL_ROUTES.more.description}</p>
      </header>

      <div className="mdw-directory-list" aria-label="更多只读工具">
        {MORE_ROUTE_GROUPS.map((group) => (
          <section className="mdw-directory-group" aria-labelledby={`mdw-directory-${group.id}`} key={group.id}>
            <h2 id={`mdw-directory-${group.id}`}>{group.label}</h2>
            <div>
              {MORE_ROUTES.filter((item) => item.group === group.id).map((item) => {
                const ItemIcon = routeIcon(item.route);
                return (
                  <button type="button" data-section={item.route} onClick={() => onNavigate(item.route)} key={item.route}>
                    <span className="mdw-directory-icon"><ItemIcon aria-hidden="true" size={19} /></span>
                    <span className="mdw-directory-copy">
                      <b>{item.label}</b>
                      <small>{PANEL_ROUTES[item.route].description}</small>
                      <em>{PANEL_ROUTE_MATURITY_LABELS[PANEL_ROUTES[item.route].maturity]}</em>
                    </span>
                    <ChevronRight aria-hidden="true" size={17} />
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}

export function MobileDomainWorkspace({
  route,
  snapshot,
  onNavigate,
}: {
  route: PanelRouteId;
  snapshot: OverviewRawSnapshot;
  onNavigate: PanelNavigate;
}) {
  const model = useMemo(() => buildSectionModel(route, snapshot), [route, snapshot]);
  const allRows = useMemo(() => rowsFromModel(route, model), [route, model]);
  const definition = domainDefinitionFor(route);
  const tabs = routeTabs(route);
  const { selectedId, risk, returnRoute, evidenceAt, query: navigationQuery, open, replace, close } = useObjectHistory(route);
  const currentEvidenceAt = evidenceAt || (model.evidenceMode === "current" ? snapshot.updatedAt || null : null);
  const matchingRows = risk ? allRows.filter((row) => rowMatchesRisk(risk, row)) : [];
  const matchingRiskObjects = matchingRows.length;
  const [query, setQuery] = useState(navigationQuery || "");
  const [filter, setFilter] = useState(definition.filters[0]?.id || "all");
  const [sort, setSort] = useState(definition.defaultSort);
  const [page, setPage] = useState(1);
  const compactTask = useMediaCapability(COMPACT_TASK_QUERY);
  const tabletWorkbench = useMediaCapability(DOMAIN_TABLET_WORKBENCH_QUERY);
  const [toolsOpen, setToolsOpen] = useState(false);
  const { largeText, sentinelRef: textScaleSentinelRef } = useMobileLargeTextMode();
  const detailTitleRef = useRef<HTMLHeadingElement>(null);
  const lastTriggerRef = useRef("");
  const rowRefs = useRef(new Map<string, HTMLButtonElement>());

  useEffect(() => {
    setQuery(navigationQuery || "");
    setFilter(definition.filters[0]?.id || "all");
    setSort(definition.defaultSort);
    setPage(1);
    setToolsOpen(false);
  }, [definition, navigationQuery, route]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const searched = allRows.filter((row) => !needle || row.searchText.includes(needle));
    const matched = filterWorkspaceRows(searched, definition, filter);
    return sortWorkspaceRows(matched, definition, sort);
  }, [allRows, definition, filter, query, sort]);

  const pageSize = 20;
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const selectedIndex = selectedId ? filtered.findIndex((row) => row.id === selectedId) : -1;
  const selectedPage = selectedIndex >= 0 ? Math.floor(selectedIndex / pageSize) + 1 : null;
  const activePage = selectedPage || safePage;
  const visibleRows = filtered.slice((activePage - 1) * pageSize, activePage * pageSize);
  const interfaceFocusObjectId = useMemo(
    () => route === "interfaces" && model.evidenceMode === "current" && !tabletWorkbench
      ? singleDirectInterfaceId(visibleRows)
      : null,
    [model.evidenceMode, route, tabletWorkbench, visibleRows],
  );
  const selectedRow = selectedId ? visibleRows.find((row) => row.id === selectedId) || null : null;
  const semanticPreview = useMemo(
    () => risk && !selectedId
      ? selectSemanticWorkspacePreview(matchingRows)
      : risk ? null : selectSemanticWorkspacePreview(visibleRows),
    [matchingRows, risk, selectedId, visibleRows],
  );
  const preview = tabletWorkbench && !selectedRow ? semanticPreview : null;
  const inspectorRow = selectedRow || preview?.row || null;
  const showInspector = Boolean(inspectorRow);
  const showCollectionLedger = tabletWorkbench && !largeText && route === "interfaces" && (risk === "interfaces" || risk === "interface-review") && !selectedRow && !semanticPreview;
  const showTabletCollectionSummary = tabletWorkbench
    && !largeText
    && !model.visualization
    && route !== "logs"
    && route !== "serviceLogs";
  const layoutMode = tabletWorkbench
    ? showInspector
      ? "workbench"
      : showCollectionLedger
        ? "ledger"
        : "tablet-list"
    : compactTask
      ? selectedRow ? "compact-detail" : "compact-list"
      : selectedRow
        ? "phone-detail"
        : "phone-list";
  const Icon = routeIcon(route);
  const hasControls = definition.searchable || definition.filters.length > 1 || definition.sorts.length > 1;
  const controlsActive = Boolean(query || filter !== definition.filters[0]?.id || sort !== definition.defaultSort);

  useEffect(() => {
    if (!selectedId) return;
    if (selectedIndex < 0) {
      replace(null);
      return;
    }
    if (selectedPage !== null && page !== selectedPage) setPage(selectedPage);
  }, [page, replace, selectedId, selectedIndex, selectedPage]);

  useLayoutEffect(() => {
    if (selectedId && selectedRow) {
      detailTitleRef.current?.focus({ preventScroll: true });
      return;
    }
    if (!lastTriggerRef.current) return;
    rowRefs.current.get(lastTriggerRef.current)?.focus({ preventScroll: true });
  }, [selectedId, selectedRow]);

  if (route === "more") {
    return <MobileMoreDirectory model={model} onNavigate={onNavigate} />;
  }

  const openRow = (row: WorkspaceRow) => {
    lastTriggerRef.current = row.id;
    open(row.id);
  };

  const registerRow = (id: string) => (node: HTMLButtonElement | null) => void (node ? rowRefs.current.set(id, node) : rowRefs.current.delete(id));

  const closeDetail = () => {
    if (selectedRow) lastTriggerRef.current = selectedRow.id;
    close();
  };

  const resetControls = () => {
    setQuery("");
    setFilter(definition.filters[0]?.id || "all");
    setSort(definition.defaultSort);
    setPage(1);
  };

  return (
    <main
      className={`mdw-shell ${route === "trafficLoad" ? "is-resource" : ""} ${selectedRow ? "has-selection" : ""} ${compactTask ? "is-compact-task" : ""} ${tabletWorkbench ? "is-tablet-workbench" : ""} ${largeText ? "is-large-text" : ""}`}
      data-mobile-domain-workspace={route}
      data-mobile-evidence-mode={model.evidenceMode}
      data-mobile-domain-layout={layoutMode}
      data-mobile-large-text={largeText ? "true" : "false"}
      data-mobile-log-detail={selectedRow?.evidence.kind === "log" ? "v1" : undefined}
      data-mobile-detail-surface={selectedRow?.evidence.kind === "log" ? "log" : undefined}
      data-tablet-risk-focus="v1"
      data-tablet-task-space={tabletWorkbench && risk ? "master-detail" : undefined}
      data-tablet-task-focus={preview && risk ? "selected-risk-object" : undefined}
      data-tablet-risk-object-id={preview && risk ? preview.row.id : undefined}
    >
      <span className="panel-text-scale-sentinel" aria-hidden="true" ref={textScaleSentinelRef}>M</span>
      <header className="mdw-header">
        <div className="mdw-title-row">
          <span className="mdw-title-icon"><Icon aria-hidden="true" size={20} /></span>
          <div><small>{workspaceLabel(route)}</small><h1 tabIndex={-1} data-panel-route-title>{model.title}</h1></div>
          <DomainMenu onNavigate={onNavigate} />
        </div>
        <WorkspaceStatus
          model={model}
          risk={risk}
          selected={Boolean(selectedRow)}
          evidenceAt={evidenceAt}
          matchingRiskObjects={matchingRiskObjects}
          stackContext={!compactTask && !tabletWorkbench}
          compact={!tabletWorkbench}
        />
        {tabs.length > 1 ? (
          <nav className="mdw-route-switcher" aria-label="当前工作区分类">
            {tabs.map((item) => (
              <button
                type="button"
                aria-current={route === item.route ? "page" : undefined}
                className={route === item.route ? "is-active" : ""}
                onClick={() => onNavigate(item.route)}
                key={item.route}
              >
                {item.label}
              </button>
            ))}
          </nav>
        ) : null}
      </header>

      <div className="mdw-layout">
        <section className="mdw-list-pane" aria-label={model.title + "对象列表"} data-resource-layer={route === "trafficLoad" ? "signal" : undefined} data-resource-layer-question={route === "trafficLoad" ? "current-threshold" : undefined} data-resource-evidence-role={route === "trafficLoad" ? "current-threshold" : undefined}>
          <div className="mdw-list-heading">
            <span><b>{filtered.length}</b> 个{definition.objectLabel}</span>
            <small>{controlsActive ? `从 ${allRows.length} 个对象中筛选` : model.description}</small>
            {hasControls ? (
              <button
                className={controlsActive ? "mdw-tools-toggle is-active" : "mdw-tools-toggle"}
                type="button"
                aria-expanded={toolsOpen}
                aria-controls="mdw-domain-controls"
                onClick={() => setToolsOpen((value) => !value)}
              >
                <ListFilter aria-hidden="true" size={16} />筛选
              </button>
            ) : null}
          </div>

          {hasControls && toolsOpen ? (
            <div className="mdw-controls" id="mdw-domain-controls" role="group" aria-label={`${definition.objectLabel}筛选与排序`} data-domain-controls={route}>
              {definition.searchable ? (
                <label className="mdw-search">
                  <Search aria-hidden="true" size={17} />
                  <span className="sr-only">搜索{definition.objectLabel}</span>
                  <input
                    type="search"
                    value={query}
                    onChange={(event) => { setQuery(event.target.value); setPage(1); }}
                    placeholder={definition.searchPlaceholder}
                  />
                  {query ? (
                    <button type="button" aria-label="清除搜索" onClick={() => { setQuery(""); setPage(1); }}><X aria-hidden="true" size={16} /></button>
                  ) : null}
                </label>
              ) : null}
              <div className="mdw-filter-row">
                {definition.filters.length > 1 ? (
                  <div aria-label={`${definition.objectLabel}筛选`}>
                    {definition.filters.map((item) => (
                      <button
                        type="button"
                        aria-pressed={filter === item.id}
                        onClick={() => { setFilter(item.id); setPage(1); }}
                        key={item.id}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                ) : null}
                {definition.sorts.length > 1 ? (
                  <label>
                    <ArrowUpDown aria-hidden="true" size={15} />
                    <span className="sr-only">排序</span>
                    <select value={sort} onChange={(event) => { setSort(event.target.value); setPage(1); }}>
                      {definition.sorts.map((item) => <option value={item.id} key={item.id}>{item.label}</option>)}
                    </select>
                  </label>
                ) : null}
              </div>
              {route === "logs" ? <MetricStrip model={model} /> : null}
              {controlsActive ? <button className="mdw-reset-controls" type="button" onClick={resetControls}>清除筛选</button> : null}
            </div>
          ) : null}
          {route === "interfaces" && model.evidenceMode !== "current" ? <MobileInterfaceEvidenceBoundary model={model} evidenceAt={currentEvidenceAt} onNavigate={onNavigate} /> : null}
          {!tabletWorkbench && !largeText && route === "interfaces" && model.evidenceMode === "current" ? (
            <>
              <MobileInterfaceFocusContext
                rows={risk ? matchingRows : visibleRows}
                onNavigate={onNavigate}
                evidenceAt={currentEvidenceAt}
                onOpen={(row) => onNavigate("interfaces", { objectId: row.id, returnRoute: "interfaces", evidenceAt: currentEvidenceAt })}
              />
              <MobileInterfaceRouteEvidence
                rows={visibleRows}
                onNavigate={onNavigate}
                evidenceAt={currentEvidenceAt}
                excludeObjectId={interfaceFocusObjectId}
                showRouteAction={false}
              />
            </>
          ) : null}
          {visibleRows.length ? (
            <MobileWorkspaceObjectList
              rows={visibleRows}
              selectedId={selectedRow?.id}
              previewId={preview?.row.id}
              collection={showCollectionLedger ? { model } : undefined}
              onOpen={openRow}
              rowRef={registerRow}
            />
          ) : (
            <div className="mdw-empty">
              <Search aria-hidden="true" size={21} />
              <h2>{allRows.length ? "没有匹配对象" : model.tables[0]?.empty || "没有可显示对象"}</h2>
              <p>{allRows.length ? "调整搜索词或筛选条件。" : model.status}</p>
              {allRows.length ? <button type="button" onClick={resetControls}>清除筛选</button> : null}
            </div>
          )}
          {pageCount > 1 ? (
            <nav className="mdw-pagination" aria-label="对象分页">
              <button type="button" disabled={activePage <= 1} onClick={() => { if (selectedId) replace(null); setPage(Math.max(1, activePage - 1)); }}><ChevronLeft aria-hidden="true" size={17} />上一页</button>
              <span>{activePage} / {pageCount}</span>
              <button type="button" disabled={activePage >= pageCount} onClick={() => { if (selectedId) replace(null); setPage(Math.min(pageCount, activePage + 1)); }}>下一页<ChevronRight aria-hidden="true" size={17} /></button>
            </nav>
          ) : null}

           {(!showInspector && !showCollectionLedger) || model.visualization || showTabletCollectionSummary ? (
             <section className={`mdw-domain-context${showTabletCollectionSummary ? " is-tablet-collection-summary" : ""}`} aria-label={showTabletCollectionSummary ? "领域集合摘要" : "领域摘要证据"} data-tablet-collection-summary={showTabletCollectionSummary ? "true" : undefined} data-resource-layer={route === "trafficLoad" && model.visualization ? "history" : undefined} data-resource-layer-question={route === "trafficLoad" && model.visualization ? "sustained-pressure" : undefined} data-resource-evidence-role={route === "trafficLoad" && model.visualization ? "time-series" : undefined}>
              {(!showInspector || showTabletCollectionSummary || route === "trafficLoad" || route === "loadAudit") && route !== "logs" ? <MetricStrip model={model} /> : null}
              {model.visualization ? <SectionTimeSeriesChart visualization={model.visualization} /> : null}
             </section>
           ) : null}
          {tabletWorkbench && !largeText && route === "interfaces" && model.evidenceMode === "current" && !showCollectionLedger ? (
            <MobileTabletInterfaceRelations rows={filtered} onNavigate={onNavigate} evidenceAt={evidenceAt} />
          ) : null}
         </section>

        {showInspector ? (
          <MobileDomainInspector
            row={inspectorRow}
            model={model}
            route={route}
            returnRoute={returnRoute}
            originEvidenceAt={currentEvidenceAt || snapshot.updatedAt || model.observedAt || null}
            originRisk={risk}
            onClose={!tabletWorkbench && selectedRow ? closeDetail : undefined}
            titleRef={detailTitleRef}
            preview={Boolean(preview && !selectedRow)}
            previewLabel={preview?.label}
            relatedRows={inspectorRow ? visibleRows.filter((row) => row.id !== inspectorRow?.id) : []}
            onOpenRelated={openRow}
            onNavigate={onNavigate}
          />
        ) : null}
      </div>
    </main>
  );
}
