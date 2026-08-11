import type { PanelRouteId } from "../../routes/panelRoutes";
import { addressRecoveryPolicies } from "./addressRecoveryPolicies";
import { controlRecoveryPolicies } from "./controlRecoveryPolicies";
import { networkRecoveryPolicies } from "./networkRecoveryPolicies";
import { trafficRecoveryPolicies } from "./trafficRecoveryPolicies";
import type { RouteRecoveryPolicy } from "./routeRecoveryTypes";

const interfaceRecoveryPolicy: RouteRecoveryPolicy = {
  heading: "接口证据边界",
  partial: {
    title: "部分接口集合未取得",
    body: "只使用已返回的接口对象；缺失集合不推断为零，也不据此确认默认路由完整。",
    primaryAction: "readonlyDiagnostics",
  },
  historical: {
    title: "接口对象仅保留历史记录",
    body: "历史快照不代表当前运行状态；当前接口业务数字不可据此确认。",
  },
  unavailable: {
    title: "接口对象暂不参与当前判断",
    body: "没有成功快照时不显示接口业务数字；先核对采集通道和失败记录。",
    primaryAction: "readonlyDiagnostics",
  },
  actions: [
    { route: "readonlyDiagnostics", label: "检查采集通道" },
    { route: "logs", label: "查看失败记录" },
  ],
};

const policies: Partial<Record<PanelRouteId, RouteRecoveryPolicy>> = {
  interfaces: interfaceRecoveryPolicy,
  ...networkRecoveryPolicies,
  ...addressRecoveryPolicies,
  ...trafficRecoveryPolicies,
  ...controlRecoveryPolicies,
};

export function routeRecoveryPolicyFor(route: PanelRouteId): RouteRecoveryPolicy | null {
  return policies[route] || null;
}

export const ROUTE_RECOVERY_POLICY_ROUTES = Object.freeze(Object.keys(policies) as PanelRouteId[]);
