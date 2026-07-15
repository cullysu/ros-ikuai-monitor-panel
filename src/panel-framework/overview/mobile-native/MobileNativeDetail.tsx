import { useEffect, useLayoutEffect, useRef } from "react";
import { MobileNativeIcon } from "./MobileNativeIcon";
import type { MobileNativeFocus, MobileNativeInspection, MobileNativeModel } from "./mobileNativeTypes";

export function MobileNativeDetail({
  model,
  focus,
  inspection,
  onBack,
}: {
  model: MobileNativeModel;
  focus: MobileNativeFocus;
  inspection: MobileNativeInspection;
  onBack: () => void;
}) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  const sections = focus.detailSectionKeys
    .map((key) => model.detailSections.find((section) => section.key === key))
    .filter((section): section is NonNullable<typeof section> => Boolean(section));

  useLayoutEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
    titleRef.current?.focus({ preventScroll: true });
  }, [focus.key, inspection.objectId]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onBack();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onBack]);

  const selectedRows = [
    { key: "selected-source", label: "来源路径", value: inspection.sourcePath },
    { key: "selected-observed", label: "采样时间", value: inspection.observedAt },
    { key: "selected-object", label: "对象标识", value: inspection.objectId, note: inspection.objectPosition },
    ...inspection.detailRows,
  ];

  return (
    <main className="mn-detail" aria-labelledby="mn-detail-title" data-mobile-native-detail data-mobile-native-detail-focus={focus.key} data-mobile-native-detail-object={inspection.objectId}>
      <header className="mn-detail-navigation">
        <button type="button" onClick={onBack} aria-label="返回网络概览" data-mobile-native-back>
          <MobileNativeIcon name="back" size={21} />概览
        </button>
        <b>{inspection.label}</b>
        <span aria-hidden="true" />
      </header>
      <div className="mn-detail-content">
        <header className={`mn-detail-intro is-${focus.tone}`}>
          <span className="mn-detail-symbol" aria-hidden="true"><MobileNativeIcon name={inspection.key} size={23} /></span>
          <span>{model.device}</span>
          <h1 ref={titleRef} id="mn-detail-title" tabIndex={-1}>{inspection.actionTitle}</h1>
          <p>这里补充首页未展示的对象路径、采样时间和字段记录；页面保持只读。</p>
        </header>
        <section className="mn-detail-section is-selected-evidence" aria-labelledby="mn-detail-selected-title" data-mobile-native-selected-evidence>
          <header><h2 id="mn-detail-selected-title">所选对象证据</h2><span>对象、来源与采样边界</span></header>
          <div className="mn-detail-rows">
            {selectedRows.map((row, index) => (
              <div className="mn-detail-row" key={row.key || `${row.label}-${index}`}>
                <span>{row.label}</span>
                <span><b>{row.value}</b>{row.note ? <small>{row.note}</small> : null}</span>
              </div>
            ))}
          </div>
        </section>
        {sections.map((section) => (
          <section className="mn-detail-section" aria-labelledby={`mn-detail-section-${section.key}`} data-mobile-native-detail-section={section.key} key={section.key}>
            <header><h2 id={`mn-detail-section-${section.key}`}>{section.title}</h2><span>{section.note}</span></header>
            <div className="mn-detail-rows">
              {section.rows.map((row, index) => (
                <div className={`mn-detail-row is-${row.tone || "trust"}`} key={row.key || `${row.label}-${index}`}>
                  <span>{row.label}</span>
                  <span><b>{row.value}</b>{row.note ? <small>{row.note}</small> : null}</span>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
