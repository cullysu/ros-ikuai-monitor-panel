import {
  isSnapshotUnavailable,
  latestBusinessSuccessTime,
  shortTimestamp,
  type OverviewDerivedState,
  type OverviewRawRoute,
  type OverviewRawSnapshot,
  type OverviewRawWanRow,
  type OverviewTone,
} from "../index";
import { panelObjectIdentityPartsForRaw, stablePanelObjectId } from "../../sections/panelObjectIdentity";
import { assessRawInterfaceOperationalState } from "../../sections/interfaceOperationalAssessment";
import {
  buildResourceInstrument,
  buildTrafficInstrument,
} from "./buildOverviewInstruments";
import { buildOverviewScenarioFocus } from "./buildOverviewScenarioFocus";
import {
  compareResourceRisk,
  RESOURCE_METRIC_DEFINITIONS,
  resourceEvidenceWindow,
  type ResourceMetricKey,
} from "./resourceHistorySamples";
import { buildOverviewInvestigationActions } from "./buildOverviewInvestigationActions";
import { buildOverviewRiskQueue } from "./buildOverviewRiskQueue";
import { buildOverviewComparisonObjects } from "./buildOverviewComparisonObjects";
import { buildTabletComparisonObjects } from "./buildTabletComparisonObjects";
import { buildOverviewOperationalDecisions } from "./buildOverviewOperationalDecisions";
import type {
  OverviewEvidenceMode,
  OverviewComparisonObject,
  OverviewEvidenceRow,
  OverviewEvidenceFact,
  OverviewEvidenceModel,
  OverviewEvidenceRisk,
  OverviewFocusObject,
  OverviewPriorityObject,
  OverviewRiskTask,
} from "./overviewEvidenceTypes";

function clean(value: unknown, fallback = "未记录"): string {
  const normalized = String(value ?? "").replace(/\s+/g, " ").trim();
  return normalized || fallback;
}

function wanRows(snapshot: OverviewRawSnapshot): OverviewRawWanRow[] {
  if (Array.isArray(snapshot.wan) && snapshot.wan.length) return snapshot.wan;
  return Array.isArray(snapshot.pppoe) ? snapshot.pppoe : [];
}

function evidenceMode(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): OverviewEvidenceMode {
  if (isSnapshotUnavailable(snapshot) || state.facts.freshness.credibility === "unavailable") return "unavailable";
  if (!latestBusinessSuccessTime(snapshot)) return "unavailable";
  const meta = snapshot.meta || {};
  if (
    meta.clientEvidenceBoundary ||
    meta.realtimeError ||
    meta.slowRestError ||
    meta.staticError ||
    meta.connectionDetailError ||
    meta.connectionProtocolError ||
    state.facts.collection.channelDegraded ||
    state.facts.failures.count > 0 ||
    state.facts.freshness.stale ||
    state.facts.freshness.history ||
    state.facts.freshness.credibility === "cache"
  ) return "historical";
  return "current";
}

function evidenceBoundary(snapshot: OverviewRawSnapshot, state: OverviewDerivedState, mode: OverviewEvidenceMode) {
  const successfulAt = latestBusinessSuccessTime(snapshot);
  const successLabel = successfulAt ? shortTimestamp(successfulAt) : "成功时间未记录";
  if (mode === "current") return {
    label: "当前证据",
    time: successLabel,
    note: "业务采样完整",
    tone: "trust" as OverviewTone,
  };
  if (mode === "historical") return {
    label: "历史证据",
    time: successLabel === "成功时间未记录" ? successLabel : `上次成功 ${successLabel}`,
    note: "当前变化不可见",
    tone: "warn" as OverviewTone,
  };
  return {
    label: "证据不可用",
    time: successLabel,
    note: "不作当前业务判断",
    tone: "danger" as OverviewTone,
  };
}

function deviceIdentity(snapshot: OverviewRawSnapshot, state: OverviewDerivedState, mode: OverviewEvidenceMode) {
  const target = clean(snapshot.meta?.routerHost || snapshot.meta?.target, "");
  const device = clean(snapshot.meta?.configuredIdentity || state.facts.device.identity || target, "RouterOS");
  const version = mode === "unavailable" || state.facts.device.version === "-" ? "" : `RouterOS ${state.facts.device.version}`;
  return { device, note: [version, target ? `目标 ${target}` : ""].filter(Boolean).join(" · ") };
}

