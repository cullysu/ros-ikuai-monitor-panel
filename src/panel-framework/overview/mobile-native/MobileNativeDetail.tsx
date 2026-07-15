import { useEffect, useLayoutEffect, useRef } from "react";
import { MobileNativeIcon } from "./MobileNativeIcon";
import type { MobileNativeFocus, MobileNativeModel } from "./mobileNativeTypes";

export function MobileNativeDetail({ model, focus, onBack }: { model: MobileNativeModel; focus: MobileNativeFocus; onBack: () => void }) {
  const backRef = useRef<HTMLButtonElement>(null);
  const sections = focus.detailSectionKeys
    .map((key) => model.detailSections.find((section) => section.key === key))
    .filter((section): section is NonNullable<typeof section> => Boolean(section));

  useLayoutEffect(() => {
    backRef.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onBack();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onBack]);

  return (
    <section className="mn-detail" aria-labelledby="mn-detail-title" data-mobile-native-detail data-mobile-native-detail-focus={focus.key}>
      <header className="mn-detail-navigation">
        <button ref={backRef} type="button" onClick={onBack} aria-label="返回网络概览" data-mobile-native-back>
          <MobileNativeIcon name="back" size={21} />概览
        </button>
        <b>{focus.inspection.label}</b>
        <span aria-hidden="true" />
      </header>
      <div className="mn-detail-content">
        <header className={`mn-detail-intro is-${focus.tone}`}>
          <span className="mn-detail-symbol" aria-hidden="true"><MobileNativeIcon name={focus.inspection.key} size={23} /></span>
          <span>{model.device}</span>
          <h1 id="mn-detail-title">{focus.inspection.actionTitle}</h1>
          <p>以下记录补充首页判断来源，只用于追溯，不会修改 RouterOS 配置。</p>
        </header>
        {sections.map((section) => (
          <section className="mn-detail-section" aria-label={section.title} data-mobile-native-detail-section={section.key} key={section.key}>
            <header><b>{section.title}</b><span>{section.note}</span></header>
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
    </section>
  );
}
