import { useEffect, useState } from "react";
import type { OverviewComparisonObject } from "../overview/evidence-model/overviewEvidenceTypes";

export function useMobileComparisonSelection(
  objects: OverviewComparisonObject[],
  enabled: boolean,
): [string, (objectId: string) => void] {
  const [selectedId, setSelectedId] = useState("");

  useEffect(() => {
    if (!enabled) return;
    setSelectedId((current) => objects.some((object) => object.id === current) ? current : objects[0]?.id || "");
  }, [enabled, objects]);

  return [selectedId, setSelectedId];
}
