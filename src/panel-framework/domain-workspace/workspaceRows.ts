import type { PanelRouteId } from "../routes/panelRoutes";
import { emptySectionRowMeta, type SectionColumn, type SectionModel, type SectionRowMeta } from "../sections/sectionModels";
import { panelObjectIdForValues } from "../sections/panelObjectIdentity";
import { type SectionRowEvidence } from "../sections/sectionRowEvidence";

export interface WorkspaceRow {
  id: string;
  table: string;
  columns: SectionColumn[];
  values: Record<string, string>;
  primary: string;
  secondary: string;
  trailing: string;
  searchText: string;
  meta: SectionRowMeta;
  evidence: SectionRowEvidence;
  duplicateCount: number;
}

const OPERATIONAL_STATUS_LABELS: Record<string, string> = {
  bound: "已绑定",
  disabled: "已停用",
  enabled: "已启用",
  established: "已建立",
  inactive: "未活动",
  offline: "离线",
  online: "在线",
  running: "运行中",
};

export function workspaceStatusLabel(value: string): string {
  const normalized = value.trim().toLowerCase();
  return OPERATIONAL_STATUS_LABELS[normalized] || value;
}

function canonicalValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (value && typeof value === "object") {
    const source = value as Record<string, unknown>;
    return Object.fromEntries(Object.keys(source).sort().map((key) => [key, canonicalValue(source[key])]));
  }
  return value;
}

