import { ChevronDown, Gauge } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type {
  OverviewEvidenceMode,
  OverviewEvidenceRow,
} from "../overview/evidence-model/overviewEvidenceTypes";

export function MobileEvidenceLedger({
  evidenceMode,
  evidenceNote,
  rows,
  incident,
  priorityCount,
  tablet,
}: {
  evidenceMode: OverviewEvidenceMode;
  evidenceNote: string;
  rows: OverviewEvidenceRow[];
  incident: boolean;
  priorityCount: number;
  tablet: boolean;
}) {
  const ledgerRef = useRef<HTMLDetailsElement>(null);
  const userOverrideRef = useRef<boolean | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const sync = () => {
      if (userOverrideRef.current !== null) return;
      const ledger = ledgerRef.current;
      if (!ledger) return;
      const available = window.innerHeight - ledger.getBoundingClientRect().top - 76;
      const estimatedBody = rows.length * 54;
      const fitsEvidence = available >= Math.min(180, estimatedBody);
      const roomyIncident = incident && (
        window.innerHeight >= 720 ||
        window.innerWidth >= 600 ||
        priorityCount <= 2
      );
      setOpen(evidenceMode === "unavailable" || roomyIncident || fitsEvidence);
    };
    sync();
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, [evidenceMode, incident, priorityCount, rows.length, tablet]);

  return (
    <details
      className="mp-ledger"
      data-mobile-evidence-ledger
      data-user-override={userOverrideRef.current === null ? "auto" : "manual"}
      open={open}
      ref={ledgerRef}
      onToggle={(event) => {
        const nextOpen = event.currentTarget.open;
        if (nextOpen === open) return;
        userOverrideRef.current = nextOpen;
        setOpen(nextOpen);
      }}
    >
      <summary>
        <span><Gauge aria-hidden="true" size={17} /><span><b>证据边界</b><small>{evidenceNote}</small></span></span>
        <span>{rows.length} 项<ChevronDown aria-hidden="true" size={17} /></span>
      </summary>
      <dl>
        {rows.map((row) => (
          <div className={`is-${row.tone}`} key={row.key}>
            <dt>{row.label}</dt>
            <dd><b>{row.value}</b><small>{row.note}</small></dd>
          </div>
        ))}
      </dl>
    </details>
  );
}
