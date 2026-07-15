import {
  formatPercent,
  formatRate,
  shortTimestamp,
  type OverviewDerivedState,
  type OverviewRawRoute,
  type OverviewRawSnapshot,
  type OverviewTone,
} from "../index";
import {
  channelAttemptAndSuccessNote,
  clean,
  finiteObservation,
  resourceSamples,
  successfulBusinessLabel,
  wanRows,
} from "./mobileNativeEvidence";
import { fleetSignal } from "./mobileNativePresentation";
import type {
  MobileCollectionChannelEvidence,
  MobileEvidenceMode,
  MobileNativeFact,
  MobileNativeFocus,
  MobileNativeInspection,
  MobileNativeSignal,
  MobileRiskKey,
  MobileRouteVerification,
} from "./mobileNativeTypes";

interface FocusContext {
  snapshot: OverviewRawSnapshot;
  state: OverviewDerivedState;
  mode: MobileEvidenceMode;
  verification: MobileRouteVerification;
  route: OverviewRawRoute | null;
  risks: MobileRiskKey[];
  channels: { rest: MobileCollectionChannelEvidence; ssh: MobileCollectionChannelEvidence };
}

function observedRates(snapshot: OverviewRawSnapshot): { down: number; up: number } | null {
  const rows = wanRows(snapshot).filter((row) => row.running !== false && row.disabled !== true);
  if (!rows.length) return null;
  let down = 0;
  let up = 0;
  for (const row of rows) {
    const downObservation = finiteObservation(row.downRate);
    const upObservation = finiteObservation(row.upRate);
    if (downObservation === null || upObservation === null) return null;
    down += downObservation;
    up += upObservation;
  }
  return { down, up };
}

function channelTone(channel: MobileCollectionChannelEvidence): OverviewTone {
  if (channel.status === "current") return "trust";
  if (channel.status === "unavailable") return "missing";
  return channel.status === "failed" ? "danger" : "warn";
}

function channelSignalNote(channel: MobileCollectionChannelEvidence): string {
  if (channel.error) return "当前尝试记录了错误";
  return channel.successAt ? "当前通道有成功记录" : "没有明确成功记录";
}

function routeProof(verification: MobileRouteVerification): MobileNativeFact {
  if (verification === "verified") return { key: "route-proof", label: "默认路由", value: "已核实", note: "明确活动记录", tone: "trust" };
  if (verification === "historical") return { key: "route-proof", label: "默认路由", value: "历史记录", note: "不代表当前", tone: "warn" };
  if (verification === "offline") return { key: "route-proof", label: "活动路由", value: "0", note: "当前记录", tone: "danger" };
  return { key: "route-proof", label: "默认路由", value: "无法核实", note: "无明确活动记录", tone: "warn" };
}

function scopeFor(context: FocusContext): string {
  if (context.state.scenario !== "fleet" && context.snapshot.meta?.scaleScenario !== "fleet") return "";
  const runningInterfaces = Math.max(0, context.state.facts.interfaces.total - context.state.facts.interfaces.down);
  return `多对象范围 · ${context.state.facts.wan.online}/${context.state.facts.wan.total} WAN · ${runningInterfaces}/${context.state.facts.interfaces.total} 接口`;
}

