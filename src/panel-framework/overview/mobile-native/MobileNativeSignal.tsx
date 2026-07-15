import type { CSSProperties } from "react";
import { MobileNativeIcon } from "./MobileNativeIcon";
import type { MobileNativeSignal as MobileNativeSignalModel } from "./mobileNativeTypes";

export function MobileNativeSignal({ signal }: { signal: MobileNativeSignalModel }) {
  if (signal.kind === "rates") {
    return (
      <section className="mn-signal mn-signal-rates" aria-labelledby="mn-signal-title" data-mobile-native-rates="current" data-mobile-native-signal="rates">
        <header><b id="mn-signal-title">{signal.title}</b><span>{signal.note}</span></header>
        <div className="mn-rate-pair">
          {signal.items.map((item, index) => (
            <div key={item.label}>
              <span className="mn-rate-icon"><MobileNativeIcon name={index === 0 ? "download" : "upload"} size={17} /></span>
              <span><small>{item.label}</small><b>{item.value}</b></span>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (signal.kind === "resource") {
    return (
      <section className="mn-signal mn-signal-resource" aria-labelledby="mn-signal-title" data-mobile-native-resource-signal data-mobile-native-signal="resource">
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
      <header>
        <span className="mn-section-symbol" aria-hidden="true"><MobileNativeIcon name={signal.kind} size={18} /></span>
        <span><b id="mn-signal-title">{signal.title}</b><small>{signal.note}</small></span>
      </header>
      <div className="mn-signal-rows">
        {signal.items.map((item, index) => (
          <div className={`mn-signal-row is-${item.tone || "trust"}`} key={item.key || `${item.label}-${index}`}>
            <span>{item.label}</span>
            <span><b>{item.value}</b>{item.note ? <small>{item.note}</small> : null}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
