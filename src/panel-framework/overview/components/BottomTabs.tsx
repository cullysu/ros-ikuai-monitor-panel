export type MobileBottomTabId = "home" | "network" | "diagnose";

type MobileBottomNavItem = {
  id: MobileBottomTabId;
  label: "总览" | "网络" | "诊断";
  semantic: "status-overview" | "wan-interface" | "collection-connections";
  note: string;
  path: string;
};

const MOBILE_BOTTOM_NAV_ITEMS: MobileBottomNavItem[] = [
  { id: "home", label: "总览", semantic: "status-overview", note: "设备健康与当前遥测", path: "M4 11.5 12 5l8 6.5V20a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1z" },
  { id: "network", label: "网络", semantic: "wan-interface", note: "WAN、路由与接口", path: "M4 8h16M4 12h16M4 16h16M7 8v8M17 8v8" },
  { id: "diagnose", label: "诊断", semantic: "collection-connections", note: "采集、连接与日志", path: "M7 5h10v14H7zM10 9h4M10 13h4" },
];

interface BottomTabsProps {
  activeId: MobileBottomTabId;
  onSelect: (id: MobileBottomTabId) => void;
}

export function BottomTabs({ activeId, onSelect }: BottomTabsProps) {
  return (
    <nav
      className="ik-mobile-bottom-tabs"
      aria-label="路由器监控底部导航"
    >
      {MOBILE_BOTTOM_NAV_ITEMS.map((item) => (
        <button
          id={`mobile-tab-${item.id}`}
          aria-controls={`mobile-${item.id}-view`}
          aria-current={activeId === item.id ? "page" : undefined}
          aria-label={`${item.label} · ${item.note}`}
          className={activeId === item.id ? "is-active" : ""}
          onClick={() => onSelect(item.id)}
          type="button"
          key={item.id}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d={item.path}
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.8"
            />
          </svg>
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  );
}
