import { ChevronRight } from "lucide-react";
import type { RefCallback } from "react";
import type { SectionModel } from "../sections/sectionModels";
import type { WorkspaceRow } from "./mobileDomainWorkspaceModel";
import "./mobile-collection-ledger.css";

interface CollectionContext {
  model: SectionModel;
}

export function MobileWorkspaceObjectList({
  rows,
  selectedId,
  previewId,
  collection,
  onOpen,
  rowRef,
}: {
  rows: WorkspaceRow[];
  selectedId?: string;
  previewId?: string;
  collection?: CollectionContext;
  onOpen: (row: WorkspaceRow) => void;
  rowRef: (id: string) => RefCallback<HTMLButtonElement>;
}) {
  const list = (
    <div className={`mdw-object-list${collection ? " mdw-cl-rows" : ""}`}>
      {rows.map((row) => {
        const selected = selectedId === row.id;
        const previewed = !selected && previewId === row.id;
        const evidence = collection && row.evidence.kind === "interface" ? row.evidence : null;
        const route = evidence?.defaultRoutes[0];
        return (
          <button
            type="button"
            className={selected ? "is-selected" : previewed ? "is-preview" : ""}
            data-mobile-row-id={row.id}
            aria-current={selected ? "true" : undefined}
            onClick={() => onOpen(row)}
            ref={rowRef(row.id)}
            key={row.id}
          >
            <span className={`mdw-row-mark is-${row.meta.state}`} aria-hidden="true" />
            <span className="mdw-row-copy"><b>{row.primary}</b><small>{row.secondary}</small></span>
            <span className={row.meta.attention ? "mdw-row-state is-attention" : "mdw-row-state"}>{row.trailing}</span>
            {evidence ? (
              <span className="mdw-cl-dep">
                <b>{evidence.defaultRouteRelation === "unverified" ? "路由待核对" : `${evidence.defaultRoutes.length} 条默认路由`}</b>
                <small>{route?.gateway ? `网关 ${route.gateway}` : "未记录"}</small>
              </span>
            ) : null}
            <ChevronRight aria-hidden="true" size={17} />
          </button>
        );
      })}
    </div>
  );

  if (!collection) return list;
  return (
    <section>
      {list}
      <section className="mdw-cl-summary" aria-label="采样来源">
        <div><small>采样来源</small><b>{collection.model.tables[0]?.title || collection.model.title}</b></div>
      </section>
    </section>
  );
}
