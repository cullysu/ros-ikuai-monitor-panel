import { formatRfc3339LocalTime } from "../../../timeContract";
import type { OverviewEvidenceModel } from "../../evidence-model/overviewEvidenceTypes";
import type { OverviewCollectionChannelState, OverviewDerivedState, OverviewTone } from "../../types";
import type { OpticalPatrolClaim, OpticalPatrolEvidenceItem } from "./opticalPatrolTypes";
import { actionFor, claimId, COLLECTION_ROUTE, evidenceItem } from "./opticalPatrolModelSupport";

function collectionTone(channel: OverviewCollectionChannelState): OverviewTone {
  if (channel.status === "current") return "trust";
  if (channel.status === "degraded") return "warn";
  if (channel.status === "failed") return "danger";
  return "missing";
}

/** The user locale must not decide whether two protocol error records match. */
function collectionRecordKey(value: string): string {
  return value.normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase();
}

function uniqueErrorRecord(error: string): string {
  const seen = new Set<string>();
  const unique = error
    .split(/[；;]+/)
    .map((part) => part.trim().replace(/\s+/g, " "))
    .filter((part) => {
      if (!part) return false;
      const key = collectionRecordKey(part);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  const restEndpoints: string[] = [];
  const remaining = unique.filter((part) => {
    const match = part.match(/^(.+?)\s+REST\s+通道未完成采集$/i);
    if (!match) return true;
    restEndpoints.push(match[1].trim());
    return false;
  });
  if (restEndpoints.length) {
    remaining.unshift(`${restEndpoints.length} 个 REST 端点未完成采集：${restEndpoints.join("、")}`);
  }
  return remaining.join("；");
}

function channelError(channelName: "REST" | "SSH", channel: OverviewCollectionChannelState): string {
  const error = uniqueErrorRecord(channel.error);
  // The shared overview state currently derives its SSH channel from a legacy
  // static-REST field. Do not present that REST failure as SSH evidence.
  return channelName === "SSH" && !/\bssh\b/i.test(error) ? "" : error;
}

function collectionSummary(channelName: "REST" | "SSH", channel: OverviewCollectionChannelState, error: string): string {
  if (error) return `${channelName} 通道已记录异常；详见错误记录。`;
  if (channelName === "SSH" && channel.status === "failed") return "SSH 采集失败；未记录 SSH 专属错误。";
  if (channel.status === "unavailable") return `${channelName} 通道未记录。`;
  return `${channelName} 通道状态来自独立采集记录。`;
}

function collectionClaim(
  evidence: OverviewEvidenceModel,
  channelName: "REST" | "SSH",
  channel: OverviewCollectionChannelState,
): OpticalPatrolClaim {
  const key = channelName === "REST" ? "rest" : "ssh";
  const objectId = `collection:${key}`;
  const tone = collectionTone(channel);
  const error = channelError(channelName, channel);
  const items: OpticalPatrolEvidenceItem[] = [
    evidenceItem("channel-state", "通道状态", channel.label, `meta.${key}`, evidence.evidenceMode, tone),
  ];
  if (error) items.push(evidenceItem("channel-error", "错误记录", error, `meta.${key}.error`, evidence.evidenceMode, tone));
  if (channelName === "SSH" && channel.status === "failed" && !error) {
    items.push(evidenceItem("channel-error", "错误记录", "未记录 SSH 专属错误", `meta.${key}.error`, evidence.evidenceMode, tone));
  }
  if (channel.successAt) {
    items.push(evidenceItem("last-success", "最近成功", formatRfc3339LocalTime(channel.successAt) || "时间格式无效", `meta.${key}.successAt`, "historical", "trust", {
      observedAt: channel.successAt,
    }));
  }
  return {
    id: claimId(objectId),
    kind: "collection",
    priority: "follow-up",
    objectId,
    category: "采集通道",
    title: channelName,
    state: channel.label,
    summary: collectionSummary(channelName, channel, error),
    tone,
    source: `meta.${key}`,
    observedAt: channel.successAt || null,
    evidenceMode: evidence.evidenceMode,
    evidence: items,
    measurements: [],
    relationship: null,
    action: actionFor(evidence, "collection", COLLECTION_ROUTE, objectId),
    forbiddenConclusion: "不得由管理或采集通道状态推断当前业务可用性",
  };
}

export function collectionClaims(evidence: OverviewEvidenceModel, state: OverviewDerivedState): OpticalPatrolClaim[] {
  return [
    collectionClaim(evidence, "REST", state.facts.collection.rest),
    collectionClaim(evidence, "SSH", state.facts.collection.ssh),
  ];
}

export function evidenceLossClaim(evidence: OverviewEvidenceModel): OpticalPatrolClaim {
  const objectId = "evidence:current-snapshot";
  return {
    id: claimId(objectId),
    kind: "evidence",
    priority: "follow-up",
    objectId,
    category: "证据边界",
    title: "当前快照不可用",
    state: evidence.evidenceLabel,
    summary: evidence.evidenceNote,
    tone: evidence.evidenceTone,
    source: "overview evidence boundary",
    observedAt: evidence.evidenceAt,
    evidenceMode: evidence.evidenceMode,
    evidence: evidence.evidenceRows.length
      ? evidence.evidenceRows.map((row) => evidenceItem(row.key, row.label, row.value, "overview.evidenceRows", evidence.evidenceMode, row.tone, { note: row.note }))
      : [evidenceItem("current-boundary", "当前值", null, "overview evidence boundary", evidence.evidenceMode, "missing")],
    measurements: [],
    relationship: null,
    action: actionFor(evidence, "evidence", COLLECTION_ROUTE, objectId),
    forbiddenConclusion: "不得展示速率、资源、接口或路由的未观测当前值",
  };
}
