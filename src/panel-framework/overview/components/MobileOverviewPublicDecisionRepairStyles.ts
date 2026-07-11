export const MOBILE_OVERVIEW_PUBLIC_DECISION_REPAIR_STYLES = `
@media (max-width: 760px) {
  html body #overview.router-overview-framework .ik-mobile-public-home[data-overview-mobile-console] .ik-mobile-decision-screen {
    display: grid !important;
    grid-template-rows: 46px auto 64px auto !important;
    gap: 9px !important;
    align-content: start !important;
    padding: max(12px, env(safe-area-inset-top)) 12px calc(76px + env(safe-area-inset-bottom)) !important;
    background: #edf2f7 !important;
  }

  html body #overview.router-overview-framework .ik-mobile-public-home[data-overview-mobile-console] .ik-mobile-device-bar {
    grid-template-columns: minmax(0, 1fr) auto !important;
    min-height: 46px !important;
    height: 46px !important;
    padding: 0 1px !important;
  }

  html body #overview.router-overview-framework .ik-mobile-public-home[data-overview-mobile-console] .ik-mobile-device-title {
    justify-items: start !important;
    text-align: left !important;
    min-width: 0 !important;
  }

  html body #overview.router-overview-framework .ik-mobile-public-home[data-overview-mobile-console] .ik-mobile-device-title b {
    color: #142033 !important;
    font-size: 17px !important;
    letter-spacing: -.035em !important;
  }

  html body #overview.router-overview-framework .ik-mobile-public-home[data-overview-mobile-console] .ik-mobile-device-title span {
    color: #66758a !important;
    font-size: 10.5px !important;
  }

  html body #overview.router-overview-framework .ik-mobile-public-home[data-overview-mobile-console] .ik-mobile-context-button {
    display: none !important;
    width: 36px !important;
    height: 36px !important;
    border: 0 !important;
    background: transparent !important;
    box-shadow: none !important;
  }

  html body #overview.router-overview-framework .ik-mobile-public-home[data-overview-mobile-console] .ik-mobile-device-bar .ik-v240-status {
    min-width: 58px !important;
    min-height: 30px !important;
    border-radius: 6px !important;
    border-color: #b9cce3 !important;
    background: #f8fbff !important;
  }

  html body #overview.router-overview-framework .ik-mobile-public-home[data-overview-mobile-console] .ik-mobile-decision-card {
    display: grid !important;
    grid-template-rows: auto minmax(128px, auto) 44px !important;
    gap: 9px !important;
    min-height: 0 !important;
    height: auto !important;
    max-height: none !important;
    padding: 12px !important;
    border: 1px solid #c7d5e4 !important;
    border-left: 3px solid #1f6fd1 !important;
    border-radius: 6px !important;
    background: #ffffff !important;
    box-shadow: none !important;
  }

  html body #overview.router-overview-framework .ik-mobile-public-home[data-overview-mobile-console] .ik-mobile-decision-card.is-danger {
    border-left-color: #c62828 !important;
  }

  html body #overview.router-overview-framework .ik-mobile-public-home[data-overview-mobile-console] .ik-mobile-decision-card.is-warn,
  html body #overview.router-overview-framework .ik-mobile-public-home[data-overview-mobile-console] .ik-mobile-decision-card.is-missing {
    border-left-color: #b7791f !important;
  }

  html body #overview.router-overview-framework .ik-mobile-public-home[data-overview-mobile-console] .ik-mobile-decision-card[data-overview-mobile-visual-kind="trust-channels"],
  html body #overview.router-overview-framework .ik-mobile-public-home[data-overview-mobile-console] .ik-mobile-decision-card[data-overview-mobile-visual-kind="interface-list"] {
    grid-template-rows: auto auto !important;
  }

  html body #overview.router-overview-framework .ik-mobile-public-home[data-overview-mobile-console] .ik-mobile-decision-card:not([data-overview-mobile-priority="normal"]) {
    grid-template-rows: auto auto !important;
  }

  html body #overview.router-overview-framework .ik-mobile-public-home[data-overview-mobile-console] .ik-mobile-decision-head {
    min-height: 0 !important;
    height: auto !important;
    max-height: none !important;
    gap: 4px !important;
  }

  html body #overview.router-overview-framework .ik-mobile-public-home[data-overview-mobile-console] .ik-mobile-decision-head span {
    color: #52657a !important;
    font-size: 10.5px !important;
    font-weight: 760 !important;
  }

  html body #overview.router-overview-framework .ik-mobile-public-home[data-overview-mobile-console] .ik-mobile-decision-head h1 {
    color: #0f1f32 !important;
    font-size: 30px !important;
    font-weight: 900 !important;
    line-height: .98 !important;
    letter-spacing: -.065em !important;
  }

  html body #overview.router-overview-framework .ik-mobile-public-home[data-overview-mobile-console] .ik-mobile-decision-head p {
    color: #52657a !important;
    font-size: 11px !important;
    font-weight: 620 !important;
    line-height: 1.22 !important;
  }

  html body #overview.router-overview-framework .ik-mobile-public-home[data-overview-mobile-console] .ik-mobile-decision-card > .ik-mobile-decision-trend {
    display: grid !important;
    grid-template-columns: minmax(0, 1fr) !important;
    grid-template-rows: 88px 52px !important;
    gap: 0 !important;
    min-width: 0 !important;
    position: relative !important;
    min-height: 140px !important;
    height: 140px !important;
    max-height: 140px !important;
  }

  html body #overview.router-overview-framework .ik-mobile-public-home[data-overview-mobile-console] .ik-mobile-decision-trend .ik-mobile-decision-trend-plot {
    display: grid !important;
    grid-template-columns: minmax(0, 1fr) !important;
    grid-template-rows: 18px 66px !important;
    gap: 3px !important;
    min-height: 88px !important;
    height: 88px !important;
    max-height: 88px !important;
  }

  html body #overview.router-overview-framework .ik-mobile-public-home[data-overview-mobile-normal-app-home="compact-conclusion-chart-ops"] .ik-mobile-decision-card[data-overview-mobile-visual-kind="trend"] > .ik-mobile-decision-trend[data-overview-mobile-v1072-chart="decision-plot-two-series-three-by-two-readout"] > .ik-mobile-decision-trend-anchor.ik-v812-trend-visual {
    display: block !important;
    box-sizing: border-box !important;
    grid-row: 2 / 3 !important;
    grid-column: 1 / -1 !important;
    align-self: start !important;
    justify-self: stretch !important;
    position: absolute !important;
    left: 0 !important;
    top: 0 !important;
    right: auto !important;
    bottom: auto !important;
    width: 100% !important;
    min-width: 0 !important;
    max-width: none !important;
    min-height: 0 !important;
    height: 0 !important;
    max-height: 0 !important;
    margin: 0 !important;
    padding: 0 !important;
    border: 0 !important;
    border-radius: 0 !important;
    outline: 0 !important;
    background: transparent !important;
    box-shadow: none !important;
    transform: none !important;
    opacity: 0 !important;
    font-size: 0 !important;
    line-height: 0 !important;
    pointer-events: none !important;
    overflow: hidden !important;
  }

  html body #overview.router-overview-framework .ik-mobile-public-home[data-overview-mobile-console] .ik-mobile-decision-trend .ik-mobile-decision-visual {
    grid-row: 2 !important;
    height: 64px !important;
    max-height: 64px !important;
    border-radius: 4px !important;
    background: #f4f8fc !important;
  }

  html body #overview.router-overview-framework .ik-mobile-public-home[data-overview-mobile-console] .ik-mobile-decision-trend [data-overview-mobile-v1012-product-chart] {
    display: block !important;
    width: 100% !important;
    height: 64px !important;
    max-height: 64px !important;
  }

  html body #overview.router-overview-framework .ik-mobile-public-home[data-overview-mobile-console] .ik-mobile-decision-card .ik-mobile-decision-readouts {
    display: grid !important;
    grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
    grid-template-rows: repeat(2, minmax(24px, auto)) !important;
    position: static !important;
    width: 100% !important;
    min-height: 52px !important;
    height: 52px !important;
    max-height: 52px !important;
    border-top: 1px solid #dce7f2 !important;
  }

  html body #overview.router-overview-framework .ik-mobile-public-home[data-overview-mobile-console] .ik-mobile-decision-readouts span {
    min-height: 26px !important;
    padding: 4px 5px !important;
    box-shadow: inset -1px 0 0 rgba(119, 141, 166, .14) !important;
  }

  html body #overview.router-overview-framework .ik-mobile-public-home[data-overview-mobile-console] .ik-mobile-next-step {
    grid-template-columns: 42px minmax(72px, .8fr) minmax(0, 1fr) !important;
    min-height: 44px !important;
    height: 44px !important;
    max-height: 44px !important;
    border-radius: 7px !important;
    background: #f8fbff !important;
  }

  html body #overview.router-overview-framework .ik-mobile-public-home[data-overview-mobile-console] .ik-mobile-core-facts {
    grid-row: auto !important;
    min-height: 64px !important;
    height: 64px !important;
    border-radius: 6px !important;
    border-color: #cbd9e8 !important;
    background: #ffffff !important;
  }

  html body #overview.router-overview-framework .ik-mobile-public-home[data-overview-mobile-console] .ik-mobile-core-facts span {
    min-height: 64px !important;
    padding: 7px 6px !important;
  }

  html body #overview.router-overview-framework .ik-mobile-public-home[data-overview-mobile-console] .ik-mobile-supporting-surface {
    min-height: 82px !important;
    height: 82px !important;
    max-height: 82px !important;
    align-self: start !important;
    overflow: hidden !important;
  }

  html body #overview.router-overview-framework .ik-mobile-public-home[data-overview-mobile-console] .ik-mobile-supporting-list {
    height: 100% !important;
    border-radius: 6px !important;
  }

  html body #overview.router-overview-framework .ik-mobile-public-home[data-overview-mobile-console] .ik-mobile-supporting-list header {
    min-height: 34px !important;
    padding: 7px 9px !important;
  }

  html body #overview.router-overview-framework .ik-mobile-public-home[data-overview-mobile-console] .ik-mobile-supporting-list {
    display: grid !important;
    grid-template-rows: 34px 48px !important;
    height: auto !important;
  }

  html body #overview.router-overview-framework .ik-mobile-public-home[data-overview-mobile-console] .ik-mobile-detail-entry {
    display: grid !important;
    grid-template-columns: minmax(0, 1fr) auto !important;
    align-items: center !important;
    gap: 10px !important;
    width: 100% !important;
    min-height: 48px !important;
    height: 48px !important;
    margin: 0 !important;
    padding: 8px 10px !important;
    border: 0 !important;
    border-top: 1px solid rgba(126, 151, 178, .16) !important;
    border-radius: 0 !important;
    background: transparent !important;
    color: #172236 !important;
    box-shadow: none !important;
    text-align: left !important;
  }

  html body #overview.router-overview-framework .ik-mobile-public-home[data-overview-mobile-console] .ik-mobile-detail-entry > span {
    display: grid !important;
    gap: 2px !important;
    min-width: 0 !important;
  }

  html body #overview.router-overview-framework .ik-mobile-public-home[data-overview-mobile-console] .ik-mobile-detail-entry b {
    overflow: hidden !important;
    color: #172236 !important;
    font-size: 12px !important;
    font-weight: 820 !important;
    line-height: 1.12 !important;
    text-overflow: ellipsis !important;
    white-space: nowrap !important;
  }

  html body #overview.router-overview-framework .ik-mobile-public-home[data-overview-mobile-console] .ik-mobile-detail-entry em {
    overflow: hidden !important;
    color: #6b7b8f !important;
    font-size: 10px !important;
    font-style: normal !important;
    font-weight: 620 !important;
    line-height: 1.12 !important;
    text-overflow: ellipsis !important;
    white-space: nowrap !important;
  }

  html body #overview.router-overview-framework .ik-mobile-public-home[data-overview-mobile-console] .ik-mobile-detail-entry > strong {
    display: inline-grid !important;
    place-items: center !important;
    min-width: 38px !important;
    height: 24px !important;
    border: 1px solid #cbd9e8 !important;
    border-radius: 4px !important;
    background: #f8fbff !important;
    color: #1f4f86 !important;
    font-size: 11px !important;
    font-weight: 820 !important;
    line-height: 1 !important;
  }

  html body #overview.router-overview-framework .ik-mobile-public-home[data-overview-mobile-console] .ik-mobile-supporting-detail-rows {
    display: none !important;
  }

  html body #overview.router-overview-framework .ik-mobile-public-home[data-overview-mobile-console] .ik-mobile-supporting-list .ik-v420-list-row {
    min-height: 42px !important;
    height: 42px !important;
    padding: 6px 9px !important;
  }

  html body #overview.router-overview-framework .ik-mobile-public-home[data-overview-mobile-console] .ik-mobile-wan-incident-stack,
  html body #overview.router-overview-framework .ik-mobile-public-home[data-overview-mobile-console] .ik-mobile-channel-incident-stack,
  html body #overview.router-overview-framework .ik-mobile-public-home[data-overview-mobile-console] .ik-mobile-generic-incident-stack,
  html body #overview.router-overview-framework .ik-mobile-public-home[data-overview-mobile-console] .ik-mobile-resource-incident-stack {
    min-height: 136px !important;
    height: auto !important;
    max-height: none !important;
    border-radius: 7px !important;
    background: #f6f9fc !important;
  }

  html body #overview.router-overview-framework .ik-mobile-public-home[data-overview-mobile-console] .ik-mobile-channel-incident-stack,
  html body #overview.router-overview-framework .ik-mobile-public-home[data-overview-mobile-console] .ik-mobile-generic-incident-stack {
    display: grid !important;
    grid-template-columns: minmax(0, 1fr) !important;
    grid-template-rows: 120px !important;
    min-height: 132px !important;
    height: 132px !important;
    max-height: 132px !important;
    padding: 6px !important;
  }

  html body #overview.router-overview-framework .ik-mobile-public-home[data-overview-mobile-console] .ik-mobile-wan-incident-stack {
    grid-template-rows: 120px 42px 42px !important;
    min-height: 224px !important;
    height: 224px !important;
    max-height: 224px !important;
  }

  html body #overview.router-overview-framework .ik-mobile-public-home[data-overview-mobile-console] .ik-mobile-resource-incident-stack {
    grid-template-rows: 120px repeat(3, 34px) !important;
    min-height: 243px !important;
    height: 243px !important;
    max-height: 243px !important;
  }

  html body #overview.router-overview-framework .ik-mobile-public-home[data-overview-mobile-console] .ik-mobile-resource-incident-stack > .ik-mobile-resource-line {
    display: grid !important;
    grid-template-columns: 48px minmax(0, 1fr) 46px !important;
    grid-template-areas:
      "label bar value"
      "threshold note value" !important;
    align-items: center !important;
    column-gap: 8px !important;
    row-gap: 2px !important;
    min-height: 34px !important;
    height: 34px !important;
    max-height: 34px !important;
    padding: 4px 6px !important;
  }

  html body #overview.router-overview-framework .ik-mobile-public-home[data-overview-mobile-console] .ik-mobile-resource-incident-stack > .ik-mobile-resource-line > b {
    grid-area: label !important;
    min-width: 0 !important;
    overflow: hidden !important;
    color: #172236 !important;
    font-size: 10.5px !important;
    font-weight: 840 !important;
    line-height: 1.05 !important;
    text-overflow: ellipsis !important;
    white-space: nowrap !important;
  }

  html body #overview.router-overview-framework .ik-mobile-public-home[data-overview-mobile-console] .ik-mobile-resource-incident-stack > .ik-mobile-resource-line > i {
    grid-area: bar !important;
    display: block !important;
    width: 100% !important;
    height: 5px !important;
    min-height: 5px !important;
    max-height: 5px !important;
    border-radius: 999px !important;
    background: #dce6f0 !important;
    overflow: hidden !important;
  }

  html body #overview.router-overview-framework .ik-mobile-public-home[data-overview-mobile-console] .ik-mobile-resource-incident-stack > .ik-mobile-resource-line > i > u {
    display: block !important;
    height: 100% !important;
    border-radius: inherit !important;
  }

  html body #overview.router-overview-framework .ik-mobile-public-home[data-overview-mobile-console] .ik-mobile-resource-incident-stack > .ik-mobile-resource-line > strong {
    grid-area: value !important;
    justify-self: end !important;
    align-self: center !important;
    color: #172236 !important;
    font-size: 12px !important;
    font-weight: 860 !important;
    line-height: 1 !important;
    white-space: nowrap !important;
  }

  html body #overview.router-overview-framework .ik-mobile-public-home[data-overview-mobile-console] .ik-mobile-resource-incident-stack > .ik-mobile-resource-line > small {
    grid-area: threshold !important;
    min-width: 0 !important;
    overflow: hidden !important;
    color: #6b7b8f !important;
    font-size: 9px !important;
    font-weight: 640 !important;
    line-height: 1.05 !important;
    text-overflow: ellipsis !important;
    white-space: nowrap !important;
  }

  html body #overview.router-overview-framework .ik-mobile-public-home[data-overview-mobile-console] .ik-mobile-resource-incident-stack > .ik-mobile-resource-line > em {
    grid-area: note !important;
    min-width: 0 !important;
    overflow: hidden !important;
    color: #6b7b8f !important;
    font-size: 9px !important;
    font-style: normal !important;
    font-weight: 640 !important;
    line-height: 1.05 !important;
    text-overflow: ellipsis !important;
    white-space: nowrap !important;
  }

  html body #overview.router-overview-framework .ik-mobile-public-home[data-overview-mobile-console] .ik-mobile-abnormal-decision-rail {
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    grid-template-rows: repeat(2, 56px) !important;
    min-height: 112px !important;
    height: 112px !important;
    max-height: 112px !important;
  }

  html body #overview.router-overview-framework .ik-mobile-public-home[data-overview-mobile-console] .ik-mobile-abnormal-decision-rail > span {
    min-height: 56px !important;
    height: 56px !important;
    max-height: 56px !important;
    padding: 8px 9px !important;
  }

  html body #overview.router-overview-framework .ik-mobile-public-home[data-overview-mobile-console] .ik-mobile-abnormal-decision-rail em {
    font-size: 10px !important;
    line-height: 1.15 !important;
  }

  html body #overview.router-overview-framework .ik-mobile-public-home[data-overview-mobile-console] .ik-mobile-abnormal-decision-rail b {
    font-size: 13.5px !important;
    line-height: 1.15 !important;
  }

  html body #overview.router-overview-framework .ik-mobile-public-home[data-overview-mobile-console] .ik-v420-tabs,
  html body #overview.router-overview-framework .ik-mobile-public-home[data-overview-mobile-console] .ik-v240-tabs {
    position: fixed !important;
    left: 0 !important;
    right: 0 !important;
    bottom: 0 !important;
    width: auto !important;
    min-width: 0 !important;
    max-width: none !important;
    transform: none !important;
    grid-template-columns: repeat(5, minmax(0, 1fr)) !important;
    border: 0 !important;
    border-top: 1px solid #d3deea !important;
    border-radius: 0 !important;
    background: #f9fcff !important;
    box-shadow: none !important;
  }

  html body #overview.router-overview-framework .ik-mobile-public-home[data-overview-mobile-console] .ik-v420-tabs button.is-active,
  html body #overview.router-overview-framework .ik-mobile-public-home[data-overview-mobile-console] .ik-v240-tabs button.is-active {
    background: #edf4fb !important;
    box-shadow: inset 0 -2px 0 #1f6fd1 !important;
    color: #143b6f !important;
  }
}
`;
