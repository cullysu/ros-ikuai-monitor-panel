import { Activity } from "lucide-react";
import type { OverviewTrafficInstrument, OverviewTrafficPoint } from "../overview/evidence-model/overviewEvidenceTypes";

function polyline(points: OverviewTrafficPoint[], key: "down" | "up"): string {
  if (points.length < 2) return "";
  const peak = Math.max(1, ...points.flatMap((point) => [point.down, point.up]));
  return points.map((point, index) => {
    const x = 4 + (index / (points.length - 1)) * 312;
    const y = 96 - (point[key] / peak) * 88;
    return `${x.toFixed(1)},${Math.max(8, y).toFixed(1)}`;
  }).join(" ");
}

function axisTime(timestamp: number): string {
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date(timestamp));
}

export function MobilePatrolTraffic({ traffic, onOpen }: { traffic: OverviewTrafficInstrument; onOpen: () => void }) {
  const chartReady = traffic.status === "ready" && traffic.points.length >= 2;
  const windowText = chartReady
    ? `${traffic.windowLabel} · ${traffic.sampleCount} 点`
    : "当前读数 · 趋势待采样";
  const down = polyline(traffic.points, "down");
  const up = polyline(traffic.points, "up");
  const startTime = chartReady ? axisTime(traffic.points[0].timestamp) : "";
  const endTime = chartReady ? axisTime(traffic.points[traffic.points.length - 1].timestamp) : "";

  return (
    <section className="mp-traffic" data-mobile-visual-layer="signal" data-mobile-traffic-signal data-mobile-traffic-window={windowText} data-overview-task-landmark="signal" aria-labelledby="mp-traffic-title">
      <header data-mobile-traffic-window={windowText}>
        <div>
          <span className="mp-section-kicker">WAN 信号</span>
          <h2 id="mp-traffic-title">{traffic.title}</h2>
        </div>
        <span className="mp-window">{windowText}</span>
      </header>

      <div className={`mp-traffic-body ${chartReady ? "is-ready" : "is-accumulating"}`}>
        {chartReady ? (
          <div className="mp-chart">
            <span className="mp-chart-scale" aria-hidden="true"><b>{traffic.peak}</b><b>0</b></span>
            <svg
              viewBox="0 0 320 104"
              preserveAspectRatio="xMidYMid meet"
              role="img"
              aria-labelledby="mp-traffic-chart-title mp-traffic-chart-desc"
            >
              <title id="mp-traffic-chart-title">WAN 上传与下载趋势</title>
              <desc id="mp-traffic-chart-desc">{traffic.accessibleSummary}，纵轴从 0 到 {traffic.peak}，横轴从 {startTime} 到 {endTime}。</desc>
              <path className="mp-chart-grid" d="M4 8H316 M4 52H316 M4 96H316" />
              <polyline className="mp-chart-down" points={down} />
              <polyline className="mp-chart-up" points={up} />
            </svg>
            <span className="mp-chart-time" aria-hidden="true"><b>{startTime}</b><b>{endTime}</b></span>
          </div>
        ) : (
          <div className="mp-chart-pending" aria-label={traffic.accessibleSummary}>
            <Activity aria-hidden="true" size={18} />
            <span><b>趋势正在形成</b><small>至少需要两个同窗完整样本</small></span>
          </div>
        )}
      </div>

      <footer>
        {chartReady ? (
          <>
            <span><i className="is-down" aria-hidden="true" />下载</span>
            <span><i className="is-up" aria-hidden="true" />上传</span>
          </>
        ) : <span>完整样本 {traffic.sampleCount} / 2</span>}
        <span data-mobile-traffic-peak>窗口峰值 {traffic.peak}</span>
        <button type="button" data-mobile-destination="trafficLoad" onClick={onOpen}>流量明细</button>
      </footer>
    </section>
  );
}
