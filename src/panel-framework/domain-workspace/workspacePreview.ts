import type { WorkspaceRow } from "./workspaceRows";

export type WorkspacePreviewLabel =
  | "风险对象"
  | "默认出口"
  | "活动默认路由"
  | "最近记录"
  | "当前对象";

export interface WorkspacePreview {
  row: WorkspaceRow;
  label: WorkspacePreviewLabel;
}

export function selectSemanticWorkspacePreview(rows: WorkspaceRow[]): WorkspacePreview | null {
  const attention = rows.find((row) => row.meta.attention);
  if (attention) return { row: attention, label: "风险对象" };

  const defaultInterface = rows.find((row) => (
    row.evidence.kind === "interface"
    && row.evidence.running === true
    && row.evidence.defaultRouteRelation === "direct"
    && row.evidence.defaultRoutes.some((route) => route.active === true && route.disabled === false)
  ));
  if (defaultInterface) {
    return { row: defaultInterface, label: "默认出口" };
  }

  const defaultRoute = rows.find((row) => (
    row.evidence.kind === "route"
    && row.evidence.isDefault
    && row.evidence.active === true
    && row.evidence.disabled === false
  ));
  if (defaultRoute) return { row: defaultRoute, label: "活动默认路由" };

  const latestLog = rows
    .filter((row) => row.evidence.kind === "log" && row.evidence.timestamp !== null)
    .sort((left, right) => {
      const leftTime = left.evidence.kind === "log" ? left.evidence.timestamp ?? Number.NEGATIVE_INFINITY : Number.NEGATIVE_INFINITY;
      const rightTime = right.evidence.kind === "log" ? right.evidence.timestamp ?? Number.NEGATIVE_INFINITY : Number.NEGATIVE_INFINITY;
      return rightTime - leftTime;
    })[0];
  if (latestLog) return { row: latestLog, label: "最近记录" };

  return null;
}