function routeStatus(mode: OverviewEvidenceMode, state: OverviewDerivedState, route: OverviewRawRoute | null) {
  if (mode !== "current") return "unknown" as const;
  if (route) return "verified" as const;
  if (state.facts.wan.allOffline) return "offline" as const;
  return "unknown" as const;
}

function resourceMetrics(state: OverviewDerivedState) {
  return RESOURCE_METRIC_DEFINITIONS
    .map(({ key, label, threshold }) => ({ key, label, threshold, value: state.facts.resource[key] }))
    .filter((metric): metric is typeof metric & { value: number } => metric.value !== null);
}

function leadingResourceMetric(snapshot: OverviewRawSnapshot, state: OverviewDerivedState) {
  const window = resourceEvidenceWindow(snapshot);
  const metric = [...resourceMetrics(state)]
    .filter((item) => item.value >= item.threshold)
    .sort((left, right) => compareResourceRisk(
      window.metrics[left.key].evidence,
      window.metrics[right.key].evidence,
    ))[0];
  return metric ? { ...metric, evidence: window.metrics[metric.key].evidence } : null;
}

function fact(key: string, label: string, value: string, tone: OverviewTone, note = ""): OverviewEvidenceFact {
  return { key, label, value, tone, ...(note ? { note } : {}) };
}

function factsFor(
  snapshot: OverviewRawSnapshot,
  state: OverviewDerivedState,
  mode: OverviewEvidenceMode,
  risk: OverviewEvidenceRisk,
  route: OverviewRawRoute | null,
): [OverviewEvidenceFact, OverviewEvidenceFact, OverviewEvidenceFact] {
  const rest = state.facts.collection.rest;
  const ssh = state.facts.collection.ssh;
  const routeVerified = mode === "current" && Boolean(route);
  const targetKnown = Boolean(snapshot.meta?.routerHost || snapshot.meta?.target || snapshot.meta?.configuredIdentity);
  const success = latestBusinessSuccessTime(snapshot);

  if (risk === "evidence") return [
    fact("snapshot", "当前快照", "不可用", "danger", "业务数字已隐藏"),
    fact("target", "配置目标", targetKnown ? "已识别" : "未记录", targetKnown ? "trust" : "missing", "身份独立于快照"),
    fact("last-success", "最近成功", success ? shortTimestamp(success) : "未记录", success ? "warn" : "missing", success ? "仅作历史参考" : "不回退尝试时间"),
  ];
  if (risk === "collection") return [
    fact(
      "collection-channels",
      "上次通道记录",
      `${(rest.status === "current" ? 1 : 0) + (ssh.status === "current" ? 1 : 0)} / 2`,
      rest.status === "current" || ssh.status === "current" ? "warn" : "danger",
      "仅作历史对照",
    ),
    fact("last-success", "最近成功", success ? shortTimestamp(success) : "未记录", success ? "warn" : "missing", "不代表当前状态"),
    fact(
      "failed-endpoints",
      "失败端点",
      state.facts.failures.count ? `已记录 ${state.facts.failures.count}` : "未记录",
      state.facts.failures.count ? "warn" : "missing",
      "未记录不等于没有故障",
    ),
  ];
  if (risk === "wan") return [
    fact("wan", "WAN 运行", `0 / ${state.facts.wan.total}`, "danger", "当前对象"),
    fact("route", "活动默认路由", "0", "danger", "没有明确活动记录"),
    fact("collection", "采集通道", `${(rest.status === "current" ? 1 : 0) + (ssh.status === "current" ? 1 : 0)} / 2`, "trust", "REST + SSH"),
  ];
  if (risk === "resource") {
    const metrics = resourceMetrics(state);
    const leading = leadingResourceMetric(snapshot, state);
    const breached = metrics.filter((metric) => metric.value >= metric.threshold).length;
    const durationSeconds = leading?.evidence.durationSeconds; const observed = leading?.evidence.observed ?? 0;
    return [
      fact("resource-breaches", "超阈值", `${breached} / ${metrics.length}`, breached ? "danger" : "trust", "当前值与策略阈值的比较"),
      fact("resource-trailing", "证据跨度", durationSeconds !== null && durationSeconds !== undefined ? `${durationSeconds} 秒` : "未取得", leading?.evidence.trailing ? "danger" : "missing", leading?.evidence.trailing ? "同一时间窗的连续证据" : "连续时长未取得"),
      fact("resource-samples", "采样来源", observed ? "原子序列" : "未取得", observed ? "trust" : "missing", observed ? `${observed} 个当前样本` : "当前样本不可用"),
    ];
  }
  if (risk === "interfaces") return [
    fact("route", "默认路由", routeVerified ? "已核实" : "无法核实", routeVerified ? "trust" : "warn", routeVerified ? "明确活动记录" : "无明确活动记录"),
    fact("wan", "WAN 范围", `${state.facts.wan.online} / ${state.facts.wan.total}`, state.facts.wan.online ? "trust" : "danger", "运行对象"),
    fact("collection", "采集通道", `${(rest.status === "current" ? 1 : 0) + (ssh.status === "current" ? 1 : 0)} / 2`, "trust", "REST + SSH"),
  ];
  if (risk === "interface-review") return [
    fact("route", "默认路由", routeVerified ? "已核实" : "无法核实", routeVerified ? "trust" : "warn", routeVerified ? "未证明这些接口承载默认出口" : "无明确活动记录"),
    fact("wan", "WAN 范围", `${state.facts.wan.online} / ${state.facts.wan.total}`, state.facts.wan.online ? "trust" : "warn", "不由接口观测推断影响"),
    fact("collection", "采集通道", `${(rest.status === "current" ? 1 : 0) + (ssh.status === "current" ? 1 : 0)} / 2`, "trust", "REST + SSH"),
  ];
  if (risk === "route") return [
    fact("route", "默认路由", "无法核实", "warn", "无明确活动记录"),
    fact("wan", "WAN 运行", `${state.facts.wan.online} / ${state.facts.wan.total}`, state.facts.wan.online ? "trust" : "warn", "对象状态"),
    fact("collection", "采集通道", `${(rest.status === "current" ? 1 : 0) + (ssh.status === "current" ? 1 : 0)} / 2`, "trust", "REST + SSH"),
  ];
  if (state.scale === "fleet") {
    const runningInterfaces = state.facts.interfaces.online;
    return [
      fact("route", "默认路由", "已核实", "trust", "明确活动记录"),
      fact("wan", "WAN 运行", `${state.facts.wan.online} / ${state.facts.wan.total}`, "trust", "多对象范围"),
      fact("interfaces", "接口运行", `${runningInterfaces} / ${state.facts.interfaces.total}`, "trust", "本次采样"),
    ];
  }
  return [
    fact("route", "默认路由", "已核实", "trust", "明确活动记录"),
    fact("wan", "WAN 运行", `${state.facts.wan.online} / ${state.facts.wan.total}`, "trust", "当前对象"),
    fact("collection", "采集通道", `${(rest.status === "current" ? 1 : 0) + (ssh.status === "current" ? 1 : 0)} / 2`, "trust", "REST + SSH"),
  ];
}

