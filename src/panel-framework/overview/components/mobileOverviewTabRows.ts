import {
  formatRate,
  type OverviewDerivedState,
  type OverviewRawSnapshot,
  type OverviewTone,
} from "../index";
import type { MobileOverviewModel } from "../mobileOverviewModel";

export interface MobileTabRow {
  id: string;
  label: string;
  value: string;
  note: string;
  tone: OverviewTone;
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

function text(value: unknown, fallback = "未记录"): string {
  const normalized = String(value ?? "").trim();
  return normalized || fallback;
}

function number(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function mobileWanRows(model: MobileOverviewModel): MobileTabRow[] {
  return model.wanPorts.slice(0, 8).map((port) => ({
    id: port.id,
    label: port.name,
    value: port.stateText,
    note: `${port.roleLabel} · ${port.carrier || port.note}`,
    tone: port.tone,
  }));
}

export function mobileInterfaceRows(snapshot: OverviewRawSnapshot): MobileTabRow[] {
  const rows = Array.isArray(snapshot.interfaces) ? snapshot.interfaces : [];
  return rows.slice(0, 8).map((item, index) => {
    const name = text(item.name || item.interface, `接口 ${index + 1}`);
    const running = item.running !== false && item.disabled !== true;
    const carrier = text(item.parent || item.master || item.bridge || item.pppoeOut || item.pppoe, "独立接口");
    const rate = number(item.rxRate ?? item.downRate) + number(item.txRate ?? item.upRate);
    return {
      id: `${name}-${index}`,
      label: name,
      value: running ? "运行" : "Down",
      note: `${text(item.type || item.role, "接口")} · ${carrier}${rate > 0 ? ` · ${formatRate(rate)}` : ""}`,
      tone: running ? "trust" : "danger",
    };
  });
}

export function mobileTerminalRows(snapshot: OverviewRawSnapshot): MobileTabRow[] {
  const source = Array.isArray(snapshot.terminals) && snapshot.terminals.length > 0
    ? snapshot.terminals
    : Array.isArray(snapshot.connections?.topIps)
      ? snapshot.connections.topIps
      : [];
  return source.slice(0, 8).map((item, index) => {
    const value = record(item);
    const address = text(value.ip || value.address || value.host, `终端 ${index + 1}`);
    const name = text(value.name || value.hostname || value.device, address);
    const rate = number(value.rate ?? value.bytes ?? value.traffic ?? value.value);
    return {
      id: `${address}-${index}`,
      label: name,
      value: rate > 0 ? formatRate(rate) : "在线",
      note: address === name ? "连接记录" : address,
      tone: "trust",
    };
  });
}

export function mobileLogRows(model: MobileOverviewModel, state: OverviewDerivedState): MobileTabRow[] {
  const channels = model.collectionTrust.map((channel, index) => ({
    id: `channel-${index}`,
    label: channel.label,
    value: channel.value,
    note: "只读采集通道",
    tone: channel.tone,
  }));
  const failures = state.facts.failures.entries.slice(0, 5).map((entry, index) => ({
    id: `failure-${index}`,
    label: text(entry.name || entry.group, "采集失败"),
    value: "需确认",
    note: text(entry.message || entry.at, "未记录详情"),
    tone: "warn" as OverviewTone,
  }));
  return [...channels, ...failures].slice(0, 8);
}
