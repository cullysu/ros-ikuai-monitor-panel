import type { InterfaceRowEvidence } from "./sectionRowEvidenceTypes";

export interface InterfaceRouteRelationCopy {
  label: string;
  detail: string;
}

/**
 * Formats only the relationship evidence shared by collection comparison
 * surfaces. It deliberately does not infer a default route from interface
 * role, name, or throughput.
 */
export function interfaceRouteRelationCopy(evidence: InterfaceRowEvidence): InterfaceRouteRelationCopy {
  const route = evidence.defaultRoutes[0];
  if (evidence.defaultRouteRelation === "direct" && route) {
    const gateway = route.gateway || "网关未记录";
    const distance = route.distance === null ? "distance 未记录" : `distance ${route.distance}`;
    return { label: "默认路由已关联", detail: `${gateway} · ${distance}` };
  }
  if (evidence.defaultRouteRelation === "direct") {
    return { label: "默认路由已标记", detail: "关联明细未记录" };
  }
  return { label: "默认路由待核对", detail: "关系证据未取得" };
}
