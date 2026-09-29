import { RefreshCw } from "lucide-react";
import { useId, type ReactNode } from "react";
import type { PanelRouteId } from "../routes/panelRoutes";
import type {
  ReadonlyDiagnosticsData,
  ReadonlyExitProbeRow,
  ReadonlyHttpProbeRow,
  ReadonlyPanelFileRow,
  ReadonlyTcpProbeRow,
} from "./readonlyDiagnosticsSchema";
import { isReadonlyDiagnosticsRoute, useReadonlyDiagnostics } from "./useReadonlyDiagnostics";
import "./readonlyDiagnostics.css";

function formatElapsed(ms: number | null): string {
  if (ms === null) return "未取得";
  return ms < 1_000 ? `${ms} ms` : `${(ms / 1_000).toFixed(2)} s`;
}

function formatBytes(size: number | null): string {
  if (size === null) return "未取得";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(2)} MB`;
}

function expectedLabel(expected: string): string {
  if (expected === "direct") return "直连";
  if (expected === "proxy") return "代理";
  if (expected === "mixed") return "混合";
  return expected;
}

function probeVerdict(ok: boolean, error: string | null): { label: string; tone: "ok" | "warn" } {
  return ok && !error ? { label: "成功", tone: "ok" } : { label: "失败", tone: "warn" };
}

function dnsRowProblem(row: ReadonlyDiagnosticsData["dnsMatrix"][number]): boolean {
  return Boolean(row.error) || (row.rcode !== null && row.rcode !== 0);
}

function EvidenceBlock({ title, note, children }: { title: string; note: string; children: ReactNode }) {
  const id = useId();
  return (
    <section className="rde-block" aria-labelledby={id}>
      <header className="rde-block-head">
        <b id={id}>{title}</b>
        <small>{note}</small>
      </header>
      {children}
    </section>
  );
}

function EvidenceTable({ headers, rows, empty }: { headers: string[]; rows: ReactNode[][]; empty: string }) {
  if (!rows.length) return <p className="rde-empty">{empty}</p>;
  return (
    <div className="rde-table-scroll">
      <table>
        <thead><tr>{headers.map((header) => <th scope="col" key={header}>{header}</th>)}</tr></thead>
        <tbody>{rows.map((cells, index) => <tr key={index}>{cells.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

function ExitProbeBlock({ rows }: { rows: ReadonlyExitProbeRow[] }) {
  return (
    <EvidenceBlock title="出口 IP 探测" note="只读 HTTP 出口归属探测 · 失败与超时原样呈现">
      <EvidenceTable
        headers={["探测目标", "出口 IP", "耗时", "结果", "错误"]}
        rows={rows.map((row) => {
          const verdict = probeVerdict(Boolean(row.ip), row.error);
          return [
            <span key="name">{row.name}</span>,
            <span key="ip" className="rde-mono">{row.ip || "未取得"}</span>,
            <span key="elapsed">{formatElapsed(row.elapsedMs)}</span>,
            <span key="verdict" className={`rde-chip is-${verdict.tone}`}>{verdict.label}</span>,
            <span key="error">{row.error || "—"}</span>,
          ];
        })}
        empty="本次探测没有出口结果"
      />
    </EvidenceBlock>
  );
}

function HttpProbeBlock({ rows }: { rows: ReadonlyHttpProbeRow[] }) {
  return (
    <EvidenceBlock title="服务可达性探测" note="常用站点 HTTP 探测 · 只读不改任何配置">
      <EvidenceTable
        headers={["服务", "预期", "HTTP 状态", "耗时", "结果", "错误"]}
        rows={rows.map((row) => {
          const verdict = probeVerdict(row.ok, row.error);
          return [
            <span key="name">{row.name}</span>,
            <span key="expected">{expectedLabel(row.expected)}</span>,
            <span key="status">{row.status === null ? "未取得" : row.status}</span>,
            <span key="elapsed">{formatElapsed(row.elapsedMs)}</span>,
            <span key="verdict" className={`rde-chip is-${verdict.tone}`}>{verdict.label}</span>,
            <span key="error">{row.error || "—"}</span>,
          ];
        })}
        empty="本次探测没有服务可达结果"
      />
    </EvidenceBlock>
  );
}

function TcpProbeBlock({ rows }: { rows: ReadonlyTcpProbeRow[] }) {
  return (
    <EvidenceBlock title="TCP 可达性探测" note="目标 443 端口握手探测 · 与 HTTP 结果分开判读">
      <EvidenceTable
        headers={["服务", "目标", "预期", "耗时", "结果", "错误"]}
        rows={rows.map((row) => {
          const verdict = probeVerdict(row.ok, row.error);
          return [
            <span key="name">{row.name}</span>,
            <span key="host" className="rde-mono">{row.port === null ? row.host : `${row.host}:${row.port}`}</span>,
            <span key="expected">{expectedLabel(row.expected)}</span>,
            <span key="elapsed">{formatElapsed(row.elapsedMs)}</span>,
            <span key="verdict" className={`rde-chip is-${verdict.tone}`}>{verdict.label}</span>,
            <span key="error">{row.error || "—"}</span>,
          ];
        })}
        empty="本次探测没有 TCP 可达结果"
      />
    </EvidenceBlock>
  );
}

function DnsMatrixBlock({ data }: { data: ReadonlyDiagnosticsData }) {
  return (
    <EvidenceBlock title="DNS 解析矩阵" note="常用站点 × DNS 服务器 × A/AAAA · Fake-IP 与错误原样呈现">
      <EvidenceTable
        headers={["服务", "DNS 服务器", "类型", "解析结果", "Fake-IP", "rcode", "耗时", "错误"]}
        rows={data.dnsMatrix.map((row) => [
          <span key="service">{row.service}</span>,
          <span key="server">{row.serverName}</span>,
          <span key="type">{row.type}</span>,
          <span key="answers" className="rde-mono">{row.answers.length ? row.answers.join(", ") : "无记录"}</span>,
          <span key="fake">{row.fakeIp ? "是" : "否"}</span>,
          <span key="rcode" className={row.rcode !== null && row.rcode !== 0 ? "is-warn" : undefined}>{row.rcode === null ? "未取得" : row.rcode}</span>,
          <span key="elapsed">{formatElapsed(row.elapsedMs)}</span>,
          <span key="error">{row.error || (row.rcode !== null && row.rcode !== 0 ? `rcode ${row.rcode}` : "—")}</span>,
        ])}
        empty="本次探测没有 DNS 解析记录"
      />
    </EvidenceBlock>
  );
}

function PanelFilesBlock({ rows }: { rows: ReadonlyPanelFileRow[] }) {
  return (
    <EvidenceBlock title="面板文件清单" note="面板自身文件的更新时间与大小 · 用于漂移观察">
      <EvidenceTable
        headers={["文件", "存在", "更新时间", "大小"]}
        rows={rows.map((row) => [
          <span key="name" className="rde-mono" title={row.path}>{row.name}</span>,
          <span key="exists" className={`rde-chip is-${row.exists ? "ok" : "warn"}`}>{row.exists ? "存在" : "缺失"}</span>,
          <span key="mtime" className="rde-mono">{row.mtime || "未记录"}</span>,
          <span key="size">{formatBytes(row.size)}</span>,
        ])}
        empty="本次探测没有面板文件清单"
      />
    </EvidenceBlock>
  );
}

function NikkiBlock({ nikki }: { nikki: ReadonlyDiagnosticsData["nikki"] }) {
  return (
    <EvidenceBlock title="Nikki / 代理控制器状态" note="只读探测 · 不修改代理配置">
      <dl className="rde-facts">
        <div><dt>控制器</dt><dd>{nikki.ok ? <span className="rde-chip is-ok">可用</span> : nikki.disabled ? <span className="rde-chip is-warn">未配置</span> : <span className="rde-chip is-warn">不可用</span>}</dd></div>
        <div><dt>版本</dt><dd>{nikki.version || "未记录"}</dd></div>
        <div><dt>Provider</dt><dd>{nikki.providerCount === null ? "未取得" : `${nikki.providerCount} 个`}</dd></div>
        <div><dt>规则数</dt><dd>{nikki.ruleCount === null ? "未取得" : `${nikki.ruleCount} 条`}</dd></div>
        {nikki.error ? <div><dt>原因</dt><dd>{nikki.error}</dd></div> : null}
      </dl>
    </EvidenceBlock>
  );
}

function FreshnessStrip({ data }: { data: ReadonlyDiagnosticsData }) {
  const dnsErrors = data.dnsMatrix.filter(dnsRowProblem).length;
  const httpOk = data.serviceReachability.filter((row) => row.ok && !row.error).length;
  const tcpOk = data.tcpReachability.filter((row) => row.ok && !row.error).length;
  const exitResults = data.exitChecks.filter((row) => row.ip && !row.error).length;
  return (
    <div className="rde-freshness" data-readonly-probe-freshness>
      <span><small>探测时间</small><b className="rde-mono">{data.generatedAtLabel || "未记录"}</b></span>
      <span><small>缓存</small><b>{data.cached ? `命中 · ${data.cacheAgeSeconds ?? "?"} s` : "实时探测"}</b></span>
      <span><small>预算 / TTL</small><b>{data.probeBudgetSeconds === null ? "未取得" : `${data.probeBudgetSeconds} s`} / {data.cacheTtlSeconds === null ? "未取得" : `${data.cacheTtlSeconds} s`}</b></span>
      <span><small>DNS 异常</small><b className={dnsErrors ? "is-warn" : undefined}>{dnsErrors} / {data.dnsMatrix.length}</b></span>
      <span><small>HTTP 可达</small><b>{httpOk} / {data.serviceReachability.length}</b></span>
      <span><small>TCP 可达</small><b>{tcpOk} / {data.tcpReachability.length}</b></span>
      <span><small>出口结果</small><b>{exitResults} / {data.exitChecks.length}</b></span>
    </div>
  );
}

function coverageRow(name: string, okCount: number, total: number, note: string): ReactNode[] {
  return [
    <span key="name">{name}</span>,
    <span key="value" className={okCount < total ? "is-warn" : undefined}>{okCount} / {total}</span>,
    <span key="note">{note}</span>,
  ];
}

function CoverageBlock({ data }: { data: ReadonlyDiagnosticsData }) {
  return (
    <EvidenceBlock title="探测覆盖摘要" note="各探测族成功计数；详细矩阵在对应专页">
      <EvidenceTable
        headers={["探测族", "成功 / 总数", "说明"]}
        rows={[
          coverageRow("DNS 解析", data.dnsMatrix.filter((row) => !dnsRowProblem(row)).length, data.dnsMatrix.length, "站点 × 服务器 × A/AAAA"),
          coverageRow("服务 HTTP", data.serviceReachability.filter((row) => row.ok && !row.error).length, data.serviceReachability.length, "常用站点可达性"),
          coverageRow("TCP 443", data.tcpReachability.filter((row) => row.ok && !row.error).length, data.tcpReachability.length, "端口握手探测"),
          coverageRow("出口 IP", data.exitChecks.filter((row) => row.ip && !row.error).length, data.exitChecks.length, "出口归属探测"),
        ]}
        empty="本次探测没有覆盖数据"
      />
    </EvidenceBlock>
  );
}

interface DegradationNotice {
  title: string;
  detail: string;
  retryable: boolean;
}

function degradationNotice(state: ReturnType<typeof useReadonlyDiagnostics>): DegradationNotice | null {
  if (state.requestStatus === "loading") return null;
  if (state.requestStatus === "error") {
    return { title: "只读探测证据读取失败", detail: state.reason || "接口请求失败", retryable: true };
  }
  if (!state.data) {
    return { title: "只读探测证据不可用", detail: state.reason || "响应不符合只读证据契约", retryable: false };
  }
  if (state.data.status !== "ok") {
    return {
      title: state.data.status === "disabled" ? "只读诊断已停用" : "只读诊断探测失败",
      detail: state.data.reason || "探测未执行；本页仅显示快照证据",
      retryable: false,
    };
  }
  return null;
}

export function ReadonlyDiagnosticsEvidence({ route }: { route: PanelRouteId }) {
  const state = useReadonlyDiagnostics(route);
  const headingId = useId();
  if (!isReadonlyDiagnosticsRoute(route)) return null;
  const data = state.data;
  const notice = degradationNotice(state);
  const ready = state.requestStatus === "success" && data?.status === "ok";

  return (
    <section
      className="rde-shell"
      data-readonly-diagnostics-evidence={route}
      data-readonly-probe-state={state.requestStatus === "loading" ? "loading" : ready ? "ready" : "unavailable"}
      aria-labelledby={headingId}
    >
      <header className="rde-head">
        <h2 id={headingId} tabIndex={-1}>只读探测证据</h2>
        <p>来自 /api/readonly-diagnostics 的独立只读探测，不写入路由器；与上方快照证据相互独立。</p>
      </header>

      {state.requestStatus === "loading" ? <p className="rde-status" role="status">正在读取只读探测证据…</p> : null}

      {notice ? (
        <div className="rde-status is-degraded" role="status">
          <span><b>{notice.title}</b><small>{notice.detail}</small></span>
          {notice.retryable ? (
            <button type="button" className="rde-retry" onClick={state.retry} data-readonly-probe-retry>
              <RefreshCw aria-hidden="true" size={14} />重试
            </button>
          ) : null}
        </div>
      ) : null}

      {ready && data ? (
        <div className="rde-body">
          <FreshnessStrip data={data} />
          {route === "readonlyDiagnostics" ? <CoverageBlock data={data} /> : null}
          {route === "dnsProxyDiagnostics" ? (
            <>
              <ExitProbeBlock rows={data.exitChecks} />
              <HttpProbeBlock rows={data.serviceReachability} />
              <TcpProbeBlock rows={data.tcpReachability} />
              <DnsMatrixBlock data={data} />
            </>
          ) : null}
          {route === "wanQualityDiagnostics" ? <ExitProbeBlock rows={data.exitChecks} /> : null}
          {route === "terminalRiskDiagnostics" ? <ExitProbeBlock rows={data.exitChecks} /> : null}
          {route === "collectionHealthDiagnostics" || route === "systemAuditDiagnostics" ? (
            <>
              <PanelFilesBlock rows={data.panelFiles} />
              <NikkiBlock nikki={data.nikki} />
            </>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
