import { useEffect, useRef } from "react";
import type { MobileNativeModel } from "./mobileNativeTypes";

export function MobileNativeDetail({ model, onBack }: { model: MobileNativeModel; onBack: () => void }) {
  const backRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    backRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onBack();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onBack]);

  return (
    <section className="mn-detail" aria-labelledby="mn-detail-title" data-mobile-native-detail>
      <header className="mn-detail-nav">
        <button ref={backRef} type="button" onClick={onBack} aria-label="返回网络概览" data-mobile-native-back>
          <span aria-hidden="true">‹</span>网络
        </button>
        <b>证据</b>
        <span aria-hidden="true" />
      </header>
      <div className="mn-detail-content">
        <div className={`mn-detail-evidence is-${model.evidenceTone}`} data-mobile-native-detail-evidence={model.evidenceMode}>
          <span><b>{model.evidenceLabel}</b><small>{model.evidenceNote}</small></span>
          <time>{model.timestamp}</time>
        </div>
        <p>低优先级原始记录</p>
        <h1 id="mn-detail-title">{model.actionTitle}</h1>
        {model.detailSections.map((section) => (
          <section className="mn-detail-section" aria-label={section.title} data-mobile-native-detail-section key={section.title}>
            <header><b>{section.title}</b><span>{section.note}</span></header>
            <div className="mn-detail-group">
              {section.rows.map((row, index) => (
                <div className={`is-${row.tone || "trust"}`} key={`${row.label}-${index}`}>
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
