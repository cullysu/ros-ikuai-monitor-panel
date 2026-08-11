import { ChevronLeft, ChevronRight, RefreshCw, Search, X } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { formatRfc3339Local } from "../timeContract";
import { isExplicitIpQuery, type HealthFindingSupplement } from "./routeSupplementSchema";
import {
  connectionSupplementRowId,
  routeSupplementCoverageLabel,
  routeSupplementDomainLabel,
  routeSupplementSeverityLabel,
  routeSupplementSourceLabel,
  supplementalRateOrigin,
} from "./routeSupplementState";
import type { RouteSupplementState } from "./useRouteSupplementEvidence";

function desktopRate(value: number | null): string {
  if (value === null) return "未取得";
  if (value === 0) return "0 bps";
  return value < 1_000_000 ? `${(value / 1_000).toFixed(1)} Kbps` : `${(value / 1_000_000).toFixed(1)} Mbps`;
}

function desktopTargetRole(srcIp: string, dstIp: string, target: string): string {
  if (srcIp === target && dstIp === target) return "源端与目标端";
  if (srcIp === target) return "源端";
  if (dstIp === target) return "目标端";
  return "关联端点";
}

function DesktopHealthFinding({ finding, index }: { finding: HealthFindingSupplement["findings"][number]; index: number }) {
  const [open, setOpen] = useState(index === 0);
  return <details open={open} onToggle={(event) => setOpen(event.currentTarget.open)} data-supplemental-finding-id={finding.id} data-supplemental-finding-severity={finding.severity} data-supplemental-finding-domain={finding.domain}><summary><span>{index === 0 ? "最高风险" : routeSupplementDomainLabel(finding.domain)}</span><b>{finding.title}</b><small>{routeSupplementSeverityLabel(finding.severity)}</small></summary><p>{finding.summary}</p><dl>{finding.evidence.map((fact) => <div key={fact.label}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>)}</dl></details>;
}

