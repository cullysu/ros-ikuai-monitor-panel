export const MOBILE_OVERVIEW_PRODUCT_STYLES = `
/* v940: product-structure pass.  Pull the mobile home away from "card stack"
   into a compact router App: one core judgment rail, restrained semantic
   colors, list-group separators, and incident visuals that read as equipment
   state rather than decorative widgets. */
@media (max-width: 760px) {
  #overview.router-overview-framework .ik-v420-app,
  .router-overview-framework .ik-v420-app,
  .ik-v420-app {
    --blue: var(--ik-blue) !important;
    --blue-2: #78b7f4 !important;
    --text: var(--ik-ink) !important;
    --muted: var(--ik-muted) !important;
    --subtle: var(--ik-quiet) !important;
    --green: var(--ik-ok) !important;
    --warn: var(--ik-warn) !important;
    --red: var(--ik-danger) !important;
    background: linear-gradient(180deg, var(--ik-page-top) 0%, var(--ik-page) 100%) !important;
  }

  #overview.router-overview-framework .ik-v420-screen > * + *,
  .router-overview-framework .ik-v420-screen > * + *,
  .ik-v420-screen > * + * {
    margin-top: var(--ik-space-3) !important;
  }

  #overview.router-overview-framework .ik-v940-core-rail,
  .router-overview-framework .ik-v940-core-rail,
  .ik-v940-core-rail {
    display: grid !important;
    grid-template-columns: 1.18fr .82fr .82fr 1fr .92fr !important;
    align-items: stretch !important;
    height: 34px !important;
    min-height: 34px !important;
    border-top: 1px solid var(--ik-line-soft) !important;
    border-bottom: 1px solid var(--ik-line-soft) !important;
    background: rgba(247, 251, 255, .64) !important;
    overflow: hidden !important;
  }

  #overview.router-overview-framework .ik-v940-core-rail span,
  .router-overview-framework .ik-v940-core-rail span,
  .ik-v940-core-rail span {
    display: grid !important;
    align-content: center !important;
    gap: 1px !important;
    min-width: 0 !important;
    padding: 0 5px !important;
    border-left: 1px solid var(--ik-line-soft) !important;
  }

  #overview.router-overview-framework .ik-v940-core-rail span:first-child,
  .router-overview-framework .ik-v940-core-rail span:first-child,
  .ik-v940-core-rail span:first-child {
    border-left: 0 !important;
  }

  #overview.router-overview-framework .ik-v940-core-rail em,
  .router-overview-framework .ik-v940-core-rail em,
  .ik-v940-core-rail em {
    color: var(--ik-quiet) !important;
    font-size: 7.1px !important;
    font-style: normal !important;
    font-weight: 680 !important;
    line-height: 9px !important;
    white-space: nowrap !important;
  }

  #overview.router-overview-framework .ik-v940-core-rail strong,
  .router-overview-framework .ik-v940-core-rail strong,
  .ik-v940-core-rail strong {
    color: var(--ik-ink) !important;
    font-size: 8.7px !important;
    font-weight: 820 !important;
    line-height: 11px !important;
    letter-spacing: -.08px !important;
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
  }

  #overview.router-overview-framework .ik-v940-core-rail .is-danger strong,
  .router-overview-framework .ik-v940-core-rail .is-danger strong,
  .ik-v940-core-rail .is-danger strong {
    color: var(--ik-danger) !important;
  }

  #overview.router-overview-framework .ik-v940-core-rail .is-warn strong,
  #overview.router-overview-framework .ik-v940-core-rail .is-missing strong,
  .router-overview-framework .ik-v940-core-rail .is-warn strong,
  .router-overview-framework .ik-v940-core-rail .is-missing strong,
  .ik-v940-core-rail .is-warn strong,
  .ik-v940-core-rail .is-missing strong {
    color: var(--ik-warn) !important;
  }

  #overview.router-overview-framework .ik-v420-hero,
  .router-overview-framework .ik-v420-hero,
  .ik-v420-hero {
    max-height: 196px !important;
    grid-template-rows: auto minmax(58px, auto) 18px !important;
    gap: 4px !important;
    padding: 7px 9px 6px !important;
    border-radius: var(--ik-radius-list) !important;
    background: var(--ik-group) !important;
    box-shadow: none !important;
    border-top: 1px solid var(--ik-line-soft) !important;
    border-bottom: 1px solid var(--ik-line-soft) !important;
  }

  #overview.router-overview-framework .ik-v420-hero.is-danger,
  #overview.router-overview-framework .ik-v420-hero.is-warn,
  #overview.router-overview-framework .ik-v420-hero.is-missing,
  .router-overview-framework .ik-v420-hero.is-danger,
  .router-overview-framework .ik-v420-hero.is-warn,
  .router-overview-framework .ik-v420-hero.is-missing,
  .ik-v420-hero.is-danger,
  .ik-v420-hero.is-warn,
  .ik-v420-hero.is-missing {
    background: var(--ik-group) !important;
  }

  #overview.router-overview-framework .ik-v420-hero::before,
  .router-overview-framework .ik-v420-hero::before,
  .ik-v420-hero::before {
    inset: 8px auto auto 0 !important;
    height: 22px !important;
    width: 2px !important;
    opacity: .58 !important;
  }

  #overview.router-overview-framework .ik-v620-hero-head h1,
  .router-overview-framework .ik-v620-hero-head h1,
  .ik-v620-hero-head h1 {
    font-size: var(--ik-font-title) !important;
    line-height: 18px !important;
    letter-spacing: -.18px !important;
  }

  #overview.router-overview-framework .ik-v620-hero-head p,
  .router-overview-framework .ik-v620-hero-head p,
  .ik-v620-hero-head p {
    font-size: 9.6px !important;
    line-height: 11px !important;
  }

  #overview.router-overview-framework .ik-v620-hero-stage,
  .router-overview-framework .ik-v620-hero-stage,
  .ik-v620-hero-stage {
    grid-template-columns: 78px minmax(0, 1fr) !important;
    gap: var(--ik-space-3) !important;
    align-items: stretch !important;
  }

  #overview.router-overview-framework .ik-v420-hero-stats,
  .router-overview-framework .ik-v420-hero-stats,
  .ik-v420-hero-stats {
    display: grid !important;
    grid-template-rows: repeat(4, 13px) !important;
    gap: 1px !important;
    margin: 0 !important;
    align-self: center !important;
  }

  #overview.router-overview-framework .ik-v420-hero-stats span,
  .router-overview-framework .ik-v420-hero-stats span,
  .ik-v420-hero-stats span {
    display: grid !important;
    grid-template-columns: 27px minmax(0, 1fr) !important;
    align-items: center !important;
    min-height: 13px !important;
    padding: 0 !important;
    border-radius: 0 !important;
    background: transparent !important;
    box-shadow: none !important;
  }

  #overview.router-overview-framework .ik-v420-hero-stats em,
  .router-overview-framework .ik-v420-hero-stats em,
  .ik-v420-hero-stats em {
    color: var(--ik-quiet) !important;
    font-size: 7.1px !important;
    line-height: 13px !important;
  }

  #overview.router-overview-framework .ik-v420-hero-stats b,
  .router-overview-framework .ik-v420-hero-stats b,
  .ik-v420-hero-stats b {
    color: var(--ik-ink) !important;
    font-size: 8.8px !important;
    line-height: 13px !important;
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
  }

  #overview.router-overview-framework .ik-v420-hero-stats .is-danger b,
  .router-overview-framework .ik-v420-hero-stats .is-danger b,
  .ik-v420-hero-stats .is-danger b {
    color: var(--ik-danger) !important;
  }

  #overview.router-overview-framework .ik-v420-hero-stats .is-warn b,
  #overview.router-overview-framework .ik-v420-hero-stats .is-missing b,
  .router-overview-framework .ik-v420-hero-stats .is-warn b,
  .router-overview-framework .ik-v420-hero-stats .is-missing b,
  .ik-v420-hero-stats .is-warn b,
  .ik-v420-hero-stats .is-missing b {
    color: var(--ik-warn) !important;
  }

  #overview.router-overview-framework .ik-v420-visual,
  .router-overview-framework .ik-v420-visual,
  .ik-v420-visual {
    height: 62px !important;
    min-height: 58px !important;
    max-height: 72px !important;
  }

  #overview.router-overview-framework .ik-v812-trend-visual,
  .router-overview-framework .ik-v812-trend-visual,
  .ik-v812-trend-visual {
    grid-template-columns: minmax(0, 1fr) 52px !important;
    min-height: 62px !important;
  }

  #overview.router-overview-framework .ik-v420-line-chart,
  .router-overview-framework .ik-v420-line-chart,
  .ik-v420-line-chart {
    height: 62px !important;
  }

  #overview.router-overview-framework .ik-v420-gridline,
  .router-overview-framework .ik-v420-gridline,
  .ik-v420-gridline {
    stroke: rgba(154, 180, 207, .28) !important;
  }

  #overview.router-overview-framework .ik-v945-reference-line,
  .router-overview-framework .ik-v945-reference-line,
  .ik-v945-reference-line {
    fill: none !important;
    stroke: rgba(120, 143, 166, .34) !important;
    stroke-width: .7 !important;
    stroke-dasharray: 3 4 !important;
  }

  #overview.router-overview-framework .ik-v945-current-line,
  .router-overview-framework .ik-v945-current-line,
  .ik-v945-current-line {
    fill: none !important;
    stroke: rgba(20, 115, 230, .28) !important;
    stroke-width: .75 !important;
  }

  #overview.router-overview-framework .ik-v945-chart-caption,
  .router-overview-framework .ik-v945-chart-caption,
  .ik-v945-chart-caption {
    fill: var(--ik-quiet) !important;
    font-size: 7px !important;
    font-weight: 680 !important;
  }

  #overview.router-overview-framework .ik-v420-area,
  .router-overview-framework .ik-v420-area,
  .ik-v420-area {
    fill: rgba(20, 115, 230, .045) !important;
  }

  #overview.router-overview-framework .ik-v420-curve,
  .router-overview-framework .ik-v420-curve,
  .ik-v420-curve {
    stroke-width: 1.25 !important;
  }

  #overview.router-overview-framework .ik-v945-start-dot,
  .router-overview-framework .ik-v945-start-dot,
  .ik-v945-start-dot {
    fill: #9eb2c6 !important;
    stroke: var(--ik-page-top) !important;
    stroke-width: 1.2 !important;
  }

  #overview.router-overview-framework .ik-v420-port-matrix,
  .router-overview-framework .ik-v420-port-matrix,
  .ik-v420-port-matrix {
    display: grid !important;
    grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
    min-height: 58px !important;
    border: 1px solid var(--ik-line-soft) !important;
    border-right: 0 !important;
    border-bottom: 0 !important;
    background: transparent !important;
  }

  #overview.router-overview-framework .ik-v420-port-matrix span,
  .router-overview-framework .ik-v420-port-matrix span,
  .ik-v420-port-matrix span {
    display: grid !important;
    grid-template-columns: 3px minmax(0, 1fr) auto !important;
    grid-template-areas: "mark port state" "mark carrier carrier" !important;
    align-items: center !important;
    min-height: 29px !important;
    padding: 2px 5px 2px 0 !important;
    gap: 0 4px !important;
    border: 0 !important;
    border-right: 1px solid var(--ik-line-soft) !important;
    border-bottom: 1px solid var(--ik-line-soft) !important;
    border-radius: 0 !important;
    background: transparent !important;
    box-shadow: none !important;
  }

  #overview.router-overview-framework .ik-v420-port-matrix i,
  .router-overview-framework .ik-v420-port-matrix i,
  .ik-v420-port-matrix i {
    grid-area: mark !important;
    width: 2px !important;
    height: 18px !important;
    border-radius: 0 !important;
    background: var(--ik-ok) !important;
  }

  #overview.router-overview-framework .ik-v420-port-matrix .is-danger i,
  .router-overview-framework .ik-v420-port-matrix .is-danger i,
  .ik-v420-port-matrix .is-danger i {
    background: var(--ik-danger) !important;
  }

  #overview.router-overview-framework .ik-v420-port-matrix b,
  .router-overview-framework .ik-v420-port-matrix b,
  .ik-v420-port-matrix b {
    grid-area: port !important;
    font-size: 9.3px !important;
    line-height: 11px !important;
  }

  #overview.router-overview-framework .ik-v420-port-matrix small,
  .router-overview-framework .ik-v420-port-matrix small,
  .ik-v420-port-matrix small {
    grid-area: carrier !important;
    color: var(--ik-muted) !important;
    font-size: 7.2px !important;
    line-height: 9px !important;
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
  }

  #overview.router-overview-framework .ik-v420-port-matrix em,
  .router-overview-framework .ik-v420-port-matrix em,
  .ik-v420-port-matrix em {
    grid-area: state !important;
    color: var(--ik-muted) !important;
    font-size: 7px !important;
    font-style: normal !important;
    line-height: 11px !important;
    white-space: nowrap !important;
  }

  #overview.router-overview-framework .ik-v420-port-matrix .is-danger em,
  .router-overview-framework .ik-v420-port-matrix .is-danger em,
  .ik-v420-port-matrix .is-danger em {
    color: var(--ik-danger) !important;
  }

  #overview.router-overview-framework .ik-v420-resource-visual.ik-v620-pressure-visual,
  .router-overview-framework .ik-v420-resource-visual.ik-v620-pressure-visual,
  .ik-v420-resource-visual.ik-v620-pressure-visual {
    min-height: 58px !important;
    grid-template-rows: repeat(3, 17px) !important;
    gap: 2px !important;
    padding: 2px 3px !important;
    border: 0 !important;
  }

  #overview.router-overview-framework .ik-v420-resource-visual.ik-v620-pressure-visual .ik-v420-resource-meter,
  .router-overview-framework .ik-v420-resource-visual.ik-v620-pressure-visual .ik-v420-resource-meter,
  .ik-v420-resource-visual.ik-v620-pressure-visual .ik-v420-resource-meter {
    grid-template-columns: 24px 34px 32px 38px minmax(0, 1fr) !important;
    min-height: 17px !important;
  }

  #overview.router-overview-framework .ik-v420-resource-visual.ik-v620-pressure-visual .ik-v420-resource-meter > i,
  .router-overview-framework .ik-v420-resource-visual.ik-v620-pressure-visual .ik-v420-resource-meter > i,
  .ik-v420-resource-visual.ik-v620-pressure-visual .ik-v420-resource-meter > i {
    height: 1px !important;
    background: rgba(139, 164, 190, .24) !important;
  }

  #overview.router-overview-framework .ik-v420-resource-visual.ik-v620-pressure-visual .ik-v420-resource-meter > i > i,
  .router-overview-framework .ik-v420-resource-visual.ik-v620-pressure-visual .ik-v420-resource-meter > i > i,
  .ik-v420-resource-visual.ik-v620-pressure-visual .ik-v420-resource-meter > i > i {
    background: var(--ik-danger) !important;
    opacity: .72 !important;
  }

  #overview.router-overview-framework .ik-v420-timeline,
  .router-overview-framework .ik-v420-timeline,
  .ik-v420-timeline,
  #overview.router-overview-framework .ik-v420-list,
  .router-overview-framework .ik-v420-list,
  .ik-v420-list {
    border-radius: var(--ik-radius-list) !important;
    background: var(--ik-group) !important;
    box-shadow: none !important;
    border-top: 1px solid var(--ik-line-soft) !important;
    border-bottom: 1px solid var(--ik-line-soft) !important;
  }

  #overview.router-overview-framework .ik-v420-list-row > i,
  .router-overview-framework .ik-v420-list-row > i,
  .ik-v420-list-row > i {
    border-radius: 5px !important;
    background: rgba(20, 115, 230, .055) !important;
    box-shadow: inset 0 0 0 1px rgba(20, 115, 230, .18) !important;
  }

  #overview.router-overview-framework .ik-v420-list-row.is-danger > i,
  .router-overview-framework .ik-v420-list-row.is-danger > i,
  .ik-v420-list-row.is-danger > i {
    background: rgba(184, 58, 50, .045) !important;
    box-shadow: inset 0 0 0 1px rgba(184, 58, 50, .20) !important;
    color: var(--ik-danger) !important;
  }

  #overview.router-overview-framework .ik-v420-list-row strong,
  .router-overview-framework .ik-v420-list-row strong,
  .ik-v420-list-row strong {
    color: var(--ik-ink) !important;
  }

  #overview.router-overview-framework .ik-v420-list-row.is-danger strong,
  .router-overview-framework .ik-v420-list-row.is-danger strong,
  .ik-v420-list-row.is-danger strong {
    color: var(--ik-ink) !important;
  }

  #overview.router-overview-framework .ik-v420-app-list u i,
  .router-overview-framework .ik-v420-app-list u i,
  .ik-v420-app-list u i {
    background: var(--ik-blue-line) !important;
  }

  #overview.router-overview-framework .ik-v420-tabs,
  .router-overview-framework .ik-v420-tabs,
  .ik-v420-tabs {
    height: 62px !important;
    min-height: 62px !important;
    border-radius: 0 !important;
    background: rgba(250, 252, 255, .94) !important;
    box-shadow: 0 -1px 0 rgba(142, 169, 196, .28) !important;
  }

  #overview.router-overview-framework .ik-v420-tabs button.is-active svg,
  .router-overview-framework .ik-v420-tabs button.is-active svg,
  .ik-v420-tabs button.is-active svg {
    background: transparent !important;
    box-shadow: none !important;
  }

  /* v950: high-density read-only monitor home.
     Remove duplicate trust rails, keep the first screen to judgment + compact
     status ledger + real object ranking.  No decorative card inflation. */
  #overview.router-overview-framework .ik-v420-app,
  .router-overview-framework .ik-v420-app,
  .ik-v420-app {
    background: var(--ik-page) !important;
  }

  #overview.router-overview-framework .ik-v420-screen,
  .router-overview-framework .ik-v420-screen,
  .ik-v420-screen {
    padding: max(6px, env(safe-area-inset-top, 0px)) 14px calc(70px + env(safe-area-inset-bottom, 0px)) !important;
  }

  #overview.router-overview-framework .ik-v420-screen > * + *,
  .router-overview-framework .ik-v420-screen > * + *,
  .ik-v420-screen > * + * {
    margin-top: 6px !important;
  }

  #overview.router-overview-framework .ik-v910-trust-strip,
  #overview.router-overview-framework .ik-v940-core-rail,
  .router-overview-framework .ik-v910-trust-strip,
  .router-overview-framework .ik-v940-core-rail,
  .ik-v910-trust-strip,
  .ik-v940-core-rail {
    display: none !important;
  }

  #overview.router-overview-framework .ik-v420-nav,
  .router-overview-framework .ik-v420-nav,
  .ik-v420-nav {
    height: 50px !important;
    min-height: 50px !important;
    grid-template-columns: 40px minmax(0, 1fr) auto !important;
    gap: 7px !important;
  }

  #overview.router-overview-framework .ik-v420-nav button,
  .router-overview-framework .ik-v420-nav button,
  .ik-v420-nav button {
    width: 40px !important;
    height: 40px !important;
    border-radius: 10px !important;
    background: transparent !important;
    box-shadow: none !important;
  }

  #overview.router-overview-framework .ik-v420-nav div,
  .router-overview-framework .ik-v420-nav div,
  .ik-v420-nav div {
    gap: 1px !important;
  }

  #overview.router-overview-framework .ik-v420-nav div b,
  .router-overview-framework .ik-v420-nav div b,
  .ik-v420-nav div b {
    font-size: 16px !important;
    line-height: 18px !important;
    letter-spacing: -.24px !important;
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
  }

  #overview.router-overview-framework .ik-v420-nav div span,
  .router-overview-framework .ik-v420-nav div span,
  .ik-v420-nav div span {
    font-size: 10.4px !important;
    line-height: 12px !important;
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
  }

  #overview.router-overview-framework .ik-v420-nav strong,
  .router-overview-framework .ik-v420-nav strong,
  .ik-v420-nav strong {
    min-height: 22px !important;
    gap: 4px !important;
    padding: 0 7px !important;
    border-radius: 999px !important;
    background: rgba(255,255,255,.64) !important;
    box-shadow: inset 0 0 0 1px rgba(151, 184, 213, .42) !important;
    font-size: 10px !important;
    line-height: 22px !important;
  }

  #overview.router-overview-framework .ik-v420-nav strong i,
  .router-overview-framework .ik-v420-nav strong i,
  .ik-v420-nav strong i {
    width: 5px !important;
    height: 5px !important;
  }

  #overview.router-overview-framework .ik-v420-hero,
  .router-overview-framework .ik-v420-hero,
  .ik-v420-hero {
    min-height: 0 !important;
    max-height: 220px !important;
    grid-template-rows: auto minmax(58px, auto) 17px !important;
    gap: 5px !important;
    padding: 8px 10px 7px !important;
    border: 1px solid var(--ik-line) !important;
    border-radius: 8px !important;
    background: linear-gradient(180deg, rgba(255,255,255,.86), rgba(250,253,255,.82)) !important;
    box-shadow: none !important;
  }

  #overview.router-overview-framework .ik-v420-hero.is-danger,
  #overview.router-overview-framework .ik-v420-hero.is-warn,
  #overview.router-overview-framework .ik-v420-hero.is-missing,
  .router-overview-framework .ik-v420-hero.is-danger,
  .router-overview-framework .ik-v420-hero.is-warn,
  .router-overview-framework .ik-v420-hero.is-missing,
  .ik-v420-hero.is-danger,
  .ik-v420-hero.is-warn,
  .ik-v420-hero.is-missing {
    background: linear-gradient(180deg, rgba(255,255,255,.88), rgba(252,253,255,.80)) !important;
  }

  #overview.router-overview-framework .ik-v420-hero::before,
  .router-overview-framework .ik-v420-hero::before,
  .ik-v420-hero::before {
    inset: 8px auto 8px 0 !important;
    width: 2px !important;
    height: auto !important;
    opacity: .68 !important;
  }

  #overview.router-overview-framework .ik-v620-hero-head,
  .router-overview-framework .ik-v620-hero-head,
  .ik-v620-hero-head {
    gap: 2px !important;
  }

  #overview.router-overview-framework .ik-v620-hero-head h1,
  .router-overview-framework .ik-v620-hero-head h1,
  .ik-v620-hero-head h1 {
    font-size: 17px !important;
    line-height: 19px !important;
    letter-spacing: -.22px !important;
  }

  #overview.router-overview-framework .ik-v620-hero-head p,
  .router-overview-framework .ik-v620-hero-head p,
  .ik-v620-hero-head p {
    max-height: 22px !important;
    font-size: 9.6px !important;
    line-height: 11px !important;
    overflow: hidden !important;
  }

  #overview.router-overview-framework .ik-v620-hero-stage,
  .router-overview-framework .ik-v620-hero-stage,
  .ik-v620-hero-stage {
    grid-template-columns: 90px minmax(0, 1fr) !important;
    gap: 7px !important;
    min-height: 60px !important;
  }

  #overview.router-overview-framework .ik-v420-hero-stats,
  .router-overview-framework .ik-v420-hero-stats,
  .ik-v420-hero-stats {
    grid-template-rows: repeat(4, 13px) !important;
    gap: 1px !important;
  }

  #overview.router-overview-framework .ik-v420-hero-stats span,
  .router-overview-framework .ik-v420-hero-stats span,
  .ik-v420-hero-stats span {
    grid-template-columns: 27px minmax(0, 1fr) !important;
    min-height: 13px !important;
  }

  #overview.router-overview-framework .ik-v420-hero-stats em,
  .router-overview-framework .ik-v420-hero-stats em,
  .ik-v420-hero-stats em {
    font-size: 7px !important;
  }

  #overview.router-overview-framework .ik-v420-hero-stats b,
  .router-overview-framework .ik-v420-hero-stats b,
  .ik-v420-hero-stats b {
    font-size: 8.2px !important;
  }

  #overview.router-overview-framework .ik-v420-visual,
  .router-overview-framework .ik-v420-visual,
  .ik-v420-visual {
    height: 60px !important;
    min-height: 58px !important;
    max-height: 68px !important;
    padding: 0 !important;
    background: transparent !important;
    border: 0 !important;
    box-shadow: none !important;
  }

  #overview.router-overview-framework .ik-v812-trend-visual,
  .router-overview-framework .ik-v812-trend-visual,
  .ik-v812-trend-visual {
    grid-template-columns: minmax(0, 1fr) 48px !important;
    min-height: 60px !important;
  }

  #overview.router-overview-framework .ik-v812-trend-visual aside span,
  .router-overview-framework .ik-v812-trend-visual aside span,
  .ik-v812-trend-visual aside span {
    min-height: 12px !important;
    gap: 1px !important;
  }

  #overview.router-overview-framework .ik-v812-trend-visual aside em,
  .router-overview-framework .ik-v812-trend-visual aside em,
  .ik-v812-trend-visual aside em {
    font-size: 6.8px !important;
  }

  #overview.router-overview-framework .ik-v812-trend-visual aside b,
  .router-overview-framework .ik-v812-trend-visual aside b,
  .ik-v812-trend-visual aside b {
    font-size: 8px !important;
  }

  #overview.router-overview-framework .ik-v420-line-chart,
  .router-overview-framework .ik-v420-line-chart,
  .ik-v420-line-chart {
    height: 60px !important;
  }

  #overview.router-overview-framework .ik-v420-line-chart text,
  .router-overview-framework .ik-v420-line-chart text,
  .ik-v420-line-chart text,
  #overview.router-overview-framework .ik-v945-chart-caption,
  .router-overview-framework .ik-v945-chart-caption,
  .ik-v945-chart-caption {
    font-size: 6.8px !important;
    font-weight: 680 !important;
  }

  #overview.router-overview-framework .ik-v503-hero-pills,
  .router-overview-framework .ik-v503-hero-pills,
  .ik-v503-hero-pills {
    display: grid !important;
    grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
    gap: 0 !important;
    min-height: 17px !important;
    padding-top: 2px !important;
    border-top: 1px solid var(--ik-line-soft) !important;
  }

  #overview.router-overview-framework .ik-v503-hero-pills span,
  .router-overview-framework .ik-v503-hero-pills span,
  .ik-v503-hero-pills span {
    display: grid !important;
    grid-template-columns: auto minmax(0, 1fr) !important;
    align-items: center !important;
    gap: 4px !important;
    max-width: none !important;
    height: 15px !important;
    min-width: 0 !important;
    padding: 0 6px !important;
    border-left: 1px solid var(--ik-line-soft) !important;
    border-radius: 0 !important;
    background: transparent !important;
    box-shadow: none !important;
  }

  #overview.router-overview-framework .ik-v503-hero-pills span:first-child,
  .router-overview-framework .ik-v503-hero-pills span:first-child,
  .ik-v503-hero-pills span:first-child {
    border-left: 0 !important;
    padding-left: 0 !important;
  }

  #overview.router-overview-framework .ik-v503-hero-pills b,
  .router-overview-framework .ik-v503-hero-pills b,
  .ik-v503-hero-pills b {
    color: var(--ik-quiet) !important;
    font-size: 7px !important;
    font-weight: 700 !important;
    white-space: nowrap !important;
  }

  #overview.router-overview-framework .ik-v503-hero-pills strong,
  .router-overview-framework .ik-v503-hero-pills strong,
  .ik-v503-hero-pills strong {
    color: var(--ik-ink) !important;
    font-size: 8.4px !important;
    font-weight: 820 !important;
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
  }

  #overview.router-overview-framework .ik-v420-surface,
  .router-overview-framework .ik-v420-surface,
  .ik-v420-surface {
    gap: 7px !important;
    margin-top: 0 !important;
  }

  #overview.router-overview-framework .ik-v420-timeline,
  .router-overview-framework .ik-v420-timeline,
  .ik-v420-timeline {
    padding: 0 12px !important;
    border-radius: 8px !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row,
  .router-overview-framework .ik-v420-timeline-row,
  .ik-v420-timeline-row {
    grid-template-columns: 10px 72px minmax(0, 1fr) !important;
    grid-template-areas: "dot title value" "dot title note" !important;
    gap: 0 7px !important;
    min-height: 46px !important;
    padding: 4px 0 !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row > i,
  .router-overview-framework .ik-v420-timeline-row > i,
  .ik-v420-timeline-row > i {
    grid-area: dot !important;
    width: 5px !important;
    height: 5px !important;
    box-shadow: none !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row b,
  .router-overview-framework .ik-v420-timeline-row b,
  .ik-v420-timeline-row b {
    grid-area: title !important;
    font-size: 12px !important;
    line-height: 14px !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row strong,
  .router-overview-framework .ik-v420-timeline-row strong,
  .ik-v420-timeline-row strong {
    grid-area: value !important;
    font-size: 12px !important;
    line-height: 14px !important;
    text-align: right !important;
    white-space: nowrap !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row em,
  .router-overview-framework .ik-v420-timeline-row em,
  .ik-v420-timeline-row em {
    grid-area: note !important;
    margin: 0 !important;
    font-size: 9.6px !important;
    line-height: 12px !important;
    text-align: right !important;
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
  }

  #overview.router-overview-framework .ik-v420-list,
  .router-overview-framework .ik-v420-list,
  .ik-v420-list {
    border-radius: 8px !important;
  }

  #overview.router-overview-framework .ik-v420-list header,
  .router-overview-framework .ik-v420-list header,
  .ik-v420-list header {
    min-height: 26px !important;
    margin: 0 !important;
    padding: 0 0 4px !important;
  }

  #overview.router-overview-framework .ik-v420-list header b,
  .router-overview-framework .ik-v420-list header b,
  .ik-v420-list header b {
    font-size: 12.5px !important;
    line-height: 14px !important;
  }

  #overview.router-overview-framework .ik-v420-list header span,
  .router-overview-framework .ik-v420-list header span,
  .ik-v420-list header span {
    font-size: 9px !important;
    line-height: 12px !important;
  }

  #overview.router-overview-framework .ik-v420-list-row,
  .router-overview-framework .ik-v420-list-row,
  .ik-v420-list-row {
    grid-template-columns: 28px minmax(0, 1fr) 48px !important;
    gap: 7px !important;
    min-height: 54px !important;
    padding: 5px 0 !important;
  }

  #overview.router-overview-framework .ik-v420-list-row > i,
  .router-overview-framework .ik-v420-list-row > i,
  .ik-v420-list-row > i {
    width: 28px !important;
    height: 28px !important;
    border-radius: 5px !important;
  }

  #overview.router-overview-framework .ik-v420-list-row span,
  .router-overview-framework .ik-v420-list-row span,
  .ik-v420-list-row span {
    gap: 1px !important;
  }

  #overview.router-overview-framework .ik-v420-list-row span b,
  .router-overview-framework .ik-v420-list-row span b,
  .ik-v420-list-row span b {
    font-size: 12.2px !important;
    line-height: 14px !important;
    white-space: nowrap !important;
  }

  #overview.router-overview-framework .ik-v420-list-row span em,
  .router-overview-framework .ik-v420-list-row span em,
  .ik-v420-list-row span em {
    font-size: 9.8px !important;
    line-height: 12px !important;
    white-space: nowrap !important;
  }

  #overview.router-overview-framework .ik-v420-app-list u,
  .router-overview-framework .ik-v420-app-list u,
  .ik-v420-app-list u {
    height: 2px !important;
    margin-top: 2px !important;
  }

  #overview.router-overview-framework .ik-v420-list-row strong,
  .router-overview-framework .ik-v420-list-row strong,
  .ik-v420-list-row strong {
    gap: 0 !important;
    min-width: 48px !important;
  }

  #overview.router-overview-framework .ik-v420-list-row strong b,
  .router-overview-framework .ik-v420-list-row strong b,
  .ik-v420-list-row strong b {
    font-size: 12px !important;
    line-height: 13px !important;
  }

  #overview.router-overview-framework .ik-v420-list-row strong small,
  .router-overview-framework .ik-v420-list-row strong small,
  .ik-v420-list-row strong small {
    font-size: 8.8px !important;
    line-height: 10px !important;
  }

  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v420-hero,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v420-hero,
  [data-overview-mobile-scene="resource-full"] .ik-v420-hero {
    max-height: 226px !important;
  }

  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v420-visual,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v420-visual,
  [data-overview-mobile-scene="resource-full"] .ik-v420-visual {
    height: 62px !important;
    min-height: 58px !important;
    padding: 0 !important;
    background: transparent !important;
  }

  #overview.router-overview-framework .ik-v420-resource-visual.ik-v620-pressure-visual,
  .router-overview-framework .ik-v420-resource-visual.ik-v620-pressure-visual,
  .ik-v420-resource-visual.ik-v620-pressure-visual {
    min-height: 58px !important;
    grid-template-rows: repeat(3, 17px) !important;
    gap: 2px !important;
  }

  #overview.router-overview-framework .ik-v420-tabs,
  .router-overview-framework .ik-v420-tabs,
  .ik-v420-tabs {
    height: calc(64px + env(safe-area-inset-bottom, 0px)) !important;
    min-height: calc(64px + env(safe-area-inset-bottom, 0px)) !important;
    padding: 6px 8px env(safe-area-inset-bottom, 0px) !important;
  }

  #overview.router-overview-framework .ik-v420-tabs button,
  .router-overview-framework .ik-v420-tabs button,
  .ik-v420-tabs button {
    min-height: 50px !important;
    padding: 3px 0 4px !important;
    font-size: 9.5px !important;
  }

  #overview.router-overview-framework .ik-v420-tabs svg,
  .router-overview-framework .ik-v420-tabs svg,
  .ik-v420-tabs svg {
    width: 17px !important;
    height: 17px !important;
  }

  /* v960: judgement bus + scene-weighted mobile home.
     This is the phone App rhythm: compact conclusion first, then the one
     visual needed for the current priority, then only the relevant objects. */
  #overview.router-overview-framework .ik-v960-judgement-strip,
  .router-overview-framework .ik-v960-judgement-strip,
  .ik-v960-judgement-strip {
    display: grid !important;
    grid-template-columns: 78px minmax(0, 1fr) !important;
    align-items: stretch !important;
    min-height: 44px !important;
    overflow: hidden !important;
    border-top: 1px solid rgba(164, 184, 205, .26) !important;
    border-bottom: 1px solid rgba(164, 184, 205, .26) !important;
    background: rgba(255,255,255,.46) !important;
  }

  #overview.router-overview-framework .ik-v960-judgement-strip > strong,
  .router-overview-framework .ik-v960-judgement-strip > strong,
  .ik-v960-judgement-strip > strong {
    display: grid !important;
    grid-template-columns: 7px minmax(0, 1fr) !important;
    grid-template-areas: "dot value" "dot note" !important;
    align-content: center !important;
    gap: 1px 5px !important;
    min-width: 0 !important;
    padding: 0 7px 0 2px !important;
    border-right: 1px solid rgba(164, 184, 205, .24) !important;
  }

  #overview.router-overview-framework .ik-v960-judgement-strip > strong i,
  .router-overview-framework .ik-v960-judgement-strip > strong i,
  .ik-v960-judgement-strip > strong i {
    grid-area: dot !important;
    align-self: center !important;
    width: 5px !important;
    height: 5px !important;
    border-radius: 99px !important;
    background: var(--ik-ok) !important;
  }

  #overview.router-overview-framework .ik-v960-judgement-strip.is-danger > strong i,
  .router-overview-framework .ik-v960-judgement-strip.is-danger > strong i,
  .ik-v960-judgement-strip.is-danger > strong i {
    background: var(--ik-danger) !important;
  }

  #overview.router-overview-framework .ik-v960-judgement-strip.is-warn > strong i,
  #overview.router-overview-framework .ik-v960-judgement-strip.is-missing > strong i,
  .router-overview-framework .ik-v960-judgement-strip.is-warn > strong i,
  .router-overview-framework .ik-v960-judgement-strip.is-missing > strong i,
  .ik-v960-judgement-strip.is-warn > strong i,
  .ik-v960-judgement-strip.is-missing > strong i {
    background: var(--ik-warn) !important;
  }

  #overview.router-overview-framework .ik-v960-judgement-strip > strong b,
  .router-overview-framework .ik-v960-judgement-strip > strong b,
  .ik-v960-judgement-strip > strong b {
    grid-area: value !important;
    color: var(--ik-ink) !important;
    font-size: 12.2px !important;
    font-weight: 840 !important;
    line-height: 14px !important;
    white-space: nowrap !important;
  }

  #overview.router-overview-framework .ik-v960-judgement-strip > strong em,
  .router-overview-framework .ik-v960-judgement-strip > strong em,
  .ik-v960-judgement-strip > strong em {
    grid-area: note !important;
    color: var(--ik-muted) !important;
    font-size: 8.4px !important;
    font-style: normal !important;
    font-weight: 680 !important;
    line-height: 10px !important;
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
  }

  #overview.router-overview-framework .ik-v960-judgement-strip > div,
  .router-overview-framework .ik-v960-judgement-strip > div,
  .ik-v960-judgement-strip > div {
    display: grid !important;
    grid-template-columns: .72fr .82fr 1fr .86fr !important;
    min-width: 0 !important;
  }

  #overview.router-overview-framework .ik-v960-judgement-strip span,
  .router-overview-framework .ik-v960-judgement-strip span,
  .ik-v960-judgement-strip span {
    display: grid !important;
    align-content: center !important;
    min-width: 0 !important;
    padding: 0 5px !important;
    border-left: 1px solid rgba(164, 184, 205, .18) !important;
  }

  #overview.router-overview-framework .ik-v960-judgement-strip span:first-child,
  .router-overview-framework .ik-v960-judgement-strip span:first-child,
  .ik-v960-judgement-strip span:first-child {
    border-left: 0 !important;
  }

  #overview.router-overview-framework .ik-v960-judgement-strip span em,
  .router-overview-framework .ik-v960-judgement-strip span em,
  .ik-v960-judgement-strip span em {
    color: var(--ik-quiet) !important;
    font-size: 7.1px !important;
    font-style: normal !important;
    font-weight: 700 !important;
    line-height: 9px !important;
    white-space: nowrap !important;
  }

  #overview.router-overview-framework .ik-v960-judgement-strip span b,
  .router-overview-framework .ik-v960-judgement-strip span b,
  .ik-v960-judgement-strip span b {
    color: var(--ik-ink) !important;
    font-size: 8.9px !important;
    font-weight: 840 !important;
    line-height: 11px !important;
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
  }

  #overview.router-overview-framework .ik-v960-judgement-strip .is-danger b,
  .router-overview-framework .ik-v960-judgement-strip .is-danger b,
  .ik-v960-judgement-strip .is-danger b {
    color: var(--ik-danger) !important;
  }

  #overview.router-overview-framework .ik-v960-judgement-strip .is-warn b,
  #overview.router-overview-framework .ik-v960-judgement-strip .is-missing b,
  .router-overview-framework .ik-v960-judgement-strip .is-warn b,
  .router-overview-framework .ik-v960-judgement-strip .is-missing b,
  .ik-v960-judgement-strip .is-warn b,
  .ik-v960-judgement-strip .is-missing b {
    color: var(--ik-warn) !important;
  }

  #overview.router-overview-framework .ik-v420-hero,
  .router-overview-framework .ik-v420-hero,
  .ik-v420-hero {
    max-height: 184px !important;
    grid-template-rows: auto minmax(54px, auto) 16px !important;
    gap: 4px !important;
    padding: 7px 10px 6px !important;
    border: 0 !important;
    border-radius: 8px !important;
    background: rgba(255,255,255,.58) !important;
    box-shadow: inset 0 0 0 .5px rgba(156, 181, 205, .30) !important;
  }

  #overview.router-overview-framework .ik-v620-hero-head h1,
  .router-overview-framework .ik-v620-hero-head h1,
  .ik-v620-hero-head h1 {
    display: block !important;
    height: 17px !important;
    max-height: 17px !important;
    margin: 0 !important;
    overflow: hidden !important;
    font-size: 14.4px !important;
    line-height: 16px !important;
    letter-spacing: -.12px !important;
    white-space: nowrap !important;
    text-overflow: ellipsis !important;
  }

  #overview.router-overview-framework .ik-v620-hero-head p,
  .router-overview-framework .ik-v620-hero-head p,
  .ik-v620-hero-head p {
    max-height: 12px !important;
    font-size: 9px !important;
    line-height: 11px !important;
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
  }

  #overview.router-overview-framework .ik-v620-hero-stage,
  .router-overview-framework .ik-v620-hero-stage,
  .ik-v620-hero-stage {
    grid-template-columns: 88px minmax(0, 1fr) !important;
    min-height: 56px !important;
  }

  #overview.router-overview-framework .ik-v420-visual,
  .router-overview-framework .ik-v420-visual,
  .ik-v420-visual {
    height: 56px !important;
    min-height: 54px !important;
  }

  #overview.router-overview-framework .ik-v812-trend-visual,
  .router-overview-framework .ik-v812-trend-visual,
  .ik-v812-trend-visual {
    min-height: 56px !important;
  }

  #overview.router-overview-framework .ik-v420-line-chart,
  .router-overview-framework .ik-v420-line-chart,
  .ik-v420-line-chart {
    height: 56px !important;
  }

  #overview.router-overview-framework .ik-v420-port-matrix,
  .router-overview-framework .ik-v420-port-matrix,
  .ik-v420-port-matrix {
    min-height: 64px !important;
    border-color: rgba(160, 181, 202, .32) !important;
    background: rgba(255,255,255,.34) !important;
  }

  #overview.router-overview-framework .ik-v420-port-matrix span,
  .router-overview-framework .ik-v420-port-matrix span,
  .ik-v420-port-matrix span {
    grid-template-columns: 6px minmax(0, 1fr) auto !important;
    grid-template-areas: "mark port state" "mark carrier state" !important;
    min-height: 32px !important;
    padding: 3px 5px 3px 2px !important;
    background: transparent !important;
  }

  #overview.router-overview-framework .ik-v420-port-matrix i,
  .router-overview-framework .ik-v420-port-matrix i,
  .ik-v420-port-matrix i {
    width: 4px !important;
    height: 4px !important;
    border-radius: 50% !important;
    align-self: center !important;
  }

  #overview.router-overview-framework .ik-v420-port-matrix em,
  .router-overview-framework .ik-v420-port-matrix em,
  .ik-v420-port-matrix em,
  #overview.router-overview-framework .ik-v420-port-matrix .is-danger em,
  .router-overview-framework .ik-v420-port-matrix .is-danger em,
  .ik-v420-port-matrix .is-danger em {
    color: var(--ik-muted) !important;
    font-size: 7px !important;
  }

  #overview.router-overview-framework .ik-v420-channel-rail,
  .router-overview-framework .ik-v420-channel-rail,
  .ik-v420-channel-rail {
    display: grid !important;
    grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
    min-height: 56px !important;
    border: 1px solid rgba(160, 181, 202, .30) !important;
    background: rgba(255,255,255,.34) !important;
  }

  #overview.router-overview-framework .ik-v420-channel-rail span,
  .router-overview-framework .ik-v420-channel-rail span,
  .ik-v420-channel-rail span {
    display: grid !important;
    grid-template-rows: 8px 15px 13px !important;
    align-content: center !important;
    min-width: 0 !important;
    padding: 4px 5px !important;
    border-left: 1px solid rgba(160, 181, 202, .22) !important;
    background: transparent !important;
    box-shadow: none !important;
  }

  #overview.router-overview-framework .ik-v420-channel-rail span:first-child,
  .router-overview-framework .ik-v420-channel-rail span:first-child,
  .ik-v420-channel-rail span:first-child {
    border-left: 0 !important;
  }

  #overview.router-overview-framework .ik-v420-channel-rail i,
  .router-overview-framework .ik-v420-channel-rail i,
  .ik-v420-channel-rail i {
    width: 5px !important;
    height: 5px !important;
    box-shadow: none !important;
  }

  #overview.router-overview-framework .ik-v420-channel-rail b,
  .router-overview-framework .ik-v420-channel-rail b,
  .ik-v420-channel-rail b {
    color: var(--ik-ink) !important;
    font-size: 10px !important;
    line-height: 12px !important;
  }

  #overview.router-overview-framework .ik-v420-channel-rail em,
  .router-overview-framework .ik-v420-channel-rail em,
  .ik-v420-channel-rail em {
    color: var(--ik-muted) !important;
    font-size: 8px !important;
    font-style: normal !important;
    line-height: 10px !important;
    white-space: nowrap !important;
  }

  #overview.router-overview-framework .ik-v420-resource-visual.ik-v620-pressure-visual .ik-v420-resource-meter,
  .router-overview-framework .ik-v420-resource-visual.ik-v620-pressure-visual .ik-v420-resource-meter,
  .ik-v420-resource-visual.ik-v620-pressure-visual .ik-v420-resource-meter {
    grid-template-columns: 24px 32px 32px 36px minmax(0, 1fr) !important;
  }

  #overview.router-overview-framework .ik-v420-resource-meter.is-danger b,
  #overview.router-overview-framework .ik-v420-resource-meter.is-danger strong,
  .router-overview-framework .ik-v420-resource-meter.is-danger b,
  .router-overview-framework .ik-v420-resource-meter.is-danger strong,
  .ik-v420-resource-meter.is-danger b,
  .ik-v420-resource-meter.is-danger strong {
    color: var(--ik-ink) !important;
  }

  #overview.router-overview-framework .ik-v420-resource-visual.ik-v620-pressure-visual .ik-v420-resource-meter > i > i,
  .router-overview-framework .ik-v420-resource-visual.ik-v620-pressure-visual .ik-v420-resource-meter > i > i,
  .ik-v420-resource-visual.ik-v620-pressure-visual .ik-v420-resource-meter > i > i {
    background: rgba(184, 58, 50, .55) !important;
  }

  #overview.router-overview-framework .ik-v420-list,
  .router-overview-framework .ik-v420-list,
  .ik-v420-list,
  #overview.router-overview-framework .ik-v420-timeline,
  .router-overview-framework .ik-v420-timeline,
  .ik-v420-timeline {
    background: rgba(255,255,255,.50) !important;
    border-top-color: rgba(160, 181, 202, .24) !important;
    border-bottom-color: rgba(160, 181, 202, .24) !important;
  }

  #overview.router-overview-framework [data-overview-mobile-list-kind="wan-incident"] .ik-v420-list-row,
  .router-overview-framework [data-overview-mobile-list-kind="wan-incident"] .ik-v420-list-row,
  [data-overview-mobile-list-kind="wan-incident"] .ik-v420-list-row,
  #overview.router-overview-framework [data-overview-mobile-list-kind="interface-incident"] .ik-v420-list-row,
  .router-overview-framework [data-overview-mobile-list-kind="interface-incident"] .ik-v420-list-row,
  [data-overview-mobile-list-kind="interface-incident"] .ik-v420-list-row,
  #overview.router-overview-framework [data-overview-mobile-list-kind="snapshot-boundary"] .ik-v420-list-row,
  .router-overview-framework [data-overview-mobile-list-kind="snapshot-boundary"] .ik-v420-list-row,
  [data-overview-mobile-list-kind="snapshot-boundary"] .ik-v420-list-row {
    min-height: 48px !important;
  }

  #overview.router-overview-framework [data-overview-mobile-list-kind="wan-incident"] .ik-v420-app-list u,
  .router-overview-framework [data-overview-mobile-list-kind="wan-incident"] .ik-v420-app-list u,
  [data-overview-mobile-list-kind="wan-incident"] .ik-v420-app-list u,
  #overview.router-overview-framework [data-overview-mobile-list-kind="interface-incident"] .ik-v420-app-list u,
  .router-overview-framework [data-overview-mobile-list-kind="interface-incident"] .ik-v420-app-list u,
  [data-overview-mobile-list-kind="interface-incident"] .ik-v420-app-list u,
  #overview.router-overview-framework [data-overview-mobile-list-kind="snapshot-boundary"] .ik-v420-app-list u,
  .router-overview-framework [data-overview-mobile-list-kind="snapshot-boundary"] .ik-v420-app-list u,
  [data-overview-mobile-list-kind="snapshot-boundary"] .ik-v420-app-list u {
    display: none !important;
  }

  #overview.router-overview-framework [data-overview-mobile-list-kind="wan-incident"] .ik-v420-list-row:nth-of-type(n+5),
  .router-overview-framework [data-overview-mobile-list-kind="wan-incident"] .ik-v420-list-row:nth-of-type(n+5),
  [data-overview-mobile-list-kind="wan-incident"] .ik-v420-list-row:nth-of-type(n+5) {
    display: none !important;
  }

  #overview.router-overview-framework .ik-v420-tabs button.is-active,
  .router-overview-framework .ik-v420-tabs button.is-active,
  .ik-v420-tabs button.is-active {
    color: var(--ik-blue) !important;
    background: transparent !important;
  }

  #overview.router-overview-framework .ik-v420-tabs button.is-active svg,
  .router-overview-framework .ik-v420-tabs button.is-active svg,
  .ik-v420-tabs button.is-active svg {
    background: transparent !important;
    box-shadow: none !important;
  }

  /* v970: accident-fix density pass.  Phone is a read-only monitor App, not a
     decorative card page: one compressed device bar, one compact conclusion,
     one status ledger, then real object rows above the tab bar. */
  #overview.router-overview-framework .ik-v420-app,
  .router-overview-framework .ik-v420-app,
  .ik-v420-app {
    background: #f3f8fd !important;
  }

  #overview.router-overview-framework .ik-v420-screen,
  .router-overview-framework .ik-v420-screen,
  .ik-v420-screen {
    padding: max(4px, env(safe-area-inset-top, 0px)) 13px calc(68px + env(safe-area-inset-bottom, 0px)) !important;
  }

  #overview.router-overview-framework .ik-v420-screen > * + *,
  .router-overview-framework .ik-v420-screen > * + *,
  .ik-v420-screen > * + * {
    margin-top: 5px !important;
  }

  #overview.router-overview-framework .ik-v960-judgement-strip,
  .router-overview-framework .ik-v960-judgement-strip,
  .ik-v960-judgement-strip {
    display: none !important;
  }

  #overview.router-overview-framework .ik-v420-nav,
  .router-overview-framework .ik-v420-nav,
  .ik-v420-nav {
    height: 48px !important;
    min-height: 48px !important;
    grid-template-columns: 32px minmax(0, 1fr) auto !important;
    gap: 7px !important;
    border-bottom: .5px solid rgba(139, 164, 190, .30) !important;
  }

  #overview.router-overview-framework .ik-v420-nav button,
  .router-overview-framework .ik-v420-nav button,
  .ik-v420-nav button {
    width: 32px !important;
    height: 32px !important;
    min-width: 32px !important;
    min-height: 32px !important;
    border-radius: 8px !important;
    color: #315d83 !important;
  }

  #overview.router-overview-framework .ik-v420-nav svg,
  .router-overview-framework .ik-v420-nav svg,
  .ik-v420-nav svg {
    width: 17px !important;
    height: 17px !important;
    stroke-width: 1.8 !important;
  }

  #overview.router-overview-framework .ik-v420-nav div b,
  .router-overview-framework .ik-v420-nav div b,
  .ik-v420-nav div b {
    font-size: 15px !important;
    line-height: 17px !important;
    letter-spacing: -.22px !important;
  }

  #overview.router-overview-framework .ik-v420-nav div span,
  .router-overview-framework .ik-v420-nav div span,
  .ik-v420-nav div span {
    font-size: 9.8px !important;
    line-height: 11px !important;
    color: #657789 !important;
  }

  #overview.router-overview-framework .ik-v420-nav strong,
  .router-overview-framework .ik-v420-nav strong,
  .ik-v420-nav strong {
    height: 20px !important;
    min-height: 20px !important;
    padding: 0 6px !important;
    gap: 3px !important;
    border-radius: 999px !important;
    background: rgba(255,255,255,.58) !important;
    box-shadow: inset 0 0 0 .5px rgba(142, 169, 196, .34) !important;
    font-size: 9.5px !important;
    line-height: 20px !important;
    font-weight: 720 !important;
  }

  #overview.router-overview-framework .ik-v420-nav strong i,
  .router-overview-framework .ik-v420-nav strong i,
  .ik-v420-nav strong i {
    width: 4px !important;
    height: 4px !important;
  }

  #overview.router-overview-framework .ik-v420-hero,
  .router-overview-framework .ik-v420-hero,
  .ik-v420-hero {
    max-height: 184px !important;
    grid-template-rows: auto minmax(72px, auto) 18px !important;
    gap: 4px !important;
    padding: 7px 9px 6px !important;
    border-radius: 8px !important;
    background:
      linear-gradient(90deg, rgba(20,115,230,.030), rgba(255,255,255,.82) 18%, rgba(255,255,255,.78)) !important;
    box-shadow: inset 0 0 0 .5px rgba(142, 169, 196, .30) !important;
  }

  #overview.router-overview-framework .ik-v420-hero.is-danger,
  .router-overview-framework .ik-v420-hero.is-danger,
  .ik-v420-hero.is-danger {
    background:
      linear-gradient(90deg, rgba(184,58,50,.030), rgba(255,255,255,.82) 18%, rgba(255,255,255,.78)) !important;
  }

  #overview.router-overview-framework .ik-v420-hero.is-warn,
  #overview.router-overview-framework .ik-v420-hero.is-missing,
  .router-overview-framework .ik-v420-hero.is-warn,
  .router-overview-framework .ik-v420-hero.is-missing,
  .ik-v420-hero.is-warn,
  .ik-v420-hero.is-missing {
    background:
      linear-gradient(90deg, rgba(205,132,38,.030), rgba(255,255,255,.82) 18%, rgba(255,255,255,.78)) !important;
  }

  #overview.router-overview-framework .ik-v420-hero::before,
  .router-overview-framework .ik-v420-hero::before,
  .ik-v420-hero::before {
    inset: 9px auto 9px 0 !important;
    width: 2px !important;
    opacity: .62 !important;
  }

  #overview.router-overview-framework .ik-v620-hero-head h1,
  .router-overview-framework .ik-v620-hero-head h1,
  .ik-v620-hero-head h1 {
    height: 18px !important;
    max-height: 18px !important;
    font-size: 16.2px !important;
    line-height: 18px !important;
    letter-spacing: -.18px !important;
  }

  #overview.router-overview-framework .ik-v620-hero-head p,
  .router-overview-framework .ik-v620-hero-head p,
  .ik-v620-hero-head p {
    max-height: 12px !important;
    font-size: 9.4px !important;
    line-height: 11px !important;
    color: #657789 !important;
  }

  #overview.router-overview-framework .ik-v620-hero-stage,
  .router-overview-framework .ik-v620-hero-stage,
  .ik-v620-hero-stage {
    grid-template-columns: 82px minmax(0, 1fr) !important;
    gap: 6px !important;
    min-height: 72px !important;
    align-items: center !important;
  }

  #overview.router-overview-framework .ik-v420-hero-stats,
  .router-overview-framework .ik-v420-hero-stats,
  .ik-v420-hero-stats {
    grid-template-rows: repeat(4, 13px) !important;
    align-self: center !important;
    gap: 1px !important;
  }

  #overview.router-overview-framework .ik-v420-hero-stats span,
  .router-overview-framework .ik-v420-hero-stats span,
  .ik-v420-hero-stats span {
    grid-template-columns: 27px minmax(0, 1fr) !important;
    min-height: 13px !important;
    padding: 0 !important;
    gap: 2px !important;
  }

  #overview.router-overview-framework .ik-v420-hero-stats em,
  .router-overview-framework .ik-v420-hero-stats em,
  .ik-v420-hero-stats em {
    font-size: 7.2px !important;
    line-height: 13px !important;
  }

  #overview.router-overview-framework .ik-v420-hero-stats b,
  .router-overview-framework .ik-v420-hero-stats b,
  .ik-v420-hero-stats b {
    font-size: 8.9px !important;
    line-height: 13px !important;
  }

  #overview.router-overview-framework .ik-v420-visual,
  .router-overview-framework .ik-v420-visual,
  .ik-v420-visual {
    height: 72px !important;
    min-height: 72px !important;
    max-height: 82px !important;
  }

  #overview.router-overview-framework .ik-v812-trend-visual,
  .router-overview-framework .ik-v812-trend-visual,
  .ik-v812-trend-visual {
    grid-template-columns: minmax(0, 1fr) 50px !important;
    min-height: 72px !important;
    gap: 4px !important;
    align-items: center !important;
  }

  #overview.router-overview-framework .ik-v420-line-chart,
  .router-overview-framework .ik-v420-line-chart,
  .ik-v420-line-chart {
    height: 72px !important;
  }

  #overview.router-overview-framework .ik-v812-trend-visual aside,
  .router-overview-framework .ik-v812-trend-visual aside,
  .ik-v812-trend-visual aside {
    display: grid !important;
    align-content: center !important;
    grid-template-rows: repeat(3, 17px) !important;
    gap: 2px !important;
  }

  #overview.router-overview-framework .ik-v812-trend-visual aside span,
  .router-overview-framework .ik-v812-trend-visual aside span,
  .ik-v812-trend-visual aside span {
    min-height: 17px !important;
  }

  #overview.router-overview-framework .ik-v812-trend-visual aside em,
  .router-overview-framework .ik-v812-trend-visual aside em,
  .ik-v812-trend-visual aside em {
    font-size: 7px !important;
    line-height: 8px !important;
  }

  #overview.router-overview-framework .ik-v812-trend-visual aside b,
  .router-overview-framework .ik-v812-trend-visual aside b,
  .ik-v812-trend-visual aside b {
    font-size: 8.6px !important;
    line-height: 9px !important;
  }

  #overview.router-overview-framework .ik-v830-trust-rail,
  .router-overview-framework .ik-v830-trust-rail,
  .ik-v830-trust-rail {
    height: 18px !important;
    min-height: 18px !important;
    padding: 1px 0 0 !important;
  }

  #overview.router-overview-framework .ik-v830-trust-rail span,
  .router-overview-framework .ik-v830-trust-rail span,
  .ik-v830-trust-rail span {
    min-height: 16px !important;
    padding: 0 4px !important;
  }

  #overview.router-overview-framework .ik-v830-trust-rail b,
  .router-overview-framework .ik-v830-trust-rail b,
  .ik-v830-trust-rail b {
    font-size: 7px !important;
    line-height: 16px !important;
  }

  #overview.router-overview-framework .ik-v830-trust-rail strong,
  .router-overview-framework .ik-v830-trust-rail strong,
  .ik-v830-trust-rail strong {
    font-size: 8.6px !important;
    line-height: 16px !important;
  }

  #overview.router-overview-framework .ik-v420-port-matrix,
  .router-overview-framework .ik-v420-port-matrix,
  .ik-v420-port-matrix {
    min-height: 66px !important;
  }

  #overview.router-overview-framework .ik-v420-port-matrix span,
  .router-overview-framework .ik-v420-port-matrix span,
  .ik-v420-port-matrix span {
    min-height: 33px !important;
    padding-top: 2px !important;
    padding-bottom: 2px !important;
  }

  #overview.router-overview-framework .ik-v420-channel-rail,
  .router-overview-framework .ik-v420-channel-rail,
  .ik-v420-channel-rail {
    min-height: 62px !important;
  }

  #overview.router-overview-framework .ik-v420-channel-rail span,
  .router-overview-framework .ik-v420-channel-rail span,
  .ik-v420-channel-rail span {
    min-height: 62px !important;
    grid-template-rows: 8px 16px 12px !important;
  }

  #overview.router-overview-framework .ik-v420-interface-list,
  .router-overview-framework .ik-v420-interface-list,
  .ik-v420-interface-list {
    min-height: 62px !important;
  }

  #overview.router-overview-framework .ik-v420-interface-list span,
  .router-overview-framework .ik-v420-interface-list span,
  .ik-v420-interface-list span {
    min-height: 31px !important;
  }

  #overview.router-overview-framework .ik-v420-resource-visual.ik-v620-pressure-visual,
  .router-overview-framework .ik-v420-resource-visual.ik-v620-pressure-visual,
  .ik-v420-resource-visual.ik-v620-pressure-visual {
    min-height: 62px !important;
    grid-template-rows: repeat(3, 18px) !important;
    gap: 2px !important;
    padding: 2px 3px !important;
  }

  #overview.router-overview-framework .ik-v420-resource-visual.ik-v620-pressure-visual .ik-v420-resource-meter,
  .router-overview-framework .ik-v420-resource-visual.ik-v620-pressure-visual .ik-v420-resource-meter,
  .ik-v420-resource-visual.ik-v620-pressure-visual .ik-v420-resource-meter {
    grid-template-columns: 24px 33px 34px 38px minmax(0, 1fr) !important;
    min-height: 18px !important;
    gap: 4px !important;
  }

  #overview.router-overview-framework .ik-v420-resource-visual.ik-v620-pressure-visual .ik-v420-resource-meter > i,
  .router-overview-framework .ik-v420-resource-visual.ik-v620-pressure-visual .ik-v420-resource-meter > i,
  .ik-v420-resource-visual.ik-v620-pressure-visual .ik-v420-resource-meter > i {
    height: 2px !important;
  }

  #overview.router-overview-framework .ik-v420-surface,
  .router-overview-framework .ik-v420-surface,
  .ik-v420-surface {
    gap: 5px !important;
  }

  #overview.router-overview-framework .ik-v420-timeline,
  .router-overview-framework .ik-v420-timeline,
  .ik-v420-timeline {
    padding: 0 9px !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row,
  .router-overview-framework .ik-v420-timeline-row,
  .ik-v420-timeline-row {
    display: grid !important;
    grid-template-columns: 12px 62px minmax(72px, auto) minmax(0, 1fr) !important;
    min-height: 44px !important;
    padding: 0 !important;
    gap: 5px !important;
    align-items: center !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row b,
  .router-overview-framework .ik-v420-timeline-row b,
  .ik-v420-timeline-row b {
    font-size: 11.4px !important;
    line-height: 13px !important;
    white-space: nowrap !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row strong,
  .router-overview-framework .ik-v420-timeline-row strong,
  .ik-v420-timeline-row strong {
    font-size: 11.2px !important;
    line-height: 13px !important;
    text-align: right !important;
    white-space: nowrap !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row em,
  .router-overview-framework .ik-v420-timeline-row em,
  .ik-v420-timeline-row em {
    font-size: 9px !important;
    line-height: 12px !important;
    text-align: right !important;
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
  }

  #overview.router-overview-framework .ik-v420-list,
  .router-overview-framework .ik-v420-list,
  .ik-v420-list {
    padding: 0 9px 1px !important;
  }

  #overview.router-overview-framework .ik-v420-list header,
  .router-overview-framework .ik-v420-list header,
  .ik-v420-list header {
    min-height: 21px !important;
    padding: 4px 0 1px !important;
  }

  #overview.router-overview-framework .ik-v420-list header b,
  .router-overview-framework .ik-v420-list header b,
  .ik-v420-list header b {
    font-size: 12px !important;
    line-height: 14px !important;
  }

  #overview.router-overview-framework .ik-v420-list header span,
  .router-overview-framework .ik-v420-list header span,
  .ik-v420-list header span {
    font-size: 9px !important;
    line-height: 12px !important;
  }

  #overview.router-overview-framework .ik-v420-list-row,
  .router-overview-framework .ik-v420-list-row,
  .ik-v420-list-row {
    grid-template-columns: 28px minmax(0, 1fr) 54px !important;
    min-height: 52px !important;
    gap: 7px !important;
    padding: 0 !important;
  }

  #overview.router-overview-framework .ik-v420-list-row > i,
  .router-overview-framework .ik-v420-list-row > i,
  .ik-v420-list-row > i {
    width: 28px !important;
    height: 28px !important;
    border-radius: 6px !important;
  }

  #overview.router-overview-framework .ik-v420-list-row span,
  .router-overview-framework .ik-v420-list-row span,
  .ik-v420-list-row span {
    gap: 1px !important;
  }

  #overview.router-overview-framework .ik-v420-list-row span b,
  .router-overview-framework .ik-v420-list-row span b,
  .ik-v420-list-row span b {
    max-width: 100% !important;
    font-size: 12.2px !important;
    line-height: 14px !important;
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
  }

  #overview.router-overview-framework .ik-v420-list-row span em,
  .router-overview-framework .ik-v420-list-row span em,
  .ik-v420-list-row span em {
    font-size: 9.6px !important;
    line-height: 11px !important;
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
  }

  #overview.router-overview-framework .ik-v420-list-row strong,
  .router-overview-framework .ik-v420-list-row strong,
  .ik-v420-list-row strong {
    min-width: 54px !important;
    max-width: 54px !important;
    text-align: right !important;
  }

  #overview.router-overview-framework .ik-v420-list-row strong b,
  .router-overview-framework .ik-v420-list-row strong b,
  .ik-v420-list-row strong b {
    font-size: 11.8px !important;
    line-height: 13px !important;
  }

  #overview.router-overview-framework .ik-v420-list-row strong small,
  .router-overview-framework .ik-v420-list-row strong small,
  .ik-v420-list-row strong small {
    font-size: 8.4px !important;
    line-height: 10px !important;
  }

  #overview.router-overview-framework .ik-v420-tabs,
  .router-overview-framework .ik-v420-tabs,
  .ik-v420-tabs {
    height: calc(64px + env(safe-area-inset-bottom, 0px)) !important;
    min-height: calc(64px + env(safe-area-inset-bottom, 0px)) !important;
    padding: 4px 6px max(3px, env(safe-area-inset-bottom, 0px)) !important;
    border-radius: 0 !important;
    background: rgba(250,252,255,.94) !important;
    box-shadow: 0 -1px 0 rgba(142,169,196,.32) !important;
  }

  #overview.router-overview-framework .ik-v420-tabs button,
  .router-overview-framework .ik-v420-tabs button,
  .ik-v420-tabs button {
    min-height: 42px !important;
    border-radius: 0 !important;
    background: transparent !important;
  }
}
`;
