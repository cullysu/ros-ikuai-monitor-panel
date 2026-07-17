import {
  ArrowLeft,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Ellipsis,
  ListFilter,
  Search,
  Server,
  X,
} from "lucide-react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from "react";
import type { OverviewRawSnapshot } from "../overview";
import { PANEL_ROUTES, type PanelNavigate, type PanelRouteId } from "../routes/panelRoutes";
import { SectionTimeSeriesChart } from "../sections/SectionTimeSeriesChart";
import { buildSectionModel, type SectionModel } from "../sections/sectionModels";
import {
  ATTENTION_PATTERN,
  MORE_ROUTE_GROUPS,
  MORE_ROUTES,
  routeIcon,
  routeTabs,
  rowsFromModel,
  toneIcon,
  useObjectHistory,
  workspaceLabel,
  type WorkspaceRow,
} from "./mobileDomainWorkspaceModel";
import {
  domainDefinitionFor,
  filterWorkspaceRows,
  sortWorkspaceRows,
} from "./mobileDomainDefinitions";
import "./mobile-domain.css";

function EvidenceBadge({ model }: { model: SectionModel }) {
  const Icon = toneIcon(model.statusTone);
  const label = model.evidenceMode === "current"
    ? "当前证据"
    : model.evidenceMode === "historical"
      ? "历史证据"
      : "证据不可用";
  return (
    <span className={`mdw-evidence is-${model.statusTone}`}>
      <Icon aria-hidden="true" size={15} />
      <span><b>{label}</b><small>{model.updatedAt || "时间未记录"}</small></span>
    </span>
  );
}

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

