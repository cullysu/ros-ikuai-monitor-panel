import type { SectionModel } from "../sectionModels";

export type RecoveryState = "partial" | "historical" | "unavailable";

export function missingEvidenceLabels(model: SectionModel): string[] {
  const labels = [
    ...model.tables
      .filter((table) => table.rows.length === 0 && /未取得|不可用/.test(table.empty))
      .map((table) => table.title),
    ...model.metrics
      .filter((metric) => /未取得|不可用/.test(metric.value))
      .map((metric) => metric.label),
  ];
  return [...new Set(labels)];
}

export function sectionRecoveryState(model: SectionModel): RecoveryState | null {
  if (model.evidenceMode === "historical") return "historical";
  if (model.evidenceMode === "unavailable") return "unavailable";
  return missingEvidenceLabels(model).length ? "partial" : null;
}