function proofFor(risk: MobileRiskKey | null, context: FocusContext): MobileNativeFact[] {
  const { snapshot, state, mode, verification, channels } = context;
  const businessSuccess = successfulBusinessLabel(snapshot);
  const hasBusinessSuccess = businessSuccess !== "成功时间未记录";
  if (risk === "evidence") return [
    { key: "snapshot", label: "当前快照", value: "不可用", note: "业务数字已隐藏", tone: "danger" },
    { key: "target", label: "配置目标", value: snapshot.meta?.routerHost || snapshot.meta?.target ? "已识别" : "未记录", note: "身份独立于快照", tone: "trust" },
    { key: "success", label: hasBusinessSuccess ? "最近成功采样" : "成功记录", value: hasBusinessSuccess ? businessSuccess : "未记录", note: hasBusinessSuccess ? "仅作历史参考" : "不回退尝试时间", tone: "warn" },
  ];
  if (risk === "wan-offline") return [
    { key: "wan", label: "WAN", value: `0 / ${state.facts.wan.total}`, note: mode === "current" ? "当前对象" : "保留记录", tone: mode === "current" ? "danger" : "warn" },
    { key: "route", label: "活动路由", value: verification === "offline" ? "0" : "无法核实", note: "不使用任意路由兜底", tone: mode === "current" ? "danger" : "warn" },
    { key: "collection", label: "采集周期", value: mode === "current" ? "已完成" : "仅历史", note: "状态来源边界", tone: mode === "current" ? "trust" : "warn" },
  ];
  if (risk === "resource") {
    const samples = resourceSamples(snapshot);
    const breached = [
      Number(state.facts.resource.cpu) >= 85,
      Number(state.facts.resource.memory) >= 85,
      Number(state.facts.resource.disk) >= 90,
    ].filter(Boolean).length;
    return [
      { key: "resource-classes", label: "超限项", value: `${breached} / 3`, note: "按资源策略判定", tone: mode === "current" ? "danger" : "warn" },
      { key: "resource-streak", label: "尾部连续", value: samples.observed ? `${samples.trailingStreak} 个` : "未取得", note: "不等于超限总数", tone: mode === "current" ? "danger" : "warn" },
      { key: "resource-samples", label: "有效样本", value: samples.observed ? `${samples.observed} 个` : "未取得", note: mode === "current" ? "当前采样序列" : "历史采样序列", tone: mode === "current" ? "trust" : "warn" },
    ];
  }
  if (risk === "interfaces") return [
    { key: "interface-count", label: "接口 Down", value: `${state.facts.interfaces.down} / ${state.facts.interfaces.total}`, note: mode === "current" ? "当前对象" : "历史记录", tone: mode === "current" ? "danger" : "warn" },
    { ...routeProof(verification), key: "interface-route" },
    { key: "interface-wan", label: "WAN 范围", value: `${state.facts.wan.online} / ${state.facts.wan.total}`, note: "运行记录", tone: state.facts.wan.online ? "trust" : "danger" },
  ];
  if (risk === "collection") return [
    { key: "collection-cycle", label: "当前周期", value: "未形成业务快照", note: "通道分别核对", tone: "danger" },
    { key: "collection-success", label: hasBusinessSuccess ? "最近成功采样" : "成功记录", value: hasBusinessSuccess ? businessSuccess : "未记录", note: hasBusinessSuccess ? "仅用于恢复对照" : "没有明确成功时间", tone: hasBusinessSuccess ? "trust" : "warn" },
    { key: "collection-boundary", label: "判断边界", value: "不推断当前业务", note: "历史记录不等于当前状态", tone: "warn" },
  ];
  if (state.scenario === "fleet") return [
    { key: "fleet-cycle", label: "采样周期", value: "已完成", note: "当前证据", tone: "trust" },
    { key: "fleet-risk", label: "阻断风险", value: "未发现", note: "范围信息不替代风险", tone: "trust" },
    { key: "fleet-mode", label: "对象模式", value: "多对象", note: "独立核验路由", tone: "trust" },
  ];
  return [
    routeProof(verification),
    { key: "normal-wan", label: "WAN", value: `${state.facts.wan.online} / ${state.facts.wan.total}`, note: "运行对象", tone: state.facts.wan.online ? "trust" : "warn" },
    { key: "normal-collection", label: "采集", value: channels.rest.status === "current" && channels.ssh.status === "current" ? "2 / 2" : "需复核", note: "REST + SSH", tone: channels.rest.status === "current" && channels.ssh.status === "current" ? "trust" : "warn" },
  ];
}

