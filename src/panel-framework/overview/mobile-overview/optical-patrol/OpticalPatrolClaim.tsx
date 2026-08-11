import { ArrowUpRight, ChevronDown, ChevronUp } from "lucide-react";
import { useId, useState } from "react";
import type { OpticalPatrolModel } from "./opticalPatrolTypes";
import { OpticalPatrolClaimGeometry, OpticalPatrolClaimIcon, opticalPatrolFollowupSummary } from "./OpticalPatrolClaimGeometry";
import { opticalPatrolClaimDomId } from "./useOpticalPatrolSelectionHistory";

type Claim = OpticalPatrolModel["claims"][number];
type ClaimAction = Claim["action"];

function OpticalPatrolFollowupButton({
  claim,
  onSelect,
  overflow = false,
}: {
  claim: Claim;
  onSelect: (id: string) => void;
  overflow?: boolean;
}) {
  return (
    <button
      type="button"
      className="op__followup"
      data-optical-patrol-claim-control
      data-optical-patrol-claim-id={claim.id}
      data-optical-patrol-tone={claim.tone}
      {...(overflow ? { "data-optical-patrol-overflow-claim-control": "true" } : {})}
      onClick={() => onSelect(claim.id)}
      aria-label={`查看 ${claim.title}：${claim.state}`}
    >
      <span className="op__followup-glyph"><OpticalPatrolClaimIcon kind={claim.kind} size={20} /></span>
      <span className="op__followup-copy"><strong>{claim.title}</strong><small>{opticalPatrolFollowupSummary(claim)}</small></span>
      <span className="op__followup-state">{claim.state}</span>
    </button>
  );
}

export function OpticalPatrolClaimFocus({
  claim,
  forbidsCurrentData,
  onOpen,
}: {
  claim: Claim | null;
  forbidsCurrentData: boolean;
  onOpen: (action: ClaimAction) => void;
}) {
  if (!claim) return <section className="op__focus op__focus--empty" aria-label="巡检对象"><p>当前没有可显示的巡检断言。</p></section>;
  const claimDomId = opticalPatrolClaimDomId(claim.id);
  const headingId = `${claimDomId}-heading`;
  return (
    <section
      id={claimDomId}
      className="op__focus"
      data-optical-patrol-expanded-claim={claim.id}
      data-optical-patrol-claim-kind={claim.kind}
      data-optical-patrol-tone={claim.tone}
      aria-labelledby={headingId}
      tabIndex={-1}
    >
      <header className="op__claim-heading">
        <span className="op__claim-glyph"><OpticalPatrolClaimIcon kind={claim.kind} /></span>
        <span className="op__claim-name"><small>{claim.category}</small><h2 id={headingId}>{claim.title}</h2></span>
        <strong className="op__claim-state">{claim.state}</strong>
      </header>
      <p className="op__claim-summary">{claim.summary}</p>
      <OpticalPatrolClaimGeometry
        claim={claim}
        forbidsCurrentData={forbidsCurrentData}
        action={(
          <button className="op__object-action" type="button" data-optical-patrol-action onClick={() => onOpen(claim.action)}>
            <span><small>{claim.action.note}</small><strong>{claim.action.label}</strong></span>
            <ArrowUpRight size={20} aria-hidden="true" />
          </button>
        )}
      />
    </section>
  );
}

export function OpticalPatrolFollowups({
  claims,
  selectedId,
  overflowCount,
  onSelect,
}: {
  claims: Claim[];
  selectedId: string | null;
  overflowCount: number;
  onSelect: (id: string) => void;
}) {
  const [overflowExpanded, setOverflowExpanded] = useState(false);
  const overflowPanelId = useId();
  const available = claims.filter((claim) => claim.id !== selectedId);
  const followups = available.slice(0, 4);
  const overflowClaims = available.slice(4);
  const hiddenCount = overflowCount + overflowClaims.length;
  if (!followups.length && hiddenCount <= 0) return null;
  return (
    <section className="op__followups" aria-labelledby="op-followup-title">
      <header><h2 id="op-followup-title">对象队列</h2><span>按证据优先级</span></header>
      <div className="op__followup-list">
        {followups.map((claim) => <OpticalPatrolFollowupButton key={claim.id} claim={claim} onSelect={onSelect} />)}
      </div>
      {hiddenCount > 0 ? (
        <>
          <button
            type="button"
            className="op__overflow-toggle"
            data-optical-patrol-overflow-control
            data-optical-patrol-overflow-expanded={overflowExpanded ? "true" : "false"}
            aria-controls={overflowPanelId}
            aria-expanded={overflowExpanded}
            onClick={() => setOverflowExpanded((expanded) => !expanded)}
          >
            <span>{overflowExpanded ? "收起其余对象" : `展开其余 ${hiddenCount} 个对象`}</span>
            {overflowExpanded ? <ChevronUp size={18} aria-hidden="true" /> : <ChevronDown size={18} aria-hidden="true" />}
          </button>
          <div
            id={overflowPanelId}
            className="op__overflow-list"
            data-optical-patrol-overflow-claims
            hidden={!overflowExpanded}
          >
            {overflowClaims.map((claim) => (
              <OpticalPatrolFollowupButton key={claim.id} claim={claim} onSelect={onSelect} overflow />
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}
