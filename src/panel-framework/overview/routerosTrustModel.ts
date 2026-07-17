import {
  formatNumber,
  shortTimestamp,
  type OverviewDerivedState,
  type OverviewRawSnapshot,
  type OverviewRawWanRow,
  type OverviewTone,
} from "./index";

export type RouterOsTrustPlaneId = "forwarding" | "collection" | "snapshot" | "business";

export interface RouterOsTrustPlane {
  id: RouterOsTrustPlaneId;
  label: string;
  value: string;
  note: string;
  tone: OverviewTone;
}

export interface RouterOsTrustModel {
  planes: RouterOsTrustPlane[];
  forwarding: RouterOsTrustPlane;
  collection: RouterOsTrustPlane;
  snapshot: RouterOsTrustPlane;
  business: RouterOsTrustPlane;
}

function clean(value: unknown, fallback = "-"): string {
  const normalized = String(value ?? "").replace(/\s+/g, " ").trim();
  return normalized || fallback;
}

function wanRows(snapshot: OverviewRawSnapshot): OverviewRawWanRow[] {
  if (Array.isArray(snapshot.wan) && snapshot.wan.length) return snapshot.wan;
  return Array.isArray(snapshot.pppoe) ? snapshot.pppoe : [];
}

function twoDigit(value: number): string {
  return String(value).padStart(2, "0");
}

function mobileTime(raw: unknown): string {
  const source = String(raw ?? "").trim();
  if (!source) return "未记录";
  const numeric = typeof raw === "number" || /^\d+$/.test(source) ? Number(raw) : Number.NaN;
  const date = Number.isFinite(numeric)
    ? new Date(numeric < 1_000_000_000_000 ? numeric * 1000 : numeric)
    : new Date(source);
  if (Number.isNaN(date.getTime())) {
    const fallback = shortTimestamp(raw);
    return fallback && !/\d{4}-\d{2}-\d{2}T/.test(fallback) ? fallback : "未记录";
  }
  const now = new Date();
  const time = `${twoDigit(date.getHours())}:${twoDigit(date.getMinutes())}`;
  if (date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate()) return time;
  return `${twoDigit(date.getMonth() + 1)}-${twoDigit(date.getDate())} ${time}`;
}

function latestSuccess(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): string {
  const meta = snapshot.meta || {};
  const raw = state.scenario === "no-snapshot"
    ? meta.staticUpdatedAt || meta.realtimeUpdatedAt || snapshot.updatedAt
    : snapshot.updatedAt || meta.realtimeUpdatedAt || meta.staticUpdatedAt || meta.slowRestUpdatedAt;
  return mobileTime(raw);
}

function stripRest(label: string): string {
  return clean(label.replace(/^REST\s*/i, ""), "可用");
}

function stripSsh(label: string): string {
  return clean(label.replace(/^SSH\s*/i, ""), "可用");
}

function snapshotTrustText(state: OverviewDerivedState): string {
  if (state.scenario === "no-snapshot") return "缺失";
  if (state.scenario === "collection-down" || state.facts.collection.dataStale || state.facts.freshness.history) return "缓存";
  return "实时";
}

export function buildRouterOsTrustModel(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): RouterOsTrustModel {
  const totalWan = state.facts.wan.total;
  const noSnapshot = state.scenario === "no-snapshot";
  const forwardingUnknown = noSnapshot ||
    !state.facts.wan.available ||
    state.facts.wan.unknown > 0 ||
    !state.facts.interfaces.available ||
    state.facts.interfaces.unknown > 0;
  const routeUnknown = !state.facts.route.verified;
  const forwarding: RouterOsTrustPlane = {
    id: "forwarding",
    label: "转发面",
    value: forwardingUnknown
      ? "不可判"
      : state.facts.wan.allOffline
        ? "不可用"
        : state.facts.interfaces.down > 0 || routeUnknown
          ? "待确认"
          : "可用",
    note: forwardingUnknown
      ? state.facts.collection.businessEvidenceText
      : state.facts.wan.allOffline
        ? `WAN 0/${formatNumber(totalWan)}`
        : routeUnknown
          ? "默认路由未核实"
          : `WAN ${formatNumber(state.facts.wan.online)}/${formatNumber(totalWan)}`,
    tone: forwardingUnknown
      ? "missing"
      : state.facts.wan.allOffline
        ? "danger"
        : state.facts.interfaces.down > 0 || routeUnknown
          ? "warn"
          : "ok",
  };
  const collection: RouterOsTrustPlane = {
    id: "collection",
    label: "采集面",
    value: state.scenario === "collection-down" ? "降级" : state.scenario === "no-snapshot" ? "断链" : "可达",
    note: `${stripRest(state.facts.collection.restLabel)} / ${stripSsh(state.facts.collection.sshLabel)}`,
    tone: state.scenario === "no-snapshot" ? "danger" : state.scenario === "collection-down" ? "warn" : state.facts.collection.level,
  };
  const snapshotPlane: RouterOsTrustPlane = {
    id: "snapshot",
    label: "快照面",
    value: state.scenario === "no-snapshot" ? "缺失" : snapshotTrustText(state),
    note: latestSuccess(snapshot, state),
    tone: state.scenario === "no-snapshot" ? "missing" : state.facts.collection.credibilityTone,
  };
  const business: RouterOsTrustPlane = {
    id: "business",
    label: "业务面",
    value: noSnapshot || forwardingUnknown ? "不可判" : state.facts.wan.allOffline ? "出口中断" : "未独立测量",
    note: noSnapshot
      ? "无快照"
      : forwardingUnknown
        ? "转发对象证据不完整"
        : state.facts.wan.allOffline
          ? "只证明出口对象未运行"
          : "不由管理面与转发面推断终端业务",
    tone: state.facts.wan.allOffline && !forwardingUnknown ? "danger" : "missing",
  };
  return {
    forwarding,
    collection,
    snapshot: snapshotPlane,
    business,
    planes: [forwarding, collection, snapshotPlane, business],
  };
}