function signalFor(risk: MobileRiskKey | null, context: FocusContext): MobileNativeSignal {
  const { snapshot, state, mode, verification, channels } = context;
  if (risk === "resource") {
    return {
      kind: "resource",
      title: mode === "current" ? "当前资源压力" : "历史资源记录",
      note: mode === "current" ? "数值与策略阈值共用同一采样周期" : "保留值不代表当前",
      items: [
        { label: "CPU", value: formatPercent(state.facts.resource.cpu), percent: state.facts.resource.cpu, threshold: 85, tone: mode === "current" ? "danger" : "warn" },
        { label: "内存", value: formatPercent(state.facts.resource.memory), percent: state.facts.resource.memory, threshold: 85, tone: mode === "current" ? "danger" : "warn" },
        { label: "磁盘", value: formatPercent(state.facts.resource.disk), percent: state.facts.resource.disk, threshold: 90, tone: mode === "current" ? "danger" : "warn" },
      ],
    };
  }
  if (risk === "interfaces") {
    const rows = (snapshot.interfaces || []).filter((row) => row.running === false).slice(0, 3);
    return {
      kind: "interfaces",
      title: mode === "current" ? "受影响接口" : "历史接口记录",
      note: "名称与依赖证据分层显示",
      items: rows.map((row, index) => ({
        label: clean(row.name || row.interface, `接口 ${index + 1}`),
        value: mode === "current" ? "未运行" : "历史 Down 记录",
        note: row.disabled === true ? "已停用" : "运行标记为 false",
        tone: mode === "current" ? "danger" : "warn",
      })),
    };
  }
  if (risk === "collection" || risk === "evidence") {
    const failureCount = state.facts.failures.count;
    return {
      kind: "collection",
      title: "采集通道",
      note: "REST 与 SSH 独立陈述",
      items: [
        { label: "REST", value: channels.rest.label, note: channelSignalNote(channels.rest), tone: channelTone(channels.rest) },
        { label: "SSH", value: channels.ssh.label, note: channelSignalNote(channels.ssh), tone: channelTone(channels.ssh) },
        { label: "失败端点", value: failureCount ? `已记录 ${failureCount}` : "未记录", note: "没有记录不等于没有故障", tone: failureCount ? "warn" : "missing" },
      ],
    };
  }
  if (risk === "wan-offline") {
    const rows = wanRows(snapshot).filter((row) => row.running === false).slice(0, 3);
    return {
      kind: "wan",
      title: mode === "current" ? "离线 WAN" : "历史 WAN 记录",
      note: state.facts.wan.total > rows.length ? `优先显示 ${rows.length} 条，共 ${state.facts.wan.total} 条` : "按对象记录显示",
      items: rows.map((row, index) => ({
        label: clean(row.name || row.interface, `WAN ${index + 1}`),
        value: mode === "current" ? "未运行" : "历史离线记录",
        note: row.disabled === true ? "已停用" : "running=false",
        tone: mode === "current" ? "danger" : "warn",
      })),
    };
  }
  if (state.scenario === "fleet") return fleetSignal(state, verification);
  const rates = mode === "current" ? observedRates(snapshot) : null;
  if (rates) return {
    kind: "rates",
    title: "当前吞吐",
    note: "完整当前观测",
    items: [
      { label: "下载", value: formatRate(rates.down), tone: "trust" },
      { label: "上传", value: formatRate(rates.up), tone: "trust" },
    ],
  };
  return {
    kind: "availability",
    title: "速率观测",
    note: "缺少完整下载或上传观测，不以零值替代",
    items: [
      { label: "下载", value: "未取得", tone: "missing" },
      { label: "上传", value: "未取得", tone: "missing" },
    ],
  };
}