function verdictFor(state: OverviewDerivedState, mode: OverviewEvidenceMode, risk: OverviewEvidenceRisk, route: OverviewRawRoute | null) {
  if (risk === "evidence") return { label: "判断边界", title: "当前业务状态不可判断", summary: "没有可用于当前判断的业务快照。", tone: "danger" as OverviewTone };
  if (risk === "collection") {
    return { label: "证据已降级", title: "当前采集状态不可确认", summary: "仅保留上次成功记录；不代表当前业务。", tone: "warn" as OverviewTone };
  }
  if (risk === "wan") return { label: "出口中断", title: `全部 ${state.facts.wan.total} 条 WAN 未运行`, summary: "无活动默认路由；先查链路、认证与上游。", tone: "danger" as OverviewTone };
  if (risk === "resource") return { label: "资源压力", title: "资源策略已触发", summary: "资源超限已持续；不推断网络中断。", tone: "danger" as OverviewTone };
  if (risk === "interfaces") return { label: "配置依赖异常", title: `${state.facts.interfaces.confirmedRisk} 个出口依赖接口未运行`, summary: route ? "活动默认路由有记录；核对出口冗余。" : "当前证据无法核实活动默认路由。", tone: "danger" as OverviewTone };
  if (risk === "interface-review") return { label: "接口状态待确认", title: `${state.facts.interfaces.impactUnverified} 个接口未运行，影响未判定`, summary: "仅确认运行标志；没有足够关系证据声明业务或转发受影响。", tone: "warn" as OverviewTone };
  if (risk === "route") return { label: "出口证据不完整", title: "默认路由无法核实", summary: "WAN 有记录；无明确活动默认路由。", tone: "warn" as OverviewTone };
  return {
    label: state.scale === "fleet" ? "多对象巡检" : "当前出口证据",
    title: "业务可用性尚未判定",
    summary: "已核实默认路由与采集通道；未探测外部业务。",
    tone: "trust" as OverviewTone,
  };
}

