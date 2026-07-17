import { ChevronLeft, ChevronRight, Search, SlidersHorizontal } from "lucide-react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  domainDefinitionFor,
  filterWorkspaceRows,
  sortWorkspaceRows,
} from "../mobile/mobileDomainDefinitions";
import {
  rowsFromModel,
  useObjectHistory,
  type WorkspaceRow,
} from "../mobile/mobileDomainWorkspaceModel";
import type { PanelRouteId } from "../routes/panelRoutes";
import { DesktopDomainInspector } from "./DesktopDomainInspector";
import type { SectionModel } from "./sectionModels";
import "./desktop-domain.css";

function preferredRow(rows: WorkspaceRow[]): WorkspaceRow | null {
  return rows.find((row) => row.meta.attention)
    || rows.find((row) => (
      row.evidence.kind === "interface"
      && row.evidence.defaultRouteRelation === "direct"
      && row.meta.running === true
    ))
    || rows.find((row) => row.meta.active === true && row.meta.tags.includes("default"))
    || rows[0]
    || null;
}

function comparisonValue(row: WorkspaceRow): string {
  if (row.evidence.kind === "interface") {
    const { rxRate, txRate } = row.evidence;
    if (rxRate === null || txRate === null) return "吞吐未取得";
    return `${(rxRate / 1_000_000).toFixed(2)} / ${(txRate / 1_000_000).toFixed(2)} Mbps`;
  }
  if (row.evidence.kind === "route") return `${row.evidence.gateway || "网关未取得"} · distance ${row.evidence.distance ?? "—"}`;
  if (row.evidence.kind === "terminal") return `${row.evidence.ip || "IP 未取得"} · ${row.evidence.connections ?? "—"} 连接`;
  if (row.evidence.kind === "log") return row.evidence.time || "时间未取得";
  if (row.evidence.kind === "security") return `${row.evidence.chain || "链未取得"} · ${row.evidence.action || "动作未取得"}`;
  if (row.evidence.kind === "dns") return row.evidence.target || row.evidence.interfaceName || "目标未取得";
  if (row.evidence.kind === "resource") return row.evidence.values.length ? `${row.evidence.values[row.evidence.values.length - 1]}%` : "样本未取得";
  if (row.evidence.kind === "connection") return row.evidence.trafficBps === null ? "流量未取得" : `${Math.round(row.evidence.trafficBps / 1000)} Kbps`;
  return row.secondary;
}

