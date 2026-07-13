import {
  formatCompact,
  formatNumber,
  formatPercent,
  toNumber,
  type OverviewDerivedState,
  type OverviewRawSnapshot,
  type OverviewRawWanRow,
  type OverviewTone,
} from "./index";
import {
  buildRouterOsNetworkViewModel,
  routerOsNetworkPriority,
  routerOsResourceSustainedText,
  type RouterOsNetworkViewModel,
} from "./routerosNetworkViewModel";
import type { RouterOsTrustPlane } from "./routerosTrustModel";
import {
  resolveMobileIncidentAction,
  resolveMobileOverviewPolicy,
  type MobileAppHomeContract,
  type MobileHomeSurface,
  type MobileOverviewPriority,
  type MobilePrimaryListKind as PolicyMobilePrimaryListKind,
} from "./mobileOverviewPolicy";
import { buildMobileTrendChart } from "./mobileOverviewChartModel";
import {
  clean,
  compactRate,
  interfaceRows,
  latestSuccess,
  mobileRate,
  totals,
  wanLineCount,
  wanRows,
} from "./mobileOverviewData";
import { buildMobileImpactScope, buildMobilePrimaryList } from "./mobileOverviewListModel";
import {
  buildMobileIncidentTelemetry,
  type MobileIncidentTelemetryFact,
} from "./mobileOverviewTelemetry";

export type MobileMonitorPlane = RouterOsTrustPlane["id"];

export type MobileEvidenceLayer = "business" | "semantic" | "raw";
export type MobileEvidenceSource = "route" | "collection" | "snapshot" | "forwarding" | "business" | "resource" | "terminal" | "interface";
export type MobileEvidenceRole = "primary-impact" | "secondary-evidence" | "operational-context";

export interface MobileMonitorFact {
  label: string;
  value: string;
  note: string;
  tone: OverviewTone;
}

export interface MobileMonitorRow {
  id: string;
  title: string;
  value: string;
  note: string;
  tone: OverviewTone;
  coreBlock?: "wan" | "collection" | "resource";
}

export interface MobileMonitorListRow {
  id: string;
  rank: number | "";
  name: string;
  kind?: string;
  meta: string;
  value: string;
  status?: string;
  percent: number;
  tone: OverviewTone;
  evidenceLayer: MobileEvidenceLayer;
  evidenceSource: MobileEvidenceSource;
  evidenceRole: MobileEvidenceRole;
  evidenceKey: string;
}

export type MobileTrustPlane = RouterOsTrustPlane;

export interface MobileWanPort {
  id: string;
  label: string;
  name: string;
  note: string;
  carrier: string;
  stateText: string;
  portState: "up" | "down";
  role: "default" | "backup" | "member" | "summary";
  roleLabel: "é»˜è®¤å‡ºå£" | "å¤‡ç”¨å‡ºå£" | "æˆå‘˜å‡ºå£" | "æ±‡æ€»";
  impact: "default-route-affected" | "backup-affected" | "member-affected" | "not-affected";
  businessImpact: "internet-down" | "degraded-backup" | "no-primary-impact";
  routeBinding: "default-route" | "standby-route" | "member-route" | "unknown-route";
  layout: "single" | "pair" | "matrix" | "summary";
  tone: OverviewTone;
}

export type MobileHeroVisualKind = "trend" | "wan-ports" | "resource-bars" | "interface-list" | "trust-channels" | "incident-verdict";

export interface MobileTrendChartPoint {
  x: number;
  y: number;
}

export interface MobileTrendChartPlotModel {
  viewHeight: number;
  topY: number;
  baselineY: number;
  axisY: number;
  gridYs: [number, number, number];
  downPoints: string;
  upPoints: string;
  start: MobileTrendChartPoint;
  focus: MobileTrendChartPoint;
  peak: MobileTrendChartPoint;
  referenceY: number;
  breachX: number | null;
}

export interface MobileTrendChartModel {
  source: "history" | "current";
  windowText: string;
  sampleText: string;
  sampleLabel: string;
  decisionContract: "window-current-peak-reference-sample-high-point-source";
  decisionLabel: string;
  anomalyLabel: string;
  anomalyTone: OverviewTone;
  startLabel: string;
  endLabel: string;
  referenceLabel: string;
  referenceRatio: number;
  referenceValueLabel: string;
  breachLabel: string;
  currentLabel: string;
  peakLabel: string;
  down: number[];
  up: number[];
  readouts: MobileMonitorFact[];
  plot: MobileTrendChartPlotModel;
}

export type MobilePrimaryListKind = PolicyMobilePrimaryListKind;

export interface MobilePrimaryListModel {
  kind: MobilePrimaryListKind;
  title: string;
  meta: string;
  rows: MobileMonitorListRow[];
}

export interface MobileImpactScope {
  id: "internet-down" | "business-hidden" | "resource-constrained" | "carrier-unknown" | "collection-only" | "normal-ops";
  plane: "forwarding" | "collection" | "snapshot" | "business";
  label: string;
  value: string;
  note: string;
  tone: OverviewTone;
}

export interface MobileAbnormalDecisionCell {
  label: "å¯¹è±¡" | "å½±å“" | "å¯ä¿¡åº¦" | "ä¸‹ä¸€æ­¥";
  value: string;
  note: string;
  tone: OverviewTone;
  targetTab?: "network" | "diagnose";
}

export interface MobileHeroTrustCell {
  label: string;
  value: string;
  tone: OverviewTone;
}

export interface MobileHeroInterfaceCell {
  id: string;
  name: string;
  carrier: string;
  stateText: string;
  tone: OverviewTone;
}

export interface MobileHeroChannelCell {
  label: "RouterOS" | "REST" | "SSH" | "å¿«ç…§";
  value: string;
  tone: OverviewTone;
}

export interface MobileHeroResourceCell {
  key: "processor" | "memory" | "disk";
  label: string;
  display: string;
  thresholdText: string;
  sustainedText: string;
  meterPercent: string;
  risk: "primary-risk" | "secondary-risk";
  tone: OverviewTone;
}

export interface MobileNormalSummaryCell {
  id: "status" | "wan" | "collection" | "resource" | "snapshot";
  label: string;
  value: string;
  note: string;
  tone: OverviewTone;
}