function collectionObjects(state: OverviewDerivedState): OverviewPriorityObject[] {
  const channels = [
    { key: "rest", name: "REST", channel: state.facts.collection.rest, source: "meta.realtime + meta.slowRest" },
    { key: "ssh", name: "SSH", channel: state.facts.collection.ssh, source: "meta.static" },
  ];
  const rows = channels.filter(({ channel }) => channel.status !== "current").map(({ key, name, channel, source }) => ({
    id: `collection:${key}`,
    category: "采集通道",
    name,
    state: channel.label,
    reason: channel.error ? clean(channel.error) : "没有明确成功记录",
    tone: channel.status === "unavailable" ? "missing" as OverviewTone : "danger" as OverviewTone,
    route: "readonlyDiagnostics" as const,
    sourcePath: source,
    attributes: [
      { label: "通道状态", value: channel.label },
      { label: "最近成功", value: channel.successAt ? shortTimestamp(channel.successAt) : "未记录" },
      { label: "错误记录", value: channel.error ? clean(channel.error) : "未记录" },
    ],
  }));
  return rows.length ? rows : [{
    id: "collection:boundary",
    category: "证据边界",
    name: "业务快照",
    state: "历史",
    reason: "客户端已停止当前状态声明",
    tone: "warn",
    route: "readonlyDiagnostics",
    sourcePath: "meta.clientEvidenceBoundary",
    attributes: [
      { label: "REST", value: state.facts.collection.rest.label },
      { label: "SSH", value: state.facts.collection.ssh.label },
      { label: "业务证据", value: "仅作历史参考" },
    ],
  }];
}

function priorityObjectsFor(
  snapshot: OverviewRawSnapshot,
  state: OverviewDerivedState,
  risk: OverviewEvidenceRisk,
): { total: number; rows: OverviewPriorityObject[] } {
  if (risk === "evidence" || risk === "collection") {
    const rows = collectionObjects(state);
    return { total: rows.length, rows };
  }
  if (risk === "wan") {
    const rows = wanRows(snapshot).filter((row) => row.running === false);
    return {
      total: rows.length,
      rows: rows.map((row, index) => ({
        id: stablePanelObjectId("lineStatus", "wan", panelObjectIdentityPartsForRaw("lineStatus", "WAN 对象", row)),
        category: "WAN",
        name: clean(row.name || row.interface, `WAN ${index + 1}`),
        state: "未运行",
        reason: `${clean(row.parent, "父接口未记录")} · 无活动默认路由`,
        tone: "danger",
        route: "lineStatus",
        targetObjectId: stablePanelObjectId("lineStatus", "wan", panelObjectIdentityPartsForRaw("lineStatus", "WAN 对象", row)),
        sourcePath: `wan[${index}]`,
        attributes: [
          { label: "父接口", value: clean(row.parent) },
          { label: "接入方式", value: clean(row.access) },
          { label: "地址", value: clean(row.address) },
        ],
      })),
    };
  }
  if (risk === "interfaces" || risk === "interface-review") {
    const expectedImpact = risk === "interfaces" ? "risk" : "unverified";
    const rows = (snapshot.interfaces || []).filter((row) => {
      const assessment = assessRawInterfaceOperationalState(row, snapshot.routes);
      return assessment.observation === "not-running" && assessment.impact === expectedImpact;
    });
    return {
      total: rows.length,
      rows: rows.map((row, index) => {
        const assessment = assessRawInterfaceOperationalState(row, snapshot.routes);
        const objectId = stablePanelObjectId("interfaces", "interface", panelObjectIdentityPartsForRaw("interfaces", "接口对象", row));
        const confirmed = assessment.impact === "risk";
        return {
          id: objectId,
          category: confirmed ? "接口依赖" : "接口观测",
          name: clean(row.name || row.interface, `接口 ${index + 1}`),
          state: confirmed ? "配置依赖未运行" : "影响未判定",
          reason: confirmed
            ? `${assessment.enabledDefaultRouteDependencies.length} 条已启用默认路由依赖 · 运行标志为 false`
            : "仅观测到运行标志为 false；未核实默认路由依赖",
          tone: confirmed ? "danger" as OverviewTone : "warn" as OverviewTone,
          route: "interfaces" as const,
          targetObjectId: objectId,
          sourcePath: `interfaces[${(snapshot.interfaces || []).indexOf(row)}]`,
          attributes: [
            { label: "管理状态", value: row.disabled === false ? "已启用" : row.disabled === true ? "已停用" : "未确认" },
            { label: "默认路由依赖", value: confirmed ? `${assessment.enabledDefaultRouteDependencies.length} 条` : "未核实" },
            { label: "角色 / 类型", value: clean([row.role, row.type].filter(Boolean).join(" / ")) },
          ],
        };
      }),
    };
  }
  if (risk === "resource") {
    const leadingResource = leadingResourceMetric(snapshot, state);
    if (!leadingResource) return { total: 0, rows: [] };
    const { evidence } = leadingResource;
    const continuity = evidence.observed
      ? evidence.trailing >= 2 && evidence.durationSeconds !== null
        ? `连续 ${evidence.trailing} / ${evidence.observed} 个样本 · ${evidence.durationSeconds} 秒`
        : evidence.trailing === 1 ? `连续 1 / ${evidence.observed} 个样本 · 持续时间不可证明` : `最新样本未超阈 · 共 ${evidence.observed} 个`
      : "连续性未取得";
    return {
      total: 1,
      rows: [{
        id: `resource:${leadingResource.key}`,
        category: "系统资源",
        name: leadingResource.label,
        state: `${Math.round(leadingResource.value)}% · 阈值 ${leadingResource.threshold}%`,
        reason: `高出 ${Math.round(leadingResource.value - leadingResource.threshold)} 个百分点 · ${continuity}`,
        tone: "danger",
        route: "trafficLoad",
        targetObjectId: stablePanelObjectId("trafficLoad", "resource", panelObjectIdentityPartsForRaw("trafficLoad", "资源证据", { key: leadingResource.key })),
        sourcePath: "overview + overview.history",
        attributes: [
          { label: "阈值差", value: `+${Math.round(leadingResource.value - leadingResource.threshold)} 个百分点` },
          { label: "连续证据", value: continuity },
          { label: "证据时间", value: evidence.evidenceAt || "未取得" },
          { label: "样本范围", value: evidence.observed ? `${evidence.observed} 个有效样本` : "未取得" },
          { label: "采样来源", value: "当前快照 + 原子历史样本" },
        ],
      }],
    };
  }
  if (risk === "route") {
    return {
      total: 1,
      rows: [{
        id: "route:unverified",
        category: "默认路由",
        name: "活动出口",
        state: "未核实",
        reason: "没有已启用且未停用的默认路由",
        tone: "warn",
        route: "routes",
        sourcePath: "routes.defaultRoutes",
        attributes: [
          { label: "默认路由记录", value: `${state.facts.route.candidates} 条` },
          { label: "WAN 运行", value: `${state.facts.wan.online} / ${state.facts.wan.total}` },
          { label: "活动标记", value: "未发现已启用路由" },
        ],
      }],
    };
  }
  return { total: 0, rows: [] };
}