export function DesktopDomainWorkspace({ route, model }: { route: PanelRouteId; model: SectionModel }) {
  const definition = domainDefinitionFor(route);
  const allRows = useMemo(() => rowsFromModel(route, model), [model, route]);
  const { selectedId, open, replace, close } = useObjectHistory(route);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState(definition.filters[0]?.id || "all");
  const [sort, setSort] = useState(definition.defaultSort);
  const [page, setPage] = useState(1);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const lastTriggerRef = useRef("");
  const rowRefs = useRef(new Map<string, HTMLButtonElement>());

  useEffect(() => {
    setQuery("");
    setFilter(definition.filters[0]?.id || "all");
    setSort(definition.defaultSort);
    setPage(1);
  }, [definition, route]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    const searched = allRows.filter((row) => !needle || row.searchText.includes(needle));
    return sortWorkspaceRows(filterWorkspaceRows(searched, definition, filter), definition, sort);
  }, [allRows, definition, filter, query, sort]);

  const pageSize = 25;
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const selectedIndex = selectedId ? filtered.findIndex((row) => row.id === selectedId) : -1;
  const selectedPage = selectedIndex >= 0 ? Math.floor(selectedIndex / pageSize) + 1 : null;
  const activePage = selectedPage || Math.min(page, pageCount);
  const visibleRows = filtered.slice((activePage - 1) * pageSize, activePage * pageSize);
  const selectedRow = selectedId ? visibleRows.find((row) => row.id === selectedId) || null : null;
  const inspectorRow = selectedRow || preferredRow(visibleRows);

  useEffect(() => {
    if (!selectedId) return;
    if (selectedIndex < 0) {
      replace(null);
      return;
    }
    if (selectedPage !== null && selectedPage !== page) setPage(selectedPage);
  }, [page, replace, selectedId, selectedIndex, selectedPage]);

  useLayoutEffect(() => {
    if (selectedRow) {
      titleRef.current?.focus({ preventScroll: true });
      return;
    }
    if (lastTriggerRef.current) rowRefs.current.get(lastTriggerRef.current)?.focus({ preventScroll: true });
  }, [selectedRow]);

  const selectRow = (row: WorkspaceRow) => {
    lastTriggerRef.current = row.id;
    open(row.id);
  };
  const unpin = () => {
    if (selectedRow) lastTriggerRef.current = selectedRow.id;
    close();
  };

  return (
    <section className="desktop-domain-workspace" data-desktop-domain-workspace={route}>
      <header className="ddw-toolbar">
        <label className="ddw-search">
          <Search aria-hidden="true" size={16} />
          <span className="sr-only">搜索{definition.objectLabel}</span>
          <input type="search" value={query} placeholder={definition.searchPlaceholder} onChange={(event) => { setQuery(event.target.value); setPage(1); }} />
        </label>
        <div className="ddw-filters" aria-label="对象筛选">
          <SlidersHorizontal aria-hidden="true" size={16} />
          {definition.filters.map((item) => (
            <button type="button" className={filter === item.id ? "is-active" : ""} aria-pressed={filter === item.id} onClick={() => { setFilter(item.id); setPage(1); }} key={item.id}>{item.label}</button>
          ))}
        </div>
        <label className="ddw-sort">
          <span>排序</span>
          <select value={sort} onChange={(event) => { setSort(event.target.value); setPage(1); }}>
            {definition.sorts.map((item) => <option value={item.id} key={item.id}>{item.label}</option>)}
          </select>
        </label>
      </header>

      <div className="ddw-body">
        <section className="ddw-table-pane" aria-label={`${definition.objectLabel}列表`}>
          <header>
            <span><b>{filtered.length}</b> 个{definition.objectLabel}</span>
            <small>{query || filter !== definition.filters[0]?.id ? `共 ${allRows.length} 个对象` : "当前只读快照"}</small>
          </header>
          <div className="ddw-table-scroll">
            <table>
              <thead><tr><th scope="col">对象</th><th scope="col">来源</th><th scope="col">状态</th><th scope="col">关键证据</th></tr></thead>
              <tbody>{visibleRows.map((row) => (
                <tr className={row.meta.attention ? "is-attention" : ""} data-desktop-row-id={row.id} key={row.id}>
                  <td><button type="button" className={selectedRow?.id === row.id ? "is-selected" : ""} aria-current={selectedRow?.id === row.id ? "true" : undefined} ref={(node) => { if (node) rowRefs.current.set(row.id, node); else rowRefs.current.delete(row.id); }} onClick={() => selectRow(row)}><b>{row.primary}</b><small>{row.secondary}</small></button></td>
                  <td>{row.table}</td>
                  <td><span className={row.meta.attention ? "is-attention" : ""}>{row.trailing}</span></td>
                  <td>{comparisonValue(row)}</td>
                </tr>
              ))}</tbody>
            </table>
            {!visibleRows.length ? <p className="ddw-empty">没有符合当前条件的对象。</p> : null}
          </div>
          <footer>
            <button type="button" disabled={activePage <= 1} onClick={() => setPage(Math.max(1, activePage - 1))}><ChevronLeft aria-hidden="true" size={16} />上一页</button>
            <span>第 {activePage} / {pageCount} 页</span>
            <button type="button" disabled={activePage >= pageCount} onClick={() => setPage(Math.min(pageCount, activePage + 1))}>下一页<ChevronRight aria-hidden="true" size={16} /></button>
          </footer>
        </section>
        <DesktopDomainInspector row={inspectorRow} model={model} pinned={Boolean(selectedRow)} onUnpin={unpin} titleRef={titleRef} />
      </div>
    </section>
  );
}