export interface MobileOverviewModel {
  priority: MobileOverviewPriority;
  network: RouterOsNetworkViewModel;
  header: {
    deviceName: string;
    versionText: string;
    recent: string;
    statusLabel: string;
    tone: OverviewTone;
  };
  appHomeContract: MobileAppHomeContract;
  normalSummary: {
    mode: "normal-compact" | "incident-hidden";
    contract: "separate-conclusion-trust-four-facts-chart-first";
    cells: MobileNormalSummaryCell[];
  };
  surface: MobileHomeSurface;
  impactScope: MobileImpactScope;
  collectionTrustSeparation: {
    contract: "normal-hidden" | "collection-plane-primary-impact-verdict" | "collection-plane-secondary-impact-verdict-independent";
    collectionPlane: "collection";
    impactPlane: MobileImpactScope["plane"];
    separatedFromImpact: boolean;
  };
  abnormalDecision: MobileAbnormalDecisionCell[];
  collectionTrust: MobileHeroChannelCell[];
  coreMetrics: MobileMonitorFact[];
  incidentTelemetry: MobileIncidentTelemetryFact[];
  hero: {
    title: string;
    subtitle: string;
    facts: MobileMonitorFact[];
    pills: string[];
    trustRail: MobileHeroTrustCell[];
    interfaceCells: MobileHeroInterfaceCell[];
    channelCells: MobileHeroChannelCell[];
    resourceCells: MobileHeroResourceCell[];
    visualKind: MobileHeroVisualKind;
    showMetrics: boolean;
    trend: MobileTrendChartModel;
  };
  trustPlanes: MobileTrustPlane[];
  statusRows: MobileMonitorRow[];
  primaryList: MobilePrimaryListModel;
  wanPorts: MobileWanPort[];
}

function wanDisplayTotal(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): number {
  return Math.max(1, wanLineCount(snapshot, state));
}

function syntheticWanRow(index: number, state: OverviewDerivedState): OverviewRawWanRow {
  return {
    name: `wan-${index + 1}`,
    interface: `wan-${index + 1}`,
    running: !state.facts.wan.allOffline,
  } as OverviewRawWanRow;
}

function wanRoleLabel(index: number, total: number): string {
  if (total <= 1) return "ä¸»å‡ºå£";
  if (total === 2) return index === 0 ? "ä¸»å‡ºå£" : "å¤‡ç”¨å‡ºå£";
  return `çº¿è·¯ ${index + 1}`;
}



function stripRest(label: string): string {
  return clean(label.replace(/^REST\s*/i, ""), "å¯ç”¨");
}

function stripSsh(label: string): string {
  return clean(label.replace(/^SSH\s*/i, ""), "å¯ç”¨");
}

function trustText(state: OverviewDerivedState): string {
  if (state.scenario === "no-snapshot") return "ç¼ºå¤±";
  if (state.scenario === "collection-down" || state.facts.collection.dataStale || state.facts.freshness.history) return "ç¼“å­˜";
  return "å¿«ç…§æ–°é²œ";
}

function mobileRouteValue(state: OverviewDerivedState): string {
  if (state.facts.wan.allOffline) return "å¼‚å¸¸";
  if (state.facts.route.level === "danger") return "å¼‚å¸¸";
  if (state.scenario === "collection-down") return "å†å²å¿«ç…§";
  if (state.scenario === "interfaces-down") return "å¾…ç¡®è®¤";
  if (state.facts.route.level === "missing") return "å¾…ç¡®è®¤";
  if (state.scenario === "resource-full") return "æ´»åŠ¨é»˜è®¤è·¯ç”±";
  return "å¯ç”¨";
}

function priorityOf(state: OverviewDerivedState): MobileOverviewModel["priority"] {
  return routerOsNetworkPriority(state);
}

function headerTone(state: OverviewDerivedState): OverviewTone {
  if (state.scenario === "no-snapshot") return "missing";
  if (priorityOf(state) === "normal") return "ok";
  return state.verdict.level;
}

function headerStatusLabel(state: OverviewDerivedState): string {
  if (state.scenario === "no-snapshot") return "å¾…é‡‡é›†";
  if (priorityOf(state) === "normal") return "å¯ç”¨";
  if (state.scenario === "all-offline" || state.facts.wan.allOffline) return "æ–­é“¾";
  if (state.scenario === "resource-full") return "è¶…é˜ˆ";
  if (state.scenario === "interfaces-down") return "å¼‚å¸¸";
  if (state.scenario === "collection-down" || state.facts.collection.dataStale || state.facts.freshness.history) return "éœ€ç¡®è®¤";
  if (state.verdict.level === "warn") return "éœ€ç¡®è®¤";
  return "å¯ç”¨";
}

function headerDeviceName(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): string {
  const candidates = [
    snapshot.overview?.identity,
    state.facts.device.identity,
    snapshot.identity,
    snapshot.deviceName,
    snapshot.name,
  ].map((value) => clean(value));
  return candidates.find((value) => value !== "-" && !/(?:æ— å¯ç”¨å¿«ç…§|ä¸šåŠ¡æ•°æ®ä¸å¯åˆ¤|é‡‡é›†ä¸å®Œæ•´|èµ„æºè¿‡è½½|å¤–ç½‘ä¸å¯ç”¨|æ¥å£å¼‚å¸¸)/.test(value)) || "RouterOS è®¾å¤‡";
}

function headerModel(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): MobileOverviewModel["header"] {
  const deviceName = headerDeviceName(snapshot, state);
  const version = clean(snapshot.version || snapshot.routerosVersion || state.facts.device.version || "RouterOS");
  return {
    deviceName,
    versionText: /^RouterOS\b/i.test(version) ? version : `RouterOS ${version}`,
    recent: latestSuccess(snapshot, state),
    statusLabel: headerStatusLabel(state),
    tone: headerTone(state),
  };
}

function heroVisualKind(priority: MobileOverviewModel["priority"]): MobileHeroVisualKind {
  if (priority === "wan-offline") return "incident-verdict";
  if (priority === "resource-full") return "resource-bars";
  if (priority === "interface-down") return "interface-list";
  if (priority === "snapshot-missing" || priority === "collection-degraded") return "trust-channels";
  return "trend";
}

function showHeroMetrics(): boolean {
  return false;
}

function resourceFacts(state: OverviewDerivedState): MobileMonitorFact[] {
  const hidden = state.scenario === "no-snapshot";
  return [
    { label: "å¤„ç†å™¨", raw: toNumber(state.facts.resource.cpu), threshold: 85 },
    { label: "å†…å­˜", raw: toNumber(state.facts.resource.memory), threshold: 85 },
    { label: "ç£ç›˜", raw: toNumber(state.facts.resource.disk), threshold: 90 },
  ].map((item) => ({
    label: item.label,
    value: hidden ? "ä¸å±•ç¤º" : formatPercent(item.raw, state.scenario === "resource-full" ? 1 : 0),
    note: hidden ? "æ— å¿«ç…§" : `é˜ˆ${item.threshold}% Â· ${routerOsResourceSustainedText(item.raw, item.threshold)}`,
    tone: hidden ? "missing" : item.raw >= item.threshold ? "danger" : "ok",
  }));
}

function titleFor(network: RouterOsNetworkViewModel): string {
  if (network.priority === "normal") return "ç½‘ç»œå¯ç”¨";
  if (network.priority === "wan-offline") return "å¤–ç½‘ä¸å¯ç”¨";
  if (network.priority === "snapshot-missing") return "ä¸šåŠ¡æ•°æ®ä¸å¯åˆ¤";
  if (network.priority === "collection-degraded") return "é‡‡é›†ä¸å®Œæ•´";
  if (network.priority === "resource-full") return "èµ„æºè¿‡è½½";
  if (network.priority === "interface-down") return "æ¥å£å¼‚å¸¸";
  return network.conclusion.value;
}

