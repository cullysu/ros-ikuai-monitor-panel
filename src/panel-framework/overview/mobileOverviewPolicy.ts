export type MobileOverviewPriority =
  | "snapshot-missing"
  | "wan-offline"
  | "resource-full"
  | "interface-down"
  | "collection-degraded"
  | "normal";

export type MobilePrimaryListKind =
  | "terminal-ranking"
  | "wan-incident"
  | "interface-incident"
  | "resource-incident"
  | "snapshot-boundary"
  | "collection-boundary";

export type MobileIncidentTargetTab = "wan" | "interface" | "terminal" | "log";

export interface MobileIncidentAction {
  value: string;
  note: string;
  targetTab?: MobileIncidentTargetTab;
}

export interface MobileIncidentResource {
  label: string;
  display: string;
  thresholdText: string;
  sustainedText: string;
}

export interface MobileAppHomeContract {
  severity: "p0" | "p1" | "p2" | "normal";
  firstQuestion: string;
  layout: "incident-first" | "trust-first" | "operations-first";
  rankingPolicy: "hidden" | "collapsed" | "supporting" | "primary";
  informationArchitecture:
    | "trust-boundary-no-business-data"
    | "wan-offline-default-route-collection-success-first"
    | "interface-carrier-impact-first"
    | "resource-pressure-evidence-first"
    | "collection-boundary-first"
    | "normal-operations-first";
  topSlot:
    | "trust-boundary"
    | "wan-incident"
    | "interface-impact"
    | "resource-pressure"
    | "collection-boundary"
    | "normal-summary"
    | "decision-spine";
  terminalRanking:
    | "not-mounted"
    | "secondary-collapsed"
    | "supporting-evidence"
    | "primary-operations";
  trustBoundary: string;
  showCoreMetricRail: boolean;
}

export interface MobileHomeSurface {
  order: "status-before-list" | "list-before-status";
  orderContract:
    | "supporting-list-after-primary-visual"
    | "incident-evidence-after-primary-visual";
  slots: Array<"status" | "list">;
  className: string;
  ranking: "primary" | "supporting" | "suppressed";
  listKind: MobilePrimaryListKind;
  rankListKind?: "terminal-total-traffic-list";
  v240ListKind: "terminal-ranking" | "incident-objects";
  terminalRankingMounted: "true" | "false";
  terminalRankingState: MobileAppHomeContract["terminalRanking"];
  normalRanking?: "operations-five-rows";
  contract: "view-model-one-supporting-list-no-duplicate-status";
}

export interface MobileOverviewPolicyContext {
  recentSuccess: string;
  collectionLabel: string;
  collectionValue: string;
  snapshotValue: string;
  routeValue: string;
}

interface MobileOverviewPolicyDefinition
  extends Omit<MobileAppHomeContract, "trustBoundary"> {
  surfaceOrder: MobileHomeSurface["order"];
  surfaceRanking: MobileHomeSurface["ranking"];
  incidentAction?: MobileIncidentAction;
  trustBoundary: (context: MobileOverviewPolicyContext) => string;
}

const MOBILE_OVERVIEW_POLICY: Record<
  MobileOverviewPriority,
  MobileOverviewPolicyDefinition