export function DesktopRouteSupplement({ route, state }: { route: string; state: RouteSupplementState }) {
  const resultId = useId();
  const [input, setInput] = useState(state.query || "");
  useEffect(() => { setInput(state.query || ""); }, [state.query]);
  if (!["connections", "dns4", "security"].includes(route)) return null;
  const result = state.result;
  const data = result?.data;
  const total = data?.kind === "dns-static" ? data.totalCount : data?.kind === "connection-search" ? data.matchCount : data?.kind === "health-findings" ? data.findings.length : null;
  const target = data?.kind === "connection-search" ? data.targetIp : state.query || "";
  const offset = data?.kind === "dns-static" ? data.offset : route === "dns4" && state.page ? (state.page - 1) * 50 : "";
  const pageSize = data?.kind === "dns-static" ? data.limit : route === "dns4" ? 50 : "";
  const selectedConnection = data?.kind === "connection-search" && state.selectedConnectionRowId
    ? data.rows.map((row, index) => ({ row, index, rowId: connectionSupplementRowId(row, index) })).find((item) => item.rowId === state.selectedConnectionRowId) || null
    : null;
  const kind = route === "connections" ? "connection-search" : route === "dns4" ? "dns-static" : "health-findings";
  const evidenceTime = formatRfc3339Local(result?.observedAt) || "未取得";
  const sourceLabel = routeSupplementSourceLabel(result?.source);
  const coverageLabel = routeSupplementCoverageLabel(result?.coverage);
  const selectors = {
    "data-supplemental-surface": route,
    "data-supplemental-presentation": "desktop",
    "data-supplemental-request": state.requestStatus,
    "data-supplemental-state": state.uiState || "unavailable",
    "data-supplemental-evidence": result?.evidenceMode || "unavailable",
    "data-supplemental-query": state.query || "",
    "data-supplemental-kind": kind,
    "data-supplemental-source": result?.source || "unavailable",
    "data-supplemental-coverage": result?.coverage || "unavailable",
    "data-supplemental-observed-at": result?.observedAt || "",
    "data-supplemental-target": target,
    "data-supplemental-offset": offset,
    "data-supplemental-page-size": pageSize,
    "data-supplemental-page": state.page || "",
    "data-supplemental-total": total ?? "",
    "data-supplemental-error-code": state.errorCode || "",
    "data-supplemental-error-status": state.errorStatus ?? "",
    "data-supplemental-retry-after": state.retryAfterSeconds ?? "",
  };
  const status = state.requestStatus === "loading" ? "正在读取补充证据…" : state.uiState === "malformed" ? "响应契约不完整；工作区继续使用快照。" : state.requestStatus === "error" ? state.message : result?.parseStatus === "unavailable" ? result.reason : null;
  const liveStatus = state.requestStatus === "loading"
    ? "正在读取补充证据。"
    : status
      ? status
      : data?.kind === "connection-search"
        ? `查询完成，找到 ${data.matchCount} 条连接。`
        : data?.kind === "dns-static"
          ? `DNS 第 ${state.page || 1} 页读取完成，本页 ${data.rows.length} 条，共 ${data.totalCount} 条。`
          : data?.kind === "health-findings"
            ? `全局健康发现读取完成，共 ${data.findings.length} 条。`
            : "补充证据尚未取得。";
  const captureSummary = data?.kind === "connection-search"
    ? data.capture.truncatedByRows || data.capture.truncatedByBytes
      ? "已报告截断"
      : data.capture.timedOut === true
        ? "已报告超时"
        : data.capture.incompleteTransport
          ? "传输未完整"
          : data.capture.timedOut === null
            ? "超时状态未取得"
            : "未报告截断"
    : null;
  const pager = data?.kind === "dns-static" || (route === "dns4" && state.page) ? <nav className="ddrs-pager" aria-label="DNS 补充分页"><button type="button" disabled={!state.page || state.page <= 1 || state.requestStatus === "loading"} onClick={() => state.loadDnsPage((state.page || 1) - 1)} data-supplemental-prev-page><ChevronLeft aria-hidden="true" size={16} />上一页</button><span>第 {state.page || 1} / {state.totalPages || "?"} 页</span><button type="button" disabled={state.requestStatus === "loading" || !state.page || !state.totalPages || state.page >= state.totalPages} onClick={() => state.loadDnsPage((state.page || 0) + 1)} data-supplemental-next-page>下一页<ChevronRight aria-hidden="true" size={16} /></button></nav> : null;

  return <section className="ddrs-shell" {...selectors} aria-label="桌面补充只读证据">
    {route === "connections" ? <header className="ddrs-commandbar"><form className="ddrs-query" onSubmit={(event) => { event.preventDefault(); state.submitConnection(input); }}><div className="ddrs-query-heading"><label htmlFor={`${resultId}-ip`}><b>活动连接精确查询</b><small>完整 IPv4 / IPv6</small></label>{state.query ? <button className="ddrs-clear-query" type="button" onClick={state.clearConnectionQuery} data-supplemental-clear-query><X aria-hidden="true" size={14} />清除</button> : null}</div><div className="ddrs-query-control"><Search aria-hidden="true" size={16} /><input id={`${resultId}-ip`} value={input} onChange={(event) => setInput(event.target.value)} autoComplete="off" spellCheck={false} placeholder="192.0.2.10" data-supplemental-target-input="connections" /><button type="submit" disabled={!isExplicitIpQuery(input) || state.requestStatus === "loading" || state.retryBlocked} aria-controls={resultId} data-supplemental-submit="connections">查询</button></div>{input && !isExplicitIpQuery(input) ? <p>格式错误：不要附加端口、掩码或空格。</p> : null}</form></header> : null}
    <div className="sr-only" role="status" aria-live="polite" aria-atomic="true" data-supplemental-live-status>{liveStatus}</div>
    {status ? <div className="ddrs-status"><span>{status}</span>{state.requestStatus === "error" && (state.query || state.page || route === "security") ? <button type="button" onClick={state.retry} disabled={state.retryBlocked} data-supplemental-retry><RefreshCw aria-hidden="true" size={15} />{state.retryBlocked ? `${state.retryAfterSeconds} 秒后重试` : "重试"}</button> : null}</div> : null}
    <div className="ddrs-results" id={resultId} aria-busy={state.requestStatus === "loading"}>
      {data ? <div className="ddrs-evidencebar" aria-label="补充证据边界"><span>{result?.evidenceMode === "current" ? "当前" : "历史"} · <time dateTime={result?.observedAt || undefined}>{evidenceTime}</time></span><span>来源 {sourceLabel}</span><span>覆盖 {coverageLabel}</span></div> : null}
      {data?.kind === "dns-static" ? <div className="ddrs-dns"><div className="ddrs-result-heading"><b>本次 REST 枚举</b><span>{data.rows.length} / {data.totalCount} 条 · {coverageLabel}</span></div><table><thead><tr><th>名称</th><th>类型</th><th>目标</th><th>TTL</th><th>状态</th></tr></thead><tbody>{data.rows.map((row, index) => <tr key={`${row.name}-${index}`}><td>{row.name}</td><td>{row.type}</td><td>{row.value}</td><td>{row.ttl}</td><td>{row.disabled ? "已停用" : "启用"}</td></tr>)}</tbody></table>{!data.rows.length ? <p>本页没有规则。</p> : null}</div> : null}
      {selectedConnection && data?.kind === "connection-search" ? <section className="ddrs-connection-detail" id={`${resultId}-connection-detail`} data-supplemental-object-detail={selectedConnection.rowId}><header><button type="button" onClick={state.closeConnection} aria-label="返回连接结果"><ChevronLeft aria-hidden="true" size={17} /></button><span><small>连接证据</small><b>{selectedConnection.row.srcIp} → {selectedConnection.row.dstIp}</b></span></header><dl><div><dt>查询目标角色</dt><dd>{desktopTargetRole(selectedConnection.row.srcIp, selectedConnection.row.dstIp, data.targetIp)}</dd></div><div><dt>协议 / 超时</dt><dd>{selectedConnection.row.protocol} / {selectedConnection.row.timeout}</dd></div><div><dt>原向速率</dt><dd data-supplemental-rate-origin={supplementalRateOrigin(selectedConnection.row.origRateBps)} data-supplemental-rate-field="origRateBps">{desktopRate(selectedConnection.row.origRateBps)}</dd></div><div><dt>回向速率</dt><dd data-supplemental-rate-origin={supplementalRateOrigin(selectedConnection.row.replRateBps)} data-supplemental-rate-field="replRateBps">{desktopRate(selectedConnection.row.replRateBps)}</dd></div><div><dt>传输边界</dt><dd>{captureSummary}</dd></div><div><dt>证据时点</dt><dd><time dateTime={result?.observedAt || undefined}>{evidenceTime}</time></dd></div></dl></section> : null}
      {data?.kind === "connection-search" ? <div className="ddrs-connections"><div className="ddrs-result-heading"><b>{data.targetIp}</b><span>{data.matchCount} 条 · 本次有界查询 · {captureSummary}</span></div><table><thead><tr><th>源</th><th>目标</th><th>协议</th><th>超时</th><th>上行</th><th>下行</th></tr></thead><tbody>{data.rows.map((row, index) => { const rowId = connectionSupplementRowId(row, index); return <tr key={rowId}><td><button className="ddrs-connection-open" type="button" onClick={() => state.openConnection(rowId)} data-selected={state.selectedConnectionRowId === rowId ? "true" : undefined} aria-controls={state.selectedConnectionRowId === rowId ? `${resultId}-connection-detail` : undefined} data-supplemental-connection-row={index + 1} data-supplemental-row-id={rowId}>{row.srcIp}</button></td><td>{row.dstIp}</td><td>{row.protocol}</td><td>{row.timeout}</td><td data-supplemental-rate-origin={supplementalRateOrigin(row.origRateBps)} data-supplemental-rate-field="origRateBps">{desktopRate(row.origRateBps)}</td><td data-supplemental-rate-origin={supplementalRateOrigin(row.replRateBps)} data-supplemental-rate-field="replRateBps">{desktopRate(row.replRateBps)}</td></tr>; })}</tbody></table>{!data.rows.length ? <p>本次查询没有匹配连接。</p> : null}</div> : null}
      {data?.kind === "health-findings" ? <div className="ddrs-findings"><div className="ddrs-result-heading"><b>全局健康发现</b><span>{data.findings.length} 条 · 证据时点 <time dateTime={result?.observedAt || undefined}>{evidenceTime}</time></span></div>{data.findings.map((finding, index) => <DesktopHealthFinding key={finding.id} finding={finding} index={index} />)}{!data.findings.length ? <p>本次健康发现为空。</p> : null}</div> : null}
    </div>
    {pager}
  </section>;
}
