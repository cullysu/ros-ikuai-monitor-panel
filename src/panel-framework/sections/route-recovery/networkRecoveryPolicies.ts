import type { PanelRouteId } from "../../routes/panelRoutes";
import type { RouteRecoveryPolicy } from "./routeRecoveryTypes";

/**
 * Route-specific read-only recovery language for network evidence.
 *
 * Each policy says exactly what the collection gap means and directs the
 * operator to an existing observation surface.  It deliberately never turns
 * a missing observation into a claim about external reachability or service
 * health.
 */
export const networkRecoveryPolicies = {
  lineStatus: {
    heading: "WAN 线路证据边界",
    partial: {
      title: "部分 WAN 线路证据未取得",
      body: "只显示本次快照已返回的 WAN 对象；未返回的线路、速率或默认出口关联不推断为零、可用或不可用。下一步可核对接口对象和采集通道。",
      primaryAction: "interfaces",
    },
    historical: {
      title: "WAN 线路仅有历史证据",
      body: "历史快照只说明记录时刻的 WAN 对象；不能据此确认当前默认出口、外网可达性或业务健康。请先核对最新采集时间。",
    },
    unavailable: {
      title: "WAN 当前证据不可用",
      body: "本次没有可验证的 WAN 采集结果，因此不显示当前带宽或线路可用性；先查看采集通道和失败记录。",
      primaryAction: "readonlyDiagnostics",
    },
    actions: [
      { route: "interfaces", label: "核对接口对象" },
      { route: "readonlyDiagnostics", label: "查看采集通道" },
    ],
  },
  balance: {
    heading: "WAN 分流证据边界",
    partial: {
      title: "分流规则证据不完整",
      body: "仅依据已返回的策略标记、默认路由和线路对象展示分流关系；缺失规则不代表未命中、未配置或业务正常。下一步可核对路由表和采集通道。",
      primaryAction: "routes",
    },
    historical: {
      title: "分流关系仅有历史证据",
      body: "历史快照只能说明当时采集到的规则与线路关系；不能据此确认当前流量实际走向、外网可达性或业务健康。请先核对最新采集时间。",
    },
    unavailable: {
      title: "分流当前证据不可用",
      body: "本次没有可验证的策略或关联路由证据，因此不判断分流是否生效；先查看路由表和采集失败记录。",
      primaryAction: "readonlyDiagnostics",
    },
    actions: [
      { route: "routes", label: "查看路由表证据" },
      { route: "readonlyDiagnostics", label: "查看采集通道" },
    ],
  },
  routes: {
    heading: "路由表证据边界",
    partial: {
      title: "路由表证据不完整",
      body: "只展示本次快照已返回的默认、静态或动态路由；缺失条目不推断为不存在，也不据此确认默认出口或网络可达。下一步可核对接口对象和采集通道。",
      primaryAction: "interfaces",
    },
    historical: {
      title: "路由表仅有历史证据",
      body: "历史快照只说明记录时刻存在的路由条目；不能据此确认当前活动路由、默认出口或业务健康。请先核对最新采集时间。",
    },
    unavailable: {
      title: "路由表当前证据不可用",
      body: "本次没有可验证的路由表采集结果，因此不判断默认路由是否存在或活动；先查看采集通道和失败记录。",
      primaryAction: "readonlyDiagnostics",
    },
    actions: [
      { route: "interfaces", label: "核对接口对象" },
      { route: "readonlyDiagnostics", label: "查看采集通道" },
    ],
  },
} as const satisfies Partial<Record<PanelRouteId, RouteRecoveryPolicy>>;