function hashWithSeed(value: string, seed: number): string {
  let hash = seed;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function stableSignatureHash(value: string): string {
  return `${hashWithSeed(value, 2166136261)}${hashWithSeed(value, 3339675911)}`;
}

interface WorkspaceRowCandidate extends Omit<WorkspaceRow, "id" | "duplicateCount"> {
  baseId: string;
  signature: string;
}

export function rowsFromModel(route: PanelRouteId, model: SectionModel): WorkspaceRow[] {
  const candidates: WorkspaceRowCandidate[] = [];

  model.tables.forEach((table) => {
    table.rows.forEach((values, index) => {
      const meta = table.rowMeta?.[index] || emptySectionRowMeta();
      // Synthetic/raw section fixtures may intentionally have no domain evidence. Keep them explicit as generic rows so the workspace does not invent a typed object or preview recommendation.
      const evidence = table.rowEvidence?.[index] || { kind: "generic", sourceTable: table.title };
      const ordered = table.columns.map((column) => values[column.key] || "—");
      let primary = ordered[0] || "未命名对象";
      let secondary = ordered[1] || table.title;
      const statusColumn = table.columns.find((column) => column.key === "status" || column.key === "topics");
      let trailing = statusColumn ? workspaceStatusLabel(values[statusColumn.key] || "—") : ordered[ordered.length - 1] || "—";

      if (route === "logs" || route === "serviceLogs") {
        primary = values.message || primary;
        secondary = values.time || secondary;
        // RouterOS emits comma-separated topic atoms. Preserve every atom but
        // present them as a scan-friendly operations classification rather
        // than an unprocessed CSV fragment.
        trailing = (values.topics || trailing)
          .split(",")
          .map((topic) => topic.trim())
          .filter(Boolean)
          .join(" · ");
      } else if (route === "connections") {
        primary = values.source || primary;
        secondary = values.target || secondary;
        trailing = values.traffic || trailing;
      } else if (route === "trafficAudit" && table.title === "协议分布") {
        primary = values.protocol || values.source || primary;
        secondary = values.connections ? `${values.connections} 个连接` : values.source || secondary;
        trailing = values.traffic || trailing;
      } else if (route === "trafficAudit") {
        const target = values.target && values.target !== "未记录" ? values.target : "";
        primary = target || values.source || primary;
        secondary = values.connections && values.connections !== "—"
          ? `${values.connections} 个连接`
          : values.source || secondary;
        trailing = values.traffic || trailing;
      } else if (route === "security" && table.title === "防火墙规则") {
        const chain = values.chain && values.chain !== "—" ? values.chain : "";
        const action = values.action && values.action !== "—" ? values.action : "";
        primary = values.comment && !/^(?:—|未记录)$/.test(values.comment)
          ? values.comment
          : [chain, action].filter(Boolean).join(" / ") || primary;
        secondary = [chain, action].filter(Boolean).join(" · ") || secondary;
        trailing = values.order && !/^(?:—|未记录)$/.test(values.order)
          ? `#${values.order}`
          : action || trailing;
      } else if (route === "security" && table.title === "安全告警") {
        primary = values.message || primary;
        secondary = [values.time, values.scope].filter((value) => value && value !== "—").join(" · ") || secondary;
        trailing = values.scope || trailing;
      } else if (route === "dhcp" && table.title === "地址租约") {
        primary = values.host || primary;
        secondary = [values.address, values.mac].filter((value) => value && value !== "—").join(" · ") || secondary;
        trailing = workspaceStatusLabel(values.status || trailing);
      } else if (route === "dhcp" && table.title === "DHCP 客户端") {
        primary = values.interface || primary;
        secondary = values.route && values.route !== "—" ? `默认路由 ${values.route}` : secondary;
        trailing = workspaceStatusLabel(values.status || trailing);
      } else if ((route === "trafficLoad" || route === "loadAudit") && values.series) {
        primary = values.series;
        secondary = values.samples || secondary;
        trailing = values.latest || trailing;
      }

      if (route === "trafficLoad" && evidence.kind === "resource") {
        const thresholdDelta = evidence.delta === null
          ? "阈值差未取得"
          : evidence.delta > 0
            ? `高出阈值 ${evidence.delta} 个百分点`
            : evidence.delta < 0
              ? `低于阈值 ${Math.abs(evidence.delta)} 个百分点`
              : "等于阈值";
        const continuity = evidence.sampleCount > 0
          ? `连续 ${evidence.trailing} / ${evidence.sampleCount}`
          : "连续性未取得";
        secondary = `${thresholdDelta} · ${continuity}`;
      }

      if ((route === "interfaces" || route === "lineStatus") && evidence.kind === "interface") {
        if (evidence.operationalImpact === "risk") trailing = "未运行 · 配置依赖";
        else if (evidence.running === false && evidence.operationalImpact === "unverified") trailing = "未运行 · 影响未判定";
        else if (evidence.operationalReason === "administratively-disabled") trailing = "已停用";
      }

      const baseId = panelObjectIdForValues(route, table.title, values, meta.identityParts);
      const signature = JSON.stringify(canonicalValue({ table: table.title, values, meta, evidence }));
      candidates.push({
        baseId,
        signature,
        table: table.title,
        columns: table.columns,
        values,
        meta,
        evidence,
        primary,
        secondary,
        trailing,
        searchText: [
          table.title,
          primary,
          secondary,
          trailing,
          ...table.columns.map((column) => values[column.key] || ""),
        ].join(" ").toLowerCase(),
      });
    });
  });

  const groups = new Map<string, Map<string, number>>();
  candidates.forEach((candidate) => {
    const signatures = groups.get(candidate.baseId) || new Map<string, number>();
    signatures.set(candidate.signature, (signatures.get(candidate.signature) || 0) + 1);
    groups.set(candidate.baseId, signatures);
  });

  const emitted = new Set<string>();
  const result: WorkspaceRow[] = [];
  candidates.forEach((candidate) => {
    const groupKey = `${candidate.baseId}\u001f${candidate.signature}`;
    if (emitted.has(groupKey)) return;
    emitted.add(groupKey);

    const signatures = groups.get(candidate.baseId) || new Map([[candidate.signature, 1]]);
    const sortedSignatures = [...signatures.keys()].sort();
    const signatureHash = stableSignatureHash(candidate.signature);
    const hashCollisions = sortedSignatures.filter((signature) => stableSignatureHash(signature) === signatureHash);
    const collisionOrdinal = hashCollisions.length > 1 ? `-${hashCollisions.indexOf(candidate.signature) + 1}` : "";
    const id = signatures.size > 1
      ? `${candidate.baseId}-${signatureHash}${collisionOrdinal}`
      : candidate.baseId;

    result.push({
      id,
      table: candidate.table,
      columns: candidate.columns,
      values: candidate.values,
      meta: candidate.meta,
      evidence: candidate.evidence,
      primary: candidate.primary,
      secondary: candidate.secondary,
      trailing: candidate.trailing,
      searchText: candidate.searchText,
      duplicateCount: signatures.get(candidate.signature) || 1,
    });
  });
  return result;
}
