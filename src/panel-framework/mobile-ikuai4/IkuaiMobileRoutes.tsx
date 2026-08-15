import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  FolderCog,
  ListFilter,
  Network,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Terminal,
  Wifi,
} from "lucide-react";
import { domainDefinitionFor, filterWorkspaceRows, sortWorkspaceRows } from "../domain-workspace/domainDefinitions";
import { useObjectHistory } from "../domain-workspace/workspaceHistory";
import { rowsFromModel, type WorkspaceRow } from "../domain-workspace/workspaceRows";
import { type OverviewRawSnapshot } from "../overview";
import { PANEL_ROUTES, type PanelNavigate, type PanelRouteId } from "../routes/panelRoutes";
import { buildSectionModel } from "../sections/sectionModels";
import "./styles/routes.css";

export interface IkuaiMobileRoutesProps {
  route: Exclude<PanelRouteId, "overview">;
  snapshot: OverviewRawSnapshot;
  onNavigate: PanelNavigate;
  onShowConnection?: () => void;
}

const DIRECTORY_GROUPS: ReadonlyArray<{ label: string; icon: typeof Network; routes: readonly PanelRouteId[] }> = [
  { label: "线路与路由", icon: Network, routes: ["lineStatus", "balance", "routes", "connections", "trafficAudit"] },
  { label: "终端与地址", icon: Terminal, routes: ["dhcp", "arp"] },
  { label: "运行与审计", icon: FolderCog, routes: ["trafficLoad", "loadAudit", "dns4", "dns6", "security", "serviceLogs", "readonlyDiagnostics"] },
];

function displayValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "未记录";
  if (typeof value === "boolean") return value ? "是" : "否";
  return String(value);
}

function routeBackTarget(route: PanelRouteId): PanelRouteId {
  if (route === "interfaces" || route === "terminals" || route === "logs") return "overview";
  return PANEL_ROUTES[route].primaryDestination;
}

function routeCategory(route: PanelRouteId): string {
  if (route === "interfaces" || route === "lineStatus" || route === "balance" || route === "routes" || route === "connections" || route === "trafficAudit") return "网络";
  if (route === "terminals" || route === "dhcp" || route === "arp") return "终端";
  if (route === "logs" || route === "serviceLogs") return "日志";
  return "系统";
}

function StatusMark({ row }: { row: WorkspaceRow }) {
  const tone = row.meta.attention ? "risk" : row.meta.running === false || row.meta.disabled ? "muted" : "normal";
  return <i className={`ikuai4-row-state is-${tone}`} aria-label={tone === "risk" ? "需要关注" : tone === "normal" ? "状态正常" : "状态未知或停用"} />;
}

function RouteHeader({ route, onNavigate }: { route: PanelRouteId; onNavigate: PanelNavigate }) {
  const definition = PANEL_ROUTES[route];
  return <header className="ikuai4-route-header">
    <button type="button" className="ikuai4-icon-button" onClick={() => onNavigate(routeBackTarget(route))} aria-label={`返回${PANEL_ROUTES[routeBackTarget(route)].shortTitle}`}>
      <ChevronLeft aria-hidden="true" size={21} />
    </button>
    <div>
      <p>{routeCategory(route)} · 只读</p>
      <h1 tabIndex={-1} data-panel-route-title>{definition.title}</h1>
    </div>
    <button type="button" className="ikuai4-icon-button" onClick={() => onNavigate("more")} aria-label="打开更多目录">
      <SlidersHorizontal aria-hidden="true" size={19} />
    </button>
  </header>;
}