function routeInspection(context: FocusContext): MobileNativeInspection {
  const { snapshot, mode, verification, route } = context;
  const carrier = wanRows(snapshot).find((row) => row.running !== false && row.disabled !== true);
  const routeCount = Array.isArray(snapshot.routes?.defaultRoutes) ? snapshot.routes.defaultRoutes.length : 0;
  const available = mode !== "unavailable" && Boolean(route);
  return {
    key: "route",
    label: "默认路由",
    title: available ? clean(route?.gateway || route?.gatewayStatus, "活动默认路由") : "默认路由证据源",
    status: verification === "verified" ? "当前活动记录" : verification === "historical" ? "历史活动记录" : "未核实",
    tone: verification === "verified" ? "trust" : "warn",
    note: available ? "以下字段来自明确的默认路由记录" : "检查记录来源与筛选条件，不使用首行兜底",
    relations: available ? [
      { label: "路由表", value: clean(route?.table || route?.routingTable, "main") },
      { label: "网关", value: clean(route?.gateway || route?.gatewayStatus) },
      { label: "distance", value: clean(route?.distance) },
    ] : [
      { label: "记录来源", value: "routes.defaultRoutes" },
      { label: "记录数量", value: `${routeCount} 条` },
      { label: "核验条件", value: "active=true 且未停用" },
    ],
    rows: available ? [
      { key: "route-flags", label: "原始标记", value: "active=true · disabled=false" },
      { key: "route-carrier", label: "关联出口", value: clean(carrier?.name || carrier?.interface, "未采集到关联") },
      { key: "route-source", label: "证据来源", value: "默认路由记录" },
    ] : [
      { key: "route-boundary", label: "判断边界", value: "没有明确活动记录", note: "不推断默认出口" },
    ],
    disclosureTitle: "展开路由字段",
    actionTitle: "打开默认路由原始证据",
  };
}

function wanInspection(context: FocusContext): MobileNativeInspection {
  const { snapshot, mode, verification } = context;
  const rows = wanRows(snapshot);
  const selected = rows.find((row) => row.running === false) || rows.find((row) => row.running !== false && row.disabled !== true);
  const available = mode !== "unavailable" && Boolean(selected);
  return {
    key: "wan",
    label: "WAN 对象",
    title: available ? clean(selected?.name || selected?.interface, "WAN 对象") : "WAN 对象证据源",
    status: available ? selected?.running === false ? mode === "current" ? "未运行对象" : "历史离线记录" : "运行对象" : "无当前对象证据",
    tone: available && selected?.running === false ? mode === "current" ? "danger" : "warn" : available ? "trust" : "warn",
    note: available ? "对象关系用于下一步检查，不代表业务影响" : "保留对象不进入当前判断",
    relations: available ? [
      { label: "父接口", value: clean(selected?.parent, "未记录") },
      { label: "接入类型", value: clean(selected?.access || selected?.kind, "未记录") },
      { label: "路由后果", value: verification === "offline" ? "没有活动默认路由" : verification === "verified" ? "活动路由仍有记录" : "无法核实" },
    ] : [
      { label: "记录来源", value: "wan / pppoe" },
      { label: "可用性", value: "不用于当前判断" },
    ],
    rows: available ? [
      { key: "wan-source", label: "对象来源", value: Array.isArray(snapshot.wan) && snapshot.wan.length ? "wan" : "pppoe" },
      { key: "wan-disabled", label: "停用标记", value: selected?.disabled === true ? "disabled=true" : "disabled=false" },
      { key: "wan-impact", label: "影响边界", value: "未直接证明业务中断" },
    ] : [],
    disclosureTitle: "展开 WAN 依赖",
    actionTitle: "打开 WAN 原始证据",
  };
}

function collectionInspection(context: FocusContext): MobileNativeInspection {
  const { snapshot, channels, state } = context;
  const selectedName = channels.rest.status !== "current" ? "REST" : channels.ssh.status !== "current" ? "SSH" : "采集";
  const selected = selectedName === "REST" ? channels.rest : selectedName === "SSH" ? channels.ssh : null;
  const target = clean(snapshot.meta?.routerHost || snapshot.meta?.target, "未记录");
  return {
    key: "collection",
    label: "采集通道",
    title: selectedName === "采集" ? "采集证据源" : `${selectedName} 采集通道`,
    status: selected ? "检查错误与时间边界" : "通道记录可用",
    tone: selected ? channelTone(selected) : "trust",
    note: "通道摘要已在信号区；此处只补充来源、时间与错误记录",
    relations: [
      { label: "配置目标", value: target },
      { label: "最近尝试", value: shortTimestamp(snapshot.updatedAt) },
      { label: "明确成功", value: selected?.successAt ? shortTimestamp(selected.successAt) : successfulBusinessLabel(snapshot) },
    ],
    rows: [
      { key: "collection-source", label: "采集来源", value: selectedName === "REST" ? "realtime / slow REST" : selectedName === "SSH" ? "static SSH" : "REST + SSH" },
      { key: "collection-error", label: "错误记录", value: selected?.error ? clean(selected.error) : "未记录", note: selected ? channelAttemptAndSuccessNote(selected) : undefined, tone: selected?.error ? "warn" : "trust" },
      { key: "collection-endpoints", label: "端点记录", value: state.facts.failures.count ? `${state.facts.failures.count} 个失败项` : "未记录", note: "未记录不等于没有故障" },
    ],
    disclosureTitle: "展开通道来源与错误",
    actionTitle: "打开采集原始证据",
  };
}

