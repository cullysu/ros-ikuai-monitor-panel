import { formatRfc3339Local } from "../timeContract";
import type { ResourceRowEvidence } from "./sectionRowEvidence";

export function resourceEvidencePresentation(evidence: ResourceRowEvidence) {
  const values = evidence.values;
  const missing = "未取得";
  return {
    current: evidence.latest === null ? missing : `${evidence.latest}%`,
    threshold: evidence.threshold === null ? missing : `${evidence.threshold}%`,
    delta: evidence.delta === null ? missing : `${evidence.delta} 个百分点`,
    continuity: !evidence.sampleCount
      ? missing
      : evidence.trailing >= 2 && evidence.durationSeconds !== null
        ? `${evidence.trailing} / ${evidence.sampleCount} 个样本 · ${evidence.durationSeconds} 秒`
        : evidence.trailing === 1
          ? `1 / ${evidence.sampleCount} 个样本 · 持续时间不可证明`
          : `0 / ${evidence.sampleCount} 个样本 · 最新样本未超阈`,
    evidenceAt: formatRfc3339Local(evidence.evidenceAt) || missing,
    sampleCount: `${evidence.sampleCount} 个`,
    minimum: values.length ? `${Math.min(...values)}%` : missing,
    maximum: values.length ? `${Math.max(...values)}%` : missing,
  };
}
