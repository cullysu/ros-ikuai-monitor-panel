const MOBILE_OVERVIEW_CURRENT_SHELL_STYLES = `
@media (max-width: 760px) {
  html:has(#overview.router-overview-framework .ik-mobile-public-home[data-overview-mobile-console]),
  body:has(#overview.router-overview-framework .ik-mobile-public-home[data-overview-mobile-console]) {
    height: 100dvh !important;
    max-height: 100dvh !important;
    margin: 0 !important;
    overflow: hidden !important;
  }

  #overview.router-overview-framework {
    height: 100dvh !important;
    max-height: 100dvh !important;
    min-height: 0 !important;
    overflow: hidden !important;
  }

  #overview.router-overview-framework .ik-mobile-public-home[data-overview-mobile-console] {
    position: fixed !important;
    inset: 0 !important;
    width: 100vw !important;
    height: 100dvh !important;
    max-height: 100dvh !important;
    min-height: 0 !important;
    overflow: hidden !important;
  }

  #overview.router-overview-framework .ik-mobile-public-home[data-overview-mobile-console] .ik-v420-shell,
  #overview.router-overview-framework .ik-mobile-public-home[data-overview-mobile-console] .ik-mobile-decision-screen {
    height: 100dvh !important;
    max-height: 100dvh !important;
    min-height: 0 !important;
  }

  #overview.router-overview-framework .ik-mobile-public-home[data-overview-mobile-console] .ik-mobile-decision-screen {
    overflow-x: hidden !important;
    overflow-y: auto !important;
    scrollbar-width: none !important;
  }

  #overview.router-overview-framework .ik-mobile-public-home[data-overview-mobile-console] .ik-mobile-decision-screen::-webkit-scrollbar {
    display: none !important;
  }

  #overview.router-overview-framework .ik-mobile-public-home[data-overview-mobile-console] .ik-v420-tabs {
    grid-template-columns: repeat(5, minmax(0, 1fr)) !important;
    min-height: 52px !important;
    padding: 2px 11px max(2px, env(safe-area-inset-bottom, 0px)) !important;
    border-top: 0 !important;
    background: rgba(247, 250, 253, .94) !important;
    box-shadow: none !important;
  }

  #overview.router-overview-framework .ik-mobile-public-home[data-overview-mobile-console] .ik-v420-tabs button {
    display: grid !important;
    grid-template-rows: 17px 12px !important;
    align-content: center !important;
    justify-items: center !important;
    gap: 1px !important;
    min-width: 0 !important;
    min-height: 44px !important;
    padding: 2px 1px !important;
    color: #8090a3 !important;
    background: transparent !important;
    box-shadow: none !important;
  }

  #overview.router-overview-framework .ik-mobile-public-home[data-overview-mobile-console] .ik-v420-tabs button svg {
    width: 15px !important;
    height: 15px !important;
    opacity: .82 !important;
    stroke-width: 1.65 !important;
  }

  #overview.router-overview-framework .ik-mobile-public-home[data-overview-mobile-console] .ik-v420-tabs button span {
    overflow: hidden !important;
    max-width: 100% !important;
    font-size: 10px !important;
    font-weight: 640 !important;
    line-height: 12px !important;
    text-overflow: clip !important;
    white-space: nowrap !important;
  }

  #overview.router-overview-framework .ik-mobile-public-home[data-overview-mobile-console] .ik-v420-tabs button.is-active {
    color: #122237 !important;
    background: transparent !important;
    box-shadow: inset 0 -1px 0 rgba(18, 34, 55, .44) !important;
  }

  #overview.router-overview-framework .ik-mobile-public-home[data-overview-mobile-console] .ik-mobile-supporting-surface,
  #overview.router-overview-framework .ik-mobile-public-home[data-overview-mobile-console] .ik-mobile-supporting-list {
    border: 0 !important;
    background: rgba(244, 248, 252, .64) !important;
    box-shadow: none !important;
  }

  #overview.router-overview-framework .ik-mobile-public-home[data-overview-mobile-console] .ik-mobile-supporting-surface {
    padding: 3px 0 0 !important;
    border-radius: 13px !important;
  }

  #overview.router-overview-framework .ik-mobile-public-home[data-overview-mobile-console] .ik-mobile-supporting-list header,
  #overview.router-overview-framework .ik-mobile-public-home[data-overview-mobile-console] .ik-mobile-deferred-row {
    border: 0 !important;
    background: transparent !important;
    box-shadow: inset 0 -1px 0 rgba(126, 151, 178, .105) !important;
  }

  #overview.router-overview-framework .ik-mobile-public-home[data-overview-mobile-console] .ik-mobile-deferred-row:last-child {
    box-shadow: none !important;
  }

  html body #overview.router-overview-framework .ik-mobile-public-home[data-overview-mobile-console] .ik-v1072-chart-head {
    display: flex !important;
    align-items: center !important;
    justify-content: space-between !important;
    min-width: 0 !important;
    height: 18px !important;
  }

  html body #overview.router-overview-framework .ik-mobile-public-home[data-overview-mobile-console] .ik-v1065-chart-kicker {
    color: #52657a !important;
    font-size: 10.5px !important;
    font-weight: 720 !important;
    line-height: 18px !important;
    white-space: nowrap !important;
  }

  html body #overview.router-overview-framework .ik-mobile-public-home[data-overview-mobile-console] .ik-v1072-series-legend,
  html body #overview.router-overview-framework .ik-mobile-public-home[data-overview-mobile-console] .ik-v1072-series-legend span {
    display: inline-flex !important;
    align-items: center !important;
  }

  html body #overview.router-overview-framework .ik-mobile-public-home[data-overview-mobile-console] .ik-v1072-series-legend {
    gap: 8px !important;
    color: #66758a !important;
    font-size: 9.5px !important;
    font-weight: 680 !important;
    line-height: 18px !important;
  }

  html body #overview.router-overview-framework .ik-mobile-public-home[data-overview-mobile-console] .ik-v1072-series-legend span {
    gap: 3px !important;
    white-space: nowrap !important;
  }

  html body #overview.router-overview-framework .ik-mobile-public-home[data-overview-mobile-console] .ik-v1072-series-legend i {
    width: 9px !important;
    height: 2px !important;
    border-radius: 2px !important;
    background: #397ca7 !important;
  }

  html body #overview.router-overview-framework .ik-mobile-public-home[data-overview-mobile-console] .ik-v1072-series-legend .is-upload i {
    background: #91a9bb !important;
  }

  html body #overview.router-overview-framework .ik-mobile-public-home[data-overview-mobile-console] .ik-v420-tabs button,
  html body #overview.router-overview-framework .ik-mobile-public-home[data-overview-mobile-console] .ik-v240-tabs button {
    border: 0 !important;
    border-radius: 0 !important;
    outline: 0 !important;
  }

  html body #overview.router-overview-framework .ik-mobile-public-home[data-overview-mobile-console] .ik-v420-tabs button:focus-visible,
  html body #overview.router-overview-framework .ik-mobile-public-home[data-overview-mobile-console] .ik-v240-tabs button:focus-visible {
    outline: 2px solid #1f6fd1 !important;
    outline-offset: -3px !important;
  }
}
`;

export const MOBILE_OVERVIEW_PRODUCT_SHELL_STYLES = MOBILE_OVERVIEW_CURRENT_SHELL_STYLES;
