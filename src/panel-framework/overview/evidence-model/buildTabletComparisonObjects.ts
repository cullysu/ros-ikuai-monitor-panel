import { panelObjectIdentityPartsForRaw, stablePanelObjectId } from "../../sections/panelObjectIdentity";
import type { OverviewRawRoute } from "../types";
import type {
  OverviewComparisonObject,
  OverviewEvidenceMode,
  OverviewEvidenceRisk,
} from "./overviewEvidenceTypes";

function clean(value: unknown, fallback = "未记录"): string {
  const normalized = String(value ?? "").replace(/\s+/g, " ").trim();
  return normalized || fallback;
}

export function buildTabletComparisonObjects(
  candidates: OverviewComparisonObject[],
  mode: OverviewEvidenceMode,
  risk: OverviewEvidenceRisk,
  route: OverviewRawRoute | null,
  scale: "single" | "fleet",
): OverviewComparisonObject[] {
  if (mode !== "current" || risk !== "none" || scale === "fleet" || !route) return [];
  const gateway = clean(route.gateway, "");
  const novel = gateway
    ? candidates.filter((candidate) => candidate.object !== gateway)
    : candidates;
  if (novel.length >= 2) return novel;
  if (novel.length !== 1 || !gateway) return [];

  // The tablet workbench still needs an evidence-backed pair when the
  // snapshot has one non-route object. Keep the route as an explicit relation
  // anchor, but do not expose it as the public Comparison landmark.
  const routeId = stablePanelObjectId(
    "routes",
    "route",
    panelObjectIdentityPartsForRaw("routes", "路由记录", route),
  );
  const routeAnchor: OverviewComparisonObject = {
    id: routeId,
    category: "默认路由",
    object: gateway,
    state: "已核实",
    evidence: "活动记录 · 当前承载，未停用",
    source: "routes.defaultRoutes",
    tone: "trust",
    route: "routes",
    targetObjectId: routeId,
  };
  return [routeAnchor, novel[0]];
}
