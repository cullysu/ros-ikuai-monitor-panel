import type { KeyboardEvent, RefObject } from "react";
import { MobileNativeIcon } from "./MobileNativeIcon";
import { MobileNativeInspectionPanel } from "./MobileNativeInspection";
import { MobileNativeSignal } from "./MobileNativeSignal";
import type { MobileFocusKey, MobileNativeFocus, MobileNativeInspection, MobileNativeModel } from "./mobileNativeTypes";

function DeviceChrome({ model }: { model: MobileNativeModel }) {
  return (
    <header className="mn-navigation">
      <span><b>{model.device}</b><small>{model.deviceNote}</small></span>
      <span className="mn-readonly-label"><MobileNativeIcon name="readonly" size={14} />只读监控</span>
    </header>
  );
}

function EvidenceBoundary({ model }: { model: MobileNativeModel }) {
  return (
    <div className={`mn-evidence-boundary is-${model.evidenceTone}`} data-mobile-native-evidence-mode={model.evidenceMode}>
      <span><b>{model.evidenceLabel}</b><small>{model.evidenceNote}</small></span>
      <time>{model.evidenceTime}</time>
    </div>
  );
}

function FocusMasthead({ focus }: { focus: MobileNativeFocus }) {
  return (
    <header className={`mn-focus-masthead is-${focus.tone}`}>
      <div className="mn-focus-symbol" aria-hidden="true"><MobileNativeIcon name={focus.key} size={24} /></div>
      <div className="mn-focus-copy">
        <span>{focus.kicker}</span>
        <h1 id="mn-focus-title">{focus.title}</h1>
        <p>{focus.summary}</p>
        {focus.scope ? <small>{focus.scope}</small> : null}
      </div>
    </header>
  );
}

