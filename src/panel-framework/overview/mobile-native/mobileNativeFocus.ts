import {
  formatPercent,
  formatRate,
  type OverviewRawSnapshot,
  type OverviewTone,
} from "../index";
import {
  clean,
  finiteObservation,
  resourceSamples,
  successfulBusinessLabel,
  wanRows,
} from "./mobileNativeEvidence";
import type { MobileFocusContext } from "./mobileNativeContext";
import { buildFocusInspection, buildObjectInspections, downInterfaces, evidenceObjectId, offlineWans } from "./mobileNativeObjects";
import { fleetSignal } from "./mobileNativePresentation";
import type {
  MobileCollectionChannelEvidence,
  MobileNativeFact,
  MobileNativeFocus,
  MobileNativeSignal,
  MobileRiskKey,
  MobileRouteVerification,
} from "./mobileNativeTypes";

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

function rateSignalItem(label: string, rate: number): MobileNativeSignal["items"][number] {
  const formatted = formatRate(rate);
  const splitAt = formatted.lastIndexOf(" ");
  return {
    label,
    value: splitAt > 0 ? formatted.slice(0, splitAt) : formatted,
    unit: splitAt > 0 ? formatted.slice(splitAt + 1) : "",
    tone: "trust",
  };
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

function scopeFor(context: MobileFocusContext): string {
  if (context.state.scenario !== "fleet" && context.snapshot.meta?.scaleScenario !== "fleet") return "";
  const runningInterfaces = Math.max(0, context.state.facts.interfaces.total - context.state.facts.interfaces.down);
  return `多对象范围 · ${context.state.facts.wan.online}/${context.state.facts.wan.total} WAN · ${runningInterfaces}/${context.state.facts.interfaces.total} 接口`;
}

function proofFor(risk: MobileRiskKey | null, context: MobileFocusContext): MobileNativeFact[] {
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

function signalFor(risk: MobileRiskKey | null, context: MobileFocusContext): MobileNativeSignal {
  const { snapshot, state, mode, verification, channels } = context;
  if (risk === "resource") {
    return {
      kind: "resource",
      title: mode === "current" ? "当前资源压力" : "历史资源记录",
      note: mode === "current" ? "CPU/内存 85% · 磁盘 90%" : "历史值 · 非当前状态",
      items: [
        { label: "CPU", value: formatPercent(state.facts.resource.cpu), percent: state.facts.resource.cpu, threshold: 85, tone: mode === "current" ? "danger" : "warn" },
        { label: "内存", value: formatPercent(state.facts.resource.memory), percent: state.facts.resource.memory, threshold: 85, tone: mode === "current" ? "danger" : "warn" },
        { label: "磁盘", value: formatPercent(state.facts.resource.disk), percent: state.facts.resource.disk, threshold: 90, tone: mode === "current" ? "danger" : "warn" },
      ],
    };
  }
  if (risk === "interfaces") {
    const rows = downInterfaces(snapshot);
    return {
      kind: "interfaces",
      title: mode === "current" ? "受影响接口" : "历史接口记录",
      note: `${rows.length} 个 Down 对象`,
      items: rows.map((row, index) => ({
        objectId: evidenceObjectId("interface", clean(row.name || row.interface, `接口 ${index + 1}`), index),
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
      note: "REST / SSH · 独立状态",
      items: [
        { label: "REST", value: channels.rest.label, note: channelSignalNote(channels.rest), tone: channelTone(channels.rest) },
        { label: "SSH", value: channels.ssh.label, note: channelSignalNote(channels.ssh), tone: channelTone(channels.ssh) },
        { label: "失败端点", value: failureCount ? `已记录 ${failureCount}` : "未记录", note: "没有记录不等于没有故障", tone: failureCount ? "warn" : "missing" },
      ],
    };
  }
  if (risk === "wan-offline") {
    const rows = offlineWans(snapshot);
    return {
      kind: "wan",
      title: mode === "current" ? "离线 WAN" : "历史 WAN 记录",
      note: `${rows.length} 条离线链路`,
      items: rows.map((row, index) => ({
        objectId: evidenceObjectId("wan", clean(row.name || row.interface, `WAN ${index + 1}`), index),
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
    note: "下载 / 上传 · 同一采样周期",
    items: [
      rateSignalItem("下载", rates.down),
      rateSignalItem("上传", rates.up),
    ],
  };
  return {
    kind: "availability",
    title: "速率观测",
    note: "当前双向观测不完整",
    items: [
      { label: "下载", value: "未取得", tone: "missing" },
      { label: "上传", value: "未取得", tone: "missing" },
    ],
  };
}

function focusCopy(risk: MobileRiskKey | null, context: MobileFocusContext) {
  const { state, mode, verification, channels } = context;
  if (risk === "evidence") return { label: "证据", tone: "danger" as OverviewTone, kicker: "无法建立当前判断", title: "当前业务状态不可判断", summary: "当前没有可用业务快照；WAN、路由、资源和速率不进入当前结论。" };
  if (risk === "wan-offline") return { label: "出口", tone: mode === "current" ? "danger" as OverviewTone : "warn" as OverviewTone, kicker: mode === "current" ? "出口中断" : "历史出口记录", title: mode === "current" ? `全部 ${state.facts.wan.total} 条 WAN 未运行` : `历史记录：${state.facts.wan.total} 条 WAN 曾全部离线`, summary: mode === "current" ? "没有活动默认路由；优先核对链路、认证和上游。" : "当前变化不可见；保留对象只用于恢复核对。" };
  if (risk === "resource") return { label: "资源", tone: mode === "current" ? "danger" as OverviewTone : "warn" as OverviewTone, kicker: mode === "current" ? "持续压力" : "历史资源记录", title: mode === "current" ? "资源策略已触发" : "历史记录：资源曾超过阈值", summary: mode === "current" ? "先核对持续样本与连接压力；出口结论不会由资源值自动推断。" : "保留值不代表当前资源状态。" };
  if (risk === "interfaces") {
    const count = state.facts.interfaces.down;
    return { label: "接口", tone: mode === "current" ? "danger" as OverviewTone : "warn" as OverviewTone, kicker: mode === "current" ? "转发对象异常" : "历史接口记录", title: `${mode === "historical" ? "历史记录：" : ""}${count} 个接口未运行`, summary: verification === "verified" ? "活动默认路由仍有记录；选择接口核对依赖和影响。" : "活动默认路由无法按当前证据核实。" };
  }
  if (risk === "collection") {
    const partial = channels.rest.status === "current" || channels.ssh.status === "current";
    return { label: "采集", tone: "warn" as OverviewTone, kicker: "证据已降级", title: partial ? "采集通道部分可用" : "当前变化不可见", summary: "REST 与 SSH 分别陈述；历史成功记录不能作为当前业务状态。" };
  }
  if (state.scenario === "fleet") return { label: "范围", tone: "trust" as OverviewTone, kicker: "多对象巡检", title: verification === "verified" ? "对象范围已采集，默认路由已核实" : "对象范围已采集，默认路由未核实", summary: "规模仅描述观测范围；一旦出现事故，风险会取代范围成为焦点。" };
  return { label: "路由", tone: verification === "verified" ? "trust" as OverviewTone : "warn" as OverviewTone, kicker: "当前运行判断", title: verification === "verified" ? "网络可用" : "默认出口待核实", summary: verification === "verified" ? "" : "WAN 有运行记录，但没有明确 active=true 的默认路由。" };
}

function detailKeysFor(risk: MobileRiskKey | null): string[] {
  if (risk === "evidence" || risk === "collection") return ["target", "boundary"];
  if (risk === "wan-offline") return ["route", "collection", "boundary"];
  if (risk === "resource") return ["collection", "boundary"];
  if (risk === "interfaces") return ["route", "boundary"];
  return ["wan", "boundary"];
}

function focusFor(risk: MobileRiskKey | null, context: MobileFocusContext): MobileNativeFocus {
  const copy = focusCopy(risk, context);
  const key = risk || (context.state.scenario === "fleet" ? "fleet-scope" : "route");
  const objectInspections = buildObjectInspections(risk, context);
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
    inspection: objectInspections[0] || buildFocusInspection(risk, context),
    objectInspections,
    detailSectionKeys: detailKeysFor(risk),
  };
}

export function buildMobileFocuses(context: MobileFocusContext): MobileNativeFocus[] {
  if (!context.risks.length) return [focusFor(null, context)];
  return context.risks.map((risk) => focusFor(risk, context));
}
