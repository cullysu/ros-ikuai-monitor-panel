const fs = require("node:fs");
const path = require("node:path");
const roots = [
  "C:/Users/cully/Documents/ros-ikuai-monitor-panel",
  "C:/Users/cully/Documents/ros-ikuai-monitor-panel-github-sync-20260707-accept",
  "C:/Users/cully/Documents/ros-ikuai-monitor-panel-review-1864221",
  "C:/Users/cully/Documents/ros-ikuai-monitor-panel-review-a24e3c3",
  "C:/Users/cully/Documents/ros-ikuai-monitor-panel-review-dc77fe3",
  "C:/Users/cully/Documents/ros-ikuai-monitor-panel-v154-work",
];
for (const root of roots) {
  const files = [
    path.join(root, "src/panel-framework/mobile/mobile-patrol.css"),
    path.join(root, "src/panel-framework/mobile/mobile-domain.css"),
    path.join(root, "src/panel-framework/overview/desktop-overview/styles/desktop-overview.css"),
  ];
  if (files.some((file) => fs.existsSync(file))) console.log(JSON.stringify({ root, files: files.map((file) => fs.existsSync(file) ? fs.statSync(file).size : null) }));
}
