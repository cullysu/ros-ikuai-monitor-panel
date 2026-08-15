import { ChevronLeft, ChevronRight, Search, SlidersHorizontal, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useObjectHistory } from "../../domain-workspace/workspaceHistory";
import type { WorkspaceRow } from "../../domain-workspace/workspaceRows";
import type { PanelRouteId } from "../../routes/panelRoutes";
import "../styles/flow-workspace.css";

export interface MobileFlowWorkspaceFilter {
  id: string;
  label: string;
  matches: (row: WorkspaceRow) => boolean;
}

export interface MobileFlowWorkspaceProps {
  route: Exclude<PanelRouteId, "overview" | "more">;
  title: string;
  sectionTitle: string;
  rows: readonly WorkspaceRow[];
  filters: readonly MobileFlowWorkspaceFilter[];
  evidenceMode: "current" | "historical" | "unavailable";
  observedAt: string | null;
}

type Tone = "normal" | "attention" | "critical" | "muted";

function normalized(value: string): string { return value.trim().toLowerCase(); }

function rowTone(row: WorkspaceRow): Tone {
  if (row.evidence.kind === "interface" && row.evidence.operationalImpact === "risk") return "critical";
  if (row.meta.attention || row.meta.running === false || row.meta.active === false) return "attention";
  if (row.meta.running === true || row.meta.active === true || row.meta.disabled === false) return "normal";
  return "muted";
}

function orderRows(rows: readonly WorkspaceRow[]): WorkspaceRow[] {
  const priority: Record<Tone, number> = { critical: 3, attention: 2, normal: 1, muted: 0 };
  return [...rows].sort((left, right) => priority[rowTone(right)] - priority[rowTone(left)] || left.primary.localeCompare(right.primary, "zh-CN"));
}

function observedLabel(value: string | null): string {
  if (!value) return "未记录";
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})(?::\d{2})?(Z|[+-]\d{2}:\d{2})$/.exec(value);
  return match ? `${match[1]} ${match[2]} ${match[3] === "Z" ? "UTC" : `UTC${match[3]}`}` : "时间格式无时区，已拒绝";
}

function evidenceLabel(mode: MobileFlowWorkspaceProps["evidenceMode"]): string {
  return mode === "current" ? "当前快照" : mode === "historical" ? "历史快照" : "当前快照不可用";
}

