export const MOBILE_OVERVIEW_PUBLIC_DECISION_STYLES = `
@media (max-width: 760px), (min-width: 761px) and (max-width: 900px) and (max-height: 520px) {
  #overview.router-overview-framework .ik-mobile-public-home,
  #overview.router-overview-framework .ik-mobile-public-home * {
    box-sizing: border-box;
  }

  #overview.router-overview-framework .ik-mobile-public-home {
    display: block !important;
    min-height: 100dvh !important;
    color: #1f2937 !important;
    font-family: "Microsoft YaHei", "PingFang SC", "Segoe UI", system-ui, sans-serif !important;
  }

  #overview.router-overview-framework .ik-mobile-public-home .ik-v420-shell,
  #overview.router-overview-framework .ik-mobile-public-home .ik-v240-shell {
    display: block !important;
    width: 100% !important;
    max-width: none !important;
    min-height: 100dvh !important;
    padding: 0 !important;
    background: #eef2f6 !important;
  }

  #overview.router-overview-framework .ik-mobile-decision-screen {
    display: grid !important;
    grid-template-rows: auto auto auto minmax(0, auto) auto !important;
    gap: 8px !important;
    min-height: 100dvh !important;
    padding: max(10px, env(safe-area-inset-top)) 12px calc(76px + env(safe-area-inset-bottom)) !important;
    background:
      linear-gradient(180deg, #f6f8fb 0%, #edf2f7 100%) !important;
    overflow-x: clip !important;
  }

  #overview.router-overview-framework .ik-mobile-device-bar {
    display: flex !important;
    align-items: center !important;
    justify-content: space-between !important;
    gap: 10px !important;
    min-height: 44px !important;
    padding: 0 2px !important;
    border: 0 !important;
    background: transparent !important;
    box-shadow: none !important;
  }

  #overview.router-overview-framework .ik-mobile-device-title {
    display: grid !important;
    min-width: 0 !important;
    gap: 2px !important;
  }

  #overview.router-overview-framework .ik-mobile-device-title b {
    min-width: 0 !important;
    color: #162334 !important;
    font-size: 17px !important;
    font-weight: 840 !important;
    line-height: 1.12 !important;
    letter-spacing: -.03em !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
    white-space: nowrap !important;
  }

  #overview.router-overview-framework .ik-mobile-device-title span {
    color: #64748b !important;
    font-size: 11px !important;
    font-weight: 620 !important;
    line-height: 1.12 !important;
    white-space: nowrap !important;
  }

  #overview.router-overview-framework .ik-mobile-device-bar .ik-v240-status {
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    flex: 0 0 auto !important;
    min-width: 58px !important;
    min-height: 30px !important;
    padding: 0 10px !important;
    border: 1px solid #cbd8e6 !important;
    border-radius: 7px !important;
    background: #ffffff !important;
    color: #26384d !important;
    box-shadow: none !important;
    font-size: 12px !important;
    font-weight: 820 !important;
    line-height: 1 !important;
  }

  #overview.router-overview-framework .ik-mobile-device-bar .ik-v240-status i {
    width: 7px !important;
    height: 7px !important;
    margin-right: 5px !important;
    border-radius: 2px !important;
    background: #24a35a !important;
    box-shadow: none !important;
  }

  #overview.router-overview-framework .ik-mobile-device-bar .ik-v240-status.is-warn i,
  #overview.router-overview-framework .ik-mobile-device-bar .ik-v240-status.is-missing i {
    background: #d88917 !important;
  }

  #overview.router-overview-framework .ik-mobile-device-bar .ik-v240-status.is-danger i {
    background: #d93025 !important;
  }

  #overview.router-overview-framework .ik-mobile-decision-card {
    display: grid !important;
    gap: 10px !important;
    min-height: 0 !important;
    padding: 12px !important;
    border: 1px solid #c9d6e4 !important;
    border-left: 4px solid #4794eb !important;
    border-radius: 10px !important;
    background: #ffffff !important;
    box-shadow: none !important;
    overflow: hidden !important;
  }

  #overview.router-overview-framework .ik-mobile-decision-card.is-danger {
    border-left-color: #d93025 !important;
  }

  #overview.router-overview-framework .ik-mobile-decision-card.is-warn,
  #overview.router-overview-framework .ik-mobile-decision-card.is-missing {
    border-left-color: #d88917 !important;
  }

  #overview.router-overview-framework .ik-mobile-decision-head {
    display: grid !important;
    gap: 4px !important;
    min-width: 0 !important;
  }

  #overview.router-overview-framework .ik-mobile-decision-head span {
    color: #526276 !important;
    font-size: 11px !important;
    font-weight: 760 !important;
    line-height: 1.1 !important;
  }

  #overview.router-overview-framework .ik-mobile-decision-head h1 {
    margin: 0 !important;
    color: #101828 !important;
    font-size: 23px !important;
    font-weight: 880 !important;
    line-height: 1.05 !important;
    letter-spacing: -.052em !important;
    white-space: normal !important;
  }

  #overview.router-overview-framework .ik-mobile-decision-head p {
    margin: 0 !important;
    color: #53657a !important;
    font-size: 11.5px !important;
    font-weight: 560 !important;
    line-height: 1.32 !important;
    white-space: normal !important;
  }

  #overview.router-overview-framework .ik-mobile-decision-visual {
    display: grid !important;
    gap: 7px !important;
    min-height: 76px !important;
    padding: 8px !important;
    border: 1px solid #dbe5ef !important;
    border-radius: 7px !important;
    background: #f8fafc !important;
    box-shadow: none !important;
  }

  #overview.router-overview-framework .ik-mobile-decision-trend {
    display: grid !important;
    gap: 5px !important;
    min-height: 86px !important;
    height: 86px !important;
    max-height: 86px !important;
    padding: 0 !important;
    margin: 0 !important;
    border: 0 !important;
    background: transparent !important;
    box-shadow: none !important;
    overflow: visible !important;
  }

  #overview.router-overview-framework .ik-mobile-decision-trend .ik-mobile-decision-visual {
    min-height: 0 !important;
    height: 64px !important;
    max-height: 64px !important;
    padding: 5px 8px !important;
    overflow: visible !important;
  }

  #overview.router-overview-framework .ik-mobile-decision-trend .ik-v420-line-chart {
    height: 72px !important;
    max-height: 72px !important;
  }

  #overview.router-overview-framework .ik-mobile-decision-card > .ik-mobile-decision-readouts {
    margin-top: 0 !important;
    align-self: stretch !important;
    width: 100% !important;
  }

  #overview.router-overview-framework .ik-mobile-decision-visual svg {
    display: block !important;
    width: 100% !important;
    height: 58px !important;
    overflow: visible !important;
  }

  #overview.router-overview-framework .ik-mobile-decision-grid {
    fill: none !important;
    stroke: #e1e9f2 !important;
    stroke-width: 1 !important;
  }

  #overview.router-overview-framework .ik-mobile-decision-ref {
    fill: none !important;
    stroke: #9fb3c8 !important;
    stroke-dasharray: 3 4 !important;
    stroke-width: 1 !important;
  }

  #overview.router-overview-framework .ik-mobile-decision-line {
    fill: none !important;
    stroke-linecap: round !important;
    stroke-linejoin: round !important;
    stroke-width: 2.2 !important;
  }

  #overview.router-overview-framework .ik-mobile-decision-line.is-download {
    stroke: #0c63ce !important;
  }

  #overview.router-overview-framework .ik-mobile-decision-line.is-upload {
    stroke: #6f879f !important;
    stroke-width: 1.6 !important;
  }

  #overview.router-overview-framework .ik-mobile-decision-dot {
    fill: #0c63ce !important;
    stroke: #fff !important;
    stroke-width: 2 !important;
  }

  #overview.router-overview-framework .ik-mobile-decision-readouts {
    display: grid !important;
    grid-template-columns: 1.1fr .9fr .9fr !important;
    gap: 6px !important;
  }

  #overview.router-overview-framework .ik-mobile-decision-readouts span,
  #overview.router-overview-framework .ik-mobile-decision-visual > span,
  #overview.router-overview-framework .ik-mobile-resource-line {
    min-width: 0 !important;
  }

  #overview.router-overview-framework .ik-mobile-decision-readouts em,
  #overview.router-overview-framework .ik-mobile-decision-visual em {
    display: block !important;
    color: #6b7b8f !important;
    font-size: 9.5px !important;
    font-style: normal !important;
    font-weight: 650 !important;
    line-height: 1.1 !important;
  }

  #overview.router-overview-framework .ik-mobile-decision-readouts b {
    display: block !important;
    margin-top: 1px !important;
    color: #1f2937 !important;
    font-family: Bahnschrift, "Segoe UI", sans-serif !important;
    font-size: 13px !important;
    font-weight: 820 !important;
    line-height: 1.05 !important;
    white-space: nowrap !important;
  }

  #overview.router-overview-framework .ik-mobile-resource-line {
    display: grid !important;
    grid-template-columns: 42px minmax(0, 1fr) 44px !important;
    gap: 8px !important;
    align-items: center !important;
    min-height: 18px !important;
    color: #2b3a4b !important;
  }

  #overview.router-overview-framework .ik-mobile-resource-line b,
  #overview.router-overview-framework .ik-mobile-resource-line strong {
    font-size: 11px !important;
    font-weight: 790 !important;
    line-height: 1 !important;
  }

  #overview.router-overview-framework .ik-mobile-resource-line i {
    display: block !important;
    height: 5px !important;
    border-radius: 999px !important;
    background: #dfe8f1 !important;
    overflow: hidden !important;
  }

  #overview.router-overview-framework .ik-mobile-resource-line u {
    display: block !important;
    height: 100% !important;
    border-radius: inherit !important;
    background: #4794eb !important;
  }

  #overview.router-overview-framework .ik-mobile-resource-line.is-danger u {
    background: #d93025 !important;
  }

  #overview.router-overview-framework .ik-v240-channel-line,
  #overview.router-overview-framework .ik-v240-flow {
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
  }

  #overview.router-overview-framework .ik-v240-channel-line span,
  #overview.router-overview-framework .ik-v240-flow span {
    display: grid !important;
    gap: 2px !important;
    min-height: 38px !important;
    padding: 6px !important;
    border: 1px solid #dfe7f0 !important;
    border-radius: 6px !important;
    background: #ffffff !important;
  }

  #overview.router-overview-framework .ik-v240-channel-line b,
  #overview.router-overview-framework .ik-v240-flow b {
    color: #1f2937 !important;
    font-size: 12px !important;
    font-weight: 820 !important;
    line-height: 1.05 !important;
  }

  #overview.router-overview-framework .ik-v240-channel-line strong,
  #overview.router-overview-framework .ik-v240-flow strong {
    color: #607086 !important;
    font-size: 9.5px !important;
    font-weight: 620 !important;
    line-height: 1.12 !important;
  }

  #overview.router-overview-framework .ik-mobile-next-step {
    display: grid !important;
    grid-template-columns: 44px minmax(0, .74fr) minmax(0, 1.2fr) !important;
    gap: 8px !important;
    align-items: center !important;
    min-height: 34px !important;
    padding: 7px 8px !important;
    border: 1px solid #d7e2ed !important;
    border-radius: 7px !important;
    background: #fbfdff !important;
  }

  #overview.router-overview-framework .ik-mobile-next-step span,
  #overview.router-overview-framework .ik-mobile-next-step em {
    color: #64748b !important;
    font-size: 10px !important;
    font-style: normal !important;
    font-weight: 650 !important;
    line-height: 1.1 !important;
  }

  #overview.router-overview-framework .ik-mobile-next-step b {
    color: #182536 !important;
    font-size: 12px !important;
    font-weight: 840 !important;
    line-height: 1.1 !important;
  }

  #overview.router-overview-framework .ik-mobile-core-facts {
    display: grid !important;
    grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
    gap: 0 !important;
    min-height: 62px !important;
    padding: 0 !important;
    border: 1px solid #d1dce8 !important;
    border-radius: 8px !important;
    background: #ffffff !important;
    box-shadow: none !important;
    overflow: hidden !important;
  }

  #overview.router-overview-framework .ik-mobile-core-facts span {
    display: grid !important;
    align-content: center !important;
    min-width: 0 !important;
    min-height: 62px !important;
    padding: 7px 6px !important;
    border-right: 1px solid #e3ebf3 !important;
    background: transparent !important;
    box-shadow: none !important;
  }

  #overview.router-overview-framework .ik-mobile-core-facts span:last-child {
    border-right: 0 !important;
  }

  #overview.router-overview-framework .ik-mobile-core-facts em {
    color: #68788c !important;
    font-size: 9.5px !important;
    font-style: normal !important;
    font-weight: 700 !important;
    line-height: 1.05 !important;
    white-space: nowrap !important;
  }

  #overview.router-overview-framework .ik-mobile-core-facts strong {
    display: block !important;
    margin-top: 4px !important;
    color: #172236 !important;
    font-family: Bahnschrift, "Segoe UI", sans-serif !important;
    font-size: 13px !important;
    font-weight: 840 !important;
    line-height: 1.05 !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
    white-space: nowrap !important;
  }

  #overview.router-overview-framework .ik-mobile-core-facts small {
    display: block !important;
    margin-top: 3px !important;
    color: #7b8798 !important;
    font-size: 8.5px !important;
    font-weight: 580 !important;
    line-height: 1.08 !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
    white-space: nowrap !important;
  }

  #overview.router-overview-framework .ik-mobile-supporting-list {
    display: grid !important;
    gap: 0 !important;
    min-height: 0 !important;
    padding: 0 !important;
    border: 1px solid #d4dfeb !important;
    border-radius: 8px !important;
    background: #ffffff !important;
    box-shadow: none !important;
    overflow: hidden !important;
  }

  #overview.router-overview-framework .ik-mobile-supporting-list header {
    display: grid !important;
    grid-template-columns: minmax(0, 1fr) auto !important;
    gap: 2px 8px !important;
    min-height: 36px !important;
    padding: 7px 9px !important;
    border-bottom: 1px solid #e4ecf4 !important;
    background: #f8fafc !important;
  }

  #overview.router-overview-framework .ik-mobile-supporting-list header b {
    color: #1f2937 !important;
    font-size: 12px !important;
    font-weight: 840 !important;
    line-height: 1.1 !important;
  }

  #overview.router-overview-framework .ik-mobile-supporting-list header span,
  #overview.router-overview-framework .ik-mobile-supporting-list header em {
    color: #6b7b8f !important;
    font-size: 9.5px !important;
    font-style: normal !important;
    font-weight: 620 !important;
    line-height: 1.08 !important;
  }

  #overview.router-overview-framework .ik-mobile-supporting-list header span {
    grid-column: 1 / -1 !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
    white-space: nowrap !important;
  }

  #overview.router-overview-framework .ik-mobile-supporting-list .ik-v420-list-row {
    display: grid !important;
    grid-template-columns: 30px minmax(0, 1fr) auto !important;
    gap: 8px !important;
    align-items: center !important;
    min-height: 43px !important;
    padding: 6px 9px !important;
    border-bottom: 1px solid #edf2f7 !important;
    background: #ffffff !important;
    box-shadow: none !important;
  }

  #overview.router-overview-framework .ik-mobile-supporting-list .ik-v420-list-row:last-child {
    border-bottom: 0 !important;
  }

  #overview.router-overview-framework .ik-mobile-row-token {
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    width: 24px !important;
    height: 24px !important;
    border: 1px solid #cdd9e5 !important;
    border-radius: 5px !important;
    background: #f7fafc !important;
    color: #334155 !important;
    font-size: 10px !important;
    font-style: normal !important;
    font-weight: 830 !important;
  }

  #overview.router-overview-framework .ik-mobile-supporting-list span {
    min-width: 0 !important;
  }

  #overview.router-overview-framework .ik-mobile-supporting-list span b,
  #overview.router-overview-framework .ik-mobile-supporting-list strong b {
    color: #243244 !important;
    font-size: 11.5px !important;
    font-weight: 780 !important;
    line-height: 1.08 !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
    white-space: nowrap !important;
  }

  #overview.router-overview-framework .ik-mobile-supporting-list span em,
  #overview.router-overview-framework .ik-mobile-supporting-list strong small {
    display: block !important;
    margin-top: 2px !important;
    color: #6d7b8e !important;
    font-size: 9px !important;
    font-style: normal !important;
    font-weight: 560 !important;
    line-height: 1.08 !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
    white-space: nowrap !important;
  }

  #overview.router-overview-framework .ik-mobile-supporting-list strong {
    min-width: 54px !important;
    text-align: right !important;
  }

  #overview.router-overview-framework .ik-mobile-public-home .ik-v420-tabs,
  #overview.router-overview-framework .ik-mobile-public-home .ik-v240-tabs {
    position: fixed !important;
    left: 12px !important;
    right: 12px !important;
    bottom: max(8px, env(safe-area-inset-bottom)) !important;
    z-index: 20 !important;
    display: grid !important;
    grid-template-columns: repeat(5, minmax(0, 1fr)) !important;
    gap: 0 !important;
    min-height: 54px !important;
    padding: 5px !important;
    border: 1px solid #c9d6e4 !important;
    border-radius: 11px !important;
    background: rgba(255, 255, 255, .96) !important;
    box-shadow: 0 -6px 18px rgba(32, 48, 68, .08) !important;
    backdrop-filter: blur(10px) !important;
  }

  #overview.router-overview-framework .ik-mobile-public-home .ik-v420-tabs button,
  #overview.router-overview-framework .ik-mobile-public-home .ik-v240-tabs button {
    display: grid !important;
    place-items: center !important;
    gap: 2px !important;
    min-width: 0 !important;
    min-height: 44px !important;
    padding: 2px 0 !important;
    border: 0 !important;
    border-radius: 7px !important;
    background: transparent !important;
    color: #607086 !important;
    box-shadow: none !important;
    font-size: 10px !important;
    font-weight: 660 !important;
  }

  #overview.router-overview-framework .ik-mobile-public-home .ik-v420-tabs svg,
  #overview.router-overview-framework .ik-mobile-public-home .ik-v240-tabs svg {
    width: 18px !important;
    height: 18px !important;
    fill: none !important;
    stroke: currentColor !important;
    stroke-width: 1.8 !important;
    stroke-linecap: round !important;
    stroke-linejoin: round !important;
  }

  #overview.router-overview-framework .ik-mobile-public-home .ik-v420-tabs button.is-active,
  #overview.router-overview-framework .ik-mobile-public-home .ik-v240-tabs button.is-active {
    background: #eef4fb !important;
    color: #0c53bd !important;
    box-shadow: inset 0 -2px 0 #0c53bd !important;
  }
}

@media (min-width: 761px) and (max-width: 900px) and (max-height: 520px) {
  #overview.router-overview-framework .ik-mobile-public-home .ik-mobile-decision-screen {
    grid-template-columns: minmax(260px, .9fr) minmax(0, 1.1fr) !important;
    grid-template-areas:
      "nav nav"
      "hero facts"
      "hero list"
      "tabs tabs" !important;
    min-height: 100vh !important;
    padding: 10px 12px 68px !important;
  }

  #overview.router-overview-framework .ik-mobile-public-home .ik-mobile-device-bar {
    grid-area: nav !important;
  }

  #overview.router-overview-framework .ik-mobile-public-home .ik-mobile-decision-card {
    grid-area: hero !important;
  }

  #overview.router-overview-framework .ik-mobile-public-home .ik-mobile-core-facts {
    grid-area: facts !important;
  }

  #overview.router-overview-framework .ik-mobile-public-home .ik-mobile-supporting-surface {
    grid-area: list !important;
  }
}
`;