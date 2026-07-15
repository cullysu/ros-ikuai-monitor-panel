import type { CSSProperties } from "react";
import { MobileNativeIcon } from "./MobileNativeIcon";
import { MobileNativeObjectSelector } from "./MobileNativeObjectSelector";
import type { MobileNativeSignal as MobileNativeSignalModel } from "./mobileNativeTypes";

export function MobileNativeSignal({
  signal,
  selectedObjectId,
  onSelectObject,
}: {
  signal: MobileNativeSignalModel;
  selectedObjectId?: string;
  onSelectObject?: (objectId: string) => void;
}) {
  if (signal.kind === "rates") {
    return (
      <section className="mn-signal mn-signal-rates" aria-labelledby="mn-signal-title" data-mobile-native-rates="current" data-mobile-native-signal="rates">
        <header><h2 id="mn-signal-title">{signal.title}</h2><span>{signal.note}</span></header>
        <div className="mn-rate-pair">
          {signal.items.map((item, index) => (
            <div key={item.label}>
              <span className="mn-rate-icon"><MobileNativeIcon name={index === 0 ? "download" : "upload"} size={17} /></span>
              <span><small>{item.label}</small><b><span>{item.value}</span>{item.unit ? <em>{item.unit}</em> : null}</b></span>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (signal.kind === "resource") {
    return (
      <section className="mn-signal mn-signal-resource" aria-labelledby="mn-signal-title" data-mobile-native-resource-signal data-mobile-native-signal="resource">
        <header><h2 id="mn-signal-title">{signal.title}</h2><span>{signal.note}</span></header>
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

  const selectableObjects = (signal.kind === "interfaces" || signal.kind === "wan") && signal.items.some((item) => item.objectId);
  return (
    <section className={`mn-signal mn-signal-list is-${signal.kind} ${selectableObjects ? "is-object-selector" : ""}`} aria-labelledby="mn-signal-title" data-mobile-native-signal={signal.kind}>
      <header>
        <span className="mn-section-symbol" aria-hidden="true"><MobileNativeIcon name={signal.kind} size={18} /></span>
        <span><h2 id="mn-signal-title">{signal.title}</h2><small>{signal.note}</small></span>
      </header>
      {selectableObjects ? (
        <MobileNativeObjectSelector items={signal.items} selectedObjectId={selectedObjectId} onSelectObject={onSelectObject} />
      ) : (
        <div className="mn-signal-rows">
          {signal.items.map((item, index) => (
            <div className={`mn-signal-row is-${item.tone || "trust"}`} key={item.key || `${item.label}-${index}`}>
              <span>{item.label}</span>
              <span><b>{item.value}</b>{item.note ? <small>{item.note}</small> : null}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
