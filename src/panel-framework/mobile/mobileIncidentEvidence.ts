import type { OverviewPriorityObject } from "../overview/evidence-model/overviewEvidenceTypes";

export function novelIncidentAttributes(object: OverviewPriorityObject) {
  const summary = new Set([object.name, object.state, object.reason].filter(Boolean));
  return object.attributes.filter(({ value }) => {
    const normalized = value.trim();
    return Boolean(normalized) && !summary.has(normalized);
  });
}
