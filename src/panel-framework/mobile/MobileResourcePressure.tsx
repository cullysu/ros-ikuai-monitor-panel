import { Cpu, Database, HardDrive } from "lucide-react";
import type {
  OverviewResourceInstrument,
  OverviewResourcePoint,
} from "../overview/evidence-model/overviewEvidenceTypes";

const ICONS = {
  cpu: Cpu,
  memory: Database,
  disk: HardDrive,
};

function polyline(points: OverviewResourcePoint[], key: "cpu" | "memory" | "disk"): string {
  if (points.length < 2) return "";
  return points.map((point, index) => {
    const x = 4 + (index / (points.length - 1)) * 312;
    const y = 4 + ((100 - point[key]) / 100) * 52;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
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

export function MobileResourcePressure({ resource }: { resource: OverviewResourceInstrument }) {
  const chartReady = resource.status === "ready" && resource.points.length >= 2;
  const startTime = chartReady ? axisTime(resource.points[0].timestamp) : "";
  const endTime = chartReady ? axisTime(resource.points[resource.points.length - 1].timestamp) : "";

  return (
    <section className="mp-resource" data-mobile-resource-signal={resource.status} aria-labelledby="mp-resource-title">
      <header>
        <div><span className="mp-section-kicker">资源信号</span><h2 id="mp-resource-title">当前压力与策略阈值</h2></div>
        <span className="mp-window">{chartReady ? `${resource.windowLabel} · ${resource.sampleCount} 点` : "当前采样"}</span>
      </header>

      <div className="mp-resource-metrics" aria-label={resource.accessibleSummary}>
        {resource.metrics.map((metric) => {
          const Icon = ICONS[metric.key];
          const value = Math.max(0, Math.min(100, metric.value));
          return (
            <div key={metric.key}>
              <span><Icon aria-hidden="true" size={17} /><b>{metric.label}</b></span>
              <span
                className="mp-resource-meter"
                role="meter"
                aria-label={`${metric.label} ${Math.round(metric.value)}%，策略阈值 ${metric.threshold}%`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(metric.value)}
              >
                <i style={{ width: `${value}%` }} />
                <em style={{ left: `${metric.threshold}%` }} />
              </span>
              <strong>{Math.round(metric.value)}%</strong>
              <small>阈值 {metric.threshold}%</small>
            </div>
          );
        })}
      </div>

      {chartReady ? (
        <div className="mp-resource-chart">
          <span className="mp-resource-scale" aria-hidden="true"><b>100%</b><b>50%</b><b>0</b></span>
          <div>
            <svg
              viewBox="0 0 320 60"
              preserveAspectRatio="xMidYMid meet"
              role="img"
              aria-labelledby="mp-resource-chart-title mp-resource-chart-desc"
            >
              <title id="mp-resource-chart-title">CPU、内存与磁盘压力趋势</title>
              <desc id="mp-resource-chart-desc">{resource.accessibleSummary}；纵轴为 0 到 100%，横轴从 {startTime} 到 {endTime}。</desc>
              <path className="mp-resource-grid" d="M4 4H316 M4 30H316 M4 56H316" />
              <path className="mp-resource-threshold" d="M4 9.2H316 M4 11.8H316" />
              <polyline className="is-cpu" points={polyline(resource.points, "cpu")} />
              <polyline className="is-memory" points={polyline(resource.points, "memory")} />
              <polyline className="is-disk" points={polyline(resource.points, "disk")} />
            </svg>
            <span className="mp-resource-time" aria-hidden="true"><b>{startTime}</b><b>{endTime}</b></span>
          </div>
        </div>
      ) : (
        <p className="mp-resource-pending">只有当前完整资源采样；至少两个带时间样本后才绘制趋势。</p>
      )}

      {chartReady ? (
        <div className="mp-resource-samples">
          <header><b>样本明细</b><span>{resource.points.length} 条</span></header>
          <table aria-label="资源压力时间序列样本">
            <thead><tr><th>时间</th><th>CPU</th><th>内存</th><th>磁盘</th></tr></thead>
            <tbody>
              {resource.points.slice(-6).map((point) => (
                <tr key={point.timestamp}>
                  <td>{axisTime(point.timestamp)}</td>
                  <td>{Math.round(point.cpu)}%</td>
                  <td>{Math.round(point.memory)}%</td>
                  <td>{Math.round(point.disk)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <footer aria-hidden="true">
        <span><i className="is-cpu" />CPU</span>
        <span><i className="is-memory" />内存</span>
        <span><i className="is-disk" />磁盘</span>
        <span><i className="is-threshold" />策略阈值</span>
      </footer>
    </section>
  );
}
