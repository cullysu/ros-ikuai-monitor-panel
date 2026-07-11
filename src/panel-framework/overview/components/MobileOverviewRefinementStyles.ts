/* v960-v990 mobile product refinement layers separated from the baseline style stack. */

export const V960_PRODUCT_REFINEMENTS = `
@media (max-width: 760px) {
  #overview.router-overview-framework .ik-v420-screen,
  .router-overview-framework .ik-v420-screen,
  .ik-v420-screen {
    padding-top: max(3px, env(safe-area-inset-top, 0px)) !important;
  }

  #overview.router-overview-framework .ik-v420-screen > * + *,
  .router-overview-framework .ik-v420-screen > * + *,
  .ik-v420-screen > * + * {
    margin-top: 4px !important;
  }

  #overview.router-overview-framework .ik-v960-judgement-strip,
  .router-overview-framework .ik-v960-judgement-strip,
  .ik-v960-judgement-strip {
    display: grid !important;
    grid-template-rows: 23px 31px !important;
    gap: 0 !important;
    min-height: 54px !important;
    padding: 0 9px !important;
    border: 0 !important;
    border-radius: 9px !important;
    background: rgba(255, 255, 255, .76) !important;
    box-shadow: inset 0 0 0 .5px rgba(151, 174, 198, .16) !important;
    overflow: hidden !important;
  }

  #overview.router-overview-framework .ik-v960-judgement-strip > strong,
  .router-overview-framework .ik-v960-judgement-strip > strong,
  .ik-v960-judgement-strip > strong {
    display: grid !important;
    grid-template-columns: 10px minmax(0, max-content) minmax(0, 1fr) !important;
    align-items: center !important;
    gap: 5px !important;
    min-width: 0 !important;
    border-bottom: .5px solid rgba(151, 174, 198, .16) !important;
  }

  #overview.router-overview-framework .ik-v960-judgement-strip > strong b,
  .router-overview-framework .ik-v960-judgement-strip > strong b,
  .ik-v960-judgement-strip > strong b {
    color: #132236 !important;
    font-size: 13px !important;
    font-weight: 830 !important;
    letter-spacing: -.12px !important;
    line-height: 16px !important;
    white-space: nowrap !important;
    text-overflow: clip !important;
  max-width: none !important;
}

  #overview.router-overview-framework .ik-v960-judgement-strip > strong em,
  .router-overview-framework .ik-v960-judgement-strip > strong em,
  .ik-v960-judgement-strip > strong em {
    min-width: 0 !important;
    color: #6b7d90 !important;
    font-size: 9px !important;
    font-style: normal !important;
    font-weight: 610 !important;
    line-height: 11px !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
    white-space: nowrap !important;
  }

  #overview.router-overview-framework .ik-v960-judgement-strip > div,
  .router-overview-framework .ik-v960-judgement-strip > div,
  .ik-v960-judgement-strip > div,
  #overview.router-overview-framework .ik-v910-trust-strip,
  .router-overview-framework .ik-v910-trust-strip,
  .ik-v910-trust-strip {
    display: grid !important;
    grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
    min-width: 0 !important;
  }

  #overview.router-overview-framework .ik-v960-judgement-strip span,
  .router-overview-framework .ik-v960-judgement-strip span,
  .ik-v960-judgement-strip span,
  #overview.router-overview-framework .ik-v910-trust-strip span,
  .router-overview-framework .ik-v910-trust-strip span,
  .ik-v910-trust-strip span {
    display: grid !important;
    align-content: center !important;
    gap: 1px !important;
    min-width: 0 !important;
    padding: 0 5px !important;
    border-right: .5px solid rgba(151, 174, 198, .14) !important;
    background: transparent !important;
  }

  #overview.router-overview-framework .ik-v960-judgement-strip span:last-child,
  .router-overview-framework .ik-v960-judgement-strip span:last-child,
  .ik-v960-judgement-strip span:last-child,
  #overview.router-overview-framework .ik-v910-trust-strip span:last-child,
  .router-overview-framework .ik-v910-trust-strip span:last-child,
  .ik-v910-trust-strip span:last-child {
    border-right: 0 !important;
  }

  #overview.router-overview-framework .ik-v960-judgement-strip span em,
  .router-overview-framework .ik-v960-judgement-strip span em,
  .ik-v960-judgement-strip span em,
  #overview.router-overview-framework .ik-v910-trust-strip span b,
  .router-overview-framework .ik-v910-trust-strip span b,
  .ik-v910-trust-strip span b {
    color: #77879a !important;
    font-size: 7.6px !important;
    font-style: normal !important;
    font-weight: 650 !important;
    line-height: 9px !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
    white-space: nowrap !important;
  }

  #overview.router-overview-framework .ik-v960-judgement-strip span b,
  .router-overview-framework .ik-v960-judgement-strip span b,
  .ik-v960-judgement-strip span b,
  #overview.router-overview-framework .ik-v910-trust-strip span strong,
  .router-overview-framework .ik-v910-trust-strip span strong,
  .ik-v910-trust-strip span strong {
    color: #1b3048 !important;
    font-size: 10px !important;
    font-weight: 790 !important;
    line-height: 11px !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
    white-space: nowrap !important;
  }

  #overview.router-overview-framework .ik-v910-trust-strip,
  .router-overview-framework .ik-v910-trust-strip,
  .ik-v910-trust-strip {
    min-height: 32px !important;
    padding: 0 8px !important;
    border: 0 !important;
    border-radius: 8px !important;
    background: rgba(242, 247, 252, .72) !important;
    box-shadow: inset 0 0 0 .5px rgba(151, 174, 198, .12) !important;
    overflow: hidden !important;
  }

  #overview.router-overview-framework .ik-v420-hero,
  .router-overview-framework .ik-v420-hero,
  .ik-v420-hero {
    grid-template-rows: 24px 72px 18px !important;
    gap: 4px !important;
    min-height: 128px !important;
    max-height: 142px !important;
    padding: 7px 9px 6px !important;
    border-radius: 9px !important;
  }

  #overview.router-overview-framework .ik-v620-hero-head h1,
  .router-overview-framework .ik-v620-hero-head h1,
  .ik-v620-hero-head h1 {
    font-size: 12.5px !important;
    line-height: 14px !important;
    font-weight: 780 !important;
    letter-spacing: -.08px !important;
  }

  #overview.router-overview-framework .ik-v620-hero-head p,
  .router-overview-framework .ik-v620-hero-head p,
  .ik-v620-hero-head p {
    font-size: 8.4px !important;
    line-height: 10px !important;
  }

  #overview.router-overview-framework .ik-v420-visual,
  #overview.router-overview-framework .ik-v812-trend-visual,
  #overview.router-overview-framework .ik-v420-line-chart,
  #overview.router-overview-framework .ik-v420-channel-rail,
  #overview.router-overview-framework .ik-v420-port-matrix,
  #overview.router-overview-framework .ik-density-resource-ledger,
  #overview.router-overview-framework .ik-v420-interface-list,
  .router-overview-framework .ik-v420-visual,
  .router-overview-framework .ik-v812-trend-visual,
  .router-overview-framework .ik-v420-line-chart,
  .router-overview-framework .ik-v420-channel-rail,
  .router-overview-framework .ik-v420-port-matrix,
  .router-overview-framework .ik-density-resource-ledger,
  .router-overview-framework .ik-v420-interface-list,
  .ik-v420-visual,
  .ik-v812-trend-visual,
  .ik-v420-line-chart,
  .ik-v420-channel-rail,
  .ik-v420-port-matrix,
  .ik-density-resource-ledger,
  .ik-v420-interface-list {
    min-height: 72px !important;
    height: 72px !important;
    max-height: 72px !important;
  }

  #overview.router-overview-framework .ik-v420-port-matrix span,
  .router-overview-framework .ik-v420-port-matrix span,
  .ik-v420-port-matrix span {
    grid-template-columns: 2px minmax(0, 1fr) 24px !important;
  }

  #overview.router-overview-framework .ik-v420-port-matrix b,
  .router-overview-framework .ik-v420-port-matrix b,
  .ik-v420-port-matrix b {
    font-size: 8.8px !important;
    letter-spacing: -.05px !important;
  }

  #overview.router-overview-framework .ik-v420-port-matrix small,
  .router-overview-framework .ik-v420-port-matrix small,
  .ik-v420-port-matrix small {
    color: #7b8b9d !important;
  }

  #overview.router-overview-framework .ik-v420-list-row.is-danger strong b,
  #overview.router-overview-framework .ik-v420-timeline-row.is-danger strong,
  #overview.router-overview-framework .ik-v960-judgement-strip .is-danger b,
  #overview.router-overview-framework .ik-v910-trust-strip .is-danger strong,
  .router-overview-framework .ik-v420-list-row.is-danger strong b,
  .router-overview-framework .ik-v420-timeline-row.is-danger strong,
  .router-overview-framework .ik-v960-judgement-strip .is-danger b,
  .router-overview-framework .ik-v910-trust-strip .is-danger strong,
  .ik-v420-list-row.is-danger strong b,
  .ik-v420-timeline-row.is-danger strong,
  .ik-v960-judgement-strip .is-danger b,
  .ik-v910-trust-strip .is-danger strong {
    color: #8f2f2c !important;
  }

  #overview.router-overview-framework .ik-v420-list-row.is-warn strong b,
  #overview.router-overview-framework .ik-v420-timeline-row.is-warn strong,
  #overview.router-overview-framework .ik-v960-judgement-strip .is-warn b,
  #overview.router-overview-framework .ik-v910-trust-strip .is-warn strong,
  .router-overview-framework .ik-v420-list-row.is-warn strong b,
  .router-overview-framework .ik-v420-timeline-row.is-warn strong,
  .router-overview-framework .ik-v960-judgement-strip .is-warn b,
  .router-overview-framework .ik-v910-trust-strip .is-warn strong,
  .ik-v420-list-row.is-warn strong b,
  .ik-v420-timeline-row.is-warn strong,
  .ik-v960-judgement-strip .is-warn b,
  .ik-v910-trust-strip .is-warn strong {
    color: #7b5a28 !important;
  }

  #overview.router-overview-framework .ik-v420-surface.is-ranking-suppressed .ik-v420-list-row:nth-of-type(n+5),
  .router-overview-framework .ik-v420-surface.is-ranking-suppressed .ik-v420-list-row:nth-of-type(n+5),
  .ik-v420-surface.is-ranking-suppressed .ik-v420-list-row:nth-of-type(n+5) {
    display: none !important;
  }

  #overview.router-overview-framework .ik-v420-tabs,
  .router-overview-framework .ik-v420-tabs,
  .ik-v420-tabs {
    box-shadow: none !important;
  }
}
`;