function subtitleFor(
  snapshot: OverviewRawSnapshot,
  state: OverviewDerivedState,
  network: RouterOsNetworkViewModel,
  scope: MobileImpactScope,
): string {
  if (network.priority === "normal") {
    return `WAN ${formatNumber(state.facts.wan.online)}/${formatNumber(wanDisplayTotal(snapshot, state) || 1)} Â· é»˜è®¤è·¯ç”±${mobileRouteValue(state)} Â· å¿«ç…§ ${latestSuccess(snapshot, state)}`;
  }
  if (network.priority === "wan-offline") return `é»˜è®¤å‡ºå£ä¸å¯æ‰¿è½½ Â· æœ€è¿‘æˆåŠŸ ${latestSuccess(snapshot, state)}`;
  if (network.priority === "snapshot-missing") return `æœ€è¿‘æˆåŠŸ ${latestSuccess(snapshot, state)} Â· å½“å‰æŒ‡æ ‡ä¸å±•ç¤º`;
  if (network.priority === "collection-degraded") return `å½“å‰ä½¿ç”¨ç¼“å­˜å¿«ç…§ Â· æœ€è¿‘æˆåŠŸ ${latestSuccess(snapshot, state)}`;
  if (network.priority === "resource-full") return "ä¸šåŠ¡ä»å¯ç”¨ Â· èµ„æºé˜ˆå€¼æŒç»­è¶…é™";
  if (network.priority === "interface-down") return `éƒ¨åˆ†æ¥å£ä¸å¯ç”¨ Â· é»˜è®¤è·¯ç”±${mobileRouteValue(state)}`;
  return scope.value;
}