> = {
  "snapshot-missing": {
    severity: "p0",
    firstQuestion: "业务数据能不能信",
    layout: "trust-first",
    rankingPolicy: "hidden",
    informationArchitecture: "trust-boundary-no-business-data",
    topSlot: "trust-boundary",
    terminalRanking: "not-mounted",
    showCoreMetricRail: true,
    surfaceOrder: "list-before-status",
    surfaceRanking: "suppressed",
    incidentAction: { value: "查采集状态", note: "采集 / 最近成功", targetTab: "log" },
    trustBoundary: (context) =>
      `业务快照缺失 · 最近成功 ${context.recentSuccess}`,
  },
  "wan-offline": {
    severity: "p0",
    firstQuestion: "是否已经断网",
    layout: "incident-first",
    rankingPolicy: "hidden",
    informationArchitecture: "wan-offline-default-route-collection-success-first",
    topSlot: "wan-incident",
    terminalRanking: "not-mounted",
    showCoreMetricRail: true,
    surfaceOrder: "list-before-status",
    surfaceRanking: "suppressed",
    incidentAction: { value: "查默认出口", note: "WAN / 默认路由", targetTab: "wan" },
    trustBoundary: (context) =>
      `转发面不可用 · ${context.collectionLabel}${context.collectionValue} · 最近 ${context.recentSuccess}`,
  },
  "interface-down": {
    severity: "p1",
    firstQuestion: "哪些承载受影响",
    layout: "incident-first",
    rankingPolicy: "collapsed",
    informationArchitecture: "interface-carrier-impact-first",
    topSlot: "interface-impact",
    terminalRanking: "secondary-collapsed",
    showCoreMetricRail: true,
    surfaceOrder: "list-before-status",
    surfaceRanking: "suppressed",
    incidentAction: { value: "查接口承载", note: "接口 / 默认路由", targetTab: "interface" },
    trustBoundary: (context) =>
      `接口转发面优先 · 采集面只作旁证 · ${context.snapshotValue}`,
  },
  "resource-full": {
    severity: "p1",
    firstQuestion: "资源是否影响转发",
    layout: "incident-first",
    rankingPolicy: "supporting",
    informationArchitecture: "resource-pressure-evidence-first",
    topSlot: "resource-pressure",
    terminalRanking: "supporting-evidence",
    showCoreMetricRail: true,
    surfaceOrder: "list-before-status",
    surfaceRanking: "supporting",
    trustBoundary: (context) =>
      `资源连续越阈 · ${context.routeValue} · 采样${context.snapshotValue}`,
  },
  "collection-degraded": {
    severity: "p2",
    firstQuestion: "页面数据是否仍可参考",
    layout: "trust-first",
    rankingPolicy: "collapsed",
    informationArchitecture: "collection-boundary-first",
    topSlot: "collection-boundary",
    terminalRanking: "secondary-collapsed",
    showCoreMetricRail: true,
    surfaceOrder: "list-before-status",
    surfaceRanking: "suppressed",
    incidentAction: { value: "查采集通道", note: "通道 / 缓存", targetTab: "log" },
    trustBoundary: (context) =>
      `采集降级 · 缓存边界 · 最近 ${context.recentSuccess}`,
  },
  normal: {
    severity: "normal",
    firstQuestion: "网络是否可信",
    layout: "operations-first",
    rankingPolicy: "supporting",
    informationArchitecture: "normal-operations-first",
    topSlot: "decision-spine",
    terminalRanking: "supporting-evidence",
    showCoreMetricRail: true,
    surfaceOrder: "status-before-list",
    surfaceRanking: "supporting",
    trustBoundary: (context) =>
      `转发面可用 · 采集${context.collectionValue} · 快照${context.snapshotValue}`,
  },
};

export function resolveMobileIncidentAction(
  priority: MobileOverviewPriority,
  resource?: MobileIncidentResource,
): MobileIncidentAction {
  if (priority === "resource-full") {
    return {
      value: `先处理${resource?.label || "资源"}`,
      note: resource
        ? `${resource.display} · ${resource.thresholdText} · ${resource.sustainedText}`
        : "按最高风险项处理",
    };
  }
  return MOBILE_OVERVIEW_POLICY[priority].incidentAction || {
    value: "观察",
    note: "持续观察",
  };
}

export function resolveMobileOverviewPolicy(
  priority: MobileOverviewPriority,
  listKind: MobilePrimaryListKind,
  context: MobileOverviewPolicyContext,
): {
  appHomeContract: MobileAppHomeContract;
  surface: MobileHomeSurface;
} {
  const definition = MOBILE_OVERVIEW_POLICY[priority];
  const appHomeContract: MobileAppHomeContract = {
    severity: definition.severity,
    firstQuestion: definition.firstQuestion,
    layout: definition.layout,
    rankingPolicy: definition.rankingPolicy,
    informationArchitecture: definition.informationArchitecture,
    topSlot: definition.topSlot,
    terminalRanking: definition.terminalRanking,
    trustBoundary: definition.trustBoundary(context),
    showCoreMetricRail: definition.showCoreMetricRail,
  };
  const isTerminalRanking = listKind === "terminal-ranking";
  const orderContract =
    definition.surfaceOrder === "list-before-status"
      ? "incident-evidence-after-primary-visual"
      : "supporting-list-after-primary-visual";
  return {
    appHomeContract,
    surface: {
      order: definition.surfaceOrder,
      orderContract,
      slots: ["list"],
      className: `${
        definition.surfaceOrder === "list-before-status"
          ? "is-incident-first"
          : "is-ranking-first"
      } is-ranking-${definition.surfaceRanking} is-single-supporting-surface`,
      ranking: definition.surfaceRanking,
      listKind,
      rankListKind: isTerminalRanking
        ? "terminal-total-traffic-list"
        : undefined,
      v240ListKind: isTerminalRanking
        ? "terminal-ranking"
        : "incident-objects",
      terminalRankingMounted: isTerminalRanking ? "true" : "false",
      terminalRankingState: definition.terminalRanking,
      normalRanking: priority === "normal" ? "operations-five-rows" : undefined,
      contract: "view-model-one-supporting-list-no-duplicate-status",
    },
  };
}
