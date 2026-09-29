import type { PanelRouteId } from "../../routes/panelRoutes";
import type { RouteRecoveryPolicy } from "./routeRecoveryTypes";

/**
 * Read-only recovery language for address identity evidence.
 *
 * These routes describe different observations of the same possible object:
 * terminal identity, DHCP lease/client records, and ARP IP-to-MAC mappings.
 * A collection gap in one observation is never promoted into a claim about
 * device presence, address ownership, network reachability, or service health.
 */
export const addressRecoveryPolicies = {
  terminals: {
    heading: "终端身份证据边界",
    partial: {
      title: "部分终端身份记录未取得",
      body: "只展示本次快照已返回的终端身份、地址或连接字段；未返回对象不推断为离线、已离网或地址已释放。可交叉核对 DHCP 租约与 ARP 映射。",
      primaryAction: "dhcp",
    },
    historical: {
      title: "终端身份仅有历史记录",
      body: "历史快照只说明记录时刻观察到的终端身份与地址关系；不能据此确认设备当前在线、仍使用该地址或网络/业务健康。请先核对最新采集时间。",
    },
    unavailable: {
      title: "终端当前身份证据不可用",
      body: "本次没有可验证的终端身份采集结果，因此不判断设备是否存在、在线或拥有某个地址；可查看 DHCP 租约和 ARP 映射的独立记录。",
      primaryAction: "dhcp",
    },
    actions: [
      { route: "dhcp", label: "核对 DHCP 租约与客户端" },
      { route: "arp", label: "核对 IP 与 MAC 映射" },
    ],
  },
  dhcp: {
    heading: "DHCP 租约证据边界",
    partial: {
      title: "部分 DHCP 租约或客户端记录未取得",
      body: "只展示本次快照已返回的 DHCP 租约、客户端或地址池字段；缺失租约不推断为过期、释放、拒绝分配或终端离线。可回到终端身份和 ARP 映射交叉核对。",
      primaryAction: "terminals",
    },
    historical: {
      title: "DHCP 租约仅有历史记录",
      body: "历史快照只说明记录时刻的租约或客户端关系；不能据此确认当前租约有效、地址仍被分配或终端当前在线。请先核对最新采集时间。",
    },
    unavailable: {
      title: "DHCP 当前租约证据不可用",
      body: "本次没有可验证的 DHCP 租约或客户端采集结果，因此不判断地址是否由 DHCP 分配，也不据此推断终端或网络健康；可查看终端身份与 ARP 映射。",
      primaryAction: "terminals",
    },
    actions: [
      { route: "terminals", label: "查看终端身份记录" },
      { route: "arp", label: "核对租约地址的 ARP 映射" },
    ],
  },
  arp: {
    heading: "ARP 映射证据边界",
    partial: {
      title: "部分 ARP 映射记录未取得",
      body: "只展示本次快照已返回的 ARP IP、MAC 与接口映射；缺失映射不推断为冲突、已清除、地址未使用或设备离线。可回到终端身份和 DHCP 租约交叉核对。",
      primaryAction: "terminals",
    },
    historical: {
      title: "ARP 映射仅有历史记录",
      body: "历史快照只说明记录时刻观察到的 IP 与 MAC 映射；不能据此确认当前二层可达、地址仍归属该 MAC 或网络/业务健康。请先核对最新采集时间。",
    },
    unavailable: {
      title: "ARP 当前映射证据不可用",
      body: "本次没有可验证的 ARP IP 与 MAC 映射，因此不判断地址归属、二层可达或冲突；可查看终端身份与 DHCP 租约的独立记录。",
      primaryAction: "terminals",
    },
    actions: [
      { route: "terminals", label: "查看 MAC 对应的终端身份" },
      { route: "dhcp", label: "核对地址的 DHCP 租约" },
    ],
  },
} as const satisfies Partial<Record<PanelRouteId, RouteRecoveryPolicy>>;
