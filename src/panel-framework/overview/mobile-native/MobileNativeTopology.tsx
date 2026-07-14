import type { MobileNativeModel } from "./mobileNativeModel";

export function MobileNativeTopology({ model }: { model: MobileNativeModel }) {
  return (
    <section className="mn-topology" aria-label="当前网络路径" data-mobile-native-topology={model.pathState}>
      <div className="mn-path mn-path-wan" aria-hidden="true" />
      <div className="mn-path mn-path-lan" aria-hidden="true" />

      <div className="mn-node mn-node-internet">
        <span className="mn-internet-symbol" aria-hidden="true">WAN</span>
        <b>互联网</b>
        <small>{model.internetLabel}</small>
      </div>

      <div className="mn-route-label">{model.routeLabel}</div>

      {model.showRates ? (
        <div className="mn-rate-pair" data-mobile-native-rates={model.ratePrefix === "上次" ? "cached" : "current"}>
          <span><small>{model.ratePrefix}下载</small><b>{model.downRate}</b></span>
          <span><small>{model.ratePrefix}上传</small><b>{model.upRate}</b></span>
        </div>
      ) : null}

      <div className="mn-node mn-node-router">
        <span className="mn-router-symbol" aria-hidden="true"><i /><i /></span>
        <b>{model.device}</b>
        <small>{model.deviceNote}</small>
      </div>

      <div className="mn-node mn-node-clients">
        <span className="mn-client-symbols" aria-hidden="true"><i /><i /><i /></span>
        <b>{model.clientLabel}</b>
      </div>
    </section>
  );
}
