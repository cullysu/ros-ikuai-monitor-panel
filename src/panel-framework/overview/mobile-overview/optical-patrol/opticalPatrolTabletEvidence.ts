import type { OverviewEvidenceModel } from "../../evidence-model/overviewEvidenceTypes";
import type { OpticalPatrolClaim, OpticalPatrolEvidenceItem, OpticalPatrolTabletEvidenceGroup } from "./opticalPatrolTypes";
import { evidenceItem } from "./opticalPatrolModelSupport";

function relationshipItem(claim: OpticalPatrolClaim): OpticalPatrolEvidenceItem | null {
  if (!claim.relationship) return null;
  return evidenceItem(
    `relationship:${claim.id}`,
    claim.relationship.label,
    claim.relationship.value,
    claim.relationship.source,
    claim.relationship.evidenceMode,
    claim.relationship.tone,
    { observedAt: claim.relationship.observedAt },
  );
}

function evidenceModeLabel(mode: OpticalPatrolClaim["evidenceMode"]): string {
  if (mode === "current") return "当前证据";
  if (mode === "historical") return "历史证据";
  return "证据不可用";
}

function sourceEvidence(evidence: OverviewEvidenceModel, claims: OpticalPatrolClaim[]): OpticalPatrolEvidenceItem[] {
  const items = evidence.evidenceRows.map((row) =>
    evidenceItem(`boundary:${row.key}`, row.label, row.value, "概览证据记录", evidence.evidenceMode, row.tone, { note: row.note }),
  );
  claims.slice(0, 6).forEach((claim) => {
    if (claim.kind === "resource") {
      const measurement = claim.measurements.find((item) => item.key === "resource-current");
      if (measurement?.sampleCount !== null && measurement?.sampleCount !== undefined) {
        items.push(evidenceItem(
          `sample-count:${claim.id}`,
          `${claim.title}样本量`,
          `${measurement.sampleCount} 个样本`,
          measurement.source,
          claim.evidenceMode,
          measurement.tone,
        ));
      }
      if (measurement?.windowLabel) {
        items.push(evidenceItem(
          `sample-window:${claim.id}`,
          `${claim.title}观察窗口`,
          measurement.windowLabel,
          measurement.source,
          claim.evidenceMode,
          measurement.tone,
        ));
      }
      return;
    }
    if (!items.some((item) => item.key === `source:${claim.id}`)) {
      items.push(evidenceItem(`source:${claim.id}`, `${claim.title}来源`, claim.source, "巡检断言来源", claim.evidenceMode, claim.tone, {
        observedAt: claim.observedAt,
      }));
    }
    items.push(evidenceItem(
      `mode:${claim.id}`,
      `${claim.title}证据模式`,
      evidenceModeLabel(claim.evidenceMode),
      "巡检证据边界",
      claim.evidenceMode,
      claim.tone,
    ));
  });
  return items;
}

function relationshipEvidence(claims: OpticalPatrolClaim[]): OpticalPatrolEvidenceItem[] {
  const items: OpticalPatrolEvidenceItem[] = [];
  claims.slice(0, 6).forEach((claim) => {
    if (claim.kind === "resource") {
      const delta = claim.measurements.find((item) => item.key === "resource-delta");
      const trailing = claim.measurements.find((item) => item.key === "resource-trailing");
      if (delta?.value !== null && delta?.value !== undefined) {
        items.push(evidenceItem(
          `resource-delta:${claim.id}`,
          `${claim.title}阈值差`,
          `${delta.value >= 0 ? "+" : ""}${delta.value} ${delta.unit}`,
          delta.source,
          claim.evidenceMode,
          delta.tone,
        ));
      }
      if (trailing?.value !== null && trailing?.value !== undefined) {
        items.push(evidenceItem(
          `resource-trailing:${claim.id}`,
          `${claim.title}连续性`,
          `末尾 ${trailing.value}/${trailing.sampleCount ?? "?"} 个样本越阈`,
          trailing.source,
          claim.evidenceMode,
          trailing.tone,
        ));
      }
      return;
    }
    const relationship = relationshipItem(claim);
    if (relationship) items.push(relationship);
    if (!items.some((item) => item.key === `object-state:${claim.id}`)) {
      items.push(evidenceItem(`object-state:${claim.id}`, claim.title, claim.state, claim.source, claim.evidenceMode, claim.tone, {
        observedAt: claim.observedAt,
      }));
    }
    claim.evidence
      .filter((item) => item.value !== null && String(item.value) !== claim.state && !/^来源$/.test(item.label))
      .slice(0, 2)
      .forEach((item) => items.push({
        ...item,
        key: `object-proof:${claim.id}:${item.key}`,
        label: `${claim.title}${item.label}`,
      }));
    items.push(evidenceItem(
      `object-boundary:${claim.id}`,
      `${claim.title}判断边界`,
      claim.forbiddenConclusion,
      "只读判断边界",
      claim.evidenceMode,
      claim.tone,
    ));
    items.push(evidenceItem(
      `object-action:${claim.id}`,
      `${claim.title}检查入口`,
      claim.action.label,
      "只读对象入口",
      claim.evidenceMode,
      claim.tone,
    ));
  });
  return items;
}

export function tabletEvidenceGroups(evidence: OverviewEvidenceModel, claims: OpticalPatrolClaim[]): OpticalPatrolTabletEvidenceGroup[] {
  const primary = claims[0];
  const secondaryClaims = claims.slice(1);
  const sourceItems = sourceEvidence(evidence, secondaryClaims);
  const groups: OpticalPatrolTabletEvidenceGroup[] = [
    {
      id: "sources-and-boundaries",
      label: "采样与来源",
      summary: "主断言之外的采集来源和只读边界。",
      claimIds: secondaryClaims.map((claim) => claim.id),
      items: sourceItems,
    },
  ];
  const relationships = relationshipEvidence(secondaryClaims);
  if (relationships.length) {
    groups.push({
      id: "object-relationships",
      label: "关系与边界",
      summary: "次级对象与当前判断不同层级的关系、限制和检查入口。",
      claimIds: secondaryClaims.map((claim) => claim.id),
      items: relationships,
    });
  }
  if (!sourceItems.length && primary) groups[0] = {
    ...groups[0],
    claimIds: [primary.id],
    items: evidence.evidenceRows.map((row) => evidenceItem(
      `boundary:${row.key}`,
      row.label,
      row.value,
      "概览证据记录",
      evidence.evidenceMode,
      row.tone,
      { note: row.note },
    )),
  };
  return groups;
}
