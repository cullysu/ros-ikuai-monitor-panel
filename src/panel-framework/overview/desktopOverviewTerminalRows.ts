import {
  compactListText,
  formatCompact,
  formatNumber,
  formatPercent,
  formatRate,
  toNumber,
  type OverviewDerivedState,
  type OverviewRawSnapshot,
  type OverviewRawWanRow,
  type OverviewTone,
} from "./index";
import {
  type ChartDatum,
  type LedgerRow,
  FILLER_TONE,
  ROUTE_UNKNOWN,
  businessErrorNote,
  collectInterfaceRows,
  collectWanRows,
  failureText,
  latestSuccess,
  ledgerCellText,
  moduleTrust,
  pollText,
  restState,
  routeBusinessText,
  routeLabelText,
  routerosState,
  sshState,
  statusUpdated,
  text,
} from "./desktopOverviewHelpers";
import { buildRouterOsRouteEvidenceModel } from "./routerosEvidenceModel";

export function compactRows(rows: LedgerRow[], count: number): LedgerRow[] {
  return rows.slice(0, count);
}

export function desktopRecordRows(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null) : [];
}

export function desktopNumber(value: unknown): number {
  const number = toNumber(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
}

export function desktopFirstText(row: Record<string, unknown>, keys: string[], fallback = "-"): string {
  for (const key of keys) {
    const value = text(row[key], "");
    if (value) return value;
  }
  return fallback;
}

export function desktopRate(value: number): string {
  return value > 0 ? formatRate(value).replace(/\s+/g, "") : "未采集";
}

export function desktopTerminalRows(snapshot: OverviewRawSnapshot): LedgerRow[] {
  const raw = snapshot as unknown as Record<string, unknown>;
  const connections = typeof raw.connections === "object" && raw.connections !== null ? raw.connections as Record<string, unknown> : {};
  const sources = [raw.terminals, raw.clients, raw.devices, connections.topTerminals, connections.topClients, connections.topIps];
  const rows = sources.map(desktopRecordRows).find((items) => items.length) || [];
  if (!rows.length) return [{ id: "terminal-empty", cells: ["终端 01", "IP 未记录", "等待流量样本"], tone: "missing" }];
  return rows
    .map((row, index) => {
      const ip = desktopFirstText(row, ["ip", "address", "host", "clientIp", "srcAddress"], "IP 未记录");
      const rawName = desktopFirstText(row, ["name", "deviceName", "hostname", "hostName", "label", "mac"], "");
      const down = desktopNumber(row.downRate ?? row.downloadRate ?? row.rxRate ?? row.download ?? row.down ?? row.bytesDown ?? row.rxBytes);
      const up = desktopNumber(row.upRate ?? row.uploadRate ?? row.txRate ?? row.upload ?? row.up ?? row.bytesUp ?? row.txBytes);
      const total = desktopNumber(row.totalRate ?? row.rate ?? row.traffic ?? row.bytes ?? row.total ?? row.value) || down + up;
      const rawStatus = desktopFirstText(row, ["status", "state", "health", "online"], "online").toLowerCase();
      const abnormal = /offline|down|error|blocked|abnormal|false|异常|离线|阻断/.test(rawStatus);
      return {
        id: `terminal-${index}`,
        cells: [rawName && rawName !== ip ? rawName : `终端 ${String(index + 1).padStart(2, "0")}`, ip, `${desktopRate(down)} ↓ / ${desktopRate(up)} ↑`, abnormal ? "异常" : "在线"],
        tone: abnormal ? "danger" : "trust",
        title: String(total),
      } satisfies LedgerRow;
    })
    .sort((a, b) => (b.tone === "danger" ? 1 : 0) - (a.tone === "danger" ? 1 : 0) || Number(b.title || 0) - Number(a.title || 0))
    .slice(0, 5);
}
