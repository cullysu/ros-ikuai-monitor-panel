import type { PanelRouteId } from "../../routes/panelRoutes";
import type { RouteRecoveryPolicy } from "./routeRecoveryTypes";

/**
 * Read-only recovery language for DNS, security, logs, and collection
 * diagnostics. Each route remains an observation surface: a returned REST
 * response only establishes that particular evidence was collected, never
 * that forwarding, DNS resolution, or an application is healthy.
 */
export const controlRecoveryPolicies = {
  dns4: {
    heading: "IPv4 DNS 证据边界",
    partial: {
      title: "部分 IPv4 DNS 记录未取得",
      body: "只展示本次快照返回的 DNS 服务、上游或静态规则字段；缺失规则、上游或响应字段不推断为未配置、解析成功或业务正常。可交叉核对 IPv6/DNS 记录与采集通道。",
      primaryAction: "dns6",
    },
    historical: {
      title: "IPv4 DNS 仅有历史记录",
      body: "历史快照只说明记录时刻采集到的 DNS 配置或上游对象；不能据此确认当前解析结果、上游可达性或业务健康。请先核对最新采集时间。",
    },
    unavailable: {
      title: "IPv4 DNS 当前证据不可用",
      body: "本次没有可验证的 IPv4 DNS 服务、上游或规则采集结果，因此不判断解析是否成功，也不把 REST 可达当作 DNS 或业务正常。可查看 IPv6/DNS 记录和采集诊断。",
      primaryAction: "readonlyDiagnostics",
    },
    actions: [
      { route: "dns6", label: "核对 IPv6/DNS 记录" },
      { route: "readonlyDiagnostics", label: "查看采集诊断" },
    ],
  },
  dns6: {
    heading: "IPv6 与 DNS 证据边界",
    partial: {
      title: "部分 IPv6 或 DNS 记录未取得",
      body: "只展示本次快照返回的 IPv6 邻居发现、DHCPv6 或 DNS 发布字段；缺失邻居、租约或发布记录不推断为地址不可用、解析成功或业务正常。可交叉核对 IPv4 DNS 记录与采集通道。",
      primaryAction: "dns4",
    },
    historical: {
      title: "IPv6 与 DNS 仅有历史记录",
      body: "历史快照只说明记录时刻观察到的 IPv6、DHCPv6 或 DNS 对象；不能据此确认当前邻居可达、地址发布或 DNS 解析结果。请先核对最新采集时间。",
    },
    unavailable: {
      title: "IPv6 与 DNS 当前证据不可用",
      body: "本次没有可验证的 IPv6、DHCPv6 或 DNS 采集结果，因此不判断地址发布或解析是否成功，也不把 REST 可达当作网络或业务正常。可查看 IPv4 DNS 记录和采集诊断。",
      primaryAction: "readonlyDiagnostics",
    },
    actions: [
      { route: "dns4", label: "核对 IPv4 DNS 记录" },
      { route: "readonlyDiagnostics", label: "查看采集诊断" },
    ],
  },
  security: {
    heading: "安全规则与告警证据边界",
    partial: {
      title: "部分安全规则或告警未取得",
      body: "只展示本次快照返回的防火墙规则、地址集和只读告警字段；缺失规则、地址集或告警不推断为未命中、已放行、无风险或业务正常。可交叉核对运行日志与采集通道。",
      primaryAction: "logs",
    },
    historical: {
      title: "安全规则与告警仅有历史记录",
      body: "历史快照只说明记录时刻观察到的规则、地址集或告警；不能据此确认当前策略命中、攻击是否停止或业务健康。请先核对最新采集时间。",
    },
    unavailable: {
      title: "安全当前证据不可用",
      body: "本次没有可验证的安全规则、地址集或告警采集结果，因此不判断当前防护状态、告警数量或业务风险；REST 可达不代表规则已生效。可查看运行日志和采集诊断。",
      primaryAction: "readonlyDiagnostics",
    },
    actions: [
      { route: "logs", label: "查看运行日志证据" },
      { route: "readonlyDiagnostics", label: "查看采集诊断" },
    ],
  },
  logs: {
    heading: "运行日志证据边界",
    partial: {
      title: "部分运行日志未取得",
      body: "只展示本次快照返回的系统、网络或服务事件；缺失事件、截断窗口或未返回主题不推断为未发生、已恢复或网络/业务正常。可交叉核对服务分类日志与采集通道。",
      primaryAction: "serviceLogs",
    },
    historical: {
      title: "运行日志仅有历史记录",
      body: "历史日志只说明记录时刻已经收集到的事件；不能据此确认当前故障仍存在、已经恢复或业务健康。请先核对最新采集时间。",
    },
    unavailable: {
      title: "运行日志当前证据不可用",
      body: "本次没有可验证的运行日志采集结果，因此不把空列表当作无事件，也不根据 REST 可达判断网络或业务正常。可查看服务分类日志和采集诊断。",
      primaryAction: "readonlyDiagnostics",
    },
    actions: [
      { route: "serviceLogs", label: "查看服务分类日志" },
      { route: "readonlyDiagnostics", label: "查看采集诊断" },
    ],
  },
  serviceLogs: {
    heading: "服务日志证据边界",
    partial: {
      title: "部分服务分类日志未取得",
      body: "只展示本次快照返回的系统、防火墙、DHCP 或 DNS 分类事件；缺失分类、事件或时间段不推断为服务未运行、故障已恢复或业务正常。可交叉核对运行日志与采集通道。",
      primaryAction: "logs",
    },
    historical: {
      title: "服务日志仅有历史记录",
      body: "历史服务日志只说明记录时刻已收集到的分类事件；不能据此确认当前服务状态、DNS/DHCP 结果或业务健康。请先核对最新采集时间。",
    },
    unavailable: {
      title: "服务日志当前证据不可用",
      body: "本次没有可验证的服务分类日志，因此不把空分类当作服务正常或无事件，也不根据 REST 可达推断 DNS、DHCP 或业务状态。可查看运行日志和采集诊断。",
      primaryAction: "readonlyDiagnostics",
    },
    actions: [
      { route: "logs", label: "查看运行日志证据" },
      { route: "readonlyDiagnostics", label: "查看采集诊断" },
    ],
  },
  readonlyDiagnostics: {
    heading: "采集诊断证据边界",
    partial: {
      title: "部分采集通道或端点记录未取得",
      body: "只展示本次快照返回的采集通道、端点结果和失败记录；缺失通道、端点或重试字段不推断为连接正常、路由可达或业务正常。可交叉核对接口对象和运行日志。",
      primaryAction: "interfaces",
    },
    historical: {
      title: "采集诊断仅有历史记录",
      body: "历史诊断只说明记录时刻观察到的采集通道或端点结果；不能据此确认当前 REST/SSH 可达、转发状态或业务健康。请先核对最新采集时间。",
    },
    unavailable: {
      title: "采集诊断当前证据不可用",
      body: "本次没有可验证的采集通道或端点结果，因此不判断管理面、接口转发或业务状态；即使 REST 可达也不能据此确认网络正常。可查看接口对象和运行日志。",
      primaryAction: "interfaces",
    },
    actions: [
      { route: "interfaces", label: "查看接口对象证据" },
      { route: "logs", label: "查看运行日志证据" },
    ],
  },
} as const satisfies Partial<Record<PanelRouteId, RouteRecoveryPolicy>>;