function MetricStrip({ model }: { model: SectionModel }) {
  return (
    <section className="mdw-metrics" aria-label="关键指标">
      {model.metrics.slice(0, 3).map((metric) => (
        <div className={`is-${metric.tone || "trust"}`} key={metric.label}>
          <small>{metric.label}</small>
          <b>{metric.value}</b>
          {metric.note ? <em>{metric.note}</em> : null}
        </div>
      ))}
    </section>
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

function DetailPane({
  row,
  model,
  route,
  onClose,
  titleRef,
}: {
  row: WorkspaceRow | null;
  model: SectionModel;
  route: PanelRouteId;
  onClose?: () => void;
  titleRef: RefObject<HTMLHeadingElement>;
}) {
  const Icon = routeIcon(route);
  if (!row) {
    return (
      <aside className="mdw-inspector is-empty" aria-label="对象检查器">
        <div className="mdw-inspector-symbol"><Icon aria-hidden="true" size={24} /></div>
        <span>对象检查器</span>
        <h2>未选择对象</h2>
        <p>{model.status}</p>
        <dl>
          <div><dt>证据模式</dt><dd>{model.evidenceMode === "current" ? "当前" : model.evidenceMode === "historical" ? "历史" : "不可用"}</dd></div>
          <div><dt>对象总数</dt><dd>{model.tables.reduce((sum, table) => sum + table.rows.length, 0)}</dd></div>
          <div><dt>最近成功</dt><dd>{model.updatedAt || "未记录"}</dd></div>
        </dl>
      </aside>
    );
  }

  return (
    <aside className="mdw-inspector has-object" data-mobile-object-detail={row.id} aria-labelledby="mdw-detail-title">
      <header>
        {onClose ? <button type="button" onClick={onClose}><ArrowLeft aria-hidden="true" size={18} />返回列表</button> : <span>所选对象</span>}
        <span>{row.table}</span>
      </header>
      <div className="mdw-detail-heading">
        <span><Icon aria-hidden="true" size={22} /></span>
        <div><small>{PANEL_ROUTES[route].shortTitle}对象</small><h2 id="mdw-detail-title" tabIndex={-1} ref={titleRef}>{row.primary}</h2><p>{row.secondary}</p></div>
      </div>
      <dl className="mdw-detail-fields">
        {row.columns.map((column) => (
          <div key={column.key}>
            <dt>{column.label}</dt>
            <dd>{row.values[column.key] || "—"}</dd>
          </div>
        ))}
      </dl>
      <footer><Server aria-hidden="true" size={16} /><span><b>{model.evidenceMode === "current" ? "当前只读快照" : model.evidenceMode === "historical" ? "历史只读快照" : "证据不可用"}</b><small>{model.status}</small></span></footer>
    </aside>
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
  const { selectedId, open, close } = useObjectHistory(route);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState(definition.filters[0]?.id || "all");
  const [sort, setSort] = useState(definition.defaultSort);
  const [page, setPage] = useState(1);
  const [tablet, setTablet] = useState(false);
  const detailTitleRef = useRef<HTMLHeadingElement>(null);
  const lastTriggerRef = useRef("");
  const rowRefs = useRef(new Map<string, HTMLButtonElement>());

  useEffect(() => {
    setQuery("");
    setFilter(definition.filters[0]?.id || "all");
    setSort(definition.defaultSort);
    setPage(1);
  }, [definition, route]);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 600px) and (max-width: 1180px)");
    const sync = () => setTablet(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    const searched = allRows.filter((row) => !needle || row.searchText.includes(needle));
    const matched = filterWorkspaceRows(searched, definition, filter);
    return sortWorkspaceRows(matched, definition, sort);
  }, [allRows, definition, filter, query, sort]);

  const pageSize = 20;
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const visibleRows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);
  const selectedRow = allRows.find((row) => row.id === selectedId) || (tablet ? visibleRows[0] : null) || null;
  const Icon = routeIcon(route);
  const hasControls = definition.searchable || definition.filters.length > 1 || definition.sorts.length > 1;

  useLayoutEffect(() => {
    if (selectedId && selectedRow) {
      detailTitleRef.current?.focus({ preventScroll: true });
      return;
    }
    if (!lastTriggerRef.current) return;
    const trigger = rowRefs.current.get(lastTriggerRef.current);
    trigger?.focus({ preventScroll: true });
  }, [selectedId, selectedRow]);

  if (route === "more") {
    return <MobileMoreDirectory model={model} onNavigate={onNavigate} />;
  }

  const openRow = (row: WorkspaceRow) => {
    lastTriggerRef.current = row.id;
    open(row.id);
  };

  const closeDetail = () => {
    if (selectedRow) lastTriggerRef.current = selectedRow.id;
    close();
  };

  return (
    <main
      className={`mdw-shell ${selectedRow ? "has-selection" : ""}`}
      data-mobile-domain-workspace={route}
      data-mobile-evidence-mode={model.evidenceMode}
    >
      <header className="mdw-header">
        <div className="mdw-title-row">
          <span className="mdw-title-icon"><Icon aria-hidden="true" size={21} /></span>
          <div><small>{workspaceLabel(route)}</small><h1 tabIndex={-1} data-panel-route-title>{model.title}</h1></div>
          <DomainMenu onNavigate={onNavigate} />
        </div>
        <div className="mdw-status-row"><EvidenceBadge model={model} /><p>{model.status}</p></div>
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
        <section className="mdw-list-pane" aria-label={model.title + "对象列表"}>
          <MetricStrip model={model} />
          {model.visualization ? <SectionTimeSeriesChart visualization={model.visualization} /> : null}

          {hasControls ? (
            <div className="mdw-controls" data-domain-controls={route}>
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
                    <ListFilter aria-hidden="true" size={16} />
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
            </div>
          ) : null}

          <div className="mdw-list-heading">
            <span><b>{filtered.length}</b> 个{definition.objectLabel}</span>
            {query || filter !== definition.filters[0]?.id ? <small>已从 {allRows.length} 个对象中筛选</small> : <small>{model.description}</small>}
          </div>

          {visibleRows.length ? (
            <div className="mdw-object-list">
              {visibleRows.map((row) => (
                <button
                  type="button"
                  className={selectedRow?.id === row.id ? "is-selected" : ""}
                  data-mobile-row-id={row.id}
                  aria-current={selectedRow?.id === row.id ? "true" : undefined}
                  onClick={() => openRow(row)}
                  ref={(node) => {
                    if (node) rowRefs.current.set(row.id, node);
                    else rowRefs.current.delete(row.id);
                  }}
                  key={row.id}
                >
                  <span className="mdw-row-icon"><Icon aria-hidden="true" size={18} /></span>
                  <span className="mdw-row-copy"><b>{row.primary}</b><small>{row.secondary}</small></span>
                  <span className={ATTENTION_PATTERN.test(row.searchText) ? "mdw-row-state is-attention" : "mdw-row-state"}>{row.trailing}</span>
                  <ChevronRight aria-hidden="true" size={17} />
                </button>
              ))}
            </div>
          ) : (
            <div className="mdw-empty">
              <Search aria-hidden="true" size={21} />
              <h2>{allRows.length ? "没有匹配对象" : model.tables[0]?.empty || "没有可显示对象"}</h2>
              <p>{allRows.length ? "调整搜索词或筛选条件。" : model.status}</p>
              {allRows.length ? <button type="button" onClick={() => { setQuery(""); setFilter(definition.filters[0]?.id || "all"); setSort(definition.defaultSort); }}>清除筛选</button> : null}
            </div>
          )}

          {pageCount > 1 ? (
            <nav className="mdw-pagination" aria-label="对象分页">
              <button type="button" disabled={safePage <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}><ChevronLeft aria-hidden="true" size={17} />上一页</button>
              <span>{safePage} / {pageCount}</span>
              <button type="button" disabled={safePage >= pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))}>下一页<ChevronRight aria-hidden="true" size={17} /></button>
            </nav>
          ) : null}
        </section>

        <DetailPane
          row={selectedRow}
          model={model}
          route={route}
          onClose={tablet ? undefined : closeDetail}
          titleRef={detailTitleRef}
        />
      </div>
    </main>
  );
}
