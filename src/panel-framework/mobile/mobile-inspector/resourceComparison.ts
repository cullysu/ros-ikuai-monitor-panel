import type { ResourceRowEvidence } from "../../sections/sectionRowEvidence";
import type { WorkspaceRow } from "../mobileDomainWorkspaceModel";

export function resourceRelativeStatus(selectedLatest: number | null, relatedLatest: number | null): string {
  if (selectedLatest === null || relatedLatest === null) return "相对值不可比较";
  const delta = relatedLatest - selectedLatest;
  if (delta === 0) return "与当前对象同值";
  return delta > 0
    ? `较当前对象高 ${delta} 个百分点`
    : `较当前对象低 ${Math.abs(delta)} 个百分点`;
}

export function resourceComparisonRows(selected: ResourceRowEvidence, rows: WorkspaceRow[]) {
  return rows
    .filter((row) => row.evidence.kind === "resource")
    .slice(0, 4)
    .map((row) => {
      const evidence = row.evidence as ResourceRowEvidence;
      return {
        primary: row.primary,
        secondary: row.secondary,
        status: resourceRelativeStatus(selected.latest, evidence.latest),
        tone: row.meta.attention ? "warn" as const : "neutral" as const,
      };
    });
}