export const V970_TRUST_MODEL_REFINEMENTS = `
@media (max-width: 760px) {
  #overview.router-overview-framework .ik-v970-first-question,
  .router-overview-framework .ik-v970-first-question,
  .ik-v970-first-question {
    display: block !important;
    margin: 0 0 4px !important;
    color: #6b7b8f !important;
    font-size: 10.5px !important;
    font-weight: 760 !important;
    letter-spacing: .02em !important;
  }

  #overview.router-overview-framework .ik-v970-trust-boundary,
  .router-overview-framework .ik-v970-trust-boundary,
  .ik-v970-trust-boundary {
    margin: 6px 0 0 !important;
    padding: 6px 0 0 !important;
    border-top: .5px solid rgba(214, 226, 238, .82) !important;
    color: #6b7b8f !important;
    font-size: 10.5px !important;
    line-height: 1.25 !important;
  }

  #overview.router-overview-framework [data-overview-mobile-ranking-policy="hidden"] [data-overview-mobile-rank-list],
  .router-overview-framework [data-overview-mobile-ranking-policy="hidden"] [data-overview-mobile-rank-list],
  [data-overview-mobile-ranking-policy="hidden"] [data-overview-mobile-rank-list] {
    display: none !important;
  }

  #overview.router-overview-framework [data-overview-mobile-ranking-policy="collapsed"] [data-overview-mobile-rank-list],
  .router-overview-framework [data-overview-mobile-ranking-policy="collapsed"] [data-overview-mobile-rank-list],
  [data-overview-mobile-ranking-policy="collapsed"] [data-overview-mobile-rank-list] {
    max-height: 96px !important;
    overflow: hidden !important;
    opacity: .72 !important;
  }

  #overview.router-overview-framework [data-overview-mobile-severity="p0"] .ik-v420-hero,
  .router-overview-framework [data-overview-mobile-severity="p0"] .ik-v420-hero,
  [data-overview-mobile-severity="p0"] .ik-v420-hero {
    border-color: rgba(189, 73, 67, .16) !important;
  }

  #overview.router-overview-framework [data-overview-mobile-severity="p0"] .ik-v420-hero h1,
  .router-overview-framework [data-overview-mobile-severity="p0"] .ik-v420-hero h1,
  [data-overview-mobile-severity="p0"] .ik-v420-hero h1 {
    color: #1d2938 !important;
  }
}
`;