function resourceInspection(context: FocusContext): MobileNativeInspection {
  const { mode } = context;
  return {
    key: "resource",
    label: "系统资源",
    title: "系统资源",
    status: mode === "current" ? "当前采样对象" : "历史采样对象",
    tone: mode === "current" ? "danger" : "warn",
    note: "当前值只在信号区出现；此处补充来源、策略与影响边界",
    relations: [
      { label: "采样来源", value: "RouterOS resource" },
      { label: "阈值策略", value: "CPU/内存 85% · 磁盘 90%" },
      { label: "影响边界", value: "未证明业务中断" },
    ],
    rows: [
      { key: "resource-series", label: "采样序列", value: "CPU / 内存 / 磁盘" },
      { key: "resource-record", label: "记录位置", value: "overview.history" },
      { key: "resource-consequence", label: "已证实后果", value: "资源策略被触发" },
    ],
    disclosureTitle: "展开资源来源与策略",
    actionTitle: "打开资源原始证据",
  };
}

function interfaceInspection(context: FocusContext): MobileNativeInspection {
  const { snapshot, mode, verification } = context;
  const selected = (snapshot.interfaces || []).find((row) => row.running === false);
  return {
    key: "interface",
    label: "接口依赖",
    title: clean(selected?.name || selected?.interface, "Down 接口"),
    status: mode === "current" ? "依赖链待核对" : "历史依赖记录",
    tone: mode === "current" ? "danger" : "warn",
    note: "接口状态已在信号区；此处补充父级、VLAN、PPPoE 与路由关系",
    relations: [
      { label: "父接口", value: clean(selected?.parent || selected?.master) },
      { label: "VLAN", value: clean(selected?.vlan || selected?.vlanId) },
      { label: "PPPoE", value: clean(selected?.pppoeOut || selected?.pppoe) },
    ],
    rows: [
      { key: "interface-route", label: "默认路由关系", value: verification === "verified" ? "活动路由仍有记录" : verification === "offline" ? "没有活动默认路由" : "无法核实" },
      { key: "interface-source", label: "对象来源", value: "interfaces" },
      { key: "interface-impact", label: "业务影响", value: "未直接证明", note: "依赖与实际影响分别核对" },
    ],
    disclosureTitle: "展开接口依赖",
    actionTitle: "打开接口原始证据",
  };
}

function inspectionFor(risk: MobileRiskKey | null, context: FocusContext): MobileNativeInspection {
  if (risk === "evidence" || risk === "collection") return collectionInspection(context);
  if (risk === "wan-offline") return wanInspection(context);
  if (risk === "resource") return resourceInspection(context);
  if (risk === "interfaces") return interfaceInspection(context);
  return routeInspection(context);
}

