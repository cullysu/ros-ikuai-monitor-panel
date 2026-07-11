import { toneClass } from "./MobileOverviewUtils";
import type { MobileOverviewResolvedProps } from "./MobileOverviewTypes";

export function StatusHeader({ model }: MobileOverviewResolvedProps) {
  return (
    <nav
      className="ik-v420-nav ik-v240-nav"
      aria-label="RouterOS 设备状态导航"
      data-overview-mobile-v420-nav="ios-navigation"
      data-overview-mobile-v240-nav="app-navigation"
      data-overview-mobile-v1067-status-header="routeros-device-state-header-context-action-low-noise"
    >
      <button
        aria-label="打开 RouterOS 采集链路与设备上下文"
        data-overview-mobile-v1067-header-action="router-context"
        data-overview-mobile-v1067-header-action-semantic="device-collection-route-context"
        data-overview-mobile-v1067-header-action-tone="low-noise-outline"
        type="button"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M7 12h10M9 17h6M6 7l2-3h8l2 3M8 20h8" /></svg>
      </button>
      <div className="ik-v240-title" data-overview-mobile-primary-title="device">
        <b>{model.header.deviceName}</b>
        <span>{model.header.versionText} · {model.header.recent}</span>
      </div>
      <strong className={`ik-v240-status ${toneClass(model.header.tone)}`} data-overview-mobile-primary-status="device-state" aria-label={`设备状态 ${model.header.statusLabel}`}><i />{model.header.statusLabel}</strong>
    </nav>
  );
}
