import {
  latestBusinessSuccessTime,
  shortTimestamp,
  type OverviewDerivedState,
  type OverviewRawSnapshot,
} from "../index";
import type {
  OverviewEvidenceRisk,
  OverviewScenarioFocus,
} from "./overviewEvidenceTypes";

function clean(value: unknown, fallback = "未记录"): string {
  const normalized = String(value ?? "").replace(/\s+/g, " ").trim();
  return normalized || fallback;
}

export function buildOverviewScenarioFocus(
  snapshot: OverviewRawSnapshot,
  state: OverviewDerivedState,
  risk: OverviewEvidenceRisk,
): OverviewScenarioFocus | null {
  const success = latestBusinessSuccessTime(snapshot);
  const successLabel = success ? shortTimestamp(success) : "未记录";
  const rest = state.facts.collection.rest;
  const ssh = state.facts.collection.ssh;
  const currentChannels = (rest.status === "current" ? 1 : 0) + (ssh.status === "current" ? 1 : 0);

  if (risk === "evidence") {
    const target = clean(snapshot.meta?.routerHost || snapshot.meta?.target || snapshot.meta?.configuredIdentity);
    return {
      kind: "coverage",
      label: "判断范围",
      title: "当前可判断范围",
      summary: "设备身份来自配置；当前网络数字全部撤回。",
      items: [
        { key: "target", label: "设备目标", value: target, note: "身份独立于运行快照", tone: target === "未记录" ? "missing" : "trust", route: "readonlyDiagnostics", actionable: true },
        { key: "current-withheld", label: "当前网络数字", value: "全部撤回", note: "速率、接口与路由不可作为当前证据", tone: "danger", route: "readonlyDiagnostics", actionable: false },
        { key: "history", label: "历史参考", value: successLabel, note: success ? "仅用于定位最后成功" : "没有可用成功时间", tone: success ? "warn" : "missing", route: "logs", actionable: true },
      ],
    };
  }

  if (risk === "collection") {
    return {
      kind: "planes",
      label: "故障边界",
      title: "四个平面的当前边界",
      summary: "采集失败不能推出转发或业务中断。",
      items: [
        {
          key: "management",
          label: "管理连接",
          value: currentChannels ? `${currentChannels} / 2 可确认` : "当前不可确认",
          note: `REST ${rest.label} · SSH ${ssh.label}`,
          tone: currentChannels ? "warn" : "danger",
          route: "readonlyDiagnostics",
          actionable: true,
        },
        {
          key: "collection",
          label: "采集链路",
          value: currentChannels === 2 ? "当前完整" : currentChannels ? "部分恢复" : "当前中断",
          note: currentChannels === 2 ? "仍有其他降级证据" : "快照无法完整刷新",
          tone: currentChannels === 2 ? "warn" : currentChannels ? "warn" : "danger",
          route: "readonlyDiagnostics",
          actionable: false,
        },
        { key: "forwarding", label: "转发状态", value: "当前不可确认", note: success ? `最后快照 ${successLabel}` : "没有可用当前快照", tone: "missing", route: "lineStatus", actionable: true },
        { key: "business", label: "外部业务", value: "未探测", note: "不由管理连接推断", tone: "missing", route: "readonlyDiagnostics", actionable: false },
      ],
    };
  }

  if (risk === "wan") {
    return {
      kind: "outage",
      label: "恢复证据",
      title: "何时可以判定恢复",
      summary: "这里只补充历史参考与恢复条件，不重复当前事故范围。",
      items: [
        { key: "last-success", label: "最后成功", value: successLabel, note: success ? "仅作恢复前参考" : "没有可用成功时间", tone: success ? "warn" : "missing", route: "logs", actionable: false },
        { key: "recovery", label: "恢复判据", value: "等待验证", note: "WAN 运行 + 活动默认路由", tone: "warn", route: "lineStatus", actionable: false },
      ],
    };
  }

  return null;
}
