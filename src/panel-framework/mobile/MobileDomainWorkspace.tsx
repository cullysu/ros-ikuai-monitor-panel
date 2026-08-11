import {
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ListFilter,
  Search,
  X,
} from "lucide-react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { OverviewRawSnapshot } from "../overview";
import type { PanelNavigate, PanelRouteId } from "../routes/panelRoutes";
import { panelWorkspaceLabel as workspaceLabel, panelWorkspaceTabs as routeTabs } from "../routes/panelWorkspaceCatalog";
import { RouteEvidenceBoundary } from "../sections/RouteEvidenceBoundary";
import { MobileRouteSupplement } from "../sections/MobileRouteSupplement";
import { SectionTimeSeriesChart } from "../sections/SectionTimeSeriesChart";
import { useRouteSupplementEvidence } from "../sections/useRouteSupplementEvidence";
import { sectionRecoveryState } from "../sections/route-recovery/routeRecoveryState";
import { buildSectionModel } from "../sections/sectionModels";
import {
  rowMatchesRisk,
  routeIcon,
  rowsFromModel,
  useMobileWorkspaceHistory,
  useObjectHistory,
  type WorkspaceRow,
} from "./mobileDomainWorkspaceModel";
import { domainDefinitionFor, filterWorkspaceRows, sortWorkspaceRows } from "./mobileDomainDefinitions";
import { MobileWorkspaceObjectList } from "./MobileCollectionLedger";
import { DomainMenu, MobileMoreDirectory } from "./MobileDomainDirectory";
import { MobileDomainEvidenceWorkspace } from "./MobileDomainEvidenceWorkspace";
import { MobileInterfaceRouteEvidence } from "./MobileInterfaceRouteEvidence";
import { MobileInterfaceFocusContext, singleDirectInterfaceId } from "./MobileInterfaceFocusContext";
import { MobileTabletInterfaceRelations } from "./MobileTabletInterfaceRelations";
import { MobileDomainInspector } from "./mobile-inspector/MobileDomainInspector";
import { MetricStrip, WorkspaceStatus } from "./MobileWorkspaceSummary";
import { selectSemanticWorkspacePreview } from "./mobileWorkspacePreview";
import { COMPACT_TASK_QUERY, DOMAIN_TABLET_WORKBENCH_QUERY, useMediaCapability } from "./useMobilePanelSurface";
import { useMobileLargeTextMode } from "./useMobileLargeTextMode";
import "./mobile-domain-foundation.css";
import "./mobile-domain.css";
import "./mobile-domain-large-text.css";
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
  const defaultFilter = definition.filters[0]?.id || "all";
  const { workspace, workspaceRestoreVersion, replaceWorkspace } = useMobileWorkspaceHistory(route, defaultFilter, definition.defaultSort, navigationQuery || "");
  const workspaceSearch = workspace.search;
  const workspaceFilter = definition.filters.some((item) => item.id === workspace.filter) ? workspace.filter : defaultFilter;
  const workspaceSort = definition.sorts.some((item) => item.id === workspace.sort) ? workspace.sort : definition.defaultSort;
  const [query, setQuery] = useState(workspaceSearch);
  const [filter, setFilter] = useState(workspaceFilter);
  const [sort, setSort] = useState(workspaceSort);
  const [page, setPage] = useState(workspace.page);
  const compactTask = useMediaCapability(COMPACT_TASK_QUERY);
  const tabletWorkbench = useMediaCapability(DOMAIN_TABLET_WORKBENCH_QUERY);
  const [toolsOpen, setToolsOpen] = useState(workspace.toolsOpen);
  const supplement = useRouteSupplementEvidence(route);
  const { largeText, sentinelRef: textScaleSentinelRef } = useMobileLargeTextMode();
  const detailTitleRef = useRef<HTMLHeadingElement>(null);
  const lastTriggerRef = useRef("");
  const restoredWorkspaceVersionRef = useRef(-1);
  const rowRefs = useRef(new Map<string, HTMLButtonElement>());
  useLayoutEffect(() => {
    setQuery(workspaceSearch);
    setFilter(workspaceFilter);
    setSort(workspaceSort);
    setPage(workspace.page);
    setToolsOpen(workspace.toolsOpen);
    lastTriggerRef.current = workspace.focusId || "";
  }, [definition, navigationQuery, route, workspaceRestoreVersion]);
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
  const recoveryState = sectionRecoveryState(model);
  const semanticPreview = useMemo(
    () => risk && !selectedId
      ? selectSemanticWorkspacePreview(matchingRows)
      : risk ? null : selectSemanticWorkspacePreview(visibleRows),
    [matchingRows, risk, selectedId, visibleRows],
  );
  const tabletRoutePreview = useMemo(
    () => route === "security" && visibleRows[0]
      ? { row: visibleRows[0], label: "当前对象" as const }
      : null,
    [route, visibleRows],
  );
  const preview = tabletWorkbench && !selectedRow ? semanticPreview || tabletRoutePreview : null;
  const inspectorRow = selectedRow || preview?.row || null;
  const showInspector = Boolean(inspectorRow);
  const showCollectionLedger = tabletWorkbench && !largeText && route === "interfaces" && (risk === "interfaces" || risk === "interface-review") && !selectedRow && !semanticPreview;
  const showTabletCollectionSummary = tabletWorkbench
    && !largeText
    && !model.visualization
    && route !== "logs"
    && route !== "serviceLogs";
  const deferHistoricalBoundary = recoveryState === "historical" && visibleRows.length > 0;
  const showEvidenceWorkspace = Boolean(recoveryState && !visibleRows.length && !allRows.length);
  const layoutMode = tabletWorkbench
    ? showInspector
      ? "workbench"
      : showEvidenceWorkspace
        ? "tablet-evidence"
        : showCollectionLedger
          ? "ledger"
          : "tablet-list"
    : compactTask
      ? showEvidenceWorkspace
        ? "compact-evidence"
        : selectedRow ? "compact-detail" : "compact-list"
      : showEvidenceWorkspace
        ? "phone-evidence"
        : selectedRow
          ? "phone-detail"
          : "phone-list";
  const Icon = routeIcon(route);
  const hasControls = definition.searchable || definition.filters.length > 1 || definition.sorts.length > 1;
  const controlsActive = Boolean(query || filter !== defaultFilter || sort !== definition.defaultSort);
  const supplementOwnsDnsList = route === "dns4" && supplement.result?.parseStatus === "accepted" && supplement.result.data?.kind === "dns-static";
  const supplementOwnsConnectionList = route === "connections" && supplement.result?.parseStatus === "accepted" && supplement.result.data?.kind === "connection-search";
  const supplementOwnsCollection = supplementOwnsDnsList || supplementOwnsConnectionList;
  const hasRouteSupplement = route === "connections" || route === "dns4" || route === "security";
  const hasRouteSupplementEvidence = supplement.result?.parseStatus === "accepted" && Boolean(supplement.result.data);
  const hasSupplementDetail = route === "connections" && Boolean(supplement.selectedConnectionRowId);

  const persistWorkspace = replaceWorkspace;

  useEffect(() => {
    if (selectedId) return;
    let timer = 0;
    const saveScroll = () => {
      if (timer) return;
      timer = window.setTimeout(() => {
        timer = 0;
        persistWorkspace({ scrollY: window.scrollY });
      }, 150);
    };
    window.addEventListener("scroll", saveScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", saveScroll);
      if (timer) window.clearTimeout(timer);
    };
  }, [persistWorkspace, selectedId]);

  useEffect(() => {
    if (!selectedId) return;
    if (selectedIndex < 0) {
      // A direct object URL mounts before the first snapshot arrives. Keep the
      // requested object until the collection has evidence; otherwise the
      // empty bootstrap model erases a valid deep link before data can load.
      if (model.evidenceMode === "unavailable" && allRows.length === 0) return;
      replace(null);
      return;
    }
    if (selectedPage !== null && page !== selectedPage) setPage(selectedPage);
  }, [allRows.length, model.evidenceMode, page, replace, selectedId, selectedIndex, selectedPage]);

  useLayoutEffect(() => {
    if (selectedId && selectedRow) {
      detailTitleRef.current?.focus({ preventScroll: true });
      return;
    }
    const controlsRestored = query === workspaceSearch
      && filter === workspaceFilter
      && sort === workspaceSort
      && page === workspace.page
      && toolsOpen === workspace.toolsOpen;
    if (!controlsRestored) return;
    if (restoredWorkspaceVersionRef.current === workspaceRestoreVersion) return;
    restoredWorkspaceVersionRef.current = workspaceRestoreVersion;
    if (workspace.scrollY) window.scrollTo({ left: 0, top: workspace.scrollY, behavior: "auto" });
    const focusId = workspace.focusId || lastTriggerRef.current;
    if (!focusId) return;
    rowRefs.current.get(focusId)?.focus({ preventScroll: true });
  }, [filter, page, query, selectedId, selectedRow, sort, toolsOpen, workspace, workspaceRestoreVersion, workspaceFilter, workspaceSearch, workspaceSort]);

  if (route === "more") {
    return <MobileMoreDirectory model={model} onNavigate={onNavigate} />;
  }

  const openRow = (row: WorkspaceRow) => {
    lastTriggerRef.current = row.id;
    persistWorkspace({ focusId: row.id, scrollY: window.scrollY });
    open(row.id);
  };

  const registerRow = (id: string) => (node: HTMLButtonElement | null) => void (node ? rowRefs.current.set(id, node) : rowRefs.current.delete(id));

  const closeDetail = () => {
    if (selectedRow) lastTriggerRef.current = selectedRow.id;
    close();
  };

  const changePage = (next: number) => {
    if (selectedId) replace(null);
    setPage(next);
    persistWorkspace({ page: next });
  };

  const resetControls = () => {
    setQuery("");
    setFilter(defaultFilter);
    setSort(definition.defaultSort);
    setPage(1);
    persistWorkspace({ search: "", filter: defaultFilter, sort: definition.defaultSort, page: 1 });
  };

  return (
    <main
      className={`mdw-shell ${route === "trafficLoad" ? "is-resource" : ""} ${selectedRow ? "has-selection" : ""} ${compactTask ? "is-compact-task" : ""} ${tabletWorkbench ? "is-tablet-workbench" : ""} ${largeText ? "is-large-text" : ""} ${hasRouteSupplement ? "has-route-supplement" : ""} ${hasRouteSupplementEvidence ? "has-route-supplement-evidence" : ""} ${hasSupplementDetail ? "has-supplement-detail" : ""}`}
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
          matchingRiskObjects={matchingRows.length}
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

      <MobileRouteSupplement route={route} state={supplement} />

      {!supplementOwnsCollection ? <div className="mdw-layout">
        <section className="mdw-list-pane" aria-label={model.title + "对象列表"} data-resource-layer={route === "trafficLoad" ? "signal" : undefined} data-resource-layer-question={route === "trafficLoad" ? "current-threshold" : undefined} data-resource-evidence-role={route === "trafficLoad" ? "current-threshold" : undefined}>
          {!showEvidenceWorkspace ? <div className="mdw-list-heading">
            <span><b>{filtered.length}</b> 个{definition.objectLabel}</span>
            <small>{controlsActive ? `从 ${allRows.length} 个对象中筛选` : model.description}</small>
            {hasControls ? (
              <button
                className={controlsActive ? "mdw-tools-toggle is-active" : "mdw-tools-toggle"}
                type="button"
                aria-expanded={toolsOpen}
                aria-controls={toolsOpen ? "mdw-domain-controls" : undefined}
                onClick={() => {
                  const next = !toolsOpen;
                  setToolsOpen(next);
                  persistWorkspace({ toolsOpen: next });
                }}
              >
                <ListFilter aria-hidden="true" size={16} />筛选
              </button>
            ) : null}
          </div> : null}

          {!showEvidenceWorkspace && hasControls && toolsOpen ? (
            <div className="mdw-controls" id="mdw-domain-controls" role="group" aria-label={`${definition.objectLabel}筛选与排序`} data-domain-controls={route}>
              {definition.searchable ? (
                <label className="mdw-search">
                  <Search aria-hidden="true" size={17} />
                  <span className="sr-only">搜索{definition.objectLabel}</span>
                  <input
                    type="search"
                    value={query}
                    onChange={(event) => { setQuery(event.target.value); setPage(1); persistWorkspace({ search: event.target.value, page: 1 }); }}
                    placeholder={definition.searchPlaceholder}
                  />
                  {query ? (
                    <button type="button" aria-label="清除搜索" onClick={() => { setQuery(""); setPage(1); persistWorkspace({ search: "", page: 1 }); }}><X aria-hidden="true" size={16} /></button>
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
                        onClick={() => { setFilter(item.id); setPage(1); persistWorkspace({ filter: item.id, page: 1 }); }}
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
                    <select value={sort} onChange={(event) => { setSort(event.target.value); setPage(1); persistWorkspace({ sort: event.target.value, page: 1 }); }}>
                      {definition.sorts.map((item) => <option value={item.id} key={item.id}>{item.label}</option>)}
                    </select>
                  </label>
                ) : null}
              </div>
              {route === "logs" ? <MetricStrip model={model} /> : null}
              {controlsActive ? <button className="mdw-reset-controls" type="button" onClick={resetControls}>清除筛选</button> : null}
            </div>
          ) : null}
          {!deferHistoricalBoundary ? <RouteEvidenceBoundary route={route} model={model} onNavigate={onNavigate} surface="mobile" /> : null}
          {route === "connections" ? <MetricStrip model={model} /> : null}
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
          {showEvidenceWorkspace ? null : visibleRows.length ? (
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
          {!supplementOwnsDnsList && pageCount > 1 ? (
            <nav className="mdw-pagination" aria-label="对象分页">
              <button type="button" disabled={activePage <= 1} onClick={() => changePage(Math.max(1, activePage - 1))}><ChevronLeft aria-hidden="true" size={17} />上一页</button>
              <span>{activePage} / {pageCount}</span>
              <button type="button" disabled={activePage >= pageCount} onClick={() => changePage(Math.min(pageCount, activePage + 1))}>下一页<ChevronRight aria-hidden="true" size={17} /></button>
            </nav>
          ) : null}
          {deferHistoricalBoundary ? <RouteEvidenceBoundary route={route} model={model} onNavigate={onNavigate} surface="mobile" /> : null}

          {!showEvidenceWorkspace && ((!showInspector && !showCollectionLedger) || model.visualization || showTabletCollectionSummary) ? (
            <section className={`mdw-domain-context${showTabletCollectionSummary ? " is-tablet-collection-summary" : ""}`} aria-label={showTabletCollectionSummary ? "领域集合摘要" : "领域摘要证据"} data-tablet-collection-summary={showTabletCollectionSummary ? "true" : undefined} data-resource-layer={route === "trafficLoad" && model.visualization ? "history" : undefined} data-resource-layer-question={route === "trafficLoad" && model.visualization ? "sustained-pressure" : undefined} data-resource-evidence-role={route === "trafficLoad" && model.visualization ? "time-series" : undefined}>
              {(!showInspector || showTabletCollectionSummary || route === "trafficLoad" || route === "loadAudit") && route !== "logs" && route !== "connections" ? <MetricStrip model={model} /> : null}
              {model.visualization ? <SectionTimeSeriesChart visualization={model.visualization} /> : null}
            </section>
          ) : null}
          {tabletWorkbench && !largeText && route === "interfaces" && model.evidenceMode === "current" && !showCollectionLedger ? (
            <MobileTabletInterfaceRelations rows={filtered} onNavigate={onNavigate} evidenceAt={evidenceAt} />
          ) : null}
        </section>

        {showEvidenceWorkspace ? (
          <MobileDomainEvidenceWorkspace
            route={route}
            model={model}
            objectLabel={definition.objectLabel}
          />
        ) : showInspector ? (
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
      </div> : null}
    </main>
  );
}
