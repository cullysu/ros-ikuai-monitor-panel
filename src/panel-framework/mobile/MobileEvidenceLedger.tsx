import { ChevronDown, Gauge } from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";
import type { OverviewEvidenceRow } from "../overview/evidence-model/overviewEvidenceTypes";
export function MobileEvidenceLedger({
  evidenceNote,
  rows,
  autoOpen = false,
}: {
  evidenceNote: string;
  rows: OverviewEvidenceRow[];
  autoOpen?: boolean;
}) {
  const ledgerRef = useRef<HTMLDetailsElement>(null);
  const ledgerBodyRef = useRef<HTMLDListElement>(null);
  const userOverrideRef = useRef<boolean | null>(null);
  const automaticOpenRef = useRef(false);
  const [open, setOpen] = useState(false);
  useLayoutEffect(() => {
    const sync = () => {
      if (userOverrideRef.current !== null) return;
      const ledger = ledgerRef.current;
      const body = ledgerBodyRef.current;
      const summary = ledger?.querySelector("summary");
      if (!ledger || !body || !summary) return;
      const ledgerBox = ledger.getBoundingClientRect();
      const navigationBox = document.querySelector(".panel-task-navigation")?.getBoundingClientRect();
      const bottomNavigation = Boolean(navigationBox && navigationBox.width >= window.innerWidth * 0.7);
      const bottomBoundary = bottomNavigation && navigationBox
        ? navigationBox.top
        : window.innerHeight - 16;
      const availableHeight = Math.max(0, bottomBoundary - ledgerBox.top);
       const requiredHeight = summary.getBoundingClientRect().height + body.getBoundingClientRect().height;
       const primaryTask = document.querySelector('[data-mobile-primary-task-proximity], [data-mobile-phone-next-step]');
       const reservedTaskHeight = primaryTask?.getBoundingClientRect().height || 0;
       const nextOpen = rows.length > 0 && (
         autoOpen || (requiredHeight > 0 && requiredHeight + reservedTaskHeight <= availableHeight)
       );
      automaticOpenRef.current = nextOpen;
      setOpen((current) => current === nextOpen ? current : nextOpen);
    };
    sync();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(sync);
    if (ledgerRef.current) observer?.observe(ledgerRef.current);
    if (ledgerBodyRef.current) observer?.observe(ledgerBodyRef.current);
    window.addEventListener("resize", sync);
    document.fonts?.ready.then(sync).catch(() => {});
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", sync);
    };
   }, [autoOpen, evidenceNote, rows]);
  return (
    <details
      className="mp-ledger"
      data-mobile-evidence-ledger
      data-mobile-incident-task-role="evidence-boundary"
      data-overview-visual-level="support"
      data-overview-task-landmark="evidence-boundary"
      data-auto-open={autoOpen ? "true" : "false"}
      data-user-override={userOverrideRef.current === null ? "auto" : "manual"}
      open={open}
      ref={ledgerRef}
      onToggle={(event) => {
        const nextOpen = event.currentTarget.open;
        if (nextOpen === automaticOpenRef.current) {
          setOpen(nextOpen);
          return;
        }
        userOverrideRef.current = nextOpen;
        automaticOpenRef.current = nextOpen;
        setOpen(nextOpen);
      }}
    >
      <summary>
        <span><Gauge aria-hidden="true" size={17} /><span><b>证据边界</b><small>{evidenceNote}</small></span></span>
        <span>{rows.length} 项<ChevronDown aria-hidden="true" size={17} /></span>
      </summary>
      <dl ref={ledgerBodyRef}>
        {rows.map((row) => (
          <div className={`is-${row.tone}`} data-mobile-evidence-row={row.key} key={row.key}>
            <dt>{row.label}</dt>
            <dd><b>{row.value}</b><small>{row.note}</small></dd>
          </div>
        ))}
      </dl>
    </details>
  );
}
