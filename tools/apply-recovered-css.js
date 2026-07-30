const fs = require("node:fs");
for (const [source, target] of [
  ["_acceptance/grouped-css-mobile-patrol.css", "src/panel-framework/mobile/mobile-patrol.css"],
  ["_acceptance/grouped-css-mobile-domain.css", "src/panel-framework/mobile/mobile-domain.css"],
  ["_acceptance/grouped-css-desktop-overview.css", "src/panel-framework/overview/desktop-overview/styles/desktop-overview.css"],
]) fs.copyFileSync(source, target);