function ObjectDetail({ row, route, observedAt, onClose }: { row: WorkspaceRow; route: PanelRouteId; observedAt: string | null; onClose: () => void }) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => { titleRef.current?.focus({ preventScroll: true }); }, [row.id]);
  const identity = row.meta.identityParts.filter(Boolean);
  const facts = row.columns.filter((column) => column.key in row.values);
  const source = `${row.table} · ${row.evidence.kind}`;
  const record = JSON.stringify({ source: row.table, evidence: row.evidence, values: row.values, meta: row.meta }, null, 2);

  return <main className="ikuai4-route ikuai4-object-detail" data-ikuai4-mobile-route={route} data-ikuai4-mobile-scroll="detail" data-panel-route-content={route}>
    <header className="ikuai4-detail-header">
      <button type="button" className="ikuai4-icon-button" onClick={onClose} aria-label="返回对象列表"><ChevronLeft aria-hidden="true" size={21} /></button>
      <span>{PANEL_ROUTES[route].shortTitle}</span>
    </header>
    <section className="ikuai4-detail-identity" aria-label="对象身份">
      <div><StatusMark row={row} /><span>{row.table}</span></div>
      <h1 ref={titleRef} tabIndex={-1} data-panel-route-title>{row.primary}</h1>
      <p>{row.secondary || "未记录对象摘要"}</p>
      <strong>{row.trailing || "未记录当前状态"}</strong>
    </section>
    <section className="ikuai4-evidence-block" aria-labelledby="ikuai4-evidence-title">
      <header><ShieldCheck aria-hidden="true" size={17} /><h2 id="ikuai4-evidence-title">对象证据</h2></header>
      <dl>
        <div><dt>来源</dt><dd>{source}</dd></div>
        <div><dt>观测时间</dt><dd>{observedAt || "未记录"}</dd></div>
        <div><dt>对象标识</dt><dd>{identity.length ? identity.join(" · ") : row.id}</dd></div>
        <div><dt>记录数量</dt><dd>{row.duplicateCount > 1 ? `${row.duplicateCount} 条同类记录` : "单条记录"}</dd></div>
      </dl>
    </section>
    <section className="ikuai4-evidence-block" aria-labelledby="ikuai4-fields-title">
      <header><ListFilter aria-hidden="true" size={17} /><h2 id="ikuai4-fields-title">本条字段</h2></header>
      <dl className="ikuai4-field-list">
        {facts.map((column) => <div key={column.key}><dt>{column.label}</dt><dd>{displayValue(row.values[column.key])}</dd></div>)}
      </dl>
    </section>
    <details className="ikuai4-raw-evidence">
      <summary>查看原始证据</summary>
      <pre>{record}</pre>
    </details>
  </main>;
}

function WorkspaceRoute({ route, snapshot, onNavigate }: Omit<IkuaiMobileRoutesProps, "onShowConnection">) {
  const model = useMemo(() => buildSectionModel(route, snapshot), [route, snapshot]);
  const definition = useMemo(() => domainDefinitionFor(route), [route]);
  const rows = useMemo(() => rowsFromModel(route, model), [model, route]);
  const history = useObjectHistory(route);
  const [query, setQuery] = useState(history.query || "");
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState(definition.defaultSort);
  const selected = rows.find((row) => row.id === history.selectedId) || null;

  useEffect(() => { setQuery(history.query || ""); }, [history.query]);
  useEffect(() => { setFilter("all"); setSort(definition.defaultSort); }, [definition.defaultSort, route]);

  const visibleRows = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("zh-CN");
    const matched = normalized ? rows.filter((row) => row.searchText.includes(normalized)) : rows;
    return sortWorkspaceRows(filterWorkspaceRows(matched, definition, filter), definition, sort);
  }, [definition, filter, query, rows, sort]);

  if (selected) return <ObjectDetail row={selected} route={route} observedAt={model.observedAt} onClose={history.close} />;

  const updateQuery = (next: string) => {
    setQuery(next);
    onNavigate(route, { query: next || null, replace: true });
  };

  return <main className="ikuai4-route ikuai4-workspace" data-ikuai4-mobile-route={route} data-ikuai4-mobile-scroll={route} data-panel-route-content={route}>
    <RouteHeader route={route} onNavigate={onNavigate} />
    <section className={`ikuai4-route-state is-${model.statusTone}`} aria-label="当前数据状态">
      <i aria-hidden="true" />
      <span><b>{model.status}</b><small>{model.updatedAt || "观测时间未记录"}</small></span>
      <em>{model.evidenceMode === "current" ? "当前" : model.evidenceMode === "historical" ? "历史" : "未取得"}</em>
    </section>
    <section className="ikuai4-browser" aria-label={`${definition.objectLabel}工作区`}>
      <header className="ikuai4-browser-title">
        <div><small>{definition.objectLabel}工作区</small><h2>{query || filter !== "all" ? `${visibleRows.length} 个结果` : `${rows.length} 个对象`}</h2></div>
        <span>{PANEL_ROUTES[route].description}</span>
      </header>
      {definition.searchable ? <label className="ikuai4-search">
        <Search aria-hidden="true" size={17} />
        <span className="sr-only">搜索{definition.objectLabel}</span>
        <input value={query} onChange={(event) => updateQuery(event.target.value)} placeholder={definition.searchPlaceholder} type="search" />
      </label> : null}
      <div className="ikuai4-workspace-tools" aria-label="列表筛选与排序">
        <div className="ikuai4-filter-strip" role="group" aria-label="筛选对象">
          {definition.filters.map((item) => <button key={item.id} type="button" className={filter === item.id ? "is-selected" : undefined} aria-pressed={filter === item.id} onClick={() => setFilter(item.id)}>{item.label}</button>)}
        </div>
        <label className="ikuai4-sort"><span>排序</span><select value={sort} onChange={(event) => setSort(event.target.value)}>{definition.sorts.map((item) => <option value={item.id} key={item.id}>{item.label}</option>)}</select></label>
      </div>
      <div className="ikuai4-object-list" role="list" aria-label={`${definition.objectLabel}列表`}>
        {visibleRows.length ? visibleRows.map((row) => <button key={row.id} type="button" role="listitem" className="ikuai4-object-row" onClick={() => history.open(row.id)}>
          <StatusMark row={row} />
          <span className="ikuai4-object-copy"><b>{row.primary}</b><small>{row.secondary || "未记录摘要"}</small></span>
          <span className="ikuai4-object-value">{row.trailing || "未记录"}</span>
          <ChevronRight aria-hidden="true" size={17} />
        </button>) : <div className="ikuai4-empty-state"><CircleAlert aria-hidden="true" size={18} /><p>没有符合条件的{definition.objectLabel}</p><small>可更改搜索、筛选或排序条件。</small></div>}
      </div>
    </section>
  </main>;
}

