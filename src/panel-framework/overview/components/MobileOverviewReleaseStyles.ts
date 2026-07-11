/* v1000 public-release polish kept separate from the baseline mobile style stack. */
export const V1000_PUBLIC_RELEASE_REFINEMENTS = `
@media (max-width: 760px) {
  #overview.router-overview-framework [data-overview-mobile-v1000-release-polish],
  .router-overview-framework [data-overview-mobile-v1000-release-polish],
  [data-overview-mobile-v1000-release-polish] {
    background: linear-gradient(180deg, #f7fafd 0%, var(--ik-v1000-bg) 100%) !important;
  }

  #overview.router-overview-framework [data-overview-mobile-v1000-release-polish] .ik-v420-screen,
  .router-overview-framework [data-overview-mobile-v1000-release-polish] .ik-v420-screen,
  [data-overview-mobile-v1000-release-polish] .ik-v420-screen {
    padding-left: 12px !important;
    padding-right: 12px !important;
  }

  #overview.router-overview-framework [data-overview-mobile-v1000-release-polish] .ik-v420-nav,
  .router-overview-framework [data-overview-mobile-v1000-release-polish] .ik-v420-nav,
  [data-overview-mobile-v1000-release-polish] .ik-v420-nav {
    height: 44px !important;
    min-height: 44px !important;
    border-bottom: 0 !important;
  }

  #overview.router-overview-framework [data-overview-mobile-v1000-release-polish] .ik-v240-status,
  .router-overview-framework [data-overview-mobile-v1000-release-polish] .ik-v240-status,
  [data-overview-mobile-v1000-release-polish] .ik-v240-status {
    border: 0 !important;
    border-radius: 999px !important;
    background: rgba(255, 255, 255, .68) !important;
    box-shadow: inset 0 0 0 .5px var(--ik-v1000-line-strong) !important;
    color: #2d4c68 !important;
  }

  #overview.router-overview-framework [data-overview-mobile-v1000-release-polish] .ik-v960-judgement-strip,
  .router-overview-framework [data-overview-mobile-v1000-release-polish] .ik-v960-judgement-strip,
  [data-overview-mobile-v1000-release-polish] .ik-v960-judgement-strip {
    display: grid !important;
    grid-template-columns: 92px minmax(0, 1fr) !important;
    grid-template-rows: 1fr !important;
    min-height: 42px !important;
    border: 0 !important;
    border-radius: 12px !important;
    background: var(--ik-v1000-group) !important;
    box-shadow: inset 0 0 0 .5px var(--ik-v1000-line) !important;
    overflow: hidden !important;
  }

  #overview.router-overview-framework [data-overview-mobile-v1000-release-polish] .ik-v960-judgement-strip > strong,
  .router-overview-framework [data-overview-mobile-v1000-release-polish] .ik-v960-judgement-strip > strong,
  [data-overview-mobile-v1000-release-polish] .ik-v960-judgement-strip > strong {
    align-content: center !important;
    min-width: 0 !important;
    padding: 0 8px !important;
    border-right: 1px solid var(--ik-v1000-line) !important;
  }

  #overview.router-overview-framework [data-overview-mobile-v1000-release-polish] .ik-v960-judgement-strip > div,
  .router-overview-framework [data-overview-mobile-v1000-release-polish] .ik-v960-judgement-strip > div,
  [data-overview-mobile-v1000-release-polish] .ik-v960-judgement-strip > div {
    display: grid !important;
    grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
    align-items: stretch !important;
  }

  #overview.router-overview-framework [data-overview-mobile-v1000-release-polish] .ik-v960-judgement-strip span,
  .router-overview-framework [data-overview-mobile-v1000-release-polish] .ik-v960-judgement-strip span,
  [data-overview-mobile-v1000-release-polish] .ik-v960-judgement-strip span {
    display: grid !important;
    align-content: center !important;
    min-width: 0 !important;
    padding: 0 5px !important;
    border-left: 1px solid var(--ik-v1000-line) !important;
  }

  #overview.router-overview-framework [data-overview-mobile-v1000-release-polish] .ik-v910-trust-strip,
  .router-overview-framework [data-overview-mobile-v1000-release-polish] .ik-v910-trust-strip,
  [data-overview-mobile-v1000-release-polish] .ik-v910-trust-strip {
    min-height: 28px !important;
    border: 0 !important;
    background: transparent !important;
    box-shadow: none !important;
    gap: 4px !important;
  }

  #overview.router-overview-framework [data-overview-mobile-v1000-release-polish] .ik-v910-trust-strip span,
  .router-overview-framework [data-overview-mobile-v1000-release-polish] .ik-v910-trust-strip span,
  [data-overview-mobile-v1000-release-polish] .ik-v910-trust-strip span {
    border: 0 !important;
    border-radius: 8px !important;
    background: rgba(255, 255, 255, .52) !important;
    box-shadow: inset 0 0 0 .5px rgba(154, 176, 198, .13) !important;
  }

  #overview.router-overview-framework [data-overview-mobile-v1000-release-polish] .ik-v420-hero,
  .router-overview-framework [data-overview-mobile-v1000-release-polish] .ik-v420-hero,
  [data-overview-mobile-v1000-release-polish] .ik-v420-hero {
    border: 0 !important;
    border-radius: 12px !important;
    background: linear-gradient(180deg, rgba(255, 255, 255, .76), rgba(246, 250, 253, .68)) !important;
    box-shadow: inset 0 0 0 .5px var(--ik-v1000-line) !important;
  }

  #overview.router-overview-framework [data-overview-mobile-v1000-release-polish] .ik-v620-hero-head h1,
  .router-overview-framework [data-overview-mobile-v1000-release-polish] .ik-v620-hero-head h1,
  [data-overview-mobile-v1000-release-polish] .ik-v620-hero-head h1 {
    font-size: 15px !important;
    line-height: 18px !important;
    letter-spacing: -.18px !important;
  }

  #overview.router-overview-framework [data-overview-mobile-v1000-release-polish] .ik-v420-port-matrix,
  .router-overview-framework [data-overview-mobile-v1000-release-polish] .ik-v420-port-matrix,
  [data-overview-mobile-v1000-release-polish] .ik-v420-port-matrix {
    grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
    gap: 4px !important;
  }

  #overview.router-overview-framework [data-overview-mobile-v1000-release-polish] .ik-v420-port-matrix span,
  .router-overview-framework [data-overview-mobile-v1000-release-polish] .ik-v420-port-matrix span,
  [data-overview-mobile-v1000-release-polish] .ik-v420-port-matrix span {
    min-height: 38px !important;
    padding: 4px 5px !important;
    border: 0 !important;
    border-radius: 6px !important;
    background: rgba(255, 255, 255, .58) !important;
    box-shadow: inset 0 0 0 .5px var(--ik-v1000-line) !important;
  }

  #overview.router-overview-framework [data-overview-mobile-v1000-release-polish] .ik-v420-port-matrix span.is-danger,
  .router-overview-framework [data-overview-mobile-v1000-release-polish] .ik-v420-port-matrix span.is-danger,
  [data-overview-mobile-v1000-release-polish] .ik-v420-port-matrix span.is-danger {
    background: rgba(143, 61, 56, .055) !important;
    color: var(--ik-v1000-danger) !important;
  }

  /* v1042 mobile WAN port matrix: compact router interface/status grid, not toy capsules. */
  #overview.router-overview-framework [data-overview-mobile-v1000-release-polish] .ik-v420-port-matrix[data-overview-mobile-v1042-wan-port-matrix],
  .router-overview-framework [data-overview-mobile-v1000-release-polish] .ik-v420-port-matrix[data-overview-mobile-v1042-wan-port-matrix],
  [data-overview-mobile-v1000-release-polish] .ik-v420-port-matrix[data-overview-mobile-v1042-wan-port-matrix] {
    grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
    gap: 0 !important;
    overflow: hidden !important;
    border-radius: 5px !important;
    background: rgba(246, 249, 252, .74) !important;
    box-shadow: inset 0 0 0 .5px rgba(104, 127, 151, .2) !important;
  }

  #overview.router-overview-framework [data-overview-mobile-v1000-release-polish] .ik-v420-port-matrix[data-overview-mobile-v1042-wan-port-matrix] span[data-overview-mobile-wan-port-cell],
  .router-overview-framework [data-overview-mobile-v1000-release-polish] .ik-v420-port-matrix[data-overview-mobile-v1042-wan-port-matrix] span[data-overview-mobile-wan-port-cell],
  [data-overview-mobile-v1000-release-polish] .ik-v420-port-matrix[data-overview-mobile-v1042-wan-port-matrix] span[data-overview-mobile-wan-port-cell] {
    position: relative !important;
    display: grid !important;
    grid-template-columns: auto minmax(0, 1fr) !important;
    grid-template-rows: 12px 14px 12px !important;
    column-gap: 3px !important;
    min-height: 42px !important;
    padding: 4px 5px !important;
    border-radius: 0 !important;
    background: rgba(255, 255, 255, .42) !important;
    color: var(--ik-v1000-text) !important;
    box-shadow: inset -.5px 0 0 rgba(104, 127, 151, .16), inset 0 -.5px 0 rgba(104, 127, 151, .16) !important;
  }

  #overview.router-overview-framework [data-overview-mobile-v1000-release-polish] .ik-v420-port-matrix[data-overview-mobile-v1042-wan-port-matrix] span.is-danger[data-overview-mobile-wan-port-cell],
  .router-overview-framework [data-overview-mobile-v1000-release-polish] .ik-v420-port-matrix[data-overview-mobile-v1042-wan-port-matrix] span.is-danger[data-overview-mobile-wan-port-cell],
  [data-overview-mobile-v1000-release-polish] .ik-v420-port-matrix[data-overview-mobile-v1042-wan-port-matrix] span.is-danger[data-overview-mobile-wan-port-cell] {
    background: rgba(255, 255, 255, .38) !important;
    color: var(--ik-v1000-text) !important;
  }

  #overview.router-overview-framework [data-overview-mobile-v1000-release-polish] .ik-v420-port-matrix[data-overview-mobile-v1042-wan-port-matrix] span.is-danger[data-overview-mobile-wan-port-cell]::before,
  .router-overview-framework [data-overview-mobile-v1000-release-polish] .ik-v420-port-matrix[data-overview-mobile-v1042-wan-port-matrix] span.is-danger[data-overview-mobile-wan-port-cell]::before,
  [data-overview-mobile-v1000-release-polish] .ik-v420-port-matrix[data-overview-mobile-v1042-wan-port-matrix] span.is-danger[data-overview-mobile-wan-port-cell]::before {
    content: "" !important;
    position: absolute !important;
    left: 0 !important;
    top: 5px !important;
    bottom: 5px !important;
    width: 2px !important;
    border-radius: 2px !important;
    background: rgba(147, 58, 52, .68) !important;
  }

  #overview.router-overview-framework [data-overview-mobile-v1000-release-polish] .ik-v420-port-matrix[data-overview-mobile-v1042-wan-port-matrix] i,
  .router-overview-framework [data-overview-mobile-v1000-release-polish] .ik-v420-port-matrix[data-overview-mobile-v1042-wan-port-matrix] i,
  [data-overview-mobile-v1000-release-polish] .ik-v420-port-matrix[data-overview-mobile-v1042-wan-port-matrix] i {
    width: 5px !important;
    height: 5px !important;
    margin-top: 3px !important;
    border-radius: 50% !important;
    background: rgba(42, 111, 83, .72) !important;
    box-shadow: none !important;
  }

  #overview.router-overview-framework [data-overview-mobile-v1000-release-polish] .ik-v420-port-matrix[data-overview-mobile-v1042-wan-port-matrix] span.is-danger i,
  .router-overview-framework [data-overview-mobile-v1000-release-polish] .ik-v420-port-matrix[data-overview-mobile-v1042-wan-port-matrix] span.is-danger i,
  [data-overview-mobile-v1000-release-polish] .ik-v420-port-matrix[data-overview-mobile-v1042-wan-port-matrix] span.is-danger i {
    background: rgba(147, 58, 52, .72) !important;
  }

  #overview.router-overview-framework [data-overview-mobile-v1000-release-polish] .ik-v420-port-matrix[data-overview-mobile-v1042-wan-port-matrix] b,
  .router-overview-framework [data-overview-mobile-v1000-release-polish] .ik-v420-port-matrix[data-overview-mobile-v1042-wan-port-matrix] b,
  [data-overview-mobile-v1000-release-polish] .ik-v420-port-matrix[data-overview-mobile-v1042-wan-port-matrix] b {
    min-width: 0 !important;
    font-size: 9px !important;
    font-weight: 650 !important;
    line-height: 12px !important;
    letter-spacing: .04em !important;
    color: rgba(52, 70, 88, .7) !important;
  }

  #overview.router-overview-framework [data-overview-mobile-v1000-release-polish] .ik-v420-port-matrix[data-overview-mobile-v1042-wan-port-matrix] small,
  .router-overview-framework [data-overview-mobile-v1000-release-polish] .ik-v420-port-matrix[data-overview-mobile-v1042-wan-port-matrix] small,
  [data-overview-mobile-v1000-release-polish] .ik-v420-port-matrix[data-overview-mobile-v1042-wan-port-matrix] small {
    grid-column: 1 / 3 !important;
    min-width: 0 !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
    white-space: nowrap !important;
    font-size: 10.5px !important;
    font-weight: 650 !important;
    line-height: 14px !important;
    color: rgba(24, 36, 50, .9) !important;
  }

  #overview.router-overview-framework [data-overview-mobile-v1000-release-polish] .ik-v420-port-matrix[data-overview-mobile-v1042-wan-port-matrix] em,
  .router-overview-framework [data-overview-mobile-v1000-release-polish] .ik-v420-port-matrix[data-overview-mobile-v1042-wan-port-matrix] em,
  [data-overview-mobile-v1000-release-polish] .ik-v420-port-matrix[data-overview-mobile-v1042-wan-port-matrix] em {
    grid-column: 1 / 3 !important;
    min-width: 0 !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
    white-space: nowrap !important;
    font-size: 9px !important;
    font-style: normal !important;
    line-height: 12px !important;
    color: rgba(72, 91, 110, .68) !important;
  }

  #overview.router-overview-framework [data-overview-mobile-v1000-release-polish] .ik-v420-port-matrix[data-overview-mobile-v1042-wan-port-matrix] strong,
  .router-overview-framework [data-overview-mobile-v1000-release-polish] .ik-v420-port-matrix[data-overview-mobile-v1042-wan-port-matrix] strong,
  [data-overview-mobile-v1000-release-polish] .ik-v420-port-matrix[data-overview-mobile-v1042-wan-port-matrix] strong {
    position: absolute !important;
    right: 5px !important;
    top: 3px !important;
    font-size: 9px !important;
    font-weight: 650 !important;
    line-height: 12px !important;
    color: rgba(42, 111, 83, .78) !important;
  }

  #overview.router-overview-framework [data-overview-mobile-v1000-release-polish] .ik-v420-port-matrix[data-overview-mobile-v1042-wan-port-matrix] span.is-danger strong,
  .router-overview-framework [data-overview-mobile-v1000-release-polish] .ik-v420-port-matrix[data-overview-mobile-v1042-wan-port-matrix] span.is-danger strong,
  [data-overview-mobile-v1000-release-polish] .ik-v420-port-matrix[data-overview-mobile-v1042-wan-port-matrix] span.is-danger strong {
    color: rgba(147, 58, 52, .86) !important;
  }

  #overview.router-overview-framework [data-overview-mobile-v1000-release-polish] .ik-v420-resource-meter,
  .router-overview-framework [data-overview-mobile-v1000-release-polish] .ik-v420-resource-meter,
  [data-overview-mobile-v1000-release-polish] .ik-v420-resource-meter {
    background: transparent !important;
    border: 0 !important;
    box-shadow: inset 0 -1px 0 var(--ik-v1000-line) !important;
  }

  #overview.router-overview-framework [data-overview-mobile-v1000-release-polish] .ik-v1040-resource-ledger,
  .router-overview-framework [data-overview-mobile-v1000-release-polish] .ik-v1040-resource-ledger,
  [data-overview-mobile-v1000-release-polish] .ik-v1040-resource-ledger {
    background: rgba(248, 251, 254, .72) !important;
    border: 0 !important;
    box-shadow: inset 0 0 0 .5px rgba(142, 169, 196, .16) !important;
  }

  #overview.router-overview-framework [data-overview-mobile-v1000-release-polish] .ik-v1040-resource-ledger .ik-v420-resource-meter,
  .router-overview-framework [data-overview-mobile-v1000-release-polish] .ik-v1040-resource-ledger .ik-v420-resource-meter,
  [data-overview-mobile-v1000-release-polish] .ik-v1040-resource-ledger .ik-v420-resource-meter {
    grid-template-columns: minmax(38px, .9fr) minmax(38px, .75fr) minmax(34px, .7fr) minmax(38px, .75fr) minmax(72px, 1.35fr) !important;
    min-height: 21px !important;
    padding: 2px 0 !important;
    box-shadow: inset 0 -1px 0 rgba(220, 232, 242, .72) !important;
  }

  #overview.router-overview-framework [data-overview-mobile-v1000-release-polish] .ik-v1040-resource-ledger .ik-v420-resource-meter b,
  .router-overview-framework [data-overview-mobile-v1000-release-polish] .ik-v1040-resource-ledger .ik-v420-resource-meter b,
  [data-overview-mobile-v1000-release-polish] .ik-v1040-resource-ledger .ik-v420-resource-meter b {
    color: #43576d !important;
    font-weight: 680 !important;
  }

  #overview.router-overview-framework [data-overview-mobile-v1000-release-polish] .ik-v1040-resource-ledger .ik-v420-resource-meter strong,
  .router-overview-framework [data-overview-mobile-v1000-release-polish] .ik-v1040-resource-ledger .ik-v420-resource-meter strong,
  [data-overview-mobile-v1000-release-polish] .ik-v1040-resource-ledger .ik-v420-resource-meter strong {
    color: #1f3348 !important;
    font-weight: 760 !important;
  }

  #overview.router-overview-framework [data-overview-mobile-v1000-release-polish] .ik-v1040-resource-ledger .ik-v420-resource-meter.is-danger strong,
  .router-overview-framework [data-overview-mobile-v1000-release-polish] .ik-v1040-resource-ledger .ik-v420-resource-meter.is-danger strong,
  [data-overview-mobile-v1000-release-polish] .ik-v1040-resource-ledger .ik-v420-resource-meter.is-danger strong {
    color: #6f3f39 !important;
  }

  #overview.router-overview-framework [data-overview-mobile-v1000-release-polish] .ik-v1040-resource-ledger .ik-v420-resource-meter.is-peak strong,
  .router-overview-framework [data-overview-mobile-v1000-release-polish] .ik-v1040-resource-ledger .ik-v420-resource-meter.is-peak strong,
  [data-overview-mobile-v1000-release-polish] .ik-v1040-resource-ledger .ik-v420-resource-meter.is-peak strong {
    color: #8f3a34 !important;
  }

  #overview.router-overview-framework [data-overview-mobile-v1000-release-polish] .ik-v1040-resource-ledger .ik-density-resource-track,
  .router-overview-framework [data-overview-mobile-v1000-release-polish] .ik-v1040-resource-ledger .ik-density-resource-track,
  [data-overview-mobile-v1000-release-polish] .ik-v1040-resource-ledger .ik-density-resource-track {
    height: 3px !important;
    border-radius: 999px !important;
    background: rgba(211, 222, 234, .82) !important;
    overflow: hidden !important;
  }

  #overview.router-overview-framework [data-overview-mobile-v1000-release-polish] .ik-density-resource-track span,
  .router-overview-framework [data-overview-mobile-v1000-release-polish] .ik-density-resource-track span,
  [data-overview-mobile-v1000-release-polish] .ik-density-resource-track span {
    background: var(--ik-v1000-blue) !important;
  }

  #overview.router-overview-framework [data-overview-mobile-v1000-release-polish] .ik-v420-resource-meter.is-danger .ik-density-resource-track span,
  .router-overview-framework [data-overview-mobile-v1000-release-polish] .ik-v420-resource-meter.is-danger .ik-density-resource-track span,
  [data-overview-mobile-v1000-release-polish] .ik-v420-resource-meter.is-danger .ik-density-resource-track span {
    background: var(--ik-v1000-danger) !important;
  }

  #overview.router-overview-framework [data-overview-mobile-v1000-release-polish] .ik-v1040-resource-ledger .ik-density-resource-track span,
  #overview.router-overview-framework [data-overview-mobile-v1000-release-polish] .ik-v1040-resource-ledger .ik-v420-resource-meter.is-danger .ik-density-resource-track span,
  .router-overview-framework [data-overview-mobile-v1000-release-polish] .ik-v1040-resource-ledger .ik-density-resource-track span,
  .router-overview-framework [data-overview-mobile-v1000-release-polish] .ik-v1040-resource-ledger .ik-v420-resource-meter.is-danger .ik-density-resource-track span,
  [data-overview-mobile-v1000-release-polish] .ik-v1040-resource-ledger .ik-density-resource-track span,
  [data-overview-mobile-v1000-release-polish] .ik-v1040-resource-ledger .ik-v420-resource-meter.is-danger .ik-density-resource-track span {
    background: linear-gradient(90deg, rgba(111, 129, 150, .58), rgba(91, 113, 136, .82)) !important;
  }

  #overview.router-overview-framework [data-overview-mobile-v1000-release-polish] .ik-v420-list,
  #overview.router-overview-framework [data-overview-mobile-v1000-release-polish] .ik-v420-timeline,
  .router-overview-framework [data-overview-mobile-v1000-release-polish] .ik-v420-list,
  .router-overview-framework [data-overview-mobile-v1000-release-polish] .ik-v420-timeline,
  [data-overview-mobile-v1000-release-polish] .ik-v420-list,
  [data-overview-mobile-v1000-release-polish] .ik-v420-timeline {
    border: 0 !important;
    border-radius: 12px !important;
    background: rgba(255, 255, 255, .64) !important;
    box-shadow: inset 0 0 0 .5px var(--ik-v1000-line) !important;
  }

  #overview.router-overview-framework [data-overview-mobile-v1000-release-polish] .ik-v420-list-row,
  #overview.router-overview-framework [data-overview-mobile-v1000-release-polish] .ik-v420-timeline-row,
  .router-overview-framework [data-overview-mobile-v1000-release-polish] .ik-v420-list-row,
  .router-overview-framework [data-overview-mobile-v1000-release-polish] .ik-v420-timeline-row,
  [data-overview-mobile-v1000-release-polish] .ik-v420-list-row,
  [data-overview-mobile-v1000-release-polish] .ik-v420-timeline-row {
    border-bottom: 0 !important;
    box-shadow: inset 0 -1px 0 rgba(154, 176, 198, .12) !important;
  }

  #overview.router-overview-framework [data-overview-mobile-p0-first-screen="trust-wan-route-collection-success-no-terminal-ranking"] .ik-v420-hero,
  .router-overview-framework [data-overview-mobile-p0-first-screen="trust-wan-route-collection-success-no-terminal-ranking"] .ik-v420-hero,
  [data-overview-mobile-p0-first-screen="trust-wan-route-collection-success-no-terminal-ranking"] .ik-v420-hero {
    min-height: 144px !important;
    max-height: 164px !important;
  }

  #overview.router-overview-framework [data-overview-mobile-v1000-release-polish] .ik-v420-tabs,
  .router-overview-framework [data-overview-mobile-v1000-release-polish] .ik-v420-tabs,
  [data-overview-mobile-v1000-release-polish] .ik-v420-tabs {
    border: 0 !important;
    background: rgba(247, 250, 253, .88) !important;
    box-shadow: 0 -1px 0 rgba(154, 176, 198, .18) !important;
  }

  #overview.router-overview-framework [data-overview-mobile-v1000-release-polish] .ik-v420-tabs button,
  .router-overview-framework [data-overview-mobile-v1000-release-polish] .ik-v420-tabs button,
  [data-overview-mobile-v1000-release-polish] .ik-v420-tabs button {
    border: 0 !important;
    background: transparent !important;
    box-shadow: none !important;
  }

  #overview.router-overview-framework [data-overview-mobile-v1000-release-polish] .ik-v420-tabs button.is-active,
  .router-overview-framework [data-overview-mobile-v1000-release-polish] .ik-v420-tabs button.is-active,
  [data-overview-mobile-v1000-release-polish] .ik-v420-tabs button.is-active {
    color: var(--ik-v1000-blue) !important;
  }
}
`;

export const MOBILE_OVERVIEW_RELEASE_STYLES =
  V1000_PUBLIC_RELEASE_REFINEMENTS;
