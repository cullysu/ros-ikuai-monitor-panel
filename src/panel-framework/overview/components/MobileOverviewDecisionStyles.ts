export const V1080_DECISION_HOME_REFINEMENTS = `
@media (max-width: 760px) {
  [data-overview-mobile-v1080-decision-home] {
    background: #f3f6f9 !important;
  }

  [data-overview-mobile-v1080-decision-home] .ik-v420-screen {
    display: grid !important;
    grid-template-rows: auto auto auto auto minmax(20px, 1fr) auto !important;
    align-content: stretch !important;
    gap: 8px !important;
    min-height: calc(100svh - 58px) !important;
    padding: 8px 12px 72px !important;
  }

  [data-overview-mobile-v1080-decision-home] .ik-v420-nav {
    height: 38px !important;
    min-height: 38px !important;
    padding: 0 2px !important;
  }

  [data-overview-mobile-v1080-decision-home] .ik-v420-nav button {
    width: 28px !important;
    height: 28px !important;
    border: 0 !important;
    background: transparent !important;
    box-shadow: none !important;
  }

  [data-overview-mobile-v1080-decision-home] .ik-v240-status {
    padding: 0 !important;
    border: 0 !important;
    border-radius: 0 !important;
    background: transparent !important;
    box-shadow: none !important;
    font-size: 10px !important;
    font-weight: 650 !important;
  }

  [data-overview-mobile-v1080-decision-home] .ik-v960-judgement-strip {
    display: grid !important;
    grid-template-columns: minmax(108px, .92fr) minmax(0, 2.08fr) !important;
    min-height: 82px !important;
    border: 0 !important;
    border-radius: 8px !important;
    background: rgba(255, 255, 255, .72) !important;
    box-shadow: none !important;
  }

  [data-overview-mobile-v1080-decision-home] .ik-v1080-conclusion {
    display: grid !important;
    grid-template-columns: 7px minmax(0, 1fr) !important;
    grid-template-rows: 13px 22px 16px 14px !important;
    align-content: center !important;
    column-gap: 6px !important;
    padding: 8px 9px !important;
    border: 0 !important;
    border-right: 1px solid rgba(128, 150, 172, .14) !important;
  }

  [data-overview-mobile-v1080-decision-home] .ik-v1080-conclusion > i {
    grid-row: 1 / 5 !important;
    align-self: center !important;
    width: 3px !important;
    height: 34px !important;
    border-radius: 3px !important;
    box-shadow: none !important;
  }

  [data-overview-mobile-v1080-decision-home] .ik-v1080-conclusion > span,
  [data-overview-mobile-v1080-decision-home] .ik-v1080-conclusion > em,
  [data-overview-mobile-v1080-decision-home] .ik-v1080-conclusion > small {
    grid-column: 2 !important;
    min-width: 0 !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
    white-space: nowrap !important;
    font-style: normal !important;
    color: #718195 !important;
  }

  [data-overview-mobile-v1080-decision-home] .ik-v1080-conclusion > span {
    font-size: 9px !important;
    letter-spacing: .08em !important;
  }

  [data-overview-mobile-v1080-decision-home] .ik-v1080-conclusion > b {
    grid-column: 2 !important;
    font-size: 17px !important;
    line-height: 22px !important;
    color: #172537 !important;
  }

  [data-overview-mobile-v1080-decision-home] .ik-v1080-conclusion > em,
  [data-overview-mobile-v1080-decision-home] .ik-v1080-conclusion > small {
    font-size: 9.5px !important;
    line-height: 14px !important;
  }

  [data-overview-mobile-v1080-decision-home] .ik-v1080-core-facts {
    display: grid !important;
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    grid-template-rows: repeat(2, minmax(0, 1fr)) !important;
    margin: 0 !important;
    padding: 0 !important;
    list-style: none !important;
  }

  [data-overview-mobile-v1080-decision-home] .ik-v1080-core-facts > li {
    display: grid !important;
    grid-template-columns: minmax(28px, auto) minmax(0, 1fr) !important;
    grid-template-rows: 16px 13px !important;
    align-content: center !important;
    column-gap: 6px !important;
    min-width: 0 !important;
    padding: 5px 8px !important;
    border: 0 !important;
    background: transparent !important;
    box-shadow: inset -1px -1px 0 rgba(128, 150, 172, .11) !important;
  }

  [data-overview-mobile-v1080-decision-home] .ik-v1080-core-facts em,
  [data-overview-mobile-v1080-decision-home] .ik-v1080-core-facts small {
    font-style: normal !important;
    font-size: 9px !important;
    line-height: 13px !important;
    color: #7b8999 !important;
  }

  [data-overview-mobile-v1080-decision-home] .ik-v1080-core-facts b {
    min-width: 0 !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
    white-space: nowrap !important;
    font-size: 12px !important;
    line-height: 16px !important;
    color: #24364a !important;
  }

  [data-overview-mobile-v1080-decision-home] .ik-v1080-core-facts small {
    grid-column: 1 / 3 !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
    white-space: nowrap !important;
  }

  [data-overview-mobile-v1080-decision-home] .ik-v910-trust-strip {
    display: grid !important;
    grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
    min-height: 34px !important;
    gap: 0 !important;
    padding: 0 !important;
    border-top: 1px solid rgba(128, 150, 172, .12) !important;
    border-bottom: 1px solid rgba(128, 150, 172, .12) !important;
  }

  [data-overview-mobile-v1080-decision-home] .ik-v910-trust-strip > span {
    display: grid !important;
    grid-template-columns: 1fr !important;
    align-content: center !important;
    gap: 1px !important;
    min-width: 0 !important;
    padding: 4px 6px !important;
    border: 0 !important;
    border-right: 1px solid rgba(128, 150, 172, .12) !important;
    border-radius: 0 !important;
    background: transparent !important;
    box-shadow: none !important;
  }

  [data-overview-mobile-v1080-decision-home] .ik-v910-trust-strip b {
    font-size: 8.5px !important;
    font-weight: 550 !important;
    color: #7a8999 !important;
  }

  [data-overview-mobile-v1080-decision-home] .ik-v910-trust-strip strong {
    font-size: 10.5px !important;
    font-weight: 700 !important;
    color: #2b3d51 !important;
  }

  [data-overview-mobile-v1080-decision-home] .ik-v420-hero {
    min-height: 0 !important;
    max-height: none !important;
    border: 0 !important;
    border-radius: 8px !important;
    background: rgba(255, 255, 255, .76) !important;
    box-shadow: none !important;
  }

  [data-overview-mobile-v1080-decision-home] .ik-v420-hero.is-normal-chart {
    display: grid !important;
    align-content: start !important;
    min-height: 217px !important;
    height: 217px !important;
    max-height: 217px !important;
    overflow: visible !important;
  }

  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-v1080-decision-home] .ik-v420-hero.is-normal-chart,
  .router-overview-framework .ik-v420-app[data-overview-mobile-v1080-decision-home] .ik-v420-hero.is-normal-chart {
    min-height: 217px !important;
    height: 217px !important;
    max-height: 217px !important;
    overflow: visible !important;
  }

  [data-overview-mobile-v1080-decision-home] .ik-v420-hero.is-normal-chart .ik-v620-hero-stage,
  [data-overview-mobile-v1080-decision-home] .ik-v420-hero.is-normal-chart .ik-v420-visual,
  [data-overview-mobile-v1080-decision-home] .ik-v420-hero.is-normal-chart .ik-v812-trend-visual {
    min-height: 0 !important;
    height: auto !important;
    max-height: none !important;
  }

  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-v1080-decision-home] .ik-v420-hero.is-normal-chart .ik-v420-visual,
  .router-overview-framework .ik-v420-app[data-overview-mobile-v1080-decision-home] .ik-v420-hero.is-normal-chart .ik-v420-visual,
  [data-overview-mobile-v1080-decision-home] .ik-v420-hero.is-normal-chart .ik-v420-visual {
    display: grid !important;
    grid-template-columns: minmax(0, 1fr) !important;
    grid-template-rows: auto auto !important;
    width: 100% !important;
  }

  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-v1080-decision-home] .ik-v420-hero.is-normal-chart .ik-v812-trend-visual,
  .router-overview-framework .ik-v420-app[data-overview-mobile-v1080-decision-home] .ik-v420-hero.is-normal-chart .ik-v812-trend-visual,
  [data-overview-mobile-v1080-decision-home] .ik-v420-hero.is-normal-chart .ik-v812-trend-visual {
    display: grid !important;
    grid-template-columns: minmax(0, 1fr) !important;
    grid-template-rows: 16px 135px !important;
    min-height: 151px !important;
    height: 151px !important;
    max-height: 151px !important;
    width: 100% !important;
  }

  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-v1080-decision-home] .ik-v420-line-chart,
  .router-overview-framework .ik-v420-app[data-overview-mobile-v1080-decision-home] .ik-v420-line-chart,
  [data-overview-mobile-v1080-decision-home] .ik-v420-line-chart {
    display: block !important;
    grid-column: 1 / -1 !important;
    justify-self: stretch !important;
    min-width: 100% !important;
    max-width: none !important;
    width: 100% !important;
    min-height: 135px !important;
    height: 135px !important;
    max-height: 135px !important;
    margin: 0 !important;
  }

  [data-overview-mobile-v1080-decision-home] .ik-v1081-peak-label,
  [data-overview-mobile-v1080-decision-home] .ik-v1081-current-label {
    fill: #65788c !important;
    font-size: 7px !important;
    font-weight: 650 !important;
    letter-spacing: .02em !important;
  }

  [data-overview-mobile-v1080-decision-home] .ik-v1040-resource-ledger .ik-v420-resource-meter[data-overview-mobile-resource-risk="secondary-risk"].is-danger strong,
  [data-overview-mobile-v1080-decision-home] .ik-v1040-resource-ledger .ik-v420-resource-meter[data-overview-mobile-resource-risk="secondary-risk"].is-danger em {
    color: #756044 !important;
  }

  [data-overview-mobile-v1080-decision-home] .ik-v1040-resource-ledger .ik-v420-resource-meter[data-overview-mobile-resource-risk="secondary-risk"].is-danger .ik-density-resource-track span {
    background: linear-gradient(90deg, rgba(117, 96, 68, .44), rgba(117, 96, 68, .70)) !important;
  }

  [data-overview-mobile-v1080-decision-home] .ik-v1040-resource-ledger .ik-v420-resource-meter.is-peak strong,
  [data-overview-mobile-v1080-decision-home] .ik-v1040-resource-ledger .ik-v420-resource-meter.is-peak em {
    color: #8f3a34 !important;
  }

  [data-overview-mobile-v1080-decision-home] .ik-v1010-chart-readout-rail {
    border: 0 !important;
    background: transparent !important;
    box-shadow: none !important;
  }

  [data-overview-mobile-v1080-decision-home] .ik-v1010-chart-readout-rail > span {
    border: 0 !important;
    border-top: 1px solid rgba(128, 150, 172, .1) !important;
    border-right: 1px solid rgba(128, 150, 172, .1) !important;
    background: transparent !important;
    box-shadow: none !important;
  }

  [data-overview-mobile-v1080-decision-home] .ik-v420-surface {
    display: block !important;
    min-height: 0 !important;
    height: auto !important;
    align-self: auto !important;
  }

  [data-overview-mobile-v1080-decision-home][data-overview-mobile-severity="normal"] .ik-v420-surface {
    grid-row: 6 !important;
    align-self: end !important;
  }

  [data-overview-mobile-v1080-decision-home]:not([data-overview-mobile-severity="normal"]) .ik-v420-screen {
    grid-template-rows: auto auto auto auto auto !important;
    align-content: start !important;
  }

  [data-overview-mobile-v1080-decision-home]:not([data-overview-mobile-severity="normal"]) .ik-v420-surface {
    grid-row: auto !important;
    align-self: start !important;
  }

  #overview.router-overview-framework [data-overview-mobile-v1080-decision-home]:not([data-overview-mobile-severity="normal"]) .ik-v420-hero.is-incident {
    display: grid !important;
    grid-template-rows: auto minmax(68px, auto) auto auto !important;
    align-content: start !important;
    gap: 5px !important;
    min-height: 204px !important;
    height: auto !important;
    max-height: none !important;
    padding: 8px 10px 9px !important;
    overflow: visible !important;
  }

  #overview.router-overview-framework [data-overview-mobile-v1080-decision-home][data-overview-mobile-severity="p0"] .ik-v420-hero.is-incident {
    min-height: 222px !important;
  }

  #overview.router-overview-framework [data-overview-mobile-v1080-decision-home]:not([data-overview-mobile-severity="normal"]) .ik-v620-hero-head {
    display: grid !important;
    gap: 1px !important;
    min-height: 34px !important;
  }

  #overview.router-overview-framework [data-overview-mobile-v1080-decision-home]:not([data-overview-mobile-severity="normal"]) .ik-v970-first-question {
    font-size: 8.5px !important;
    line-height: 10px !important;
  }

  #overview.router-overview-framework [data-overview-mobile-v1080-decision-home]:not([data-overview-mobile-severity="normal"]) .ik-v620-hero-head h1 {
    font-size: 14px !important;
    line-height: 17px !important;
  }

  #overview.router-overview-framework [data-overview-mobile-v1080-decision-home]:not([data-overview-mobile-severity="normal"]) .ik-v503-hero-copy {
    font-size: 9.5px !important;
    line-height: 12px !important;
  }

  #overview.router-overview-framework [data-overview-mobile-v1080-decision-home]:not([data-overview-mobile-severity="normal"]) .ik-v620-hero-stage,
  #overview.router-overview-framework [data-overview-mobile-v1080-decision-home]:not([data-overview-mobile-severity="normal"]) .ik-v420-visual {
    min-height: 68px !important;
    height: auto !important;
    max-height: none !important;
  }

  #overview.router-overview-framework [data-overview-mobile-v1080-decision-home]:not([data-overview-mobile-severity="normal"]) .ik-v970-trust-boundary {
    min-height: 20px !important;
    margin: 0 !important;
    padding: 3px 6px !important;
    font-size: 8.5px !important;
    line-height: 11px !important;
  }

  #overview.router-overview-framework [data-overview-mobile-v1080-decision-home]:not([data-overview-mobile-severity="normal"]) .ik-v1046-abnormal-decision-rail {
    min-height: 42px !important;
    background: transparent !important;
    box-shadow:
      inset 0 1px 0 rgba(128, 150, 172, .11),
      inset 0 -1px 0 rgba(128, 150, 172, .11) !important;
  }

  #overview.router-overview-framework [data-overview-mobile-v1080-decision-home]:not([data-overview-mobile-severity="normal"]) .ik-v1046-abnormal-decision-rail > span {
    grid-template-rows: 9px 14px 10px !important;
    align-content: center !important;
    gap: 0 !important;
    min-height: 42px !important;
    padding: 4px 5px !important;
  }

  #overview.router-overview-framework [data-overview-mobile-v1080-decision-home]:not([data-overview-mobile-severity="normal"]) .ik-v1046-abnormal-decision-rail em {
    font-size: 7.5px !important;
    line-height: 9px !important;
  }

  #overview.router-overview-framework [data-overview-mobile-v1080-decision-home]:not([data-overview-mobile-severity="normal"]) .ik-v1046-abnormal-decision-rail b {
    font-size: 9.5px !important;
    line-height: 14px !important;
  }

  #overview.router-overview-framework [data-overview-mobile-v1080-decision-home]:not([data-overview-mobile-severity="normal"]) .ik-v1046-abnormal-decision-rail small {
    font-size: 7.2px !important;
    line-height: 9px !important;
  }

  #overview.router-overview-framework [data-overview-mobile-v1080-decision-home] .ik-v420-list {
    min-height: 0 !important;
    height: auto !important;
    border: 0 !important;
    border-radius: 8px !important;
    background: rgba(255, 255, 255, .68) !important;
    box-shadow: none !important;
  }

  #overview.router-overview-framework [data-overview-mobile-v1080-decision-home] .ik-v420-list-row {
    box-shadow: inset 0 -1px 0 rgba(128, 150, 172, .1) !important;
  }

  #overview.router-overview-framework [data-overview-mobile-v1080-decision-home]:not([data-overview-mobile-severity="normal"]) .ik-v420-list > header {
    min-height: 48px !important;
    padding: 9px 10px 7px !important;
  }

  #overview.router-overview-framework [data-overview-mobile-v1080-decision-home]:not([data-overview-mobile-severity="normal"]) .ik-v420-list > header > b {
    font-size: 13px !important;
    line-height: 17px !important;
  }

  #overview.router-overview-framework [data-overview-mobile-v1080-decision-home]:not([data-overview-mobile-severity="normal"]) .ik-v420-list > header > span {
    font-size: 9.5px !important;
    line-height: 12px !important;
  }

  #overview.router-overview-framework [data-overview-mobile-v1080-decision-home]:not([data-overview-mobile-severity="normal"]) .ik-v420-list > header > em {
    font-size: 8.5px !important;
    line-height: 11px !important;
  }

  #overview.router-overview-framework [data-overview-mobile-v1080-decision-home]:not([data-overview-mobile-severity="normal"]) .ik-v420-list-row {
    min-height: 48px !important;
    padding: 7px 9px !important;
  }

  #overview.router-overview-framework [data-overview-mobile-v1080-decision-home]:not([data-overview-mobile-severity="normal"]) .ik-v420-list-row > span > b {
    font-size: 11.5px !important;
    line-height: 14px !important;
  }

  #overview.router-overview-framework [data-overview-mobile-v1080-decision-home]:not([data-overview-mobile-severity="normal"]) .ik-v420-list-row > span > em {
    font-size: 8.5px !important;
    line-height: 11px !important;
  }

  #overview.router-overview-framework [data-overview-mobile-v1080-decision-home]:not([data-overview-mobile-severity="normal"]) .ik-v420-list-row > strong > b {
    font-size: 11.5px !important;
    line-height: 14px !important;
  }

  #overview.router-overview-framework [data-overview-mobile-v1080-decision-home]:not([data-overview-mobile-severity="normal"]) .ik-v420-list-row > strong > small {
    font-size: 7.5px !important;
    line-height: 9px !important;
  }

  #overview.router-overview-framework [data-overview-mobile-v1080-decision-home][data-overview-mobile-severity="p0"] .ik-v420-port-matrix {
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    border-radius: 6px !important;
    box-shadow: none !important;
  }

  #overview.router-overview-framework [data-overview-mobile-v1080-decision-home][data-overview-mobile-severity="p0"] .ik-v420-port-matrix span[data-overview-mobile-wan-port-cell] {
    min-height: 48px !important;
    padding: 6px 7px !important;
    background: transparent !important;
  }

  [data-overview-mobile-v1080-decision-home] .ik-v420-tabs {
    background: rgba(247, 249, 251, .96) !important;
    box-shadow: inset 0 1px 0 rgba(128, 150, 172, .12) !important;
  }

  [data-overview-mobile-v1080-decision-home] .ik-v420-tabs button.is-active {
    background: transparent !important;
    box-shadow: none !important;
  }

  [data-overview-mobile-v1080-decision-home] .ik-v420-tabs button.is-active::after {
    display: none !important;
  }

  [data-overview-mobile-v1090-first-screen-order] .ik-v420-screen {
    grid-template-rows: auto auto auto auto auto auto auto !important;
    align-content: start !important;
  }

  [data-overview-mobile-v1090-first-screen-order] .ik-v960-judgement-strip {
    display: block !important;
    min-height: 44px !important;
    height: auto !important;
    padding: 0 !important;
    border: 0 !important;
    border-radius: 8px !important;
    background: rgba(255, 255, 255, .72) !important;
    box-shadow: none !important;
  }

  [data-overview-mobile-v1090-first-screen-order] .ik-v1080-conclusion {
    display: grid !important;
    grid-template-columns: 8px minmax(0, max-content) minmax(0, 1fr) !important;
    grid-template-rows: 20px 14px !important;
    grid-template-areas:
      "dot value impact"
      ". note impact" !important;
    align-content: center !important;
    gap: 0 6px !important;
    min-height: 44px !important;
    padding: 4px 10px !important;
    border: 0 !important;
  }

  [data-overview-mobile-v1090-first-screen-order] .ik-v1080-conclusion > i {
    grid-area: dot !important;
  }

  [data-overview-mobile-v1090-first-screen-order] .ik-v1080-conclusion > span {
    display: none !important;
  }

  [data-overview-mobile-v1090-first-screen-order] .ik-v1080-conclusion > b {
    grid-area: value !important;
    align-self: end !important;
    font-size: 13px !important;
    line-height: 18px !important;
  }

  [data-overview-mobile-v1090-first-screen-order] .ik-v1080-conclusion > em {
    grid-area: note !important;
    align-self: start !important;
    color: #6f7f90 !important;
    font-size: 8.5px !important;
    line-height: 11px !important;
  }

  [data-overview-mobile-v1090-first-screen-order] .ik-v1080-conclusion > small {
    grid-area: impact !important;
    align-self: center !important;
    justify-self: end !important;
    max-width: 170px !important;
    color: #53687d !important;
    font-size: 9px !important;
    font-weight: 650 !important;
    line-height: 12px !important;
    text-align: right !important;
  }

  [data-overview-mobile-v1090-first-screen-order] .ik-v940-core-rail {
    display: grid !important;
    grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
    min-height: 46px !important;
    padding: 0 !important;
    border: 0 !important;
    border-top: 1px solid rgba(128, 150, 172, .12) !important;
    border-bottom: 1px solid rgba(128, 150, 172, .12) !important;
    border-radius: 0 !important;
    background: transparent !important;
    box-shadow: none !important;
    overflow: hidden !important;
  }

  [data-overview-mobile-v1090-first-screen-order] .ik-v940-core-rail > span {
    display: grid !important;
    align-content: center !important;
    gap: 1px !important;
    min-width: 0 !important;
    padding: 5px 7px !important;
    border: 0 !important;
    border-right: 1px solid rgba(128, 150, 172, .12) !important;
    border-radius: 0 !important;
    background: transparent !important;
    box-shadow: none !important;
  }

  [data-overview-mobile-v1090-first-screen-order] .ik-v940-core-rail > span:last-child {
    border-right: 0 !important;
  }

  [data-overview-mobile-v1090-first-screen-order] .ik-v940-core-rail em {
    color: #7a8999 !important;
    font-size: 8px !important;
    font-style: normal !important;
    font-weight: 550 !important;
    line-height: 10px !important;
  }

  [data-overview-mobile-v1090-first-screen-order] .ik-v940-core-rail strong {
    color: #2b3d51 !important;
    font-size: 11px !important;
    font-weight: 730 !important;
    line-height: 14px !important;
  }

  [data-overview-mobile-v1090-first-screen-order] .ik-v940-core-rail small {
    color: #8794a2 !important;
    font-size: 7px !important;
    line-height: 9px !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
    white-space: nowrap !important;
  }

  [data-overview-mobile-v1090-first-screen-order] .ik-v940-core-rail .is-danger strong {
    color: #963d38 !important;
  }

  [data-overview-mobile-v1090-first-screen-order] .ik-v940-core-rail .is-warn strong {
    color: #7b5d2f !important;
  }

  [data-overview-mobile-v1090-first-screen-order][data-overview-mobile-severity="normal"] .ik-v420-surface {
    grid-row: auto !important;
    align-self: start !important;
    margin-top: 0 !important;
  }
}
`;

export const MOBILE_OVERVIEW_DECISION_HOME_STYLES =
  V1080_DECISION_HOME_REFINEMENTS;
