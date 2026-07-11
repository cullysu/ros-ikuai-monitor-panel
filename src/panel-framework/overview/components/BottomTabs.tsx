type MobileBottomNavItem = {
  id: "home" | "wan" | "interface" | "terminal" | "log";
  label: "首页" | "WAN" | "接口" | "终端" | "日志";
  semantic: "status-overview" | "multi-wan" | "interface-vlan" | "online-terminals" | "collection-log";
  note: string;
  active: boolean;
  path: string;
};

const MOBILE_BOTTOM_NAV_CONTRACT = "home-wan-interface-terminal-log-router-monitor-low-noise";
const MOBILE_BOTTOM_NAV_ITEMS: MobileBottomNavItem[] = [
  { id: "home", label: "首页", semantic: "status-overview", note: "状态总览", active: true, path: "M4 11.5 12 5l8 6.5V20a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1z" },
  { id: "wan", label: "WAN", semantic: "multi-wan", note: "多出口", active: false, path: "M4 8h16M4 12h16M4 16h16M7 8v8M17 8v8" },
  { id: "interface", label: "接口", semantic: "interface-vlan", note: "接口/VLAN", active: false, path: "M6 7h12v10H6zM9 17v3M15 17v3M9 4v3M15 4v3" },
  { id: "terminal", label: "终端", semantic: "online-terminals", note: "在线终端", active: false, path: "M5 7h14v8H5zM8 19h8M12 15v4M7 10h.01M11 10h.01M15 10h.01" },
  { id: "log", label: "日志", semantic: "collection-log", note: "采集日志", active: false, path: "M7 5h10v14H7zM10 9h4M10 13h4" },
];

export function BottomTabs() {
  return (
    <nav
      className="ik-v420-tabs ik-v240-tabs"
      aria-label="路由器监控底部导航"
      data-overview-mobile-bottom-tab="home-wan-interface-terminal-log"
      data-overview-mobile-v159-tabbar="bottom-entry"
      data-overview-mobile-v240-tabs="bottom-entry"
      data-overview-mobile-v1010-quiet-tabbar="no-border-no-glow"
      data-overview-mobile-v1066-router-tabs={MOBILE_BOTTOM_NAV_CONTRACT}
      data-overview-mobile-v1066-router-tab-order={MOBILE_BOTTOM_NAV_ITEMS.map((item) => item.id).join("/")}
      data-overview-mobile-v1066-router-tab-semantics={MOBILE_BOTTOM_NAV_ITEMS.map((item) => item.semantic).join("/")}
    >
      {MOBILE_BOTTOM_NAV_ITEMS.map((item) => (
        <button
          aria-current={item.active ? "page" : undefined}
          aria-label={`${item.label} · ${item.note}`}
          className={item.active ? "is-active" : ""}
          data-overview-mobile-v1066-router-tab={item.id}
          data-overview-mobile-v1066-router-tab-semantic={item.semantic}
          data-overview-mobile-v1066-router-tab-note={item.note}
          type="button"
          key={item.id}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d={item.path} /></svg>
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  );
}
