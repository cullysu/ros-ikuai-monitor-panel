import type { MobileNativeModel } from "./mobileNativeTypes";

export function MobileNativePathEvidence({ model }: { model: MobileNativeModel }) {
  return (
    <details className="mn-path-evidence" data-mobile-native-path-evidence data-mobile-route-verification={model.routeVerification}>
      <summary>
        <span><b>网络对象与路径证据</b><small>{model.pathSummary}</small></span>
        <i aria-hidden="true">›</i>
      </summary>
      <div className="mn-path-rows">
        {model.pathRows.map((row) => (
          <div className={`mn-path-row is-${row.tone || "trust"}`} key={row.label}>
            <span>{row.label}</span>
            <span><b>{row.value}</b>{row.note ? <small>{row.note}</small> : null}</span>
          </div>
        ))}
      </div>
    </details>
  );
}
