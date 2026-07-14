import type { RouterMobileEvidence, RouterMobileIncidentDecision, RouterMobileMetric, RouterMobileModel, RouterMobileTrend } from "./routerMobileModel";

function MetricLedger({ metrics }: { metrics: RouterMobileMetric[] }) {
  return (
    <section className="rm-metric-ledger" aria-label="关键指标" data-router-mobile-metrics>
      {metrics.map((metric) => (
        <article className="rm-metric" data-tone={metric.tone || "healthy"} key={`${metric.label}-${metric.value}`}>
          <span>{metric.label}</span>
          <strong>{metric.value}{metric.unit ? <small>{metric.unit}</small> : null}</strong>
          <p>{metric.note}</p>
        </article>
      ))}
    </section>
  );
}

function TrafficPanel({ trend }: { trend: RouterMobileTrend }) {
  if (trend.source === "unavailable") return null;
  return (
    <section className="rm-traffic" data-router-mobile-traffic={trend.source}>
      <header>
        <div><span>WAN 吞吐</span><h2>{trend.window}</h2></div>
        <em>{trend.peakLabel}</em>
      </header>
      <div className="rm-traffic-values">
        <strong><span>下载</span>{trend.downLabel}</strong>
        <strong><span>上传</span>{trend.upLabel}</strong>
      </div>
      {trend.source === "history" ? (
        <>
          <svg className="rm-trend" viewBox="0 0 320 96" preserveAspectRatio="none" role="img" aria-label={`${trend.window}，下载 ${trend.downLabel}，上传 ${trend.upLabel}`}>
            <line x1="8" y1="20" x2="312" y2="20" /><line x1="8" y1="48" x2="312" y2="48" /><line x1="8" y1="76" x2="312" y2="76" />
            <polyline className="is-down" points={trend.downPoints} /><polyline className="is-up" points={trend.upPoints} />
          </svg>
          <footer><span>较早</span><span>当前</span></footer>
        </>
      ) : (
        <>
          <div className="rm-rate-bars" aria-label="当前流速相对量级">
            <i><b style={{ width: `${Math.max(4, trend.downShare * 100)}%` }} /></i>
            <i><b style={{ width: `${Math.max(4, trend.upShare * 100)}%` }} /></i>
          </div>
          <p className="rm-source-note">单次快照只显示当前量级，不生成趋势或峰值。</p>
        </>
      )}
    </section>
  );
}

function TrustRail({ metrics }: { metrics: RouterMobileMetric[] }) {
  return (
    <section className="rm-trust-rail" aria-label="判断依据" data-router-mobile-trust>
      {metrics.map((metric) => (
        <div data-tone={metric.tone || "healthy"} key={`${metric.label}-${metric.value}`}>
          <span>{metric.label}</span><strong>{metric.value}</strong><small>{metric.note}</small>
        </div>
      ))}
    </section>
  );
}

function Verdict({ model }: { model: RouterMobileModel }) {
  return (
    <section className="rm-verdict" data-tone={model.tone} data-router-mobile-verdict>
      <div><span>{model.verdict.kicker}</span></div>
      <h1>{model.verdict.title}</h1>
      <p>{model.verdict.detail}</p>
    </section>
  );
}

function IncidentBrief({ decision }: { decision: RouterMobileIncidentDecision }) {
  return (
    <section className="rm-incident-brief" aria-label="异常影响与排查">
      <div data-router-mobile-decision-row><span>影响</span><strong>{decision.impact}</strong></div>
      <div data-router-mobile-decision-row><span>排查</span><strong>{decision.nextStep}</strong></div>
    </section>
  );
}

function DetailEntry({ count, onOpen }: { count: number; onOpen: () => void }) {
  return <button className="rm-detail-entry" type="button" data-router-mobile-open-detail onClick={onOpen}><span>运行依据与端点记录</span><b>{count} 项<span aria-hidden="true">›</span></b></button>;
}

function EvidenceList({ title, rows }: { title: string; rows: RouterMobileEvidence[] }) {
  return (
    <section className="rm-evidence" data-router-mobile-evidence>
      <header><h2>{title}</h2><span>{rows.length} 项</span></header>
      <div className="rm-evidence-list">
        {rows.map((row, index) => (
          <article data-tone={row.tone || "healthy"} key={`${row.label}-${row.value}-${index}`}>
            <i aria-hidden="true" /><div><strong>{row.label}</strong><p>{row.note}</p></div><b>{row.value}</b>
          </article>
        ))}
      </div>
    </section>
  );
}

export function RouterNetworkScreen({ model, onOpenDetail }: { model: RouterMobileModel; onOpenDetail: () => void }) {
  const showTraffic = model.scenario !== "all-offline" && model.scenario !== "no-snapshot";
  return (
    <div className="rm-screen rm-network-screen" data-router-mobile-screen="network">
      <Verdict model={model} />
      <MetricLedger metrics={model.metrics} />
      {showTraffic ? <TrafficPanel trend={model.trend} /> : null}
      {model.incident ? <IncidentBrief decision={model.incident} /> : null}
      <TrustRail metrics={model.trust.metrics} />
      <DetailEntry count={model.evidence.length + model.trust.endpointRecords.length} onOpen={onOpenDetail} />
    </div>
  );
}

export function RouterNetworkDetailScreen({ model, onBack }: { model: RouterMobileModel; onBack: () => void }) {
  return (
    <div className="rm-screen rm-detail-screen" data-router-mobile-screen="detail">
      <header className="rm-detail-header"><button type="button" data-router-mobile-back onClick={onBack} aria-label="返回网络概览">‹</button><div><span>设备详情</span><h1>{model.evidenceTitle}</h1></div></header>
      <MetricLedger metrics={model.metrics} />
      <TrafficPanel trend={model.trend} />
      <TrustRail metrics={model.trust.metrics} />
      <EvidenceList title={model.evidenceTitle} rows={model.evidence} />
      <EvidenceList title="端点记录" rows={model.trust.endpointRecords} />
    </div>
  );
}
