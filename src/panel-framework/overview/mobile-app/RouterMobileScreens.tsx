import type { RouterMobileEvidence, RouterMobileIncidentDecision, RouterMobileMetric, RouterMobileModel, RouterMobileTrend } from "./routerMobileModel";

function MetricGrid({ metrics }: { metrics: RouterMobileMetric[] }) {
  return (
    <section className="rm-metric-grid" aria-label="关键指标" data-router-mobile-metrics>
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

function LiveTraffic({ trend }: { trend: RouterMobileTrend }) {
  if (trend.source === "unavailable") {
    return (
      <section className="rm-traffic rm-traffic-empty" data-router-mobile-traffic="unavailable">
        <header><div><span>流量</span><h2>没有可用采样</h2></div><em>不推测</em></header>
        <p>取得新的业务快照前，不显示历史速率或占位曲线。</p>
      </section>
    );
  }
  if (trend.source === "history") {
    return (
      <section className="rm-traffic" data-router-mobile-traffic="history">
        <header><div><span>WAN 流量</span><h2>{trend.window}</h2></div><em>{trend.peakLabel}</em></header>
        <div className="rm-trend-legend"><span className="is-down">下载 {trend.downLabel}</span><span className="is-up">上传 {trend.upLabel}</span></div>
        <svg className="rm-trend" viewBox="0 0 320 112" preserveAspectRatio="none" role="img" aria-label={`${trend.window}，下载 ${trend.downLabel}，上传 ${trend.upLabel}`}>
          <line x1="8" y1="30" x2="312" y2="30" /><line x1="8" y1="58" x2="312" y2="58" /><line x1="8" y1="86" x2="312" y2="86" />
          <polyline className="is-down" points={trend.downPoints} /><polyline className="is-up" points={trend.upPoints} />
        </svg>
        <footer><span>较早</span><span>当前</span></footer>
      </section>
    );
  }
  return (
    <section className="rm-traffic" data-router-mobile-traffic="snapshot">
      <header><div><span>WAN 实时流速</span><h2>{trend.window}</h2></div><em>{trend.peakLabel}</em></header>
      <div className="rm-live-rate">
        <div><span>下载</span><strong>{trend.downLabel}</strong><i><b style={{ width: `${Math.max(4, trend.downShare * 100)}%` }} /></i></div>
        <div><span>上传</span><strong>{trend.upLabel}</strong><i><b style={{ width: `${Math.max(4, trend.upShare * 100)}%` }} /></i></div>
      </div>
      <p className="rm-source-note">单次快照只显示当前量级，不生成趋势或峰值。</p>
    </section>
  );
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

function Verdict({ model }: { model: RouterMobileModel }) {
  return (
    <section className="rm-verdict" data-tone={model.tone} data-router-mobile-verdict>
      <div><span>{model.verdict.kicker}</span><b>{model.device.updated}</b></div>
      <h1>{model.verdict.title}</h1>
      <p>{model.verdict.detail}</p>
    </section>
  );
}

function IncidentDecision({ decision }: { decision: RouterMobileIncidentDecision }) {
  const rows = [["对象", decision.object], ["影响", decision.impact], ["可信度", decision.credibility], ["下一步", decision.nextStep]];
  return (
    <div className="rm-decision" aria-label="事故判断">
      {rows.map(([label, value]) => <div data-router-mobile-decision-row key={label}><span>{label}</span><strong>{value}</strong></div>)}
    </div>
  );
}

function DetailEntry({ count, onOpen }: { count: number; onOpen: () => void }) {
  return <button className="rm-detail-entry" type="button" data-router-mobile-open-detail onClick={onOpen}><span>查看详细数据与运行依据</span><b>{count} 项&nbsp;›</b></button>;
}

export function RouterNetworkScreen({ model, onOpenDetail }: { model: RouterMobileModel; onOpenDetail: () => void }) {
  return (
    <div className="rm-screen rm-network-screen" data-router-mobile-screen="network">
      <Verdict model={model} />
      {model.incident ? (
        <section className="rm-incident-surface"><IncidentDecision decision={model.incident} /><DetailEntry count={model.evidence.length} onOpen={onOpenDetail} /></section>
      ) : (
        <section className="rm-operational-surface"><MetricGrid metrics={model.metrics} /><LiveTraffic trend={model.trend} /><DetailEntry count={model.evidence.length} onOpen={onOpenDetail} /></section>
      )}
    </div>
  );
}

export function RouterNetworkDetailScreen({ model, onBack }: { model: RouterMobileModel; onBack: () => void }) {
  return (
    <div className="rm-screen rm-detail-screen" data-router-mobile-screen="detail">
      <header className="rm-detail-header"><button type="button" data-router-mobile-back onClick={onBack} aria-label="返回网络概览">‹</button><div><span>网络详情</span><h1>{model.evidenceTitle}</h1></div></header>
      <section className="rm-operational-surface"><MetricGrid metrics={model.metrics} /><LiveTraffic trend={model.trend} /></section>
      <EvidenceList title={model.evidenceTitle} rows={model.evidence} />
    </div>
  );
}

export function RouterCollectionScreen({ model }: { model: RouterMobileModel }) {
  return (
    <div className="rm-screen rm-collection-screen" data-router-mobile-screen="collection">
      <section className="rm-verdict" data-tone={model.collection.tone} data-router-mobile-collection-verdict>
        <div><span>数据来源</span><b>{model.device.updated}</b></div><h1>{model.collection.title}</h1><p>{model.collection.detail}</p>
      </section>
      <section className="rm-operational-surface"><MetricGrid metrics={model.collection.metrics} /></section>
      <EvidenceList title="端点记录" rows={model.collection.failures} />
    </div>
  );
}