function ObjectDetail({ row, title, evidenceMode, observedAt, onBack }: {
  row: WorkspaceRow;
  title: string;
  evidenceMode: MobileFlowWorkspaceProps["evidenceMode"];
  observedAt: string | null;
  onBack: () => void;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, [row.id]);
  const fields = row.columns.map((column) => ({ label: column.label, value: row.values[column.key] || "未取得" }));

  return <article className="mflow-detail" data-mobile-flow-detail={row.id} aria-label={`${row.primary}详情`}>
    <header className="mflow-detail__nav">
      <button type="button" onClick={onBack} aria-label={`返回${title}列表`}><ChevronLeft size={21} aria-hidden="true" /><span>{title}</span></button>
      <span className="mflow-detail__state" data-tone={rowTone(row)}>{row.trailing || "未记录"}</span>
    </header>
    <section className="mflow-detail__identity">
      <p>{row.table}</p>
      <h1 data-panel-route-title tabIndex={-1} ref={heading}>{row.primary}</h1>
      {row.secondary ? <span>{row.secondary}</span> : null}
    </section>
    <section className="mflow-detail__source" aria-label="观测边界">
      <div><span>证据</span><b>{evidenceLabel(evidenceMode)}</b></div>
      <div><span>时间</span><b>{observedLabel(observedAt)}</b></div>
      <div><span>来源</span><b>{row.evidence.sourceTable || row.table}</b></div>
    </section>
    <section className="mflow-detail__fields" aria-labelledby="mflow-detail-evidence">
      <header><h2 id="mflow-detail-evidence">对象证据</h2><span>{fields.length} 项</span></header>
      <dl>{fields.map(({ label, value }) => <div key={`${label}-${value}`}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
    </section>
    {row.duplicateCount > 1 ? <p className="mflow-detail__dedupe">已合并 {row.duplicateCount} 条相同记录。</p> : null}
  </article>;
}

export function MobileFlowWorkspace({ route, title, sectionTitle, rows, filters, evidenceMode, observedAt }: MobileFlowWorkspaceProps) {
  const { selectedId, open, close, replace } = useObjectHistory(route);
  const [query, setQuery] = useState("");
  const [filterId, setFilterId] = useState("all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const priorId = useRef("");
  const rowTriggers = useRef(new Map<string, HTMLButtonElement>());
  const selected = selectedId ? rows.find((row) => row.id === selectedId) || null : null;
  const visible = useMemo(() => orderRows(rows.filter((row) => {
    const searchQuery = normalized(query);
    const queryMatches = !searchQuery || normalized(row.searchText).includes(searchQuery);
    const selectedFilter = filters.find((item) => item.id === filterId);
    return queryMatches && (filterId === "all" || selectedFilter?.matches(row));
  })), [filterId, filters, query, rows]);

  useEffect(() => { if (selectedId && !selected) replace(null); }, [replace, selected, selectedId]);
  useEffect(() => {
    const previous = priorId.current;
    priorId.current = selectedId;
    if (!previous || selectedId) return;
    window.requestAnimationFrame(() => rowTriggers.current.get(previous)?.focus({ preventScroll: true }));
  }, [selectedId]);

  const list = <section className="mflow-workspace__list" aria-labelledby="mflow-workspace-title">
    <header className="mflow-workspace__head">
      <div><p>{sectionTitle}</p><h1 id="mflow-workspace-title" data-panel-route-title tabIndex={-1}>{title}</h1></div>
      <span aria-label={`${visible.length} 个对象`}>{visible.length}</span>
    </header>
    <div className="mflow-workspace__searchbar">
      <label><Search size={17} aria-hidden="true" /><span className="mflow-sr">搜索{title}</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`搜索${title}`} autoCapitalize="none" autoCorrect="off" spellCheck={false} />{query ? <button type="button" onClick={() => setQuery("")} aria-label="清除搜索"><X size={17} aria-hidden="true" /></button> : null}</label>
      {filters.length ? <button className="mflow-workspace__filter-toggle" type="button" onClick={() => setFiltersOpen((value) => !value)} aria-expanded={filtersOpen} aria-controls="mflow-workspace-filters" aria-label="筛选对象"><SlidersHorizontal size={19} aria-hidden="true" /></button> : null}
    </div>
    {filters.length ? <div className="mflow-workspace__filters" id="mflow-workspace-filters" role="group" aria-label={`${title}筛选`} hidden={!filtersOpen}>
      <button type="button" data-selected={filterId === "all" || undefined} aria-pressed={filterId === "all"} onClick={() => setFilterId("all")}>全部</button>
      {filters.map((filter) => <button type="button" key={filter.id} data-selected={filterId === filter.id || undefined} aria-pressed={filterId === filter.id} onClick={() => setFilterId(filter.id)}>{filter.label}</button>)}
    </div> : null}
    <ol className="mflow-workspace__rows">
      {visible.map((row) => <li key={row.id}><button type="button" ref={(node) => { if (node) rowTriggers.current.set(row.id, node); else rowTriggers.current.delete(row.id); }} data-tone={rowTone(row)} data-mobile-flow-object-trigger={row.id} aria-current={row.id === selectedId ? "page" : undefined} onClick={() => { priorId.current = row.id; open(row.id); }}>
        <i aria-hidden="true" /><span><b>{row.primary}</b>{row.secondary ? <small>{row.secondary}</small> : null}</span><strong>{row.trailing}</strong><ChevronRight size={18} aria-hidden="true" />
      </button></li>)}
    </ol>
    {!visible.length ? <p className="mflow-workspace__empty" role="status">没有符合当前条件的对象。</p> : null}
  </section>;

  return <main className="mflow-workspace" data-mobile-flow-workspace={route} data-detail-open={selected ? "true" : "false"}>
    {list}
    <aside className="mflow-workspace__detail" aria-live="polite">
      {selected ? <ObjectDetail row={selected} title={title} evidenceMode={evidenceMode} observedAt={observedAt} onBack={close} /> : <div className="mflow-workspace__default"><p>{sectionTitle}</p><h2>选择一个对象</h2><span>查看来源、关系与原始字段</span></div>}
    </aside>
  </main>;
}

export default MobileFlowWorkspace;