function focusCopy(risk: MobileRiskKey | null, context: FocusContext) {
  const { state, mode, verification, channels } = context;
  if (risk === "evidence") return { label: "证据", tone: "danger" as OverviewTone, kicker: "无法建立当前判断", title: "当前业务状态不可判断", summary: "当前没有可用业务快照；WAN、路由、资源和速率不进入当前结论。" };
  if (risk === "wan-offline") return { label: "出口", tone: mode === "current" ? "danger" as OverviewTone : "warn" as OverviewTone, kicker: mode === "current" ? "出口中断" : "历史出口记录", title: mode === "current" ? `全部 ${state.facts.wan.total} 条 WAN 未运行` : `历史记录：${state.facts.wan.total} 条 WAN 曾全部离线`, summary: mode === "current" ? "没有活动默认路由；优先核对链路、认证和上游。" : "当前变化不可见；保留对象只用于恢复核对。" };
  if (risk === "resource") return { label: "资源", tone: mode === "current" ? "danger" as OverviewTone : "warn" as OverviewTone, kicker: mode === "current" ? "持续压力" : "历史资源记录", title: mode === "current" ? "资源策略已触发" : "历史记录：资源曾超过阈值", summary: mode === "current" ? "先核对持续样本与连接压力；出口结论不会由资源值自动推断。" : "保留值不代表当前资源状态。" };
  if (risk === "interfaces") {
    const names = state.facts.interfaces.downNames.slice(0, 2).join(" / ");
    const objects = names
      ? state.facts.interfaces.down > 2 ? `${names} 等 ${state.facts.interfaces.down} 个接口` : names
      : `${state.facts.interfaces.down} 个接口`;
    return { label: "接口", tone: mode === "current" ? "danger" as OverviewTone : "warn" as OverviewTone, kicker: mode === "current" ? "转发对象异常" : "历史接口记录", title: `${mode === "historical" ? "历史记录：" : ""}${objects}未运行`, summary: verification === "verified" ? "活动默认路由仍有记录；接口依赖和业务影响需要分别核对。" : "活动默认路由无法按当前证据核实。" };
  }
  if (risk === "collection") {
    const partial = channels.rest.status === "current" || channels.ssh.status === "current";
    return { label: "采集", tone: "warn" as OverviewTone, kicker: "证据已降级", title: partial ? "采集通道部分可用" : "当前变化不可见", summary: "REST 与 SSH 分别陈述；历史成功记录不能作为当前业务状态。" };
  }
  if (state.scenario === "fleet") return { label: "范围", tone: "trust" as OverviewTone, kicker: "多对象巡检", title: verification === "verified" ? "对象范围已采集，默认路由已核实" : "对象范围已采集，默认路由未核实", summary: "规模仅描述观测范围；一旦出现事故，风险会取代范围成为焦点。" };
  return { label: "路由", tone: verification === "verified" ? "trust" as OverviewTone : "warn" as OverviewTone, kicker: "当前运行判断", title: verification === "verified" ? "网络可用，默认出口已核实" : "WAN 在运行，默认出口未核实", summary: verification === "verified" ? "活动路由、WAN 和采集周期均有当前证据。" : "没有明确 active=true 的默认路由记录。" };
}

function detailKeysFor(risk: MobileRiskKey | null): string[] {
  if (risk === "evidence" || risk === "collection") return ["target", "collection", "boundary"];
  if (risk === "wan-offline") return ["wan", "route", "collection", "boundary"];
  if (risk === "resource") return ["resource", "collection", "boundary"];
  if (risk === "interfaces") return ["interfaces", "route", "boundary"];
  return ["route", "wan", "collection", "boundary"];
}

function focusFor(risk: MobileRiskKey | null, context: FocusContext): MobileNativeFocus {
  const copy = focusCopy(risk, context);
  const key = risk || (context.state.scenario === "fleet" ? "fleet-scope" : "route");
  return {
    key,
    risk,
    label: copy.label,
    tone: copy.tone,
    kicker: copy.kicker,
    title: copy.title,
    summary: copy.summary,
    scope: scopeFor(context),
    proofs: proofFor(risk, context),
    signal: signalFor(risk, context),
    inspection: inspectionFor(risk, context),
    detailSectionKeys: detailKeysFor(risk),
  };
}

export function buildMobileFocuses(context: FocusContext): MobileNativeFocus[] {
  if (!context.risks.length) return [focusFor(null, context)];
  return context.risks.map((risk) => focusFor(risk, context));
}