function focusObjectFor(
  mode: OverviewEvidenceMode,
  risk: OverviewEvidenceRisk,
  route: OverviewRawRoute | null,
  activeCandidates: number,
): OverviewFocusObject | null {
  if (mode !== "current" || risk !== "none" || !route) return null;
  return {
    id: "route:active-default",
    category: "活动默认路由",
    name: clean(route.gateway, "网关未记录"),
    note: `${clean(route.dstAddress, "0.0.0.0/0")} · 当前承载，未停用`,
    tone: "trust",
    route: "routes",
    targetObjectId: stablePanelObjectId("routes", "route", panelObjectIdentityPartsForRaw("routes", "路由记录", route)),
    sourcePath: "routes.defaultRoutes",
    attributes: [
      { label: "路由表", value: clean(route.table || route.routingTable, "main") },
      { label: "网关", value: clean(route.gateway) },
      { label: "distance", value: clean(route.distance) },
      { label: "活动候选", value: activeCandidates > 1 ? `${activeCandidates} 条 · 当前按 distance 核对` : "1 条" },
    ],
  };
}

function comparisonObjectsFor(
  candidates: OverviewComparisonObject[],
  mode: OverviewEvidenceMode,
  risk: OverviewEvidenceRisk,
  route: OverviewRawRoute | null,
  scale: OverviewDerivedState["scale"],
): OverviewComparisonObject[] {
  if (mode !== "current" || risk !== "none" || scale === "fleet" || !route) return [];
  const gateway = clean(route.gateway, "");
  const novel = gateway
    ? candidates.filter((candidate) => candidate.object !== gateway)
    : candidates;
  return novel.length >= 2 ? novel : [];
}