function DirectoryRoute({ onNavigate, onShowConnection }: Pick<IkuaiMobileRoutesProps, "onNavigate" | "onShowConnection">) {
  return <main className="ikuai4-route ikuai4-directory" data-ikuai4-mobile-route="more" data-ikuai4-mobile-scroll="more" data-panel-route-content="more">
    <RouteHeader route="more" onNavigate={onNavigate} />
    <section className="ikuai4-directory-intro"><Wifi aria-hidden="true" size={20} /><div><h2>工具目录</h2><p>按对象与证据进入只读工作区。</p></div></section>
    {onShowConnection ? <section className="ikuai4-directory-group" aria-labelledby="ikuai4-connection-title"><h2 id="ikuai4-connection-title">连接与会话</h2><button type="button" className="ikuai4-directory-row" onClick={onShowConnection}><span><b>RouterOS 连接</b><small>设备、REST 与 SSH 证据</small></span><ChevronRight aria-hidden="true" size={18} /></button></section> : null}
    {DIRECTORY_GROUPS.map((group) => { const Icon = group.icon; return <section className="ikuai4-directory-group" key={group.label} aria-labelledby={`ikuai4-directory-${group.label}`}>
      <h2 id={`ikuai4-directory-${group.label}`}><Icon aria-hidden="true" size={16} />{group.label}</h2>
      {group.routes.map((route) => <button className="ikuai4-directory-row" type="button" key={route} onClick={() => onNavigate(route)}><span><b>{PANEL_ROUTES[route].title}</b><small>{PANEL_ROUTES[route].description}</small></span><ChevronRight aria-hidden="true" size={18} /></button>)}
    </section>; })}
  </main>;
}

/**
 * Mobile-only route workspace: compact iKuai-like object inspection, not a
 * reduced desktop table. Route and object history remain owned by the shared
 * route hook and URL contract.
 */
export function IkuaiMobileRoutes({ route, snapshot, onNavigate, onShowConnection }: IkuaiMobileRoutesProps) {
  if (route === "more") return <DirectoryRoute onNavigate={onNavigate} onShowConnection={onShowConnection} />;
  return <WorkspaceRoute route={route} snapshot={snapshot} onNavigate={onNavigate} />;
}