function heroFacts(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): MobileMonitorFact[] {
  const priority = priorityOf(state);
  const totalWan = wanDisplayTotal(snapshot, state);
  const rate = totals(snapshot);
  if (priority === "snapshot-missing") {
    return [
      { label: "RouterOS", value: "ä¸å¯è¾¾", note: "å½“å‰", tone: "danger" },
      { label: "å¿«ç…§", value: "ç¼ºå¤±", note: "ä¸šåŠ¡", tone: "missing" },
      { label: "å½±å“", value: "ä¸å±•ç¤º", note: "ä¸šåŠ¡æ•°æ®", tone: "missing" },
      { label: "æˆåŠŸ", value: latestSuccess(snapshot, state), note: "æœ€è¿‘", tone: latestSuccess(snapshot, state) === "æœªè®°å½•" ? "warn" : "trust" },
    ];
  }
  if (priority === "wan-offline") {
    return [
      { label: "WAN", value: `0/${formatNumber(totalWan)}`, note: "å…¨éƒ¨ç¦»çº¿", tone: "danger" },
      { label: "è·¯ç”±", value: "å¼‚å¸¸", note: "é»˜è®¤", tone: "danger" },
      { label: "å¤–ç½‘", value: "æ–­ç½‘", note: "å½±å“", tone: "danger" },
      { label: "å¯ä¿¡", value: trustText(state), note: "é‡‡é›†", tone: state.facts.collection.credibilityTone },
    ];
  }
  if (priority === "resource-full") {
    const resource = resourceFacts(state);
    return [
      ...resource.map((item) => ({
        label: item.label,
        value: item.value.replace(/\.0%$/, "%"),
        note: item.note,
        tone: item.tone,
      })),
      { label: "è¿æ¥", value: formatCompact(toNumber(state.facts.connections.total)), note: "æ´»åŠ¨ä¼šè¯", tone: "warn" as OverviewTone },
    ];
  }
  if (state.scenario === "fleet") {
    const abnormal = Math.max(state.facts.wan.offline, state.facts.interfaces.down);
    return [
      { label: "WAN", value: `${formatNumber(state.facts.wan.online)}/${formatNumber(totalWan)}`, note: "åœ¨çº¿", tone: state.facts.wan.offline ? "warn" :×¿5¶‰Ëkºwµç\ÊËÙËˆŠKš[J
KœÜ]
ˆŠNÂˆ™]\›ˆÈX™[ˆX™[¹â­¹  H‹˜[YNˆ™\İš›Ú[ŠˆŠH^NÂŸB‚™[˜İ[Ûˆ\›Ô[Û™J^ˆİš[™ÊNˆİ™\šY]ÕÛ™HÂˆYˆ
ùï.¹i,_9.#ycëùå*9¥«yïd_9.#yleyé.Ÿß9o ¹n.Ë\İ
^
JH™]\›ˆ™[™Ù\ˆÂˆYˆ
ùo¡_9ï$ùkf9èkº+©9càº  ß:-¢ºf":-¡KË\İ
^
JH™]\›ˆØ\›ˆÂˆ™]\›ˆ\İÂŸB‚™[˜İ[Ûˆ\›Õ\İ˜Z[
[Îˆİš[™Ö×JNˆ[Øš[R\›Õ\İÙ[×HÂˆ™]\›ˆ[ËœÛXÙJÊK›X\

^
HOˆÂˆÛÛœİ][HHÜ]\›Ô[
^
NÂˆ™]\›ˆÂˆX™[ˆ][K›X™[ˆ˜[YNˆ][K˜[YKˆÛ™Nˆ\›Ô[Û™J^
KˆNÂˆJNÂŸB‚™[˜İ[Ûˆ\›Ò[\™˜XÙPÙ[ÊÛ˜\Úİˆİ™\šY]Ô˜]ÔÛ˜\Úİİ]Nˆİ™\šY]Ñ\š]™Yİ]JNˆ[Øš[R\›Ò[\™˜XÙPÙ[×HÂˆÛÛœİ›İÜÈH[\™˜XÙT›İÜÊÛ˜\Úİ
K™š[\Š
›İÊHOˆ›İËœ[›š[™ÈOOH˜[ÙJKœÛXÙJÊNÂˆÛÛœİš\ÚX›HH›İÜË›[™İÈ›İÜÈˆ[\™˜XÙT›İÜÊÛ˜\Úİ
KœÛXÙJJNÂˆ™]\›ˆš\ÚX›K›X\

›İË[™^
HOˆÂˆÛÛœİ˜[YHHÛX[Š›İË›˜[YH›İËš[\™˜XÙK9£©ycèÉÚ[™^
È_X
NÂˆÛÛœİØ\œšY\ˆHÛX[Š›İËœ\™[›İË›X\İ\ˆ›İË˜œšYÙK¹¢oú/oyo¡yèkº+©ŠNÂˆ™]\›ˆÂˆYˆ	Û˜[Y_KIÚ[™^Xˆ˜[YKˆØ\œšY\‹ˆİ]U^ˆ[™^OOHÈ	Ù›Ü›X][X™\Šİ]K™˜XİËš[\™˜XÙ\Ë™İÛŠ_HİÛ˜ˆ‘İÛˆ‹ˆÛ™Nˆ™[™Ù\ˆ‹ˆNÂˆJNÂŸB‚™[˜İ[Ûˆ\›ĞÚ[›™[Ù[Êİ]Nˆİ™\šY]Ñ\š]™Yİ]JNˆ[Øš[R\›ĞÚ[›™[Ù[×HÂˆYˆ
İ]KœØÙ[˜\š[ÈOOH››Ë\Û˜\ÚİŠHÂˆ™]\›ˆÂˆÈX™[ˆ”›İ]\“ÔÈ‹˜[YNˆ¹.#ycëú/¯ˆ‹Û™Nˆ™[™Ù\ˆˆKˆÈX™[ˆ”‘TÕ‹˜[YNˆ¹o¡yèkº+©‹Û™NˆØ\›ˆˆKˆÈX™[ˆ”ÔÒ‹˜[YNˆ¹.#ycëùå*‹Û™Nˆ™[™Ù\ˆˆKˆÈX™[ˆ¹oêùáiÈ‹˜[YNˆ¹¥è‹Û™Nˆ›Z\ÜÚ[™ÈˆKˆNÂˆBˆ™]\›ˆÂˆÈX™[ˆ”›İ]\“ÔÈ‹˜[YNˆ¹cëú/¯ˆ‹Û™Nˆİ]K™˜XİË˜ÛÛXİ[Û‹›]™[KˆÈX™[ˆ”‘TÕ‹˜[YNˆİš\™\İ
İ]K™˜XİË˜ÛÛXİ[Û‹œ™\İX™[
KÛ™Nˆİ]K™˜XİË˜ÛÛXİ[Û‹›]™[KˆÈX™[ˆ”ÔÒ‹˜[YNˆİš\ÜÚ
İ]K™˜XİË˜ÛÛXİ[Û‹œÜÚX™[
KÛ™Nˆİ]K™˜XİË˜ÛÛXİ[Û‹›]™[KˆÈX™[ˆ¹oêùáiÈ‹˜[YNˆ\İ^
İ]JKÛ™Nˆİ]K™˜XİË˜ÛÛXİ[Û‹˜Ü™YXš[]UÛ™HKˆNÂŸB‚™[˜İ[ÛˆÛÛXİ[Û•\İÙ[Êİ]Nˆİ™\šY]Ñ\š]™Yİ]JNˆ[Øš[R\›ĞÚ[›™[Ù[×HÂˆ™]\›ˆ\›ĞÚ[›™[Ù[Êİ]JNÂŸB‚™[˜İ[ÛˆÛÛXİ[Û•\İÙ\\˜][ÛŠˆš[Üš]Nˆ[Øš[Sİ™\šY]Ó[Ù[Èœš[Üš]H—KˆØÛÜNˆ[Øš[R[\XİØÛÜKŠNˆ[Øš[Sİ™\šY]Ó[Ù[È˜ÛÛXİ[Û•\İÙ\\˜][Ûˆ—HÂˆYˆ
š[Üš]HOOH››Ü›X[ŠHÂˆ™]\›ˆÂˆÛÛ˜Xİˆ››Ü›X[ZY[ˆ‹ˆÛÛXİ[Û”[™Nˆ˜ÛÛXİ[Ûˆ‹ˆ[\Xİ[™NˆØÛÜKœ[™KˆÙ\\˜]Yœ›ÛR[\Xİˆ˜[ÙKˆNÂˆBˆYˆ
ØÛÜKœ[™HOOH˜ÛÛXİ[ÛˆŠHÂˆ™]\›ˆÂˆÛÛ˜Xİˆ˜ÛÛXİ[Û‹\[™K\š[X\KZ[\Xİ]™\™Xİ‹ˆÛÛXİ[Û”[™Nˆ˜ÛÛXİ[Ûˆ‹ˆ[\Xİ[™NˆØÛÜKœ[™KˆÙ\\˜]Yœ›ÛR[\Xİˆ˜[ÙKˆNÂˆBˆ™]\›ˆÂˆÛÛ˜Xİˆ˜ÛÛXİ[Û‹\[™K\ÙXÛÛ™\KZ[\Xİ]™\™XİZ[™\[™[‹ˆÛÛXİ[Û”[™Nˆ˜ÛÛXİ[Ûˆ‹ˆ[\Xİ[™NˆØÛÜKœ[™KˆÙ\\˜]Yœ›ÛR[\XİˆYKˆNÂŸB‚™[˜İ[Ûˆ\›Ô™\Ûİ\˜ÙPÙ[Êİ]Nˆİ™\šY]Ñ\š]™Yİ]JNˆ[Øš[R\›Ô™\Ûİ\˜ÙPÙ[×HÂˆÛÛœİY[ˆHİ]KœØÙ[˜\š[ÈOOH››Ë\Û˜\ÚİÂˆÛÛœİ›İÜÈHÂˆÈÙ^Nˆœ›ØÙ\ÜÛÜˆˆ\ÈÛÛœİX™[ˆ¹i!9ä!¹fj‹˜]ÎˆÓ[X™\Šİ]K™˜XİËœ™\Ûİ\˜ÙK˜ÜJK™\ÚÛˆHKˆÈÙ^Nˆ›Y[[ÜHˆ\ÈÛÛœİX™[ˆ¹a¡ykf‹˜]ÎˆÓ[X™\Šİ]K™˜XİËœ™\Ûİ\˜ÙK›Y[[ÜJK™\ÚÛˆHKˆÈÙ^Nˆ™\ÚÈˆ\ÈÛÛœİX™[ˆ¹èàyææ‹˜]ÎˆÓ[X™\Šİ]K™˜XİËœ™\Ûİ\˜ÙK™\ÚÊK™\ÚÛˆLKˆNÂˆÛÛœİXZÈH›İÜËœ™YXÙJ
X^][JHOˆ
][Kœ˜]ÈˆX^œ˜]ÈÈ][HˆX^
K›İÜÖÌJNÂˆ™]\›ˆ›İÜË›X\

][JHOˆÂˆÛÛœİ˜[YHH[X™\‹š\Ñš[š]J][Kœ˜]ÊHÈX]›X^
X]›Z[ŠL][Kœ˜]ÊJHˆÂˆÛÛœİİ™\•™\ÚÛHZY[ˆ	‰ˆ][Kœ˜]ÈH][K™\ÚÛÂˆ™]\›ˆÂˆÙ^Nˆ][KšÙ^KˆX™[ˆ][K›X™[ˆ\Ü^NˆY[ˆÈ¹.#yleyé.ˆˆˆ›Ü›X]\˜Ù[
][Kœ˜]Ëİ]KœØÙ[˜\š[ÈOOHœ™\Ûİ\˜ÙKY[ˆÈHˆ
Kœ™\XÙJ×Œ	IË‰HŠKˆ™\ÚÛ^ˆ:f"	Ú][K™\ÚÛIXˆİ\İZ[™Y^ˆY[ˆÈ¹¥è9oêùáiÈˆˆ›İ]\“ÜÔ™\Ûİ\˜ÙTİ\İZ[™Y^
][Kœ˜]Ë][K™\ÚÛ
KˆY]\”\˜Ù[ˆ	İ˜[Y_IXˆš\ÚÎˆ][KšÙ^HOOHXZËšÙ^HÈœš[X\K\š\ÚÈˆˆœÙXÛÛ™\K\š\ÚÈ‹ˆÛ™NˆY[ˆÈ›Z\ÜÚ[™Èˆˆİ™\•™\ÚÛÈ™[™Ù\ˆˆˆ›ÚÈ‹ˆNÂˆJNÂŸB‚™[˜İ[Ûˆ›Ü›X[İ[[X\S[Ù[
ˆš[Üš]Nˆ[Øš[Sİ™\šY]Ó[Ù[Èœš[Üš]H—KŠNˆ[Øš[Sİ™\šY]Ó[Ù[È››Ü›X[İ[[X\H—HÂˆ™]\›ˆÂˆ[ÙNˆš[Üš]HOOH››Ü›X[ˆÈ››Ü›X[XÛÛ\Xİˆˆš[˜ÚY[ZY[ˆ‹ˆÛÛ˜XİˆœÙ\\˜]KXÛÛ˜Û\Ú[Û‹]\İY›İ\‹Y˜XİËXÚ\Yš\œİ‹ˆÙ[Îˆ×KˆNÂŸB‚™[˜İ[Ûˆ\İ[™\Ê™]ÛÜšÎˆ›İ]\“ÜÓ™]ÛÜšÕšY]Ó[Ù[
Nˆ[Øš[U\İ[™V×HÂˆ™]\›ˆÈ™›ÜØ\™[™È‹˜ÛÛXİ[Ûˆ‹œÛ˜\Úİ‹˜\Ú[™\ÜÈ—K™›]X\

Y
HOˆÂˆÛÛœİ[™HH™]ÛÜšËœ[™\Ë™š[™

][JHOˆ][KšYOOHY
NÂˆYˆ
\[™JH™]\›ˆ×NÂˆ™]\›ˆŞÂˆYˆ[™KšYˆX™[ˆ[™K›X™[ˆ˜[YNˆ[™K˜[YKˆ›İNˆ[™K˜›İ[™\KˆÛ™Nˆ[™KÛ™KˆWNÂˆJNÂŸB‚™[˜İ[Ûˆİ]\ĞÛÜ™P›ØÚÊYˆİš[™ÊNˆ[Øš[S[Ûš]Ü”›İÖÈ˜ÛÜ™P›ØÚÈ—HÂˆYˆ
YOOH[Y[[™K]Ø[ˆŠH™]\›ˆØ[ˆÂˆYˆ
YOOH[Y[[™KXÛÛXİ[ÛˆŠH™]\›ˆ˜ÛÛXİ[ÛˆÂˆYˆ
YOOH[Y[[™K\™\Ûİ\˜ÙHŠH™]\›ˆœ™\Ûİ\˜ÙHÂˆ™]\›ˆ[™Yš[™YÂŸB‚™[˜İ[ÛˆÚ]İ\™˜XÙPÛÜ™P›ØÚÜÊ›İÜÎˆ[Øš[S[Ûš]Ü”›İÖ×JNˆ[Øš[S[Ûš]Ü”›İÖ×HÂˆ™]\›ˆ›İÜË›X\

›İÊHOˆ
È‹‹œ›İËÛÜ™P›ØÚÎˆİ]\ĞÛÜ™P›ØÚÊ›İËšY
HJJNÂŸB‚™[˜İ[Ûˆİ]\Ô›İÜÊÛ˜\Úİˆİ™\šY]Ô˜]ÔÛ˜\Úİİ]Nˆİ™\šY]Ñ\š]™Yİ]JNˆ[Øš[S[Ûš]Ü”›İÖ×HÂˆÛÛœİİ[Ø[ˆHØ[‘\Ü^Uİ[
Û˜\Úİİ]JNÂˆÛÛœİ™\Ûİ\˜ÙHH™\Ûİ\˜ÙQ˜XİÊİ]JNÂˆYˆ
İ]KœØÙ[˜\š[ÈOOH››Ë\Û˜\ÚİŠHÂˆ™]\›ˆÚ]İ\™˜XÙPÛÜ™P›ØÚÜÊÂˆÈYˆ[Y[[™K\›İ]\›ÜÈ‹]Nˆ”›İ]\“ÔÈ‹˜[YNˆ¹.#ycëú/¯ˆ‹›İNˆ¹odùbcy¥è9cëù/èy¥l9£kˆ‹Û™Nˆ™[™Ù\ˆˆKˆÈYˆ[Y[[™K\Û˜\Úİ‹]Nˆ¹.&¹b¨yoêùáiÈ‹˜[YNˆ¹ï.¹i,H‹›İNˆ9§ :/äy¢$9b§È	Û]\İİXØÙ\ÜÊÛ˜\Úİİ]J_XÛ™Nˆ›Z\ÜÚ[™ÈˆKˆÈYˆ[Y[[™KXÛÛXİ[Ûˆ‹]Nˆºaáúfáˆ‹˜[YNˆ”‘TÕ9o¡y¨.‹›İNˆ”ÔÒ9¥«zdïˆ‹Û™NˆØ\›ˆˆKˆÈYˆ[Y[[™K\›İ]H‹]Nˆºnæ:+©:-ëùå,H‹˜[YNˆ¹o¡yb)‹›İNˆº-ëùå,yoêùáiù§*¹cå¹fçˆ‹Û™NˆØ\›ˆˆKˆJNÂˆBˆÛÛœİ˜\ÙNˆ[Øš[S[Ûš]Ü”›İÖ×HHÂˆÂˆYˆ[Y[[™K]Ø[ˆ‹ˆ]Nˆ•ĞSˆ‹ˆ˜[YNˆİ]K™˜XİËØ[‹˜[Ù™›[™HÈÉÙ›Ü›X][X™\Šİ[Ø[Š_H9g*9î¯Øˆ	Ù›Ü›X][X™\Šİ]K™˜XİËØ[‹›Û›[™J_KÉÙ›Ü›X][X™\Šİ[Ø[ˆJ_H9g*9î¯Øˆ›İNˆİ]K™˜XİËØ[‹˜[Ù™›[™HÈ¹¢`9§"yaî¹cèùé®ùî¯Èˆˆ8¡¤ÉØÛÛ\Xİ˜]Jİ[ÊÛ˜\Úİ
K™İÛŠ_H8¡¤IØÛÛ\Xİ˜]Jİ[ÊÛ˜\Úİ
K\
_XˆÛ™Nˆİ]K™˜XİËØ[‹˜[Ù™›[™HÈ™[™Ù\ˆˆˆİ]K™˜XİËØ[‹›Ù™›[™HÈØ\›ˆˆˆ›ÚÈ‹ˆKˆÂˆYˆ[Y[[™K\›İ]H‹ˆ]Nˆºnæ:+©:-ëùå,H‹ˆ˜[YNˆ[Øš[T›İ]U˜[YJİ]JKˆ›İNˆİ]K™˜XİËØ[‹˜[Ù™›[™HÈ¹aî¹cèù.#ycëùå*ˆˆİ]KœØÙ[˜\š[ÈOOH˜ÛÛXİ[Û‹YİÛˆˆÈ¹cëùcàº  Èˆˆ¹..ùaî¹cèÈ‹ˆÛ™Nˆİ]K™˜XİËØ[‹˜[Ù™›[™HÈ™[™Ù\ˆˆˆİ]K™˜XİËœ›İ]K›]™[ˆKˆÂˆYˆ[Y[[™KXÛÛXİ[Ûˆ‹ˆ]Nˆºaáúfáˆ‹ˆ˜[YNˆİ]KœØÙ[˜\š[ÈOOH˜ÛÛXİ[Û‹YİÛˆˆÈ¹c¡¹cì¹oêùáiÈˆˆº`&º`dùcëú+îÈ‹ˆ›İNˆ9§ :/äH	Û]\İİXØÙ\ÜÊÛ˜\Úİİ]J_XˆÛ™Nˆİ]KœØÙ[˜\š[ÈOOH˜ÛÛXİ[Û‹YİÛˆˆÈØ\›ˆˆˆİ]K™˜XİË˜ÛÛXİ[Û‹˜Ü™YXš[]UÛ™KˆKˆÂˆYˆ[Y[[™K\™\Ûİ\˜ÙH‹ˆ]Nˆº-a9®¤‹ˆ˜[YNˆ™\Ûİ\˜ÙK›X\

][JHOˆ][K˜[YKœ™\XÙJ×Œ	IË‰HŠJKš›Ú[ŠˆÈŠKˆ›İNˆİ]KœØÙ[˜\š[ÈOOHœ™\Ûİ\˜ÙKY[ˆÈ¹."zhnz-¡zf"ˆˆ¹i!9ä!¹fjÈ9a¡ykfÈ9èàyææ‹ˆÛ™Nˆ™\Ûİ\˜ÙKœÛÛYJ
][JHOˆ][KÛ™HOOH™[™Ù\ˆŠHÈ™[™Ù\ˆˆˆ›ÚÈ‹ˆKˆÂˆYˆ[Y[[™KZ[\™˜XÙH‹ˆ]Nˆ¹£©ycèÈ‹ˆ˜[YNˆİ]K™˜XİËš[\™˜XÙ\Ë™İÛˆˆÈ	Ù›Ü›X][X™\Šİ]K™˜XİËš[\™˜XÙ\Ë™İÛŠ_HİÛ˜ˆ¹«hùn.‹ˆ›İNˆİ]K™˜XİËš[\™˜XÙ\Ë™İÛ“˜[Y\ËœÛXÙJŠKš›Ú[ŠˆÈŠH¹¢oú/oy«hùn.‹ˆÛ™Nˆİ]K™˜XİËš[\™˜XÙ\Ë™İÛˆˆÈ™[™Ù\ˆˆˆ\İ‹ˆKˆNÂˆÛÛœİXÚÈH
YÎˆİš[™Ö×JHOˆYË›X\

Y
HOˆ˜\ÙK™š[™

›İÊHOˆ›İËšYOOHY
JK™š[\Š›ÛÛX[ŠH\È[Øš[S[Ûš]Ü”›İÖ×NÂˆÛÛœİš[Üš]HHš[Üš]SÙŠİ]JNÂˆYˆ
š[Üš]HOOHœ™\Ûİ\˜ÙKY[ŠH™]\›ˆÚ]İ\™˜XÙPÛÜ™P›ØÚÜÊXÚÊÈ[Y[[™K\™\Ûİ\˜ÙH‹[Y[[™K]Ø[ˆ‹[Y[[™KXÛÛXİ[Ûˆ‹[Y[[™K\›İ]H—JJNÂˆYˆ
š[Üš]HOOHØ[‹[Ù™›[™HŠH™]\›ˆÚ]İ\™˜XÙPÛÜ™P›ØÚÜÊXÚÊÈ[Y[[™K]Ø[ˆ‹[Y[[™K\›İ]H‹[Y[[™KXÛÛXİ[Ûˆ‹[Y[[™K\™\Ûİ\˜ÙH—JJNÂˆYˆ
š[Üš]HOOHš[\™˜XÙKYİÛˆŠH™]\›ˆÚ]İ\™˜XÙPÛÜ™P›ØÚÜÊXÚÊÈ[Y[[™KZ[\™˜XÙH‹[Y[[™K\›İ]H‹[Y[[™K]Ø[ˆ‹[Y[[™KXÛÛXİ[Ûˆ—JJNÂˆYˆ
š[Üš]HOOH˜ÛÛXİ[Û‹YYÜ˜YYŠH™]\›ˆÚ]İ\™˜XÙPÛÜ™P›ØÚÜÊXÚÊÈ[Y[[™KXÛÛXİ[Ûˆ‹[Y[[™K]Ø[ˆ‹[Y[[™K\™\Ûİ\˜ÙH‹[Y[[™K\›İ]H—JJNÂˆ™]\›ˆÚ]İ\™˜XÙPÛÜ™P›ØÚÜÊXÚÊÈ[Y[[™K]Ø[ˆ‹[Y[[™KXÛÛXİ[Ûˆ‹[Y[[™K\™\Ûİ\˜ÙH‹[Y[[™K\›İ]H—JJNÂŸB‚™[˜İ[ÛˆØ[”ÜÊÛ˜\Úİˆİ™\šY]Ô˜]ÔÛ˜\Úİİ]Nˆİ™\šY]Ñ\š]™Yİ]JNˆ[Øš[UØ[”Ü×HÂˆÛÛœİÛİ\˜ÙHHØ[”›İÜÊÛ˜\Úİ
NÂˆÛÛœİİ[HX]›X^
KØ[“[™PÛİ[
Û˜\Úİİ]JJNÂˆÛÛœİ›İÜÈH\œ˜^K™œ›ÛJÈ[™İˆX]›Z[Šİ[
HK
Ë[™^
HOˆÛİ\˜ÙVÚ[™^H
È˜[YNˆĞS‰Ú[™^
È_X[›š[™Îˆ˜[ÙHH\Èİ™\šY]Ô˜]ÕØ[”›İÊJNÂˆ™]\›ˆ›İÜË›X\

›İË[™^
HOˆÂˆÛÛœİÙ™›[™HHİ]K™˜XİËØ[‹˜[Ù™›[™H›İËœ[›š[™ÈOOH˜[ÙNÂˆÛÛœİ˜[YHHÛX[Š›İË›˜[YH›İËš[\™˜XÙKÙK]Ø[‰Ú[™^
È_X
Kœ™\XÙJ×œÙVËW×OËÚKˆŠNÂˆÛÛœİØ\œšY\ˆHÛX[Š›İËœ\™[›İË˜XØÙ\ÜÈ›İËš[\™˜XÙK	Ú[™^
È_X
Kœ™\XÙJ×™]\‹ÚK™]\ˆŠNÂˆÛÛœİ›ÛHHİ[HH[™^OOHÈ™Y˜][ˆˆ[™^OOHHÈ˜˜XÚİ\ˆˆ›Y[X™\ˆÂˆÛÛœİ›ÛSX™[H›ÛHOOH™Y˜][ˆÈºnæ:+©9aî¹cèÈˆˆ›ÛHOOH˜˜XÚİ\ˆÈ¹i!ùå*9aî¹cèÈˆˆ¹¢$9df9aî¹cèÈÂˆÛÛœİ›İ]Pš[™[™ÈH›ÛHOOH™Y˜][ˆÈ™Y˜][\›İ]Hˆˆ›ÛHOOH˜˜XÚİ\ˆÈœİ[™K\›İ]Hˆˆ›Y[X™\‹\›İ]HÂˆÛÛœİ[\XİH[Ù™›[™HÈ››İXY™™XİYˆˆ›ÛHOOH™Y˜][ˆÈ™Y˜][\›İ]KXY™™XİYˆˆ›ÛHOOH˜˜XÚİ\ˆÈ˜˜XÚİ\XY™™XİYˆˆ›Y[X™\‹XY™™XİYÂˆÛÛœİ\Ú[™\ÜÒ[\XİHİ]K™˜XİËØ[‹˜[Ù™›[™BˆÈš[\›™]YİÛˆ‚ˆˆ[\XİOOH™Y˜][\›İ]KXY™™XİY‚ˆÈ™YÜ˜YYX˜XÚİ\‚ˆˆ››Ë\š[X\KZ[\XİÂˆÛÛœİİ]U^HÙ™›[™HÈ¹é®ùî¯Èˆˆ¹g*9î¯ÈÂˆÛÛœİÜİ]HHÙ™›[™HÈ™İÛˆˆˆ\Âˆ™]\›ˆÂˆYˆØ[‹\ÜIÚ[™^XˆX™[ˆ	Ú[™^
È_Xˆ˜[YKˆ›İNˆ	Ü›ÛSX™[H0­È	ØØ\œšY\ŸH0­È	Üİ]U^XˆØ\œšY\‹ˆİ]U^ˆÜİ]Kˆ›ÛKˆ›ÛSX™[ˆ[\Xİˆ\Ú[™\ÜÒ[\Xİˆ›İ]Pš[™[™Ëˆ^[İ]ˆ›X]š^‹ˆÛ™NˆÙ™›[™HÈ™[™Ù\ˆˆˆ›ÚÈ‹ˆNÂˆJNÂŸB‚‚™[˜İ[ÛˆX››Ü›X[XÚ\Ú[Û‘]šY[˜ÙUÛ™Jš[Üš]Nˆ[Øš[Sİ™\šY]Ó[Ù[Èœš[Üš]H—JNˆİ™\šY]ÕÛ™HÂˆYˆ
š[Üš]HOOHœÛ˜\Úİ[Z\ÜÚ[™ÈŠH™]\›ˆ›Z\ÜÚ[™ÈÂˆYˆ
š[Üš]HOOHØ[‹[Ù™›[™HŠH™]\›ˆ™[™Ù\ˆÂˆ™]\›ˆ\İÂŸB‚™[˜İ[ÛˆX››Ü›X[XÚ\Ú[Û’[\Xİ˜[YJˆš[Üš]Nˆ[Øš[Sİ™\šY]Ó[Ù[Èœš[Üš]H—KˆØÛÜNˆ[Øš[R[\XİØÛÜKŠNˆİš[™ÈÂˆYˆ
š[Üš]HOOHØ[‹[Ù™›[™HŠH™]\›ˆºnæ:+©:-ëùå,y.#ycëù¢oú/oHÂˆYˆ
š[Üš]HOOHœÛ˜\Úİ[Z\ÜÚ[™ÈŠH™]\›ˆ¹.&¹b¨y¥l9£k¹.#yleyé.ˆÂˆYˆ
š[Üš]HOOHœ™\Ûİ\˜ÙKY[ŠH™]\›ˆ¹.&¹b¨y.ãycëùå*0­È:hãºfjzjæÂˆYˆ
š[Üš]HOOHš[\™˜XÙKYİÛˆŠH™]\›ˆ¹¢oú/oyalùìîùo¡yb)ÂˆYˆ
š[Üš]HOOH˜ÛÛXİ[Û‹YYÜ˜YYŠH™]\›ˆºaáúfá¹cëù/èyn©¹."úfcHÂˆ™]\›ˆØÛÜK˜[YNÂŸB‚™[˜İ[ÛˆX››Ü›X[XÚ\Ú[ÛÙ[Êˆš[Üš]Nˆ[Øš[Sİ™\šY]Ó[Ù[Èœš[Üš]H—KˆÛÛ˜Xİˆ[Øš[Sİ™\šY]Ó[Ù[È˜\ÛYPÛÛ˜Xİ—KˆØÛÜNˆ[Øš[R[\XİØÛÜKˆ™]ÛÜšÎˆ›İ]\“ÜÓ™]ÛÜšÕšY]Ó[Ù[ˆİ]Nˆİ™\šY]Ñ\š]™Yİ]Kˆ\›Õ]Nˆİš[™Ëˆ\İ]Nˆİš[™Ëˆ™\Ûİ\˜ÙPÙ[Îˆ[Øš[R\›Ô™\Ûİ\˜ÙPÙ[×KŠNˆ[Øš[PX››Ü›X[XÚ\Ú[ÛÙ[×HÂˆYˆ
š[Üš]HOOH››Ü›X[ŠH™]\›ˆ×NÂˆÛÛœİ]šY[˜ÙT\ÈHÛÛ˜Xİ\İ›İ[™\KœÜ]
°­ÈŠK›X\

\
HOˆÛX[Š\
JK™š[\Š›ÛÛX[ŠNÂˆÛÛœİš[X\T™\Ûİ\˜ÙHH™\Ûİ\˜ÙPÙ[Ë™š[™

][JHOˆ][Kœš\ÚÈOOHœš[X\K\š\ÚÈŠH™\Ûİ\˜ÙPÙ[ÖÌNÂˆÛÛœİXİ[ÛˆH™\ÛÛ™S[Øš[R[˜ÚY[Xİ[ÛŠš[Üš]Kš[X\T™\Ûİ\˜ÙKÂˆÛÛXİ[Û‘YÜ˜YYˆİ]K™˜XİË˜ÛÛXİ[Û‹˜Ú[›™[YÜ˜YYİ]K™˜XİË˜ÛÛXİ[Û‹™]Tİ[Hİ]K™˜XİË™œ™\Ú™\ÜËš\İÜKˆÛÛ›™Xİ[Û”™\Üİ\™Nˆİ]K™˜XİË˜ÛÛ›™Xİ[ÛœËİ[ˆLˆÛÛ›™Xİ[Û•İ[^ˆ›Ü›X]ÛÛ\Xİ
İ]K™˜XİË˜ÛÛ›™Xİ[ÛœËİ[
Kˆ[\™˜XÙP]˜Z[X›Nˆİ]K™˜XİËš[\™˜XÙ\Ëİ[ˆˆJNÂˆ™]\›ˆÂˆÈX™[ˆ¹kîz,hH‹˜[YNˆ\İ]K›İNˆ\›Õ]KÛ™NˆØÛÜKÛ™HKˆÈX™[ˆ¹olydãH‹˜[YNˆX››Ü›X[XÚ\Ú[Û’[\Xİ˜[YJš[Üš]KØÛÜJK›İNˆØÛÜK››İKÛ™NˆØÛÜKÛ™HKˆÈX™[ˆ¹cëù/èyn©ˆ‹˜[YNˆ]šY[˜ÙT\ÖÌH™]ÛÜšËœÛ˜\Úİ˜[YK›İNˆ]šY[˜ÙT\ËœÛXÙJJKš›Ú[Šˆ0­ÈŠH™]ÛÜšËœÛ˜\Úİ›X™[Û™NˆX››Ü›X[XÚ\Ú[Û‘]šY[˜ÙUÛ™Jš[Üš]JHKˆÈX™[ˆ¹."ù. 9«iH‹˜[YNˆXİ[Û‹˜[YK›İNˆXİ[Û‹››İKÛ™NˆÛÛ˜XİœÙ]™\š]HOOHœˆÈ™[™Ù\ˆˆˆØ\›ˆ‹\™Ù]XˆXİ[Û‹\™Ù]XˆKˆNÂŸB‚™^Ü[˜İ[ÛˆZ[[Øš[Sİ™\šY]Ó[Ù[
Û˜\Úİˆİ™\šY]Ô˜]ÔÛ˜\Úİİ]Nˆİ™\šY]Ñ\š]™Yİ]JNˆ[Øš[Sİ™\šY]Ó[Ù[ÂˆÛÛœİ™]ÛÜšÈHZ[›İ]\“ÜÓ™]ÛÜšÕšY]Ó[Ù[
Û˜\Úİİ]JNÂˆÛÛœİš[Üš]HH™]ÛÜšËœš[Üš]NÂˆÛÛœİØÛÜHHZ[[Øš[R[\XİØÛÜJ™]ÛÜšÊNÂˆÛÛœİ\›Õ]HH]Q›ÜŠ™]ÛÜšÊNÂˆÛÛœİ\İHZ[[Øš[Tš[X\S\İ
Û˜\Úİİ]K™]ÛÜšËØÛÜK™\Ûİ\˜ÙQ˜XİÊİ]JJNÂˆÛÛœİÛXŞHH™\ÛÛ™S[Øš[Sİ™\šY]ÔÛXŞJš[Üš]K\İšÚ[™Âˆ™XÙ[İXØÙ\ÜÎˆ]\İİXØÙ\ÜÊÛ˜\Úİİ]JKˆÛÛXİ[Û“X™[ˆ™]ÛÜšË˜ÛÛXİ[Û‹›X™[ˆÛÛXİ[Û•˜[YNˆ™]ÛÜšË˜ÛÛXİ[Û‹˜[YKˆÛ˜\Úİ˜[YNˆ™]ÛÜšËœÛ˜\Úİ˜[YKˆ›İ]U˜[YNˆ™]ÛÜšËœ›İ]K˜[YKˆJNÂˆÛÛœİ[ÈH\›Ô[ÊÛ˜\Úİİ]K™]ÛÜšÊNÂˆÛÛœİÛÜ™HHÛXŞK˜\ÛYPÛÛ˜XİœÚİĞÛÜ™SY]šXÔ˜Z[ˆÈÛÜ™SY]šXÜÊÛ˜\Úİİ]K™]ÛÜšÊBˆˆ×NÂˆÛÛœİ™\Ûİ\˜ÙPÙ[ÈH\›Ô™\Ûİ\˜ÙPÙ[Êİ]JNÂˆ™]\›ˆÂˆš[Üš]Kˆ™]ÛÜšËˆXY\ˆXY\“[Ù[
Û˜\Úİİ]JKˆ\ÛYPÛÛ˜XİˆÛXŞK˜\ÛYPÛÛ˜Xİˆİ\™˜XÙNˆÛXŞKœİ\™˜XÙKˆ[\XİØÛÜNˆØÛÜKˆÛÛXİ[Û•\İÙ\\˜][ÛˆÛÛXİ[Û•\İÙ\\˜][ÛŠš[Üš]KØÛÜJKˆX››Ü›X[XÚ\Ú[ÛˆX››Ü›X[XÚ\Ú[ÛÙ[Êš[Üš]KÛXŞK˜\ÛYPÛÛ˜XİØÛÜK™]ÛÜšËİ]K\›Õ]K\İ]K™\Ûİ\˜ÙPÙ[ÊKˆÛÛXİ[Û•\İˆÛÛXİ[Û•\İÙ[Êİ]JKˆÛÜ™SY]šXÜÎˆÛÜ™Kˆ[˜ÚY[[[Y]NˆZ[[Øš[R[˜ÚY[[[Y]JÛ˜\Úİİ]K™]ÛÜšÊKˆ›Ü›X[İ[[X\Nˆ›Ü›X[İ[[X\S[Ù[
š[Üš]JKˆ\›ÎˆÂˆ]Nˆ\›Õ]KˆİX]NˆİX]Q›ÜŠÛ˜\Úİİ]K™]ÛÜšËØÛÜJKˆ˜XİÎˆ\›Ñ˜XİÊÛ˜\Úİİ]JKˆ[Ëˆ\İ˜Z[ˆ\›Õ\İ˜Z[
[ÊKˆ[\™˜XÙPÙ[Îˆ\›Ò[\™˜XÙPÙ[ÊÛ˜\Úİİ]JKˆÚ[›™[Ù[Îˆ\›ĞÚ[›™[Ù[Êİ]JKˆ™\Ûİ\˜ÙPÙ[Ëˆš\İX[Ú[™ˆ\›Õš\İX[Ú[™
š[Üš]JKˆÚİÓY]šXÜÎˆÚİÒ\›ÓY]šXÜÊ
Kˆ™[™ˆZ[[Øš[U™[™Ú\
Û˜\Úİİ]JKˆKˆ\İ[™\Îˆ\İ[™\Ê™]ÛÜšÊKˆİ]\Ô›İÜÎˆİ]\Ô›İÜÊÛ˜\Úİİ]JKˆš[X\S\İˆ\İˆØ[”ÜÎˆØ[”ÜÊÛ˜\Úİİ]JKˆNÂŸB