function priorityCopy(risk: OverviewEvidenceRisk, total: number): { label: string; title: string } {
  if (!total) return { label: "", title: "" };
  if (risk === "evidence") return { label: "恢复入口", title: "恢复当前快照" };
  if (risk === "collection") return { label: "断链通道", title: "定位断开的采集通道" };
  if (risk === "wan") return { label: "离线 WAN", title: "逐条核对 WAN 链路" };
  if (risk === "resource") return { label: "资源对象", title: "检查超限资源" };
  if (risk === "interfaces") return { label: "配置依赖接口", title: "核对受影响配置依赖" };
  if (risk === "interface-review") return { label: "待确认接口", title: "核对未运行观测" };
  return { label: "出口证据", title: "核对默认路由" };
}

function evidenceRows(snapshot: OverviewRawSnapshot, state: OverviewDerivedState, risk: OverviewEvidenceRisk): OverviewEvidenceRow[] {
  const target = clean(snapshot.meta?.routerHost || snapshot.meta?.target);
  const rows: OverviewEvidenceRow[] = [];
  if (risk !== "evidence") {
    rows.push({ key: "target", label: "采集目标", value: target, note: "只读连接", tone: target === "未记录" ? "missing" : "trust" });
  }
  if (state.facts.failures.count > 0) {
    rows.push({ key: "failures", label: "失败端点", value: `已记录 ${state.facts.failures.count}`, note: "进入对象查看来源", tone: "warn" });
  }
  rows.push({ key: "boundary", label: "操作边界", value: "只读监控", note: "不会修改 RouterOS 配置", tone: "trust" });
  return rows;
}

export function buildOverviewEvidenceModel(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): OverviewEvidenceModel {
  const mode = evidenceMode(snapshot, state);
  const route = state.facts.route.verified ? state.facts.route.selected : null;
  const riskQueue = buildOverviewRiskQueue(mode, state, route).map((task): OverviewRiskTask => {
    const taskObjects = priorityObjectsFor(snapshot, state, task.risk);
    const [singleObject] = taskObjects.rows;
    const targetObjectId = taskObjects.total === 1 ? singleObject?.targetObjectId : undefined;
    return {
      ...task,
      ...(targetObjectId ? { targetObjectId } : {}),
    };
  });
  const risk: OverviewEvidenceRisk = riskQueue[0]?.risk || "none";
  const evidence = evidenceBoundary(snapshot, state, mode);
  const evidenceAt = mode === "unavailable" ? null : latestBusinessSuccessTime(snapshot);
  const identity = deviceIdentity(snapshot, state, mode);
  const verdict = verdictFor(state, mode, risk, route);
  const priority = priorityObjectsFor(snapshot, state, risk);
  const priorityHeading = priorityCopy(risk, priority.total);
  const coverageObjects = mode === "current" ? buildOverviewComparisonObjects(snapshot) : [];
  return {
    scenario: state.scenario,
    risk,
    riskQueue,
    evidenceMode: mode,
    evidenceLabel: evidence.label,
    evidenceAt,
    evidenceTime: evidence.time,
    evidenceNote: evidence.note,
    evidenceTone: evidence.tone,
    device: identity.device,
    deviceNote: identity.note,
    verdictLabel: verdict.label,
    verdictTitle: verdict.title,
    verdictSummary: verdict.summary,
    verdictTone: verdict.tone,
    scenarioFocus: buildOverviewScenarioFocus(snapshot, state, risk),
    facts: factsFor(snapshot, state, mode, risk, route),
    priorityLabel: priorityHeading.label,
    priorityTitle: priorityHeading.title,
    priorityObjects: priority.rows.slice(0, 3),
    priorityObjectsAll: priority.rows,
    priorityTotal: priority.total,
    focusObject: focusObjectFor(mode, risk, route, state.facts.route.activeCandidates),
    coverageObjects,
    comparisonObjects: comparisonObjectsFor(coverageObjects, mode, risk, route, state.scale),
     tabletComparisonObjects: buildTabletComparisonObjects(coverageObjects, mode, risk, route, state.scale),
    secondaryDecisions: buildOverviewOperationalDecisions(snapshot, state, mode, risk),
    traffic: buildTrafficInstrument(snapshot, mode, risk),
    resource: buildResourceInstrument(snapshot, risk),
    evidenceRows: evidenceRows(snapshot, state, risk),
    investigationActions: buildOverviewInvestigationActions({
      risk,
      scale: state.scale,
      evidenceAt,
      priorityObjects: priority.rows,
    }),
  };
}
