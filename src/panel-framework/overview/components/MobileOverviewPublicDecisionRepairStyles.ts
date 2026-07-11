export const MOBILE_OVERVIEW_PUBLIC_DECISION_REPAIR_STYLES = `
@media (max-width: 760px) {
  html body #overview.router-overview-framework .ik-mobile-public-home .ik-mobile-compact-judgement,
  html body #overview.router-overview-framework .ik-mobile-public-home .ik-mobile-compact-trust {
    display: grid !important;
    min-height: 30px !important;
    padding: 5px 8px !important;
    border: 0 !important;
    border-radius: 0 !important;
    background: transparent !important;
    box-shadow: none !important;
  }

  html body #overview.router-overview-framework .ik-mobile-public-home .ik-mobile-compact-judgement {
    grid-template-columns: minmax(0, 1fr) auto !important;
    align-items: center !important;
  }

  html body #overview.router-overview-framework .ik-mobile-public-home .ik-mobile-compact-judgement strong {
    display: flex !important;
    min-width: 0 !important;
    align-items: baseline !important;
    gap: 6px !important;
    color: #26384d !important;
  }

  html body #overview.router-overview-framework .ik-mobile-public-home .ik-mobile-compact-judgement strong i {
    width: 6px !important;
    height: 6px !important;
    flex: 0 0 auto !important;
    border-radius: 2px !important;
    background: #24a35a !important;
  }

  html body #overview.router-overview-framework .ik-mobile-public-home .ik-mobile-compact-judgement strong span,
  html body #overview.router-overview-framework .ik-mobile-public-home .ik-mobile-compact-judgement strong em {
    color: #728197 !important;
    font-size: 10px !important;
    font-style: normal !important;
    font-weight: 650 !important;
    line-height: 1.1 !important;
  }

  html body #overview.router-overview-framework .ik-mobile-public-home .ik-mobile-compact-judgement strong b {
    color: #1b2a3d !important;
    font-size: 12px !important;
    font-weight: 820 !important;
    line-height: 1.1 !important;
    white-space: nowrap !important;
  }

  html body #overview.router-overview-framework .ik-mobile-public-home .ik-mobile-compact-trust {
    grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
    gap: 0 !important;
    min-height: 34px !important;
    padding: 0 !important;
    border-top: 1px solid #dce6f0 !important;
    border-bottom: 1px solid #dce6f0 !important;
    background: rgba(255, 255, 255, .52) !important;
  }

  html body #overview.router-overview-framework .ik-mobile-public-home .ik-mobile-compact-trust > span {
    display: grid !important;
    gap: 2px !important;
    min-width: 0 !important;
    padding: 5px 7px !important;
    border-right: 1px solid #e5edf5 !important;
  }

  html body #overview.router-overview-framework .ik-mobile-public-home .ik-mobile-compact-trust > span:last-of-type {
    border-right: 0 !important;
  }

  html body #overview.router-overview-framework .ik-mobile-public-home .ik-mobile-compact-trust b,
  html body #overview.router-overview-framework .ik-mobile-public-home .ik-mobile-compact-trust strong {
    overflow: hidden !important;
    text-overflow: ellipsis !important;
    white-space: nowrap !important;
  }

  html body #overview.router-overview-framework .ik-mobile-public-home .ik-mobile-compact-trust b {
    color: #718096 !important;
    font-size: 9px !important;
    font-weight: 680 !important;
  }

  html body #overview.router-overview-framework .ik-mobile-public-home .ik-mobile-compact-trust strong {
    color: #243448 !important;
    font-size: 11px !important;
    font-weight: 790 !important;
  }

  html body #overview.router-overview-framework .ik-mobile-public-home .ik-mobile-decision-card > .ik-mobile-decision-trend {
    display: grid !important;
    align-self: start !important;
    grid-row: 2 !important;
    grid-template-columns: minmax(0, 1fr) !important;
    grid-template-rows: 92px 54px !important;
    gap: 0 !important;
    min-height: 146px !important;
    height: 146px !important;
    max-height: 146px !important;
    min-width: 0 !important;
    position: relative !important;
    overflow: visible !important;
  }

  html body #overview.router-overview-framework .ik-mobile-public-home .ik-mobile-decision-trend .ik-mobile-decision-trend-plot {
    display: grid !important;
    grid-row: 1 !important;
    grid-column: 1 / -1 !important;
    grid-template-rows: 19px 70px !important;
    grid-template-columns: minmax(0, 1fr) !important;
    gap: 3px !important;
    min-height: 92px !important;
    height: 92px !important;
    max-height: 92px !important;
    width: 100% !important;
    min-width: 0 !important;
    margin: 0 !important;
    padding: 0 !important;
    border: 0 !important;
    border-radius: 0 !important;
    background: transparent !important;
    box-shadow: none !important;
    position: relative !important;
    transform: none !important;
    overflow: visible !important;
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

  html body #overview.router-overview-framework .ik-mobile-public-home .ik-mobile-decision-trend .ik-mobile-decision-visual {
    grid-row: 2 !important;
    min-height: 68px !important;
    height: 68px !important;
    max-height: 68px !important;
    padding: 4px 8px !important;
    overflow: hidden !important;
  }

  html body #overview.router-overview-framework .ik-mobile-public-home .ik-mobile-decision-trend [data-overview-mobile-v1012-product-chart] {
    display: block !important;
    width: 100% !important;
    height: 68px !important;
    max-height: 68px !important;
  }

  html body #overview.router-overview-framework .ik-mobile-public-home .ik-mobile-decision-trend > .ik-mobile-decision-readouts,
  html body #overview.router-overview-framework .ik-mobile-public-home .ik-mobile-decision-card .ik-mobile-decision-readouts {
    display: grid !important;
    grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
    grid-template-rows: repeat(2, minmax(24px, auto)) !important;
    align-self: start !important;
    position: static !important;
    grid-row: 2 !important;
    top: auto !important;
    right: auto !important;
    bottom: auto !important;
    left: auto !important;
    transform: none !important;
    z-index: 1 !important;
    width: 100% !important;
    min-height: 54px !important;
    height: 54px !important;
    max-height: 54px !important;
    margin: 0 !important;
    overflow: hidden !important;
  }

  html body #overview.router-overview-framework .ik-mobile-public-home .ik-mobile-decision-card {
    display: grid !important;
    grid-template-rows: 44px 146px 28px !important;
    align-content: start !important;
    gap: 5px !important;
    min-height: 241px !important;
    height: 241px !important;
    max-height: 241px !important;
    padding: 8px !important;
    overflow: hidden !important;
  }

  html body #overview.router-overview-framework .ik-mobile-public-home .ik-mobile-decision-head {
    grid-row: 1 !important;
    min-height: 44px !important;
    height: 44px !important;
    max-height: 44px !important;
    overflow: hidden !important;
    position: relative !important;
    z-index: 2 !important;
  }

  html body #overview.router-overview-framework .ik-mobile-public-home .ik-mobile-decision-head h1 {
    max-width: none !important;
    overflow: visible !important;
    text-overflow: clip !important;
    white-space: normal !important;
    font-size: 19px !important;
    line-height: 1.05 !important;
  }

  html body #overview.router-overview-framework .ik-mobile-public-home .ik-mobile-decision-head span,
  html body #overview.router-overview-framework .ik-mobile-public-home .ik-mobile-decision-head p {
    font-size: 10px !important;
    line-height: 1.08 !important;
  }

  html body #overview.router-overview-framework .ik-mobile-public-home .ik-mobile-next-step {
    grid-row: 3 !important;
    min-height: 28px !important;
    height: 28px !important;
    max-height: 28px !important;
    padding: 4px 8px !important;
  }

  html body #overview.router-overview-framework .ik-mobile-public-home .ik-mobile-wan-incident-stack {
    display: grid !important;
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    grid-template-rows: 44px 38px 38px !important;
    gap: 4px !important;
    min-height: 146px !important;
    height: 146px !important;
    max-height: 146px !important;
    padding: 6px !important;
    overflow: hidden !important;
  }

  html body #overview.router-overview-framework .ik-mobile-public-home .ik-mobile-channel-incident-stack {
    display: grid !important;
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    grid-template-rows: 44px 38px 38px !important;
    gap: 4px !important;
    min-height: 146px !important;
    height: 146px !important;
    max-height: 146px !important;
    padding: 6px !important;
    overflow: hidden !important;
  }

  html body #overview.router-overview-framework .ik-mobile-public-home .ik-mobile-resource-incident-stack {
    display: grid !important;
    grid-template-columns: minmax(0, 1fr) !important;
    grid-template-rows: 44px 30px 30px 30px !important;
    gap: 3px !important;
    min-height: 146px !important;
    height: 146px !important;
    max-height: 146px !important;
    padding: 6px !important;
    overflow: hidden !important;
  }

  html body #overview.router-overview-framework .ik-mobile-public-home .ik-mobile-abnormal-decision-rail {
    display: grid !important;
    grid-column: 1 / -1 !important;
    grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
    gap: 0 !important;
    min-height: 44px !important;
    height: 44px !important;
    max-height: 44px !important;
    padding: 0 !important;
    border: 0 !important;
    background: transparent !important;
    box-shadow: none !important;
    overflow: hidden !important;
  }

  html body #overview.router-overview-framework .ik-mobile-public-home .ik-mobile-abnormal-decision-rail > span {
    display: grid !important;
    align-content: center !important;
    gap: 1px !important;
    min-width: 0 !important;
    min-height: 40px !important;
    height: 44px !important;
    padding: 4px 5px !important;
    border: 0 !important;
    box-shadow: inset -0.5px 0 0 rgba(104, 127, 151, 0.16), inset 0 -0.5px 0 rgba(104, 127, 151, 0.16) !important;
    background: rgba(255, 255, 255, 0.42) !important;
  }

  html body #overview.router-overview-framework .ik-mobile-public-home .ik-mobile-abnormal-decision-rail em,
  html body #overview.router-overview-framework .ik-mobile-public-home .ik-mobile-abnormal-decision-rail strong {
    overflow: hidden !important;
    color: #6b7b8f !important;
    font-size: 8px !important;
    font-style: normal !important;
    font-weight: 620 !important;
    line-height: 1.05 !important;
    text-overflow: ellipsis !important;
    white-space: nowrap !important;
  }

  html body #overview.router-overview-framework .ik-mobile-public-home .ik-mobile-abnormal-decision-rail b {
    overflow: hidden !important;
    color: #1f2937 !important;
    font-size: 10px !important;
    font-weight: 820 !important;
    line-height: 1.05 !important;
    text-overflow: ellipsis !important;
    white-space: nowrap !important;
  }

  html body #overview.router-overview-framework .ik-mobile-public-home .ik-mobile-wan-incident-stack > [data-overview-mobile-wan-port-cell="router-port"] {
    min-height: 38px !important;
    height: 38px !important;
    max-height: 38px !important;
    padding: 5px 6px !important;
  }

  html body #overview.router-overview-framework .ik-mobile-public-home .ik-mobile-channel-incident-stack > span {
    min-height: 38px !important;
    height: 38px !important;
    max-height: 38px !important;
    padding: 5px 6px !important;
  }

  html body #overview.router-overview-framework .ik-mobile-public-home .ik-mobile-resource-incident-stack > .ik-mobile-resource-line {
    min-height: 30px !important;
    height: 30px !important;
    max-height: 30px !important;
    grid-template-columns: 38px minmax(0, 1fr) 42px !important;
  }

  html body #overview.router-overview-framework .ik-mobile-public-home [data-overview-mobile-terminal-ranking-mounted="false"] .ik-mobile-supporting-list .ik-v420-list-row {
    min-height: 44px !important;
    height: 44px !important;
    padding-top: 7px !important;
    padding-bottom: 7px !important;
  }

  html body #overview.router-overview-framework .ik-mobile-public-home .ik-v420-tabs,
  html body #overview.router-overview-framework .ik-mobile-public-home .ik-v240-tabs {
    width: calc(100vw - 24px) !important;
    max-width: none !important;
    min-width: 0 !important;
    border: 0 !important;
    border-top: 0 !important;
    background: rgb(247, 250, 253) !important;
    box-shadow: none !important;
  }

  html body #overview.router-overview-framework .ik-mobile-public-home .ik-v420-tabs button,
  html body #overview.router-overview-framework .ik-mobile-public-home .ik-v240-tabs button {
    display: grid !important;
    visibility: visible !important;
    opacity: 1 !important;
    min-width: 0 !important;
    width: auto !important;
    border: 0 !important;
    border-top: 0 !important;
    background: transparent !important;
    box-shadow: none !important;
    color: #607086 !important;
  }

  html body #overview.router-overview-framework .ik-mobile-public-home .ik-v420-tabs button.is-active,
  html body #overview.router-overview-framework .ik-mobile-public-home .ik-v240-tabs button.is-active {
    border-top: 0 !important;
    background: transparent !important;
    box-shadow: none !important;
    color: rgb(18, 34, 55) !important;
  }

  html body #overview.router-overview-framework .ik-mobile-public-home[data-overview-mobile-v1110-public-home] .ik-mobile-decision-screen {
    display: grid !important;
    grid-template-rows: 46px auto 64px minmax(132px, 1fr) !important;
    gap: 9px !important;
    padding: max(12px, env(safe-area-inset-top)) 12px calc(76px + env(safe-area-inset-bottom)) !important;
    background: #edf2f7 !important;
  }

  html body #overview.router-overview-framework .ik-mobile-public-home[data-overview-mobile-v1110-public-home] .ik-mobile-device-bar {
    min-height: 46px !important;
    height: 46px !important;
    padding: 0 1px !important;
  }

  html body #overview.router-overview-framework .ik-mobile-public-home[data-overview-mobile-v1110-public-home] .ik-mobile-device-title {
    justify-items: center !important;
    text-align: center !important;
  }

  html body #overview.router-overview-framework .ik-mobile-public-home[data-overview-mobile-v1110-public-home] .ik-mobile-device-title b {
    color: #142033 !important;
    font-size: 17px !important;
    letter-spacing: -.035em !important;
  }

  html body #overview.router-overview-framework .ik-mobile-public-home[data-overview-mobile-v1110-public-home] .ik-mobile-device-title span {
    color: #66758a !important;
    font-size: 10.5px !important;
  }

  html body #overview.router-overview-framework .ik-mobile-public-home[data-overview-mobile-v1110-public-home] .ik-mobile-context-button {
    width: 36px !important;
    height: 36px !important;
    border: 0 !important;
    background: transparent !important;
    box-shadow: none !important;
  }

  html body #overview.router-overview-framework .ik-mobile-public-home[data-overview-mobile-v1110-public-home] .ik-mobile-device-bar .ik-v240-status {
    min-width: 58px !important;
    min-height: 30px !important;
    border-radius: 8px !important;
    border-color: #b9cce3 !important;
    background: #f8fbff !important;
  }

  html body #overview.router-overview-framework .ik-mobile-public-home[data-overview-mobile-v1110-public-home] .ik-mobile-decision-card {
    display: grid !important;
    grid-template-rows: auto minmax(128px, auto) 34px !important;
    gap: 9px !important;
    min-height: 0 !important;
    height: auto !important;
    max-height: none !important;
    padding: 12px !important;
    border: 1px solid #bed2e8 !important;
    border-left: 4px solid #1f6fd1 !important;
    border-radius: 9px !important;
    background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%) !important;
    box-shadow: none !important;
  }

  html body #overview.router-overview-framework .ik-mobile-public-home[data-overview-mobile-v1110-public-home] .ik-mobile-decision-card.is-danger {
    border-left-color: #c62828 !important;
  }

  html body #overview.router-overview-framework .ik-mobile-public-home[data-overview-mobile-v1110-public-home] .ik-mobile-decision-card.is-warn,
  html body #overview.router-overview-framework .ik-mobile-public-home[data-overview-mobile-v1110-public-home] .ik-mobile-decision-card.is-missing {
    border-left-color: #b7791f !important;
  }

  html body #overview.router-overview-framework .ik-mobile-public-home[data-overview-mobile-v1110-public-home] .ik-mobile-decision-head {
    min-height: 0 !important;
    height: auto !important;
    max-height: none !important;
    gap: 4px !important;
  }

  html body #overview.router-overview-framework .ik-mobile-public-home[data-overview-mobile-v1110-public-home] .ik-mobile-decision-head span {
    color: #52657a !important;
    font-size: 10.5px !important;
    font-weight: 760 !important;
  }

  html body #overview.router-overview-framework .ik-mobile-public-home[data-overview-mobile-v1110-public-home] .ik-mobile-decision-head h1 {
    color: #0f1f32 !important;
    font-size: 30px !important;
    font-weight: 900 !important;
    line-height: .98 !important;
    letter-spacing: -.065em !important;
  }

  html body #overview.router-overview-framework .ik-mobile-public-home[data-overview-mobile-v1110-public-home] .ik-mobile-decision-head p {
    color: #52657a !important;
    font-size: 11px !important;
    font-weight: 620 !important;
    line-height: 1.22 !important;
  }

  html body #overview.router-overview-framework .ik-mobile-public-home[data-overview-mobile-v1110-public-home] .ik-mobile-decision-card > .ik-mobile-decision-trend {
    grid-template-rows: 88px 52px !important;
    min-height: 140px !important;
    height: 140px !important;
    max-height: 140px !important;
  }

  html body #overview.router-overview-framework .ik-mobile-public-home[data-overview-mobile-v1110-public-home] .ik-mobile-decision-trend .ik-mobile-decision-trend-plot {
    grid-template-rows: 18px 66px !important;
    min-height: 88px !important;
    height: 88px !important;
    max-height: 88px !important;
  }

  html body #overview.router-overview-framework .ik-mobile-public-home[data-overview-mobile-v1110-public-home] .ik-mobile-decision-trend .ik-mobile-decision-visual {
    height: 64px !important;
    max-height: 64px !important;
    border-radius: 7px !important;
    background: #f4f8fc !important;
  }

  html body #overview.router-overview-framework .ik-mobile-public-home[data-overview-mobile-v1110-public-home] .ik-mobile-decision-trend [data-overview-mobile-v1012-product-chart] {
    height: 64px !important;
    max-height: 64px !important;
  }

  html body #overview.router-overview-framework .ik-mobile-public-home[data-overview-mobile-v1110-public-home] .ik-mobile-decision-card .ik-mobile-decision-readouts {
    min-height: 52px !important;
    height: 52px !important;
    max-height: 52px !important;
    border-top: 1px solid #dce7f2 !important;
  }

  html body #overview.router-overview-framework .ik-mobile-public-home[data-overview-mobile-v1110-public-home] .ik-mobile-decision-readouts span {
    min-height: 26px !important;
    padding: 4px 5px !important;
    box-shadow: inset -1px 0 0 rgba(119, 141, 166, .14) !important;
  }

  html body #overview.router-overview-framework .ik-mobile-public-home[data-overview-mobile-v1110-public-home] .ik-mobile-next-step {
    grid-template-columns: 42px minmax(72px, .8fr) minmax(0, 1fr) !important;
    min-height: 34px !important;
    height: 34px !important;
    max-height: 34px !important;
    border-radius: 7px !important;
    background: #f8fbff !important;
  }

  html body #overview.router-overview-framework .ik-mobile-public-home[data-overview-mobile-v1110-public-home] .ik-mobile-core-facts {
    grid-row: auto !important;
    min-height: 64px !important;
    height: 64px !important;
    border-radius: 8px !important;
    border-color: #cbd9e8 !important;
    background: #ffffff !important;
  }

  html body #overview.router-overview-framework .ik-mobile-public-home[data-overview-mobile-v1110-public-home] .ik-mobile-core-facts span {
    min-height: 64px !important;
    padding: 7px 6px !important;
  }

  html body #overview.router-overview-framework .ik-mobile-public-home[data-overview-mobile-v1110-public-home] .ik-mobile-supporting-surface {
    min-height: 0 !important;
    overflow: hidden !important;
  }

  html body #overview.router-overview-framework .ik-mobile-public-home[data-overview-mobile-v1110-public-home] .ik-mobile-supporting-list {
    height: 100% !important;
    border-radius: 8px !important;
  }

  html body #overview.router-overview-framework .ik-mobile-public-home[data-overview-mobile-v1110-public-home] .ik-mobile-supporting-list header {
    min-height: 34px !important;
    padding: 7px 9px !important;
  }

  html body #overview.router-overview-framework .ik-mobile-public-home[data-overview-mobile-v1110-public-home] .ik-mobile-supporting-list .ik-v420-list-row {
    min-height: 42px !important;
    height: 42px !important;
    padding: 6px 9px !important;
  }

  html body #overview.router-overview-framework .ik-mobile-public-home[data-overview-mobile-v1110-public-home] .ik-mobile-wan-incident-stack,
  html body #overview.router-overview-framework .ik-mobile-public-home[data-overview-mobile-v1110-public-home] .ik-mobile-channel-incident-stack,
  html body #overview.router-overview-framework .ik-mobile-public-home[data-overview-mobile-v1110-public-home] .ik-mobile-generic-incident-stack,
  html body #overview.router-overview-framework .ik-mobile-public-home[data-overview-mobile-v1110-public-home] .ik-mobile-resource-incident-stack {
    min-height: 136px !important;
    height: auto !important;
    max-height: none !important;
    border-radius: 7px !important;
    background: #f6f9fc !important;
  }

  html body #overview.router-overview-framework .ik-mobile-public-home[data-overview-mobile-v1110-public-home] .ik-mobile-resource-incident-stack > .ik-mobile-resource-line {
    display: grid !important;
    grid-template-columns: 48px minmax(0, 1fr) 46px !important;
    grid-template-areas:
      "label bar value"
      "threshold note value" !important;
    align-items: center !important;
    column-gap: 8px !important;
    row-gap: 2px !important;
    min-height: 30px !important;
    height: 30px !important;
    max-height: 30px !important;
    padding: 4px 6px !important;
  }

  html body #overview.router-overview-framework .ik-mobile-public-home[data-overview-mobile-v1110-public-home] .ik-mobile-resource-incident-stack > .ik-mobile-resource-line > b {
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

  html body #overview.router-overview-framework .ik-mobile-public-home[data-overview-mobile-v1110-public-home] .ik-mobile-resource-incident-stack > .ik-mobile-resource-line > i {
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

  html body #overview.router-overview-framework .ik-mobile-public-home[data-overview-mobile-v1110-public-home] .ik-mobile-resource-incident-stack > .ik-mobile-resource-line > i > u {
    display: block !important;
    height: 100% !important;
    border-radius: inherit !important;
  }

  html body #overview.router-overview-framework .ik-mobile-public-home[data-overview-mobile-v1110-public-home] .ik-mobile-resource-incident-stack > .ik-mobile-resource-line > strong {
    grid-area: value !important;
    justify-self: end !important;
    align-self: center !important;
    color: #172236 !important;
    font-size: 12px !important;
    font-weight: 860 !important;
    line-height: 1 !important;
    white-space: nowrap !important;
  }

  html body #overview.router-overview-framework .ik-mobile-public-home[data-overview-mobile-v1110-public-home] .ik-mobile-resource-incident-stack > .ik-mobile-resource-line > small {
    grid-area: threshold !important;
    min-width: 0 !important;
    overflow: hidden !important;
    color: #6b7b8f !important;
    font-size: 8px !important;
    font-weight: 640 !important;
    line-height: 1.05 !important;
    text-overflow: ellipsis !important;
    white-space: nowrap !important;
  }

  html body #overview.router-overview-framework .ik-mobile-public-home[data-overview-mobile-v1110-public-home] .ik-mobile-resource-incident-stack > .ik-mobile-resource-line > em {
    grid-area: note !important;
    min-width: 0 !important;
    overflow: hidden !important;
    color: #6b7b8f !important;
    font-size: 8px !important;
    font-style: normal !important;
    font-weight: 640 !important;
    line-height: 1.05 !important;
    text-overflow: ellipsis !important;
    white-space: nowrap !important;
  }

  html body #overview.router-overview-framework .ik-mobile-public-home[data-overview-mobile-v1110-public-home] .ik-mobile-abnormal-decision-rail {
    min-height: 44px !important;
    height: 44px !important;
    max-height: 44px !important;
  }

  html body #overview.router-overview-framework .ik-mobile-public-home[data-overview-mobile-v1110-public-home] .ik-mobile-abnormal-decision-rail > span {
    min-height: 44px !important;
    height: 44px !important;
    max-height: 44px !important;
  }

  html body #overview.router-overview-framework .ik-mobile-public-home[data-overview-mobile-v1110-public-home] .ik-v420-tabs,
  html body #overview.router-overview-framework .ik-mobile-public-home[data-overview-mobile-v1110-public-home] .ik-v240-tabs {
    position: fixed !important;
    left: 12px !important;
    right: 12px !important;
    bottom: max(8px, env(safe-area-inset-bottom)) !important;
    width: auto !important;
    min-width: 0 !important;
    max-width: none !important;
    transform: none !important;
    grid-template-columns: repeat(5, minmax(0, 1fr)) !important;
    border: 1px solid #d3deea !important;
    border-radius: 10px !important;
    background: rgba(249, 252, 255, .97) !important;
    box-shadow: none !important;
  }

  html body #overview.router-overview-framework .ik-mobile-public-home[data-overview-mobile-v1110-public-home] .ik-v420-tabs button.is-active,
  html body #overview.router-overview-framework .ik-mobile-public-home[data-overview-mobile-v1110-public-home] .ik-v240-tabs button.is-active {
    background: #edf4fb !important;
    box-shadow: inset 0 -2px 0 #1f6fd1 !important;
    color: #143b6f !important;
  }
}
`;
