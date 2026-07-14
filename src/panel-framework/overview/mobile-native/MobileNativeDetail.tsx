import { useEffect, useRef } from "react";
import type { MobileNativeModel } from "./mobileNativeModel";

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
        <p>{model.kicker}</p>
        <h1 id="mn-detail-title">{model.actionTitle}</h1>
        <section className="mn-detail-group" aria-label="当前判断">
          <div><span>判断</span><b>{model.title}</b></div>
          <div><span>记录时间</span><b>{model.timestamp}</b></div>
          <div><span>模式</span><b>只读，不修改 RouterOS</b></div>
        </section>
        <section className="mn-detail-group" aria-label="关键证据">
          {model.facts.map((fact) => <div key={fact.label}><span>{fact.label}</span><b>{fact.value}</b></div>)}
          {model.rows.map((row) => <div key={row.label}><span>{row.label}</span><b>{row.value}</b></div>)}
        </section>
      </div>
    </section>
  );
}