export const V980_APP_IA_REFINEMENTS = `
@media (max-width: 760px) {
  #overview.router-overview-framework [data-overview-mobile-p0-first-screen="trust-wan-route-collection-success-no-terminal-ranking"] .ik-v420-surface,
  .router-overview-framework [data-overview-mobile-p0-first-screen="trust-wan-route-collection-success-no-terminal-ranking"] .ik-v420-surface,
  [data-overview-mobile-p0-first-screen="trust-wan-route-collection-success-no-terminal-ranking"] .ik-v420-surface {
    grid-template-rows: auto auto !important;
    gap: var(--ik-space-2) !important;
  }

  #overview.router-overview-framework [data-overview-mobile-terminal-ranking-state="not-mounted"] [data-overview-mobile-rank-list="terminal-total-traffic-list"],
  .router-overview-framework [data-overview-mobile-terminal-ranking-state="not-mounted"] [data-overview-mobile-rank-list="terminal-total-traffic-list"],
  [data-overview-mobile-terminal-ranking-state="not-mounted"] [data-overview-mobile-rank-list="terminal-total-traffic-list"] {
    display: none !important;
  }

  #overview.router-overview-framework [data-overview-mobile-abnormal-ia="wan-offline-default-route-collection-success-first"] .ik-v420-list,
  .router-overview-framework [data-overview-mobile-abnormal-ia="wan-offline-default-route-collection-success-first"] .ik-v420-list,
  [data-overview-mobile-abnormal-ia="wan-offline-default-route-collection-success-first"] .ik-v420-list {
    order: -1 !important;
  }

  #overview.router-overview-framework [data-overview-mobile-abnormal-ia="wan-offline-default-route-collection-success-first"] .ik-v420-list header span,
  .router-overview-framework [data-overview-mobile-abnormal-ia="wan-offline-default-route-collection-success-first"] .ik-v420-list header span,
  [data-overview-mobile-abnormal-ia="wan-offline-default-route-collection-success-first"] .ik-v420-list header span {
    color: var(--ik-v980-critical-text) !important;
  }

  #overview.router-overview-framework [data-overview-mobile-abnormal-ia="resource-pressure-evidence-first"] .ik-v420-list-row > i,
  .router-overview-framework [data-overview-mobile-abnormal-ia="resource-pressure-evidence-first"] .ik-v420-list-row > i,
  [data-overview-mobile-abnormal-ia="resource-pressure-evidence-first"] .ik-v420-list-row > i {
    border-color: transparent !important;
    background: rgba(91, 113, 136, .06) !important;
    color: #5b7188 !important;
  }

  #overview.router-overview-framework [data-overview-mobile-abnormal-ia="trust-boundary-no-business-data"] .ik-v420-list,
  .router-overview-framework [data-overview-mobile-abnormal-ia="trust-boundary-no-business-data"] .ik-v420-list,
  [data-overview-mobile-abnormal-ia="trust-boundary-no-business-data"] .ik-v420-list {
    background: rgba(246, 249, 252, .82) !important;
  }

  #overview.router-overview-framework .ik-v420-list-row.is-danger strong b,
  #overview.router-overview-framework .ik-v420-timeline-row.is-danger strong,
  .router-overview-framework .ik-v420-list-row.is-danger strong b,
  .router-overview-framework .ik-v420-timeline-row.is-danger strong,
  .ik-v420-list-row.is-danger strong b,
  .ik-v420-timeline-row.is-danger strong {
    color: var(--ik-v980-critical-text) !important;
  }

  #overview.router-overview-framework .ik-v420-list-row.is-warn strong b,
  #overview.router-overview-framework .ik-v420-timeline-row.is-warn strong,
  .router-overview-framework .ik-v420-list-row.is-warn strong b,
  .router-overview-framework .ik-v420-timeline-row.is-warn strong,
  .ik-v420-list-row.is-warn strong b,
  .ik-v420-timeline-row.is-warn strong {
    color: var(--ik-v980-warn-text) !important;
  }
}
`;

