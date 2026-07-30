import { ChevronRight } from "lucide-react";
import type { WorkspaceRow } from "../mobileDomainWorkspaceModel";
import { InspectorSection } from "./InspectorPrimitives";

export function RelatedObjectRail({
  rows,
  onOpen,
}: {
  rows: WorkspaceRow[];
  onOpen: (row: WorkspaceRow) => void;
}) {
  if (!rows.length) return null;
  return (
    <InspectorSection title="相关对象" note="同一工作区的其他对象">
      <div className="mdi-relations mdi-related-object-list" data-mobile-related-object-rail role="list">
        {rows.slice(0, 4).map((item) => (
          <div role="listitem" key={item.id}>
            <button
              type="button"
              data-mobile-related-object={item.id}
              aria-label={`打开相关对象 ${item.primary}`}
              onClick={() => onOpen(item)}
            >
              <span><b>{item.primary}</b><small>{item.secondary}</small></span>
              <em>{item.trailing}</em>
              <ChevronRight aria-hidden="true" size={16} />
            </button>
          </div>
        ))}
      </div>
    </InspectorSection>
  );
}
