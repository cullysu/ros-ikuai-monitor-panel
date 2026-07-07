export function BottomTabs() {
  const tabs = [
    { label: "首页", active: true, path: "M4 11.5 12 5l8 6.5V20a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1z" },
    { label: "WAN", active: false, path: "M4 12h16M7 8h10M7 16h10" },
    { label: "接口", active: false, path: "M6 7h12v10H6zM9 17v3M15 17v3M9 4v3M15 4v3" },
    { label: "终端", active: false, path: "M5 7h14v8H5zM8 19h8M12 15v4M7 10h.01M11 10h.01M15 10h.01" },
    { label: "日志", active: false, path: "M7 5h10v14H7zM10 9h4M10 13h4" },
  ];
  return (
    <nav className="ik-v420-tabs ik-v240-tabs" aria-label="底部导航" data-overview-mobile-bottom-tab="home-wan-interface-terminal-log" data-overview-mobile-v159-tabbar="bottom-entry" data-overview-mobile-v240-tabs="bottom-entry">
      {tabs.map((item) => (
        <button className={item.active ? "is-active" : ""} type="button" key={item.label}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d={item.path} /></svg>
          {item.label}
        </button>
      ))}
    </nav>
  );
}
