import { useEffect, useRef } from "react";
import type { MobileNativeModel } from "./mobileNativeTypes";

export function MobileNativeDetail({ model, onBack }: { model: MobileNativeModel; onBack: () => void }) {
  const backRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    backRef.current?.focus({ preventScroll: true });
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onBack();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onBack]);

  return (
    <section className="mn-detail" aria-labelledby="mn-detail-title" data-mobile-native-detail>
      <header className="mn-detail-navigation">
        <button ref={backRef} type="button" onClick={onBack} aria-label="返回网络概览" data-mobile-native-back>
          <span aria-hidden="true">‹</span>概览
        </button>
        <b>原始证据</b>
        <span aria-hidden="true" />
      </header>
      <div className="mn-detail-content">
        <header className="mn-detail-intro">
          <span>{model.device}</span>
          <h1 id="mn-detail-title">{model.actionTitle}</h1>
          <p>以下记录用于追溯判断来源，不会修改 RouterOS 配置。</p>
        </header>
        {model.detailSections.map((section) => (
          <section className="mn-detail-section" aria-label={section.title} data-mobile-native-detail-section key={section.key}>
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