function ProofLedger({ focus }: { focus: MobileNativeFocus }) {
  return (
    <section className="mn-proof-ledger" aria-labelledby="mn-proof-title" data-mobile-native-proof>
      <header><h2 id="mn-proof-title">判断依据</h2><span>只列直接支撑结论的事实</span></header>
      <ul>
        {focus.proofs.map((proof, index) => (
          <li className={`is-${proof.tone || "trust"}`} key={proof.key || `${proof.label}-${index}`} data-mobile-native-proof-key={proof.key}>
            <span className="mn-proof-symbol" aria-hidden="true"><MobileNativeIcon name="proof" size={16} /></span>
            <span><small>{proof.label}</small><b>{proof.value}</b>{proof.note ? <em>{proof.note}</em> : null}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function FocusQueue({
  focuses,
  selected,
  onSelect,
  compact = false,
}: {
  focuses: MobileNativeFocus[];
  selected: MobileFocusKey;
  onSelect: (key: MobileFocusKey) => void;
  compact?: boolean;
}) {
  const isRiskQueue = focuses.some((focus) => focus.risk);
  const move = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let nextIndex: number | null = null;
    if (event.key === "ArrowDown" || event.key === "ArrowRight") nextIndex = (index + 1) % focuses.length;
    if (event.key === "ArrowUp" || event.key === "ArrowLeft") nextIndex = (index - 1 + focuses.length) % focuses.length;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = focuses.length - 1;
    if (nextIndex === null) return;
    event.preventDefault();
    const next = focuses[nextIndex];
    onSelect(next.key);
    document.getElementById(`mn-focus-option-${next.key}`)?.focus({ preventScroll: true });
  };

  return (
    <section className={`mn-focus-queue ${compact ? "is-compact" : ""}`} aria-labelledby="mn-focus-queue-title">
      <header><h2 id="mn-focus-queue-title">{isRiskQueue ? "风险焦点" : "证据焦点"}</h2><span>{focuses.length} 组</span></header>
      <div role="listbox" aria-labelledby="mn-focus-queue-title">
        {focuses.map((focus, index) => {
          const active = focus.key === selected;
          return (
            <button
              id={`mn-focus-option-${focus.key}`}
              className={`is-${focus.tone} ${active ? "is-selected" : ""}`}
              type="button"
              role="option"
              aria-selected={active}
              aria-controls="mn-focus-panel"
              tabIndex={active ? 0 : -1}
              onClick={() => onSelect(focus.key)}
              onKeyDown={(event) => move(event, index)}
              key={focus.key}
              data-mobile-native-focus-option={focus.key}
            >
              <span className="mn-queue-symbol" aria-hidden="true"><MobileNativeIcon name={focus.key} size={18} /></span>
              <span><small>{focus.label}</small><b>{focus.kicker}</b></span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function FocusPanel({
  focus,
  inspection,
  selectedObjectId,
  onSelectObject,
  expanded,
  onExpandedChange,
  onOpenDetail,
  detailButtonRef,
}: {
  focus: MobileNativeFocus;
  inspection: MobileNativeInspection;
  selectedObjectId?: string;
  onSelectObject: (objectId: string) => void;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  onOpenDetail: () => void;
  detailButtonRef: RefObject<HTMLButtonElement>;
}) {
  return (
    <section id="mn-focus-panel" className="mn-focus-panel" aria-labelledby="mn-focus-title" data-mobile-native-focus={focus.key}>
      <p className="mn-sr-only" role="status" aria-live="polite">当前焦点：{focus.kicker}，{focus.title}</p>
      <FocusMasthead focus={focus} />
      <div className="mn-focus-evidence-grid">
        <div className="mn-focus-measurements">
          <ProofLedger focus={focus} />
          <MobileNativeSignal signal={focus.signal} selectedObjectId={selectedObjectId} onSelectObject={onSelectObject} />
        </div>
        <MobileNativeInspectionPanel
          inspection={inspection}
          expanded={expanded}
          onExpandedChange={onExpandedChange}
          onOpenDetail={onOpenDetail}
          detailButtonRef={detailButtonRef}
        />
      </div>
    </section>
  );
}

function TabletScopeLedger({ model }: { model: MobileNativeModel }) {
  return (
    <section className="mn-tablet-scope" aria-labelledby="mn-tablet-scope-title" data-mobile-native-tablet-scope>
      <header><h2 id="mn-tablet-scope-title">观测范围</h2><span>当前采样对象</span></header>
      <dl>
        {model.scopeFacts.map((fact, index) => (
          <div className={`is-${fact.tone || "trust"}`} key={fact.key || `${fact.label}-${index}`} data-mobile-native-scope-key={fact.key}>
            <dt>{fact.label}</dt><dd>{fact.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function TabletContextEvidence({ model, focus }: { model: MobileNativeModel; focus: MobileNativeFocus }) {
  const sectionKeys = focus.inspection.key === "collection"
    ? ["target", "boundary"]
    : focus.inspection.key === "resource"
      ? ["collection", "boundary"]
      : focus.inspection.key === "interface"
        ? ["route", "boundary"]
        : focus.inspection.key === "wan"
          ? ["route", "collection"]
          : focus.key === "fleet-scope"
            ? ["wan", "collection"]
            : ["collection", "boundary"];
  const sections = sectionKeys
    .map((key) => model.detailSections.find((section) => section.key === key))
    .filter((section): section is NonNullable<typeof section> => Boolean(section));

  return (
    <section className="mn-tablet-context" aria-labelledby="mn-tablet-context-title" data-mobile-native-tablet-context>
      <header><h2 id="mn-tablet-context-title">上下文证据</h2><span>目标、来源与影响边界</span></header>
      <div>
        {sections.map((section) => (
          <section className="mn-tablet-context-card" aria-labelledby={`mn-context-${section.key}`} key={section.key} data-mobile-native-context-key={section.key}>
            <header><h3 id={`mn-context-${section.key}`}>{section.title}</h3><small>{section.note}</small></header>
            <div>
              {section.rows.slice(0, 3).map((row, index) => (
                <div className={`mn-tablet-context-row is-${row.tone || "trust"}`} key={row.key || `${row.label}-${index}`}>
                  <span>{row.label}</span>
                  <span><b>{row.value}</b>{row.note ? <small>{row.note}</small> : null}</span>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}

export function MobileNativePhoneHome({
  model,
  focus,
  inspection,
  selectedObjectId,
  onSelectObject,
  selected,
  onSelect,
  expanded,
  onExpandedChange,
  onOpenDetail,
  detailButtonRef,
}: {
  model: MobileNativeModel;
  focus: MobileNativeFocus;
  inspection: MobileNativeInspection;
  selectedObjectId?: string;
  onSelectObject: (objectId: string) => void;
  selected: MobileFocusKey;
  onSelect: (key: MobileFocusKey) => void;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  onOpenDetail: () => void;
  detailButtonRef: RefObject<HTMLButtonElement>;
}) {
  return (
    <>
      <DeviceChrome model={model} />
      <EvidenceBoundary model={model} />
      {model.focuses.length > 1 ? <FocusQueue focuses={model.focuses} selected={selected} onSelect={onSelect} compact /> : null}
      <FocusPanel
        focus={focus}
        inspection={inspection}
        selectedObjectId={selectedObjectId}
        onSelectObject={onSelectObject}
        expanded={expanded}
        onExpandedChange={onExpandedChange}
        onOpenDetail={onOpenDetail}
        detailButtonRef={detailButtonRef}
      />
    </>
  );
}

export function MobileNativeTabletHome({
  model,
  focus,
  inspection,
  selectedObjectId,
  onSelectObject,
  selected,
  onSelect,
  expanded,
  onExpandedChange,
  onOpenDetail,
  detailButtonRef,
}: {
  model: MobileNativeModel;
  focus: MobileNativeFocus;
  inspection: MobileNativeInspection;
  selectedObjectId?: string;
  onSelectObject: (objectId: string) => void;
  selected: MobileFocusKey;
  onSelect: (key: MobileFocusKey) => void;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  onOpenDetail: () => void;
  detailButtonRef: RefObject<HTMLButtonElement>;
}) {
  return (
    <>
      <DeviceChrome model={model} />
      <div className="mn-tablet-workspace" data-mobile-native-tablet-workspace>
        <aside className="mn-focus-master" aria-label="风险与证据主列表">
          <EvidenceBoundary model={model} />
          {model.scopeNote ? <p className="mn-scope-note">{model.scopeNote}</p> : null}
          <TabletScopeLedger model={model} />
          <FocusQueue focuses={model.focuses} selected={selected} onSelect={onSelect} />
          <div className="mn-master-boundary">
            <MobileNativeIcon name="readonly" size={16} />
            <span><b>只读边界</b><small>不会修改 RouterOS 配置</small></span>
          </div>
        </aside>
        <div className="mn-tablet-detail">
          <FocusPanel
            focus={focus}
            inspection={inspection}
            selectedObjectId={selectedObjectId}
            onSelectObject={onSelectObject}
            expanded={expanded}
            onExpandedChange={onExpandedChange}
            onOpenDetail={onOpenDetail}
            detailButtonRef={detailButtonRef}
          />
          <TabletContextEvidence model={model} focus={focus} />
        </div>
      </div>
    </>
  );
}
