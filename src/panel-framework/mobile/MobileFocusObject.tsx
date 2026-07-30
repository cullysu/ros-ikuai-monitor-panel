import { ArrowDown, ArrowUp, ChevronRight, Router } from "lucide-react";
import type { OverviewFocusObject, OverviewTrafficInstrument } from "../overview/evidence-model/overviewEvidenceTypes";

interface MobileFocusEvidenceProps {
  object: OverviewFocusObject;
  evidenceAt: string;
  evidenceTime: string;
}
interface MobileFocusObjectProps extends MobileFocusEvidenceProps { onOpen: () => void; traffic: OverviewTrafficInstrument | null; }
interface MobileFocusDossierProps extends MobileFocusEvidenceProps { traffic: OverviewTrafficInstrument | null; }
interface MobileFocusIdentityProps extends MobileFocusEvidenceProps { label: string; titleId?: string; showEvidenceTime: boolean; }
function MobileFocusSignal({ traffic }: { traffic: OverviewTrafficInstrument }) {
  return (
    <span className="mp-focus-signal" data-mobile-traffic-current aria-label={traffic.accessibleSummary}>
      <span className="mp-focus-signal-metric">
        <ArrowDown aria-hidden="true" size={15} />
        <small>下载</small>
        <b>{traffic.currentDown}</b>
      </span>
      <span className="mp-focus-signal-metric">
        <ArrowUp aria-hidden="true" size={15} />
        <small>上传</small>
        <b>{traffic.currentUp}</b>
      </span>
    </span>
  );
}
function FocusIdentity({ object, evidenceAt, evidenceTime, label, titleId, showEvidenceTime }: MobileFocusIdentityProps) {
  return <>
    <span className="mp-focus-icon"><Router aria-hidden="true" size={18} /></span>
    <span className="mp-focus-copy">
      <span className="mp-focus-meta"><small>{label}</small>{showEvidenceTime ? <time dateTime={evidenceAt} data-mobile-focus-evidence-time>{evidenceTime}</time> : null}</span>
      <b id={titleId}>{object.category}</b>
      <em><code>{object.name}</code><span aria-hidden="true"> · </span>{object.note}</em>
    </span>
  </>;
}
export function MobileFocusObject({ object, evidenceAt, evidenceTime, traffic, onOpen }: MobileFocusObjectProps) {
  const objectId = object.targetObjectId || "";
  return (
    <section
      className="mp-focus"
      data-mobile-visual-layer="focus"
      data-mobile-next-decision={object.id}
      data-overview-task-landmark="focus-object"
      data-overview-task-focus="active-object"
      data-overview-task-focus-object={object.id}
    >
      <button
        type="button"
        data-overview-task-landmark="investigation-primary" data-overview-visual-level="next"
        data-mobile-destination={object.route}
        data-mobile-object-id={objectId}
        data-mobile-evidence-at={evidenceAt}
        aria-label={`下一项核对：${object.category}，网关 ${object.name}，${object.note}，证据 ${evidenceTime}`}
        onClick={onOpen}
      >
        <FocusIdentity object={object} evidenceAt={evidenceAt} evidenceTime={evidenceTime} label="当前核对对象" showEvidenceTime={false} />
        <ChevronRight aria-hidden="true" size={17} />
        {traffic ? <MobileFocusSignal traffic={traffic} /> : null}
      </button>
    </section>
  );
}
export function MobileFocusDossier({ object, evidenceAt, evidenceTime, traffic }: MobileFocusDossierProps) {
  return (
    <section
      className="mp-route-dossier"
      data-mobile-visual-layer="focus"
      data-overview-task-landmark="focus"
      data-overview-task-focus="active-object"
      data-overview-task-focus-object={object.id}
      aria-labelledby="mp-route-dossier-title"
    >
      <header>
        <FocusIdentity object={object} evidenceAt={evidenceAt} evidenceTime={evidenceTime} label="当前出口" titleId="mp-route-dossier-title" showEvidenceTime />
        {traffic ? <MobileFocusSignal traffic={traffic} /> : null}
      </header>
      <dl>
        {object.attributes.map((attribute) => (
          <div key={attribute.label}><dt>{attribute.label}</dt><dd><b>{attribute.value}</b></dd></div>
        ))}
      </dl>
    </section>
  );
}
