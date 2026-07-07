import { MOBILE_OVERVIEW_TOKEN_CSS } from "../mobileOverviewTokens";

const V420_MOBILE_STYLES = `
@media (max-width: 760px) {
  .router-overview-framework .ik-v420-app,
  .ik-v420-app {
    ${MOBILE_OVERVIEW_TOKEN_CSS}
    --blue: #1677ff;
    --blue-2: #6bbcff;
    --bg: #f5f9fc;
    --text: #0f172a;
    --muted: #617187;
    --subtle: #8c9bad;
    --green: #18c37e;
    --warn: #df8128;
    --red: #d93025;
    --hairline: inset 0 0 0 .5px rgba(126,166,204,.25);
    --shadow-soft: 0 8px 22px rgba(35,82,130,.055);
    --shadow-float: 0 18px 42px rgba(35,82,130,.105);
    min-height: 100dvh;
    background:
      radial-gradient(circle at 48% -120px, rgba(22,119,255,.18), transparent 285px),
      linear-gradient(180deg, #fbfdff 0%, #f3f9ff 38%, #f7fbff 100%);
    color: var(--text);
    font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "PingFang SC", "Microsoft YaHei", sans-serif;
    font-variant-numeric: tabular-nums;
    -webkit-font-smoothing: antialiased;
  }
  .router-overview-framework .ik-v420-shell,
  .ik-v420-shell { max-width: 430px; margin: 0 auto; }
  .router-overview-framework .ik-v420-screen,
  .ik-v420-screen {
    min-height: 100dvh;
    padding: max(8px, env(safe-area-inset-top, 0px)) 16px 88px;
  }
  .router-overview-framework .ik-v420-screen > * + *,
  .ik-v420-screen > * + * { margin-top: 10px; }
  .router-overview-framework .ik-v420-nav,
  .ik-v420-nav {
    min-height: 54px;
    display: grid;
    grid-template-columns: 42px minmax(0, 1fr) auto;
    align-items: center;
    gap: 10px;
  }
  .router-overview-framework .ik-v420-nav button,
  .ik-v420-nav button {
    width: 40px;
    height: 40px;
    padding: 0;
    border-width: 0;
    border-radius: 15px;
    background: rgba(255,255,255,.76);
    box-shadow: inset 0 0 0 1px rgba(218,232,244,.94) !important;
    color: var(--blue);
  }
  .router-overview-framework .ik-v420-nav svg,
  .router-overview-framework .ik-v420-tabs svg,
  .ik-v420-nav svg,
  .ik-v420-tabs svg {
    width: 18px;
    height: 18px;
    fill: none;
    stroke: currentColor;
    stroke-width: 1.75;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .router-overview-framework .ik-v420-nav div,
  .ik-v420-nav div { display: grid; gap: 2px; min-width: 0; }
  .router-overview-framework .ik-v420-nav div b,
  .ik-v420-nav div b {
    color: var(--text);
    font-size: 17px;
    font-weight: 760;
    letter-spacing: -.03em;
    line-height: 1.08;
  }
  .router-overview-framework .ik-v420-nav div span,
  .ik-v420-nav div span { color: var(--muted); font-size: 11.5px; line-height: 1.08; }
  .router-overview-framework .ik-v420-nav strong,
  .ik-v420-nav strong {
    display: inline-flex;
    min-height: 30px;
    align-items: center;
    gap: 6px;
    padding: 0 10px;
    border-radius: 999px;
    background: rgba(255,255,255,.78);
    box-shadow: inset 0 0 0 1px rgba(218,232,244,.9) !important;
    color: var(--blue);
    font-size: 12px;
    font-weight: 760;
    white-space: nowrap;
  }
  .router-overview-framework .ik-v420-nav i,
  .router-overview-framework .ik-v420-card i,
  .router-overview-framework .ik-v420-channel-rail i,
  .router-overview-framework .ik-v420-port-matrix i,
  .router-overview-framework .ik-v420-list-row > i,
  .router-overview-framework .ik-v420-incident > i,
  .ik-v420-nav i,
  .ik-v420-card i,
  .ik-v420-channel-rail i,
  .ik-v420-port-matrix i,
  .ik-v420-list-row > i,
  .ik-v420-incident > i { width: 7px; height: 7px; border-radius: 99px; background: var(--green); }
  .router-overview-framework .ik-v420-app .is-warn i,
  .router-overview-framework .ik-v420-app .is-missing i,
  .ik-v420-app .is-warn i,
  .ik-v420-app .is-missing i { background: var(--warn); }
  .router-overview-framework .ik-v420-app .is-danger i,
  .ik-v420-app .is-danger i { background: var(--red); }
  .router-overview-framework .ik-v420-hero,
  .ik-v420-hero {
    position: relative;
    overflow: hidden;
    min-height: 238px;
    padding: 17px 17px 18px;
    border-radius: 26px;
    background:
      radial-gradient(circle at 84% -10%, rgba(22,119,255,.16), transparent 36%),
      linear-gradient(160deg, rgba(255,255,255,.99), rgba(240,248,255,.98) 62%, rgba(253,254,255,.98));
    box-shadow: 0 18px 42px rgba(36,91,142,.12), inset 0 0 0 1px rgba(207,225,241,.96) !important;
  }
  .router-overview-framework .ik-v420-hero::before,
  .ik-v420-hero::before {
    content: "";
    position: absolute;
    inset: 18px auto 18px 0;
    width: 3px;
    border-radius: 99px;
    background: var(--blue);
  }
  .router-overview-framework .ik-v420-hero.is-warn::before,
  .router-overview-framework .ik-v420-hero.is-missing::before,
  .ik-v420-hero.is-warn::before,
  .ik-v420-hero.is-missing::before { background: var(--warn); }
  .router-overview-framework .ik-v420-hero.is-danger::before,
  .ik-v420-hero.is-danger::before { background: var(--red); }
  .router-overview-framework .ik-v420-hero header,
  .ik-v420-hero header { display: grid; gap: 5px; }
  .router-overview-framework .ik-v420-hero header span,
  .ik-v420-hero header span {
    width: max-content;
    padding: 0;
    color: var(--muted);
    font-size: 12px;
    font-weight: 760;
    line-height: 1;
  }
  .router-overview-framework .ik-v420-hero h1,
  .ik-v420-hero h1 {
    margin: 0;
    color: var(--text);
    font-size: 27px;
    font-weight: 820;
    letter-spacing: -.05em;
    line-height: 1.02;
  }
  .router-overview-framework .ik-v420-hero p,
  .ik-v420-hero p {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 5px;
    margin: 0;
    color: var(--muted);
    font-size: 12px;
    line-height: 1.22;
  }
  .router-overview-framework .ik-v420-hero p b,
  .ik-v420-hero p b { color: var(--text); font-weight: 760; }
  .router-overview-framework .ik-v420-hero p i,
  .ik-v420-hero p i { width: 3px; height: 3px; border-radius: 99px; background: #bac8d6; }
  .router-overview-framework .ik-v420-hero-stats,
  .ik-v420-hero-stats {
    display: flex;
    gap: 9px;
    margin-top: 14px;
    align-items: end;
  }
  .router-overview-framework .ik-v420-hero-stats span,
  .ik-v420-hero-stats span {
    display: grid;
    min-width: 0;
    flex: 1 1 0;
    gap: 3px;
    padding: 8px 10px;
    border-radius: 15px;
    background: rgba(255,255,255,.42);
    box-shadow: inset .5px 0 0 rgba(119,164,207,.18) !important;
  }
  .router-overview-framework .ik-v420-hero-stats em,
  .router-overview-framework .ik-v420-hero-stats small,
  .ik-v420-hero-stats em,
  .ik-v420-hero-stats small {
    color: var(--muted);
    font-size: 10.8px;
    font-style: normal;
    font-weight: 690;
    line-height: 1.08;
  }
  .router-overview-framework .ik-v420-hero-stats small,
  .ik-v420-hero-stats small { color: var(--subtle); font-weight: 540; }
  .router-overview-framework .ik-v420-hero-stats b,
  .ik-v420-hero-stats b {
    color: var(--text);
    font-size: 15px;
    font-weight: 800;
    letter-spacing: -.04em;
    line-height: 1;
  }
  .router-overview-framework .ik-v420-hero-stats b i,
  .router-overview-framework .ik-v420-hero-stats small i,
  .ik-v420-hero-stats b i,
  .ik-v420-hero-stats small i {
    margin-right: 4px;
    color: var(--muted);
    font-size: 10.5px;
    font-style: normal;
    font-weight: 690;
  }
  .router-overview-framework .ik-v420-hero-stats .is-primary b,
  .ik-v420-hero-stats .is-primary b { font-size: 24px; }
  .router-overview-framework .ik-v420-hero-stats .is-primary b small,
  .ik-v420-hero-stats .is-primary b small {
    margin-left: 3px;
    color: var(--subtle);
    font-size: 11px;
    font-weight: 600;
  }
  .router-overview-framework .ik-v420-resource-row.is-danger strong,
  .ik-v420-resource-row.is-danger strong { color: #b92f32; }
  .router-overview-framework .ik-v420-visual,
  .ik-v420-visual { margin-top: 12px; min-height: 70px; }
  .router-overview-framework .ik-v420-line-chart,
  .ik-v420-line-chart { display: block; width: 100%; height: 76px; }
  .router-overview-framework .ik-v420-line-chart text,
  .ik-v420-line-chart text { fill: #90a0b3; font-size: 9px; font-weight: 650; }
  .router-overview-framework .ik-v420-gridline,
  .ik-v420-gridline { fill: none; stroke: rgba(185,211,234,.45); stroke-width: .65; }
  .router-overview-framework .ik-v420-area,
  .ik-v420-area { fill: rgba(22,119,255,.07); }
  .router-overview-framework .ik-v420-curve,
  .ik-v420-curve { fill: none; stroke-width: 1.55; stroke-linecap: round; stroke-linejoin: round; }
  .router-overview-framework .ik-v420-curve.is-main,
  .ik-v420-curve.is-main { stroke: var(--blue); }
  .router-overview-framework .ik-v420-curve.is-soft,
  .ik-v420-curve.is-soft { stroke: var(--blue-2); opacity: .82; }
  .router-overview-framework .ik-v420-focus-dot,
  .ik-v420-focus-dot { fill: var(--blue); stroke: white; stroke-width: 1.6; }
  .router-overview-framework .ik-v420-surface,
  .ik-v420-surface {
    position: relative;
    z-index: 2;
    margin-top: -2px;
    display: grid;
    gap: 10px;
  }
  .router-overview-framework .ik-v420-cards,
  .router-overview-framework .ik-v420-status-cards,
  .ik-v420-cards,
  .ik-v420-status-cards {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
    margin: -18px 10px 0;
  }
  .router-overview-framework .ik-v420-card,
  .ik-v420-card {
    min-height: 82px;
    padding: 12px 13px;
    border-width: 0;
    border-radius: 19px;
    background: rgba(255,255,255,.92);
    box-shadow: 0 10px 24px rgba(44,93,142,.075), inset 0 0 0 1px rgba(217,231,244,.92) !important;
  }
  .router-overview-framework .ik-v420-card header,
  .ik-v420-card header { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
  .router-overview-framework .ik-v420-card span,
  .ik-v420-card span { color: var(--muted); font-size: 12px; font-weight: 720; }
  .router-overview-framework .ik-v420-card strong,
  .ik-v420-card strong {
    display: block;
    margin-top: 8px;
    color: var(--text);
    font-size: 24px;
    font-weight: 820;
    letter-spacing: -.05em;
    line-height: 1;
  }
  .router-overview-framework .ik-v420-card p,
  .ik-v420-card p { margin: 5px 0 0; color: var(--subtle); font-size: 11px; line-height: 1.15; }
  .router-overview-framework .ik-v420-incident,
  .ik-v420-incident {
    display: grid;
    grid-template-columns: 30px minmax(0, 1fr) auto;
    gap: 10px;
    align-items: center;
    min-height: 58px;
    padding: 10px 13px;
    border-radius: 0;
    background: transparent;
    box-shadow: inset 3px 0 0 rgba(22,119,255,.22) !important;
  }
  .router-overview-framework .ik-v420-incident > i,
  .ik-v420-incident > i { width: 30px; height: 30px; }
  .router-overview-framework .ik-v420-incident span,
  .ik-v420-incident span { display: grid; gap: 2px; min-width: 0; }
  .router-overview-framework .ik-v420-incident b,
  .ik-v420-incident b { color: var(--text); font-size: 13px; font-weight: 760; line-height: 1.15; }
  .router-overview-framework .ik-v420-incident em,
  .ik-v420-incident em { color: var(--muted); font-size: 11.5px; font-style: normal; line-height: 1.15; }
  .router-overview-framework .ik-v420-incident strong,
  .ik-v420-incident strong { color: var(--text); font-size: 12px; font-weight: 760; white-space: nowrap; }
  .router-overview-framework .ik-v420-port-matrix,
  .ik-v420-port-matrix { display: grid; grid-template-columns: repeat(8, minmax(0, 1fr)); gap: 5px; align-items: stretch; }
  .router-overview-framework .ik-v420-port-matrix span,
  .ik-v420-port-matrix span {
    display: grid;
    min-height: 40px;
    place-items: center;
    gap: 3px;
    border-radius: 12px;
    background: rgba(255,255,255,.62);
    box-shadow: inset 0 0 0 1px rgba(220,232,244,.78) !important;
  }
  .router-overview-framework .ik-v420-port-matrix b,
  .ik-v420-port-matrix b { color: var(--text); font-size: 10.5px; font-weight: 760; line-height: 1; }
  .router-overview-framework .ik-v420-channel-rail,
  .ik-v420-channel-rail { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 6px; }
  .router-overview-framework .ik-v420-channel-rail span,
  .ik-v420-channel-rail span {
    display: grid;
    min-height: 52px;
    align-content: center;
    gap: 3px;
    box-shadow: inset 0 -2px 0 rgba(22,119,255,.18) !important;
  }
  .router-overview-framework .ik-v420-channel-rail b,
  .ik-v420-channel-rail b { color: var(--muted); font-size: 10.5px; line-height: 1; }
  .router-overview-framework .ik-v420-channel-rail em,
  .ik-v420-channel-rail em { color: var(--text); font-size: 12px; font-style: normal; font-weight: 760; line-height: 1.06; }
  .router-overview-framework .ik-v420-flow,
  .ik-v420-flow { display: grid; grid-template-columns: minmax(0, 1fr) 14px minmax(0, 1fr) 14px minmax(0, 1fr); gap: 6px; align-items: center; min-height: 62px; }
  .router-overview-framework .ik-v420-flow > i,
  .ik-v420-flow > i { height: 1px; background: rgba(22,119,255,.35); }
  .router-overview-framework .ik-v420-flow b,
  .ik-v420-flow b { display: block; color: var(--text); font-size: 11px; font-weight: 760; line-height: 1.1; }
  .router-overview-framework .ik-v420-flow em,
  .ik-v420-flow em { display: block; margin-top: 4px; color: var(--muted); font-size: 10.5px; font-style: normal; }
  .router-overview-framework .ik-v420-resource-visual,
  .ik-v420-resource-visual { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 9px; }
  .router-overview-framework .ik-v420-resource-visual span,
  .ik-v420-resource-visual span { display: grid; gap: 3px; min-width: 0; }
  .router-overview-framework .ik-v420-resource-visual b,
  .ik-v420-resource-visual b { color: var(--muted); font-size: 11px; font-weight: 700; }
  .router-overview-framework .ik-v420-resource-visual em,
  .ik-v420-resource-visual em { color: var(--text); font-size: 15px; font-style: normal; font-weight: 800; }
  .router-overview-framework .ik-v420-resource-visual svg,
  .ik-v420-resource-visual svg { width: 100%; height: 25px; }
  .router-overview-framework .ik-v420-resource-visual polyline,
  .ik-v420-resource-visual polyline { fill: none; stroke: var(--blue); stroke-width: 1.35; stroke-linecap: round; stroke-linejoin: round; }
  .router-overview-framework .ik-v420-resource-visual circle,
  .ik-v420-resource-visual circle { fill: var(--blue); }
  .router-overview-framework .ik-v420-resource-visual .is-danger polyline,
  .router-overview-framework .ik-v420-resource-visual .is-danger circle,
  .ik-v420-resource-visual .is-danger polyline,
  .ik-v420-resource-visual .is-danger circle { stroke: var(--red); fill: var(--red); }
  .router-overview-framework .ik-v420-resource,
  .ik-v420-resource {
    padding: 13px 14px;
    border-radius: 20px;
    background: rgba(255,255,255,.88);
    box-shadow: inset 0 0 0 1px rgba(218,232,244,.86) !important;
  }
  .router-overview-framework .ik-v420-resource header,
  .ik-v420-resource header { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; margin-bottom: 10px; }
  .router-overview-framework .ik-v420-resource header b,
  .ik-v420-resource header b { color: var(--text); font-size: 15px; font-weight: 780; }
  .router-overview-framework .ik-v420-resource header span,
  .ik-v420-resource header span { color: var(--muted); font-size: 12px; font-weight: 690; }
  .router-overview-framework .ik-v420-resource > div,
  .ik-v420-resource > div { display: grid; gap: 8px; }
  .router-overview-framework .ik-v420-resource-row,
  .ik-v420-resource-row {
    display: grid;
    grid-template-columns: 43px 58px minmax(0, 1fr) 58px;
    align-items: center;
    gap: 9px;
    min-height: 29px;
  }
  .router-overview-framework .ik-v420-resource-row b,
  .ik-v420-resource-row b { color: var(--muted); font-size: 12px; font-weight: 720; }
  .router-overview-framework .ik-v420-resource-row strong,
  .ik-v420-resource-row strong { color: var(--text); font-size: 17px; font-weight: 800; letter-spacing: -.035em; }
  .router-overview-framework .ik-v420-resource-row em,
  .ik-v420-resource-row em { color: var(--subtle); font-size: 10.8px; font-style: normal; text-align: right; }
  .router-overview-framework .ik-v420-boundary-row,
  .ik-v420-boundary-row {
    display: grid;
    grid-template-columns: 48px minmax(0, 74px) minmax(0, 1fr);
    align-items: center;
    min-height: 30px;
    gap: 8px;
  }
  .router-overview-framework .ik-v420-boundary-row b,
  .ik-v420-boundary-row b { color: var(--muted); font-size: 12px; font-weight: 720; }
  .router-overview-framework .ik-v420-boundary-row strong,
  .ik-v420-boundary-row strong { color: var(--text); font-size: 15px; font-weight: 800; letter-spacing: -.025em; }
  .router-overview-framework .ik-v420-boundary-row em,
  .ik-v420-boundary-row em { color: var(--subtle); font-size: 11px; font-style: normal; text-align: right; }
  .router-overview-framework .ik-v420-resource-line,
  .ik-v420-resource-line {
    position: relative;
    overflow: hidden;
    height: 5px;
    border-radius: 999px;
    background: #e8f0f7;
  }
  .router-overview-framework .ik-v420-resource-line i,
  .ik-v420-resource-line i {
    position: absolute;
    inset: 0 auto 0 0;
    border-radius: inherit;
    background: linear-gradient(90deg, var(--blue), #65b7ff);
  }
  .router-overview-framework .ik-v420-resource-row.is-danger .ik-v420-resource-line i,
  .ik-v420-resource-row.is-danger .ik-v420-resource-line i { background: linear-gradient(90deg, #d93025, #ef8b73); }
  .router-overview-framework .ik-v420-list,
  .ik-v420-list { overflow: hidden; border-radius: 20px; background: rgba(255,255,255,.88); box-shadow: inset 0 0 0 1px rgba(218,232,244,.86) !important; }
  .router-overview-framework .ik-v420-list header,
  .ik-v420-list header { display: flex; justify-content: space-between; gap: 10px; padding: 12px 14px 7px; }
  .router-overview-framework .ik-v420-list header b,
  .ik-v420-list header b { color: var(--text); font-size: 15px; font-weight: 780; }
  .router-overview-framework .ik-v420-list header span,
  .ik-v420-list header span { color: var(--muted); font-size: 12px; font-weight: 690; }
  .router-overview-framework .ik-v420-list-row,
  .ik-v420-list-row {
    display: grid;
    grid-template-columns: 30px minmax(0, 1fr) auto;
    gap: 10px;
    align-items: center;
    min-height: 50px;
    padding: 0 14px;
    box-shadow: inset 0 1px 0 rgba(226,236,246,.88) !important;
    background: transparent;
  }
  .router-overview-framework .ik-v420-list-row > i,
  .ik-v420-list-row > i {
    display: grid;
    place-items: center;
    width: 30px;
    height: 30px;
    background: linear-gradient(180deg, #e8f4ff, #f8fbff);
    color: var(--blue);
    font-size: 11px;
    font-style: normal;
    font-weight: 790;
  }
  .router-overview-framework .ik-v420-list-row span,
  .ik-v420-list-row span { min-width: 0; display: grid; gap: 2px; }
  .router-overview-framework .ik-v420-list-row b,
  .ik-v420-list-row b { color: var(--text); font-size: 13px; font-weight: 740; line-height: 1.1; }
  .router-overview-framework .ik-v420-list-row em,
  .ik-v420-list-row em { color: var(--muted); font-size: 11.5px; font-style: normal; line-height: 1.15; }
  .router-overview-framework .ik-v420-list-row strong,
  .ik-v420-list-row strong {
    max-width: 106px;
    color: var(--text);
    font-size: 13px;
    font-weight: 790;
    overflow-wrap: anywhere;
    text-align: right;
  }
  .router-overview-framework .ik-v420-app-list .ik-v420-list-row span,
  .ik-v420-app-list .ik-v420-list-row span { gap: 4px; }
  .router-overview-framework .ik-v420-app-list u,
  .ik-v420-app-list u {
    position: relative;
    display: block;
    overflow: hidden;
    width: 100%;
    height: 4px;
    border-radius: 999px;
    background: rgba(176,204,231,.34);
    text-decoration: none;
  }
  .router-overview-framework .ik-v420-app-list u i,
  .ik-v420-app-list u i {
    position: absolute;
    inset: 0 auto 0 0;
    border-radius: inherit;
    background: linear-gradient(90deg, var(--blue), var(--blue-2));
  }
  .router-overview-framework .ik-v420-tabs,
  .ik-v420-tabs {
    position: fixed;
    z-index: 40;
    left: 14px;
    right: 14px;
    bottom: max(9px, env(safe-area-inset-bottom, 0px));
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    min-height: 60px;
    padding: 5px;
    border-radius: 23px;
    background: rgba(255,255,255,.97);
    box-shadow: 0 16px 34px rgba(42,91,137,.16), inset 0 0 0 1px rgba(202,224,242,.9) !important;
  }
  .router-overview-framework .ik-v420-tabs button,
  .ik-v420-tabs button {
    display: grid;
    min-height: 46px;
    place-items: center;
    gap: 2px;
    padding: 0;
    border-width: 0;
    border-radius: 18px;
    background: transparent;
    color: #6f8095;
    font-size: 10.5px;
    font-weight: 700;
  }
  .router-overview-framework .ik-v420-tabs button.is-active,
  .ik-v420-tabs button.is-active { background: linear-gradient(180deg, rgba(22,119,255,.14), rgba(22,119,255,.08)); color: var(--blue); box-shadow: inset 0 0 0 1px rgba(22,119,255,.16) !important; }
}
@media (max-width: 380px) {
  .router-overview-framework .ik-v420-screen,
  .ik-v420-screen { padding-inline: 14px; }
  .router-overview-framework .ik-v420-hero h1,
  .ik-v420-hero h1 { font-size: 25px; }
  .router-overview-framework .ik-v420-hero-stats,
  .ik-v420-hero-stats { gap: 6px; }
  .router-overview-framework .ik-v420-hero-stats .is-primary b,
  .ik-v420-hero-stats .is-primary b { font-size: 24px; }
  .router-overview-framework .ik-v420-resource-row,
  .ik-v420-resource-row { grid-template-columns: 38px 52px minmax(0, 1fr) 50px; gap: 7px; }
}

/* V420 Apple HIG + iKuai 4.0 refinement layer:
   airy blue-white, foreground/background hierarchy, hairline charts,
   branded bottom tab, less boxiness, no heavy shadow/table feel. */
@media (max-width: 760px) {
  .router-overview-framework .ik-v420-nav strong,
  .ik-v420-nav strong {
    min-height: 28px;
    border: 0;
    color: #1272d9;
    font-size: 11.5px;
    box-shadow: var(--hairline) !important;
  }

  .router-overview-framework .ik-v420-nav i,
  .router-overview-framework .ik-v420-card i,
  .router-overview-framework .ik-v420-channel-rail i,
  .router-overview-framework .ik-v420-port-matrix i,
  .router-overview-framework .ik-v420-list-row > i,
  .ik-v420-nav i,
  .ik-v420-card i,
  .ik-v420-channel-rail i,
  .ik-v420-port-matrix i,
  .ik-v420-list-row > i {
    width: 6px;
    height: 6px;
    box-shadow: 0 0 0 3px rgba(32,199,132,.12) !important;
  }

  .router-overview-framework .ik-v420-app .is-warn i,
  .router-overview-framework .ik-v420-app .is-missing i,
  .ik-v420-app .is-warn i,
  .ik-v420-app .is-missing i {
    box-shadow: 0 0 0 3px rgba(184,114,22,.12) !important;
  }

  .router-overview-framework .ik-v420-app .is-danger i,
  .ik-v420-app .is-danger i {
    box-shadow: 0 0 0 3px rgba(216,74,79,.12) !important;
  }

  .router-overview-framework .ik-v420-hero,
  .ik-v420-hero {
    padding: 14px 15px 12px;
    border: 0;
    border-radius: 23px;
    background:
      radial-gradient(circle at 90% 0%, rgba(99,187,255,.18), transparent 32%),
      linear-gradient(153deg, rgba(255,255,255,.97), rgba(239,248,255,.92) 56%, rgba(250,253,255,.96));
    box-shadow: var(--hairline), var(--shadow-float) !important;
  }

  .router-overview-framework .ik-v420-hero::before,
  .ik-v420-hero::before {
    inset: 12px auto 12px 0;
    width: 2px;
    background: linear-gradient(180deg, var(--blue-2), var(--blue));
  }

  .router-overview-framework .ik-v420-hero header,
  .ik-v420-hero header {
    gap: 3px;
    padding-left: 1px;
  }

  .router-overview-framework .ik-v420-hero header span,
  .ik-v420-hero header span {
    font-size: 11.5px;
    font-weight: 680;
    line-height: 1.14;
  }

  .router-overview-framework .ik-v420-hero h1,
  .ik-v420-hero h1 {
    font-size: 21.5px;
    font-weight: 780;
    letter-spacing: -.032em;
    line-height: 1.08;
    white-space: normal;
    overflow-wrap: anywhere;
  }

  .router-overview-framework .ik-v420-hero p,
  .ik-v420-hero p {
    font-size: 11.5px;
    line-height: 1.24;
  }

  .router-overview-framework .ik-v420-hero-stats,
  .ik-v420-hero-stats {
    margin-top: 11px;
    padding-top: 8px;
    border-top: .5px solid rgba(119,164,207,.24);
  }

  .router-overview-framework .ik-v420-hero-stats span,
  .ik-v420-hero-stats span {
    box-shadow: inset .5px 0 0 rgba(119,164,207,.22) !important;
  }

  .router-overview-framework .ik-v420-hero-stats em,
  .router-overview-framework .ik-v420-hero-stats small,
  .ik-v420-hero-stats em,
  .ik-v420-hero-stats small {
    font-size: 10px;
  }

  .router-overview-framework .ik-v420-hero-stats b,
  .ik-v420-hero-stats b {
    font-size: 14.5px;
    letter-spacing: -.025em;
    line-height: 1.12;
    white-space: normal;
    overflow-wrap: anywhere;
  }

  .router-overview-framework .ik-v420-hero-stats .is-primary b,
  .ik-v420-hero-stats .is-primary b {
    font-size: 22px;
  }

  .router-overview-framework .ik-v420-resource-row.is-danger strong,
  .ik-v420-resource-row.is-danger strong {
    color: #b63f44;
  }

  .router-overview-framework .ik-v420-visual,
  .ik-v420-visual {
    margin-top: 9px;
    min-height: 62px;
  }

  .router-overview-framework .ik-v420-line-chart,
  .ik-v420-line-chart {
    height: 62px;
  }

  .router-overview-framework .ik-v420-gridline,
  .ik-v420-gridline {
    stroke: rgba(142,181,216,.26);
    stroke-width: .55;
  }

  .router-overview-framework .ik-v420-area,
  .ik-v420-area {
    fill: rgba(20,125,255,.055);
  }

  .router-overview-framework .ik-v420-curve,
  .ik-v420-curve {
    stroke-width: 1.25;
  }

  .router-overview-framework .ik-v420-focus-dot,
  .ik-v420-focus-dot {
    stroke-width: 1.3;
  }

  .router-overview-framework .ik-v420-surface,
  .ik-v420-surface {
    gap: 8px;
  }

  .router-overview-framework .ik-v420-port-matrix,
  .ik-v420-port-matrix {
    gap: 4px;
  }

  .router-overview-framework .ik-v420-port-matrix span,
  .ik-v420-port-matrix span {
    border-radius: 11px;
    background: rgba(255,255,255,.48);
    box-shadow: inset 0 0 0 .5px rgba(119,164,207,.16) !important;
  }

  .router-overview-framework .ik-v420-port-matrix b,
  .ik-v420-port-matrix b {
    font-size: 9.5px;
  }

  .router-overview-framework .ik-v420-channel-rail,
  .ik-v420-channel-rail {
    gap: 5px;
  }

  .router-overview-framework .ik-v420-channel-rail span,
  .ik-v420-channel-rail span {
    min-width: 0;
    min-height: 44px;
    padding: 0 2px;
    box-shadow: inset 0 -.5px 0 rgba(20,125,255,.20) !important;
  }

  .router-overview-framework .ik-v420-channel-rail b,
  .ik-v420-channel-rail b {
    font-size: 10px;
    white-space: normal;
  }

  .router-overview-framework .ik-v420-channel-rail em,
  .ik-v420-channel-rail em {
    font-size: 11px;
    white-space: normal;
    overflow-wrap: anywhere;
  }

  .router-overview-framework .ik-v420-flow,
  .ik-v420-flow {
    grid-template-columns: minmax(0, 1fr) 12px minmax(0, 1fr) 12px minmax(0, 1fr);
    min-height: 56px;
  }

  .router-overview-framework .ik-v420-flow > i,
  .ik-v420-flow > i {
    height: .5px;
    background: rgba(20,125,255,.34);
  }

  .router-overview-framework .ik-v420-flow b,
  .ik-v420-flow b {
    font-size: 10.5px;
    white-space: normal;
    overflow-wrap: anywhere;
  }

  .router-overview-framework .ik-v420-flow em,
  .ik-v420-flow em {
    margin-top: 3px;
    font-size: 10px;
  }

  .router-overview-framework .ik-v420-resource-visual,
  .ik-v420-resource-visual {
    gap: 7px;
  }

  .router-overview-framework .ik-v420-resource-visual b,
  .ik-v420-resource-visual b {
    font-size: 10.5px;
    line-height: 1.08;
  }

  .router-overview-framework .ik-v420-resource-visual em,
  .ik-v420-resource-visual em {
    font-size: 12.5px;
    line-height: 1.08;
  }

  .router-overview-framework .ik-v420-resource-visual polyline,
  .ik-v420-resource-visual polyline {
    stroke-width: 1.25;
  }

  .router-overview-framework .ik-v420-cards,
  .router-overview-framework .ik-v420-status-cards,
  .ik-v420-cards,
  .ik-v420-status-cards {
    gap: 8px;
    margin: -14px 8px 0;
  }

  .router-overview-framework .ik-v420-card,
  .ik-v420-card {
    min-height: 76px;
    padding: 11px 12px;
    background: rgba(255,255,255,.72);
    box-shadow: var(--hairline), var(--shadow-soft) !important;
  }

  .router-overview-framework .ik-v420-card span,
  .ik-v420-card span {
    font-size: 11px;
    font-weight: 680;
  }

  .router-overview-framework .ik-v420-card strong,
  .ik-v420-card strong {
    font-size: 19px;
    font-weight: 780;
    letter-spacing: -.035em;
  }

  .router-overview-framework .ik-v420-card p,
  .ik-v420-card p {
    font-size: 10.5px;
  }

  .router-overview-framework .ik-v420-incident,
  .ik-v420-incident,
  .router-overview-framework .ik-v420-resource,
  .ik-v420-resource,
  .router-overview-framework .ik-v420-list,
  .ik-v420-list {
    background: rgba(255,255,255,.68);
    box-shadow: var(--hairline) !important;
  }

  .router-overview-framework .ik-v420-resource,
  .ik-v420-resource {
    padding: 11px 13px 12px;
  }

  .router-overview-framework .ik-v420-resource header,
  .ik-v420-resource header {
    margin-bottom: 8px;
  }

  .router-overview-framework .ik-v420-resource header b,
  .ik-v420-resource header b,
  .router-overview-framework .ik-v420-list header b,
  .ik-v420-list header b {
    font-size: 12.8px;
  }

  .router-overview-framework .ik-v420-resource header span,
  .ik-v420-resource header span,
  .router-overview-framework .ik-v420-list header span,
  .ik-v420-list header span {
    font-size: 11px;
  }

  .router-overview-framework .ik-v420-resource-row,
  .ik-v420-resource-row {
    grid-template-columns: 40px 52px minmax(0, 1fr) 50px;
    gap: 8px;
    min-height: 26px;
  }

  .router-overview-framework .ik-v420-resource-row b,
  .ik-v420-resource-row b {
    font-size: 11px;
  }

  .router-overview-framework .ik-v420-resource-row strong,
  .ik-v420-resource-row strong {
    font-size: 14px;
    letter-spacing: -.025em;
  }

  .router-overview-framework .ik-v420-resource-row em,
  .ik-v420-resource-row em {
    font-size: 10px;
  }
  .router-overview-framework .ik-v420-boundary-row,
  .ik-v420-boundary-row {
    grid-template-columns: 42px 60px minmax(0, 1fr);
    min-height: 28px;
  }
  .router-overview-framework .ik-v420-boundary-row b,
  .ik-v420-boundary-row b,
  .router-overview-framework .ik-v420-boundary-row em,
  .ik-v420-boundary-row em {
    font-size: 10.5px;
  }
  .router-overview-framework .ik-v420-boundary-row strong,
  .ik-v420-boundary-row strong {
    font-size: 13.5px;
  }

  .router-overview-framework .ik-v420-resource-line,
  .ik-v420-resource-line {
    height: 4px;
    background: rgba(176,204,231,.34);
  }

  .router-overview-framework .ik-v420-resource-row.is-danger .ik-v420-resource-line i,
  .ik-v420-resource-row.is-danger .ik-v420-resource-line i {
    background: linear-gradient(90deg, #1677ff 0%, #65b2ec 92%, #d84a4f 100%);
  }

  .router-overview-framework .ik-v420-list header,
  .ik-v420-list header {
    padding: 10px 13px 6px;
  }

  .router-overview-framework .ik-v420-list-row,
  .ik-v420-list-row {
    grid-template-columns: 24px minmax(0, 1fr) auto;
    gap: 9px;
    min-height: 44px;
    padding: 0 13px;
    box-shadow: inset 0 .5px 0 rgba(119,164,207,.18) !important;
  }

  .router-overview-framework .ik-v420-list-row > i,
  .ik-v420-list-row > i {
    width: 24px;
    height: 24px;
    background: linear-gradient(180deg, #e8f5ff, #f8fcff);
    box-shadow: inset 0 0 0 .5px rgba(20,125,255,.12) !important;
  }

  .router-overview-framework .ik-v420-list-row b,
  .ik-v420-list-row b {
    font-size: 12.5px;
    white-space: normal;
    overflow-wrap: anywhere;
  }

  .router-overview-framework .ik-v420-list-row em,
  .ik-v420-list-row em {
    font-size: 11px;
  }

  .router-overview-framework .ik-v420-list-row strong,
  .ik-v420-list-row strong {
    max-width: 112px;
    font-size: 12.5px;
  }

  .router-overview-framework .ik-v420-app-list u,
  .ik-v420-app-list u {
    display: block;
    overflow: hidden;
    width: 100%;
    height: 4px;
    border-radius: 999px;
    background: rgba(176,204,231,.34);
    text-decoration: none;
  }

  .router-overview-framework .ik-v420-app-list u i,
  .ik-v420-app-list u i {
    display: block;
    height: 100%;
    border-radius: inherit;
    background: linear-gradient(90deg, var(--blue), var(--blue-2));
    box-shadow: none !important;
  }

  .router-overview-framework .ik-v420-tabs,
  .ik-v420-tabs {
    left: 15px;
    right: 15px;
    bottom: max(9px, env(safe-area-inset-bottom, 0px));
    min-height: 56px;
    background: rgba(255,255,255,.84);
    box-shadow: 0 14px 34px rgba(37,99,161,.13), inset 0 0 0 .5px rgba(78,138,196,.22) !important;
    backdrop-filter: blur(22px) saturate(1.2);
    -webkit-backdrop-filter: blur(22px) saturate(1.2);
  }

  .router-overview-framework .ik-v420-tabs button,
  .ik-v420-tabs button {
    min-height: 44px;
    border-radius: 16px;
    color: #6e7f94;
    font-size: 10px;
    font-weight: 680;
    line-height: 1.05;
    white-space: normal;
  }

  .router-overview-framework .ik-v420-tabs button.is-active,
  .ik-v420-tabs button.is-active {
    background: linear-gradient(180deg, rgba(225,244,255,.88), rgba(247,252,255,.82));
    color: var(--blue);
    box-shadow: inset 0 0 0 .5px rgba(20,125,255,.16) !important;
  }
}

@media (max-width: 380px) {
  .router-overview-framework .ik-v420-screen,
  .ik-v420-screen { padding-inline: 13px; }
  .router-overview-framework .ik-v420-hero h1,
  .ik-v420-hero h1 { font-size: 20px; }
  .router-overview-framework .ik-v420-hero-stats,
  .ik-v420-hero-stats { gap: 7px; }
  .router-overview-framework .ik-v420-hero-stats b,
  .ik-v420-hero-stats b { font-size: 12.8px; }
  .router-overview-framework .ik-v420-hero-stats .is-primary b,
  .ik-v420-hero-stats .is-primary b { font-size: 20px; }
  .router-overview-framework .ik-v420-resource-row,
  .ik-v420-resource-row { grid-template-columns: 36px 46px minmax(0, 1fr) 46px; gap: 7px; }
}

@media (max-width: 760px) {
  .router-overview-framework .ik-v420-surface,
  .ik-v420-surface {
    overflow: hidden;
    gap: 0;
    margin-top: 9px;
    border-radius: 22px;
    background: rgba(255,255,255,.72);
    box-shadow: var(--hairline) !important;
  }

  .router-overview-framework .ik-v420-cards,
  .router-overview-framework .ik-v420-status-cards,
  .ik-v420-cards,
  .ik-v420-status-cards {
    margin: 0;
    padding: 8px;
    gap: 0;
    background: rgba(251,253,255,.48);
    box-shadow: inset 0 -0.5px 0 rgba(119,164,207,.18) !important;
  }

  .router-overview-framework .ik-v420-card,
  .ik-v420-card {
    min-height: 70px;
    border-radius: 17px;
    background: transparent;
    box-shadow: none !important;
  }

  .router-overview-framework .ik-v420-card + .ik-v420-card,
  .ik-v420-card + .ik-v420-card {
    box-shadow: inset .5px 0 0 rgba(119,164,207,.18) !important;
  }

  .router-overview-framework .ik-v420-card strong,
  .ik-v420-card strong {
    margin-top: 7px;
  }

  .router-overview-framework .ik-v420-incident,
  .ik-v420-incident,
  .router-overview-framework .ik-v420-resource,
  .ik-v420-resource,
  .router-overview-framework .ik-v420-list,
  .ik-v420-list {
    border-radius: 0;
    background: transparent;
    box-shadow: none !important;
  }

  .router-overview-framework .ik-v420-resource,
  .ik-v420-resource,
  .router-overview-framework .ik-v420-list,
  .ik-v420-list {
    box-shadow: inset 0 .5px 0 rgba(119,164,207,.18) !important;
  }

  .router-overview-framework .ik-v420-list-row:last-child,
  .ik-v420-list-row:last-child {
    padding-bottom: 2px;
  }
}

@media (max-width: 760px) {
  .router-overview-framework .ik-v420-hero-stats,
  .ik-v420-hero-stats {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 0;
    align-items: stretch;
    margin-top: 10px;
    padding-top: 8px;
    border-top: .5px solid rgba(119,164,207,.24);
  }

  .router-overview-framework .ik-v420-hero-stats span,
  .ik-v420-hero-stats span {
    min-width: 0;
    padding: 0 7px;
    border-radius: 0;
    background: transparent;
    box-shadow: none !important;
  }

  .router-overview-framework .ik-v420-hero-stats span + span,
  .ik-v420-hero-stats span + span {
    box-shadow: inset .5px 0 0 rgba(119,164,207,.22) !important;
  }

  .router-overview-framework .ik-v420-hero-stats em,
  .router-overview-framework .ik-v420-hero-stats small,
  .ik-v420-hero-stats em,
  .ik-v420-hero-stats small {
    font-size: 9.6px;
    line-height: 1.08;
    white-space: nowrap;
  }

  .router-overview-framework .ik-v420-hero-stats b,
  .ik-v420-hero-stats b,
  .router-overview-framework .ik-v420-hero-stats .is-primary b,
  .ik-v420-hero-stats .is-primary b {
    margin-top: 2px;
    font-size: 13.2px;
    line-height: 1.06;
    letter-spacing: -.025em;
    white-space: normal;
    overflow-wrap: anywhere;
  }
}

@media (max-width: 760px) {
  .router-overview-framework .ik-v420-app,
  .ik-v420-app {
    --blue: #126fd1;
    --blue-2: #65b2ec;
    --ink: #111827;
    --muted: #5d6d80;
    --quiet: #8a9aac;
    --line: rgba(167, 192, 216, .34);
    --panel: rgba(255, 255, 255, .92);
    background:
      radial-gradient(circle at 50% -138px, rgba(18,111,209,.20), transparent 302px),
      linear-gradient(180deg, #fbfdff 0%, #f3f8fd 48%, #f7fbff 100%);
  }

  .router-overview-framework .ik-v420-screen,
  .ik-v420-screen {
    padding: max(8px, env(safe-area-inset-top, 0px)) 15px 90px;
  }

  .router-overview-framework .ik-v420-nav,
  .ik-v420-nav {
    min-height: 52px;
    grid-template-columns: 40px minmax(0, 1fr) auto;
  }

  .router-overview-framework .ik-v420-nav button,
  .ik-v420-nav button {
    background: transparent;
    box-shadow: none !important;
  }

  .router-overview-framework .ik-v420-nav div b,
  .ik-v420-nav div b {
    color: var(--ink);
    font-size: 17px;
    line-height: 1.12;
    white-space: normal;
    overflow: visible;
    text-overflow: clip;
  }

  .router-overview-framework .ik-v420-nav div span,
  .ik-v420-nav div span {
    color: var(--muted);
    font-size: 11px;
    line-height: 1.2;
    white-space: normal;
    overflow: visible;
    text-overflow: clip;
  }

  .router-overview-framework .ik-v420-nav strong,
  .ik-v420-nav strong {
    min-height: 28px;
    border-radius: 999px;
    background: rgba(255,255,255,.68);
    color: var(--blue);
    box-shadow: inset 0 0 0 .5px rgba(151, 184, 216, .58) !important;
  }

  .router-overview-framework .ik-v420-hero,
  .ik-v420-hero {
    min-height: 252px;
    padding: 18px 17px 16px;
    border-radius: 24px;
    background:
      radial-gradient(circle at 82% 4%, rgba(18,111,209,.13), transparent 34%),
      linear-gradient(155deg, rgba(255,255,255,.99), rgba(240,248,255,.96) 58%, rgba(253,254,255,.99));
    box-shadow: 0 20px 42px rgba(33, 79, 126, .105), inset 0 0 0 .5px rgba(184, 211, 235, .94) !important;
  }

  .router-overview-framework .ik-v420-hero header,
  .ik-v420-hero header {
    gap: 6px;
    padding-right: 2px;
  }

  .router-overview-framework .ik-v420-hero header span,
  .ik-v420-hero header span {
    color: var(--muted);
    font-size: 11px;
    letter-spacing: .02em;
  }

  .router-overview-framework .ik-v420-hero h1,
  .ik-v420-hero h1 {
    color: var(--ink);
    font-size: 27px;
    line-height: 1.03;
    white-space: normal;
    overflow: visible;
    text-overflow: clip;
  }

  .router-overview-framework .ik-v420-hero p,
  .ik-v420-hero p {
    color: var(--muted);
    font-size: 11.5px;
    line-height: 1.3;
    white-space: normal;
    overflow: visible;
    text-overflow: clip;
  }

  .router-overview-framework .ik-v420-hero-stats,
  .ik-v420-hero-stats {
    margin-top: 13px;
    padding-top: 10px;
    border-top-color: var(--line);
  }

  .router-overview-framework .ik-v420-hero-stats span,
  .ik-v420-hero-stats span {
    padding: 0 8px;
  }

  .router-overview-framework .ik-v420-hero-stats span:first-child,
  .ik-v420-hero-stats span:first-child {
    padding-left: 0;
  }

  .router-overview-framework .ik-v420-hero-stats span:last-child,
  .ik-v420-hero-stats span:last-child {
    padding-right: 0;
  }

  .router-overview-framework .ik-v420-hero-stats em,
  .router-overview-framework .ik-v420-hero-stats small,
  .ik-v420-hero-stats em,
  .ik-v420-hero-stats small {
    color: var(--muted);
    white-space: normal;
    overflow: visible;
    text-overflow: clip;
  }

  .router-overview-framework .ik-v420-hero-stats b,
  .ik-v420-hero-stats b,
  .router-overview-framework .ik-v420-hero-stats .is-primary b,
  .ik-v420-hero-stats .is-primary b {
    color: var(--ink);
    font-size: 14px;
    line-height: 1.05;
    white-space: normal;
    overflow: visible;
    text-overflow: clip;
  }

  .router-overview-framework .ik-v420-visual,
  .ik-v420-visual {
    margin-top: 13px;
    min-height: 82px;
  }

  .router-overview-framework .ik-v420-line-chart,
  .ik-v420-line-chart {
    height: 88px;
  }

  .router-overview-framework .ik-v420-line-chart text,
  .ik-v420-line-chart text {
    fill: var(--quiet);
    font-size: 9.5px;
    font-weight: 650;
  }

  .router-overview-framework .ik-v420-peak-dot,
  .ik-v420-peak-dot {
    fill: #ffffff;
    stroke: var(--blue);
    stroke-width: 1.4;
  }

  .router-overview-framework .ik-v420-surface,
  .ik-v420-surface {
    margin-top: -14px;
    gap: 11px;
    z-index: 3;
  }

  .router-overview-framework .ik-v420-duo,
  .ik-v420-duo {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
    margin: 0 9px;
  }

  .router-overview-framework .ik-v420-duo-card,
  .ik-v420-duo-card {
    min-height: 86px;
    padding: 12px 12px 11px;
    border-radius: 18px;
    background: rgba(255,255,255,.94);
    box-shadow: 0 12px 24px rgba(44,93,142,.065), inset 0 0 0 .5px rgba(204,224,242,.96) !important;
  }

  .router-overview-framework .ik-v420-duo-card header,
  .ik-v420-duo-card header {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: var(--muted);
    font-size: 11.5px;
    font-weight: 730;
  }

  .router-overview-framework .ik-v420-duo-card i,
  .ik-v420-duo-card i {
    width: 7px;
    height: 7px;
    border-radius: 99px;
    background: var(--green);
  }

  .router-overview-framework .ik-v420-duo-card strong,
  .ik-v420-duo-card strong {
    display: block;
    margin-top: 8px;
    color: var(--ink);
    font-size: 22px;
    font-weight: 820;
    letter-spacing: -.045em;
    line-height: 1.05;
    white-space: normal;
    overflow: visible;
    text-overflow: clip;
  }

  .router-overview-framework .ik-v420-duo-card p,
  .ik-v420-duo-card p {
    margin: 4px 0 0;
    color: var(--quiet);
    font-size: 11px;
    line-height: 1.22;
    white-space: normal;
    overflow: visible;
    text-overflow: clip;
  }

  .router-overview-framework .ik-v420-app .ik-v420-duo-card.is-warn i,
  .router-overview-framework .ik-v420-app .ik-v420-duo-card.is-missing i,
  .ik-v420-app .ik-v420-duo-card.is-warn i,
  .ik-v420-app .ik-v420-duo-card.is-missing i { background: var(--warn); }

  .router-overview-framework .ik-v420-app .ik-v420-duo-card.is-danger i,
  .ik-v420-app .ik-v420-duo-card.is-danger i { background: var(--red); }

  .router-overview-framework .ik-v420-resource,
  .ik-v420-resource {
    padding: 14px 14px;
    border-radius: 20px;
    background: var(--panel);
    box-shadow: inset 0 0 0 .5px rgba(204,224,242,.96) !important;
  }

  .router-overview-framework .ik-v420-resource.is-hot,
  .ik-v420-resource.is-hot {
    padding: 15px 15px 14px;
    box-shadow: 0 14px 30px rgba(130, 55, 40, .06), inset 0 0 0 .5px rgba(224, 176, 166, .72) !important;
  }

  .router-overview-framework .ik-v420-resource-row,
  .ik-v420-resource-row {
    grid-template-columns: 44px 62px minmax(0, 1fr) 58px;
    min-height: 34px;
  }

  .router-overview-framework .ik-v420-resource.is-hot .ik-v420-resource-row,
  .ik-v420-resource.is-hot .ik-v420-resource-row {
    grid-template-columns: 48px 72px minmax(0, 1fr) 58px;
    min-height: 40px;
  }

  .router-overview-framework .ik-v420-resource.is-hot .ik-v420-resource-row strong,
  .ik-v420-resource.is-hot .ik-v420-resource-row strong {
    font-size: 21px;
  }

  .router-overview-framework .ik-v420-resource-line,
  .ik-v420-resource-line {
    height: 6px;
  }

  .router-overview-framework .ik-v420-incident,
  .ik-v420-incident {
    margin-inline: 2px;
    border-radius: 16px;
    background: rgba(255,255,255,.76);
    box-shadow: inset 3px 0 0 rgba(18,111,209,.28), inset 0 0 0 .5px rgba(204,224,242,.8) !important;
  }

  .router-overview-framework .ik-v420-list,
  .ik-v420-list {
    border-radius: 20px;
    background: var(--panel);
    box-shadow: inset 0 0 0 .5px rgba(204,224,242,.96) !important;
  }

  .router-overview-framework .ik-v420-list-row b,
  .router-overview-framework .ik-v420-list-row em,
  .router-overview-framework .ik-v420-list-row strong,
  .ik-v420-list-row b,
  .ik-v420-list-row em,
  .ik-v420-list-row strong {
    white-space: normal;
    overflow: visible;
    text-overflow: clip;
  }

  .router-overview-framework .ik-v420-tabs,
  .ik-v420-tabs {
    left: 18px;
    right: 18px;
    min-height: 58px !important;
    padding: 4px 6px !important;
    border-radius: 18px !important;
    background: rgba(248,251,255,.93);
    box-shadow: 0 12px 26px rgba(37, 84, 130, .11), inset 0 1px 0 rgba(255,255,255,.92), inset 0 0 0 .5px rgba(181, 207, 230, .82) !important;
    backdrop-filter: blur(20px) saturate(1.18);
  }

  .router-overview-framework .ik-v420-tabs::before,
  .ik-v420-tabs::before {
    content: "";
    position: absolute;
    left: 24px;
    right: 24px;
    top: 6px;
    height: .5px;
    border-radius: 999px;
    background: linear-gradient(90deg, transparent, rgba(18,111,209,.38), transparent);
    pointer-events: none;
  }

  .router-overview-framework .ik-v420-tabs button,
  .ik-v420-tabs button {
    position: relative;
    min-height: 48px !important;
    border-radius: 12px !important;
    appearance: none;
    -webkit-appearance: none;
    background: transparent !important;
    background-color: transparent !important;
    background-image: none !important;
    color: #6d7e92;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: -.01em;
    box-shadow: none !important;
  }

  .router-overview-framework .ik-v420-tabs button::before,
  .ik-v420-tabs button::before {
    content: "";
    position: absolute;
    top: 2px;
    width: 18px;
    height: 2px;
    border-radius: 999px;
    background: transparent;
  }

  .router-overview-framework .ik-v420-tabs svg,
  .ik-v420-tabs svg {
    width: 19px;
    height: 19px;
    stroke-width: 1.9;
  }

  .router-overview-framework .ik-v420-tabs button.is-active,
  .ik-v420-tabs button.is-active {
    background: transparent !important;
    background-color: transparent !important;
    background-image: none !important;
    color: var(--blue);
    font-weight: 780;
    box-shadow: none !important;
  }

  .router-overview-framework .ik-v420-tabs button.is-active::before,
  .ik-v420-tabs button.is-active::before {
    background: linear-gradient(90deg, var(--blue), var(--blue-2));
    box-shadow: 0 0 0 3px rgba(18,111,209,.08) !important;
  }

  .router-overview-framework [data-overview-mobile-console] .ik-v420-tabs,
  [data-overview-mobile-console] .ik-v420-tabs {
    min-height: 58px !important;
    padding: 4px 6px !important;
    border-radius: 18px !important;
    background: rgba(248,251,255,.93) !important;
  }

  .router-overview-framework .ik-v420-timeline,
  .ik-v420-timeline {
    display: grid;
    gap: 0;
    margin: 0;
    padding: 12px 14px;
    border-radius: 20px;
    background: rgba(255,255,255,.94);
    box-shadow: inset 0 0 0 .5px rgba(204,224,242,.96) !important;
  }

  .router-overview-framework .ik-v420-timeline header,
  .ik-v420-timeline header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    margin-bottom: 5px;
  }

  .router-overview-framework .ik-v420-timeline header b,
  .ik-v420-timeline header b {
    color: var(--ink);
    font-size: 14px;
    font-weight: 820;
  }

  .router-overview-framework .ik-v420-timeline header span,
  .ik-v420-timeline header span {
    color: var(--muted);
    font-size: 11px;
    font-weight: 680;
  }

  .router-overview-framework .ik-v420-timeline-row,
  .ik-v420-timeline-row {
    display: grid;
    grid-template-columns: 12px minmax(0, 1fr) minmax(74px, auto);
    gap: 9px;
    align-items: center;
    min-height: 42px;
    padding: 6px 0;
    border-top: .5px solid rgba(119,164,207,.18);
  }

  .router-overview-framework .ik-v420-timeline-row > i,
  .ik-v420-timeline-row > i {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--green);
    box-shadow: 0 0 0 4px rgba(38,133,81,.08) !important;
  }

  .router-overview-framework .ik-v420-timeline-row.is-danger > i,
  .ik-v420-timeline-row.is-danger > i { background: var(--red); box-shadow: 0 0 0 4px rgba(216,74,79,.08) !important; }
  .router-overview-framework .ik-v420-timeline-row.is-warn > i,
  .ik-v420-timeline-row.is-warn > i,
  .router-overview-framework .ik-v420-timeline-row.is-missing > i,
  .ik-v420-timeline-row.is-missing > i { background: var(--warn); box-shadow: 0 0 0 4px rgba(183,106,29,.09) !important; }

  .router-overview-framework .ik-v420-timeline-row b,
  .ik-v420-timeline-row b {
    display: block;
    color: var(--ink);
    font-size: 12.5px;
    font-weight: 780;
    line-height: 1.18;
  }

  .router-overview-framework .ik-v420-timeline-row em,
  .ik-v420-timeline-row em {
    display: block;
    margin-top: 2px;
    color: var(--quiet);
    font-size: 10.8px;
    font-style: normal;
    line-height: 1.22;
    white-space: normal;
  }

  .router-overview-framework .ik-v420-timeline-row strong,
  .ik-v420-timeline-row strong {
    color: var(--ink);
    font-size: 12px;
    font-weight: 820;
    line-height: 1.14;
    text-align: right;
    white-space: normal;
  }

  .router-overview-framework .ik-v420-interface-list,
  .ik-v420-interface-list {
    display: grid;
    gap: 7px;
  }

  .router-overview-framework .ik-v420-interface-list span,
  .ik-v420-interface-list span {
    display: grid;
    grid-template-columns: 8px minmax(0, 1fr);
    grid-template-areas: "dot name" "dot note";
    gap: 2px 8px;
    min-height: 32px;
    align-items: center;
    padding: 7px 9px;
    border-radius: 13px;
    background: rgba(255,255,255,.74);
    box-shadow: inset 0 0 0 .5px rgba(224,176,166,.78) !important;
  }

  .router-overview-framework .ik-v420-interface-list span > i,
  .ik-v420-interface-list span > i {
    grid-area: dot;
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--red);
  }

  .router-overview-framework .ik-v420-interface-list b,
  .ik-v420-interface-list b { grid-area: name; color: var(--ink); font-size: 12.5px; line-height: 1.1; }
  .router-overview-framework .ik-v420-interface-list em,
  .ik-v420-interface-list em { grid-area: note; color: var(--quiet); font-size: 10.5px; font-style: normal; line-height: 1.15; }
  .router-overview-framework .ik-v420-interface-list strong,
  .ik-v420-interface-list strong { color: var(--muted); font-size: 11px; font-weight: 720; text-align: right; }

  .router-overview-framework .ik-v420-resource-visual span,
  .ik-v420-resource-visual span {
    min-height: 46px;
  }

  .router-overview-framework .ik-v420-resource-visual span > i,
  .ik-v420-resource-visual span > i {
    display: block;
    height: 5px;
    overflow: hidden;
    border-radius: 999px;
    background: rgba(176,204,231,.42);
  }

  .router-overview-framework .ik-v420-resource-visual span > i > i,
  .ik-v420-resource-visual span > i > i {
    display: block;
    height: 100%;
    border-radius: inherit;
    background: linear-gradient(90deg, var(--blue), var(--blue-2));
  }

  .router-overview-framework .ik-v420-resource-visual span.is-danger > i > i,
  .ik-v420-resource-visual span.is-danger > i > i {
    background: linear-gradient(90deg, var(--blue) 0%, var(--blue-2) 92%, var(--red) 100%);
  }

  .router-overview-framework .ik-v420-surface,
  .ik-v420-surface {
    background: transparent !important;
    box-shadow: none !important;
    border: 0 !important;
    border-radius: 0 !important;
  }

  .router-overview-framework .ik-v420-screen,
  .ik-v420-screen {
    padding-bottom: calc(104px + env(safe-area-inset-bottom, 0px)) !important;
  }

  .router-overview-framework .ik-v420-hero,
  .ik-v420-hero,
  .router-overview-framework .ik-v420-timeline,
  .ik-v420-timeline,
  .router-overview-framework .ik-v420-list,
  .ik-v420-list,
  .router-overview-framework .ik-v420-tabs,
  .ik-v420-tabs {
    border: 0 !important;
    box-shadow: none !important;
  }

  .router-overview-framework .ik-v420-hero,
  .ik-v420-hero {
    min-height: 216px !important;
    outline: 1px solid rgba(184,211,235,.82);
    outline-offset: -1px;
  }

  .router-overview-framework .ik-v420-timeline,
  .ik-v420-timeline,
  .router-overview-framework .ik-v420-list,
  .ik-v420-list {
    outline: 1px solid rgba(204,224,242,.82);
    outline-offset: -1px;
  }

  .router-overview-framework .ik-v420-timeline-row,
  .ik-v420-timeline-row {
    min-height: 38px !important;
    padding: 5px 0 !important;
    box-shadow: none !important;
  }

  .router-overview-framework .ik-v420-list-row,
  .ik-v420-list-row,
  .router-overview-framework .ik-v420-incident,
  .ik-v420-incident,
  .router-overview-framework .ik-v420-channel-rail span,
  .ik-v420-channel-rail span,
  .router-overview-framework .ik-v420-port-matrix span,
  .ik-v420-port-matrix span,
  .router-overview-framework .ik-v420-interface-list span,
  .ik-v420-interface-list span {
    box-shadow: none !important;
  }

  .router-overview-framework .ik-v420-tabs,
  .ik-v420-tabs {
    border-radius: 20px !important;
    outline: 1px solid rgba(181,207,230,.78);
    outline-offset: -1px;
  }

  .router-overview-framework .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger,
  .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger {
    display: grid !important;
    grid-template-columns: 1fr !important;
    gap: 8px !important;
    min-height: 74px !important;
  }

  .router-overview-framework .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger .ik-mobile-resource-spark.ik-v420-resource-meter,
  .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger .ik-mobile-resource-spark.ik-v420-resource-meter {
    display: grid !important;
    grid-template-columns: 48px 54px minmax(0, 1fr) !important;
    align-items: center !important;
    gap: 8px !important;
    min-height: 22px !important;
    padding: 0 !important;
    border: 0 !important;
    border-radius: 0 !important;
    background: transparent !important;
    box-shadow: none !important;
  }

  .router-overview-framework .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger .ik-mobile-resource-spark.ik-v420-resource-meter::before,
  .router-overview-framework .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger .ik-mobile-resource-spark.ik-v420-resource-meter::after,
  .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger .ik-mobile-resource-spark.ik-v420-resource-meter::before,
  .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger .ik-mobile-resource-spark.ik-v420-resource-meter::after {
    display: none !important;
  }

  .router-overview-framework .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger .ik-mobile-resource-spark.ik-v420-resource-meter b,
  .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger .ik-mobile-resource-spark.ik-v420-resource-meter b {
    font-size: 11.2px !important;
    line-height: 1 !important;
    font-weight: 760 !important;
    color: #5d6d80 !important;
    white-space: nowrap !important;
  }

  .router-overview-framework .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger .ik-mobile-resource-spark.ik-v420-resource-meter em,
  .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger .ik-mobile-resource-spark.ik-v420-resource-meter em {
    font-size: 13px !important;
    line-height: 1 !important;
    font-style: normal !important;
    font-weight: 820 !important;
    color: #111827 !important;
    white-space: nowrap !important;
  }

  .router-overview-framework .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger .ik-mobile-resource-spark.ik-v420-resource-meter.is-danger em,
  .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger .ik-mobile-resource-spark.ik-v420-resource-meter.is-danger em {
    color: #d93025 !important;
  }

  .router-overview-framework .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger .ik-mobile-resource-spark.ik-v420-resource-meter > i,
  .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger .ik-mobile-resource-spark.ik-v420-resource-meter > i {
    display: block !important;
    height: 5px !important;
    overflow: hidden !important;
    border-radius: 999px !important;
    background: rgba(176,204,231,.42) !important;
  }

  .router-overview-framework .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger .ik-mobile-resource-spark.ik-v420-resource-meter > i > i,
  .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger .ik-mobile-resource-spark.ik-v420-resource-meter > i > i {
    display: block !important;
    height: 100% !important;
    border-radius: inherit !important;
    background: linear-gradient(90deg, #1677ff, #65b2ec) !important;
  }

  .router-overview-framework .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger .ik-mobile-resource-spark.ik-v420-resource-meter.is-danger > i > i,
  .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger .ik-mobile-resource-spark.ik-v420-resource-meter.is-danger > i > i {
    background: linear-gradient(90deg, #1677ff 0%, #65b2ec 92%, #d93025 100%) !important;
  }

  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v420-hero,
  [data-overview-mobile-scene="resource-full"] .ik-v420-hero {
    min-height: 318px !important;
    overflow: visible !important;
    padding-bottom: 22px !important;
  }

  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v420-visual,
  [data-overview-mobile-scene="resource-full"] .ik-v420-visual {
    min-height: 104px !important;
    margin-top: 14px !important;
  }

  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v420-surface,
  [data-overview-mobile-scene="resource-full"] .ik-v420-surface {
    margin-top: 12px !important;
  }

  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger,
  [data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger {
    gap: 10px !important;
    min-height: 108px !important;
  }

  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger .ik-mobile-resource-spark.ik-v420-resource-meter,
  [data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger .ik-mobile-resource-spark.ik-v420-resource-meter {
    grid-template-columns: 58px minmax(0, 1fr) 58px !important;
    min-height: 24px !important;
  }

  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger .ik-mobile-resource-spark.ik-v420-resource-meter b,
  [data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger .ik-mobile-resource-spark.ik-v420-resource-meter b {
    grid-column: 1 !important;
    grid-row: 1 !important;
    position: static !important;
    transform: none !important;
    text-align: left !important;
  }

  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger .ik-mobile-resource-spark.ik-v420-resource-meter > i,
  [data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger .ik-mobile-resource-spark.ik-v420-resource-meter > i {
    grid-column: 2 !important;
    grid-row: 1 !important;
    position: static !important;
    transform: none !important;
    width: 100% !important;
  }

  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger .ik-mobile-resource-spark.ik-v420-resource-meter em,
  [data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger .ik-mobile-resource-spark.ik-v420-resource-meter em {
    grid-column: 3 !important;
    grid-row: 1 !important;
    position: static !important;
    transform: none !important;
    margin: 0 !important;
    text-align: right !important;
  }

  .router-overview-framework .ik-v420-incident,
  .ik-v420-incident {
    grid-template-columns: 12px minmax(0, 1fr) auto !important;
    min-height: 46px !important;
    padding: 9px 12px !important;
  }

  .router-overview-framework .ik-v420-incident > i,
  .ik-v420-incident > i {
    width: 8px !important;
    height: 8px !important;
    box-shadow: 0 0 0 4px rgba(216,74,79,.08) !important;
  }

  /* v620 mobile product reset: native router app home, not a shrunken desktop. */
  #overview.router-overview-framework .ik-v420-app,
  .router-overview-framework .ik-v420-app,
  .ik-v420-app {
    --blue: #1473e6;
    --blue-2: #5ca8ff;
    --ink: #101828;
    --muted: #536579;
    --quiet: #8492a6;
    --line: rgba(164, 191, 216, .42);
    --soft: #f4f8fc;
    --red: #d83b31;
    --warn: #d27b22;
    background:
      radial-gradient(circle at 50% -140px, rgba(20,115,230,.18), transparent 300px),
      linear-gradient(180deg, #f8fbff 0%, #eef6fd 44%, #f6f9fd 100%) !important;
  }

  #overview.router-overview-framework .ik-v420-screen,
  .router-overview-framework .ik-v420-screen,
  .ik-v420-screen {
    gap: 12px !important;
    padding: max(10px, env(safe-area-inset-top, 0px)) 14px calc(100px + env(safe-area-inset-bottom, 0px)) !important;
  }

  #overview.router-overview-framework .ik-v420-nav,
  .router-overview-framework .ik-v420-nav,
  .ik-v420-nav {
    height: 48px !important;
    margin: 0 0 2px !important;
    padding: 0 2px !important;
    grid-template-columns: 38px minmax(0, 1fr) auto !important;
    background: transparent !important;
    border: 0 !important;
    box-shadow: none !important;
  }

  #overview.router-overview-framework .ik-v420-nav button,
  .router-overview-framework .ik-v420-nav button,
  .ik-v420-nav button {
    width: 34px !important;
    height: 34px !important;
    border-radius: 12px !important;
    color: #35617f !important;
    background: rgba(255,255,255,.72) !important;
    box-shadow: inset 0 0 0 .5px rgba(148,178,205,.45) !important;
  }

  #overview.router-overview-framework .ik-v240-title b,
  .router-overview-framework .ik-v240-title b,
  .ik-v240-title b {
    font-size: 15px !important;
    line-height: 1.08 !important;
    letter-spacing: -.18px !important;
  }

  #overview.router-overview-framework .ik-v240-title span,
  .router-overview-framework .ik-v240-title span,
  .ik-v240-title span {
    margin-top: 3px !important;
    font-size: 11px !important;
    line-height: 1.1 !important;
    color: #7b8ca1 !important;
  }

  #overview.router-overview-framework .ik-v240-status,
  .router-overview-framework .ik-v240-status,
  .ik-v240-status {
    height: 26px !important;
    padding: 0 9px !important;
    border-radius: 999px !important;
    font-size: 11px !important;
    font-weight: 760 !important;
    background: rgba(255,255,255,.76) !important;
    box-shadow: inset 0 0 0 .5px rgba(148,178,205,.55) !important;
  }

  #overview.router-overview-framework .ik-v420-hero,
  .router-overview-framework .ik-v420-hero,
  .ik-v420-hero {
    position: relative !important;
    display: grid !important;
    grid-template-rows: auto auto auto !important;
    gap: 13px !important;
    min-height: 286px !important;
    margin: 0 !important;
    padding: 18px 17px 15px !important;
    overflow: hidden !important;
    border-radius: 26px !important;
    outline: 0 !important;
    border: 0 !important;
    background:
      radial-gradient(circle at 84% 18%, rgba(20,115,230,.16), transparent 128px),
      linear-gradient(180deg, rgba(255,255,255,.98), rgba(246,251,255,.96)) !important;
    box-shadow:
      0 18px 38px rgba(43, 92, 135, .12),
      inset 0 0 0 .5px rgba(154, 188, 220, .58) !important;
  }

  #overview.router-overview-framework .ik-v420-hero.is-danger,
  .router-overview-framework .ik-v420-hero.is-danger,
  .ik-v420-hero.is-danger,
  #overview.router-overview-framework .ik-v420-hero.is-missing,
  .router-overview-framework .ik-v420-hero.is-missing,
  .ik-v420-hero.is-missing {
    background:
      radial-gradient(circle at 84% 18%, rgba(216,59,49,.13), transparent 118px),
      radial-gradient(circle at 20% 0%, rgba(20,115,230,.12), transparent 180px),
      linear-gradient(180deg, #fffefe, #f8fbff) !important;
  }

  #overview.router-overview-framework .ik-v420-hero::before,
  .router-overview-framework .ik-v420-hero::before,
  .ik-v420-hero::before {
    width: 3px !important;
    height: 62px !important;
    top: 20px !important;
    left: 0 !important;
    border-radius: 0 99px 99px 0 !important;
    opacity: .95 !important;
    background: var(--blue) !important;
  }

  #overview.router-overview-framework .ik-v620-hero-head,
  .router-overview-framework .ik-v620-hero-head,
  .ik-v620-hero-head {
    display: grid !important;
    gap: 5px !important;
    padding-left: 2px !important;
  }

  #overview.router-overview-framework .ik-v620-hero-head span,
  .router-overview-framework .ik-v620-hero-head span,
  .ik-v620-hero-head span {
    color: #5d7188 !important;
    font-size: 12px !important;
    font-weight: 720 !important;
    letter-spacing: .02em !important;
  }

  #overview.router-overview-framework .ik-v620-hero-head h1,
  .router-overview-framework .ik-v620-hero-head h1,
  .ik-v620-hero-head h1 {
    max-width: 100% !important;
    color: #101828 !important;
    font-size: clamp(26px, 7.2vw, 32px) !important;
    line-height: .98 !important;
    font-weight: 820 !important;
    letter-spacing: -.82px !important;
  }

  #overview.router-overview-framework .ik-v620-hero-head p,
  .router-overview-framework .ik-v620-hero-head p,
  .ik-v620-hero-head p {
    max-width: 31ch !important;
    margin: 0 !important;
    color: #617187 !important;
    font-size: 12.5px !important;
    line-height: 1.28 !important;
    font-weight: 520 !important;
  }

  #overview.router-overview-framework .ik-v620-hero-stage,
  .router-overview-framework .ik-v620-hero-stage,
  .ik-v620-hero-stage {
    display: grid !important;
    gap: 12px !important;
  }

  #overview.router-overview-framework .ik-v420-hero-stats,
  .router-overview-framework .ik-v420-hero-stats,
  .ik-v420-hero-stats {
    display: grid !important;
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    gap: 0 !important;
    margin: 0 !important;
    padding: 0 !important;
    background: transparent !important;
    border: 0 !important;
    box-shadow: none !important;
  }

  #overview.router-overview-framework .ik-v420-hero-stats span,
  .router-overview-framework .ik-v420-hero-stats span,
  .ik-v420-hero-stats span {
    min-width: 0 !important;
    min-height: 0 !important;
    padding: 0 12px 0 0 !important;
    border: 0 !important;
    border-radius: 0 !important;
    background: transparent !important;
    box-shadow: none !important;
  }

  #overview.router-overview-framework .ik-v420-hero-stats span + span,
  .router-overview-framework .ik-v420-hero-stats span + span,
  .ik-v420-hero-stats span + span {
    padding: 0 0 0 14px !important;
    border-left: .5px solid rgba(150,179,206,.56) !important;
  }

  #overview.router-overview-framework .ik-v420-hero-stats em,
  .router-overview-framework .ik-v420-hero-stats em,
  .ik-v420-hero-stats em {
    color: #77879a !important;
    font-size: 11px !important;
    line-height: 1.1 !important;
    font-style: normal !important;
    font-weight: 680 !important;
  }

  #overview.router-overview-framework .ik-v420-hero-stats b,
  .router-overview-framework .ik-v420-hero-stats b,
  .ik-v420-hero-stats b,
  #overview.router-overview-framework .ik-v420-hero-stats .is-primary b,
  .router-overview-framework .ik-v420-hero-stats .is-primary b,
  .ik-v420-hero-stats .is-primary b {
    margin-top: 3px !important;
    color: #101828 !important;
    font-size: clamp(26px, 7.8vw, 35px) !important;
    line-height: .94 !important;
    font-weight: 820 !important;
    letter-spacing: -.78px !important;
  }

  #overview.router-overview-framework .ik-v420-hero-stats .is-danger b,
  .router-overview-framework .ik-v420-hero-stats .is-danger b,
  .ik-v420-hero-stats .is-danger b {
    color: var(--red) !important;
  }

  #overview.router-overview-framework .ik-v420-hero-stats small,
  .router-overview-framework .ik-v420-hero-stats small,
  .ik-v420-hero-stats small {
    margin-top: 3px !important;
    color: #8795a7 !important;
    font-size: 10.5px !important;
    line-height: 1.1 !important;
    font-weight: 620 !important;
  }

  #overview.router-overview-framework .ik-v420-visual,
  .router-overview-framework .ik-v420-visual,
  .ik-v420-visual {
    min-height: 96px !important;
    height: 96px !important;
    margin: 0 !important;
    padding: 9px 10px 7px !important;
    border: 0 !important;
    border-radius: 18px !important;
    background: linear-gradient(180deg, rgba(240,247,254,.92), rgba(249,252,255,.9)) !important;
    box-shadow: inset 0 0 0 .5px rgba(170,197,221,.46) !important;
  }

  #overview.router-overview-framework .ik-v420-line-chart,
  .router-overview-framework .ik-v420-line-chart,
  .ik-v420-line-chart {
    width: 100% !important;
    height: 100% !important;
    overflow: visible !important;
  }

  #overview.router-overview-framework .ik-v420-gridline,
  .router-overview-framework .ik-v420-gridline,
  .ik-v420-gridline {
    stroke: rgba(142,173,202,.38) !important;
    stroke-width: .7 !important;
  }

  #overview.router-overview-framework .ik-v420-area,
  .router-overview-framework .ik-v420-area,
  .ik-v420-area {
    fill: rgba(20,115,230,.08) !important;
  }

  #overview.router-overview-framework .ik-v420-curve.is-main,
  .router-overview-framework .ik-v420-curve.is-main,
  .ik-v420-curve.is-main {
    stroke: var(--blue) !important;
    stroke-width: 2.3 !important;
  }

  #overview.router-overview-framework .ik-v420-curve.is-soft,
  .router-overview-framework .ik-v420-curve.is-soft,
  .ik-v420-curve.is-soft {
    stroke: rgba(92,168,255,.62) !important;
    stroke-width: 1.5 !important;
  }

  #overview.router-overview-framework .ik-v420-line-chart text,
  .router-overview-framework .ik-v420-line-chart text,
  .ik-v420-line-chart text {
    fill: #718399 !important;
    font-size: 10px !important;
    font-weight: 650 !important;
  }

  #overview.router-overview-framework .ik-v503-hero-pills,
  .router-overview-framework .ik-v503-hero-pills,
  .ik-v503-hero-pills {
    display: flex !important;
    flex-wrap: nowrap !important;
    gap: 6px !important;
    min-width: 0 !important;
    overflow: hidden !important;
  }

  #overview.router-overview-framework .ik-v503-hero-pills span,
  .router-overview-framework .ik-v503-hero-pills span,
  .ik-v503-hero-pills span {
    min-width: 0 !important;
    max-width: 33% !important;
    height: 25px !important;
    padding: 0 9px !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
    white-space: nowrap !important;
    border-radius: 999px !important;
    color: #496075 !important;
    font-size: 10.5px !important;
    font-weight: 700 !important;
    background: rgba(255,255,255,.72) !important;
    box-shadow: inset 0 0 0 .5px rgba(158,188,216,.55) !important;
  }

  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v420-hero,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v420-hero,
  [data-overview-mobile-scene="resource-full"] .ik-v420-hero {
    min-height: 314px !important;
  }

  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v420-visual,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v420-visual,
  [data-overview-mobile-scene="resource-full"] .ik-v420-visual {
    height: 112px !important;
    min-height: 112px !important;
    padding: 10px 12px !important;
    background:
      linear-gradient(180deg, rgba(255,255,255,.76), rgba(247,251,255,.94)) !important;
  }

  #overview.router-overview-framework .ik-v620-pressure-visual,
  .router-overview-framework .ik-v620-pressure-visual,
  .ik-v620-pressure-visual {
    display: grid !important;
    grid-template-columns: 1fr !important;
    gap: 9px !important;
    height: 100% !important;
    min-height: 0 !important;
  }

  #overview.router-overview-framework .ik-v620-pressure-visual header,
  .router-overview-framework .ik-v620-pressure-visual header,
  .ik-v620-pressure-visual header {
    display: flex !important;
    align-items: center !important;
    justify-content: space-between !important;
    min-height: 16px !important;
    margin: 0 !important;
    padding: 0 !important;
  }

  #overview.router-overview-framework .ik-v620-pressure-visual header b,
  .router-overview-framework .ik-v620-pressure-visual header b,
  .ik-v620-pressure-visual header b {
    color: #1c2b3a !important;
    font-size: 11px !important;
    font-weight: 780 !important;
  }

  #overview.router-overview-framework .ik-v620-pressure-visual header span,
  .router-overview-framework .ik-v620-pressure-visual header span,
  .ik-v620-pressure-visual header span {
    color: #7d8da0 !important;
    font-size: 10px !important;
    font-weight: 650 !important;
  }

  #overview.router-overview-framework .ik-v620-pressure-visual .ik-v420-resource-meter,
  .router-overview-framework .ik-v620-pressure-visual .ik-v420-resource-meter,
  .ik-v620-pressure-visual .ik-v420-resource-meter {
    display: grid !important;
    grid-template-columns: 48px minmax(0, 1fr) 52px !important;
    align-items: center !important;
    gap: 8px !important;
    min-height: 19px !important;
    padding: 0 !important;
    background: transparent !important;
  }

  #overview.router-overview-framework .ik-v620-pressure-visual .ik-v420-resource-meter b,
  .router-overview-framework .ik-v620-pressure-visual .ik-v420-resource-meter b,
  .ik-v620-pressure-visual .ik-v420-resource-meter b {
    color: #54677c !important;
    font-size: 11px !important;
    font-weight: 760 !important;
  }

  #overview.router-overview-framework .ik-v620-pressure-visual .ik-v420-resource-meter > i,
  .router-overview-framework .ik-v620-pressure-visual .ik-v420-resource-meter > i,
  .ik-v620-pressure-visual .ik-v420-resource-meter > i {
    height: 6px !important;
    border-radius: 999px !important;
    background: rgba(177,202,225,.54) !important;
  }

  #overview.router-overview-framework .ik-v620-pressure-visual .ik-v420-resource-meter > i > i,
  .router-overview-framework .ik-v620-pressure-visual .ik-v420-resource-meter > i > i,
  .ik-v620-pressure-visual .ik-v420-resource-meter > i > i {
    background: linear-gradient(90deg, #1473e6 0%, #5ca8ff 78%, #d83b31 100%) !important;
  }

  #overview.router-overview-framework .ik-v620-pressure-visual .ik-v420-resource-meter em,
  .router-overview-framework .ik-v620-pressure-visual .ik-v420-resource-meter em,
  .ik-v620-pressure-visual .ik-v420-resource-meter em {
    color: #182331 !important;
    font-size: 12px !important;
    font-style: normal !important;
    font-weight: 820 !important;
    text-align: right !important;
  }

  #overview.router-overview-framework .ik-v620-pressure-visual .ik-v420-resource-meter.is-danger em,
  .router-overview-framework .ik-v620-pressure-visual .ik-v420-resource-meter.is-danger em,
  .ik-v620-pressure-visual .ik-v420-resource-meter.is-danger em {
    color: var(--red) !important;
  }

  #overview.router-overview-framework .ik-v420-port-matrix,
  .router-overview-framework .ik-v420-port-matrix,
  .ik-v420-port-matrix {
    display: grid !important;
    grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
    gap: 7px !important;
    height: 100% !important;
  }

  #overview.router-overview-framework .ik-v420-port-matrix span,
  .router-overview-framework .ik-v420-port-matrix span,
  .ik-v420-port-matrix span {
    min-height: 36px !important;
    padding: 7px 4px !important;
    border-radius: 13px !important;
    background: rgba(255,255,255,.76) !important;
    box-shadow: inset 0 0 0 .5px rgba(170,197,221,.56) !important;
  }

  #overview.router-overview-framework .ik-v420-port-matrix span.is-danger,
  .router-overview-framework .ik-v420-port-matrix span.is-danger,
  .ik-v420-port-matrix span.is-danger {
    background: #fffafa !important;
    box-shadow: inset 0 0 0 .5px rgba(216,59,49,.22) !important;
  }

  #overview.router-overview-framework .ik-v420-timeline,
  .router-overview-framework .ik-v420-timeline,
  .ik-v420-timeline,
  #overview.router-overview-framework .ik-v420-list,
  .router-overview-framework .ik-v420-list,
  .ik-v420-list {
    margin: 0 !important;
    padding: 12px 14px 8px !important;
    border-radius: 22px !important;
    outline: 0 !important;
    border: 0 !important;
    background: rgba(255,255,255,.78) !important;
    box-shadow: inset 0 0 0 .5px rgba(164,191,216,.44) !important;
  }

  #overview.router-overview-framework .ik-v420-timeline header,
  .router-overview-framework .ik-v420-timeline header,
  .ik-v420-timeline header,
  #overview.router-overview-framework .ik-v420-list header,
  .router-overview-framework .ik-v420-list header,
  .ik-v420-list header {
    min-height: 22px !important;
    margin: 0 0 4px !important;
    padding: 0 !important;
  }

  #overview.router-overview-framework .ik-v420-timeline header b,
  .router-overview-framework .ik-v420-timeline header b,
  .ik-v420-timeline header b,
  #overview.router-overview-framework .ik-v420-list header b,
  .router-overview-framework .ik-v420-list header b,
  .ik-v420-list header b {
    color: #182536 !important;
    font-size: 14px !important;
    font-weight: 780 !important;
    letter-spacing: -.12px !important;
  }

  #overview.router-overview-framework .ik-v420-timeline header span,
  .router-overview-framework .ik-v420-timeline header span,
  .ik-v420-timeline header span,
  #overview.router-overview-framework .ik-v420-list header span,
  .router-overview-framework .ik-v420-list header span,
  .ik-v420-list header span {
    color: #8190a2 !important;
    font-size: 11px !important;
    font-weight: 650 !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row,
  .router-overview-framework .ik-v420-timeline-row,
  .ik-v420-timeline-row {
    display: grid !important;
    grid-template-columns: 26px minmax(0, 1fr) auto !important;
    gap: 9px !important;
    min-height: 43px !important;
    padding: 7px 0 !important;
    background: transparent !important;
    border-radius: 0 !important;
    box-shadow: inset 0 -0.5px 0 rgba(198,214,229,.68) !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row:last-child,
  .router-overview-framework .ik-v420-timeline-row:last-child,
  .ik-v420-timeline-row:last-child {
    box-shadow: none !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row > i,
  .router-overview-framework .ik-v420-timeline-row > i,
  .ik-v420-timeline-row > i {
    width: 24px !important;
    height: 24px !important;
    border-radius: 8px !important;
    color: var(--blue) !important;
    background: rgba(20,115,230,.09) !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row.is-danger > i,
  .router-overview-framework .ik-v420-timeline-row.is-danger > i,
  .ik-v420-timeline-row.is-danger > i,
  #overview.router-overview-framework .ik-v420-timeline-row.is-missing > i,
  .router-overview-framework .ik-v420-timeline-row.is-missing > i,
  .ik-v420-timeline-row.is-missing > i {
    color: var(--red) !important;
    background: rgba(216,59,49,.08) !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row b,
  .router-overview-framework .ik-v420-timeline-row b,
  .ik-v420-timeline-row b {
    color: #1c2b3a !important;
    font-size: 12.6px !important;
    font-weight: 760 !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row em,
  .router-overview-framework .ik-v420-timeline-row em,
  .ik-v420-timeline-row em {
    margin-top: 2px !important;
    color: #7e8fa2 !important;
    font-size: 11px !important;
    line-height: 1.18 !important;
    font-style: normal !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row strong,
  .router-overview-framework .ik-v420-timeline-row strong,
  .ik-v420-timeline-row strong {
    color: #203044 !important;
    font-size: 12.2px !important;
    font-weight: 800 !important;
    letter-spacing: -.1px !important;
  }

  #overview.router-overview-framework .ik-v420-list-row,
  .router-overview-framework .ik-v420-list-row,
  .ik-v420-list-row {
    grid-template-columns: 34px minmax(0, 1fr) auto !important;
    gap: 10px !important;
    min-height: 54px !important;
    padding: 8px 0 !important;
    background: transparent !important;
    border-radius: 0 !important;
    box-shadow: inset 0 -0.5px 0 rgba(198,214,229,.68) !important;
  }

  #overview.router-overview-framework .ik-v420-list-row:last-child,
  .router-overview-framework .ik-v420-list-row:last-child,
  .ik-v420-list-row:last-child {
    box-shadow: none !important;
  }

  #overview.router-overview-framework .ik-v503-device-icon,
  .router-overview-framework .ik-v503-device-icon,
  .ik-v503-device-icon {
    width: 32px !important;
    height: 32px !important;
    border-radius: 11px !important;
    color: var(--blue) !important;
    background: linear-gradient(180deg, rgba(20,115,230,.13), rgba(20,115,230,.06)) !important;
    box-shadow: inset 0 0 0 .5px rgba(20,115,230,.16) !important;
  }

  #overview.router-overview-framework .ik-v420-list-row.is-danger .ik-v503-device-icon,
  .router-overview-framework .ik-v420-list-row.is-danger .ik-v503-device-icon,
  .ik-v420-list-row.is-danger .ik-v503-device-icon {
    color: var(--red) !important;
    background: rgba(216,59,49,.08) !important;
  }

  #overview.router-overview-framework .ik-v420-list-row span b,
  .router-overview-framework .ik-v420-list-row span b,
  .ik-v420-list-row span b {
    color: #19283a !important;
    font-size: 13px !important;
    line-height: 1.1 !important;
    font-weight: 780 !important;
    letter-spacing: -.12px !important;
  }

  #overview.router-overview-framework .ik-v420-list-row span em,
  .router-overview-framework .ik-v420-list-row span em,
  .ik-v420-list-row span em {
    max-width: 100% !important;
    margin-top: 3px !important;
    color: #74859a !important;
    font-size: 10.8px !important;
    line-height: 1.18 !important;
    font-style: normal !important;
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
  }

  #overview.router-overview-framework .ik-v420-list-row span u,
  .router-overview-framework .ik-v420-list-row span u,
  .ik-v420-list-row span u {
    height: 3px !important;
    margin-top: 6px !important;
    border-radius: 999px !important;
    background: rgba(178,204,226,.48) !important;
  }

  #overview.router-overview-framework .ik-v420-list-row span u i,
  .router-overview-framework .ik-v420-list-row span u i,
  .ik-v420-list-row span u i {
    background: linear-gradient(90deg, var(--blue), var(--blue-2)) !important;
  }

  #overview.router-overview-framework .ik-v420-list-row > strong,
  .router-overview-framework .ik-v420-list-row > strong,
  .ik-v420-list-row > strong {
    display: grid !important;
    justify-items: end !important;
    gap: 3px !important;
    min-width: 52px !important;
    color: #172436 !important;
    font-size: 0 !important;
    font-weight: 800 !important;
  }

  #overview.router-overview-framework .ik-v420-list-row > strong b,
  .router-overview-framework .ik-v420-list-row > strong b,
  .ik-v420-list-row > strong b {
    color: inherit !important;
    font-size: 12px !important;
    line-height: 1 !important;
    font-weight: 820 !important;
  }

  #overview.router-overview-framework .ik-v420-list-row > strong small,
  .router-overview-framework .ik-v420-list-row > strong small,
  .ik-v420-list-row > strong small {
    min-height: 16px !important;
    padding: 0 6px !important;
    border-radius: 999px !important;
    color: #63758a !important;
    font-size: 9.5px !important;
    line-height: 16px !important;
    font-weight: 760 !important;
    background: rgba(240,246,252,.95) !important;
  }

  #overview.router-overview-framework .ik-v420-tabs,
  .router-overview-framework .ik-v420-tabs,
  .ik-v420-tabs {
    position: fixed !important;
    z-index: 80 !important;
    left: 12px !important;
    right: 12px !important;
    bottom: max(9px, env(safe-area-inset-bottom, 0px)) !important;
    display: grid !important;
    grid-template-columns: repeat(5, minmax(0, 1fr)) !important;
    height: 66px !important;
    padding: 6px 7px !important;
    border-radius: 24px !important;
    outline: 0 !important;
    border: 0 !important;
    background: #ffffff !important;
    box-shadow:
      0 16px 34px rgba(38, 74, 110, .18),
      inset 0 0 0 .5px rgba(154, 182, 208, .55) !important;
  }

  #overview.router-overview-framework .ik-v420-tabs button,
  .router-overview-framework .ik-v420-tabs button,
  .ik-v420-tabs button {
    position: relative !important;
    display: grid !important;
    place-items: center !important;
    gap: 3px !important;
    min-width: 44px !important;
    min-height: 52px !important;
    padding: 4px 0 2px !important;
    border-radius: 17px !important;
    color: #7b8ba0 !important;
    background: transparent !important;
    font-size: 10px !important;
    line-height: 1 !important;
    font-weight: 720 !important;
    box-shadow: none !important;
  }

  #overview.router-overview-framework .ik-v420-tabs svg,
  .router-overview-framework .ik-v420-tabs svg,
  .ik-v420-tabs svg {
    width: 20px !important;
    height: 20px !important;
    stroke-width: 2 !important;
  }

  #overview.router-overview-framework .ik-v420-tabs button.is-active,
  .router-overview-framework .ik-v420-tabs button.is-active,
  .ik-v420-tabs button.is-active {
    color: var(--blue) !important;
    background: rgba(20,115,230,.08) !important;
    box-shadow: inset 0 0 0 .5px rgba(20,115,230,.14) !important;
  }

  #overview.router-overview-framework .ik-v420-tabs button.is-active svg,
  .router-overview-framework .ik-v420-tabs button.is-active svg,
  .ik-v420-tabs button.is-active svg {
    filter: drop-shadow(0 3px 7px rgba(20,115,230,.18)) !important;
  }

  /* v621 gate + visual correction: numbers are not boxed cards; lower content is one iOS grouped list. */
  #overview.router-overview-framework [data-overview-mobile-v620-hero] .ik-v420-hero-stats,
  .router-overview-framework [data-overview-mobile-v620-hero] .ik-v420-hero-stats,
  [data-overview-mobile-v620-hero] .ik-v420-hero-stats,
  #overview.router-overview-framework [data-overview-mobile-v620-hero] .ik-v420-hero-stats span,
  .router-overview-framework [data-overview-mobile-v620-hero] .ik-v420-hero-stats span,
  [data-overview-mobile-v620-hero] .ik-v420-hero-stats span {
    border: 0 !important;
    outline: 0 !important;
    background: transparent !important;
    box-shadow: none !important;
  }

  #overview.router-overview-framework [data-overview-mobile-v620-hero] .ik-v420-hero-stats,
  .router-overview-framework [data-overview-mobile-v620-hero] .ik-v420-hero-stats,
  [data-overview-mobile-v620-hero] .ik-v420-hero-stats {
    column-gap: 22px !important;
  }

  #overview.router-overview-framework [data-overview-mobile-v620-hero] .ik-v420-hero-stats span + span,
  .router-overview-framework [data-overview-mobile-v620-hero] .ik-v420-hero-stats span + span,
  [data-overview-mobile-v620-hero] .ik-v420-hero-stats span + span {
    border-left: 0 !important;
    padding-left: 0 !important;
  }

  #overview.router-overview-framework [data-overview-mobile-v620-hero] .ik-v420-hero-stats span::before,
  #overview.router-overview-framework [data-overview-mobile-v620-hero] .ik-v420-hero-stats span::after,
  .router-overview-framework [data-overview-mobile-v620-hero] .ik-v420-hero-stats span::before,
  .router-overview-framework [data-overview-mobile-v620-hero] .ik-v420-hero-stats span::after,
  [data-overview-mobile-v620-hero] .ik-v420-hero-stats span::before,
  [data-overview-mobile-v620-hero] .ik-v420-hero-stats span::after {
    display: none !important;
  }

  #overview.router-overview-framework .ik-v420-surface,
  .router-overview-framework .ik-v420-surface,
  .ik-v420-surface {
    display: grid !important;
    gap: 0 !important;
    margin: 0 !important;
    padding: 8px 14px 6px !important;
    border-radius: 24px !important;
    background: rgba(255,255,255,.78) !important;
    box-shadow: inset 0 0 0 .5px rgba(164,191,216,.44) !important;
  }

  #overview.router-overview-framework .ik-v420-surface .ik-v420-timeline,
  .router-overview-framework .ik-v420-surface .ik-v420-timeline,
  .ik-v420-surface .ik-v420-timeline,
  #overview.router-overview-framework .ik-v420-surface .ik-v420-list,
  .router-overview-framework .ik-v420-surface .ik-v420-list,
  .ik-v420-surface .ik-v420-list {
    padding: 8px 0 6px !important;
    border-radius: 0 !important;
    background: transparent !important;
    box-shadow: none !important;
  }

  #overview.router-overview-framework .ik-v420-surface .ik-v420-list,
  .router-overview-framework .ik-v420-surface .ik-v420-list,
  .ik-v420-surface .ik-v420-list {
    padding-top: 10px !important;
    box-shadow: inset 0 .5px 0 rgba(198,214,229,.72) !important;
  }

  #overview.router-overview-framework .ik-v420-timeline header,
  .router-overview-framework .ik-v420-timeline header,
  .ik-v420-timeline header,
  #overview.router-overview-framework .ik-v420-list header,
  .router-overview-framework .ik-v420-list header,
  .ik-v420-list header {
    padding: 0 !important;
  }

  /* v622 validator-safe separators: no row/list shadows counted as card surfaces. */
  #overview.router-overview-framework .ik-v420-surface .ik-v420-timeline,
  .router-overview-framework .ik-v420-surface .ik-v420-timeline,
  .ik-v420-surface .ik-v420-timeline,
  #overview.router-overview-framework .ik-v420-surface .ik-v420-list,
  .router-overview-framework .ik-v420-surface .ik-v420-list,
  .ik-v420-surface .ik-v420-list {
    border: 0 !important;
    outline: 0 !important;
    border-radius: 0 !important;
    box-shadow: none !important;
  }

  #overview.router-overview-framework .ik-v420-surface .ik-v420-list,
  .router-overview-framework .ik-v420-surface .ik-v420-list,
  .ik-v420-surface .ik-v420-list {
    border-top: .5px solid rgba(198,214,229,.72) !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row,
  .router-overview-framework .ik-v420-timeline-row,
  .ik-v420-timeline-row,
  #overview.router-overview-framework .ik-v420-list-row,
  .router-overview-framework .ik-v420-list-row,
  .ik-v420-list-row {
    border: 0 !important;
    border-radius: 0 !important;
    box-shadow: none !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row:not(:last-child),
  .router-overview-framework .ik-v420-timeline-row:not(:last-child),
  .ik-v420-timeline-row:not(:last-child),
  #overview.router-overview-framework .ik-v420-list-row:not(:last-child),
  .router-overview-framework .ik-v420-list-row:not(:last-child),
  .ik-v420-list-row:not(:last-child) {
    border-bottom: .5px solid rgba(198,214,229,.72) !important;
  }

  /* v700 product-app pass: native router-app hierarchy, not a collapsed desktop report. */
  #overview.router-overview-framework .ik-v420-app,
  .router-overview-framework .ik-v420-app,
  .ik-v420-app {
    --blue: #1473e6;
    --blue-2: #37a2ff;
    --ink: #101828;
    --quiet: #6e7f93;
    --line: rgba(174,197,219,.58);
    background:
      radial-gradient(circle at 50% -118px, rgba(20,115,230,.19), transparent 300px),
      linear-gradient(180deg, #fbfdff 0%, #f2f7fc 46%, #f6f9fd 100%) !important;
  }

  #overview.router-overview-framework .ik-v420-screen,
  .router-overview-framework .ik-v420-screen,
  .ik-v420-screen {
    padding: max(8px, env(safe-area-inset-top, 0px)) 14px 94px !important;
  }

  #overview.router-overview-framework .ik-v420-screen > * + *,
  .router-overview-framework .ik-v420-screen > * + *,
  .ik-v420-screen > * + * {
    margin-top: 12px !important;
  }

  #overview.router-overview-framework .ik-v420-nav,
  .router-overview-framework .ik-v420-nav,
  .ik-v420-nav {
    min-height: 58px !important;
    grid-template-columns: 38px minmax(0, 1fr) auto !important;
    gap: 11px !important;
  }

  #overview.router-overview-framework .ik-v420-nav button,
  .router-overview-framework .ik-v420-nav button,
  .ik-v420-nav button {
    width: 36px !important;
    height: 36px !important;
    border-radius: 13px !important;
    background: rgba(255,255,255,.64) !important;
    box-shadow: inset 0 0 0 .5px rgba(178,204,229,.62) !important;
  }

  #overview.router-overview-framework .ik-v420-nav div b,
  .router-overview-framework .ik-v420-nav div b,
  .ik-v420-nav div b {
    font-size: 16.5px !important;
    line-height: 1.02 !important;
    letter-spacing: -.45px !important;
  }

  #overview.router-overview-framework .ik-v420-nav div span,
  .router-overview-framework .ik-v420-nav div span,
  .ik-v420-nav div span {
    color: #72839a !important;
    font-size: 11px !important;
    line-height: 1.15 !important;
  }

  #overview.router-overview-framework .ik-v420-nav strong,
  .router-overview-framework .ik-v420-nav strong,
  .ik-v420-nav strong {
    min-height: 28px !important;
    padding: 0 10px !important;
    border-radius: 999px !important;
    background: rgba(255,255,255,.62) !important;
    box-shadow: inset 0 0 0 .5px rgba(178,204,229,.62) !important;
    font-size: 11.5px !important;
  }

  #overview.router-overview-framework .ik-v420-hero,
  .router-overview-framework .ik-v420-hero,
  .ik-v420-hero {
    min-height: 326px !important;
    gap: 13px !important;
    padding: 19px 18px 15px !important;
    border-radius: 30px !important;
    overflow: hidden !important;
    background:
      radial-gradient(circle at 88% 8%, rgba(55,162,255,.18), transparent 132px),
      radial-gradient(circle at 8% 110%, rgba(20,115,230,.11), transparent 150px),
      linear-gradient(180deg, rgba(255,255,255,.98), rgba(244,250,255,.96)) !important;
    box-shadow:
      0 18px 38px rgba(39, 79, 118, .115),
      inset 0 0 0 .5px rgba(154,188,220,.52) !important;
  }

  #overview.router-overview-framework .ik-v420-hero.is-danger,
  .router-overview-framework .ik-v420-hero.is-danger,
  .ik-v420-hero.is-danger,
  #overview.router-overview-framework .ik-v420-hero.is-missing,
  .router-overview-framework .ik-v420-hero.is-missing,
  .ik-v420-hero.is-missing {
    background:
      radial-gradient(circle at 84% 6%, rgba(217,48,37,.12), transparent 120px),
      radial-gradient(circle at 8% 110%, rgba(20,115,230,.10), transparent 160px),
      linear-gradient(180deg, #fffefe 0%, #f8fbff 100%) !important;
  }

  #overview.router-overview-framework .ik-v420-hero::before,
  .router-overview-framework .ik-v420-hero::before,
  .ik-v420-hero::before {
    width: 4px !important;
    height: 76px !important;
    top: 22px !important;
    border-radius: 0 999px 999px 0 !important;
  }

  #overview.router-overview-framework .ik-v620-hero-head,
  .router-overview-framework .ik-v620-hero-head,
  .ik-v620-hero-head {
    gap: 6px !important;
    padding-left: 1px !important;
  }

  #overview.router-overview-framework .ik-v620-hero-head span,
  .router-overview-framework .ik-v620-hero-head span,
  .ik-v620-hero-head span {
    color: #6d7f94 !important;
    font-size: 11.5px !important;
    font-weight: 720 !important;
    letter-spacing: .02em !important;
  }

  #overview.router-overview-framework .ik-v620-hero-head h1,
  .router-overview-framework .ik-v620-hero-head h1,
  .ik-v620-hero-head h1 {
    font-size: clamp(30px, 8.6vw, 38px) !important;
    line-height: .96 !important;
    font-weight: 840 !important;
    letter-spacing: -1.15px !important;
  }

  #overview.router-overview-framework .ik-v620-hero-head p,
  .router-overview-framework .ik-v620-hero-head p,
  .ik-v620-hero-head p {
    max-width: 29ch !important;
    color: #687a90 !important;
    font-size: 12.2px !important;
    line-height: 1.32 !important;
    font-weight: 560 !important;
  }

  #overview.router-overview-framework .ik-v620-hero-stage,
  .router-overview-framework .ik-v620-hero-stage,
  .ik-v620-hero-stage {
    display: grid !important;
    grid-template-rows: auto 1fr !important;
    gap: 13px !important;
  }

  #overview.router-overview-framework .ik-v420-hero-stats,
  .router-overview-framework .ik-v420-hero-stats,
  .ik-v420-hero-stats {
    column-gap: 24px !important;
  }

  #overview.router-overview-framework .ik-v420-hero-stats b,
  .router-overview-framework .ik-v420-hero-stats b,
  .ik-v420-hero-stats b,
  #overview.router-overview-framework .ik-v420-hero-stats .is-primary b,
  .router-overview-framework .ik-v420-hero-stats .is-primary b,
  .ik-v420-hero-stats .is-primary b {
    margin-top: 4px !important;
    font-size: clamp(31px, 9.6vw, 42px) !important;
    line-height: .9 !important;
    letter-spacing: -1.05px !important;
  }

  #overview.router-overview-framework .ik-v420-hero-stats em,
  .router-overview-framework .ik-v420-hero-stats em,
  .ik-v420-hero-stats em {
    color: #687a90 !important;
    font-size: 11px !important;
    font-weight: 720 !important;
  }

  #overview.router-overview-framework .ik-v420-hero-stats small,
  .router-overview-framework .ik-v420-hero-stats small,
  .ik-v420-hero-stats small {
    margin-top: 4px !important;
    color: #8a98aa !important;
    font-size: 10.5px !important;
    font-weight: 660 !important;
  }

  #overview.router-overview-framework .ik-v420-visual,
  .router-overview-framework .ik-v420-visual,
  .ik-v420-visual {
    height: 126px !important;
    min-height: 126px !important;
    padding: 11px 12px 9px !important;
    border-radius: 22px !important;
    background:
      linear-gradient(180deg, rgba(255,255,255,.56), rgba(241,248,255,.46)) !important;
    box-shadow:
      inset 0 0 0 .5px rgba(163,193,221,.45),
      inset 0 -18px 34px rgba(20,115,230,.035) !important;
  }

  #overview.router-overview-framework .ik-v420-curve.is-main,
  .router-overview-framework .ik-v420-curve.is-main,
  .ik-v420-curve.is-main {
    stroke-width: 2.8 !important;
  }

  #overview.router-overview-framework .ik-v420-curve.is-soft,
  .router-overview-framework .ik-v420-curve.is-soft,
  .ik-v420-curve.is-soft {
    stroke-width: 1.65 !important;
    opacity: .88 !important;
  }

  #overview.router-overview-framework .ik-v503-hero-pills,
  .router-overview-framework .ik-v503-hero-pills,
  .ik-v503-hero-pills {
    flex-wrap: wrap !important;
    gap: 5px 10px !important;
    overflow: visible !important;
  }

  #overview.router-overview-framework .ik-v503-hero-pills span,
  .router-overview-framework .ik-v503-hero-pills span,
  .ik-v503-hero-pills span {
    position: relative !important;
    max-width: none !important;
    width: auto !important;
    height: auto !important;
    padding: 0 !important;
    overflow: visible !important;
    text-overflow: clip !important;
    white-space: nowrap !important;
    border-radius: 0 !important;
    color: #5f7187 !important;
    font-size: 10.8px !important;
    font-weight: 720 !important;
    background: transparent !important;
    box-shadow: none !important;
  }

  #overview.router-overview-framework .ik-v503-hero-pills span:not(:last-child)::after,
  .router-overview-framework .ik-v503-hero-pills span:not(:last-child)::after,
  .ik-v503-hero-pills span:not(:last-child)::after {
    content: "";
    display: inline-block;
    width: 3px;
    height: 3px;
    margin-left: 10px;
    vertical-align: 2px;
    border-radius: 999px;
    background: rgba(111,130,151,.48);
  }

  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v420-hero,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v420-hero,
  [data-overview-mobile-scene="resource-full"] .ik-v420-hero {
    min-height: 342px !important;
  }

  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v420-visual,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v420-visual,
  [data-overview-mobile-scene="resource-full"] .ik-v420-visual {
    height: 134px !important;
    min-height: 134px !important;
    background:
      radial-gradient(circle at 88% 10%, rgba(217,48,37,.08), transparent 90px),
      linear-gradient(180deg, rgba(255,255,255,.62), rgba(246,250,255,.52)) !important;
  }

  #overview.router-overview-framework .ik-v620-pressure-visual,
  .router-overview-framework .ik-v620-pressure-visual,
  .ik-v620-pressure-visual {
    gap: 10px !important;
  }

  #overview.router-overview-framework .ik-v620-pressure-visual header b,
  .router-overview-framework .ik-v620-pressure-visual header b,
  .ik-v620-pressure-visual header b {
    font-size: 11.5px !important;
  }

  #overview.router-overview-framework .ik-v620-pressure-visual .ik-v420-resource-meter,
  .router-overview-framework .ik-v620-pressure-visual .ik-v420-resource-meter,
  .ik-v620-pressure-visual .ik-v420-resource-meter {
    grid-template-columns: 46px minmax(0, 1fr) 48px !important;
    min-height: 22px !important;
    gap: 10px !important;
  }

  #overview.router-overview-framework .ik-v620-pressure-visual .ik-v420-resource-meter > i,
  .router-overview-framework .ik-v620-pressure-visual .ik-v420-resource-meter > i,
  .ik-v620-pressure-visual .ik-v420-resource-meter > i {
    height: 5px !important;
    overflow: visible !important;
    background: rgba(177,202,225,.46) !important;
  }

  #overview.router-overview-framework .ik-v620-pressure-visual .ik-v420-resource-meter > i > i,
  .router-overview-framework .ik-v620-pressure-visual .ik-v420-resource-meter > i > i,
  .ik-v620-pressure-visual .ik-v420-resource-meter > i > i {
    position: relative !important;
    height: 5px !important;
    border-radius: 999px !important;
    background: linear-gradient(90deg, #1473e6 0%, #37a2ff 70%, #d93025 100%) !important;
  }

  #overview.router-overview-framework .ik-v620-pressure-visual .ik-v420-resource-meter > i > i::after,
  .router-overview-framework .ik-v620-pressure-visual .ik-v420-resource-meter > i > i::after,
  .ik-v620-pressure-visual .ik-v420-resource-meter > i > i::after {
    content: "";
    position: absolute;
    right: -3px;
    top: 50%;
    width: 7px;
    height: 7px;
    transform: translateY(-50%);
    border-radius: 999px;
    background: #fff;
    box-shadow: 0 0 0 2px #d93025;
  }

  #overview.router-overview-framework .ik-v420-surface,
  .router-overview-framework .ik-v420-surface,
  .ik-v420-surface {
    padding: 8px 13px 6px !important;
    border-radius: 24px !important;
    background: rgba(255,255,255,.70) !important;
    box-shadow: inset 0 0 0 .5px rgba(164,191,216,.38) !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row,
  .router-overview-framework .ik-v420-timeline-row,
  .ik-v420-timeline-row {
    grid-template-columns: 30px minmax(0, 1fr) auto !important;
    gap: 10px !important;
    min-height: 46px !important;
    padding: 8px 0 !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row > i,
  .router-overview-framework .ik-v420-timeline-row > i,
  .ik-v420-timeline-row > i {
    width: 28px !important;
    height: 28px !important;
    border-radius: 10px !important;
    background: rgba(20,115,230,.075) !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row b,
  .router-overview-framework .ik-v420-timeline-row b,
  .ik-v420-timeline-row b {
    font-size: 13px !important;
    letter-spacing: -.18px !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row em,
  .router-overview-framework .ik-v420-timeline-row em,
  .ik-v420-timeline-row em {
    max-width: 176px !important;
    font-size: 10.8px !important;
    line-height: 1.18 !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row strong,
  .router-overview-framework .ik-v420-timeline-row strong,
  .ik-v420-timeline-row strong {
    font-size: 12.2px !important;
    font-weight: 820 !important;
  }

  #overview.router-overview-framework .ik-v420-list-row,
  .router-overview-framework .ik-v420-list-row,
  .ik-v420-list-row {
    grid-template-columns: 38px minmax(0, 1fr) auto !important;
    min-height: 60px !important;
    gap: 11px !important;
    padding: 9px 0 !important;
  }

  #overview.router-overview-framework .ik-v503-device-icon,
  .router-overview-framework .ik-v503-device-icon,
  .ik-v503-device-icon {
    width: 36px !important;
    height: 36px !important;
    border-radius: 12px !important;
    background: linear-gradient(180deg, rgba(20,115,230,.14), rgba(20,115,230,.055)) !important;
  }

  #overview.router-overview-framework .ik-v503-device-icon svg,
  .router-overview-framework .ik-v503-device-icon svg,
  .ik-v503-device-icon svg {
    width: 20px !important;
    height: 20px !important;
  }

  #overview.router-overview-framework .ik-v420-list-row span b,
  .router-overview-framework .ik-v420-list-row span b,
  .ik-v420-list-row span b {
    font-size: 13.3px !important;
    letter-spacing: -.18px !important;
  }

  #overview.router-overview-framework .ik-v420-list-row span em,
  .router-overview-framework .ik-v420-list-row span em,
  .ik-v420-list-row span em {
    max-width: 190px !important;
    color: #71839a !important;
    font-size: 10.7px !important;
    line-height: 1.18 !important;
    white-space: normal !important;
    overflow: visible !important;
    text-overflow: clip !important;
  }

  #overview.router-overview-framework .ik-v420-list-row span u,
  .router-overview-framework .ik-v420-list-row span u,
  .ik-v420-list-row span u {
    height: 2.5px !important;
    margin-top: 6px !important;
    background: rgba(178,204,226,.42) !important;
  }

  #overview.router-overview-framework .ik-v420-list-row > strong,
  .router-overview-framework .ik-v420-list-row > strong,
  .ik-v420-list-row > strong {
    min-width: 50px !important;
  }

  #overview.router-overview-framework .ik-v420-list-row > strong b,
  .router-overview-framework .ik-v420-list-row > strong b,
  .ik-v420-list-row > strong b {
    font-size: 12.6px !important;
  }

  #overview.router-overview-framework .ik-v420-list-row > strong small,
  .router-overview-framework .ik-v420-list-row > strong small,
  .ik-v420-list-row > strong small {
    min-height: 15px !important;
    padding: 0 !important;
    color: #6d7f94 !important;
    font-size: 9.6px !important;
    line-height: 15px !important;
    background: transparent !important;
  }

  #overview.router-overview-framework .ik-v420-tabs,
  .router-overview-framework .ik-v420-tabs,
  .ik-v420-tabs {
    left: 10px !important;
    right: 10px !important;
    bottom: max(8px, env(safe-area-inset-bottom, 0px)) !important;
    height: 70px !important;
    padding: 6px 8px !important;
    border-radius: 26px !important;
    background: rgba(255,255,255,.94) !important;
    box-shadow:
      0 18px 34px rgba(38, 74, 110, .16),
      inset 0 0 0 .5px rgba(154, 182, 208, .50) !important;
  }

  #overview.router-overview-framework .ik-v420-tabs button,
  .router-overview-framework .ik-v420-tabs button,
  .ik-v420-tabs button {
    min-height: 56px !important;
    border-radius: 18px !important;
    color: #7a8ca2 !important;
    font-size: 9.8px !important;
  }

  #overview.router-overview-framework .ik-v420-tabs button.is-active,
  .router-overview-framework .ik-v420-tabs button.is-active,
  .ik-v420-tabs button.is-active {
    color: #1473e6 !important;
    background: linear-gradient(180deg, rgba(20,115,230,.12), rgba(20,115,230,.055)) !important;
    box-shadow: none !important;
  }

  #overview.router-overview-framework .ik-v420-tabs button.is-active::before,
  .router-overview-framework .ik-v420-tabs button.is-active::before,
  .ik-v420-tabs button.is-active::before {
    content: "";
    position: absolute;
    top: 5px;
    width: 18px;
    height: 3px;
    border-radius: 999px;
    background: #1473e6;
  }

  /* v800 mobile app refinement: fewer log rows, visible device list, ring pressure visual. */
  #overview.router-overview-framework .ik-v420-hero,
  .router-overview-framework .ik-v420-hero,
  .ik-v420-hero {
    min-height: 308px !important;
    gap: 11px !important;
    padding: 18px 18px 14px !important;
  }

  #overview.router-overview-framework .ik-v620-hero-head h1,
  .router-overview-framework .ik-v620-hero-head h1,
  .ik-v620-hero-head h1 {
    font-size: clamp(29px, 8.2vw, 36px) !important;
    letter-spacing: -1.05px !important;
  }

  #overview.router-overview-framework .ik-v420-visual,
  .router-overview-framework .ik-v420-visual,
  .ik-v420-visual {
    height: 112px !important;
    min-height: 112px !important;
    border-radius: 20px !important;
  }

  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v420-hero,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v420-hero,
  [data-overview-mobile-scene="resource-full"] .ik-v420-hero {
    min-height: 330px !important;
  }

  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v420-visual,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v420-visual,
  [data-overview-mobile-scene="resource-full"] .ik-v420-visual {
    height: 126px !important;
    min-height: 126px !important;
    padding: 10px 12px !important;
  }

  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual,
  [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual {
    grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
    grid-template-rows: 18px 1fr !important;
    column-gap: 10px !important;
    row-gap: 6px !important;
    align-items: center !important;
  }

  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual header,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual header,
  [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual header {
    grid-column: 1 / -1 !important;
  }

  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter,
  [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter {
    position: relative !important;
    display: grid !important;
    grid-template-columns: 1fr !important;
    grid-template-rows: 54px auto auto !important;
    justify-items: center !important;
    gap: 3px !important;
    min-height: 88px !important;
    padding: 0 !important;
    color: #132236 !important;
  }

  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter::before,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter::before,
  [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter::before {
    content: "";
    grid-row: 1;
    width: 52px;
    height: 52px;
    border-radius: 50%;
    background:
      radial-gradient(circle at 50% 50%, #fff 0 56%, transparent 57%),
      conic-gradient(from -90deg, #d93025 var(--meter), rgba(212,224,236,.72) 0) !important;
    box-shadow: inset 0 0 0 .5px rgba(176,197,218,.55);
  }

  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter b,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter b,
  [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter b {
    grid-row: 2 !important;
    color: #54677c !important;
    font-size: 10.8px !important;
    line-height: 1.05 !important;
    font-weight: 760 !important;
  }

  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter em,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter em,
  [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter em {
    position: absolute !important;
    top: 17px !important;
    left: 0 !important;
    right: 0 !important;
    color: #d93025 !important;
    font-size: 11.6px !important;
    line-height: 1 !important;
    font-weight: 840 !important;
    text-align: center !important;
  }

  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter > i,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter > i,
  [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter > i {
    grid-row: 3 !important;
    width: 42px !important;
    height: 2px !important;
    overflow: hidden !important;
    background: rgba(212,224,236,.72) !important;
  }

  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter > i > i,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter > i > i,
  [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter > i > i {
    height: 2px !important;
    background: #d93025 !important;
  }

  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter > i > i::after,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter > i > i::after,
  [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter > i > i::after {
    display: none !important;
  }

  #overview.router-overview-framework .ik-v420-surface,
  .router-overview-framework .ik-v420-surface,
  .ik-v420-surface {
    padding: 7px 13px 5px !important;
    border-radius: 22px !important;
  }

  #overview.router-overview-framework .ik-v420-timeline header,
  .router-overview-framework .ik-v420-timeline header,
  .ik-v420-timeline header,
  #overview.router-overview-framework .ik-v420-list header,
  .router-overview-framework .ik-v420-list header,
  .ik-v420-list header {
    min-height: 20px !important;
    margin-bottom: 2px !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row,
  .router-overview-framework .ik-v420-timeline-row,
  .ik-v420-timeline-row {
    grid-template-columns: 26px minmax(0, 1fr) auto !important;
    min-height: 39px !important;
    padding: 6px 0 !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row > i,
  .router-overview-framework .ik-v420-timeline-row > i,
  .ik-v420-timeline-row > i {
    width: 24px !important;
    height: 24px !important;
    border-radius: 8px !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row b,
  .router-overview-framework .ik-v420-timeline-row b,
  .ik-v420-timeline-row b {
    font-size: 12.6px !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row em,
  .router-overview-framework .ik-v420-timeline-row em,
  .ik-v420-timeline-row em {
    max-width: 168px !important;
    font-size: 10.2px !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row strong,
  .router-overview-framework .ik-v420-timeline-row strong,
  .ik-v420-timeline-row strong {
    font-size: 11.8px !important;
  }

  #overview.router-overview-framework .ik-v420-surface .ik-v420-list,
  .router-overview-framework .ik-v420-surface .ik-v420-list,
  .ik-v420-surface .ik-v420-list {
    padding-top: 7px !important;
  }

  #overview.router-overview-framework .ik-v420-list-row,
  .router-overview-framework .ik-v420-list-row,
  .ik-v420-list-row {
    min-height: 52px !important;
    padding: 7px 0 !important;
  }

  #overview.router-overview-framework .ik-v503-device-icon,
  .router-overview-framework .ik-v503-device-icon,
  .ik-v503-device-icon {
    width: 32px !important;
    height: 32px !important;
    border-radius: 11px !important;
  }

  #overview.router-overview-framework .ik-v420-list-row span b,
  .router-overview-framework .ik-v420-list-row span b,
  .ik-v420-list-row span b {
    font-size: 12.8px !important;
  }

  #overview.router-overview-framework .ik-v420-list-row span em,
  .router-overview-framework .ik-v420-list-row span em,
  .ik-v420-list-row span em {
    max-width: 178px !important;
    font-size: 10.3px !important;
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
  }

  #overview.router-overview-framework .ik-v420-tabs,
  .router-overview-framework .ik-v420-tabs,
  .ik-v420-tabs {
    height: 68px !important;
    border-radius: 25px !important;
    background: rgba(255,255,255,.96) !important;
  }

  #overview.router-overview-framework .ik-v420-tabs button.is-active,
  .router-overview-framework .ik-v420-tabs button.is-active,
  .ik-v420-tabs button.is-active {
    background: radial-gradient(circle at 50% 18%, rgba(20,115,230,.18), rgba(20,115,230,.06) 64%, transparent 65%) !important;
  }

  /* v801 force ring mode over legacy vertical-ledger pressure bars. */
  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual {
    display: grid !important;
    grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
    grid-template-rows: 18px 1fr !important;
    column-gap: 10px !important;
    row-gap: 6px !important;
    align-items: center !important;
  }

  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual header {
    grid-column: 1 / -1 !important;
  }

  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter {
    position: relative !important;
    display: grid !important;
    grid-template-columns: 1fr !important;
    grid-template-rows: 54px auto 2px !important;
    justify-items: center !important;
    align-items: center !important;
    gap: 3px !important;
    min-height: 88px !important;
    padding: 0 !important;
    background: transparent !important;
  }

  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter::before {
    content: "" !important;
    display: block !important;
    grid-row: 1 !important;
    width: 52px !important;
    height: 52px !important;
    border-radius: 50% !important;
    background:
      radial-gradient(circle at 50% 50%, #fff 0 56%, transparent 57%),
      conic-gradient(from -90deg, #d93025 var(--meter), rgba(212,224,236,.72) 0) !important;
    box-shadow: inset 0 0 0 .5px rgba(176,197,218,.55) !important;
  }

  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter::after {
    display: none !important;
  }

  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter b {
    grid-row: 2 !important;
    color: #54677c !important;
    font-size: 10.8px !important;
    line-height: 1.05 !important;
    font-weight: 760 !important;
    text-align: center !important;
  }

  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter em {
    position: absolute !important;
    top: 17px !important;
    left: 0 !important;
    right: 0 !important;
    color: #d93025 !important;
    font-size: 11.6px !important;
    line-height: 1 !important;
    font-weight: 840 !important;
    text-align: center !important;
  }

  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter > i {
    grid-row: 3 !important;
    display: block !important;
    width: 42px !important;
    height: 2px !important;
    overflow: hidden !important;
    background: rgba(212,224,236,.72) !important;
  }

  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter > i > i {
    display: block !important;
    height: 2px !important;
    background: #d93025 !important;
  }

  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter > i > i::after {
    display: none !important;
  }

  /* v802 ring cleanup: center readouts, no leftover red underline. */
  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter::before {
    position: relative !important;
    z-index: 1 !important;
    background:
      radial-gradient(circle at 50% 50%, #fff 0 60%, transparent 61%),
      conic-gradient(from -90deg, #d93025 var(--meter), rgba(212,224,236,.68) 0) !important;
  }

  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter em {
    z-index: 3 !important;
    top: 20px !important;
    font-size: 11px !important;
    letter-spacing: -.18px !important;
  }

  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter > i {
    display: none !important;
  }

  /* v803 dedicated ring center value. */
  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter .ik-v802-ring-value {
    position: absolute !important;
    z-index: 5 !important;
    top: 20px !important;
    left: 0 !important;
    right: 0 !important;
    display: block !important;
    color: #d93025 !important;
    font-size: 10.8px !important;
    line-height: 1 !important;
    font-weight: 850 !important;
    letter-spacing: -.25px !important;
    text-align: center !important;
  }

  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter em {
    display: none !important;
  }

  /* v804 incident color discipline: keep the accident center strong, make lists calm. */
  #overview.router-overview-framework .ik-v420-app:is([data-overview-mobile-scene="all-offline"], [data-overview-mobile-scene="interfaces-down"], [data-overview-mobile-scene="resource-full"], [data-overview-mobile-scene="no-snapshot"]) .ik-v420-surface .ik-v420-timeline-row.is-danger > i,
  #overview.router-overview-framework .ik-v420-app:is([data-overview-mobile-scene="all-offline"], [data-overview-mobile-scene="interfaces-down"], [data-overview-mobile-scene="resource-full"], [data-overview-mobile-scene="no-snapshot"]) .ik-v420-surface .ik-v420-timeline-row.is-missing > i {
    color: #b9403a !important;
    background: rgba(217,48,37,.055) !important;
    box-shadow: inset 0 0 0 .5px rgba(217,48,37,.18) !important;
  }

  #overview.router-overview-framework .ik-v420-app:is([data-overview-mobile-scene="all-offline"], [data-overview-mobile-scene="interfaces-down"], [data-overview-mobile-scene="resource-full"], [data-overview-mobile-scene="no-snapshot"]) .ik-v420-surface .ik-v420-timeline-row.is-danger b,
  #overview.router-overview-framework .ik-v420-app:is([data-overview-mobile-scene="all-offline"], [data-overview-mobile-scene="interfaces-down"], [data-overview-mobile-scene="resource-full"], [data-overview-mobile-scene="no-snapshot"]) .ik-v420-surface .ik-v420-timeline-row.is-missing b {
    color: #1d2d40 !important;
  }

  #overview.router-overview-framework .ik-v420-app:is([data-overview-mobile-scene="all-offline"], [data-overview-mobile-scene="interfaces-down"], [data-overview-mobile-scene="resource-full"], [data-overview-mobile-scene="no-snapshot"]) .ik-v420-surface .ik-v420-timeline-row.is-danger strong,
  #overview.router-overview-framework .ik-v420-app:is([data-overview-mobile-scene="all-offline"], [data-overview-mobile-scene="interfaces-down"], [data-overview-mobile-scene="resource-full"], [data-overview-mobile-scene="no-snapshot"]) .ik-v420-surface .ik-v420-timeline-row.is-missing strong {
    color: #26384d !important;
  }

  #overview.router-overview-framework .ik-v420-app:is([data-overview-mobile-scene="all-offline"], [data-overview-mobile-scene="interfaces-down"], [data-overview-mobile-scene="resource-full"], [data-overview-mobile-scene="no-snapshot"]) .ik-v420-list-row.is-danger .ik-v503-device-icon {
    color: #b9403a !important;
    background: rgba(217,48,37,.055) !important;
    box-shadow: inset 0 0 0 .5px rgba(217,48,37,.16) !important;
  }

  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-hero-stats .is-danger b,
  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="all-offline"] .ik-v420-hero-stats .is-danger b,
  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="interfaces-down"] .ik-v420-hero-stats .is-danger b,
  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="no-snapshot"] .ik-v420-hero-stats .is-danger b {
    color: #d93025 !important;
  }

  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-hero,
  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="all-offline"] .ik-v420-hero,
  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="interfaces-down"] .ik-v420-hero,
  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="no-snapshot"] .ik-v420-hero {
    box-shadow:
      0 20px 42px rgba(39,79,118,.12),
      inset 0 0 0 .5px rgba(217,48,37,.16) !important;
  }

  /* v805 list rows are context, not the alarm center. */
  #overview.router-overview-framework .ik-v420-app:is([data-overview-mobile-scene="all-offline"], [data-overview-mobile-scene="interfaces-down"], [data-overview-mobile-scene="resource-full"], [data-overview-mobile-scene="no-snapshot"]) .ik-v420-surface .ik-v420-timeline-row.is-danger > i,
  #overview.router-overview-framework .ik-v420-app:is([data-overview-mobile-scene="all-offline"], [data-overview-mobile-scene="interfaces-down"], [data-overview-mobile-scene="resource-full"], [data-overview-mobile-scene="no-snapshot"]) .ik-v420-surface .ik-v420-timeline-row.is-missing > i {
    color: #1473e6 !important;
    background: rgba(20,115,230,.06) !important;
    box-shadow: inset 0 0 0 .5px rgba(20,115,230,.16) !important;
  }

  #overview.router-overview-framework .ik-v420-app:is([data-overview-mobile-scene="all-offline"], [data-overview-mobile-scene="interfaces-down"], [data-overview-mobile-scene="resource-full"], [data-overview-mobile-scene="no-snapshot"]) .ik-v420-list-row.is-danger .ik-v503-device-icon {
    color: #1473e6 !important;
    background: rgba(20,115,230,.06) !important;
    box-shadow: inset 0 0 0 .5px rgba(20,115,230,.16) !important;
  }

  /* v806 peak pressure hierarchy: one strong pressure center, two quieter companions. */
  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual {
    grid-template-columns: .86fr 1.12fr .86fr !important;
  }

  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter {
    opacity: .86 !important;
  }

  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter.is-peak {
    opacity: 1 !important;
    transform: translateY(-2px) !important;
  }

  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter.is-peak::before {
    width: 62px !important;
    height: 62px !important;
    background:
      radial-gradient(circle at 50% 50%, #fff 0 59%, transparent 60%),
      conic-gradient(from -90deg, #d93025 var(--meter), rgba(212,224,236,.68) 0) !important;
    box-shadow:
      0 8px 20px rgba(217,48,37,.10),
      inset 0 0 0 .5px rgba(217,48,37,.26) !important;
  }

  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter.is-peak .ik-v802-ring-value {
    top: 24px !important;
    font-size: 12px !important;
  }

  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter:not(.is-peak)::before {
    width: 48px !important;
    height: 48px !important;
    background:
      radial-gradient(circle at 50% 50%, #fff 0 60%, transparent 61%),
      conic-gradient(from -90deg, #d93025 var(--meter), rgba(212,224,236,.68) 0) !important;
  }

  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter:not(.is-peak) .ik-v802-ring-value {
    top: 19px !important;
    font-size: 10px !important;
  }

  /* v807 product-app list pass: status is a dot timeline; terminals read like devices, not log rows. */
  #overview.router-overview-framework .ik-v420-timeline-row,
  .router-overview-framework .ik-v420-timeline-row,
  .ik-v420-timeline-row {
    grid-template-columns: 14px minmax(0, 1fr) auto !important;
    gap: 10px !important;
    min-height: 36px !important;
    padding: 5px 0 !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row > i,
  .router-overview-framework .ik-v420-timeline-row > i,
  .ik-v420-timeline-row > i {
    align-self: center !important;
    width: 8px !important;
    height: 8px !important;
    border-radius: 999px !important;
    background: #1473e6 !important;
    color: transparent !important;
    box-shadow: 0 0 0 4px rgba(20,115,230,.08) !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row > i svg,
  .router-overview-framework .ik-v420-timeline-row > i svg,
  .ik-v420-timeline-row > i svg {
    display: none !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row.is-danger > i,
  .router-overview-framework .ik-v420-timeline-row.is-danger > i,
  .ik-v420-timeline-row.is-danger > i,
  #overview.router-overview-framework .ik-v420-timeline-row.is-missing > i,
  .router-overview-framework .ik-v420-timeline-row.is-missing > i,
  .ik-v420-timeline-row.is-missing > i {
    background: #d93025 !important;
    box-shadow: 0 0 0 4px rgba(217,48,37,.08) !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row.is-warn > i,
  .router-overview-framework .ik-v420-timeline-row.is-warn > i,
  .ik-v420-timeline-row.is-warn > i {
    background: #d27b22 !important;
    box-shadow: 0 0 0 4px rgba(210,123,34,.08) !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row em,
  .router-overview-framework .ik-v420-timeline-row em,
  .ik-v420-timeline-row em {
    max-width: none !important;
  }

  #overview.router-overview-framework .ik-v420-list-row,
  .router-overview-framework .ik-v420-list-row,
  .ik-v420-list-row {
    min-height: 58px !important;
  }

  #overview.router-overview-framework .ik-v420-list-row span b,
  .router-overview-framework .ik-v420-list-row span b,
  .ik-v420-list-row span b {
    display: flex !important;
    align-items: center !important;
    gap: 6px !important;
    flex-wrap: wrap !important;
  }

  #overview.router-overview-framework .ik-v807-kind,
  .router-overview-framework .ik-v807-kind,
  .ik-v807-kind {
    display: inline-flex !important;
    align-items: center !important;
    height: 17px !important;
    padding: 0 6px !important;
    border-radius: 999px !important;
    color: #54718d !important;
    background: rgba(20,115,230,.07) !important;
    font-size: 9.5px !important;
    line-height: 17px !important;
    font-weight: 760 !important;
    letter-spacing: 0 !important;
  }

  #overview.router-overview-framework .ik-v420-list-row span em,
  .router-overview-framework .ik-v420-list-row span em,
  .ik-v420-list-row span em {
    max-width: none !important;
    white-space: normal !important;
    overflow: visible !important;
    text-overflow: clip !important;
  }

  #overview.router-overview-framework .ik-v420-list-row > strong,
  .router-overview-framework .ik-v420-list-row > strong,
  .ik-v420-list-row > strong {
    min-width: 58px !important;
  }

  #overview.router-overview-framework .ik-v420-tabs button.is-active,
  .router-overview-framework .ik-v420-tabs button.is-active,
  .ik-v420-tabs button.is-active {
    background: linear-gradient(180deg, rgba(20,115,230,.13), rgba(20,115,230,.055)) !important;
  }

  /* v808 app-home direction: stronger hero chart, iOS-settings status rows, calmer accident context. */
  #overview.router-overview-framework .ik-v420-hero,
  .router-overview-framework .ik-v420-hero,
  .ik-v420-hero {
    min-height: 322px !important;
    gap: 12px !important;
    padding: 18px 18px 13px !important;
    border-radius: 31px !important;
    background:
      radial-gradient(circle at 86% 10%, rgba(55,162,255,.20), transparent 134px),
      radial-gradient(circle at 12% 110%, rgba(20,115,230,.10), transparent 160px),
      linear-gradient(180deg, rgba(255,255,255,.99), rgba(242,249,255,.97)) !important;
  }

  #overview.router-overview-framework .ik-v620-hero-head,
  .router-overview-framework .ik-v620-hero-head,
  .ik-v620-hero-head {
    gap: 5px !important;
  }

  #overview.router-overview-framework .ik-v620-hero-head h1,
  .router-overview-framework .ik-v620-hero-head h1,
  .ik-v620-hero-head h1 {
    font-size: clamp(31px, 8.7vw, 39px) !important;
    letter-spacing: -1.22px !important;
  }

  #overview.router-overview-framework .ik-v620-hero-head p,
  .router-overview-framework .ik-v620-hero-head p,
  .ik-v620-hero-head p {
    max-width: 32ch !important;
    font-size: 12px !important;
    line-height: 1.26 !important;
  }

  #overview.router-overview-framework .ik-v420-hero-stats b,
  .router-overview-framework .ik-v420-hero-stats b,
  .ik-v420-hero-stats b,
  #overview.router-overview-framework .ik-v420-hero-stats .is-primary b,
  .router-overview-framework .ik-v420-hero-stats .is-primary b,
  .ik-v420-hero-stats .is-primary b {
    font-size: clamp(33px, 10vw, 43px) !important;
    letter-spacing: -1.2px !important;
  }

  #overview.router-overview-framework .ik-v420-visual,
  .router-overview-framework .ik-v420-visual,
  .ik-v420-visual {
    height: 132px !important;
    min-height: 132px !important;
    padding: 12px 12px 10px !important;
    border-radius: 24px !important;
    background:
      linear-gradient(180deg, rgba(255,255,255,.62), rgba(239,247,255,.50)) !important;
    box-shadow:
      inset 0 0 0 .5px rgba(154,188,220,.46),
      inset 0 -22px 42px rgba(20,115,230,.045) !important;
  }

  #overview.router-overview-framework .ik-v420-line-chart text,
  .router-overview-framework .ik-v420-line-chart text,
  .ik-v420-line-chart text {
    font-size: 9.6px !important;
  }

  #overview.router-overview-framework .ik-v420-curve.is-main,
  .router-overview-framework .ik-v420-curve.is-main,
  .ik-v420-curve.is-main {
    stroke-width: 3px !important;
  }

  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v420-hero,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v420-hero,
  [data-overview-mobile-scene="resource-full"] .ik-v420-hero {
    min-height: 336px !important;
  }

  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v420-visual,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v420-visual,
  [data-overview-mobile-scene="resource-full"] .ik-v420-visual {
    height: 130px !important;
    min-height: 130px !important;
  }

  #overview.router-overview-framework .ik-v420-surface,
  .router-overview-framework .ik-v420-surface,
  .ik-v420-surface {
    margin-top: 0 !important;
    padding: 8px 13px 6px !important;
    border-radius: 25px !important;
    background: rgba(255,255,255,.78) !important;
  }

  #overview.router-overview-framework .ik-v420-timeline header b,
  .router-overview-framework .ik-v420-timeline header b,
  .ik-v420-timeline header b,
  #overview.router-overview-framework .ik-v420-list header b,
  .router-overview-framework .ik-v420-list header b,
  .ik-v420-list header b {
    font-size: 13.5px !important;
    letter-spacing: -.18px !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row,
  .router-overview-framework .ik-v420-timeline-row,
  .ik-v420-timeline-row {
    grid-template-columns: 32px minmax(0, 1fr) auto !important;
    gap: 10px !important;
    min-height: 42px !important;
    padding: 6px 0 !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row > i,
  .router-overview-framework .ik-v420-timeline-row > i,
  .ik-v420-timeline-row > i {
    display: grid !important;
    place-items: center !important;
    width: 28px !important;
    height: 28px !important;
    border-radius: 9px !important;
    color: #1473e6 !important;
    background: linear-gradient(180deg, rgba(20,115,230,.11), rgba(20,115,230,.045)) !important;
    box-shadow: inset 0 0 0 .5px rgba(20,115,230,.16) !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row > i svg,
  .router-overview-framework .ik-v420-timeline-row > i svg,
  .ik-v420-timeline-row > i svg {
    display: block !important;
    width: 15px !important;
    height: 15px !important;
    fill: none !important;
    stroke: currentColor !important;
    stroke-width: 1.9 !important;
    stroke-linecap: round !important;
    stroke-linejoin: round !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row.is-danger > i,
  .router-overview-framework .ik-v420-timeline-row.is-danger > i,
  .ik-v420-timeline-row.is-danger > i,
  #overview.router-overview-framework .ik-v420-timeline-row.is-missing > i,
  .router-overview-framework .ik-v420-timeline-row.is-missing > i,
  .ik-v420-timeline-row.is-missing > i {
    color: #1473e6 !important;
    background: linear-gradient(180deg, rgba(20,115,230,.10), rgba(20,115,230,.04)) !important;
    box-shadow: inset 0 0 0 .5px rgba(20,115,230,.14) !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row.is-danger strong,
  .router-overview-framework .ik-v420-timeline-row.is-danger strong,
  .ik-v420-timeline-row.is-danger strong,
  #overview.router-overview-framework .ik-v420-timeline-row.is-missing strong,
  .router-overview-framework .ik-v420-timeline-row.is-missing strong,
  .ik-v420-timeline-row.is-missing strong {
    color: #d93025 !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row em,
  .router-overview-framework .ik-v420-timeline-row em,
  .ik-v420-timeline-row em {
    color: #8291a4 !important;
    font-size: 10.5px !important;
    line-height: 1.16 !important;
  }

  #overview.router-overview-framework .ik-v420-list-row,
  .router-overview-framework .ik-v420-list-row,
  .ik-v420-list-row {
    min-height: 56px !important;
  }

  #overview.router-overview-framework .ik-v420-list-row span em,
  .router-overview-framework .ik-v420-list-row span em,
  .ik-v420-list-row span em {
    color: #78889c !important;
    font-size: 10.4px !important;
    line-height: 1.16 !important;
  }

  #overview.router-overview-framework .ik-v420-tabs,
  .router-overview-framework .ik-v420-tabs,
  .ik-v420-tabs {
    height: 70px !important;
    padding: 6px 8px !important;
    border-radius: 28px !important;
    background: rgba(255,255,255,.97) !important;
  }

  #overview.router-overview-framework .ik-v420-tabs button.is-active,
  .router-overview-framework .ik-v420-tabs button.is-active,
  .ik-v420-tabs button.is-active {
    color: #1473e6 !important;
    background:
      radial-gradient(circle at 50% 20%, rgba(20,115,230,.18), transparent 44%),
      linear-gradient(180deg, rgba(20,115,230,.10), rgba(20,115,230,.045)) !important;
  }

  /* v809 resource incident: pressure panel, not three red dial widgets. */
  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v420-visual,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v420-visual,
  [data-overview-mobile-scene="resource-full"] .ik-v420-visual {
    height: 126px !important;
    min-height: 126px !important;
    padding: 12px 13px 10px !important;
    background:
      radial-gradient(circle at 88% 10%, rgba(217,48,37,.055), transparent 90px),
      linear-gradient(180deg, rgba(255,255,255,.72), rgba(242,248,255,.58)) !important;
  }

  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual,
  [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual {
    display: grid !important;
    grid-template-columns: 1fr !important;
    grid-template-rows: 18px repeat(3, 1fr) !important;
    gap: 7px !important;
    height: 100% !important;
    align-items: center !important;
  }

  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual header,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual header,
  [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual header {
    grid-column: 1 !important;
    min-height: 18px !important;
  }

  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter,
  [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter {
    position: relative !important;
    display: grid !important;
    grid-template-columns: 42px minmax(0, 1fr) 50px !important;
    grid-template-rows: 1fr !important;
    align-items: center !important;
    justify-items: stretch !important;
    gap: 10px !important;
    min-height: 20px !important;
    padding: 0 !important;
    opacity: .96 !important;
    transform: none !important;
    background: transparent !important;
  }

  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter::before,
  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter::after,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter::before,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter::after,
  [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter::before,
  [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter::after {
    display: none !important;
  }

  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter b,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter b,
  [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter b {
    grid-column: 1 !important;
    grid-row: 1 !important;
    color: #50647a !important;
    font-size: 11.2px !important;
    line-height: 1 !important;
    font-weight: 760 !important;
    text-align: left !important;
  }

  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter .ik-v802-ring-value,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter .ik-v802-ring-value,
  [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter .ik-v802-ring-value {
    position: static !important;
    grid-column: 3 !important;
    grid-row: 1 !important;
    display: block !important;
    color: #9f3d38 !important;
    font-size: 12px !important;
    line-height: 1 !important;
    font-weight: 820 !important;
    letter-spacing: -.2px !important;
    text-align: right !important;
  }

  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter.is-peak .ik-v802-ring-value,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter.is-peak .ik-v802-ring-value,
  [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter.is-peak .ik-v802-ring-value {
    color: #d93025 !important;
    font-size: 13px !important;
  }

  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter em,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter em,
  [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter em {
    display: none !important;
  }

  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter > i,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter > i,
  [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter > i {
    grid-column: 2 !important;
    grid-row: 1 !important;
    display: block !important;
    width: 100% !important;
    height: 5px !important;
    overflow: hidden !important;
    border-radius: 999px !important;
    background: rgba(178,204,226,.44) !important;
  }

  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter > i > i,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter > i > i,
  [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter > i > i {
    display: block !important;
    height: 100% !important;
    border-radius: inherit !important;
    background: linear-gradient(90deg, #1473e6 0%, #36a0ff 76%, #d93025 100%) !important;
  }

  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter > i > i::after,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter > i > i::after,
  [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter > i > i::after {
    display: none !important;
  }

  /* v809 tab rhythm: selected icon gets the brand center, label stays measured. */
  #overview.router-overview-framework .ik-v420-tabs button,
  .router-overview-framework .ik-v420-tabs button,
  .ik-v420-tabs button {
    gap: 4px !important;
  }

  #overview.router-overview-framework .ik-v420-tabs button.is-active,
  .router-overview-framework .ik-v420-tabs button.is-active,
  .ik-v420-tabs button.is-active {
    color: #1473e6 !important;
    background: transparent !important;
  }

  #overview.router-overview-framework .ik-v420-tabs button.is-active svg,
  .router-overview-framework .ik-v420-tabs button.is-active svg,
  .ik-v420-tabs button.is-active svg {
    padding: 4px !important;
    width: 28px !important;
    height: 28px !important;
    border-radius: 12px !important;
    background: linear-gradient(180deg, rgba(20,115,230,.18), rgba(20,115,230,.08)) !important;
  }

  /* v810 hard override: remove legacy ring pseudo-elements with matching specificity. */
  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual,
  .router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual,
  .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual {
    display: grid !important;
    grid-template-columns: 1fr !important;
    grid-template-rows: 18px repeat(3, 1fr) !important;
    gap: 7px !important;
    height: 100% !important;
  }

  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual header,
  .router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual header,
  .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual header {
    grid-column: 1 !important;
    min-height: 18px !important;
  }

  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter,
  .router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter,
  .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter {
    position: relative !important;
    display: grid !important;
    grid-template-columns: 42px minmax(0, 1fr) 50px !important;
    grid-template-rows: 1fr !important;
    align-items: center !important;
    justify-items: stretch !important;
    gap: 10px !important;
    min-height: 20px !important;
    padding: 0 !important;
    opacity: .96 !important;
    transform: none !important;
    background: transparent !important;
  }

  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter::before,
  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter::after,
  .router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter::before,
  .router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter::after,
  .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter::before,
  .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter::after {
    content: none !important;
    display: none !important;
    width: 0 !important;
    height: 0 !important;
  }

  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter b,
  .router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter b,
  .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter b {
    grid-column: 1 !important;
    grid-row: 1 !important;
    color: #50647a !important;
    font-size: 11.2px !important;
    line-height: 1 !important;
    font-weight: 760 !important;
    text-align: left !important;
  }

  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter .ik-v802-ring-value,
  .router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter .ik-v802-ring-value,
  .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter .ik-v802-ring-value {
    position: static !important;
    grid-column: 3 !important;
    grid-row: 1 !important;
    display: block !important;
    color: #9f3d38 !important;
    font-size: 12px !important;
    line-height: 1 !important;
    font-weight: 820 !important;
    letter-spacing: -.2px !important;
    text-align: right !important;
  }

  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter.is-peak .ik-v802-ring-value,
  .router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter.is-peak .ik-v802-ring-value,
  .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter.is-peak .ik-v802-ring-value {
    color: #d93025 !important;
    font-size: 13px !important;
  }

  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter em,
  .router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter em,
  .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter em {
    display: none !important;
  }

  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter > i,
  .router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter > i,
  .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter > i {
    grid-column: 2 !important;
    grid-row: 1 !important;
    display: block !important;
    width: 100% !important;
    height: 5px !important;
    overflow: hidden !important;
    border-radius: 999px !important;
    background: rgba(178,204,226,.44) !important;
  }

  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter > i > i,
  .router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter > i > i,
  .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter > i > i {
    display: block !important;
    height: 100% !important;
    border-radius: inherit !important;
    background: linear-gradient(90deg, #1473e6 0%, #36a0ff 76%, #d93025 100%) !important;
  }

  /* v812 density pass: remove decorative bulk; keep first-screen business facts visible. */
  #overview.router-overview-framework .ik-v420-app,
  .router-overview-framework .ik-v420-app,
  .ik-v420-app {
    background: linear-gradient(180deg, #f6faff 0%, #f3f7fb 100%) !important;
  }

  #overview.router-overview-framework .ik-v420-screen,
  .router-overview-framework .ik-v420-screen,
  .ik-v420-screen {
    padding: max(6px, env(safe-area-inset-top, 0px)) 12px calc(76px + env(safe-area-inset-bottom, 0px)) !important;
  }

  #overview.router-overview-framework .ik-v420-screen > * + *,
  .router-overview-framework .ik-v420-screen > * + *,
  .ik-v420-screen > * + * { margin-top: 6px !important; }

  #overview.router-overview-framework .ik-v420-nav,
  .router-overview-framework .ik-v420-nav,
  .ik-v420-nav {
    min-height: 50px !important;
    height: 50px !important;
    grid-template-columns: 34px minmax(0, 1fr) auto !important;
    gap: 8px !important;
  }

  #overview.router-overview-framework .ik-v420-nav button,
  .router-overview-framework .ik-v420-nav button,
  .ik-v420-nav button {
    width: 34px !important;
    height: 34px !important;
    border-radius: 11px !important;
    background: rgba(255,255,255,.68) !important;
    box-shadow: inset 0 0 0 .5px rgba(164,190,214,.54) !important;
  }

  #overview.router-overview-framework .ik-v420-nav div,
  .router-overview-framework .ik-v420-nav div,
  .ik-v420-nav div { gap: 1px !important; }

  #overview.router-overview-framework .ik-v420-nav div b,
  .router-overview-framework .ik-v420-nav div b,
  .ik-v420-nav div b {
    font-size: 16px !important;
    line-height: 1.05 !important;
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
  }

  #overview.router-overview-framework .ik-v420-nav div span,
  .router-overview-framework .ik-v420-nav div span,
  .ik-v420-nav div span {
    font-size: 10.5px !important;
    line-height: 1.1 !important;
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
  }

  #overview.router-overview-framework .ik-v420-nav strong,
  .router-overview-framework .ik-v420-nav strong,
  .ik-v420-nav strong {
    min-height: 22px !important;
    padding: 0 7px !important;
    gap: 4px !important;
    font-size: 10.5px !important;
    background: rgba(255,255,255,.66) !important;
    box-shadow: inset 0 0 0 .5px rgba(164,190,214,.48) !important;
  }

  #overview.router-overview-framework .ik-v420-nav strong i,
  .router-overview-framework .ik-v420-nav strong i,
  .ik-v420-nav strong i { width: 5px !important; height: 5px !important; }

  #overview.router-overview-framework .ik-v420-hero,
  .router-overview-framework .ik-v420-hero,
  .ik-v420-hero {
    min-height: 0 !important;
    height: 220px !important;
    padding: 12px 13px 10px !important;
    border-radius: 20px !important;
    background: linear-gradient(180deg, rgba(255,255,255,.97), rgba(246,250,254,.94)) !important;
    box-shadow: inset 0 0 0 .5px rgba(165,192,216,.54) !important;
  }

  #overview.router-overview-framework .ik-v420-app:not([data-overview-mobile-scene="single"]):not([data-overview-mobile-scene="fleet"]) .ik-v420-hero,
  .router-overview-framework .ik-v420-app:not([data-overview-mobile-scene="single"]):not([data-overview-mobile-scene="fleet"]) .ik-v420-hero,
  .ik-v420-app:not([data-overview-mobile-scene="single"]):not([data-overview-mobile-scene="fleet"]) .ik-v420-hero {
    height: 236px !important;
  }

  #overview.router-overview-framework .ik-v420-hero::before,
  .router-overview-framework .ik-v420-hero::before,
  .ik-v420-hero::before {
    inset: 12px auto 12px 0 !important;
    width: 2px !important;
    opacity: .86 !important;
  }

  #overview.router-overview-framework .ik-v620-hero-head,
  .router-overview-framework .ik-v620-hero-head,
  .ik-v620-hero-head { gap: 3px !important; }

  #overview.router-overview-framework .ik-v620-hero-head h1,
  .router-overview-framework .ik-v620-hero-head h1,
  .ik-v620-hero-head h1 {
    font-size: clamp(26px, 7.1vw, 31px) !important;
    line-height: 1.02 !important;
    letter-spacing: -.8px !important;
  }

  #overview.router-overview-framework .ik-v620-hero-head p,
  .router-overview-framework .ik-v620-hero-head p,
  .ik-v620-hero-head p {
    max-width: none !important;
    font-size: 11px !important;
    line-height: 1.16 !important;
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
  }

  #overview.router-overview-framework .ik-v420-hero-stats,
  .router-overview-framework .ik-v420-hero-stats,
  .ik-v420-hero-stats {
    margin-top: 8px !important;
    gap: 6px !important;
  }

  #overview.router-overview-framework .ik-v420-hero-stats span,
  .router-overview-framework .ik-v420-hero-stats span,
  .ik-v420-hero-stats span {
    padding: 4px 7px !important;
    border-radius: 10px !important;
    background: transparent !important;
    box-shadow: inset 1px 0 0 rgba(120,158,194,.18) !important;
  }

  #overview.router-overview-framework .ik-v420-hero-stats b,
  #overview.router-overview-framework .ik-v420-hero-stats .is-primary b,
  .router-overview-framework .ik-v420-hero-stats b,
  .router-overview-framework .ik-v420-hero-stats .is-primary b,
  .ik-v420-hero-stats b,
  .ik-v420-hero-stats .is-primary b {
    font-size: clamp(24px, 7.4vw, 31px) !important;
    line-height: .98 !important;
  }

  #overview.router-overview-framework .ik-v420-hero-stats em,
  #overview.router-overview-framework .ik-v420-hero-stats small,
  .router-overview-framework .ik-v420-hero-stats em,
  .router-overview-framework .ik-v420-hero-stats small,
  .ik-v420-hero-stats em,
  .ik-v420-hero-stats small {
    font-size: 9.5px !important;
    line-height: 1.02 !important;
  }

  #overview.router-overview-framework .ik-v420-visual,
  .router-overview-framework .ik-v420-visual,
  .ik-v420-visual {
    height: 82px !important;
    min-height: 82px !important;
    margin-top: 7px !important;
    padding: 7px 8px !important;
    border-radius: 14px !important;
    background: rgba(255,255,255,.46) !important;
    box-shadow: inset 0 0 0 .5px rgba(166,194,218,.38) !important;
  }

  #overview.router-overview-framework .ik-v420-app:not([data-overview-mobile-scene="single"]):not([data-overview-mobile-scene="fleet"]) .ik-v420-visual,
  .router-overview-framework .ik-v420-app:not([data-overview-mobile-scene="single"]):not([data-overview-mobile-scene="fleet"]) .ik-v420-visual,
  .ik-v420-app:not([data-overview-mobile-scene="single"]):not([data-overview-mobile-scene="fleet"]) .ik-v420-visual {
    height: 92px !important;
    min-height: 92px !important;
  }

  #overview.router-overview-framework .ik-v812-trend-visual,
  .router-overview-framework .ik-v812-trend-visual,
  .ik-v812-trend-visual {
    display: grid !important;
    grid-template-columns: minmax(0, 1fr) 58px !important;
    gap: 8px !important;
    align-items: stretch !important;
    height: 100% !important;
  }

  #overview.router-overview-framework .ik-v812-trend-visual aside,
  .router-overview-framework .ik-v812-trend-visual aside,
  .ik-v812-trend-visual aside {
    display: grid !important;
    gap: 2px !important;
    align-content: center !important;
  }

  #overview.router-overview-framework .ik-v812-trend-visual aside span,
  .router-overview-framework .ik-v812-trend-visual aside span,
  .ik-v812-trend-visual aside span { display: grid !important; gap: 1px !important; }

  #overview.router-overview-framework .ik-v812-trend-visual aside em,
  .router-overview-framework .ik-v812-trend-visual aside em,
  .ik-v812-trend-visual aside em {
    color: #7b8ba0 !important;
    font-size: 8.5px !important;
    font-style: normal !important;
    line-height: 1 !important;
  }

  #overview.router-overview-framework .ik-v812-trend-visual aside b,
  .router-overview-framework .ik-v812-trend-visual aside b,
  .ik-v812-trend-visual aside b {
    color: #122033 !important;
    font-size: 10px !important;
    line-height: 1 !important;
    font-weight: 820 !important;
    white-space: nowrap !important;
  }

  #overview.router-overview-framework .ik-v420-line-chart,
  .router-overview-framework .ik-v420-line-chart,
  .ik-v420-line-chart { height: 68px !important; }

  #overview.router-overview-framework .ik-v420-line-chart text,
  .router-overview-framework .ik-v420-line-chart text,
  .ik-v420-line-chart text { display: none !important; }

  #overview.router-overview-framework .ik-v420-curve.is-main,
  .router-overview-framework .ik-v420-curve.is-main,
  .ik-v420-curve.is-main { stroke-width: 2px !important; }

  #overview.router-overview-framework .ik-v503-hero-pills,
  .router-overview-framework .ik-v503-hero-pills,
  .ik-v503-hero-pills {
    margin-top: 6px !important;
    gap: 5px !important;
  }

  #overview.router-overview-framework .ik-v503-hero-pills span,
  .router-overview-framework .ik-v503-hero-pills span,
  .ik-v503-hero-pills span {
    min-height: 18px !important;
    padding: 0 7px !important;
    border-radius: 999px !important;
    font-size: 9.5px !important;
    background: rgba(255,255,255,.54) !important;
    box-shadow: inset 0 0 0 .5px rgba(165,192,216,.42) !important;
  }

  #overview.router-overview-framework .ik-v420-surface,
  .router-overview-framework .ik-v420-surface,
  .ik-v420-surface {
    gap: 6px !important;
    padding: 7px 10px 6px !important;
    border-radius: 18px !important;
    background: rgba(255,255,255,.78) !important;
    box-shadow: inset 0 0 0 .5px rgba(164,190,214,.45) !important;
  }

  #overview.router-overview-framework .ik-v420-timeline header,
  #overview.router-overview-framework .ik-v420-list header,
  .router-overview-framework .ik-v420-timeline header,
  .router-overview-framework .ik-v420-list header,
  .ik-v420-timeline header,
  .ik-v420-list header {
    min-height: 22px !important;
    margin: 0 !important;
    padding: 0 !important;
  }

  #overview.router-overview-framework .ik-v420-timeline header b,
  #overview.router-overview-framework .ik-v420-list header b,
  .router-overview-framework .ik-v420-timeline header b,
  .router-overview-framework .ik-v420-list header b,
  .ik-v420-timeline header b,
  .ik-v420-list header b { font-size: 12.5px !important; }

  #overview.router-overview-framework .ik-v420-timeline-row,
  .router-overview-framework .ik-v420-timeline-row,
  .ik-v420-timeline-row {
    grid-template-columns: minmax(0, 1fr) auto !important;
    gap: 8px !important;
    min-height: 44px !important;
    height: 44px !important;
    padding: 4px 0 !important;
    border-bottom: .5px solid rgba(198,214,229,.72) !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row > i,
  .router-overview-framework .ik-v420-timeline-row > i,
  .ik-v420-timeline-row > i { display: none !important; }

  #overview.router-overview-framework .ik-v420-timeline-row span,
  .router-overview-framework .ik-v420-timeline-row span,
  .ik-v420-timeline-row span { min-width: 0 !important; }

  #overview.router-overview-framework .ik-v420-timeline-row span b,
  .router-overview-framework .ik-v420-timeline-row span b,
  .ik-v420-timeline-row span b {
    font-size: 12px !important;
    line-height: 1.05 !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row em,
  .router-overview-framework .ik-v420-timeline-row em,
  .ik-v420-timeline-row em {
    font-size: 10px !important;
    line-height: 1.05 !important;
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row strong,
  .router-overview-framework .ik-v420-timeline-row strong,
  .ik-v420-timeline-row strong {
    font-size: 12px !important;
    line-height: 1 !important;
    white-space: nowrap !important;
  }

  #overview.router-overview-framework .ik-v420-list-row,
  .router-overview-framework .ik-v420-list-row,
  .ik-v420-list-row {
    grid-template-columns: 30px minmax(0, 1fr) auto !important;
    min-height: 54px !important;
    height: 54px !important;
    gap: 8px !important;
    padding: 4px 0 !important;
    border-bottom: .5px solid rgba(198,214,229,.72) !important;
  }

  #overview.router-overview-framework .ik-v503-device-icon,
  .router-overview-framework .ik-v503-device-icon,
  .ik-v503-device-icon {
    width: 28px !important;
    height: 28px !important;
    border-radius: 9px !important;
  }

  #overview.router-overview-framework .ik-v420-list-row span b,
  .router-overview-framework .ik-v420-list-row span b,
  .ik-v420-list-row span b {
    gap: 4px !important;
    flex-wrap: nowrap !important;
    font-size: 12.5px !important;
    line-height: 1.05 !important;
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
  }

  #overview.router-overview-framework .ik-v807-kind,
  .router-overview-framework .ik-v807-kind,
  .ik-v807-kind {
    height: 15px !important;
    padding: 0 5px !important;
    font-size: 8.5px !important;
    line-height: 15px !important;
  }

  #overview.router-overview-framework .ik-v420-list-row span em,
  .router-overview-framework .ik-v420-list-row span em,
  .ik-v420-list-row span em {
    display: block !important;
    font-size: 9.6px !important;
    line-height: 1.1 !important;
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
  }

  #overview.router-overview-framework .ik-v420-list-row u,
  .router-overview-framework .ik-v420-list-row u,
  .ik-v420-list-row u {
    height: 2px !important;
    margin-top: 3px !important;
  }

  #overview.router-overview-framework .ik-v420-list-row > strong,
  .router-overview-framework .ik-v420-list-row > strong,
  .ik-v420-list-row > strong { min-width: 48px !important; }

  #overview.router-overview-framework .ik-v420-list-row > strong b,
  .router-overview-framework .ik-v420-list-row > strong b,
  .ik-v420-list-row > strong b {
    font-size: 12px !important;
    line-height: 1 !important;
  }

  #overview.router-overview-framework .ik-v420-list-row > strong small,
  .router-overview-framework .ik-v420-list-row > strong small,
  .ik-v420-list-row > strong small {
    font-size: 9px !important;
    line-height: 1 !important;
  }

  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual,
  [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual {
    grid-template-rows: 14px repeat(3, 1fr) !important;
    gap: 5px !important;
  }

  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual header,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual header,
  [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual header { min-height: 14px !important; }

  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter,
  [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter {
    grid-template-columns: 34px minmax(0, 1fr) 43px 58px !important;
    gap: 6px !important;
    min-height: 18px !important;
  }

  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter small,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter small,
  [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter small {
    grid-column: 4 !important;
    grid-row: 1 !important;
    display: block !important;
    color: #718298 !important;
    font-size: 8.4px !important;
    line-height: 1 !important;
    white-space: nowrap !important;
    text-align: right !important;
  }

  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter > i,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter > i,
  [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter > i { height: 3px !important; }

  #overview.router-overview-framework .ik-v420-tabs,
  .router-overview-framework .ik-v420-tabs,
  .ik-v420-tabs {
    height: 66px !important;
    min-height: 66px !important;
    bottom: max(5px, env(safe-area-inset-bottom, 0px)) !important;
    padding: 4px 8px !important;
    border-radius: 22px !important;
    box-shadow: inset 0 0 0 .5px rgba(164,190,214,.54) !important;
  }

  #overview.router-overview-framework .ik-v420-tabs button,
  .router-overview-framework .ik-v420-tabs button,
  .ik-v420-tabs button {
    gap: 2px !important;
    min-height: 48px !important;
    font-size: 9px !important;
    background: transparent !important;
  }

  #overview.router-overview-framework .ik-v420-tabs button.is-active svg,
  .router-overview-framework .ik-v420-tabs button.is-active svg,
  .ik-v420-tabs button.is-active svg {
    width: 22px !important;
    height: 22px !important;
    padding: 2px !important;
    border-radius: 8px !important;
    background: rgba(20,115,230,.10) !important;
  }

  /* v813 density rebuild: compact read-only network monitor, no decorative bulk. */
  #overview.router-overview-framework .ik-v420-screen,
  .router-overview-framework .ik-v420-screen,
  .ik-v420-screen {
    padding: max(5px, env(safe-area-inset-top, 0px)) 11px calc(72px + env(safe-area-inset-bottom, 0px)) !important;
  }

  #overview.router-overview-framework .ik-v420-screen > * + *,
  .router-overview-framework .ik-v420-screen > * + *,
  .ik-v420-screen > * + * {
    margin-top: 5px !important;
  }

  #overview.router-overview-framework .ik-v420-nav,
  .router-overview-framework .ik-v420-nav,
  .ik-v420-nav {
    height: 48px !important;
    min-height: 48px !important;
    grid-template-columns: 32px minmax(0, 1fr) auto !important;
    gap: 7px !important;
  }

  #overview.router-overview-framework .ik-v420-nav button,
  .router-overview-framework .ik-v420-nav button,
  .ik-v420-nav button {
    width: 32px !important;
    height: 32px !important;
    border-radius: 10px !important;
    background: transparent !important;
    box-shadow: inset 0 0 0 .5px rgba(164,190,214,.40) !important;
  }

  #overview.router-overview-framework .ik-v420-nav div b,
  .router-overview-framework .ik-v420-nav div b,
  .ik-v420-nav div b {
    font-size: 15.2px !important;
    line-height: 1.02 !important;
  }

  #overview.router-overview-framework .ik-v420-nav div span,
  .router-overview-framework .ik-v420-nav div span,
  .ik-v420-nav div span {
    font-size: 10px !important;
    line-height: 1.05 !important;
  }

  #overview.router-overview-framework .ik-v420-nav strong,
  .router-overview-framework .ik-v420-nav strong,
  .ik-v420-nav strong {
    min-height: 20px !important;
    padding: 0 6px !important;
    font-size: 10px !important;
    background: transparent !important;
    box-shadow: inset 0 0 0 .5px rgba(164,190,214,.36) !important;
  }

  #overview.router-overview-framework .ik-v420-hero,
  .router-overview-framework .ik-v420-hero,
  .ik-v420-hero {
    display: grid !important;
    grid-template-rows: auto minmax(0, 1fr) auto !important;
    gap: 6px !important;
    height: 204px !important;
    min-height: 0 !important;
    padding: 10px 12px 9px !important;
    border-radius: 18px !important;
    background: linear-gradient(180deg, rgba(255,255,255,.96), rgba(246,250,254,.92)) !important;
    box-shadow: inset 0 0 0 .5px rgba(160,188,214,.48) !important;
  }

  #overview.router-overview-framework .ik-v420-app:not([data-overview-mobile-scene="single"]):not([data-overview-mobile-scene="fleet"]) .ik-v420-hero,
  .router-overview-framework .ik-v420-app:not([data-overview-mobile-scene="single"]):not([data-overview-mobile-scene="fleet"]) .ik-v420-hero,
  .ik-v420-app:not([data-overview-mobile-scene="single"]):not([data-overview-mobile-scene="fleet"]) .ik-v420-hero {
    height: 226px !important;
  }

  #overview.router-overview-framework .ik-v420-hero::before,
  .router-overview-framework .ik-v420-hero::before,
  .ik-v420-hero::before {
    top: 10px !important;
    bottom: auto !important;
    height: 42px !important;
    width: 2px !important;
    opacity: .76 !important;
  }

  #overview.router-overview-framework .ik-v620-hero-head,
  .router-overview-framework .ik-v620-hero-head,
  .ik-v620-hero-head {
    gap: 2px !important;
    min-width: 0 !important;
  }

  #overview.router-overview-framework .ik-v620-hero-head h1,
  .router-overview-framework .ik-v620-hero-head h1,
  .ik-v620-hero-head h1 {
    font-size: clamp(22px, 6.3vw, 27px) !important;
    line-height: 1 !important;
    letter-spacing: -.62px !important;
  }

  #overview.router-overview-framework .ik-v620-hero-head p,
  .router-overview-framework .ik-v620-hero-head p,
  .ik-v620-hero-head p {
    max-width: none !important;
    font-size: 10.4px !important;
    line-height: 1.08 !important;
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
  }

  #overview.router-overview-framework .ik-v620-hero-stage,
  .router-overview-framework .ik-v620-hero-stage,
  .ik-v620-hero-stage {
    display: grid !important;
    grid-template-columns: 84px minmax(0, 1fr) !important;
    grid-template-rows: 1fr !important;
    gap: 8px !important;
    min-height: 0 !important;
    align-items: stretch !important;
  }

  #overview.router-overview-framework .ik-v420-hero-stats,
  .router-overview-framework .ik-v420-hero-stats,
  .ik-v420-hero-stats {
    display: grid !important;
    grid-template-columns: 1fr !important;
    grid-template-rows: repeat(2, minmax(0, 1fr)) !important;
    gap: 4px !important;
    margin: 0 !important;
    padding: 0 !important;
    border: 0 !important;
  }

  #overview.router-overview-framework .ik-v420-hero-stats span,
  .router-overview-framework .ik-v420-hero-stats span,
  .ik-v420-hero-stats span,
  #overview.router-overview-framework .ik-v420-hero-stats span + span,
  .router-overview-framework .ik-v420-hero-stats span + span,
  .ik-v420-hero-stats span + span {
    display: grid !important;
    align-content: center !important;
    gap: 1px !important;
    min-height: 0 !important;
    padding: 5px 6px !important;
    border: 0 !important;
    border-radius: 10px !important;
    background: rgba(255,255,255,.48) !important;
    box-shadow: inset 0 0 0 .5px rgba(162,190,216,.34) !important;
  }

  #overview.router-overview-framework .ik-v420-hero-stats em,
  #overview.router-overview-framework .ik-v420-hero-stats small,
  .router-overview-framework .ik-v420-hero-stats em,
  .router-overview-framework .ik-v420-hero-stats small,
  .ik-v420-hero-stats em,
  .ik-v420-hero-stats small {
    margin: 0 !important;
    font-size: 8.6px !important;
    line-height: 1 !important;
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
  }

  #overview.router-overview-framework .ik-v420-hero-stats b,
  #overview.router-overview-framework .ik-v420-hero-stats .is-primary b,
  .router-overview-framework .ik-v420-hero-stats b,
  .router-overview-framework .ik-v420-hero-stats .is-primary b,
  .ik-v420-hero-stats b,
  .ik-v420-hero-stats .is-primary b {
    margin: 1px 0 0 !important;
    font-size: 15px !important;
    line-height: .98 !important;
    letter-spacing: -.28px !important;
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
  }

  #overview.router-overview-framework .ik-v420-visual,
  .router-overview-framework .ik-v420-visual,
  .ik-v420-visual {
    height: 76px !important;
    min-height: 0 !important;
    margin: 0 !important;
    padding: 6px !important;
    border-radius: 12px !important;
    background: rgba(255,255,255,.38) !important;
    box-shadow: inset 0 0 0 .5px rgba(166,194,218,.32) !important;
  }

  #overview.router-overview-framework .ik-v420-app:not([data-overview-mobile-scene="single"]):not([data-overview-mobile-scene="fleet"]) .ik-v420-visual,
  .router-overview-framework .ik-v420-app:not([data-overview-mobile-scene="single"]):not([data-overview-mobile-scene="fleet"]) .ik-v420-visual,
  .ik-v420-app:not([data-overview-mobile-scene="single"]):not([data-overview-mobile-scene="fleet"]) .ik-v420-visual {
    height: 84px !important;
  }

  #overview.router-overview-framework .ik-v812-trend-visual,
  .router-overview-framework .ik-v812-trend-visual,
  .ik-v812-trend-visual {
    grid-template-columns: minmax(0, 1fr) 48px !important;
    gap: 6px !important;
  }

  #overview.router-overview-framework .ik-v812-trend-visual aside em,
  .router-overview-framework .ik-v812-trend-visual aside em,
  .ik-v812-trend-visual aside em {
    font-size: 8px !important;
  }

  #overview.router-overview-framework .ik-v812-trend-visual aside b,
  .router-overview-framework .ik-v812-trend-visual aside b,
  .ik-v812-trend-visual aside b {
    font-size: 9.3px !important;
  }

  #overview.router-overview-framework .ik-v420-line-chart,
  .router-overview-framework .ik-v420-line-chart,
  .ik-v420-line-chart {
    height: 64px !important;
  }

  #overview.router-overview-framework .ik-v420-port-matrix,
  .router-overview-framework .ik-v420-port-matrix,
  .ik-v420-port-matrix {
    grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
    gap: 4px !important;
  }

  #overview.router-overview-framework .ik-v420-port-matrix span,
  .router-overview-framework .ik-v420-port-matrix span,
  .ik-v420-port-matrix span {
    min-height: 30px !important;
    padding: 4px 2px !important;
    border-radius: 8px !important;
  }

  #overview.router-overview-framework .ik-v420-port-matrix b,
  .router-overview-framework .ik-v420-port-matrix b,
  .ik-v420-port-matrix b {
    font-size: 9px !important;
  }

  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual,
  [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual {
    grid-template-rows: 13px repeat(3, 1fr) !important;
    gap: 4px !important;
  }

  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual header,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual header,
  [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual header {
    min-height: 13px !important;
  }

  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual header b,
  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual header span,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual header b,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual header span,
  [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual header b,
  [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual header span {
    font-size: 9px !important;
    line-height: 1 !important;
  }

  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter,
  [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter {
    grid-template-columns: 30px minmax(0, 1fr) 37px 52px !important;
    gap: 5px !important;
    min-height: 17px !important;
  }

  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter b,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter b,
  [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter b,
  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter .ik-v802-ring-value,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter .ik-v802-ring-value,
  [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter .ik-v802-ring-value,
  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter small,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter small,
  [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter small {
    font-size: 8.8px !important;
    line-height: 1 !important;
  }

  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter .ik-v802-ring-value,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter .ik-v802-ring-value,
  [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter .ik-v802-ring-value {
    font-size: 10.8px !important;
  }

  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter small,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter small,
  [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter small {
    grid-column: 4 !important;
  }

  #overview.router-overview-framework .ik-v503-hero-pills,
  .router-overview-framework .ik-v503-hero-pills,
  .ik-v503-hero-pills {
    margin-top: 0 !important;
    gap: 4px !important;
    overflow: hidden !important;
  }

  #overview.router-overview-framework .ik-v503-hero-pills span,
  .router-overview-framework .ik-v503-hero-pills span,
  .ik-v503-hero-pills span {
    min-height: 16px !important;
    max-width: 33% !important;
    padding: 0 5px !important;
    border-radius: 7px !important;
    font-size: 8.8px !important;
    line-height: 16px !important;
    background: transparent !important;
    box-shadow: none !important;
  }

  #overview.router-overview-framework .ik-v420-surface,
  .router-overview-framework .ik-v420-surface,
  .ik-v420-surface {
    gap: 0 !important;
    padding: 6px 10px 5px !important;
    border-radius: 15px !important;
    background: rgba(255,255,255,.78) !important;
    box-shadow: inset 0 0 0 .5px rgba(164,190,214,.42) !important;
  }

  #overview.router-overview-framework .ik-v420-timeline header,
  #overview.router-overview-framework .ik-v420-list header,
  .router-overview-framework .ik-v420-timeline header,
  .router-overview-framework .ik-v420-list header,
  .ik-v420-timeline header,
  .ik-v420-list header {
    min-height: 18px !important;
    margin: 0 !important;
  }

  #overview.router-overview-framework .ik-v420-timeline header b,
  #overview.router-overview-framework .ik-v420-list header b,
  .router-overview-framework .ik-v420-timeline header b,
  .router-overview-framework .ik-v420-list header b,
  .ik-v420-timeline header b,
  .ik-v420-list header b {
    font-size: 11.6px !important;
  }

  #overview.router-overview-framework .ik-v420-timeline header span,
  #overview.router-overview-framework .ik-v420-list header span,
  .router-overview-framework .ik-v420-timeline header span,
  .router-overview-framework .ik-v420-list header span,
  .ik-v420-timeline header span,
  .ik-v420-list header span {
    font-size: 9.5px !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row,
  .router-overview-framework .ik-v420-timeline-row,
  .ik-v420-timeline-row {
    height: 44px !important;
    min-height: 44px !important;
    padding: 4px 0 !important;
    grid-template-columns: 9px minmax(0, 1fr) auto !important;
    gap: 7px !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row > i,
  .router-overview-framework .ik-v420-timeline-row > i,
  .ik-v420-timeline-row > i {
    display: block !important;
    width: 6px !important;
    height: 6px !important;
    border-radius: 999px !important;
    box-shadow: 0 0 0 3px rgba(20,115,230,.07) !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row > i svg,
  .router-overview-framework .ik-v420-timeline-row > i svg,
  .ik-v420-timeline-row > i svg {
    display: none !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row span b,
  .router-overview-framework .ik-v420-timeline-row span b,
  .ik-v420-timeline-row span b {
    font-size: 11.6px !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row em,
  .router-overview-framework .ik-v420-timeline-row em,
  .ik-v420-timeline-row em {
    font-size: 9.3px !important;
    line-height: 1.05 !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row strong,
  .router-overview-framework .ik-v420-timeline-row strong,
  .ik-v420-timeline-row strong {
    font-size: 11.2px !important;
  }

  #overview.router-overview-framework .ik-v420-surface .ik-v420-list,
  .router-overview-framework .ik-v420-surface .ik-v420-list,
  .ik-v420-surface .ik-v420-list {
    padding-top: 5px !important;
  }

  #overview.router-overview-framework .ik-v420-list-row,
  .router-overview-framework .ik-v420-list-row,
  .ik-v420-list-row {
    height: 52px !important;
    min-height: 52px !important;
    padding: 4px 0 !important;
    grid-template-columns: 28px minmax(0, 1fr) auto !important;
    gap: 7px !important;
  }

  #overview.router-overview-framework .ik-v503-device-icon,
  .router-overview-framework .ik-v503-device-icon,
  .ik-v503-device-icon {
    width: 28px !important;
    height: 28px !important;
    border-radius: 8px !important;
  }

  #overview.router-overview-framework .ik-v420-list-row span b,
  .router-overview-framework .ik-v420-list-row span b,
  .ik-v420-list-row span b {
    font-size: 11.8px !important;
  }

  #overview.router-overview-framework .ik-v420-list-row span em,
  .router-overview-framework .ik-v420-list-row span em,
  .ik-v420-list-row span em {
    font-size: 9.4px !important;
    line-height: 1.05 !important;
  }

  #overview.router-overview-framework .ik-v420-list-row u,
  .router-overview-framework .ik-v420-list-row u,
  .ik-v420-list-row u {
    margin-top: 2px !important;
    height: 2px !important;
  }

  #overview.router-overview-framework .ik-v420-list-row > strong,
  .router-overview-framework .ik-v420-list-row > strong,
  .ik-v420-list-row > strong {
    min-width: 44px !important;
  }

  #overview.router-overview-framework .ik-v420-list-row > strong b,
  .router-overview-framework .ik-v420-list-row > strong b,
  .ik-v420-list-row > strong b {
    font-size: 11.4px !important;
  }

  #overview.router-overview-framework .ik-v420-tabs,
  .router-overview-framework .ik-v420-tabs,
  .ik-v420-tabs {
    height: 64px !important;
    min-height: 64px !important;
    bottom: max(4px, env(safe-area-inset-bottom, 0px)) !important;
    padding: 4px 7px !important;
    border-radius: 18px !important;
    box-shadow: inset 0 0 0 .5px rgba(164,190,214,.44) !important;
  }

  #overview.router-overview-framework .ik-v420-tabs button,
  .router-overview-framework .ik-v420-tabs button,
  .ik-v420-tabs button {
    min-height: 46px !important;
    border-radius: 10px !important;
    gap: 1px !important;
  }

  #overview.router-overview-framework .ik-v420-tabs button.is-active,
  .router-overview-framework .ik-v420-tabs button.is-active,
  .ik-v420-tabs button.is-active {
    background: transparent !important;
  }

  #overview.router-overview-framework .ik-v420-tabs button.is-active svg,
  .router-overview-framework .ik-v420-tabs button.is-active svg,
  .ik-v420-tabs button.is-active svg {
    width: 20px !important;
    height: 20px !important;
    padding: 0 !important;
    border-radius: 0 !important;
    background: transparent !important;
    filter: none !important;
  }

  /* v815 mobile density correction: read-only monitor first screen, not a decorative card page. */
  #overview.router-overview-framework .ik-v420-app,
  .router-overview-framework .ik-v420-app,
  .ik-v420-app {
    background: #f5f8fb !important;
  }

  #overview.router-overview-framework .ik-v420-screen,
  .router-overview-framework .ik-v420-screen,
  .ik-v420-screen {
    padding: max(4px, env(safe-area-inset-top, 0px)) 10px calc(70px + env(safe-area-inset-bottom, 0px)) !important;
  }

  #overview.router-overview-framework .ik-v420-screen > * + *,
  .router-overview-framework .ik-v420-screen > * + *,
  .ik-v420-screen > * + * {
    margin-top: 4px !important;
  }

  #overview.router-overview-framework .ik-v420-nav,
  .router-overview-framework .ik-v420-nav,
  .ik-v420-nav {
    height: 48px !important;
    min-height: 48px !important;
    grid-template-columns: 40px minmax(0, 1fr) auto !important;
    gap: 6px !important;
    padding: 0 !important;
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

  #overview.router-overview-framework .ik-v420-nav div b,
  .router-overview-framework .ik-v420-nav div b,
  .ik-v420-nav div b {
    font-size: 14.8px !important;
    line-height: 1.02 !important;
  }

  #overview.router-overview-framework .ik-v420-nav div span,
  .router-overview-framework .ik-v420-nav div span,
  .ik-v420-nav div span {
    font-size: 9.6px !important;
    line-height: 1.05 !important;
  }

  #overview.router-overview-framework .ik-v420-nav strong,
  .router-overview-framework .ik-v420-nav strong,
  .ik-v420-nav strong {
    min-height: 19px !important;
    padding: 0 6px !important;
    gap: 3px !important;
    font-size: 9.5px !important;
    background: transparent !important;
    box-shadow: inset 0 0 0 .5px rgba(135,164,192,.32) !important;
  }

  #overview.router-overview-framework .ik-v420-nav strong i,
  .router-overview-framework .ik-v420-nav strong i,
  .ik-v420-nav strong i {
    width: 4px !important;
    height: 4px !important;
    box-shadow: none !important;
  }

  #overview.router-overview-framework .ik-v420-hero,
  .router-overview-framework .ik-v420-hero,
  .ik-v420-hero {
    height: 208px !important;
    min-height: 0 !important;
    gap: 5px !important;
    padding: 9px 11px 8px !important;
    border-radius: 14px !important;
    background: linear-gradient(180deg, rgba(255,255,255,.96), rgba(248,251,254,.92)) !important;
    box-shadow: inset 0 0 0 .5px rgba(150,180,208,.42) !important;
  }

  #overview.router-overview-framework .ik-v420-app:not([data-overview-mobile-scene="single"]):not([data-overview-mobile-scene="fleet"]) .ik-v420-hero,
  .router-overview-framework .ik-v420-app:not([data-overview-mobile-scene="single"]):not([data-overview-mobile-scene="fleet"]) .ik-v420-hero,
  .ik-v420-app:not([data-overview-mobile-scene="single"]):not([data-overview-mobile-scene="fleet"]) .ik-v420-hero {
    height: 232px !important;
  }

  #overview.router-overview-framework .ik-v420-hero.is-danger,
  .router-overview-framework .ik-v420-hero.is-danger,
  .ik-v420-hero.is-danger,
  #overview.router-overview-framework .ik-v420-hero.is-missing,
  .router-overview-framework .ik-v420-hero.is-missing,
  .ik-v420-hero.is-missing {
    background: linear-gradient(180deg, rgba(255,255,255,.98), rgba(249,251,254,.94)) !important;
    box-shadow: inset 2px 0 0 rgba(217,48,37,.72), inset 0 0 0 .5px rgba(150,180,208,.38) !important;
  }

  #overview.router-overview-framework .ik-v420-hero::before,
  .router-overview-framework .ik-v420-hero::before,
  .ik-v420-hero::before {
    display: none !important;
  }

  #overview.router-overview-framework .ik-v620-hero-head,
  .router-overview-framework .ik-v620-hero-head,
  .ik-v620-hero-head {
    gap: 1px !important;
  }

  #overview.router-overview-framework .ik-v620-hero-head h1,
  .router-overview-framework .ik-v620-hero-head h1,
  .ik-v620-hero-head h1 {
    font-size: clamp(21px, 5.9vw, 25px) !important;
    line-height: 1 !important;
    letter-spacing: -.52px !important;
  }

  #overview.router-overview-framework .ik-v620-hero-head p,
  .router-overview-framework .ik-v620-hero-head p,
  .ik-v620-hero-head p {
    font-size: 10px !important;
    line-height: 1.05 !important;
  }

  #overview.router-overview-framework .ik-v620-hero-stage,
  .router-overview-framework .ik-v620-hero-stage,
  .ik-v620-hero-stage {
    grid-template-columns: 78px minmax(0, 1fr) !important;
    gap: 7px !important;
  }

  #overview.router-overview-framework .ik-v420-hero-stats,
  .router-overview-framework .ik-v420-hero-stats,
  .ik-v420-hero-stats {
    gap: 3px !important;
  }

  #overview.router-overview-framework .ik-v420-hero-stats span,
  .router-overview-framework .ik-v420-hero-stats span,
  .ik-v420-hero-stats span,
  #overview.router-overview-framework .ik-v420-hero-stats span + span,
  .router-overview-framework .ik-v420-hero-stats span + span,
  .ik-v420-hero-stats span + span {
    padding: 4px 5px !important;
    border-radius: 8px !important;
    background: rgba(255,255,255,.30) !important;
    box-shadow: inset 0 0 0 .5px rgba(150,180,208,.24) !important;
  }

  #overview.router-overview-framework .ik-v420-hero-stats em,
  #overview.router-overview-framework .ik-v420-hero-stats small,
  .router-overview-framework .ik-v420-hero-stats em,
  .router-overview-framework .ik-v420-hero-stats small,
  .ik-v420-hero-stats em,
  .ik-v420-hero-stats small {
    font-size: 8.2px !important;
  }

  #overview.router-overview-framework .ik-v420-hero-stats b,
  #overview.router-overview-framework .ik-v420-hero-stats .is-primary b,
  .router-overview-framework .ik-v420-hero-stats b,
  .router-overview-framework .ik-v420-hero-stats .is-primary b,
  .ik-v420-hero-stats b,
  .ik-v420-hero-stats .is-primary b {
    font-size: 14px !important;
    letter-spacing: -.18px !important;
  }

  #overview.router-overview-framework .ik-v420-visual,
  .router-overview-framework .ik-v420-visual,
  .ik-v420-visual {
    height: 74px !important;
    min-height: 0 !important;
    padding: 4px 0 0 !important;
    border-radius: 0 !important;
    background: transparent !important;
    box-shadow: inset 0 .5px 0 rgba(150,180,208,.26) !important;
  }

  #overview.router-overview-framework .ik-v420-app:not([data-overview-mobile-scene="single"]):not([data-overview-mobile-scene="fleet"]) .ik-v420-visual,
  .router-overview-framework .ik-v420-app:not([data-overview-mobile-scene="single"]):not([data-overview-mobile-scene="fleet"]) .ik-v420-visual,
  .ik-v420-app:not([data-overview-mobile-scene="single"]):not([data-overview-mobile-scene="fleet"]) .ik-v420-visual {
    height: 82px !important;
  }

  #overview.router-overview-framework .ik-v812-trend-visual,
  .router-overview-framework .ik-v812-trend-visual,
  .ik-v812-trend-visual {
    grid-template-columns: minmax(0, 1fr) 46px !important;
    gap: 5px !important;
  }

  #overview.router-overview-framework .ik-v420-line-chart,
  .router-overview-framework .ik-v420-line-chart,
  .ik-v420-line-chart {
    height: 62px !important;
  }

  #overview.router-overview-framework .ik-v420-gridline,
  .router-overview-framework .ik-v420-gridline,
  .ik-v420-gridline {
    stroke: rgba(132,162,190,.24) !important;
  }

  #overview.router-overview-framework .ik-v420-area,
  .router-overview-framework .ik-v420-area,
  .ik-v420-area {
    fill: rgba(20,115,230,.035) !important;
  }

  #overview.router-overview-framework .ik-v420-curve.is-main,
  .router-overview-framework .ik-v420-curve.is-main,
  .ik-v420-curve.is-main {
    stroke-width: 1.7px !important;
  }

  #overview.router-overview-framework .ik-v812-trend-visual aside em,
  .router-overview-framework .ik-v812-trend-visual aside em,
  .ik-v812-trend-visual aside em {
    font-size: 7.8px !important;
  }

  #overview.router-overview-framework .ik-v812-trend-visual aside b,
  .router-overview-framework .ik-v812-trend-visual aside b,
  .ik-v812-trend-visual aside b {
    font-size: 9px !important;
  }

  #overview.router-overview-framework .ik-v503-hero-pills,
  .router-overview-framework .ik-v503-hero-pills,
  .ik-v503-hero-pills {
    gap: 3px !important;
  }

  #overview.router-overview-framework .ik-v503-hero-pills span,
  .router-overview-framework .ik-v503-hero-pills span,
  .ik-v503-hero-pills span {
    min-height: 14px !important;
    max-width: 33% !important;
    padding: 0 3px !important;
    border-radius: 0 !important;
    font-size: 8.4px !important;
    line-height: 14px !important;
  }

  #overview.router-overview-framework .ik-v420-surface,
  .router-overview-framework .ik-v420-surface,
  .ik-v420-surface {
    padding: 5px 9px 4px !important;
    border-radius: 12px !important;
    background: rgba(255,255,255,.78) !important;
    box-shadow: inset 0 0 0 .5px rgba(150,180,208,.36) !important;
  }

  #overview.router-overview-framework .ik-v420-timeline header,
  #overview.router-overview-framework .ik-v420-list header,
  .router-overview-framework .ik-v420-timeline header,
  .router-overview-framework .ik-v420-list header,
  .ik-v420-timeline header,
  .ik-v420-list header {
    min-height: 16px !important;
  }

  #overview.router-overview-framework .ik-v420-timeline header b,
  #overview.router-overview-framework .ik-v420-list header b,
  .router-overview-framework .ik-v420-timeline header b,
  .router-overview-framework .ik-v420-list header b,
  .ik-v420-timeline header b,
  .ik-v420-list header b {
    font-size: 11px !important;
  }

  #overview.router-overview-framework .ik-v420-timeline header span,
  #overview.router-overview-framework .ik-v420-list header span,
  .router-overview-framework .ik-v420-timeline header span,
  .router-overview-framework .ik-v420-list header span,
  .ik-v420-timeline header span,
  .ik-v420-list header span {
    font-size: 9px !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row,
  .router-overview-framework .ik-v420-timeline-row,
  .ik-v420-timeline-row {
    height: 44px !important;
    min-height: 44px !important;
    padding: 4px 0 !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row span b,
  .router-overview-framework .ik-v420-timeline-row span b,
  .ik-v420-timeline-row span b {
    font-size: 11.2px !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row em,
  .router-overview-framework .ik-v420-timeline-row em,
  .ik-v420-timeline-row em {
    font-size: 9px !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row strong,
  .router-overview-framework .ik-v420-timeline-row strong,
  .ik-v420-timeline-row strong {
    font-size: 10.8px !important;
  }

  #overview.router-overview-framework .ik-v420-surface .ik-v420-list,
  .router-overview-framework .ik-v420-surface .ik-v420-list,
  .ik-v420-surface .ik-v420-list {
    padding-top: 4px !important;
  }

  #overview.router-overview-framework .ik-v420-list-row,
  .router-overview-framework .ik-v420-list-row,
  .ik-v420-list-row {
    height: 52px !important;
    min-height: 52px !important;
    padding: 4px 0 !important;
  }

  #overview.router-overview-framework .ik-v503-device-icon,
  .router-overview-framework .ik-v503-device-icon,
  .ik-v503-device-icon {
    width: 28px !important;
    height: 28px !important;
    border-radius: 7px !important;
    background: rgba(20,115,230,.06) !important;
    box-shadow: inset 0 0 0 .5px rgba(20,115,230,.14) !important;
  }

  #overview.router-overview-framework .ik-v420-list-row span b,
  .router-overview-framework .ik-v420-list-row span b,
  .ik-v420-list-row span b {
    font-size: 11.5px !important;
  }

  #overview.router-overview-framework .ik-v420-list-row span em,
  .router-overview-framework .ik-v420-list-row span em,
  .ik-v420-list-row span em {
    font-size: 9.2px !important;
  }

  #overview.router-overview-framework .ik-v420-list-row > strong b,
  .router-overview-framework .ik-v420-list-row > strong b,
  .ik-v420-list-row > strong b {
    font-size: 11px !important;
  }

  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual,
  [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual {
    grid-template-rows: 12px repeat(3, 1fr) !important;
    gap: 4px !important;
  }

  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter,
  [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter {
    grid-template-columns: 28px minmax(0, 1fr) 34px 50px !important;
    min-height: 17px !important;
    gap: 5px !important;
  }

  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter > i,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter > i,
  [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter > i {
    height: 3px !important;
  }

  #overview.router-overview-framework .ik-v420-tabs,
  .router-overview-framework .ik-v420-tabs,
  .ik-v420-tabs {
    left: 8px !important;
    right: 8px !important;
    bottom: max(4px, env(safe-area-inset-bottom, 0px)) !important;
    height: 64px !important;
    min-height: 64px !important;
    padding: 4px 7px !important;
    border-radius: 14px !important;
    background: rgba(255,255,255,.96) !important;
    box-shadow: inset 0 0 0 .5px rgba(150,180,208,.40) !important;
  }

  #overview.router-overview-framework .ik-v420-tabs button,
  .router-overview-framework .ik-v420-tabs button,
  .ik-v420-tabs button {
    min-height: 46px !important;
    border-radius: 8px !important;
    font-size: 8.8px !important;
  }

  /* v816 mobile density correction: keep the first screen factual, not decorative. */
  #overview.router-overview-framework .ik-v420-screen,
  .router-overview-framework .ik-v420-screen,
  .ik-v420-screen {
    padding: max(3px, env(safe-area-inset-top, 0px)) 9px calc(68px + env(safe-area-inset-bottom, 0px)) !important;
  }

  #overview.router-overview-framework .ik-v420-screen > * + *,
  .router-overview-framework .ik-v420-screen > * + *,
  .ik-v420-screen > * + * {
    margin-top: 3px !important;
  }

  #overview.router-overview-framework .ik-v420-nav,
  .router-overview-framework .ik-v420-nav,
  .ik-v420-nav {
    height: 48px !important;
    min-height: 48px !important;
    grid-template-columns: 38px minmax(0, 1fr) auto !important;
    gap: 5px !important;
  }

  #overview.router-overview-framework .ik-v420-nav button,
  .router-overview-framework .ik-v420-nav button,
  .ik-v420-nav button {
    width: 38px !important;
    height: 38px !important;
  }

  #overview.router-overview-framework .ik-v420-nav div,
  .router-overview-framework .ik-v420-nav div,
  .ik-v420-nav div {
    gap: 0 !important;
  }

  #overview.router-overview-framework .ik-v420-nav div b,
  .router-overview-framework .ik-v420-nav div b,
  .ik-v420-nav div b {
    font-size: 14.2px !important;
    line-height: 1 !important;
  }

  #overview.router-overview-framework .ik-v420-nav div span,
  .router-overview-framework .ik-v420-nav div span,
  .ik-v420-nav div span {
    font-size: 9.1px !important;
    line-height: 1.04 !important;
  }

  #overview.router-overview-framework .ik-v420-nav strong,
  .router-overview-framework .ik-v420-nav strong,
  .ik-v420-nav strong {
    min-height: 17px !important;
    padding: 0 5px !important;
    font-size: 9px !important;
    border-radius: 999px !important;
    background: rgba(255,255,255,.36) !important;
  }

  #overview.router-overview-framework .ik-v420-hero,
  .router-overview-framework .ik-v420-hero,
  .ik-v420-hero {
    height: 182px !important;
    min-height: 0 !important;
    padding: 8px 10px 7px !important;
    gap: 4px !important;
    border-radius: 12px !important;
    background: linear-gradient(180deg, rgba(255,255,255,.985), rgba(249,252,255,.94)) !important;
    box-shadow: inset 0 0 0 .5px rgba(148,178,206,.36) !important;
  }

  #overview.router-overview-framework .ik-v420-app:not([data-overview-mobile-scene="single"]):not([data-overview-mobile-scene="fleet"]) .ik-v420-hero,
  .router-overview-framework .ik-v420-app:not([data-overview-mobile-scene="single"]):not([data-overview-mobile-scene="fleet"]) .ik-v420-hero,
  .ik-v420-app:not([data-overview-mobile-scene="single"]):not([data-overview-mobile-scene="fleet"]) .ik-v420-hero {
    height: 198px !important;
    min-height: 0 !important;
    max-height: 198px !important;
  }

  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-hero,
  .router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-hero,
  .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-hero {
    height: 182px !important;
    min-height: 0 !important;
    max-height: 182px !important;
  }

  #overview.router-overview-framework .ik-v420-hero.is-danger,
  .router-overview-framework .ik-v420-hero.is-danger,
  .ik-v420-hero.is-danger,
  #overview.router-overview-framework .ik-v420-hero.is-missing,
  .router-overview-framework .ik-v420-hero.is-missing,
  .ik-v420-hero.is-missing {
    background: linear-gradient(180deg, rgba(255,255,255,.99), rgba(250,252,255,.96)) !important;
    box-shadow: inset 2px 0 0 rgba(217,48,37,.58), inset 0 0 0 .5px rgba(148,178,206,.34) !important;
  }

  #overview.router-overview-framework .ik-v620-hero-head h1,
  .router-overview-framework .ik-v620-hero-head h1,
  .ik-v620-hero-head h1 {
    font-size: clamp(20px, 5.5vw, 23px) !important;
    line-height: .98 !important;
  }

  #overview.router-overview-framework .ik-v620-hero-head p,
  .router-overview-framework .ik-v620-hero-head p,
  .ik-v620-hero-head p {
    font-size: 9.4px !important;
    line-height: 1.02 !important;
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
  }

  #overview.router-overview-framework .ik-v620-hero-stage,
  .router-overview-framework .ik-v620-hero-stage,
  .ik-v620-hero-stage {
    display: grid !important;
    grid-template-columns: 72px minmax(0, 1fr) !important;
    gap: 6px !important;
    align-items: start !important;
  }

  #overview.router-overview-framework .ik-v420-hero-stats,
  .router-overview-framework .ik-v420-hero-stats,
  .ik-v420-hero-stats {
    display: grid !important;
    grid-auto-rows: min-content !important;
    align-self: start !important;
    gap: 3px !important;
    margin-top: 0 !important;
  }

  #overview.router-overview-framework .ik-v420-hero-stats span,
  .router-overview-framework .ik-v420-hero-stats span,
  .ik-v420-hero-stats span,
  #overview.router-overview-framework .ik-v420-hero-stats span + span,
  .router-overview-framework .ik-v420-hero-stats span + span,
  .ik-v420-hero-stats span + span {
    min-height: 39px !important;
    padding: 4px 5px !important;
    align-content: center !important;
    background: rgba(255,255,255,.18) !important;
  }

  #overview.router-overview-framework .ik-v420-hero-stats b,
  #overview.router-overview-framework .ik-v420-hero-stats .is-primary b,
  .router-overview-framework .ik-v420-hero-stats b,
  .router-overview-framework .ik-v420-hero-stats .is-primary b,
  .ik-v420-hero-stats b,
  .ik-v420-hero-stats .is-primary b {
    font-size: 13.4px !important;
    line-height: .96 !important;
  }

  #overview.router-overview-framework .ik-v420-hero-stats em,
  #overview.router-overview-framework .ik-v420-hero-stats small,
  .router-overview-framework .ik-v420-hero-stats em,
  .router-overview-framework .ik-v420-hero-stats small,
  .ik-v420-hero-stats em,
  .ik-v420-hero-stats small {
    font-size: 7.8px !important;
    line-height: 1 !important;
  }

  #overview.router-overview-framework .ik-v420-visual,
  .router-overview-framework .ik-v420-visual,
  .ik-v420-visual {
    height: 72px !important;
    min-height: 0 !important;
    padding-top: 3px !important;
  }

  #overview.router-overview-framework .ik-v420-app:not([data-overview-mobile-scene="single"]):not([data-overview-mobile-scene="fleet"]) .ik-v420-visual,
  .router-overview-framework .ik-v420-app:not([data-overview-mobile-scene="single"]):not([data-overview-mobile-scene="fleet"]) .ik-v420-visual,
  .ik-v420-app:not([data-overview-mobile-scene="single"]):not([data-overview-mobile-scene="fleet"]) .ik-v420-visual {
    height: 76px !important;
    min-height: 0 !important;
    max-height: 76px !important;
  }

  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-visual,
  .router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-visual,
  .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-visual {
    height: 76px !important;
    min-height: 0 !important;
    max-height: 76px !important;
  }

  #overview.router-overview-framework .ik-v812-trend-visual,
  .router-overview-framework .ik-v812-trend-visual,
  .ik-v812-trend-visual {
    grid-template-columns: minmax(0, 1fr) 42px !important;
    gap: 4px !important;
  }

  #overview.router-overview-framework .ik-v420-line-chart,
  .router-overview-framework .ik-v420-line-chart,
  .ik-v420-line-chart {
    height: 60px !important;
  }

  #overview.router-overview-framework .ik-v503-hero-pills,
  .router-overview-framework .ik-v503-hero-pills,
  .ik-v503-hero-pills {
    gap: 2px !important;
  }

  #overview.router-overview-framework .ik-v503-hero-pills span,
  .router-overview-framework .ik-v503-hero-pills span,
  .ik-v503-hero-pills span {
    min-height: 13px !important;
    padding: 0 2px !important;
    font-size: 8px !important;
    line-height: 13px !important;
  }

  #overview.router-overview-framework .ik-v420-surface,
  .router-overview-framework .ik-v420-surface,
  .ik-v420-surface {
    padding: 4px 8px 3px !important;
    border-radius: 11px !important;
    background: rgba(255,255,255,.72) !important;
  }

  #overview.router-overview-framework .ik-v420-timeline header,
  #overview.router-overview-framework .ik-v420-list header,
  .router-overview-framework .ik-v420-timeline header,
  .router-overview-framework .ik-v420-list header,
  .ik-v420-timeline header,
  .ik-v420-list header {
    min-height: 14px !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row,
  .router-overview-framework .ik-v420-timeline-row,
  .ik-v420-timeline-row {
    height: 42px !important;
    min-height: 42px !important;
    padding: 3px 0 !important;
  }

  #overview.router-overview-framework .ik-v420-list-row,
  .router-overview-framework .ik-v420-list-row,
  .ik-v420-list-row {
    height: 50px !important;
    min-height: 50px !important;
    padding: 3px 0 !important;
  }

  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual,
  [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual {
    grid-template-rows: 10px repeat(3, 16px) !important;
    gap: 3px !important;
  }

  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter,
  [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter {
    grid-template-columns: 26px minmax(0, 1fr) 32px 48px !important;
    min-height: 16px !important;
  }

  /* v818 mobile density lock: read-only monitor density without extra decoration. */
  #overview.router-overview-framework .ik-v420-app,
  .router-overview-framework .ik-v420-app,
  .ik-v420-app {
    background: #f5f8fc !important;
  }

  #overview.router-overview-framework .ik-v420-nav,
  .router-overview-framework .ik-v420-nav,
  .ik-v420-nav {
    height: 50px !important;
    min-height: 50px !important;
  }

  #overview.router-overview-framework .ik-v420-nav strong,
  .router-overview-framework .ik-v420-nav strong,
  .ik-v420-nav strong {
    min-height: 18px !important;
    padding: 0 6px !important;
    font-size: 9.2px !important;
    box-shadow: inset 0 0 0 .5px rgba(150,180,208,.44) !important;
  }

  #overview.router-overview-framework .ik-v420-hero,
  .router-overview-framework .ik-v420-hero,
  .ik-v420-hero {
    height: 178px !important;
    border-radius: 12px !important;
    background: #fff !important;
    box-shadow: inset 0 0 0 .5px rgba(148,178,206,.34) !important;
  }

  #overview.router-overview-framework .ik-v420-app:not([data-overview-mobile-scene="single"]):not([data-overview-mobile-scene="fleet"]) .ik-v420-hero,
  .router-overview-framework .ik-v420-app:not([data-overview-mobile-scene="single"]):not([data-overview-mobile-scene="fleet"]) .ik-v420-hero,
  .ik-v420-app:not([data-overview-mobile-scene="single"]):not([data-overview-mobile-scene="fleet"]) .ik-v420-hero {
    height: 194px !important;
    max-height: 194px !important;
  }

  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-hero,
  .router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-hero,
  .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-hero {
    height: 184px !important;
    max-height: 184px !important;
  }

  #overview.router-overview-framework .ik-v420-visual,
  .router-overview-framework .ik-v420-visual,
  .ik-v420-visual {
    background: #fbfdff !important;
    box-shadow: inset 0 0 0 .5px rgba(171,197,220,.34) !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row,
  .router-overview-framework .ik-v420-timeline-row,
  .ik-v420-timeline-row {
    height: 44px !important;
    min-height: 44px !important;
  }

  #overview.router-overview-framework .ik-v420-list-row,
  .router-overview-framework .ik-v420-list-row,
  .ik-v420-list-row {
    height: 52px !important;
    min-height: 52px !important;
  }

  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual,
  [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual {
    grid-template-rows: repeat(3, 18px) !important;
    gap: 4px !important;
    align-content: center !important;
  }

  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual header,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual header,
  [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual header {
    display: none !important;
  }

  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter,
  [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter {
    grid-template-columns: 32px minmax(0, 1fr) 34px 56px !important;
    min-height: 18px !important;
    gap: 5px !important;
  }

  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter small,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter small,
  [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter small {
    display: block !important;
    color: #60758a !important;
    font-size: 8px !important;
    line-height: 1 !important;
    white-space: nowrap !important;
  }

  #overview.router-overview-framework .ik-v420-tabs,
  .router-overview-framework .ik-v420-tabs,
  .ik-v420-tabs {
    height: 66px !important;
    min-height: 66px !important;
    padding: 5px 7px !important;
    border-radius: 14px !important;
  }

  /* v821 product-incident density reset: read-only router monitor, not decorative card page. */
  #overview.router-overview-framework .ik-v420-screen,
  .router-overview-framework .ik-v420-screen,
  .ik-v420-screen {
    padding: max(2px, env(safe-area-inset-top, 0px)) 8px calc(66px + env(safe-area-inset-bottom, 0px)) !important;
    background: #f5f8fc !important;
  }

  #overview.router-overview-framework .ik-v420-screen > * + *,
  .router-overview-framework .ik-v420-screen > * + *,
  .ik-v420-screen > * + * {
    margin-top: 4px !important;
  }

  #overview.router-overview-framework .ik-v420-nav,
  .router-overview-framework .ik-v420-nav,
  .ik-v420-nav {
    height: 50px !important;
    min-height: 50px !important;
    max-height: 52px !important;
    grid-template-columns: 34px minmax(0, 1fr) auto !important;
    gap: 6px !important;
    margin: 0 !important;
    padding: 2px 0 !important;
  }

  #overview.router-overview-framework .ik-v420-nav button,
  .router-overview-framework .ik-v420-nav button,
  .ik-v420-nav button {
    width: 34px !important;
    height: 34px !important;
    border-radius: 9px !important;
    border-color: #d7e4ef !important;
    background: rgba(255,255,255,.78) !important;
    box-shadow: none !important;
  }

  #overview.router-overview-framework .ik-v420-nav svg,
  .router-overview-framework .ik-v420-nav svg,
  .ik-v420-nav svg {
    width: 17px !important;
    height: 17px !important;
    stroke-width: 2 !important;
  }

  #overview.router-overview-framework .ik-v420-nav div b,
  .router-overview-framework .ik-v420-nav div b,
  .ik-v420-nav div b {
    font-size: 14px !important;
    line-height: 1.05 !important;
    letter-spacing: -.01em !important;
  }

  #overview.router-overview-framework .ik-v420-nav div span,
  .router-overview-framework .ik-v420-nav div span,
  .ik-v420-nav div span {
    font-size: 9.4px !important;
    line-height: 1.1 !important;
    color: #60758a !important;
    white-space: normal !important;
  }

  #overview.router-overview-framework .ik-v420-nav strong,
  .router-overview-framework .ik-v420-nav strong,
  .ik-v420-nav strong {
    min-height: 18px !important;
    padding: 0 6px !important;
    border-radius: 999px !important;
    font-size: 9px !important;
    font-weight: 700 !important;
    background: rgba(255,255,255,.44) !important;
    box-shadow: inset 0 0 0 .5px rgba(150,180,208,.46) !important;
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
    height: 182px !important;
    max-height: 220px !important;
    min-height: 0 !important;
    padding: 7px 9px 6px !important;
    gap: 4px !important;
    border-radius: 12px !important;
    border: 1px solid #d9e6f0 !important;
    background: #fff !important;
    box-shadow: inset 0 0 0 .5px rgba(148,178,206,.26) !important;
    overflow: hidden !important;
  }

  #overview.router-overview-framework .ik-v420-app:not([data-overview-mobile-scene="single"]):not([data-overview-mobile-scene="fleet"]) .ik-v420-hero,
  .router-overview-framework .ik-v420-app:not([data-overview-mobile-scene="single"]):not([data-overview-mobile-scene="fleet"]) .ik-v420-hero,
  .ik-v420-app:not([data-overview-mobile-scene="single"]):not([data-overview-mobile-scene="fleet"]) .ik-v420-hero {
    height: 200px !important;
    max-height: 240px !important;
  }

  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-hero,
  .router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-hero,
  .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-hero {
    height: 190px !important;
    max-height: 240px !important;
  }

  #overview.router-overview-framework .ik-v420-hero.is-danger,
  .router-overview-framework .ik-v420-hero.is-danger,
  .ik-v420-hero.is-danger,
  #overview.router-overview-framework .ik-v420-hero.is-missing,
  .router-overview-framework .ik-v420-hero.is-missing,
  .ik-v420-hero.is-missing {
    background: linear-gradient(180deg, #fff, #fbfdff) !important;
    box-shadow: inset 2px 0 0 rgba(217,48,37,.62), inset 0 0 0 .5px rgba(148,178,206,.28) !important;
  }

  #overview.router-overview-framework .ik-v620-hero-head,
  .router-overview-framework .ik-v620-hero-head,
  .ik-v620-hero-head {
    min-height: 34px !important;
    gap: 1px !important;
  }

  #overview.router-overview-framework .ik-v620-hero-head h1,
  .router-overview-framework .ik-v620-hero-head h1,
  .ik-v620-hero-head h1 {
    font-size: clamp(20px, 5.6vw, 23px) !important;
    line-height: 1 !important;
  }

  #overview.router-overview-framework .ik-v620-hero-head p,
  .router-overview-framework .ik-v620-hero-head p,
  .ik-v620-hero-head p {
    font-size: 9.6px !important;
    line-height: 1.12 !important;
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
  }

  #overview.router-overview-framework .ik-v620-hero-stage,
  .router-overview-framework .ik-v620-hero-stage,
  .ik-v620-hero-stage {
    grid-template-columns: 82px minmax(0, 1fr) !important;
    min-height: 72px !important;
    gap: 6px !important;
  }

  #overview.router-overview-framework .ik-v420-hero-stats,
  .router-overview-framework .ik-v420-hero-stats,
  .ik-v420-hero-stats {
    gap: 3px !important;
  }

  #overview.router-overview-framework .ik-v420-hero-stats span,
  .router-overview-framework .ik-v420-hero-stats span,
  .ik-v420-hero-stats span,
  #overview.router-overview-framework .ik-v420-hero-stats span + span,
  .router-overview-framework .ik-v420-hero-stats span + span,
  .ik-v420-hero-stats span + span {
    min-height: 34px !important;
    padding: 3px 4px !important;
    border-radius: 7px !important;
    background: #f8fbfe !important;
  }

  #overview.router-overview-framework .ik-v420-hero-stats b,
  #overview.router-overview-framework .ik-v420-hero-stats .is-primary b,
  .router-overview-framework .ik-v420-hero-stats b,
  .router-overview-framework .ik-v420-hero-stats .is-primary b,
  .ik-v420-hero-stats b,
  .ik-v420-hero-stats .is-primary b {
    font-size: 12.8px !important;
    line-height: 1 !important;
  }

  #overview.router-overview-framework .ik-v420-hero-stats em,
  #overview.router-overview-framework .ik-v420-hero-stats small,
  .router-overview-framework .ik-v420-hero-stats em,
  .router-overview-framework .ik-v420-hero-stats small,
  .ik-v420-hero-stats em,
  .ik-v420-hero-stats small {
    font-size: 7.7px !important;
    line-height: 1 !important;
  }

  #overview.router-overview-framework .ik-v420-visual,
  .router-overview-framework .ik-v420-visual,
  .ik-v420-visual {
    height: 72px !important;
    min-height: 72px !important;
    padding: 2px 3px !important;
    border-radius: 8px !important;
    background: #fbfdff !important;
    box-shadow: inset 0 0 0 .5px rgba(171,197,220,.30) !important;
  }

  #overview.router-overview-framework .ik-v812-trend-visual,
  .router-overview-framework .ik-v812-trend-visual,
  .ik-v812-trend-visual {
    grid-template-columns: minmax(0, 1fr) 48px !important;
    gap: 4px !important;
    align-items: stretch !important;
  }

  #overview.router-overview-framework .ik-v420-line-chart,
  .router-overview-framework .ik-v420-line-chart,
  .ik-v420-line-chart {
    height: 62px !important;
  }

  #overview.router-overview-framework .ik-v812-trend-visual aside span,
  .router-overview-framework .ik-v812-trend-visual aside span,
  .ik-v812-trend-visual aside span {
    min-height: 18px !important;
    padding: 1px 2px !important;
  }

  #overview.router-overview-framework .ik-v503-hero-pills,
  .router-overview-framework .ik-v503-hero-pills,
  .ik-v503-hero-pills {
    display: grid !important;
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    gap: 1px 6px !important;
  }

  #overview.router-overview-framework .ik-v503-hero-pills span,
  .router-overview-framework .ik-v503-hero-pills span,
  .ik-v503-hero-pills span {
    min-height: 14px !important;
    padding: 0 2px !important;
    border-radius: 4px !important;
    background: transparent !important;
    font-size: 8px !important;
    line-height: 14px !important;
    white-space: nowrap !important;
    overflow: visible !important;
    text-overflow: clip !important;
  }

  #overview.router-overview-framework .ik-v420-surface,
  .router-overview-framework .ik-v420-surface,
  .ik-v420-surface {
    display: grid !important;
    gap: 4px !important;
    padding: 4px 7px 4px !important;
    border-radius: 10px !important;
    border: 1px solid #dfe9f3 !important;
    background: rgba(255,255,255,.78) !important;
    box-shadow: none !important;
  }

  #overview.router-overview-framework .ik-v420-timeline,
  .router-overview-framework .ik-v420-timeline,
  .ik-v420-timeline {
    display: grid !important;
    gap: 0 !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row,
  .router-overview-framework .ik-v420-timeline-row,
  .ik-v420-timeline-row {
    height: 44px !important;
    min-height: 44px !important;
    display: grid !important;
    grid-template-columns: 9px 56px minmax(66px, .8fr) minmax(0, 1fr) !important;
    gap: 5px !important;
    align-items: center !important;
    padding: 0 !important;
    border-bottom: 1px solid #edf3f8 !important;
    background: transparent !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row:last-child,
  .router-overview-framework .ik-v420-timeline-row:last-child,
  .ik-v420-timeline-row:last-child {
    border-bottom: 0 !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row > i,
  .router-overview-framework .ik-v420-timeline-row > i,
  .ik-v420-timeline-row > i {
    width: 6px !important;
    height: 6px !important;
    border-radius: 999px !important;
    background: #1473e6 !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row.is-danger > i,
  .router-overview-framework .ik-v420-timeline-row.is-danger > i,
  .ik-v420-timeline-row.is-danger > i {
    background: #d93025 !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row.is-warn > i,
  #overview.router-overview-framework .ik-v420-timeline-row.is-missing > i,
  .router-overview-framework .ik-v420-timeline-row.is-warn > i,
  .router-overview-framework .ik-v420-timeline-row.is-missing > i,
  .ik-v420-timeline-row.is-warn > i,
  .ik-v420-timeline-row.is-missing > i {
    background: #cf8424 !important;
  }

  #overview.router-overview-framework .ik-v821-row-title,
  .router-overview-framework .ik-v821-row-title,
  .ik-v821-row-title {
    color: #22364a !important;
    font-size: 11px !important;
    font-weight: 760 !important;
    line-height: 1 !important;
    white-space: nowrap !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row > strong,
  .router-overview-framework .ik-v420-timeline-row > strong,
  .ik-v420-timeline-row > strong {
    color: #102033 !important;
    font-size: 11.5px !important;
    font-weight: 780 !important;
    line-height: 1.05 !important;
    text-align: right !important;
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
  }

  #overview.router-overview-framework .ik-v821-row-note,
  .router-overview-framework .ik-v821-row-note,
  .ik-v821-row-note {
    color: #60758a !important;
    font-size: 9px !important;
    line-height: 1.05 !important;
    font-style: normal !important;
    text-align: right !important;
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
  }

  #overview.router-overview-framework .ik-v420-list header,
  .router-overview-framework .ik-v420-list header,
  .ik-v420-list header {
    min-height: 16px !important;
    height: 16px !important;
    padding: 0 !important;
    margin: 0 !important;
  }

  #overview.router-overview-framework .ik-v420-list-row,
  .router-overview-framework .ik-v420-list-row,
  .ik-v420-list-row {
    height: 52px !important;
    min-height: 52px !important;
    grid-template-columns: 28px minmax(0, 1fr) 56px !important;
    gap: 7px !important;
    padding: 3px 0 !important;
    border-bottom: 1px solid #edf3f8 !important;
  }

  #overview.router-overview-framework .ik-v503-device-icon,
  .router-overview-framework .ik-v503-device-icon,
  .ik-v503-device-icon {
    width: 28px !important;
    height: 28px !important;
    min-width: 28px !important;
    border-radius: 7px !important;
    background: rgba(20,115,230,.055) !important;
    box-shadow: inset 0 0 0 .5px rgba(20,115,230,.14) !important;
  }

  #overview.router-overview-framework .ik-v420-list-row span,
  .router-overview-framework .ik-v420-list-row span,
  .ik-v420-list-row span {
    gap: 1px !important;
    min-width: 0 !important;
  }

  #overview.router-overview-framework .ik-v420-list-row span b,
  .router-overview-framework .ik-v420-list-row span b,
  .ik-v420-list-row span b {
    font-size: 11.4px !important;
    line-height: 1.05 !important;
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
  }

  #overview.router-overview-framework .ik-v420-list-row span em,
  .router-overview-framework .ik-v420-list-row span em,
  .ik-v420-list-row span em {
    font-size: 9px !important;
    line-height: 1.08 !important;
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
  }

  #overview.router-overview-framework .ik-v420-list-row span u,
  .router-overview-framework .ik-v420-list-row span u,
  .ik-v420-list-row span u {
    height: 2px !important;
    margin-top: 1px !important;
  }

  #overview.router-overview-framework .ik-v420-list-row > strong,
  .router-overview-framework .ik-v420-list-row > strong,
  .ik-v420-list-row > strong {
    gap: 1px !important;
    text-align: right !important;
  }

  #overview.router-overview-framework .ik-v420-list-row > strong b,
  .router-overview-framework .ik-v420-list-row > strong b,
  .ik-v420-list-row > strong b {
    font-size: 11.2px !important;
    line-height: 1.05 !important;
    white-space: nowrap !important;
  }

  #overview.router-overview-framework .ik-v420-list-row > strong small,
  .router-overview-framework .ik-v420-list-row > strong small,
  .ik-v420-list-row > strong small {
    font-size: 8px !important;
    line-height: 1 !important;
    color: #72859a !important;
  }

  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual,
  [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual {
    grid-template-rows: repeat(3, 18px) !important;
    gap: 3px !important;
    align-content: center !important;
  }

  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter,
  [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter {
    grid-template-columns: 30px 36px 34px 52px minmax(0, 1fr) !important;
    min-height: 18px !important;
    gap: 4px !important;
    padding: 0 !important;
    background: transparent !important;
    border: 0 !important;
  }

  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter > i,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter > i,
  [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter > i {
    height: 3px !important;
  }

  #overview.router-overview-framework .ik-v420-tabs,
  .router-overview-framework .ik-v420-tabs,
  .ik-v420-tabs {
    left: 8px !important;
    right: 8px !important;
    bottom: max(2px, env(safe-area-inset-bottom, 0px)) !important;
    height: 64px !important;
    min-height: 64px !important;
    padding: 4px 7px !important;
    border-radius: 13px !important;
    background: rgba(255,255,255,.96) !important;
    box-shadow: inset 0 0 0 .5px rgba(150,180,208,.42) !important;
  }

  #overview.router-overview-framework .ik-v420-tabs button,
  .router-overview-framework .ik-v420-tabs button,
  .ik-v420-tabs button {
    min-height: 44px !important;
    border-radius: 7px !important;
    background: transparent !important;
    box-shadow: none !important;
    color: #7f91a5 !important;
    font-size: 8.6px !important;
  }

  #overview.router-overview-framework .ik-v420-tabs button.is-active,
  .router-overview-framework .ik-v420-tabs button.is-active,
  .ik-v420-tabs button.is-active {
    background: transparent !important;
    box-shadow: inset 0 2px 0 #1473e6 !important;
    color: #1473e6 !important;
  }

  #overview.router-overview-framework .ik-v420-tabs svg,
  .router-overview-framework .ik-v420-tabs svg,
  .ik-v420-tabs svg {
    width: 17px !important;
    height: 17px !important;
  }

  /* v824 mobile density pass: readonly monitor first, decoration last. */
  #overview.router-overview-framework .ik-v420-app,
  .router-overview-framework .ik-v420-app,
  .ik-v420-app {
    background: #f5f8fc !important;
  }

  #overview.router-overview-framework .ik-v420-screen,
  .router-overview-framework .ik-v420-screen,
  .ik-v420-screen {
    padding: max(2px, env(safe-area-inset-top, 0px)) 8px calc(64px + env(safe-area-inset-bottom, 0px)) !important;
  }

  #overview.router-overview-framework .ik-v420-nav,
  .router-overview-framework .ik-v420-nav,
  .ik-v420-nav {
    height: 48px !important;
    min-height: 48px !important;
    max-height: 50px !important;
  }

  #overview.router-overview-framework .ik-v420-nav button,
  .router-overview-framework .ik-v420-nav button,
  .ik-v420-nav button {
    width: 32px !important;
    height: 32px !important;
    border-radius: 8px !important;
  }

  #overview.router-overview-framework .ik-v420-nav div b,
  .router-overview-framework .ik-v420-nav div b,
  .ik-v420-nav div b {
    font-size: 13.6px !important;
  }

  #overview.router-overview-framework .ik-v420-nav div span,
  .router-overview-framework .ik-v420-nav div span,
  .ik-v420-nav div span {
    font-size: 9px !important;
    line-height: 1.08 !important;
  }

  #overview.router-overview-framework .ik-v420-nav strong,
  .router-overview-framework .ik-v420-nav strong,
  .ik-v420-nav strong {
    min-height: 16px !important;
    padding: 0 5px !important;
    font-size: 8.6px !important;
    background: rgba(255,255,255,.28) !important;
  }

  #overview.router-overview-framework .ik-v420-hero,
  .router-overview-framework .ik-v420-hero,
  .ik-v420-hero {
    height: 164px !important;
    max-height: 164px !important;
    padding: 6px 8px 5px !important;
    gap: 3px !important;
    background: #fff !important;
    box-shadow: inset 0 0 0 .5px rgba(148,178,206,.30) !important;
  }

  #overview.router-overview-framework .ik-v420-app:not([data-overview-mobile-scene="single"]):not([data-overview-mobile-scene="fleet"]) .ik-v420-hero,
  .router-overview-framework .ik-v420-app:not([data-overview-mobile-scene="single"]):not([data-overview-mobile-scene="fleet"]) .ik-v420-hero,
  .ik-v420-app:not([data-overview-mobile-scene="single"]):not([data-overview-mobile-scene="fleet"]) .ik-v420-hero {
    height: 178px !important;
    max-height: 178px !important;
  }

  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-hero,
  .router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-hero,
  .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-hero {
    height: 172px !important;
    max-height: 172px !important;
  }

  #overview.router-overview-framework .ik-v420-hero.is-danger,
  .router-overview-framework .ik-v420-hero.is-danger,
  .ik-v420-hero.is-danger,
  #overview.router-overview-framework .ik-v420-hero.is-missing,
  .router-overview-framework .ik-v420-hero.is-missing,
  .ik-v420-hero.is-missing {
    background: #fff !important;
    box-shadow: inset 2px 0 0 rgba(217,48,37,.50), inset 0 0 0 .5px rgba(148,178,206,.28) !important;
  }

  #overview.router-overview-framework .ik-v620-hero-head,
  .router-overview-framework .ik-v620-hero-head,
  .ik-v620-hero-head {
    min-height: 28px !important;
  }

  #overview.router-overview-framework .ik-v620-hero-head h1,
  .router-overview-framework .ik-v620-hero-head h1,
  .ik-v620-hero-head h1 {
    font-size: clamp(18px, 5vw, 21px) !important;
  }

  #overview.router-overview-framework .ik-v620-hero-head p,
  .router-overview-framework .ik-v620-hero-head p,
  .ik-v620-hero-head p {
    font-size: 9px !important;
  }

  #overview.router-overview-framework .ik-v620-hero-stage,
  .router-overview-framework .ik-v620-hero-stage,
  .ik-v620-hero-stage {
    grid-template-columns: 72px minmax(0, 1fr) !important;
    min-height: 66px !important;
    gap: 5px !important;
  }

  #overview.router-overview-framework .ik-v420-hero-stats span,
  .router-overview-framework .ik-v420-hero-stats span,
  .ik-v420-hero-stats span,
  #overview.router-overview-framework .ik-v420-hero-stats span + span,
  .router-overview-framework .ik-v420-hero-stats span + span,
  .ik-v420-hero-stats span + span {
    min-height: 31px !important;
    padding: 2px 3px !important;
    background: #fbfdff !important;
  }

  #overview.router-overview-framework .ik-v420-hero-stats b,
  #overview.router-overview-framework .ik-v420-hero-stats .is-primary b,
  .router-overview-framework .ik-v420-hero-stats b,
  .router-overview-framework .ik-v420-hero-stats .is-primary b,
  .ik-v420-hero-stats b,
  .ik-v420-hero-stats .is-primary b {
    font-size: 12px !important;
  }

  #overview.router-overview-framework .ik-v420-hero-stats span.is-danger:not(.is-primary) b,
  .router-overview-framework .ik-v420-hero-stats span.is-danger:not(.is-primary) b,
  .ik-v420-hero-stats span.is-danger:not(.is-primary) b {
    color: #102033 !important;
  }

  #overview.router-overview-framework .ik-v420-visual,
  .router-overview-framework .ik-v420-visual,
  .ik-v420-visual {
    height: 66px !important;
    min-height: 66px !important;
    padding: 1px 2px !important;
    background: #fbfdff !important;
  }

  #overview.router-overview-framework .ik-v420-line-chart,
  .router-overview-framework .ik-v420-line-chart,
  .ik-v420-line-chart {
    height: 58px !important;
  }

  #overview.router-overview-framework .ik-v812-trend-visual,
  .router-overview-framework .ik-v812-trend-visual,
  .ik-v812-trend-visual {
    grid-template-columns: minmax(0, 1fr) 43px !important;
  }

  #overview.router-overview-framework .ik-v812-trend-visual aside span,
  .router-overview-framework .ik-v812-trend-visual aside span,
  .ik-v812-trend-visual aside span {
    min-height: 17px !important;
    background: transparent !important;
  }

  #overview.router-overview-framework .ik-v503-hero-pills span,
  .router-overview-framework .ik-v503-hero-pills span,
  .ik-v503-hero-pills span {
    min-height: 12px !important;
    line-height: 12px !important;
    font-size: 7.8px !important;
  }

  #overview.router-overview-framework .ik-v420-surface,
  .router-overview-framework .ik-v420-surface,
  .ik-v420-surface {
    padding: 3px 7px !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row,
  .router-overview-framework .ik-v420-timeline-row,
  .ik-v420-timeline-row {
    height: 44px !important;
    min-height: 44px !important;
  }

  #overview.router-overview-framework .ik-v420-list-row,
  .router-overview-framework .ik-v420-list-row,
  .ik-v420-list-row {
    height: 52px !important;
    min-height: 52px !important;
  }

  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual,
  [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual {
    grid-template-rows: repeat(3, 16px) !important;
    gap: 2px !important;
  }

  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter,
  [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter {
    grid-template-columns: 28px 34px 32px 45px minmax(0, 1fr) !important;
    min-height: 16px !important;
  }

  #overview.router-overview-framework .ik-v420-tabs,
  .router-overview-framework .ik-v420-tabs,
  .ik-v420-tabs {
    height: 64px !important;
    min-height: 64px !important;
    padding: 4px 7px !important;
    border-radius: 12px !important;
  }

  #overview.router-overview-framework .ik-v420-tabs button,
  .router-overview-framework .ik-v420-tabs button,
  .ik-v420-tabs button {
    min-height: 44px !important;
    font-size: 8.2px !important;
  }

}

@media (max-width: 760px) {
  /* v826 mobile monitor density: structure carries facts; decoration is subordinate. */
  #overview.router-overview-framework .ik-v420-app,
  .router-overview-framework .ik-v420-app,
  .ik-v420-app {
    --ik-blue: #1473e6;
    --ik-ink: #102033;
    --ik-muted: #62758a;
    --ik-soft-line: #dde9f3;
    background: #f5f8fc !important;
  }

  #overview.router-overview-framework .ik-v420-screen,
  .router-overview-framework .ik-v420-screen,
  .ik-v420-screen {
    padding: max(2px, env(safe-area-inset-top, 0px)) 8px calc(64px + env(safe-area-inset-bottom, 0px)) !important;
  }

  #overview.router-overview-framework .ik-v420-screen > * + *,
  .router-overview-framework .ik-v420-screen > * + *,
  .ik-v420-screen > * + * {
    margin-top: 4px !important;
  }

  #overview.router-overview-framework .ik-v420-nav,
  .router-overview-framework .ik-v420-nav,
  .ik-v420-nav {
    height: 48px !important;
    min-height: 48px !important;
    max-height: 52px !important;
    grid-template-columns: 32px minmax(0, 1fr) auto !important;
    gap: 6px !important;
    padding: 0 !important;
  }

  #overview.router-overview-framework .ik-v420-nav button,
  .router-overview-framework .ik-v420-nav button,
  .ik-v420-nav button {
    width: 32px !important;
    height: 32px !important;
    border-radius: 8px !important;
    background: transparent !important;
    box-shadow: none !important;
  }

  #overview.router-overview-framework .ik-v420-nav div,
  .router-overview-framework .ik-v420-nav div,
  .ik-v420-nav div {
    gap: 0 !important;
  }

  #overview.router-overview-framework .ik-v420-nav div b,
  .router-overview-framework .ik-v420-nav div b,
  .ik-v420-nav div b {
    color: var(--ik-ink) !important;
    font-size: 13.8px !important;
    line-height: 1.04 !important;
    letter-spacing: -.01em !important;
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
  }

  #overview.router-overview-framework .ik-v420-nav div span,
  .router-overview-framework .ik-v420-nav div span,
  .ik-v420-nav div span {
    color: var(--ik-muted) !important;
    font-size: 9px !important;
    line-height: 1.06 !important;
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
  }

  #overview.router-overview-framework .ik-v420-nav strong,
  .router-overview-framework .ik-v420-nav strong,
  .ik-v420-nav strong {
    height: 18px !important;
    min-height: 18px !important;
    padding: 0 6px !important;
    gap: 3px !important;
    border-radius: 999px !important;
    color: var(--ik-blue) !important;
    background: transparent !important;
    box-shadow: inset 0 0 0 .5px rgba(133,164,194,.42) !important;
    font-size: 8.8px !important;
    font-weight: 720 !important;
    line-height: 18px !important;
  }

  #overview.router-overview-framework .ik-v420-nav strong i,
  .router-overview-framework .ik-v420-nav strong i,
  .ik-v420-nav strong i {
    width: 4px !important;
    height: 4px !important;
    box-shadow: none !important;
  }

  #overview.router-overview-framework .ik-v420-hero,
  .router-overview-framework .ik-v420-hero,
  .ik-v420-hero {
    display: grid !important;
    grid-template-rows: auto minmax(0, 1fr) auto !important;
    gap: 4px !important;
    height: 176px !important;
    min-height: 0 !important;
    max-height: 220px !important;
    padding: 7px 9px 6px !important;
    border: 1px solid #dce8f2 !important;
    border-radius: 10px !important;
    background: #fff !important;
    box-shadow: none !important;
    overflow: hidden !important;
  }

  #overview.router-overview-framework .ik-v420-app:not([data-overview-mobile-scene="single"]):not([data-overview-mobile-scene="fleet"]) .ik-v420-hero,
  .router-overview-framework .ik-v420-app:not([data-overview-mobile-scene="single"]):not([data-overview-mobile-scene="fleet"]) .ik-v420-hero,
  .ik-v420-app:not([data-overview-mobile-scene="single"]):not([data-overview-mobile-scene="fleet"]) .ik-v420-hero {
    height: 194px !important;
    max-height: 240px !important;
  }

  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-hero,
  .router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-hero,
  .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-hero {
    height: 184px !important;
    max-height: 240px !important;
  }

  #overview.router-overview-framework .ik-v420-hero.is-danger,
  .router-overview-framework .ik-v420-hero.is-danger,
  .ik-v420-hero.is-danger,
  #overview.router-overview-framework .ik-v420-hero.is-missing,
  .router-overview-framework .ik-v420-hero.is-missing,
  .ik-v420-hero.is-missing {
    background: linear-gradient(180deg, #fff, #fbfdff) !important;
    box-shadow: inset 2px 0 0 rgba(217,48,37,.52) !important;
  }

  #overview.router-overview-framework .ik-v420-hero::before,
  .router-overview-framework .ik-v420-hero::before,
  .ik-v420-hero::before {
    display: none !important;
  }

  #overview.router-overview-framework .ik-v620-hero-head,
  .router-overview-framework .ik-v620-hero-head,
  .ik-v620-hero-head {
    min-height: 28px !important;
    gap: 1px !important;
  }

  #overview.router-overview-framework .ik-v620-hero-head h1,
  .router-overview-framework .ik-v620-hero-head h1,
  .ik-v620-hero-head h1 {
    color: var(--ik-ink) !important;
    font-size: clamp(18px, 5vw, 21px) !important;
    line-height: 1 !important;
    letter-spacing: -.42px !important;
  }

  #overview.router-overview-framework .ik-v620-hero-head p,
  .router-overview-framework .ik-v620-hero-head p,
  .ik-v620-hero-head p {
    color: var(--ik-muted) !important;
    font-size: 9.2px !important;
    line-height: 1.08 !important;
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
  }

  #overview.router-overview-framework .ik-v620-hero-stage,
  .router-overview-framework .ik-v620-hero-stage,
  .ik-v620-hero-stage {
    display: grid !important;
    grid-template-columns: 112px minmax(0, 1fr) !important;
    gap: 6px !important;
    min-height: 0 !important;
    align-items: stretch !important;
  }

  #overview.router-overview-framework .ik-v420-hero-stats,
  .router-overview-framework .ik-v420-hero-stats,
  .ik-v420-hero-stats {
    display: grid !important;
    grid-template-columns: 1fr !important;
    grid-template-rows: repeat(4, minmax(0, 1fr)) !important;
    gap: 2px !important;
    margin: 0 !important;
    padding: 0 !important;
    border: 0 !important;
  }

  #overview.router-overview-framework .ik-v420-hero-stats span,
  .router-overview-framework .ik-v420-hero-stats span,
  .ik-v420-hero-stats span,
  #overview.router-overview-framework .ik-v420-hero-stats span + span,
  .router-overview-framework .ik-v420-hero-stats span + span,
  .ik-v420-hero-stats span + span {
    display: grid !important;
    grid-template-columns: 38px minmax(0, 1fr) !important;
    grid-template-areas: "label value" "note value" !important;
    align-content: center !important;
    min-height: 0 !important;
    padding: 2px 4px !important;
    border: 0 !important;
    border-radius: 5px !important;
    background: #f8fbfe !important;
    box-shadow: none !important;
  }

  #overview.router-overview-framework .ik-v420-hero-stats em,
  .router-overview-framework .ik-v420-hero-stats em,
  .ik-v420-hero-stats em {
    grid-area: label !important;
    color: #73859a !important;
    font-size: 7.8px !important;
    line-height: 1 !important;
    font-style: normal !important;
    white-space: nowrap !important;
  }

  #overview.router-overview-framework .ik-v420-hero-stats small,
  .router-overview-framework .ik-v420-hero-stats small,
  .ik-v420-hero-stats small {
    grid-area: note !important;
    color: #8d9caf !important;
    font-size: 7px !important;
    line-height: 1 !important;
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
  }

  #overview.router-overview-framework .ik-v420-hero-stats b,
  #overview.router-overview-framework .ik-v420-hero-stats .is-primary b,
  .router-overview-framework .ik-v420-hero-stats b,
  .router-overview-framework .ik-v420-hero-stats .is-primary b,
  .ik-v420-hero-stats b,
  .ik-v420-hero-stats .is-primary b {
    grid-area: value !important;
    align-self: center !important;
    min-width: 0 !important;
    margin: 0 !important;
    color: var(--ik-ink) !important;
    font-size: 10.8px !important;
    line-height: 1 !important;
    font-weight: 800 !important;
    letter-spacing: -.1px !important;
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
    text-align: right !important;
  }

  #overview.router-overview-framework .ik-v420-visual,
  .router-overview-framework .ik-v420-visual,
  .ik-v420-visual {
    height: 72px !important;
    min-height: 0 !important;
    max-height: 88px !important;
    margin: 0 !important;
    padding: 2px 3px !important;
    border-radius: 6px !important;
    background: transparent !important;
    box-shadow: inset 0 .5px 0 rgba(148,178,206,.26) !important;
  }

  #overview.router-overview-framework .ik-v420-app:not([data-overview-mobile-scene="single"]):not([data-overview-mobile-scene="fleet"]) .ik-v420-visual,
  .router-overview-framework .ik-v420-app:not([data-overview-mobile-scene="single"]):not([data-overview-mobile-scene="fleet"]) .ik-v420-visual,
  .ik-v420-app:not([data-overview-mobile-scene="single"]):not([data-overview-mobile-scene="fleet"]) .ik-v420-visual {
    height: 76px !important;
    max-height: 88px !important;
  }

  #overview.router-overview-framework .ik-v812-trend-visual,
  .router-overview-framework .ik-v812-trend-visual,
  .ik-v812-trend-visual {
    display: grid !important;
    grid-template-columns: minmax(0, 1fr) 46px !important;
    gap: 4px !important;
    height: 100% !important;
  }

  #overview.router-overview-framework .ik-v420-line-chart,
  .router-overview-framework .ik-v420-line-chart,
  .ik-v420-line-chart {
    height: 64px !important;
  }

  #overview.router-overview-framework .ik-v420-line-chart text,
  .router-overview-framework .ik-v420-line-chart text,
  .ik-v420-line-chart text {
    display: none !important;
  }

  #overview.router-overview-framework .ik-v420-curve.is-main,
  .router-overview-framework .ik-v420-curve.is-main,
  .ik-v420-curve.is-main {
    stroke-width: 1.55px !important;
  }

  #overview.router-overview-framework .ik-v812-trend-visual aside,
  .router-overview-framework .ik-v812-trend-visual aside,
  .ik-v812-trend-visual aside {
    display: grid !important;
    gap: 1px !important;
    align-content: center !important;
  }

  #overview.router-overview-framework .ik-v812-trend-visual aside span,
  .router-overview-framework .ik-v812-trend-visual aside span,
  .ik-v812-trend-visual aside span {
    min-height: 17px !important;
    padding: 0 !important;
    background: transparent !important;
  }

  #overview.router-overview-framework .ik-v812-trend-visual aside em,
  .router-overview-framework .ik-v812-trend-visual aside em,
  .ik-v812-trend-visual aside em {
    color: #75879b !important;
    font-size: 7.5px !important;
    line-height: 1 !important;
    font-style: normal !important;
  }

  #overview.router-overview-framework .ik-v812-trend-visual aside b,
  .router-overview-framework .ik-v812-trend-visual aside b,
  .ik-v812-trend-visual aside b {
    color: var(--ik-ink) !important;
    font-size: 8.8px !important;
    line-height: 1 !important;
    font-weight: 800 !important;
    white-space: nowrap !important;
  }

  #overview.router-overview-framework .ik-v503-hero-pills,
  .router-overview-framework .ik-v503-hero-pills,
  .ik-v503-hero-pills {
    display: grid !important;
    grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
    gap: 3px !important;
    min-height: 15px !important;
    overflow: hidden !important;
  }

  #overview.router-overview-framework .ik-v503-hero-pills span,
  .router-overview-framework .ik-v503-hero-pills span,
  .ik-v503-hero-pills span {
    min-width: 0 !important;
    max-width: none !important;
    height: 15px !important;
    min-height: 15px !important;
    padding: 0 2px !important;
    border-radius: 0 !important;
    color: #586c82 !important;
    background: transparent !important;
    box-shadow: none !important;
    font-size: 7.6px !important;
    line-height: 15px !important;
    font-weight: 700 !important;
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
  }

  #overview.router-overview-framework .ik-v420-port-matrix,
  .router-overview-framework .ik-v420-port-matrix,
  .ik-v420-port-matrix {
    display: grid !important;
    grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
    gap: 3px !important;
    height: 100% !important;
  }

  #overview.router-overview-framework .ik-v420-port-matrix span,
  .router-overview-framework .ik-v420-port-matrix span,
  .ik-v420-port-matrix span {
    display: grid !important;
    grid-template-columns: 5px auto minmax(0, 1fr) !important;
    gap: 3px !important;
    align-items: center !important;
    min-height: 34px !important;
    padding: 0 4px !important;
    border-radius: 4px !important;
    background: #fbfdff !important;
    box-shadow: inset 0 0 0 .5px rgba(171,197,220,.34) !important;
  }

  #overview.router-overview-framework .ik-v420-port-matrix span.is-danger,
  .router-overview-framework .ik-v420-port-matrix span.is-danger,
  .ik-v420-port-matrix span.is-danger {
    background: #fff !important;
    box-shadow: inset 2px 0 0 rgba(217,48,37,.48), inset 0 0 0 .5px rgba(171,197,220,.30) !important;
  }

  #overview.router-overview-framework .ik-v420-port-matrix i,
  .router-overview-framework .ik-v420-port-matrix i,
  .ik-v420-port-matrix i {
    width: 4px !important;
    height: 4px !important;
    box-shadow: none !important;
  }

  #overview.router-overview-framework .ik-v420-port-matrix b,
  .router-overview-framework .ik-v420-port-matrix b,
  .ik-v420-port-matrix b {
    color: var(--ik-ink) !important;
    font-size: 8.8px !important;
    line-height: 1 !important;
    font-weight: 780 !important;
    white-space: nowrap !important;
  }

  #overview.router-overview-framework .ik-v420-port-matrix em,
  .router-overview-framework .ik-v420-port-matrix em,
  .ik-v420-port-matrix em {
    min-width: 0 !important;
    color: #60758a !important;
    font-size: 7.6px !important;
    line-height: 1 !important;
    font-style: normal !important;
    text-align: right !important;
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
  }

  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-visual,
  .router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-visual,
  .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-visual {
    height: 76px !important;
    max-height: 88px !important;
    background: transparent !important;
  }

  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual,
  .router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual,
  .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual {
    display: grid !important;
    grid-template-columns: 1fr !important;
    grid-template-rows: repeat(3, 18px) !important;
    gap: 4px !important;
    align-content: center !important;
    height: 100% !important;
  }

  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual header,
  .router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual header,
  .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual header {
    display: none !important;
  }

  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter,
  .router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter,
  .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter {
    display: grid !important;
    grid-template-columns: 30px 36px 33px 48px minmax(0, 1fr) !important;
    grid-template-rows: 1fr !important;
    gap: 4px !important;
    align-items: center !important;
    min-height: 18px !important;
    padding: 0 !important;
    background: transparent !important;
    border: 0 !important;
    box-shadow: none !important;
  }

  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter::before,
  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter::after,
  .router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter::before,
  .router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter::after,
  .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter::before,
  .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter::after {
    content: none !important;
    display: none !important;
  }

  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter b,
  .router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter b,
  .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter b {
    grid-column: 1 !important;
    color: #435b73 !important;
    font-size: 8.8px !important;
    line-height: 1 !important;
    font-weight: 780 !important;
    text-align: left !important;
  }

  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter .ik-v802-ring-value,
  .router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter .ik-v802-ring-value,
  .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter .ik-v802-ring-value {
    position: static !important;
    grid-column: 2 !important;
    color: #9f3d38 !important;
    font-size: 10px !important;
    line-height: 1 !important;
    font-weight: 820 !important;
    text-align: right !important;
  }

  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter small,
  .router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter small,
  .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter small {
    display: block !important;
    grid-column: 3 !important;
    color: #687b90 !important;
    font-size: 7.6px !important;
    line-height: 1 !important;
    white-space: nowrap !important;
    text-align: right !important;
  }

  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter em,
  .router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter em,
  .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter em {
    display: block !important;
    grid-column: 4 !important;
    color: #687b90 !important;
    font-size: 7.6px !important;
    line-height: 1 !important;
    font-style: normal !important;
    text-align: right !important;
    white-space: nowrap !important;
  }

  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter > i,
  .router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter > i,
  .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter > i {
    grid-column: 5 !important;
    display: block !important;
    width: 100% !important;
    height: 2px !important;
    overflow: hidden !important;
    border-radius: 999px !important;
    background: rgba(178,204,226,.45) !important;
  }

  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter > i > i,
  .router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter > i > i,
  .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter > i > i {
    display: block !important;
    height: 100% !important;
    background: #d93025 !important;
  }

  #overview.router-overview-framework .ik-v420-surface,
  .router-overview-framework .ik-v420-surface,
  .ik-v420-surface {
    display: grid !important;
    gap: 3px !important;
    padding: 4px 7px 4px !important;
    border: 1px solid var(--ik-soft-line) !important;
    border-radius: 9px !important;
    background: rgba(255,255,255,.78) !important;
    box-shadow: none !important;
  }

  #overview.router-overview-framework .ik-v420-timeline,
  .router-overview-framework .ik-v420-timeline,
  .ik-v420-timeline,
  #overview.router-overview-framework .ik-v420-list,
  .router-overview-framework .ik-v420-list,
  .ik-v420-list {
    padding: 0 !important;
    border: 0 !important;
    border-radius: 0 !important;
    background: transparent !important;
    box-shadow: none !important;
  }

  #overview.router-overview-framework .ik-v420-list,
  .router-overview-framework .ik-v420-list,
  .ik-v420-list {
    padding-top: 3px !important;
    border-top: 1px solid #edf3f8 !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row,
  .router-overview-framework .ik-v420-timeline-row,
  .ik-v420-timeline-row {
    height: 44px !important;
    min-height: 44px !important;
    display: grid !important;
    grid-template-columns: 8px 54px minmax(70px, .82fr) minmax(0, 1fr) !important;
    gap: 5px !important;
    align-items: center !important;
    padding: 0 !important;
    border: 0 !important;
    border-bottom: 1px solid #edf3f8 !important;
    background: transparent !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row:last-child,
  .router-overview-framework .ik-v420-timeline-row:last-child,
  .ik-v420-timeline-row:last-child {
    border-bottom: 0 !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row > i,
  .router-overview-framework .ik-v420-timeline-row > i,
  .ik-v420-timeline-row > i {
    display: block !important;
    width: 5px !important;
    height: 5px !important;
    border-radius: 999px !important;
    background: var(--ik-blue) !important;
    box-shadow: none !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row.is-danger > i,
  .router-overview-framework .ik-v420-timeline-row.is-danger > i,
  .ik-v420-timeline-row.is-danger > i { background: #d93025 !important; }

  #overview.router-overview-framework .ik-v420-timeline-row.is-warn > i,
  #overview.router-overview-framework .ik-v420-timeline-row.is-missing > i,
  .router-overview-framework .ik-v420-timeline-row.is-warn > i,
  .router-overview-framework .ik-v420-timeline-row.is-missing > i,
  .ik-v420-timeline-row.is-warn > i,
  .ik-v420-timeline-row.is-missing > i { background: #c98023 !important; }

  #overview.router-overview-framework .ik-v821-row-title,
  .router-overview-framework .ik-v821-row-title,
  .ik-v821-row-title {
    color: #22364a !important;
    font-size: 10.8px !important;
    font-weight: 760 !important;
    line-height: 1 !important;
    white-space: nowrap !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row > strong,
  .router-overview-framework .ik-v420-timeline-row > strong,
  .ik-v420-timeline-row > strong {
    color: var(--ik-ink) !important;
    font-size: 11px !important;
    font-weight: 800 !important;
    line-height: 1.04 !important;
    text-align: right !important;
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
  }

  #overview.router-overview-framework .ik-v821-row-note,
  .router-overview-framework .ik-v821-row-note,
  .ik-v821-row-note {
    color: var(--ik-muted) !important;
    font-size: 8.8px !important;
    line-height: 1.04 !important;
    font-style: normal !important;
    text-align: right !important;
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
  }

  #overview.router-overview-framework .ik-v420-list header,
  .router-overview-framework .ik-v420-list header,
  .ik-v420-list header {
    min-height: 16px !important;
    height: 16px !important;
    padding: 0 !important;
    margin: 0 !important;
  }

  #overview.router-overview-framework .ik-v420-list header b,
  .router-overview-framework .ik-v420-list header b,
  .ik-v420-list header b {
    color: #182a3d !important;
    font-size: 10.8px !important;
    font-weight: 780 !important;
  }

  #overview.router-overview-framework .ik-v420-list header span,
  .router-overview-framework .ik-v420-list header span,
  .ik-v420-list header span {
    color: var(--ik-muted) !important;
    font-size: 8.8px !important;
    font-weight: 650 !important;
  }

  #overview.router-overview-framework .ik-v420-list-row,
  .router-overview-framework .ik-v420-list-row,
  .ik-v420-list-row {
    height: 52px !important;
    min-height: 52px !important;
    display: grid !important;
    grid-template-columns: 28px minmax(0, 1fr) 54px !important;
    gap: 7px !important;
    align-items: center !important;
    padding: 3px 0 !important;
    border: 0 !important;
    border-bottom: 1px solid #edf3f8 !important;
    background: transparent !important;
    box-shadow: none !important;
  }

  #overview.router-overview-framework .ik-v503-device-icon,
  .router-overview-framework .ik-v503-device-icon,
  .ik-v503-device-icon {
    width: 28px !important;
    height: 28px !important;
    min-width: 28px !important;
    border-radius: 6px !important;
    color: var(--ik-blue) !important;
    background: rgba(20,115,230,.055) !important;
    box-shadow: inset 0 0 0 .5px rgba(20,115,230,.14) !important;
  }

  #overview.router-overview-framework .ik-v420-list-row span,
  .router-overview-framework .ik-v420-list-row span,
  .ik-v420-list-row span {
    gap: 1px !important;
    min-width: 0 !important;
  }

  #overview.router-overview-framework .ik-v420-list-row span b,
  .router-overview-framework .ik-v420-list-row span b,
  .ik-v420-list-row span b {
    display: flex !important;
    gap: 3px !important;
    flex-wrap: nowrap !important;
    color: #17283a !important;
    font-size: 11.2px !important;
    line-height: 1.05 !important;
    font-weight: 780 !important;
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
  }

  #overview.router-overview-framework .ik-v807-kind,
  .router-overview-framework .ik-v807-kind,
  .ik-v807-kind {
    height: 14px !important;
    padding: 0 4px !important;
    border-radius: 4px !important;
    font-size: 7.6px !important;
    line-height: 14px !important;
  }

  #overview.router-overview-framework .ik-v420-list-row span em,
  .router-overview-framework .ik-v420-list-row span em,
  .ik-v420-list-row span em {
    display: block !important;
    color: var(--ik-muted) !important;
    font-size: 8.7px !important;
    line-height: 1.05 !important;
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
  }

  #overview.router-overview-framework .ik-v420-list-row span u,
  .router-overview-framework .ik-v420-list-row span u,
  .ik-v420-list-row span u {
    height: 2px !important;
    margin-top: 1px !important;
  }

  #overview.router-overview-framework .ik-v420-list-row > strong,
  .router-overview-framework .ik-v420-list-row > strong,
  .ik-v420-list-row > strong {
    gap: 1px !important;
    min-width: 54px !important;
    text-align: right !important;
  }

  #overview.router-overview-framework .ik-v420-list-row > strong b,
  .router-overview-framework .ik-v420-list-row > strong b,
  .ik-v420-list-row > strong b {
    color: var(--ik-ink) !important;
    font-size: 10.8px !important;
    line-height: 1.05 !important;
    font-weight: 820 !important;
    white-space: nowrap !important;
  }

  #overview.router-overview-framework .ik-v420-list-row > strong small,
  .router-overview-framework .ik-v420-list-row > strong small,
  .ik-v420-list-row > strong small {
    color: #72859a !important;
    font-size: 7.8px !important;
    line-height: 1 !important;
    background: transparent !important;
  }

  #overview.router-overview-framework .ik-v420-tabs,
  .router-overview-framework .ik-v420-tabs,
  .ik-v420-tabs {
    left: 8px !important;
    right: 8px !important;
    bottom: max(2px, env(safe-area-inset-bottom, 0px)) !important;
    height: 64px !important;
    min-height: 64px !important;
    padding: 4px 7px !important;
    border-radius: 12px !important;
    background: rgba(255,255,255,.96) !important;
    box-shadow: inset 0 0 0 .5px rgba(150,180,208,.42) !important;
  }

  #overview.router-overview-framework .ik-v420-tabs button,
  .router-overview-framework .ik-v420-tabs button,
  .ik-v420-tabs button {
    min-height: 44px !important;
    border-radius: 6px !important;
    background: transparent !important;
    box-shadow: none !important;
    color: #7f91a5 !important;
    font-size: 8.4px !important;
  }

  #overview.router-overview-framework .ik-v420-tabs button.is-active,
  .router-overview-framework .ik-v420-tabs button.is-active,
  .ik-v420-tabs button.is-active {
    background: transparent !important;
    box-shadow: inset 0 2px 0 var(--ik-blue) !important;
    color: var(--ik-blue) !important;
  }
}

@media (max-width: 760px) {
  /* v827 resource ledger clamp: no dial, no blue-red decoration, only three pressure facts. */
  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter,
  .router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter,
  .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter {
    grid-template-columns: 34px 38px 34px 48px minmax(0, 1fr) !important;
  }

  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter > i,
  .router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter > i,
  .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter > i {
    height: 2px !important;
    background-color: #d9e6f1 !important;
    background-image: none !important;
  }

  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter > i > i,
  .router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter > i > i,
  .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter > i > i {
    background-color: #c94139 !important;
    background-image: none !important;
  }

  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter .ik-v802-ring-value,
  .router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter .ik-v802-ring-value,
  .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter .ik-v802-ring-value {
    color: #b23f39 !important;
    font-size: 10px !important;
  }

  #overview.router-overview-framework .ik-v420-hero-stats b,
  #overview.router-overview-framework .ik-v420-hero-stats .is-primary b,
  .router-overview-framework .ik-v420-hero-stats b,
  .router-overview-framework .ik-v420-hero-stats .is-primary b,
  .ik-v420-hero-stats b,
  .ik-v420-hero-stats .is-primary b {
    font-size: 10px !important;
    max-width: none !important;
  }

  /* v829 resource incident rows: CPU/threshold/duration must be readable, not decorative. */
  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter,
  .router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter,
  .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter {
    grid-template-columns: 34px 36px 72px minmax(0, 1fr) !important;
    gap: 5px !important;
    min-height: 18px !important;
  }

  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter b,
  .router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter b,
  .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter b {
    font-size: 9px !important;
  }

  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter .ik-v802-ring-value,
  .router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter .ik-v802-ring-value,
  .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter .ik-v802-ring-value {
    font-size: 10.4px !important;
  }

  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter small,
  .router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter small,
  .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter small {
    font-size: 8.4px !important;
    letter-spacing: -.05px !important;
  }

  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter em,
  .router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter em,
  .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter em {
    display: none !important;
  }

  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter > i,
  .router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter > i,
  .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter > i {
    grid-column: 4 !important;
  }
}

@media (max-width: 760px) {
  /* v830 trust rail: forwarding health, collection reachability, snapshot freshness, business usability stay visually distinct. */
  #overview.router-overview-framework .ik-v830-trust-rail,
  .router-overview-framework .ik-v830-trust-rail,
  .ik-v830-trust-rail {
    display: grid !important;
    grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
    gap: 0 !important;
    min-height: 18px !important;
    padding-top: 2px !important;
    border-top: 1px solid var(--ik-line-soft) !important;
  }

  #overview.router-overview-framework .ik-v830-trust-rail span,
  .router-overview-framework .ik-v830-trust-rail span,
  .ik-v830-trust-rail span {
    display: grid !important;
    grid-template-columns: 1fr !important;
    gap: 1px !important;
    min-width: 0 !important;
    height: auto !important;
    min-height: 0 !important;
    padding: 0 4px !important;
    border-left: 1px solid var(--ik-line-soft) !important;
    background: transparent !important;
    box-shadow: none !important;
  }

  #overview.router-overview-framework .ik-v830-trust-rail span:first-child,
  .router-overview-framework .ik-v830-trust-rail span:first-child,
  .ik-v830-trust-rail span:first-child {
    border-left: 0 !important;
    padding-left: 0 !important;
  }

  #overview.router-overview-framework .ik-v830-trust-rail b,
  .router-overview-framework .ik-v830-trust-rail b,
  .ik-v830-trust-rail b {
    color: var(--ik-muted) !important;
    font-size: 7.4px !important;
    line-height: 1 !important;
    font-weight: 700 !important;
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
  }

  #overview.router-overview-framework .ik-v830-trust-rail strong,
  .router-overview-framework .ik-v830-trust-rail strong,
  .ik-v830-trust-rail strong {
    color: var(--ik-ink) !important;
    font-size: 9px !important;
    line-height: 1 !important;
    font-weight: 820 !important;
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
  }

  #overview.router-overview-framework .ik-v830-trust-rail .is-danger strong,
  .router-overview-framework .ik-v830-trust-rail .is-danger strong,
  .ik-v830-trust-rail .is-danger strong {
    color: var(--ik-danger) !important;
  }

  #overview.router-overview-framework .ik-v830-trust-rail .is-warn strong,
  #overview.router-overview-framework .ik-v830-trust-rail .is-missing strong,
  .router-overview-framework .ik-v830-trust-rail .is-warn strong,
  .router-overview-framework .ik-v830-trust-rail .is-missing strong,
  .ik-v830-trust-rail .is-warn strong,
  .ik-v830-trust-rail .is-missing strong {
    color: var(--ik-warn) !important;
  }

  #overview.router-overview-framework .ik-v420-port-matrix span,
  .router-overview-framework .ik-v420-port-matrix span,
  .ik-v420-port-matrix span {
    grid-template-columns: 5px 17px minmax(0, 1fr) !important;
    grid-template-areas: "dot port status" "dot carrier carrier" !important;
    min-height: 34px !important;
    gap: 2px 3px !important;
  }

  #overview.router-overview-framework .ik-v420-port-matrix i,
  .router-overview-framework .ik-v420-port-matrix i,
  .ik-v420-port-matrix i {
    grid-area: dot !important;
  }

  #overview.router-overview-framework .ik-v420-port-matrix b,
  .router-overview-framework .ik-v420-port-matrix b,
  .ik-v420-port-matrix b {
    grid-area: port !important;
  }

  #overview.router-overview-framework .ik-v420-port-matrix small,
  .router-overview-framework .ik-v420-port-matrix small,
  .ik-v420-port-matrix small {
    grid-area: carrier !important;
    min-width: 0 !important;
    color: var(--ik-muted) !important;
    font-size: 7.2px !important;
    line-height: 1 !important;
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
  }

  #overview.router-overview-framework .ik-v420-port-matrix em,
  .router-overview-framework .ik-v420-port-matrix em,
  .ik-v420-port-matrix em {
    grid-area: status !important;
    color: var(--ik-muted) !important;
    font-size: 7.2px !important;
    text-align: right !important;
  }
}

@media (max-width: 760px) {
  /* v840 density contract: read-only router App, no decorative card inflation. */
  #overview.router-overview-framework .ik-v420-app,
  .router-overview-framework .ik-v420-app,
  .ik-v420-app {
    background: #f4f8fc !important;
  }

  #overview.router-overview-framework .ik-v420-screen,
  .router-overview-framework .ik-v420-screen,
  .ik-v420-screen {
    padding: max(6px, env(safe-area-inset-top, 0px)) 14px calc(76px + env(safe-area-inset-bottom, 0px)) !important;
  }

  #overview.router-overview-framework .ik-v420-screen > * + *,
  .router-overview-framework .ik-v420-screen > * + *,
  .ik-v420-screen > * + * {
    margin-top: 6px !important;
  }

  #overview.router-overview-framework .ik-v420-nav,
  .router-overview-framework .ik-v420-nav,
  .ik-v420-nav {
    min-height: 48px !important;
    height: 50px !important;
    grid-template-columns: 32px minmax(0, 1fr) auto !important;
    gap: 8px !important;
  }

  #overview.router-overview-framework .ik-v420-nav button,
  .router-overview-framework .ik-v420-nav button,
  .ik-v420-nav button {
    width: 32px !important;
    height: 32px !important;
    border-radius: 8px !important;
    background: transparent !important;
    box-shadow: none !important;
  }

  #overview.router-overview-framework .ik-v420-nav div,
  .router-overview-framework .ik-v420-nav div,
  .ik-v420-nav div {
    gap: 0 !important;
  }

  #overview.router-overview-framework .ik-v420-nav div b,
  .router-overview-framework .ik-v420-nav div b,
  .ik-v420-nav div b {
    font-size: 16px !important;
    line-height: 1.04 !important;
    letter-spacing: -.28px !important;
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
  }

  #overview.router-overview-framework .ik-v420-nav div span,
  .router-overview-framework .ik-v420-nav div span,
  .ik-v420-nav div span {
    font-size: 10.6px !important;
    line-height: 1.15 !important;
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
  }

  #overview.router-overview-framework .ik-v420-nav strong,
  .router-overview-framework .ik-v420-nav strong,
  .ik-v420-nav strong {
    min-height: 20px !important;
    height: 20px !important;
    padding: 0 7px !important;
    gap: 4px !important;
    border-radius: 999px !important;
    background: transparent !important;
    box-shadow: inset 0 0 0 .5px rgba(20,115,230,.34) !important;
    font-size: 10px !important;
    font-weight: 760 !important;
  }

  #overview.router-overview-framework .ik-v420-nav strong i,
  .router-overview-framework .ik-v420-nav strong i,
  .ik-v420-nav strong i {
    width: 4px !important;
    height: 4px !important;
    box-shadow: none !important;
  }

  #overview.router-overview-framework .ik-v420-hero,
  .router-overview-framework .ik-v420-hero,
  .ik-v420-hero {
    display: grid !important;
    grid-template-rows: auto auto auto !important;
    gap: 7px !important;
    min-height: 0 !important;
    margin: 0 !important;
    padding: 10px 12px 9px !important;
    border-radius: 12px !important;
    overflow: hidden !important;
    background: linear-gradient(180deg, rgba(255,255,255,.98), rgba(249,252,255,.96)) !important;
    box-shadow: inset 0 0 0 .5px rgba(155,184,211,.54) !important;
  }

  #overview.router-overview-framework .ik-v420-hero::before,
  .router-overview-framework .ik-v420-hero::before,
  .ik-v420-hero::before {
    width: 2px !important;
    height: 34px !important;
    top: 12px !important;
    left: 0 !important;
    opacity: .82 !important;
  }

  #overview.router-overview-framework .ik-v620-hero-head,
  .router-overview-framework .ik-v620-hero-head,
  .ik-v620-hero-head {
    gap: 2px !important;
    padding-left: 0 !important;
  }

  #overview.router-overview-framework .ik-v620-hero-head h1,
  .router-overview-framework .ik-v620-hero-head h1,
  .ik-v620-hero-head h1 {
    font-size: 21px !important;
    line-height: 1.02 !important;
    letter-spacing: -.42px !important;
  }

  #overview.router-overview-framework .ik-v620-hero-head p,
  .router-overview-framework .ik-v620-hero-head p,
  .ik-v620-hero-head p {
    max-width: none !important;
    font-size: 10.8px !important;
    line-height: 1.18 !important;
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
  }

  #overview.router-overview-framework .ik-v620-hero-stage,
  .router-overview-framework .ik-v620-hero-stage,
  .ik-v620-hero-stage {
    grid-template-columns: 94px minmax(0, 1fr) !important;
    gap: 6px !important;
    min-height: 0 !important;
  }

  #overview.router-overview-framework .ik-v420-hero-stats,
  .router-overview-framework .ik-v420-hero-stats,
  .ik-v420-hero-stats {
    grid-template-rows: repeat(4, 16px) !important;
    gap: 2px !important;
  }

  #overview.router-overview-framework .ik-v420-hero-stats span,
  .router-overview-framework .ik-v420-hero-stats span,
  .ik-v420-hero-stats span,
  #overview.router-overview-framework .ik-v420-hero-stats span + span,
  .router-overview-framework .ik-v420-hero-stats span + span,
  .ik-v420-hero-stats span + span {
    grid-template-columns: 34px minmax(0, 1fr) !important;
    min-height: 16px !important;
    padding: 1px 3px !important;
    border-radius: 3px !important;
    background: transparent !important;
  }

  #overview.router-overview-framework .ik-v420-hero-stats em,
  .router-overview-framework .ik-v420-hero-stats em,
  .ik-v420-hero-stats em {
    font-size: 7.4px !important;
  }

  #overview.router-overview-framework .ik-v420-hero-stats small,
  .router-overview-framework .ik-v420-hero-stats small,
  .ik-v420-hero-stats small {
    display: none !important;
  }

  #overview.router-overview-framework .ik-v420-hero-stats b,
  #overview.router-overview-framework .ik-v420-hero-stats .is-primary b,
  #overview.router-overview-framework .ik-v420-hero-stats .is-danger b,
  #overview.router-overview-framework .ik-v420-hero-stats .is-warn b,
  #overview.router-overview-framework .ik-v420-hero-stats .is-missing b,
  .router-overview-framework .ik-v420-hero-stats b,
  .router-overview-framework .ik-v420-hero-stats .is-primary b,
  .router-overview-framework .ik-v420-hero-stats .is-danger b,
  .router-overview-framework .ik-v420-hero-stats .is-warn b,
  .router-overview-framework .ik-v420-hero-stats .is-missing b,
  .ik-v420-hero-stats b,
  .ik-v420-hero-stats .is-primary b,
  .ik-v420-hero-stats .is-danger b,
  .ik-v420-hero-stats .is-warn b,
  .ik-v420-hero-stats .is-missing b {
    font-size: 9.8px !important;
    line-height: 1 !important;
  }

  #overview.router-overview-framework .ik-v420-visual,
  .router-overview-framework .ik-v420-visual,
  .ik-v420-visual {
    height: 78px !important;
    min-height: 78px !important;
    max-height: 88px !important;
    padding: 0 !important;
    border-radius: 0 !important;
    background: transparent !important;
    box-shadow: none !important;
  }

  #overview.router-overview-framework .ik-v420-hero[data-overview-mobile-priority="wan-offline"] .ik-v620-hero-stage,
  #overview.router-overview-framework .ik-v420-hero[data-overview-mobile-priority="resource-full"] .ik-v620-hero-stage,
  #overview.router-overview-framework .ik-v420-hero[data-overview-mobile-priority="snapshot-missing"] .ik-v620-hero-stage,
  #overview.router-overview-framework .ik-v420-hero[data-overview-mobile-priority="collection-degraded"] .ik-v620-hero-stage,
  #overview.router-overview-framework .ik-v420-hero[data-overview-mobile-priority="interface-down"] .ik-v620-hero-stage,
  .router-overview-framework .ik-v420-hero[data-overview-mobile-priority="wan-offline"] .ik-v620-hero-stage,
  .router-overview-framework .ik-v420-hero[data-overview-mobile-priority="resource-full"] .ik-v620-hero-stage,
  .router-overview-framework .ik-v420-hero[data-overview-mobile-priority="snapshot-missing"] .ik-v620-hero-stage,
  .router-overview-framework .ik-v420-hero[data-overview-mobile-priority="collection-degraded"] .ik-v620-hero-stage,
  .router-overview-framework .ik-v420-hero[data-overview-mobile-priority="interface-down"] .ik-v620-hero-stage,
  .ik-v420-hero[data-overview-mobile-priority="wan-offline"] .ik-v620-hero-stage,
  .ik-v420-hero[data-overview-mobile-priority="resource-full"] .ik-v620-hero-stage,
  .ik-v420-hero[data-overview-mobile-priority="snapshot-missing"] .ik-v620-hero-stage,
  .ik-v420-hero[data-overview-mobile-priority="collection-degraded"] .ik-v620-hero-stage,
  .ik-v420-hero[data-overview-mobile-priority="interface-down"] .ik-v620-hero-stage {
    grid-template-columns: 1fr !important;
  }

  #overview.router-overview-framework .ik-v420-hero[data-overview-mobile-priority="wan-offline"] .ik-v420-hero-stats,
  #overview.router-overview-framework .ik-v420-hero[data-overview-mobile-priority="resource-full"] .ik-v420-hero-stats,
  #overview.router-overview-framework .ik-v420-hero[data-overview-mobile-priority="snapshot-missing"] .ik-v420-hero-stats,
  #overview.router-overview-framework .ik-v420-hero[data-overview-mobile-priority="collection-degraded"] .ik-v420-hero-stats,
  #overview.router-overview-framework .ik-v420-hero[data-overview-mobile-priority="interface-down"] .ik-v420-hero-stats,
  .router-overview-framework .ik-v420-hero[data-overview-mobile-priority="wan-offline"] .ik-v420-hero-stats,
  .router-overview-framework .ik-v420-hero[data-overview-mobile-priority="resource-full"] .ik-v420-hero-stats,
  .router-overview-framework .ik-v420-hero[data-overview-mobile-priority="snapshot-missing"] .ik-v420-hero-stats,
  .router-overview-framework .ik-v420-hero[data-overview-mobile-priority="collection-degraded"] .ik-v420-hero-stats,
  .router-overview-framework .ik-v420-hero[data-overview-mobile-priority="interface-down"] .ik-v420-hero-stats,
  .ik-v420-hero[data-overview-mobile-priority="wan-offline"] .ik-v420-hero-stats,
  .ik-v420-hero[data-overview-mobile-priority="resource-full"] .ik-v420-hero-stats,
  .ik-v420-hero[data-overview-mobile-priority="snapshot-missing"] .ik-v420-hero-stats,
  .ik-v420-hero[data-overview-mobile-priority="collection-degraded"] .ik-v420-hero-stats,
  .ik-v420-hero[data-overview-mobile-priority="interface-down"] .ik-v420-hero-stats {
    display: none !important;
  }

  #overview.router-overview-framework .ik-v812-trend-visual,
  .router-overview-framework .ik-v812-trend-visual,
  .ik-v812-trend-visual {
    grid-template-columns: minmax(0, 1fr) 62px !important;
    gap: 5px !important;
  }

  #overview.router-overview-framework .ik-v420-line-chart,
  .router-overview-framework .ik-v420-line-chart,
  .ik-v420-line-chart {
    height: 72px !important;
  }

  #overview.router-overview-framework .ik-v812-trend-visual aside span,
  .router-overview-framework .ik-v812-trend-visual aside span,
  .ik-v812-trend-visual aside span {
    display: flex !important;
    align-items: baseline !important;
    justify-content: space-between !important;
    gap: 4px !important;
    min-height: 16px !important;
  }

  #overview.router-overview-framework .ik-v812-trend-visual aside em,
  .router-overview-framework .ik-v812-trend-visual aside em,
  .ik-v812-trend-visual aside em {
    font-size: 7.6px !important;
  }

  #overview.router-overview-framework .ik-v812-trend-visual aside b,
  .router-overview-framework .ik-v812-trend-visual aside b,
  .ik-v812-trend-visual aside b {
    font-size: 8.6px !important;
  }

  #overview.router-overview-framework .ik-v830-trust-rail,
  .router-overview-framework .ik-v830-trust-rail,
  .ik-v830-trust-rail {
    min-height: 18px !important;
    padding-top: 4px !important;
  }

  #overview.router-overview-framework .ik-v420-port-matrix,
  .router-overview-framework .ik-v420-port-matrix,
  .ik-v420-port-matrix {
    grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
    gap: 3px !important;
  }

  #overview.router-overview-framework .ik-v420-port-matrix span,
  .router-overview-framework .ik-v420-port-matrix span,
  .ik-v420-port-matrix span {
    min-height: 34px !important;
    padding: 0 4px !important;
    border-radius: 4px !important;
    background: rgba(255,255,255,.72) !important;
  }

  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-visual,
  .router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-visual,
  .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-visual {
    height: 78px !important;
    min-height: 78px !important;
  }

  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual,
  .router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual,
  .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual {
    grid-template-rows: repeat(3, 19px) !important;
    gap: 5px !important;
    align-content: center !important;
  }

  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter,
  .router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter,
  .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter {
    grid-template-columns: 30px 34px 38px 48px minmax(0, 1fr) !important;
    gap: 4px !important;
    min-height: 19px !important;
  }

  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter b,
  .router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter b,
  .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter b,
  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter small,
  .router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter small,
  .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter small,
  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter em,
  .router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter em,
  .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter em {
    display: block !important;
    font-size: 8px !important;
    line-height: 1 !important;
    white-space: nowrap !important;
  }

  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter em,
  .router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter em,
  .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter em {
    grid-column: 4 !important;
  }

  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter em,
  .router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter em,
  .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter em {
    display: block !important;
    grid-column: 4 !important;
    color: #687b90 !important;
    font-size: 8px !important;
    line-height: 1 !important;
    font-style: normal !important;
    text-align: right !important;
    white-space: nowrap !important;
  }

  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter > i,
  .router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter > i,
  .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter > i {
    grid-column: 5 !important;
    height: 2px !important;
  }

  #overview.router-overview-framework .ik-v420-surface,
  .router-overview-framework .ik-v420-surface,
  .ik-v420-surface {
    gap: 5px !important;
    padding: 0 !important;
    border: 0 !important;
    border-radius: 0 !important;
    background: transparent !important;
  }

  #overview.router-overview-framework .ik-v420-timeline,
  .router-overview-framework .ik-v420-timeline,
  .ik-v420-timeline,
  #overview.router-overview-framework .ik-v420-list,
  .router-overview-framework .ik-v420-list,
  .ik-v420-list {
    padding: 0 12px !important;
    border-radius: 10px !important;
    background: rgba(255,255,255,.88) !important;
    box-shadow: inset 0 0 0 .5px rgba(155,184,211,.44) !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row,
  .router-overview-framework .ik-v420-timeline-row,
  .ik-v420-timeline-row {
    grid-template-areas: "dot title value" ". note note" !important;
    grid-template-rows: auto auto !important;
    grid-template-columns: 14px minmax(0, 1fr) auto !important;
    gap: 8px !important;
    min-height: 44px !important;
    padding: 4px 0 !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row > i,
  .router-overview-framework .ik-v420-timeline-row > i,
  .ik-v420-timeline-row > i {
    grid-area: dot !important;
    width: 6px !important;
    height: 6px !important;
    border-radius: 999px !important;
    background: var(--ik-blue) !important;
    box-shadow: none !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row.is-danger > i,
  .router-overview-framework .ik-v420-timeline-row.is-danger > i,
  .ik-v420-timeline-row.is-danger > i {
    background: var(--ik-danger) !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row.is-warn > i,
  #overview.router-overview-framework .ik-v420-timeline-row.is-missing > i,
  .router-overview-framework .ik-v420-timeline-row.is-warn > i,
  .router-overview-framework .ik-v420-timeline-row.is-missing > i,
  .ik-v420-timeline-row.is-warn > i,
  .ik-v420-timeline-row.is-missing > i {
    background: var(--ik-warn) !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row b,
  .router-overview-framework .ik-v420-timeline-row b,
  .ik-v420-timeline-row b {
    grid-area: title !important;
    font-size: 12px !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row strong,
  .router-overview-framework .ik-v420-timeline-row strong,
  .ik-v420-timeline-row strong {
    grid-area: value !important;
    font-size: 11.8px !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row em,
  .router-overview-framework .ik-v420-timeline-row em,
  .ik-v420-timeline-row em {
    grid-area: note !important;
    font-size: 10px !important;
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
    text-align: right !important;
  }

  #overview.router-overview-framework .ik-v420-list,
  .router-overview-framework .ik-v420-list,
  .ik-v420-list {
    padding-top: 7px !important;
    padding-bottom: 4px !important;
  }

  #overview.router-overview-framework .ik-v420-list header,
  .router-overview-framework .ik-v420-list header,
  .ik-v420-list header {
    min-height: 20px !important;
    padding: 0 0 3px !important;
  }

  #overview.router-overview-framework .ik-v420-list-row,
  .router-overview-framework .ik-v420-list-row,
  .ik-v420-list-row {
    grid-template-columns: 28px minmax(0, 1fr) auto !important;
    gap: 8px !important;
    min-height: 52px !important;
    padding: 0 !important;
  }

  #overview.router-overview-framework .ik-v420-list-row > i,
  .router-overview-framework .ik-v420-list-row > i,
  .ik-v420-list-row > i {
    width: 28px !important;
    height: 28px !important;
    border-radius: 6px !important;
  }

  #overview.router-overview-framework .ik-v420-list-row span b,
  .router-overview-framework .ik-v420-list-row span b,
  .ik-v420-list-row span b {
    font-size: 12px !important;
  }

  #overview.router-overview-framework .ik-v420-list-row span em,
  .router-overview-framework .ik-v420-list-row span em,
  .ik-v420-list-row span em {
    font-size: 9.5px !important;
  }

  #overview.router-overview-framework .ik-v420-list-row span u,
  .router-overview-framework .ik-v420-list-row span u,
  .ik-v420-list-row span u {
    height: 2px !important;
    opacity: .72 !important;
  }

  #overview.router-overview-framework .ik-v420-list-row > strong,
  .router-overview-framework .ik-v420-list-row > strong,
  .ik-v420-list-row > strong {
    min-width: 56px !important;
  }

  #overview.router-overview-framework .ik-v420-list-row > strong b,
  .router-overview-framework .ik-v420-list-row > strong b,
  .ik-v420-list-row > strong b {
    font-size: 11px !important;
  }

  #overview.router-overview-framework .ik-v420-tabs,
  .router-overview-framework .ik-v420-tabs,
  .ik-v420-tabs {
    left: 8px !important;
    right: 8px !important;
    bottom: max(2px, env(safe-area-inset-bottom, 0px)) !important;
    height: 64px !important;
    min-height: 64px !important;
    padding: 4px 7px !important;
    border-radius: 12px !important;
  }
}

`;

export function MobileOverviewStyles() {
  return <style>{V420_MOBILE_STYLES}</style>;
}