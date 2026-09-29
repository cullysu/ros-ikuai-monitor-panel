import type { PanelRouteId } from "../../routes/panelRoutes";
import { panelObjectIdentityPartsForRaw, stablePanelObjectId } from "../../sections/panelObjectIdentity";
import { formatRate, toFiniteNumber } from "../deriveOverviewState";
import type {
  OverviewRawInterfaceRow,
  OverviewRawSnapshot,
  OverviewRawWanRow,
  OverviewTone,
} from "../types";
import type { OverviewComparisonObject } from "./overviewEvidenceTypes";

function clean(value: unknown, fallback = "未记录"): string {
  const normalized = String(value ?? "").replace(/\s+/g, " ").trim();
  return normalized || fallback;
}

function rateEvidence(downValue: unknown, upValue: unknown): string {
  const down = toFiniteNumber(downValue);
  const up = toFiniteNumber(upValue);
  if (down === null || up === null) return "速率未记录";
  return `下 ${formatRate(down)} · 上 ${formatRate(up)}`;
}

function stateOf(row: { disabled?: boolean; running?: boolean }): { label: string; tone: OverviewTone } {
  if (row.disabled === true) return { label: "已停用", tone: "missing" };
  if (row.running === false) return { label: "未运行 · 影响未判定", tone: "warn" };
  if (row.running === true) return { label: "运行", tone: "trust" };
  return { label: "状态未记录", tone: "missing" };
}

function comparisonObject(
  route: PanelRouteId,
  kind: "wan" | "interface",
  label: string,
  row: OverviewRawWanRow | OverviewRawInterfaceRow,
  index: number,
  source: string,
  evidence: string,
): OverviewComparisonObject {
  const targetObjectId = stablePanelObjectId(
    route,
    kind,
    panelObjectIdentityPartsForRaw(route, label, row),
  );
  const state = stateOf(row);
  return {
    id: targetObjectId,
    category: kind === "wan" ? "WAN" : "接口",
    object: clean(row.name || row.interface, `${label} ${index + 1}`),
    state: state.label,
    evidence,
    source,
    tone: state.tone,
    route,
    targetObjectId,
  };
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function compareObjects(left: OverviewComparisonObject, right: OverviewComparisonObject): number {
  const categoryDifference = (left.category === "WAN" ? 0 : 1) - (right.category === "WAN" ? 0 : 1);
  if (categoryDifference) return categoryDifference;
  return compareText(left.object.toLowerCase(), right.object.toLowerCase()) ||
    compareText(left.targetObjectId || left.id, right.targetObjectId || right.id) ||
    compareText(left.evidence, right.evidence) ||
    compareText(left.source, right.source);
}

export function buildOverviewComparisonObjects(snapshot: OverviewRawSnapshot): OverviewComparisonObject[] {
  const hasWanRows = Array.isArray(snapshot.wan) && snapshot.wan.length > 0;
  const wanRows = hasWanRows ? snapshot.wan! : Array.isArray(snapshot.pppoe) ? snapshot.pppoe : [];
  const wans = wanRows.map((row, index) => comparisonObject(
    "lineStatus",
    "wan",
    "WAN 对象",
    row,
    index,
    `${hasWanRows ? "wan" : "pppoe"}[${index}]`,
    `${clean(row.parent, "父接口未记录")} · ${rateEvidence(row.downRate, row.upRate)}`,
  ));
  const interfaces = (Array.isArray(snapshot.interfaces) ? snapshot.interfaces : [])
    .map((row, index) => comparisonObject(
      "interfaces",
      "interface",
      "接口对象",
      row,
      index,
      `interfaces[${index}]`,
      `${clean(row.bridge || row.parent || row.master, "关系未记录")} · ${rateEvidence(row.downRate ?? row.rxRate, row.upRate ?? row.txRate)}`,
    ));
  return [...wans, ...interfaces].sort(compareObjects);
}