export const V990_NORMAL_APP_HOME_REFINEMENTS = `
@media (max-width: 760px) {
  #overview.router-overview-framework [data-overview-mobile-normal-app-home="compact-conclusion-chart-ops"] .ik-v960-judgement-strip,
  .router-overview-framework [data-overview-mobile-normal-app-home="compact-conclusion-chart-ops"] .ik-v960-judgement-strip,
  [data-overview-mobile-normal-app-home="compact-conclusion-chart-ops"] .ik-v960-judgement-strip {
    min-height: 50px !important;
    grid-template-rows: 21px 29px !important;
    background: rgba(255, 255, 255, .70) !important;
    box-shadow: inset 0 0 0 .5px rgba(151, 174, 198, .10) !important;
  }

  #overview.router-overview-framework [data-overview-mobile-normal-app-home="compact-conclusion-chart-ops"] .ik-v910-trust-strip,
  .router-overview-framework [data-overview-mobile-normal-app-home="compact-conclusion-chart-ops"] .ik-v910-trust-strip,
  [data-overview-mobile-normal-app-home="compact-conclusion-chart-ops"] .ik-v910-trust-strip {
    min-height: 28px !important;
    background: rgba(242, 247, 252, .58) !important;
    box-shadow: none !important;
  }

  #overview.router-overview-framework [data-overview-mobile-normal-app-home="compact-conclusion-chart-ops"] .ik-v420-hero,
  .router-overview-framework [data-overview-mobile-normal-app-home="compact-conclusion-chart-ops"] .ik-v420-hero,
  [data-overview-mobile-normal-app-home="compact-conclusion-chart-ops"] .ik-v420-hero {
    grid-template-rows: 15px 68px 15px !important;
    gap: 3px !important;
    min-height: 110px !important;
    max-height: 118px !important;
    padding: 6px 9px 5px !important;
    border: 0 !important;
    border-radius: 9px !important;
    background: rgba(248, 251, 254, .72) !important;
    box-shadow: inset 0 0 0 .5px rgba(151, 174, 198, .12) !important;
  }

  #overview.router-overview-framework [data-overview-mobile-normal-app-home="compact-conclusion-chart-ops"] .ik-v420-hero::before,
  .router-overview-framework [data-overview-mobile-normal-app-home="compact-conclusion-chart-ops"] .ik-v420-hero::before,
  [data-overview-mobile-normal-app-home="compact-conclusion-chart-ops"] .ik-v420-hero::before,
  #overview.router-overview-framework [data-overview-mobile-normal-app-home="compact-conclusion-chart-ops"] .ik-v970-first-question,
  .router-overview-framework [data-overview-mobile-normal-app-home="compact-conclusion-chart-ops"] .ik-v970-first-question,
  [data-overview-mobile-normal-app-home="compact-conclusion-chart-ops"] .ik-v970-first-question,
  #overview.router-overview-framework [data-overview-mobile-normal-app-home="compact-conclusion-chart-ops"] .ik-v830-trust-rail,
  .router-overview-framework [data-overview-mobile-normal-app-home="compact-conclusion-chart-ops"] .ik-v830-trust-rail,
  [data-overview-mobile-normal-app-home="compact-conclusion-chart-ops"] .ik-v830-trust-rail {
    display: none !important;
  }

  #overview.router-overview-framework [data-overview-mobile-normal-app-home="compact-conclusion-chart-ops"] .ik-v620-hero-head h1,
  .router-overview-framework [data-overview-mobile-normal-app-home="compact-conclusion-chart-ops"] .ik-v620-hero-head h1,
  [data-overview-mobile-normal-app-home="compact-conclusion-chart-ops"] .ik-v620-hero-head h1 {
    color: #52657a !important;
    font-size: 10px !important;
    font-weight: 720 !important;
    letter-spacing: .01em !important;
    line-height: 13px !important;
  }

  #overview.router-overview-framework [data-overview-mobile-normal-app-home="compact-conclusion-chart-ops"] .ik-v620-hero-head p,
  .router-overview-framework [data-overview-mobile-normal-app-home="compact-conclusion-chart-ops"] .ik-v620-hero-head p,
  [data-overview-mobile-normal-app-home="compact-conclusion-chart-ops"] .ik-v620-hero-head p {
    display: none !important;
  }

  #overview.router-overview-framework [data-overview-mobile-normal-app-home="compact-conclusion-chart-ops"] .ik-v420-visual,
  #overview.router-overview-framework [data-overview-mobile-normal-app-home="compact-conclusion-chart-ops"] .ik-v812-trend-visual,
  #overview.router-overview-framework [data-overview-mobile-normal-app-home="compact-conclusion-chart-ops"] .ik-v420-line-chart,
  .router-overview-framework [data-overview-mobile-normal-app-home="compact-conclusion-chart-ops"] .ik-v420-visual,
  .router-overview-framework [data-overview-mobile-normal-app-home="compact-conclusion-chart-ops"] .ik-v812-trend-visual,
  .router-overview-framework [data-overview-mobile-normal-app-home="compact-conclusion-chart-ops"] .ik-v420-line-chart,
  [data-overview-mobile-normal-app-home="compact-conclusion-chart-ops"] .ik-v420-visual,
  [data-overview-mobile-normal-app-home="compact-conclusion-chart-ops"] .ik-v812-trend-visual,
  [data-overview-mobile-normal-app-home="compact-conclusion-chart-ops"] .ik-v420-line-chart {
    min-height: 68px !important;
    height: 68px !important;
    max-height: 68px !important;
  }

  #overview.router-overview-framework [data-overview-mobile-normal-app-home="compact-conclusion-chart-ops"] .ik-v970-trust-boundary,
  .router-overview-framework [data-overview-mobile-normal-app-home="compact-conclusion-chart-ops"] .ik-v970-trust-boundary,
  [data-overview-mobile-normal-app-home="compact-conclusion-chart-ops"] .ik-v970-trust-boundary {
    margin: 0 !important;
    padding: 0 !important;
    border-top: 0 !important;
    color: #6f8092 !important;
    font-size: 8.8px !important;
    line-height: 12px !important;
  }

  #overview.router-overview-framework [data-overview-mobile-normal-ranking="operations-five-rows"] .ik-v420-list,
  .router-overview-framework [data-overview-mobile-normal-ranking="operations-five-rows"] .ik-v420-list,
  [data-overview-mobile-normal-ranking="operations-five-rows"] .ik-v420-list {
    max-height: 216px !important;
    min-height: 204px !important;
    border: 0 !important;
    border-radius: 9px !important;
    background: rgba(247, 250, 253, .62) !important;
    box-shadow: inset 0 0 0 .5px rgba(151, 174, 198, .10) !important;
    overflow: hidden !important;
  }

  #overview.router-overview-framework [data-overview-mobile-normal-ranking="operations-five-rows"] .ik-v420-list header,
  .router-overview-framework [data-overview-mobile-normal-ranking="operations-five-rows"] .ik-v420-list header,
  [data-overview-mobile-normal-ranking="operations-five-rows"] .ik-v420-list header {
    min-height: 26px !important;
    padding: 0 8px !important;
    border-bottom-color: rgba(151, 174, 198, .10) !important;
  }

  #overview.router-overview-framework [data-overview-mobile-normal-ranking="operations-five-rows"] .ik-v420-list-row,
  .router-overview-framework [data-overview-mobile-normal-ranking="operations-five-rows"] .ik-v420-list-row,
  [data-overview-mobile-normal-ranking="operations-five-rows"] .ik-v420-list-row {
    min-height: 36px !important;
    padding: 3px 8px !important;
    border-bottom: 0 !important;
  }

  #overview.router-overview-framework [data-overview-mobile-normal-ranking="operations-five-rows"] .ik-v420-list-row:nth-of-type(n+6),
  .router-overview-framework [data-overview-mobile-normal-ranking="operations-five-rows"] .ik-v420-list-row:nth-of-type(n+6),
  [data-overview-mobile-normal-ranking="operations-five-rows"] .ik-v420-list-row:nth-of-type(n+6) {
    display: none !important;
  }
}
`;

export const MOBILE_OVERVIEW_INFORMATION_ARCHITECTURE_STYLES =
  `${V960_PRODUCT_REFINEMENTS}${V970_TRUST_MODEL_REFINEMENTS}${V980_APP_IA_REFINEMENTS}${V990_NORMAL_APP_HOME_REFINEMENTS}`;
