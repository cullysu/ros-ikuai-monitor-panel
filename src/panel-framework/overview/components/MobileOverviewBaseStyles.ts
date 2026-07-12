/* v420 baseline mobile shell styles. Keep release/refinement patches out of this file. */
import { MOBILE_OVERVIEW_TOKEN_CSS } from "../mobileOverviewTokens";

export const V420_MOBILE_STYLES = `
@media (max-width: 760px), (min-width: 761px) and (max-width: 900px) and (max-height: 520px) {
  #overview.router-overview-framework .ik-v420-app,
  .router-overview-framework .ik-v420-app,
  .ik-v420-app {
    ${MOBILE_OVERVIEW_TOKEN_CSS}
    --blue: var(--ik-blue);
    --text: var(--ik-ink);
    --muted: var(--ik-muted);
    --quiet: var(--ik-quiet);
    --line: rgba(142, 169, 196, .34);
    --hairline: rgba(195, 210, 225, .62);
    min-height: 100dvh;
    background: var(--ik-page);
    color: var(--text);
    font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "PingFang SC", "Microsoft YaHei", sans-serif;
    font-variant-numeric: tabular-nums;
    -webkit-font-smoothing: antialiased;
    text-rendering: geometricPrecision;
  }

  #overview.router-overview-framework .ik-v420-app *,
  .router-overview-framework .ik-v420-app *,
  .ik-v420-app * {
    box-sizing: border-box;
  }

  #overview.router-overview-framework .ik-v420-shell,
  .router-overview-framework .ik-v420-shell,
  .ik-v420-shell {
    width: 100%;
    max-width: 430px;
    margin: 0 auto;
  }

  #overview.router-overview-framework .ik-v420-screen,
  .router-overview-framework .ik-v420-screen,
  .ik-v420-screen {
    min-height: 100dvh;
    padding: max(4px, env(safe-area-inset-top, 0px)) 13px calc(68px + env(safe-area-inset-bottom, 0px));
    overflow-x: hidden;
  }

  #overview.router-overview-framework .ik-v420-screen > * + *,
  .router-overview-framework .ik-v420-screen > * + *,
  .ik-v420-screen > * + * {
    margin-top: 6px;
  }

  #overview.router-overview-framework .ik-v420-nav,
  .router-overview-framework .ik-v420-nav,
  .ik-v420-nav {
    display: grid;
    grid-template-columns: 32px minmax(0, 1fr) auto;
    align-items: center;
    gap: 8px;
    height: 50px;
    min-height: 50px;
    border-bottom: .5px solid var(--line);
  }

  #overview.router-overview-framework .ik-v420-nav button,
  .router-overview-framework .ik-v420-nav button,
  .ik-v420-nav button {
    display: grid;
    place-items: center;
    width: 32px;
    height: 32px;
    padding: 0;
    border: 0;
    border-radius: 8px;
    background: transparent;
    color: #42617f;
  }

  #overview.router-overview-framework .ik-v420-nav svg,
  #overview.router-overview-framework .ik-v420-tabs svg,
  #overview.router-overview-framework .ik-v503-device-icon svg,
  .router-overview-framework .ik-v420-nav svg,
  .router-overview-framework .ik-v420-tabs svg,
  .router-overview-framework .ik-v503-device-icon svg,
  .ik-v420-nav svg,
  .ik-v420-tabs svg,
  .ik-v503-device-icon svg {
    width: 18px;
    height: 18px;
    fill: none;
    stroke: currentColor;
    stroke-width: 1.8;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  #overview.router-overview-framework .ik-v420-nav div,
  .router-overview-framework .ik-v420-nav div,
  .ik-v420-nav div {
    display: grid;
    min-width: 0;
    gap: 1px;
  }

  #overview.router-overview-framework .ik-v420-nav div b,
  .router-overview-framework .ik-v420-nav div b,
  .ik-v420-nav div b {
    color: var(--text);
    font-size: 15px;
    font-weight: 790;
    letter-spacing: -.24px;
    line-height: 18px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  #overview.router-overview-framework .ik-v420-nav div span,
  .router-overview-framework .ik-v420-nav div span,
  .ik-v420-nav div span {
    color: #65788d;
    font-size: 10px;
    font-weight: 560;
    line-height: 12px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  #overview.router-overview-framework .ik-v420-nav strong,
  .router-overview-framework .ik-v420-nav strong,
  .ik-v420-nav strong {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    height: 20px;
    min-height: 20px;
    padding: 0 7px;
    border: .5px solid rgba(142, 169, 196, .38);
    border-radius: 999px;
    background: rgba(255, 255, 255, .64);
    color: var(--ik-blue);
    font-size: 9.6px;
    font-weight: 760;
    line-height: 20px;
    white-space: nowrap;
  }

  #overview.router-overview-framework .ik-v420-app i,
  .router-overview-framework .ik-v420-app i,
  .ik-v420-app i {
    width: 5px;
    height: 5px;
    border-radius: 99px;
    background: var(--ik-ok);
  }

  #overview.router-overview-framework .ik-v420-app .is-danger i,
  .router-overview-framework .ik-v420-app .is-danger i,
  .ik-v420-app .is-danger i {
    background: var(--ik-danger);
  }

  #overview.router-overview-framework .ik-v420-app .is-warn i,
  #overview.router-overview-framework .ik-v420-app .is-missing i,
  .router-overview-framework .ik-v420-app .is-warn i,
  .router-overview-framework .ik-v420-app .is-missing i,
  .ik-v420-app .is-warn i,
  .ik-v420-app .is-missing i {
    background: var(--ik-warn);
  }

  #overview.router-overview-framework .ik-v420-hero,
  .router-overview-framework .ik-v420-hero,
  .ik-v420-hero {
    position: relative;
    display: grid;
    grid-template-rows: auto 84px 24px;
    gap: 6px;
    min-height: 158px;
    max-height: 220px;
    padding: 8px 9px 7px;
    border: .5px solid rgba(142, 169, 196, .32);
    border-radius: 8px;
    background: linear-gradient(180deg, rgba(255,255,255,.86), rgba(255,255,255,.70));
    overflow: hidden;
  }

  #overview.router-overview-framework .ik-v420-hero.is-danger,
  .router-overview-framework .ik-v420-hero.is-danger,
  .ik-v420-hero.is-danger {
    background: linear-gradient(180deg, rgba(255,255,255,.88), rgba(184,58,50,.035));
  }

  #overview.router-overview-framework .ik-v420-hero.is-warn,
  #overview.router-overview-framework .ik-v420-hero.is-missing,
  .router-overview-framework .ik-v420-hero.is-warn,
  .router-overview-framework .ik-v420-hero.is-missing,
  .ik-v420-hero.is-warn,
  .ik-v420-hero.is-missing {
    background: linear-gradient(180deg, rgba(255,255,255,.88), rgba(168,111,35,.035));
  }

  #overview.router-overview-framework .ik-v420-hero::before,
  .router-overview-framework .ik-v420-hero::before,
  .ik-v420-hero::before {
    content: "";
    position: absolute;
    inset: 8px auto 8px 0;
    width: 2px;
    border-radius: 0 99px 99px 0;
    background: var(--ik-blue);
  }

  #overview.router-overview-framework .ik-v420-hero.is-danger::before,
  .router-overview-framework .ik-v420-hero.is-danger::before,
  .ik-v420-hero.is-danger::before {
    background: var(--ik-danger);
  }

  #overview.router-overview-framework .ik-v420-hero.is-warn::before,
  #overview.router-overview-framework .ik-v420-hero.is-missing::before,
  .router-overview-framework .ik-v420-hero.is-warn::before,
  .router-overview-framework .ik-v420-hero.is-missing::before,
  .ik-v420-hero.is-warn::before,
  .ik-v420-hero.is-missing::before {
    background: var(--ik-warn);
  }

  #overview.router-overview-framework .ik-v620-hero-head,
  .router-overview-framework .ik-v620-hero-head,
  .ik-v620-hero-head {
    display: grid;
    min-width: 0;
    gap: 1px;
  }

  #overview.router-overview-framework .ik-v620-hero-head h1,
  .router-overview-framework .ik-v620-hero-head h1,
  .ik-v620-hero-head h1 {
    margin: 0;
    color: var(--text);
    font-size: 16px;
    font-weight: 820;
    letter-spacing: -.24px;
    line-height: 19px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  #overview.router-overview-framework .ik-v620-hero-head p,
  .router-overview-framework .ik-v620-hero-head p,
  .ik-v620-hero-head p {
    margin: 0;
    color: #5f7188;
    font-size: 10px;
    font-weight: 610;
    line-height: 12px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  #overview.router-overview-framework .ik-v620-hero-stage,
  .router-overview-framework .ik-v620-hero-stage,
  .ik-v620-hero-stage {
    display: grid;
    grid-template-columns: 92px minmax(0, 1fr);
    align-items: stretch;
    gap: 7px;
    min-height: 84px;
    min-width: 0;
  }

  #overview.router-overview-framework .ik-v620-hero-stage.is-metricless,
  .router-overview-framework .ik-v620-hero-stage.is-metricless,
  .ik-v620-hero-stage.is-metricless {
    grid-template-columns: minmax(0, 1fr);
  }

  #overview.router-overview-framework .ik-v420-hero-stats,
  .router-overview-framework .ik-v420-hero-stats,
  .ik-v420-hero-stats {
    display: grid;
    grid-template-rows: repeat(4, 19px);
    align-content: center;
    gap: 1px;
    min-width: 0;
  }

  #overview.router-overview-framework .ik-v420-hero-stats span,
  .router-overview-framework .ik-v420-hero-stats span,
  .ik-v420-hero-stats span {
    display: grid;
    grid-template-columns: 28px minmax(0, 1fr);
    grid-template-areas: "label value" "note note";
    align-items: center;
    min-height: 19px;
    min-width: 0;
  }

  #overview.router-overview-framework .ik-v420-hero-stats em,
  .router-overview-framework .ik-v420-hero-stats em,
  .ik-v420-hero-stats em {
    grid-area: label;
    color: #718397;
    font-size: 8px;
    font-style: normal;
    font-weight: 650;
    line-height: 10px;
    white-space: nowrap;
  }

  #overview.router-overview-framework .ik-v420-hero-stats b,
  .router-overview-framework .ik-v420-hero-stats b,
  .ik-v420-hero-stats b {
    grid-area: value;
    color: var(--text);
    font-size: 10px;
    font-weight: 820;
    letter-spacing: -.08px;
    line-height: 12px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  #overview.router-overview-framework .ik-v420-hero-stats small,
  .router-overview-framework .ik-v420-hero-stats small,
  .ik-v420-hero-stats small {
    display: none;
  }

  #overview.router-overview-framework .ik-v420-hero-stats .is-danger b,
  .router-overview-framework .ik-v420-hero-stats .is-danger b,
  .ik-v420-hero-stats .is-danger b {
    color: var(--ik-danger);
  }

  #overview.router-overview-framework .ik-v420-hero-stats .is-warn b,
  #overview.router-overview-framework .ik-v420-hero-stats .is-missing b,
  .router-overview-framework .ik-v420-hero-stats .is-warn b,
  .router-overview-framework .ik-v420-hero-stats .is-missing b,
  .ik-v420-hero-stats .is-warn b,
  .ik-v420-hero-stats .is-missing b {
    color: var(--ik-warn);
  }

  #overview.router-overview-framework .ik-v420-visual,
  .router-overview-framework .ik-v420-visual,
  .ik-v420-visual {
    min-width: 0;
    height: 84px;
    min-height: 84px;
    overflow: hidden;
  }

  #overview.router-overview-framework .ik-v620-hero-stage.is-metricless .ik-v420-visual,
  .router-overview-framework .ik-v620-hero-stage.is-metricless .ik-v420-visual,
  .ik-v620-hero-stage.is-metricless .ik-v420-visual {
    grid-column: 1;
  }

  #overview.router-overview-framework .ik-v812-trend-visual,
  .router-overview-framework .ik-v812-trend-visual,
  .ik-v812-trend-visual {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 52px;
    gap: 5px;
    min-height: 84px;
  }

  #overview.router-overview-framework .ik-v812-trend-visual aside,
  .router-overview-framework .ik-v812-trend-visual aside,
  .ik-v812-trend-visual aside {
    display: grid;
    grid-template-rows: repeat(4, 18px);
    align-content: center;
    gap: 1px;
    min-width: 0;
  }

  #overview.router-overview-framework .ik-v812-trend-visual aside span,
  .router-overview-framework .ik-v812-trend-visual aside span,
  .ik-v812-trend-visual aside span {
    display: grid;
    min-height: 18px;
    min-width: 0;
  }

  #overview.router-overview-framework .ik-v812-trend-visual aside em,
  .router-overview-framework .ik-v812-trend-visual aside em,
  .ik-v812-trend-visual aside em {
    color: #728196;
    font-size: 7.2px;
    font-style: normal;
    font-weight: 620;
    line-height: 8px;
  }

  #overview.router-overview-framework .ik-v812-trend-visual aside b,
  .router-overview-framework .ik-v812-trend-visual aside b,
  .ik-v812-trend-visual aside b {
    color: var(--text);
    font-size: 8.6px;
    font-weight: 790;
    line-height: 10px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  #overview.router-overview-framework .ik-v420-line-chart,
  .router-overview-framework .ik-v420-line-chart,
  .ik-v420-line-chart {
    display: block;
    width: 100%;
    height: 84px;
  }

  #overview.router-overview-framework .ik-v420-line-chart text,
  .router-overview-framework .ik-v420-line-chart text,
  .ik-v420-line-chart text {
    fill: #8b9caf;
    font-size: 7px;
    font-weight: 650;
  }

  #overview.router-overview-framework .ik-v420-gridline,
  .router-overview-framework .ik-v420-gridline,
  .ik-v420-gridline {
    fill: none;
    stroke: rgba(154, 180, 207, .26);
    stroke-width: .65;
  }

  #overview.router-overview-framework .ik-v945-reference-line,
  .router-overview-framework .ik-v945-reference-line,
  .ik-v945-reference-line {
    fill: none;
    stroke: rgba(120, 143, 166, .34);
    stroke-width: .7;
    stroke-dasharray: 3 4;
  }

  #overview.router-overview-framework .ik-v945-current-line,
  .router-overview-framework .ik-v945-current-line,
  .ik-v945-current-line {
    fill: none;
    stroke: rgba(20, 115, 230, .28);
    stroke-width: .75;
  }

  #overview.router-overview-framework .ik-v420-area,
  .router-overview-framework .ik-v420-area,
  .ik-v420-area {
    fill: rgba(20, 115, 230, .045);
  }

  #overview.router-overview-framework .ik-v420-curve,
  .router-overview-framework .ik-v420-curve,
  .ik-v420-curve {
    fill: none;
    stroke-width: 1.25;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  #overview.router-overview-framework .ik-v420-curve.is-main,
  .router-overview-framework .ik-v420-curve.is-main,
  .ik-v420-curve.is-main {
    stroke: var(--ik-blue);
  }

  #overview.router-overview-framework .ik-v420-curve.is-soft,
  .router-overview-framework .ik-v420-curve.is-soft,
  .ik-v420-curve.is-soft {
    stroke: #78b7f4;
    opacity: .78;
  }

  #overview.router-overview-framework .ik-v420-focus-dot,
  #overview.router-overview-framework .ik-v420-peak-dot,
  #overview.router-overview-framework .ik-v945-start-dot,
  .router-overview-framework .ik-v420-focus-dot,
  .router-overview-framework .ik-v420-peak-dot,
  .router-overview-framework .ik-v945-start-dot,
  .ik-v420-focus-dot,
  .ik-v420-peak-dot,
  .ik-v945-start-dot {
    fill: var(--ik-blue);
    stroke: #fff;
    stroke-width: 1.15;
  }

  #overview.router-overview-framework .ik-v420-port-matrix,
  .router-overview-framework .ik-v420-port-matrix,
  .ik-v420-port-matrix {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    height: 84px;
    border: .5px solid rgba(168, 184, 202, .44);
    border-right: 0;
    border-bottom: 0;
    background: rgba(248, 251, 254, .35);
    overflow: hidden;
  }

  #overview.router-overview-framework .ik-v420-port-matrix span,
  .router-overview-framework .ik-v420-port-matrix span,
  .ik-v420-port-matrix span {
    display: grid;
    grid-template-columns: 3px minmax(0, 1fr) 24px;
    grid-template-areas: "mark port state" "mark carrier carrier";
    align-items: center;
    min-height: 42px;
    padding: 3px 4px 3px 0;
    gap: 0 4px;
    border-right: .5px solid rgba(168, 184, 202, .34);
    border-bottom: .5px solid rgba(168, 184, 202, .34);
  }

  #overview.router-overview-framework .ik-v420-port-matrix i,
  .router-overview-framework .ik-v420-port-matrix i,
  .ik-v420-port-matrix i {
    grid-area: mark;
    align-self: center;
    width: 2px;
    height: 20px;
    border-radius: 0;
  }

  #overview.router-overview-framework .ik-v420-port-matrix b,
  .router-overview-framework .ik-v420-port-matrix b,
  .ik-v420-port-matrix b {
    grid-area: port;
    color: var(--text);
    font-size: 11px;
    font-weight: 790;
    line-height: 13px;
    white-space: nowrap;
  }

  #overview.router-overview-framework .ik-v420-port-matrix small,
  .router-overview-framework .ik-v420-port-matrix small,
  .ik-v420-port-matrix small {
    grid-area: carrier;
    color: #7a8da2;
    font-size: 7.4px;
    font-weight: 560;
    line-height: 9px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  #overview.router-overview-framework .ik-v420-port-matrix em,
  .router-overview-framework .ik-v420-port-matrix em,
  .ik-v420-port-matrix em {
    grid-area: state;
    color: #7a8da2;
    font-size: 7px;
    font-style: normal;
    font-weight: 700;
    line-height: 12px;
    text-align: right;
    white-space: nowrap;
  }

  #overview.router-overview-framework .ik-v420-port-matrix .is-danger em,
  .router-overview-framework .ik-v420-port-matrix .is-danger em,
  .ik-v420-port-matrix .is-danger em {
    color: var(--ik-danger);
  }

  #overview.router-overview-framework .ik-v420-channel-rail,
  .router-overview-framework .ik-v420-channel-rail,
  .ik-v420-channel-rail {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    height: 84px;
    border: .5px solid rgba(168, 184, 202, .38);
    background: rgba(248, 251, 254, .35);
  }

  #overview.router-overview-framework .ik-v420-channel-rail span,
  .router-overview-framework .ik-v420-channel-rail span,
  .ik-v420-channel-rail span {
    display: grid;
    align-content: center;
    min-width: 0;
    padding: 0 5px;
    gap: 5px;
    border-left: .5px solid rgba(168, 184, 202, .30);
  }

  #overview.router-overview-framework .ik-v420-channel-rail span:first-child,
  .router-overview-framework .ik-v420-channel-rail span:first-child,
  .ik-v420-channel-rail span:first-child {
    border-left: 0;
  }

  #overview.router-overview-framework .ik-v420-channel-rail b,
  .router-overview-framework .ik-v420-channel-rail b,
  .ik-v420-channel-rail b {
    color: var(--text);
    font-size: 10px;
    font-weight: 780;
    line-height: 12px;
  }

  #overview.router-overview-framework .ik-v420-channel-rail em,
  .router-overview-framework .ik-v420-channel-rail em,
  .ik-v420-channel-rail em {
    color: #66788c;
    font-size: 8px;
    font-style: normal;
    line-height: 10px;
  }

  #overview.router-overview-framework .ik-v420-interface-list,
  .router-overview-framework .ik-v420-interface-list,
  .ik-v420-interface-list {
    display: grid;
    grid-template-rows: repeat(2, 42px);
    height: 84px;
    overflow: hidden;
  }

  #overview.router-overview-framework .ik-v420-interface-list span,
  .router-overview-framework .ik-v420-interface-list span,
  .ik-v420-interface-list span {
    display: grid;
    grid-template-columns: 11px minmax(0, 1fr);
    grid-template-areas: "mark name" "mark note";
    align-content: center;
    gap: 0 6px;
    border-top: .5px solid var(--hairline);
  }

  #overview.router-overview-framework .ik-v420-interface-list span:first-child,
  .router-overview-framework .ik-v420-interface-list span:first-child,
  .ik-v420-interface-list span:first-child {
    border-top: 0;
  }

  #overview.router-overview-framework .ik-v420-interface-list i,
  .router-overview-framework .ik-v420-interface-list i,
  .ik-v420-interface-list i {
    grid-area: mark;
    align-self: center;
    width: 6px;
    height: 6px;
  }

  #overview.router-overview-framework .ik-v420-interface-list b,
  .router-overview-framework .ik-v420-interface-list b,
  .ik-v420-interface-list b {
    grid-area: name;
    min-width: 0;
    color: var(--text);
    font-size: 12px;
    font-weight: 770;
    line-height: 15px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  #overview.router-overview-framework .ik-v420-interface-list em,
  .router-overview-framework .ik-v420-interface-list em,
  .ik-v420-interface-list em {
    grid-area: note;
    min-width: 0;
    color: #66788c;
    font-size: 9px;
    font-style: normal;
    line-height: 12px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  #overview.router-overview-framework .ik-v420-resource-visual,
  .router-overview-framework .ik-v420-resource-visual,
  .ik-v420-resource-visual {
    display: grid;
  }

  #overview.router-overview-framework .ik-density-resource-ledger,
  .router-overview-framework .ik-density-resource-ledger,
  .ik-density-resource-ledger {
    display: grid;
    grid-template-rows: repeat(3, 24px);
    gap: 3px;
    height: 84px;
    padding: 3px 0;
  }

  #overview.router-overview-framework .ik-density-resource-row,
  .router-overview-framework .ik-density-resource-row,
  .ik-density-resource-row {
    display: grid;
    grid-template-columns: 28px 38px 38px 48px minmax(0, 1fr);
    align-items: center;
    min-height: 24px;
    gap: 4px;
    overflow: hidden;
  }

  #overview.router-overview-framework .ik-density-resource-row b,
  #overview.router-overview-framework .ik-density-resource-row strong,
  #overview.router-overview-framework .ik-density-resource-row small,
  #overview.router-overview-framework .ik-density-resource-row em,
  .router-overview-framework .ik-density-resource-row b,
  .router-overview-framework .ik-density-resource-row strong,
  .router-overview-framework .ik-density-resource-row small,
  .router-overview-framework .ik-density-resource-row em,
  .ik-density-resource-row b,
  .ik-density-resource-row strong,
  .ik-density-resource-row small,
  .ik-density-resource-row em {
    min-width: 0;
    margin: 0;
    color: var(--text);
    font-size: 9px;
    font-style: normal;
    font-weight: 720;
    line-height: 13px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  #overview.router-overview-framework .ik-density-resource-row strong,
  .router-overview-framework .ik-density-resource-row strong,
  .ik-density-resource-row strong,
  #overview.router-overview-framework .ik-density-resource-row.is-danger em,
  .router-overview-framework .ik-density-resource-row.is-danger em,
  .ik-density-resource-row.is-danger em {
    color: var(--ik-danger);
  }

  #overview.router-overview-framework .ik-density-resource-row small,
  #overview.router-overview-framework .ik-density-resource-row em,
  .router-overview-framework .ik-density-resource-row small,
  .router-overview-framework .ik-density-resource-row em,
  .ik-density-resource-row small,
  .ik-density-resource-row em {
    color: #728196;
    font-size: 8px;
  }

  #overview.router-overview-framework .ik-density-resource-row > i,
  .router-overview-framework .ik-density-resource-row > i,
  .ik-density-resource-row > i {
    position: relative;
    display: block;
    width: 100%;
    height: 2px;
    border-radius: 999px;
    background: rgba(139, 164, 190, .28);
    overflow: hidden;
  }

  #overview.router-overview-framework .ik-density-resource-row > i > i,
  .router-overview-framework .ik-density-resource-row > i > i,
  .ik-density-resource-row > i > i {
    position: absolute;
    inset: 0 auto 0 0;
    display: block;
    height: 2px;
    border-radius: 999px;
    background: rgba(91, 113, 136, .46);
  }

  #overview.router-overview-framework .ik-v420-resource-visual.ik-v620-pressure-visual,
  .router-overview-framework .ik-v420-resource-visual.ik-v620-pressure-visual,
  .ik-v420-resource-visual.ik-v620-pressure-visual {
    grid-template-rows: repeat(3, 24px);
    gap: 3px;
    height: 84px;
    padding: 3px 0;
    background: transparent;
  }

  #overview.router-overview-framework .ik-v420-resource-meter,
  .router-overview-framework .ik-v420-resource-meter,
  .ik-v420-resource-meter {
    display: grid;
    grid-template-columns: 28px 38px 36px 42px minmax(0, 1fr);
    align-items: center;
    gap: 4px;
    min-width: 0;
    min-height: 24px;
    overflow: hidden;
  }

  #overview.router-overview-framework .ik-v420-resource-meter b,
  #overview.router-overview-framework .ik-v420-resource-meter strong,
  #overview.router-overview-framework .ik-v420-resource-meter small,
  #overview.router-overview-framework .ik-v420-resource-meter em,
  .router-overview-framework .ik-v420-resource-meter b,
  .router-overview-framework .ik-v420-resource-meter strong,
  .router-overview-framework .ik-v420-resource-meter small,
  .router-overview-framework .ik-v420-resource-meter em,
  .ik-v420-resource-meter b,
  .ik-v420-resource-meter strong,
  .ik-v420-resource-meter small,
  .ik-v420-resource-meter em {
    position: static;
    display: block;
    min-width: 0;
    margin: 0;
    padding: 0;
    color: var(--text);
    font-size: 9px;
    font-style: normal;
    font-weight: 720;
    line-height: 13px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    transform: none;
  }

  #overview.router-overview-framework .ik-v420-resource-meter strong,
  .router-overview-framework .ik-v420-resource-meter strong,
  .ik-v420-resource-meter strong {
    color: var(--ik-danger);
    font-weight: 820;
  }

  #overview.router-overview-framework .ik-v420-resource-meter small,
  #overview.router-overview-framework .ik-v420-resource-meter em,
  .router-overview-framework .ik-v420-resource-meter small,
  .router-overview-framework .ik-v420-resource-meter em,
  .ik-v420-resource-meter small,
  .ik-v420-resource-meter em {
    color: #728196;
    font-size: 8px;
  }

  #overview.router-overview-framework .ik-v420-resource-meter.is-danger em,
  .router-overview-framework .ik-v420-resource-meter.is-danger em,
  .ik-v420-resource-meter.is-danger em {
    color: var(--ik-danger);
  }

  #overview.router-overview-framework .ik-v420-resource-meter > i,
  .router-overview-framework .ik-v420-resource-meter > i,
  .ik-v420-resource-meter > i {
    position: relative;
    display: block;
    width: 100%;
    height: 2px;
    margin: 0;
    border-radius: 999px;
    background: rgba(139, 164, 190, .28);
    overflow: hidden;
    transform: none;
  }

  #overview.router-overview-framework .ik-v420-resource-meter > i > i,
  .router-overview-framework .ik-v420-resource-meter > i > i,
  .ik-v420-resource-meter > i > i {
    position: absolute;
    inset: 0 auto 0 0;
    display: block;
    height: 2px;
    margin: 0;
    border-radius: 999px;
    background: rgba(91, 113, 136, .46);
    transform: none;
  }

  #overview.router-overview-framework .ik-v830-trust-rail,
  .router-overview-framework .ik-v830-trust-rail,
  .ik-v830-trust-rail {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    height: 24px;
    min-height: 24px;
    border-top: .5px solid rgba(164, 184, 205, .34);
    overflow: hidden;
  }

  #overview.router-overview-framework .ik-v830-trust-rail span,
  .router-overview-framework .ik-v830-trust-rail span,
  .ik-v830-trust-rail span {
    display: flex;
    align-items: center;
    min-width: 0;
    gap: 3px;
    padding: 0 5px;
    border-left: .5px solid rgba(164, 184, 205, .26);
  }

  #overview.router-overview-framework .ik-v830-trust-rail span:first-child,
  .router-overview-framework .ik-v830-trust-rail span:first-child,
  .ik-v830-trust-rail span:first-child {
    border-left: 0;
  }

  #overview.router-overview-framework .ik-v830-trust-rail b,
  #overview.router-overview-framework .ik-v830-trust-rail strong,
  .router-overview-framework .ik-v830-trust-rail b,
  .router-overview-framework .ik-v830-trust-rail strong,
  .ik-v830-trust-rail b,
  .ik-v830-trust-rail strong {
    font-size: 8.2px;
    line-height: 12px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  #overview.router-overview-framework .ik-v830-trust-rail b,
  .router-overview-framework .ik-v830-trust-rail b,
  .ik-v830-trust-rail b {
    flex: 0 0 auto;
    color: #718397;
    font-weight: 650;
  }

  #overview.router-overview-framework .ik-v830-trust-rail strong,
  .router-overview-framework .ik-v830-trust-rail strong,
  .ik-v830-trust-rail strong {
    min-width: 0;
    color: var(--text);
    font-weight: 790;
  }

  #overview.router-overview-framework .ik-v420-surface,
  .router-overview-framework .ik-v420-surface,
  .ik-v420-surface {
    display: grid;
    gap: 6px;
  }

  #overview.router-overview-framework .ik-v420-timeline,
  #overview.router-overview-framework .ik-v420-list,
  .router-overview-framework .ik-v420-timeline,
  .router-overview-framework .ik-v420-list,
  .ik-v420-timeline,
  .ik-v420-list {
    border: .5px solid rgba(142, 169, 196, .28);
    border-radius: 8px;
    background: rgba(255, 255, 255, .68);
    overflow: hidden;
  }

  #overview.router-overview-framework .ik-v420-timeline,
  .router-overview-framework .ik-v420-timeline,
  .ik-v420-timeline {
    padding: 0 10px;
  }

  #overview.router-overview-framework .ik-v420-timeline-row,
  .router-overview-framework .ik-v420-timeline-row,
  .ik-v420-timeline-row {
    display: grid;
    grid-template-columns: 10px 58px max-content minmax(0, 1fr);
    align-items: center;
    min-height: 44px;
    gap: 5px;
    border-top: .5px solid var(--hairline);
  }

  #overview.router-overview-framework .ik-v420-timeline-row:first-child,
  .router-overview-framework .ik-v420-timeline-row:first-child,
  .ik-v420-timeline-row:first-child {
    border-top: 0;
  }

  #overview.router-overview-framework .ik-v420-timeline-row i,
  .router-overview-framework .ik-v420-timeline-row i,
  .ik-v420-timeline-row i {
    width: 5px;
    height: 5px;
  }

  #overview.router-overview-framework .ik-v420-timeline-row b,
  #overview.router-overview-framework .ik-v420-timeline-row strong,
  .router-overview-framework .ik-v420-timeline-row b,
  .router-overview-framework .ik-v420-timeline-row strong,
  .ik-v420-timeline-row b,
  .ik-v420-timeline-row strong {
    color: var(--text);
    font-size: 11.2px;
    font-weight: 760;
    line-height: 14px;
    white-space: nowrap;
  }

  #overview.router-overview-framework .ik-v420-timeline-row strong,
  .router-overview-framework .ik-v420-timeline-row strong,
  .ik-v420-timeline-row strong {
    letter-spacing: -.04px;
  }

  #overview.router-overview-framework .ik-v420-timeline-row em,
  .router-overview-framework .ik-v420-timeline-row em,
  .ik-v420-timeline-row em {
    min-width: 0;
    color: #728196;
    font-size: 8.7px;
    font-style: normal;
    font-weight: 560;
    line-height: 12px;
    overflow: hidden;
    text-align: right;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  #overview.router-overview-framework .ik-v420-list,
  .router-overview-framework .ik-v420-list,
  .ik-v420-list {
    padding: 0 10px 2px;
  }

  #overview.router-overview-framework .ik-v420-list header,
  .router-overview-framework .ik-v420-list header,
  .ik-v420-list header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
    min-height: 24px;
    padding: 4px 0 2px;
  }

  #overview.router-overview-framework .ik-v420-list header b,
  .router-overview-framework .ik-v420-list header b,
  .ik-v420-list header b {
    color: var(--text);
    font-size: 12px;
    font-weight: 790;
    line-height: 14px;
    white-space: nowrap;
  }

  #overview.router-overview-framework .ik-v420-list header span,
  .router-overview-framework .ik-v420-list header span,
  .ik-v420-list header span {
    min-width: 0;
    color: #66788c;
    font-size: 8.8px;
    font-weight: 640;
    line-height: 11px;
    overflow: hidden;
    text-align: right;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  #overview.router-overview-framework .ik-v420-list-row,
  .router-overview-framework .ik-v420-list-row,
  .ik-v420-list-row {
    display: grid;
    grid-template-columns: 28px minmax(0, 1fr) 58px;
    align-items: center;
    min-height: 54px;
    gap: 8px;
    border-top: .5px solid var(--hairline);
  }

  #overview.router-overview-framework .ik-v420-list-row:first-of-type,
  .router-overview-framework .ik-v420-list-row:first-of-type,
  .ik-v420-list-row:first-of-type {
    border-top: 0;
  }

  #overview.router-overview-framework .ik-v420-list-row > i,
  .router-overview-framework .ik-v420-list-row > i,
  .ik-v420-list-row > i {
    display: grid;
    place-items: center;
    width: 28px;
    height: 28px;
    border: .5px solid rgba(20, 115, 230, .24);
    border-radius: 6px;
    background: rgba(20, 115, 230, .055);
    color: var(--ik-blue);
  }

  #overview.router-overview-framework .ik-v420-list-row.is-danger > i,
  .router-overview-framework .ik-v420-list-row.is-danger > i,
  .ik-v420-list-row.is-danger > i {
    border-color: rgba(184, 58, 50, .24);
    background: rgba(184, 58, 50, .045);
    color: var(--ik-danger);
  }

  #overview.router-overview-framework .ik-v420-list-row span,
  .router-overview-framework .ik-v420-list-row span,
  .ik-v420-list-row span {
    display: grid;
    min-width: 0;
    gap: 2px;
  }

  #overview.router-overview-framework .ik-v420-list-row b,
  .router-overview-framework .ik-v420-list-row b,
  .ik-v420-list-row b {
    min-width: 0;
    color: var(--text);
    font-size: 12px;
    font-weight: 780;
    line-height: 14px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  #overview.router-overview-framework .ik-v807-kind,
  .router-overview-framework .ik-v807-kind,
  .ik-v807-kind {
    display: inline-block;
    max-width: 32px;
    margin-left: 4px;
    padding: 0 3px;
    border-radius: 3px;
    background: rgba(20, 115, 230, .075);
    color: #6f8196;
    font-size: 8px;
    font-weight: 650;
    line-height: 10px;
    vertical-align: 1px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  #overview.router-overview-framework .ik-v420-list-row em,
  .router-overview-framework .ik-v420-list-row em,
  .ik-v420-list-row em {
    min-width: 0;
    color: #66788c;
    font-size: 9px;
    font-style: normal;
    font-weight: 560;
    line-height: 11px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  #overview.router-overview-framework .ik-v420-list-row strong,
  .router-overview-framework .ik-v420-list-row strong,
  .ik-v420-list-row strong {
    display: grid;
    min-width: 58px;
    max-width: 58px;
    text-align: right;
  }

  #overview.router-overview-framework .ik-v420-list-row strong b,
  .router-overview-framework .ik-v420-list-row strong b,
  .ik-v420-list-row strong b {
    color: var(--text);
    font-size: 11.2px;
    font-weight: 820;
    line-height: 13px;
  }

  #overview.router-overview-framework .ik-v420-list-row strong small,
  .router-overview-framework .ik-v420-list-row strong small,
  .ik-v420-list-row strong small {
    color: #6f8196;
    font-size: 8px;
    font-weight: 650;
    line-height: 9px;
  }

  #overview.router-overview-framework .ik-v420-app-list u,
  .router-overview-framework .ik-v420-app-list u,
  .ik-v420-app-list u {
    display: block;
    height: 2px;
    margin-top: 1px;
    background: rgba(20, 115, 230, .10);
    border-radius: 999px;
    overflow: hidden;
  }

  #overview.router-overview-framework .ik-v420-app-list u i,
  .router-overview-framework .ik-v420-app-list u i,
  .ik-v420-app-list u i {
    display: block;
    height: 2px;
    background: rgba(20, 115, 230, .55);
    border-radius: 999px;
  }

  #overview.router-overview-framework .ik-v420-tabs,
  .router-overview-framework .ik-v420-tabs,
  .ik-v420-tabs {
    position: fixed;
    left: 50%;
    bottom: 0;
    z-index: 20;
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    width: min(430px, 100vw);
    height: calc(64px + env(safe-area-inset-bottom, 0px));
    min-height: calc(64px + env(safe-area-inset-bottom, 0px));
    padding: 3px 7px max(3px, env(safe-area-inset-bottom, 0px));
    transform: translateX(-50%);
    border-top: .5px solid rgba(142, 169, 196, .30);
    background: rgba(250, 252, 255, .96);
  }

  #overview.router-overview-framework .ik-v420-tabs button,
  .router-overview-framework .ik-v420-tabs button,
  .ik-v420-tabs button {
    display: grid;
    place-items: center;
    align-content: center;
    gap: 3px;
    min-width: 0;
    min-height: 42px;
    padding: 0;
    border: 0;
    border-radius: 0;
    background: transparent;
    color: #6f8196;
    font-size: 9.4px;
    font-weight: 680;
  }

  #overview.router-overview-framework .ik-v420-tabs button.is-active,
  .router-overview-framework .ik-v420-tabs button.is-active,
  .ik-v420-tabs button.is-active {
    color: var(--ik-blue);
    font-weight: 760;
  }

  #overview.router-overview-framework .ik-v420-tabs button.is-active svg,
  .router-overview-framework .ik-v420-tabs button.is-active svg,
  .ik-v420-tabs button.is-active svg {
    background: transparent;
    box-shadow: none;
  }
}

@media (max-width: 760px), (min-width: 761px) and (max-width: 900px) and (max-height: 520px) {
  #overview.router-overview-framework .ik-v420-screen,
  .router-overview-framework .ik-v420-screen,
  .ik-v420-screen {
    padding: max(4px, env(safe-area-inset-top, 0px)) 13px calc(68px + env(safe-area-inset-bottom, 0px)) !important;
    overflow-x: hidden !important;
  }

  #overview.router-overview-framework .ik-v420-screen > * + *,
  .router-overview-framework .ik-v420-screen > * + *,
  .ik-v420-screen > * + * {
    margin-top: 6px !important;
  }

  #overview.router-overview-framework .ik-v420-nav,
  .router-overview-framework .ik-v420-nav,
  .ik-v420-nav {
    grid-template-columns: 32px minmax(0, 1fr) auto !important;
    height: 50px !important;
    min-height: 50px !important;
    gap: 8px !important;
  }

  #overview.router-overview-framework .ik-v420-nav button,
  .router-overview-framework .ik-v420-nav button,
  .ik-v420-nav button {
    width: 32px !important;
    height: 32px !important;
    border: 0 !important;
    background: transparent !important;
    box-shadow: none !important;
  }

  #overview.router-overview-framework .ik-v420-nav div b,
  .router-overview-framework .ik-v420-nav div b,
  .ik-v420-nav div b {
    font-size: 15px !important;
    line-height: 18px !important;
  }

  #overview.router-overview-framework .ik-v420-nav div span,
  .router-overview-framework .ik-v420-nav div span,
  .ik-v420-nav div span {
    font-size: 10px !important;
    line-height: 12px !important;
  }

  #overview.router-overview-framework .ik-v420-nav strong,
  .router-overview-framework .ik-v420-nav strong,
  .ik-v420-nav strong {
    height: 20px !important;
    min-height: 20px !important;
    padding: 0 7px !important;
    border-radius: 999px !important;
    background: rgba(255, 255, 255, .64) !important;
    box-shadow: none !important;
    font-size: 9.6px !important;
    line-height: 20px !important;
  }

  #overview.router-overview-framework .ik-v420-hero,
  .router-overview-framework .ik-v420-hero,
  .ik-v420-hero {
    display: grid !important;
    grid-template-rows: auto 84px 24px !important;
    gap: 6px !important;
    min-height: 158px !important;
    max-height: 220px !important;
    padding: 8px 9px 7px !important;
    border-radius: 8px !important;
    box-shadow: none !important;
    overflow: hidden !important;
  }

  #overview.router-overview-framework .ik-v620-hero-head h1,
  .router-overview-framework .ik-v620-hero-head h1,
  .ik-v620-hero-head h1 {
    height: auto !important;
    max-height: none !important;
    margin: 0 !important;
    font-size: 16px !important;
    line-height: 19px !important;
    letter-spacing: -.24px !important;
    white-space: nowrap !important;
  }

  #overview.router-overview-framework .ik-v620-hero-head p,
  .router-overview-framework .ik-v620-hero-head p,
  .ik-v620-hero-head p {
    margin: 0 !important;
    font-size: 10px !important;
    line-height: 12px !important;
    white-space: nowrap !important;
  }

  #overview.router-overview-framework .ik-v620-hero-stage,
  .router-overview-framework .ik-v620-hero-stage,
  .ik-v620-hero-stage {
    display: grid !important;
    grid-template-columns: 92px minmax(0, 1fr) !important;
    min-height: 84px !important;
    height: 84px !important;
    gap: 7px !important;
    align-items: stretch !important;
  }

  #overview.router-overview-framework .ik-v620-hero-stage.is-metricless,
  .router-overview-framework .ik-v620-hero-stage.is-metricless,
  .ik-v620-hero-stage.is-metricless {
    grid-template-columns: minmax(0, 1fr) !important;
  }

  #overview.router-overview-framework .ik-v420-hero-stats,
  .router-overview-framework .ik-v420-hero-stats,
  .ik-v420-hero-stats {
    position: static !important;
    display: grid !important;
    grid-template-rows: repeat(4, 19px) !important;
    gap: 1px !important;
    margin: 0 !important;
    padding: 0 !important;
    transform: none !important;
  }

  #overview.router-overview-framework .ik-v420-hero-stats span,
  .router-overview-framework .ik-v420-hero-stats span,
  .ik-v420-hero-stats span {
    position: static !important;
    display: grid !important;
    grid-template-columns: 28px minmax(0, 1fr) !important;
    min-height: 19px !important;
    padding: 0 !important;
    border: 0 !important;
    background: transparent !important;
    box-shadow: none !important;
    transform: none !important;
  }

  #overview.router-overview-framework .ik-v420-hero-stats em,
  .router-overview-framework .ik-v420-hero-stats em,
  .ik-v420-hero-stats em {
    position: static !important;
    display: block !important;
    margin: 0 !important;
    font-size: 8px !important;
    line-height: 10px !important;
    transform: none !important;
  }

  #overview.router-overview-framework .ik-v420-hero-stats b,
  #overview.router-overview-framework .ik-v420-hero-stats .is-primary b,
  .router-overview-framework .ik-v420-hero-stats b,
  .router-overview-framework .ik-v420-hero-stats .is-primary b,
  .ik-v420-hero-stats b,
  .ik-v420-hero-stats .is-primary b {
    position: static !important;
    display: block !important;
    margin: 0 !important;
    font-size: 10px !important;
    line-height: 12px !important;
    letter-spacing: -.08px !important;
    transform: none !important;
  }

  #overview.router-overview-framework .ik-v420-hero-stats small,
  .router-overview-framework .ik-v420-hero-stats small,
  .ik-v420-hero-stats small {
    display: none !important;
  }

  #overview.router-overview-framework .ik-v420-visual,
  .router-overview-framework .ik-v420-visual,
  .ik-v420-visual {
    width: 100% !important;
    height: 84px !important;
    min-height: 84px !important;
    max-height: 84px !important;
    overflow: hidden !important;
  }

  #overview.router-overview-framework .ik-v620-hero-stage.is-metricless .ik-v420-visual,
  .router-overview-framework .ik-v620-hero-stage.is-metricless .ik-v420-visual,
  .ik-v620-hero-stage.is-metricless .ik-v420-visual {
    grid-column: 1 !important;
  }

  #overview.router-overview-framework .ik-v812-trend-visual,
  .router-overview-framework .ik-v812-trend-visual,
  .ik-v812-trend-visual {
    display: grid !important;
    grid-template-columns: minmax(0, 1fr) 52px !important;
    gap: 5px !important;
    min-height: 84px !important;
  }

  #overview.router-overview-framework .ik-v812-trend-visual aside,
  .router-overview-framework .ik-v812-trend-visual aside,
  .ik-v812-trend-visual aside {
    display: grid !important;
    grid-template-rows: repeat(4, 18px) !important;
    gap: 1px !important;
    align-content: center !important;
  }

  #overview.router-overview-framework .ik-v420-line-chart,
  .router-overview-framework .ik-v420-line-chart,
  .ik-v420-line-chart {
    width: 100% !important;
    height: 84px !important;
  }

  #overview.router-overview-framework .ik-v420-port-matrix,
  .router-overview-framework .ik-v420-port-matrix,
  .ik-v420-port-matrix {
    display: grid !important;
    grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
    height: 84px !important;
    min-height: 84px !important;
    border-radius: 0 !important;
    box-shadow: none !important;
  }

  #overview.router-overview-framework .ik-v420-port-matrix span,
  .router-overview-framework .ik-v420-port-matrix span,
  .ik-v420-port-matrix span {
    display: grid !important;
    grid-template-columns: 3px minmax(0, 1fr) 24px !important;
    grid-template-areas: "mark port state" "mark carrier carrier" !important;
    min-height: 42px !important;
    padding: 3px 4px 3px 0 !important;
    border-radius: 0 !important;
    box-shadow: none !important;
  }

  #overview.router-overview-framework .ik-v420-port-matrix b,
  .router-overview-framework .ik-v420-port-matrix b,
  .ik-v420-port-matrix b {
    font-size: 11px !important;
    line-height: 13px !important;
  }

  #overview.router-overview-framework .ik-v420-port-matrix small,
  .router-overview-framework .ik-v420-port-matrix small,
  .ik-v420-port-matrix small {
    font-size: 7.4px !important;
    line-height: 9px !important;
  }

  #overview.router-overview-framework .ik-v420-port-matrix em,
  .router-overview-framework .ik-v420-port-matrix em,
  .ik-v420-port-matrix em {
    font-size: 7px !important;
    line-height: 12px !important;
  }

  #overview.router-overview-framework .ik-v420-resource-visual.ik-v620-pressure-visual,
  .router-overview-framework .ik-v420-resource-visual.ik-v620-pressure-visual,
  .ik-v420-resource-visual.ik-v620-pressure-visual {
    display: grid !important;
    grid-template-rows: repeat(3, 24px) !important;
    height: 84px !important;
    min-height: 84px !important;
    gap: 3px !important;
    padding: 3px 0 !important;
    background: transparent !important;
  }

  #overview.router-overview-framework .ik-v420-resource-meter,
  .router-overview-framework .ik-v420-resource-meter,
  .ik-v420-resource-meter {
    position: static !important;
    display: grid !important;
    grid-template-columns: 28px 38px 36px 42px minmax(0, 1fr) !important;
    align-items: center !important;
    min-height: 24px !important;
    gap: 4px !important;
    overflow: hidden !important;
    transform: none !important;
    border: 0 !important;
    border-radius: 0 !important;
    background: transparent !important;
    box-shadow: none !important;
  }

  #overview.router-overview-framework .ik-v420-resource-meter > b,
  #overview.router-overview-framework .ik-v420-resource-meter > strong,
  #overview.router-overview-framework .ik-v420-resource-meter > .ik-v802-ring-value,
  #overview.router-overview-framework .ik-v420-resource-meter > small,
  #overview.router-overview-framework .ik-v420-resource-meter > em,
  .router-overview-framework .ik-v420-resource-meter > b,
  .router-overview-framework .ik-v420-resource-meter > strong,
  .router-overview-framework .ik-v420-resource-meter > .ik-v802-ring-value,
  .router-overview-framework .ik-v420-resource-meter > small,
  .router-overview-framework .ik-v420-resource-meter > em,
  .ik-v420-resource-meter > b,
  .ik-v420-resource-meter > strong,
  .ik-v420-resource-meter > .ik-v802-ring-value,
  .ik-v420-resource-meter > small,
  .ik-v420-resource-meter > em {
    position: static !important;
    display: block !important;
    min-width: 0 !important;
    margin: 0 !important;
    padding: 0 !important;
    font-size: 9px !important;
    line-height: 13px !important;
    white-space: nowrap !important;
    transform: none !important;
  }

  #overview.router-overview-framework .ik-v420-resource-meter > i,
  .router-overview-framework .ik-v420-resource-meter > i,
  .ik-v420-resource-meter > i {
    position: relative !important;
    display: block !important;
    width: 100% !important;
    height: 2px !important;
    margin: 0 !important;
    transform: none !important;
    border: 0 !important;
    background: rgba(139, 164, 190, .28) !important;
    overflow: hidden !important;
  }

  #overview.router-overview-framework .ik-v420-resource-meter > i > i,
  .router-overview-framework .ik-v420-resource-meter > i > i,
  .ik-v420-resource-meter > i > i {
    position: absolute !important;
    inset: 0 auto 0 0 !important;
    display: block !important;
    height: 2px !important;
    margin: 0 !important;
    transform: none !important;
    border: 0 !important;
    background: rgba(91, 113, 136, .46) !important;
  }

  #overview.router-overview-framework .ik-v830-trust-rail,
  .router-overview-framework .ik-v830-trust-rail,
  .ik-v830-trust-rail {
    display: grid !important;
    grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
    height: 24px !important;
    min-height: 24px !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row,
  .router-overview-framework .ik-v420-timeline-row,
  .ik-v420-timeline-row {
    display: grid !important;
    grid-template-columns: 10px 58px max-content minmax(0, 1fr) !important;
    min-height: 44px !important;
    gap: 5px !important;
  }

  #overview.router-overview-framework .ik-v420-list-row,
  .router-overview-framework .ik-v420-list-row,
  .ik-v420-list-row {
    display: grid !important;
    grid-template-columns: 28px minmax(0, 1fr) 58px !important;
    min-height: 54px !important;
    gap: 8px !important;
  }

  #overview.router-overview-framework .ik-v420-tabs,
  .router-overview-framework .ik-v420-tabs,
  .ik-v420-tabs {
    position: fixed !important;
    left: 50% !important;
    right: auto !important;
    bottom: 0 !important;
    z-index: 20 !important;
    display: grid !important;
    grid-template-columns: repeat(5, minmax(0, 1fr)) !important;
    width: min(430px, 100vw) !important;
    height: calc(64px + env(safe-area-inset-bottom, 0px)) !important;
    min-height: calc(64px + env(safe-area-inset-bottom, 0px)) !important;
    padding: 3px 7px max(3px, env(safe-area-inset-bottom, 0px)) !important;
    transform: translateX(-50%) !important;
    border-radius: 0 !important;
    border-top: .5px solid rgba(142, 169, 196, .30) !important;
    background: rgba(250, 252, 255, .96) !important;
    box-shadow: none !important;
  }

  #overview.router-overview-framework .ik-v420-tabs button,
  .router-overview-framework .ik-v420-tabs button,
  .ik-v420-tabs button {
    display: grid !important;
    place-items: center !important;
    align-content: center !important;
    gap: 3px !important;
    min-height: 42px !important;
    padding: 0 !important;
    border: 0 !important;
    border-radius: 0 !important;
    background: transparent !important;
    box-shadow: none !important;
  }

  #overview.router-overview-framework .ik-v420-tabs button::before,
  #overview.router-overview-framework .ik-v420-tabs button::after,
  .router-overview-framework .ik-v420-tabs button::before,
  .router-overview-framework .ik-v420-tabs button::after,
  .ik-v420-tabs button::before,
  .ik-v420-tabs button::after {
    content: none !important;
    display: none !important;
  }

  #overview.router-overview-framework .ik-v420-tabs svg,
  .router-overview-framework .ik-v420-tabs svg,
  .ik-v420-tabs svg {
    border: 0 !important;
    border-radius: 0 !important;
    background: transparent !important;
    box-shadow: none !important;
  }

  #overview.router-overview-framework .ik-v420-tabs button.is-active,
  .router-overview-framework .ik-v420-tabs button.is-active,
  .ik-v420-tabs button.is-active {
    border: 0 !important;
    border-radius: 0 !important;
    background: transparent !important;
    box-shadow: none !important;
    color: var(--ik-blue) !important;
  }

  #overview.router-overview-framework .ik-v420-tabs button.is-active svg,
  .router-overview-framework .ik-v420-tabs button.is-active svg,
  .ik-v420-tabs button.is-active svg {
    width: 18px !important;
    height: 18px !important;
    padding: 0 !important;
    border: 0 !important;
    border-radius: 0 !important;
    background: transparent !important;
    box-shadow: none !important;
    color: currentColor !important;
  }
}

@media (max-width: 760px), (min-width: 761px) and (max-width: 900px) and (max-height: 520px) {
  #overview.router-overview-framework .ik-v960-judgement-strip,
  .router-overview-framework .ik-v960-judgement-strip,
  .ik-v960-judgement-strip {
    display: grid !important;
    grid-template-columns: 82px minmax(0, 1fr) !important;
    align-items: stretch !important;
    height: 40px !important;
    min-height: 40px !important;
    margin-top: 5px !important;
    border: 0 !important;
    border-top: .5px solid rgba(151, 172, 195, .30) !important;
    border-bottom: .5px solid rgba(151, 172, 195, .30) !important;
    border-radius: 0 !important;
    background: transparent !important;
    box-shadow: none !important;
    overflow: hidden !important;
  }

  #overview.router-overview-framework .ik-v960-judgement-strip > strong,
  .router-overview-framework .ik-v960-judgement-strip > strong,
  .ik-v960-judgement-strip > strong {
    display: grid !important;
    grid-template-columns: 8px minmax(0, 1fr) !important;
    grid-template-rows: 18px 12px !important;
    grid-template-areas: "dot value" ". note" !important;
    align-content: center !important;
    min-width: 0 !important;
    padding: 0 8px 0 0 !important;
    border-right: .5px solid rgba(151, 172, 195, .28) !important;
  }

  #overview.router-overview-framework .ik-v960-judgement-strip > strong i,
  .router-overview-framework .ik-v960-judgement-strip > strong i,
  .ik-v960-judgement-strip > strong i {
    grid-area: dot !important;
    align-self: center !important;
    width: 5px !important;
    height: 5px !important;
  }

  #overview.router-overview-framework .ik-v960-judgement-strip > strong b,
  .router-overview-framework .ik-v960-judgement-strip > strong b,
  .ik-v960-judgement-strip > strong b {
    grid-area: value !important;
    min-width: 0 !important;
    color: var(--ik-ink) !important;
    font-size: 13px !important;
    font-weight: 820 !important;
    line-height: 18px !important;
    letter-spacing: -.12px !important;
    overflow: visible !important;
    text-overflow: clip !important;
    white-space: nowrap !important;
    max-width: none !important;
}

  #overview.router-overview-framework .ik-v960-judgement-strip > strong em,
  .router-overview-framework .ik-v960-judgement-strip > strong em,
  .ik-v960-judgement-strip > strong em {
    grid-area: note !important;
    min-width: 0 !important;
    color: #718397 !important;
    font-size: 7.7px !important;
    font-style: normal !important;
    font-weight: 620 !important;
    line-height: 10px !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
    white-space: nowrap !important;
  }

  #overview.router-overview-framework .ik-v960-judgement-strip > div,
  .router-overview-framework .ik-v960-judgement-strip > div,
  .ik-v960-judgement-strip > div {
    display: grid !important;
    grid-template-columns: .56fr .66fr 1.06fr 1.22fr !important;
    min-width: 0 !important;
  }

  #overview.router-overview-framework .ik-v960-judgement-strip span,
  .router-overview-framework .ik-v960-judgement-strip span,
  .ik-v960-judgement-strip span {
    display: grid !important;
    align-content: center !important;
    min-width: 0 !important;
    padding: 0 5px !important;
    border-left: .5px solid rgba(151, 172, 195, .20) !important;
  }

  #overview.router-overview-framework .ik-v960-judgement-strip span:first-child,
  .router-overview-framework .ik-v960-judgement-strip span:first-child,
  .ik-v960-judgement-strip span:first-child {
    border-left: 0 !important;
  }

  #overview.router-overview-framework .ik-v960-judgement-strip span em,
  .router-overview-framework .ik-v960-judgement-strip span em,
  .ik-v960-judgement-strip span em {
    color: #718397 !important;
    font-size: 7.2px !important;
    font-style: normal !important;
    font-weight: 650 !important;
    line-height: 10px !important;
    white-space: nowrap !important;
  }

  #overview.router-overview-framework .ik-v960-judgement-strip span b,
  .router-overview-framework .ik-v960-judgement-strip span b,
  .ik-v960-judgement-strip span b {
    min-width: 0 !important;
    color: var(--ik-ink) !important;
    font-size: 9px !important;
    font-weight: 800 !important;
    line-height: 12px !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
    white-space: nowrap !important;
  }

  #overview.router-overview-framework .ik-v420-hero,
  .router-overview-framework .ik-v420-hero,
  .ik-v420-hero {
    grid-template-rows: auto 72px 22px !important;
    min-height: 134px !important;
    max-height: 154px !important;
    margin-top: 5px !important;
    padding: 7px 8px 6px !important;
    border-color: rgba(142, 169, 196, .26) !important;
    background: rgba(255, 255, 255, .62) !important;
  }

  #overview.router-overview-framework .ik-v420-hero.is-danger,
  .router-overview-framework .ik-v420-hero.is-danger,
  .ik-v420-hero.is-danger {
    background: linear-gradient(90deg, rgba(184, 58, 50, .032), rgba(255,255,255,.68) 42%, rgba(255,255,255,.58)) !important;
  }

  #overview.router-overview-framework .ik-v420-hero.is-warn,
  #overview.router-overview-framework .ik-v420-hero.is-missing,
  .router-overview-framework .ik-v420-hero.is-warn,
  .router-overview-framework .ik-v420-hero.is-missing,
  .ik-v420-hero.is-warn,
  .ik-v420-hero.is-missing {
    background: linear-gradient(90deg, rgba(168, 111, 35, .032), rgba(255,255,255,.68) 42%, rgba(255,255,255,.58)) !important;
  }

  #overview.router-overview-framework .ik-v620-hero-head h1,
  .router-overview-framework .ik-v620-hero-head h1,
  .ik-v620-hero-head h1 {
    font-size: 14px !important;
    line-height: 17px !important;
    letter-spacing: -.12px !important;
  }

  #overview.router-overview-framework .ik-v620-hero-head p,
  .router-overview-framework .ik-v620-hero-head p,
  .ik-v620-hero-head p {
    font-size: 9px !important;
    line-height: 11px !important;
  }

  #overview.router-overview-framework .ik-v620-hero-stage,
  .router-overview-framework .ik-v620-hero-stage,
  .ik-v620-hero-stage,
  #overview.router-overview-framework .ik-v420-visual,
  .router-overview-framework .ik-v420-visual,
  .ik-v420-visual {
    height: 72px !important;
    min-height: 72px !important;
    max-height: 72px !important;
  }

  #overview.router-overview-framework .ik-v812-trend-visual,
  .router-overview-framework .ik-v812-trend-visual,
  .ik-v812-trend-visual {
    min-height: 72px !important;
    grid-template-columns: minmax(0, 1fr) 50px !important;
  }

  #overview.router-overview-framework .ik-v812-trend-visual aside,
  .router-overview-framework .ik-v812-trend-visual aside,
  .ik-v812-trend-visual aside {
    grid-template-rows: repeat(4, 16px) !important;
  }

  #overview.router-overview-framework .ik-v420-line-chart,
  .router-overview-framework .ik-v420-line-chart,
  .ik-v420-line-chart,
  #overview.router-overview-framework .ik-v420-channel-rail,
  .router-overview-framework .ik-v420-channel-rail,
  .ik-v420-channel-rail,
  #overview.router-overview-framework .ik-v420-port-matrix,
  .router-overview-framework .ik-v420-port-matrix,
  .ik-v420-port-matrix,
  #overview.router-overview-framework .ik-density-resource-ledger,
  .router-overview-framework .ik-density-resource-ledger,
  .ik-density-resource-ledger,
  #overview.router-overview-framework .ik-v420-interface-list,
  .router-overview-framework .ik-v420-interface-list,
  .ik-v420-interface-list {
    height: 72px !important;
    min-height: 72px !important;
    max-height: 72px !important;
  }

  #overview.router-overview-framework .ik-v420-port-matrix,
  .router-overview-framework .ik-v420-port-matrix,
  .ik-v420-port-matrix {
    border-radius: 0 !important;
    background: transparent !important;
  }

  #overview.router-overview-framework .ik-v420-port-matrix span,
  .router-overview-framework .ik-v420-port-matrix span,
  .ik-v420-port-matrix span {
    min-height: 36px !important;
    border-radius: 0 !important;
    background: transparent !important;
  }

  #overview.router-overview-framework .ik-v420-resource-visual.ik-density-resource-ledger,
  .router-overview-framework .ik-v420-resource-visual.ik-density-resource-ledger,
  .ik-v420-resource-visual.ik-density-resource-ledger {
    grid-template-rows: repeat(3, 20px) !important;
    gap: 3px !important;
    padding: 3px 0 !important;
  }

  #overview.router-overview-framework .ik-v830-trust-rail,
  .router-overview-framework .ik-v830-trust-rail,
  .ik-v830-trust-rail {
    height: 22px !important;
    min-height: 22px !important;
  }

  #overview.router-overview-framework .ik-v420-timeline,
  #overview.router-overview-framework .ik-v420-list,
  .router-overview-framework .ik-v420-timeline,
  .router-overview-framework .ik-v420-list,
  .ik-v420-timeline,
  .ik-v420-list {
    border-left-color: transparent !important;
    border-right-color: transparent !important;
    background: rgba(255, 255, 255, .58) !important;
    box-shadow: none !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row,
  .router-overview-framework .ik-v420-timeline-row,
  .ik-v420-timeline-row {
    min-height: 40px !important;
  }

  #overview.router-overview-framework .ik-v420-list-row,
  .router-overview-framework .ik-v420-list-row,
  .ik-v420-list-row {
    min-height: 50px !important;
  }

  #overview.router-overview-framework .ik-v420-hero .ik-density-resource-ledger .ik-density-resource-row > i,
  .router-overview-framework .ik-v420-hero .ik-density-resource-ledger .ik-density-resource-row > i,
  .ik-v420-hero .ik-density-resource-ledger .ik-density-resource-row > i {
    background: rgba(139, 164, 190, .22) !important;
    border-color: transparent !important;
    box-shadow: none !important;
  }

  #overview.router-overview-framework .ik-v420-hero .ik-density-resource-ledger .ik-density-resource-row > i > i,
  .router-overview-framework .ik-v420-hero .ik-density-resource-ledger .ik-density-resource-row > i > i,
  .ik-v420-hero .ik-density-resource-ledger .ik-density-resource-row > i > i {
    background: rgba(86, 108, 132, .50) !important;
    border-color: transparent !important;
    box-shadow: none !important;
  }

  #overview.router-overview-framework .ik-v420-hero .ik-density-resource-ledger .ik-density-resource-row.is-danger i,
  .router-overview-framework .ik-v420-hero .ik-density-resource-ledger .ik-density-resource-row.is-danger i,
  .ik-v420-hero .ik-density-resource-ledger .ik-density-resource-row.is-danger i {
    background: rgba(86, 108, 132, .50) !important;
  }

  #overview.router-overview-framework .ik-density-resource-ledger .ik-density-resource-row .ik-density-resource-track,
  .router-overview-framework .ik-density-resource-ledger .ik-density-resource-row .ik-density-resource-track,
  .ik-density-resource-ledger .ik-density-resource-row .ik-density-resource-track {
    grid-column: 5 !important;
    order: 5 !important;
    position: relative !important;
    display: block !important;
    width: 100% !important;
    height: 2px !important;
    min-height: 2px !important;
    margin: 0 !important;
    border: 0 !important;
    border-radius: 999px !important;
    background: rgba(139, 164, 190, .22) !important;
    box-shadow: none !important;
    overflow: hidden !important;
    text-decoration: none !important;
  }

  #overview.router-overview-framework .ik-density-resource-ledger .ik-density-resource-row .ik-density-resource-track > span,
  .router-overview-framework .ik-density-resource-ledger .ik-density-resource-row .ik-density-resource-track > span,
  .ik-density-resource-ledger .ik-density-resource-row .ik-density-resource-track > span {
    position: absolute !important;
    inset: 0 auto 0 0 !important;
    display: block !important;
    height: 2px !important;
    min-height: 2px !important;
    margin: 0 !important;
    border: 0 !important;
    border-radius: 999px !important;
    background: rgba(86, 108, 132, .50) !important;
    box-shadow: none !important;
    text-decoration: none !important;
  }
}

@media (max-width: 760px), (min-width: 761px) and (max-width: 900px) and (max-height: 520px) {
  #overview.router-overview-framework .ik-v420-screen,
  .router-overview-framework .ik-v420-screen,
  .ik-v420-screen {
    padding: max(3px, env(safe-area-inset-top, 0px)) 13px calc(64px + env(safe-area-inset-bottom, 0px)) !important;
  }

  #overview.router-overview-framework .ik-v420-screen > * + *,
  .router-overview-framework .ik-v420-screen > * + *,
  .ik-v420-screen > * + * {
    margin-top: 5px !important;
  }

  #overview.router-overview-framework .ik-v420-nav,
  .router-overview-framework .ik-v420-nav,
  .ik-v420-nav {
    grid-template-columns: 30px minmax(0, 1fr) auto !important;
    height: 48px !important;
    min-height: 48px !important;
    gap: 7px !important;
  }

  #overview.router-overview-framework .ik-v420-nav button,
  .router-overview-framework .ik-v420-nav button,
  .ik-v420-nav button {
    width: 30px !important;
    height: 30px !important;
  }

  #overview.router-overview-framework .ik-v420-nav div b,
  .router-overview-framework .ik-v420-nav div b,
  .ik-v420-nav div b {
    font-size: 14.5px !important;
    line-height: 17px !important;
  }

  #overview.router-overview-framework .ik-v420-nav div span,
  .router-overview-framework .ik-v420-nav div span,
  .ik-v420-nav div span {
    font-size: 9.4px !important;
    line-height: 11px !important;
  }

  #overview.router-overview-framework .ik-v420-nav strong,
  .router-overview-framework .ik-v420-nav strong,
  .ik-v420-nav strong {
    height: 18px !important;
    min-height: 18px !important;
    padding: 0 6px !important;
    border-color: rgba(142, 169, 196, .28) !important;
    background: rgba(255, 255, 255, .44) !important;
    font-size: 8.8px !important;
    line-height: 18px !important;
  }

  #overview.router-overview-framework .ik-v420-hero,
  .router-overview-framework .ik-v420-hero,
  .ik-v420-hero {
    grid-template-rows: 28px 72px 21px !important;
    gap: 4px !important;
    min-height: 137px !important;
    max-height: 148px !important;
    padding: 6px 8px 6px !important;
    border-color: rgba(142, 169, 196, .18) !important;
    border-radius: 8px !important;
    background: rgba(255, 255, 255, .62) !important;
  }

  #overview.router-overview-framework .ik-v420-hero::before,
  .router-overview-framework .ik-v420-hero::before,
  .ik-v420-hero::before {
    inset: 7px auto 7px 0 !important;
    width: 2px !important;
    opacity: .82 !important;
  }

  #overview.router-overview-framework .ik-v420-hero.is-danger,
  .router-overview-framework .ik-v420-hero.is-danger,
  .ik-v420-hero.is-danger {
    background: linear-gradient(90deg, rgba(184, 58, 50, .024), rgba(255,255,255,.66) 40%, rgba(255,255,255,.58)) !important;
  }

  #overview.router-overview-framework .ik-v420-hero.is-warn,
  #overview.router-overview-framework .ik-v420-hero.is-missing,
  .router-overview-framework .ik-v420-hero.is-warn,
  .router-overview-framework .ik-v420-hero.is-missing,
  .ik-v420-hero.is-warn,
  .ik-v420-hero.is-missing {
    background: linear-gradient(90deg, rgba(168, 111, 35, .024), rgba(255,255,255,.66) 40%, rgba(255,255,255,.58)) !important;
  }

  #overview.router-overview-framework .ik-v620-hero-head,
  .router-overview-framework .ik-v620-hero-head,
  .ik-v620-hero-head {
    align-content: start !important;
    gap: 0 !important;
  }

  #overview.router-overview-framework .ik-v620-hero-head h1,
  .router-overview-framework .ik-v620-hero-head h1,
  .ik-v620-hero-head h1 {
    font-size: 14px !important;
    line-height: 16px !important;
    letter-spacing: -.12px !important;
  }

  #overview.router-overview-framework .ik-v620-hero-head p,
  .router-overview-framework .ik-v620-hero-head p,
  .ik-v620-hero-head p {
    font-size: 8.8px !important;
    line-height: 10px !important;
  }

  #overview.router-overview-framework .ik-v620-hero-stage,
  .router-overview-framework .ik-v620-hero-stage,
  .ik-v620-hero-stage,
  #overview.router-overview-framework .ik-v420-visual,
  .router-overview-framework .ik-v420-visual,
  .ik-v420-visual,
  #overview.router-overview-framework .ik-v812-trend-visual,
  .router-overview-framework .ik-v812-trend-visual,
  .ik-v812-trend-visual,
  #overview.router-overview-framework .ik-v420-line-chart,
  .router-overview-framework .ik-v420-line-chart,
  .ik-v420-line-chart,
  #overview.router-overview-framework .ik-v420-channel-rail,
  .router-overview-framework .ik-v420-channel-rail,
  .ik-v420-channel-rail,
  #overview.router-overview-framework .ik-v420-port-matrix,
  .router-overview-framework .ik-v420-port-matrix,
  .ik-v420-port-matrix,
  #overview.router-overview-framework .ik-density-resource-ledger,
  .router-overview-framework .ik-density-resource-ledger,
  .ik-density-resource-ledger,
  #overview.router-overview-framework .ik-v420-interface-list,
  .router-overview-framework .ik-v420-interface-list,
  .ik-v420-interface-list {
    height: 72px !important;
    min-height: 72px !important;
    max-height: 72px !important;
  }

  #overview.router-overview-framework .ik-v620-hero-stage,
  .router-overview-framework .ik-v620-hero-stage,
  .ik-v620-hero-stage {
    grid-template-columns: 86px minmax(0, 1fr) !important;
    gap: 6px !important;
  }

  #overview.router-overview-framework .ik-v420-hero-stats,
  .router-overview-framework .ik-v420-hero-stats,
  .ik-v420-hero-stats {
    grid-template-rows: repeat(4, 16px) !important;
  }

  #overview.router-overview-framework .ik-v420-hero-stats span,
  .router-overview-framework .ik-v420-hero-stats span,
  .ik-v420-hero-stats span {
    grid-template-columns: 30px minmax(0, 1fr) !important;
    min-height: 16px !important;
  }

  #overview.router-overview-framework .ik-v420-hero-stats em,
  .router-overview-framework .ik-v420-hero-stats em,
  .ik-v420-hero-stats em {
    font-size: 7.4px !important;
    line-height: 8px !important;
  }

  #overview.router-overview-framework .ik-v420-hero-stats b,
  #overview.router-overview-framework .ik-v420-hero-stats .is-primary b,
  .router-overview-framework .ik-v420-hero-stats b,
  .router-overview-framework .ik-v420-hero-stats .is-primary b,
  .ik-v420-hero-stats b,
  .ik-v420-hero-stats .is-primary b {
    font-size: 9px !important;
    line-height: 10px !important;
  }

  #overview.router-overview-framework .ik-v812-trend-visual,
  .router-overview-framework .ik-v812-trend-visual,
  .ik-v812-trend-visual {
    grid-template-columns: minmax(0, 1fr) 54px !important;
    gap: 6px !important;
  }

  #overview.router-overview-framework .ik-v812-trend-visual aside,
  .router-overview-framework .ik-v812-trend-visual aside,
  .ik-v812-trend-visual aside {
    grid-template-rows: repeat(4, 15px) !important;
    align-content: center !important;
  }

  #overview.router-overview-framework .ik-v812-trend-visual aside em,
  .router-overview-framework .ik-v812-trend-visual aside em,
  .ik-v812-trend-visual aside em {
    font-size: 7px !important;
    line-height: 7px !important;
  }

  #overview.router-overview-framework .ik-v812-trend-visual aside b,
  .router-overview-framework .ik-v812-trend-visual aside b,
  .ik-v812-trend-visual aside b {
    font-size: 8.4px !important;
    line-height: 9px !important;
  }

  #overview.router-overview-framework .ik-v830-trust-rail,
  .router-overview-framework .ik-v830-trust-rail,
  .ik-v830-trust-rail {
    height: 21px !important;
    min-height: 21px !important;
    border-top-color: rgba(164, 184, 205, .24) !important;
  }

  #overview.router-overview-framework .ik-v830-trust-rail span,
  .router-overview-framework .ik-v830-trust-rail span,
  .ik-v830-trust-rail span {
    padding: 0 4px !important;
  }

  #overview.router-overview-framework .ik-v830-trust-rail b,
  #overview.router-overview-framework .ik-v830-trust-rail strong,
  .router-overview-framework .ik-v830-trust-rail b,
  .router-overview-framework .ik-v830-trust-rail strong,
  .ik-v830-trust-rail b,
  .ik-v830-trust-rail strong {
    font-size: 8px !important;
    line-height: 10px !important;
  }

  #overview.router-overview-framework .ik-v420-port-matrix,
  .router-overview-framework .ik-v420-port-matrix,
  .ik-v420-port-matrix,
  #overview.router-overview-framework .ik-v420-channel-rail,
  .router-overview-framework .ik-v420-channel-rail,
  .ik-v420-channel-rail {
    border-color: rgba(158, 178, 199, .30) !important;
    background: rgba(248, 251, 254, .22) !important;
  }

  #overview.router-overview-framework .ik-v420-port-matrix span,
  .router-overview-framework .ik-v420-port-matrix span,
  .ik-v420-port-matrix span {
    min-height: 36px !important;
    padding: 2px 4px 2px 0 !important;
  }

  #overview.router-overview-framework .ik-v420-port-matrix b,
  .router-overview-framework .ik-v420-port-matrix b,
  .ik-v420-port-matrix b {
    font-size: 10px !important;
    line-height: 11px !important;
  }

  #overview.router-overview-framework .ik-v420-port-matrix small,
  .router-overview-framework .ik-v420-port-matrix small,
  .ik-v420-port-matrix small {
    font-size: 7px !important;
    line-height: 8px !important;
  }

  #overview.router-overview-framework .ik-v420-timeline,
  #overview.router-overview-framework .ik-v420-list,
  .router-overview-framework .ik-v420-timeline,
  .router-overview-framework .ik-v420-list,
  .ik-v420-timeline,
  .ik-v420-list {
    border: 0 !important;
    border-radius: 8px !important;
    background: rgba(255, 255, 255, .64) !important;
    box-shadow: inset 0 0 0 .5px rgba(142, 169, 196, .16) !important;
  }

  #overview.router-overview-framework .ik-v420-surface,
  .router-overview-framework .ik-v420-surface,
  .ik-v420-surface {
    gap: 5px !important;
  }

  #overview.router-overview-framework .ik-v420-timeline,
  .router-overview-framework .ik-v420-timeline,
  .ik-v420-timeline {
    padding: 0 10px !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row,
  .router-overview-framework .ik-v420-timeline-row,
  .ik-v420-timeline-row {
    grid-template-columns: 10px 60px max-content minmax(0, 1fr) !important;
    min-height: 44px !important;
    gap: 5px !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row b,
  #overview.router-overview-framework .ik-v420-timeline-row strong,
  .router-overview-framework .ik-v420-timeline-row b,
  .router-overview-framework .ik-v420-timeline-row strong,
  .ik-v420-timeline-row b,
  .ik-v420-timeline-row strong {
    font-size: 11px !important;
    line-height: 13px !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row em,
  .router-overview-framework .ik-v420-timeline-row em,
  .ik-v420-timeline-row em {
    font-size: 8.4px !important;
    line-height: 10px !important;
  }

  #overview.router-overview-framework .ik-v420-list,
  .router-overview-framework .ik-v420-list,
  .ik-v420-list {
    padding: 0 10px 1px !important;
  }

  #overview.router-overview-framework .ik-v420-list header,
  .router-overview-framework .ik-v420-list header,
  .ik-v420-list header {
    min-height: 22px !important;
    padding: 3px 0 1px !important;
  }

  #overview.router-overview-framework .ik-v420-list-row,
  .router-overview-framework .ik-v420-list-row,
  .ik-v420-list-row {
    grid-template-columns: 28px minmax(0, 1fr) 58px !important;
    min-height: 52px !important;
    gap: 8px !important;
  }

  #overview.router-overview-framework .ik-v420-list-row > i,
  .router-overview-framework .ik-v420-list-row > i,
  .ik-v420-list-row > i {
    width: 28px !important;
    height: 28px !important;
    border-radius: 6px !important;
    background: rgba(20, 115, 230, .045) !important;
  }

  #overview.router-overview-framework .ik-v420-list-row span,
  .router-overview-framework .ik-v420-list-row span,
  .ik-v420-list-row span {
    gap: 1px !important;
  }

  #overview.router-overview-framework .ik-v420-list-row b,
  .router-overview-framework .ik-v420-list-row b,
  .ik-v420-list-row b {
    font-size: 11.5px !important;
    line-height: 13px !important;
  }

  #overview.router-overview-framework .ik-v420-list-row em,
  .router-overview-framework .ik-v420-list-row em,
  .ik-v420-list-row em {
    font-size: 8.8px !important;
    line-height: 10px !important;
  }

  #overview.router-overview-framework .ik-v420-list-row strong b,
  .router-overview-framework .ik-v420-list-row strong b,
  .ik-v420-list-row strong b {
    font-size: 11px !important;
    line-height: 12px !important;
  }

  #overview.router-overview-framework .ik-v420-tabs,
  .router-overview-framework .ik-v420-tabs,
  .ik-v420-tabs {
    height: calc(64px + env(safe-area-inset-bottom, 0px)) !important;
    min-height: calc(64px + env(safe-area-inset-bottom, 0px)) !important;
    padding: 3px 7px max(3px, env(safe-area-inset-bottom, 0px)) !important;
    background: rgba(250, 252, 255, .97) !important;
  }

  #overview.router-overview-framework .ik-v420-tabs button,
  .router-overview-framework .ik-v420-tabs button,
  .ik-v420-tabs button {
    min-height: 40px !important;
    gap: 2px !important;
    color: #75869a !important;
    font-size: 9px !important;
  }

  #overview.router-overview-framework .ik-v420-tabs svg,
  .router-overview-framework .ik-v420-tabs svg,
  .ik-v420-tabs svg {
    width: 17px !important;
    height: 17px !important;
    stroke-width: 1.75 !important;
  }
}

@media (max-width: 760px), (min-width: 761px) and (max-width: 900px) and (max-height: 520px) {
  #overview.router-overview-framework .ik-v420-app,
  .router-overview-framework .ik-v420-app,
  .ik-v420-app {
    color: var(--ik-v950-text) !important;
    font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "PingFang SC", "Microsoft YaHei", sans-serif !important;
    background: linear-gradient(180deg, #edf5ff 0%, #f4f8fc 34%, #f7fafc 100%) !important;
  }

  #overview.router-overview-framework .ik-v420-shell,
  .router-overview-framework .ik-v420-shell,
  .ik-v420-shell {
    background:
      radial-gradient(circle at 50% -10%, rgba(20, 115, 230, .09), transparent 34%),
      linear-gradient(180deg, rgba(255,255,255,.28), rgba(255,255,255,0)) !important;
  }

  #overview.router-overview-framework .ik-v420-screen,
  .router-overview-framework .ik-v420-screen,
  .ik-v420-screen {
    padding: max(4px, env(safe-area-inset-top, 0px)) 13px calc(64px + env(safe-area-inset-bottom, 0px)) !important;
  }

  #overview.router-overview-framework .ik-v420-nav,
  .router-overview-framework .ik-v420-nav,
  .ik-v420-nav {
    border-bottom: .5px solid rgba(151, 174, 198, .20) !important;
    background: transparent !important;
  }

  #overview.router-overview-framework .ik-v420-nav button,
  .router-overview-framework .ik-v420-nav button,
  .ik-v420-nav button {
    color: var(--ik-blue) !important;
  }

  #overview.router-overview-framework .ik-v420-nav strong,
  .router-overview-framework .ik-v420-nav strong,
  .ik-v420-nav strong {
    border: .5px solid rgba(151, 174, 198, .28) !important;
    background: rgba(255, 255, 255, .52) !important;
    color: #37526f !important;
  }

  #overview.router-overview-framework .ik-v420-nav strong i,
  .router-overview-framework .ik-v420-nav strong i,
  .ik-v420-nav strong i {
    width: 5px !important;
    height: 5px !important;
    margin-right: 3px !important;
  }

  #overview.router-overview-framework .ik-v420-hero,
  .router-overview-framework .ik-v420-hero,
  .ik-v420-hero {
    border: 0 !important;
    box-shadow: inset 0 0 0 .5px var(--ik-v950-line) !important;
    background: var(--ik-v950-surface) !important;
    backdrop-filter: saturate(1.08) blur(6px) !important;
  }

  #overview.router-overview-framework .ik-v420-hero.is-ok,
  .router-overview-framework .ik-v420-hero.is-ok,
  .ik-v420-hero.is-ok {
    background: linear-gradient(90deg, rgba(20, 115, 230, .030), rgba(255,255,255,.74) 32%, rgba(255,255,255,.64)) !important;
  }

  #overview.router-overview-framework .ik-v420-hero.is-danger,
  .router-overview-framework .ik-v420-hero.is-danger,
  .ik-v420-hero.is-danger {
    background: linear-gradient(90deg, rgba(164, 48, 45, .030), rgba(255,255,255,.76) 34%, rgba(255,255,255,.64)) !important;
  }

  #overview.router-overview-framework .ik-v420-hero.is-warn,
  #overview.router-overview-framework .ik-v420-hero.is-missing,
  .router-overview-framework .ik-v420-hero.is-warn,
  .router-overview-framework .ik-v420-hero.is-missing,
  .ik-v420-hero.is-warn,
  .ik-v420-hero.is-missing {
    background: linear-gradient(90deg, rgba(168, 111, 35, .026), rgba(255,255,255,.76) 34%, rgba(255,255,255,.64)) !important;
  }

  #overview.router-overview-framework .ik-v620-hero-head h1,
  .router-overview-framework .ik-v620-hero-head h1,
  .ik-v620-hero-head h1 {
    color: #12233a !important;
    font-weight: 820 !important;
  }

  #overview.router-overview-framework .ik-v620-hero-head p,
  .router-overview-framework .ik-v620-hero-head p,
  .ik-v620-hero-head p {
    color: var(--ik-v950-muted) !important;
    font-weight: 560 !important;
  }

  #overview.router-overview-framework .ik-v950-axis-label,
  .router-overview-framework .ik-v950-axis-label,
  .ik-v950-axis-label {
    fill: rgba(96, 116, 138, .74) !important;
    font-size: 7px !important;
    font-weight: 650 !important;
    letter-spacing: -.05px !important;
  }

  #overview.router-overview-framework .ik-v420-curve.is-main,
  .router-overview-framework .ik-v420-curve.is-main,
  .ik-v420-curve.is-main {
    stroke-width: 1.85px !important;
  }

  #overview.router-overview-framework .ik-v420-area,
  .router-overview-framework .ik-v420-area,
  .ik-v420-area {
    opacity: .10 !important;
  }

  #overview.router-overview-framework .ik-v420-gridline,
  .router-overview-framework .ik-v420-gridline,
  .ik-v420-gridline {
    opacity: .45 !important;
  }

  #overview.router-overview-framework .ik-v812-trend-visual aside span,
  .router-overview-framework .ik-v812-trend-visual aside span,
  .ik-v812-trend-visual aside span {
    border: 0 !important;
    background: transparent !important;
    box-shadow: none !important;
  }

  #overview.router-overview-framework .ik-v830-trust-rail,
  .router-overview-framework .ik-v830-trust-rail,
  .ik-v830-trust-rail {
    border-top: .5px solid var(--ik-v950-line-soft) !important;
  }

  #overview.router-overview-framework .ik-v830-trust-rail span,
  .router-overview-framework .ik-v830-trust-rail span,
  .ik-v830-trust-rail span {
    border-right: .5px solid var(--ik-v950-line-soft) !important;
    background: transparent !important;
  }

  #overview.router-overview-framework .ik-v420-timeline,
  #overview.router-overview-framework .ik-v420-list,
  .router-overview-framework .ik-v420-timeline,
  .router-overview-framework .ik-v420-list,
  .ik-v420-timeline,
  .ik-v420-list {
    border: 0 !important;
    border-radius: 10px !important;
    background: rgba(255, 255, 255, .68) !important;
    box-shadow: inset 0 0 0 .5px rgba(151, 174, 198, .14) !important;
    overflow: hidden !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row,
  .router-overview-framework .ik-v420-timeline-row,
  .ik-v420-timeline-row,
  #overview.router-overview-framework .ik-v420-list-row,
  .router-overview-framework .ik-v420-list-row,
  .ik-v420-list-row {
    border-bottom: .5px solid rgba(151, 174, 198, .20) !important;
    background: transparent !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row:last-child,
  .router-overview-framework .ik-v420-timeline-row:last-child,
  .ik-v420-timeline-row:last-child,
  #overview.router-overview-framework .ik-v420-list-row:last-child,
  .router-overview-framework .ik-v420-list-row:last-child,
  .ik-v420-list-row:last-child {
    border-bottom: 0 !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row i,
  .router-overview-framework .ik-v420-timeline-row i,
  .ik-v420-timeline-row i {
    box-shadow: none !important;
  }

  #overview.router-overview-framework .ik-v420-list header,
  .router-overview-framework .ik-v420-list header,
  .ik-v420-list header {
    border-bottom: .5px solid rgba(151, 174, 198, .20) !important;
    color: #213652 !important;
  }

  #overview.router-overview-framework .ik-v420-list-row > i,
  .router-overview-framework .ik-v420-list-row > i,
  .ik-v420-list-row > i {
    border: .5px solid rgba(20, 115, 230, .25) !important;
    background: rgba(20, 115, 230, .035) !important;
    box-shadow: none !important;
  }

  #overview.router-overview-framework .ik-v420-list-row u,
  .router-overview-framework .ik-v420-list-row u,
  .ik-v420-list-row u {
    height: 1.5px !important;
    background: rgba(151, 174, 198, .18) !important;
  }

  #overview.router-overview-framework .ik-v420-list-row u i,
  .router-overview-framework .ik-v420-list-row u i,
  .ik-v420-list-row u i {
    background: rgba(20, 115, 230, .64) !important;
  }

  #overview.router-overview-framework .ik-v420-list-row.is-danger > i,
  .router-overview-framework .ik-v420-list-row.is-danger > i,
  .ik-v420-list-row.is-danger > i {
    border-color: rgba(164, 48, 45, .26) !important;
    background: rgba(164, 48, 45, .035) !important;
    color: #a4302d !important;
  }

  #overview.router-overview-framework .ik-v420-port-matrix,
  .router-overview-framework .ik-v420-port-matrix,
  .ik-v420-port-matrix {
    gap: 0 !important;
    border: .5px solid rgba(151, 174, 198, .22) !important;
    background: rgba(255,255,255,.32) !important;
  }

  #overview.router-overview-framework .ik-v420-port-matrix span,
  .router-overview-framework .ik-v420-port-matrix span,
  .ik-v420-port-matrix span {
    border-right: .5px solid rgba(151, 174, 198, .18) !important;
    border-bottom: .5px solid rgba(151, 174, 198, .18) !important;
  }

  #overview.router-overview-framework .ik-v420-port-matrix span i,
  .router-overview-framework .ik-v420-port-matrix span i,
  .ik-v420-port-matrix span i {
    width: 2px !important;
    border-radius: 0 !important;
  }

  #overview.router-overview-framework .ik-v420-port-matrix .is-danger em,
  .router-overview-framework .ik-v420-port-matrix .is-danger em,
  .ik-v420-port-matrix .is-danger em {
    color: #7f3340 !important;
    font-weight: 720 !important;
  }

  #overview.router-overview-framework .ik-density-resource-ledger .ik-density-resource-row.is-danger > strong,
  .router-overview-framework .ik-density-resource-ledger .ik-density-resource-row.is-danger > strong,
  .ik-density-resource-ledger .ik-density-resource-row.is-danger > strong {
    color: #a4302d !important;
  }

  #overview.router-overview-framework .ik-density-resource-ledger .ik-density-resource-row.is-danger > em,
  .router-overview-framework .ik-density-resource-ledger .ik-density-resource-row.is-danger > em,
  .ik-density-resource-ledger .ik-density-resource-row.is-danger > em {
    color: #7f3340 !important;
  }

  #overview.router-overview-framework .ik-v420-tabs,
  .router-overview-framework .ik-v420-tabs,
  .ik-v420-tabs {
    border-top: 0 !important;
    background: rgba(250, 252, 255, .965) !important;
    backdrop-filter: saturate(1.1) blur(10px) !important;
  }

  #overview.router-overview-framework .ik-v420-tabs button.is-active,
  .router-overview-framework .ik-v420-tabs button.is-active,
  .ik-v420-tabs button.is-active {
    color: var(--ik-blue) !important;
    font-weight: 760 !important;
  }

  #overview.router-overview-framework .ik-v420-tabs button.is-active::after,
  .router-overview-framework .ik-v420-tabs button.is-active::after,
  .ik-v420-tabs button.is-active::after {
    content: "" !important;
    display: block !important;
    width: 16px !important;
    height: 2px !important;
    margin-top: 1px !important;
    border-radius: 999px !important;
    background: var(--ik-blue) !important;
  }
}
`;

export const MOBILE_OVERVIEW_FOUNDATION_STYLES = V420_MOBILE_STYLES;