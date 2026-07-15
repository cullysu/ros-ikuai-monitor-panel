import type { CSSProperties } from "react";
import type { MobileNativeSignal as MobileNativeSignalModel } from "./mobileNativeTypes";

export function MobileNativeSignal({ signal }: { signal: MobileNativeSignalModel }) {
  if (signal.kind === "rates") {
    return (
      <section className="mn-signal mn-signal-rates" aria-label={signal.title} data-mobile-native-rates="current">
        {signal.items.map((item) => (
          <div key={item.label}>
            <span>{item.label} · 当前</span>
            <b>{item.value}</b>
          </div>
        ))}
      </section>
    );
  }

  if (signal.kind === "resource") {
    return (
      <section className="mn-signal mn-signal-resource" aria-labelledby="mn-signal-title" data-mobile-native-resource-signal>
        <header><b id="mn-signal-title">{signal.title}</b><span>{signal.note}</span></header>
        <div className="mn-pressure-list">
          {signal.items.map((item) => {
            const fill = Math.max(0, Math.min(100, item.percent ?? 0));
            const threshold = Math.max(0, Math.min(100, item.threshold ?? 0));
            const style = { "--mn-fill": `${fill}%`, "--mn-threshold": `${threshold}%` } as CSSProperties;
            return (
              <div className={`mn-pressure is-${item.tone || "trust"}`} key={item.label}>
                <span>{item.label}</span><b>{item.value}</b>
                <div className="mn-pressure-track" style={style} role="img" aria-label={`${item.label} ${item.value}，阈值 ${threshold}%`}>
                  <i aria-hidden="true" /><em aria-hidden="true" />
                </div>
              </div>
            );
          })}
        </div>
      </section>
    );
  }

  return (
    <section className={`mn-signal mn-signal-list is-${signal.kind}`} aria-labelledby="mn-signal-title" data-mobile-native-signal={signal.kind}>
      <header><b id="mn-signal-title">{signal.title}</b><span>{signal.note}</span></header>
      <div>
        {signal.items.map((item, index) => (
          <div className={`mn-signal-row is-${item.tone || "trust"}`} key={`${item.label}-${index}`}>
            <span>{item.label}</span>
            <span><b>{item.value}</b>{item.note ? <small>{item.note}</small> : null}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
