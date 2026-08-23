import type { PanelRouteId } from "../../routes/panelRoutes";
import type { RouteRecoveryPolicy } from "./routeRecoveryTypes";

/**
 * Read-only recovery language for pressure, traffic, and connection evidence.
 *
 * These routes expose observations with different coverage contracts. A missing
 * sample, incomplete sequence, or bounded detail list must remain a collection
 * boundary; it never becomes a zero value, a complete inventory, or a network
 * or business-health conclusion.
 */
export const trafficRecoveryPolicies = {
  trafficLoad: {
    heading: "资源与负载证据边界",
    partial: {
      title: "资源当前样本或连续性不完整",
      body: "只展示本次快照已返回的 CPU、内存、磁盘或接口压力字段；缺失当前样本、阈值或连续性不按 0、未超限或持续时间处理。可查看采样审计和采集通道。",
      primaryAction: "loadAudit",
    },
    historical: {
      title: "资源数据仅有历史样本",
      body: "历史样本只说明记录时刻的资源读数；不能据此确认当前压力、连续超限或网络/业务健康。请先核对最新采样时间。",
    },
    unavailable: {
      title: "资源当前样本不可用",
      body: "本次没有可验证的资源当前样本或连续性证据，因此不显示当前负载结论，也不推断网络或业务状态。请查看采样审计和采集通道。",
      primaryAction: "readonlyDiagnostics",
    },
    actions: [
      { route: "loadAudit", label: "查看资源采样审计" },
      { route: "readonlyDiagnostics", label: "查看采集通道" },
    ],
  },
  loadAudit: {
    heading: "资源采样审计证据边界",
    partial: {
      title: "资源审计序列不完整",
      body: "只展示本次取得的资源审计序列与对应时间点；缺失样本、间隔或连续性不补为 0，也不据此计算完整趋势或持续超限。可回看当前负载和采集通道。",
      primaryAction: "trafficLoad",
    },
    historical: {
      title: "资源审计仅有历史序列",
      body: "历史审计序列只能说明记录时刻的样本变化；不能据此确认当前资源压力、连续性或网络/业务健康。请先核对最新采样时间。",
    },
    unavailable: {
      title: "资源审计序列不可用",
      body: "本次没有可验证的资源审计序列，因此不展示趋势、持续时间或阈值结论，也不推断当前网络或业务状态。请查看当前负载和采集通道。",
      primaryAction: "readonlyDiagnostics",
    },
    actions: [
      { route: "trafficLoad", label: "查看当前资源负载" },
      { route: "readonlyDiagnostics", label: "查看采集通道" },
    ],
  },
  trafficAudit: {
    heading: "流量采样覆盖证据边界",
    partial: {
      title: "流量采样覆盖不完整",
      body: "只展示本次已返回的协议、对象或速率流量采样；缺失对象与未覆盖时段不按 0 处理，采样结果也不代表全量流量或完整业务范围。可交叉核对接口和连接明细。",
      primaryAction: "interfaces",
    },
    historical: {
      title: "流量审计仅有历史采样",
      body: "历史流量采样只说明记录时刻已覆盖的对象和速率；不能据此确认当前总流量、完整覆盖范围或网络/业务健康。请先核对最新采样时间。",
    },
    unavailable: {
      title: "流量采样不可用",
      body: "本次没有可验证的流量采样覆盖，因此不显示当前流量结论，也不把缺失对象当作无流量或无业务。请查看接口和连接明细。",
      primaryAction: "interfaces",
    },
    actions: [
      { route: "interfaces", label: "查看接口流量对象" },
      { route: "connections", label: "查看连接明细" },
    ],
  },
  connections: {
    heading: "连接明细完整性边界",
    partial: {
      title: "活动连接明细不完整",
      body: "只展示本次快照返回的活动连接明细；缺失连接、分页外对象或未取得字段不按 0、已断开或不存在处理，明细也不代表完整连接枚举。可核对终端与流量采样。",
      primaryAction: "terminals",
    },
    historical: {
      title: "连接明细仅有历史记录",
      body: "历史连接记录只说明记录时刻观察到的明细；不能据此确认当前连接仍存在、连接总数完整或网络/业务健康。请先核对最新采集时间。",
    },
    unavailable: {
      title: "活动连接明细不可用",
      body: "本次没有可验证的活动连接明细或完整性声明，因此不判断当前连接数、对象是否断开或业务状态。请查看终端与流量采样。",
      primaryAction: "terminals",
    },
    actions: [
      { route: "terminals", label: "查看终端身份记录" },
      { route: "trafficAudit", label: "查看流量采样覆盖" },
    ],
  },
} as const satisfies Partial<Record<PanelRouteId, RouteRecoveryPolicy>>;
