import { clean, latestSuccess, screenTone, statusLabel, toneClass } from "./MobileOverviewUtils";
import type { MobileOverviewHomeProps } from "./MobileOverviewTypes";

export function StatusHeader({ snapshot, state }: MobileOverviewHomeProps) {
  const name = clean(snapshot.identity || snapshot.name || snapshot.deviceName || state.facts.device.identity || "爱快路由");
  const version = clean(snapshot.version || snapshot.routerosVersion || state.facts.device.version || "RouterOS");
  const recent = latestSuccess(snapshot, state);
  const stateLabel = statusLabel(state);
  return (
    <nav className="ik-v420-nav ik-v240-nav" aria-label="手机导航" data-overview-mobile-v420-nav="ios-navigation" data-overview-mobile-v240-nav="app-navigation">
      <button aria-label="打开菜单" type="button">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
      </button>
      <div className="ik-v240-title" data-overview-mobile-primary-title="device">
        <b>{name}</b>
        <span>RouterOS {version} · {recent}</span>
      </div>
      <strong className={`ik-v240-status ${toneClass(screenTone(state))}`} data-overview-mobile-primary-status="device-state" aria-label={`设备状态 ${stateLabel}`}><i />{stateLabel}</strong>
    </nav>
  );
}
