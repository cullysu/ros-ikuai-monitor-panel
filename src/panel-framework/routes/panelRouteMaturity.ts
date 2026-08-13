import {
  PANEL_ROUTE_IDS,
  PANEL_ROUTES,
  type PanelRouteDefinition,
  type PanelRouteId,
  type PanelRouteMaturity,
} from "./panelRoutes";

export type PanelRouteRenderer = "overview" | "section-model" | "directory";
export type PanelRouteDataDepth = "domain-specific" | "shared" | "none";
export type PanelRouteObjectDetailDepth = "novel" | "bounded" | "none";
export type PanelRouteFailureRecoveryDepth = "route-specific" | "bounded" | "none";
export type PanelRouteVerification = "independent-pass" | "automated-only" | "pending" | "none";

export interface PanelRouteMaturityEvidence {
  route: PanelRouteId;
  renderer: PanelRouteRenderer;
  modelSource: string;
  modelToken: string;
  rendererSource: string;
  rendererToken: string;
  objectDetailSource: string;
  objectDetailToken: string;
  failureRecoverySource: string;
  failureRecoveryToken: string;
  accessibilitySource: string;
  accessibilityToken: string;
  dataDepth: PanelRouteDataDepth;
  objectDetail: PanelRouteObjectDetailDepth;
  failureRecovery: PanelRouteFailureRecoveryDepth;
  accessibility: PanelRouteVerification;
  independentAcceptance: PanelRouteVerification;
  automatedAccessibilityRoutes: readonly PanelRouteId[];
  acceptanceRefs: readonly string[];
  evidenceRefs: readonly string[];
}

/**
 * Navigation consumes these projections, but this module remains the sole
 * owner of their maturity semantics and validation.
 */
export const ROUTE_MATURITY_STATES = ["complete", "bounded-readonly", "fallback", "unavailable"] as const satisfies readonly PanelRouteMaturity[];
export type RouteMaturityState = (typeof ROUTE_MATURITY_STATES)[number];
export type RoutePresentationRequirement = "module-required" | "directory-only";

export interface RouteMaturityContract {
  route: string;
  maturity: PanelRouteMaturity | null;
  presentation: RoutePresentationRequirement | "missing";
  consumable: boolean;
}

export interface RouteMaturityValidation {
  missing: string[];
  extra: string[];
  duplicateRouteIds: string[];
  violations: string[];
  contracts: RouteMaturityContract[];
  counts: Record<RouteMaturityState, number>;
  completeRoutes: string[];
  contractPass: boolean;
}

function owns(object: object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(object, key);
}

function isRouteMaturityState(value: unknown): value is RouteMaturityState {
  return typeof value === "string" && (ROUTE_MATURITY_STATES as readonly string[]).includes(value);
}

/** Build a UI-consumable projection directly from the active route registry. */
export function deriveRouteMaturityContracts(
  routeIds: readonly string[] = PANEL_ROUTE_IDS,
  definitions: Readonly<Record<string, PanelRouteDefinition>> = PANEL_ROUTES,
): RouteMaturityContract[] {
  return routeIds.map((route) => {
    const definition = definitions[route];
    if (!definition) return { route, maturity: null, presentation: "missing", consumable: false };
    const presentation: RoutePresentationRequirement = definition.placement === "directory"
      ? "directory-only"
      : "module-required";
    return {
      route,
      maturity: definition.maturity,
      presentation,
      consumable: definition.maturity !== "unavailable",
    };
  });
}

/** Validates registry-level maturity facts for navigation consumers. */
export function validateRouteMaturityContract(
  routeIds: readonly string[] = PANEL_ROUTE_IDS,
  definitions: Readonly<Record<string, PanelRouteDefinition>> = PANEL_ROUTES,
): RouteMaturityValidation {
  const expected = new Set(routeIds);
  const definitionIds = Object.keys(definitions);
  const duplicateRouteIds = routeIds.filter((route, index) => routeIds.indexOf(route) !== index);
  const missing = routeIds.filter((route) => !owns(definitions, route));
  const extra = definitionIds.filter((route) => !expected.has(route));
  const violations: string[] = [];

  for (const route of routeIds) {
    const definition = definitions[route];
    if (!definition) {
      violations.push(`${route}: route definition is missing`);
      continue;
    }
    if (definition.id !== route) violations.push(`${route}: definition id does not match its registry key`);
    if (!isRouteMaturityState(definition.maturity)) violations.push(`${route}: maturity is not a supported state`);
    if (definition.placement === "directory" && definition.maturity !== "unavailable") {
      violations.push(`${route}: directory routes must be unavailable, never modules`);
    }
    if (definition.maturity === "complete" && definition.placement === "directory") {
      violations.push(`${route}: a directory route cannot be complete`);
    }
    if (definition.maturity === "fallback" && definition.placement === "directory") {
      violations.push(`${route}: a directory route cannot be a fallback module`);
    }
  }

  const contracts = deriveRouteMaturityContracts(routeIds, definitions);
  const counts: Record<RouteMaturityState, number> = {
    complete: 0,
    "bounded-readonly": 0,
    fallback: 0,
    unavailable: 0,
  };
  for (const contract of contracts) {
    if (contract.maturity && isRouteMaturityState(contract.maturity)) counts[contract.maturity] += 1;
  }

  return {
    missing,
    extra,
    duplicateRouteIds,
    violations,
    contracts,
    counts,
    completeRoutes: contracts.filter((contract) => contract.maturity === "complete").map((contract) => contract.route),
    contractPass: missing.length === 0 && extra.length === 0 && duplicateRouteIds.length === 0 && violations.length === 0,
  };
}

export const PANEL_ROUTE_MATURITY_V1 = deriveRouteMaturityContracts();

export function routeMaturityV1(route: string): RouteMaturityContract | undefined {
  return PANEL_ROUTE_MATURITY_V1.find((contract) => contract.route === route);
}

const currentAutomatedEvidence = [
  "tools/check-section-models.js",
  "tools/check-panel-runtime-browser.js",
] as const;

const automatedAccessibilityRoutes = [
  "overview",
  "interfaces",
  "lineStatus",
  "balance",
  "routes",
  "terminals",
  "dhcp",
  "arp",
  "trafficLoad",
  "loadAudit",
  "trafficAudit",
  "connections",
  "dns4",
  "dns6",
  "security",
  "logs",
  "serviceLogs",
  "readonlyDiagnostics",
] as const satisfies readonly PanelRouteId[];

const sectionEvidence = (
  route: PanelRouteId,
  inspector: string,
  modelToken: string,
): PanelRouteMaturityEvidence => ({
  route,
  renderer: "section-model",
  modelSource: "src/panel-framework/sections/sectionModels.ts",
  modelToken,
  rendererSource: "src/panel-framework/mobile/MobileDomainWorkspace.tsx",
  rendererToken: "data-mobile-domain-workspace={route}",
  objectDetailSource: "src/panel-framework/mobile/mobile-inspector/MobileDomainInspector.tsx",
  objectDetailToken: "data-mobile-object-detail={preview ? undefined : row.id}",
  failureRecoverySource: "src/panel-framework/sections/RouteEvidenceBoundary.tsx",
  failureRecoveryToken: "data-route-recovery={route}",
  accessibilitySource: "tools/check-panel-runtime-browser.js",
  accessibilityToken: automatedAccessibilityRoutes.includes(route as (typeof automatedAccessibilityRoutes)[number])
    ? `{ route: '${route}', selector: '[data-mobile-domain-workspace=\"${route}\"]' }`
    : "",
  dataDepth: "domain-specific",
  objectDetail: "novel",
  failureRecovery: "route-specific",
  accessibility: automatedAccessibilityRoutes.includes(route as (typeof automatedAccessibilityRoutes)[number]) ? "automated-only" : "pending",
  independentAcceptance: "pending",
  automatedAccessibilityRoutes,
  acceptanceRefs: [],
  evidenceRefs: [
    "src/panel-framework/sections/sectionModels.ts",
    "src/panel-framework/sections/RouteEvidenceBoundary.tsx",
    "src/panel-framework/sections/route-recovery/routeRecoveryPolicies.ts",
    "src/panel-framework/mobile/MobileDomainWorkspace.tsx",
    `src/panel-framework/mobile/mobile-inspector/${inspector}`,
    ...currentAutomatedEvidence,
  ],
});

const fallbackEvidence = (
  route: PanelRouteId,
  modelToken = `if (route === "${route}")`,
): PanelRouteMaturityEvidence => ({
  route,
  renderer: "section-model",
  modelSource: "src/panel-framework/sections/sectionModels.ts",
  modelToken,
  rendererSource: "src/panel-framework/mobile/MobileDomainWorkspace.tsx",
  rendererToken: "data-mobile-domain-workspace={route}",
  objectDetailSource: "src/panel-framework/mobile/mobile-inspector/MobileDomainInspector.tsx",
  objectDetailToken: "data-mobile-object-detail={preview ? undefined : row.id}",
  failureRecoverySource: "src/panel-framework/sections/sectionModels.ts",
  failureRecoveryToken: "function applyEvidenceBoundary",
  accessibilitySource: "tools/check-panel-runtime-browser.js",
  accessibilityToken: "",
  dataDepth: "shared",
  objectDetail: "bounded",
  failureRecovery: "bounded",
  accessibility: "pending",
  independentAcceptance: "pending",
  automatedAccessibilityRoutes: [],
  acceptanceRefs: [],
  evidenceRefs: [
    "src/panel-framework/sections/sectionModels.ts",
    "src/panel-framework/mobile/MobileDomainWorkspace.tsx",
    "src/panel-framework/mobile/mobile-inspector/MobileDomainInspector.tsx",
    ...currentAutomatedEvidence,
  ],
});

const serviceLogEvidence = (route: PanelRouteId): PanelRouteMaturityEvidence => ({
  ...sectionEvidence(route, "ServiceLogInspector.tsx", 'if (route === "serviceLogs")'),
  modelToken: "function serviceLogModel",
  objectDetailSource: "src/panel-framework/mobile/mobile-inspector/ServiceLogInspector.tsx",
  objectDetailToken: "function ServiceLogInspector",
  dataDepth: "domain-specific",
  objectDetail: "novel",
  evidenceRefs: [
    "src/panel-framework/sections/sectionModels.ts",
    "src/panel-framework/sections/sectionRowEvidence.ts",
    "src/panel-framework/sections/sectionRowEvidenceTypes.ts",
    "src/panel-framework/sections/serviceLogEvidence.ts",
    "src/panel-framework/sections/serviceLogEvidenceTypes.ts",
    "src/panel-framework/mobile/MobileDomainWorkspace.tsx",
    "src/panel-framework/mobile/mobile-inspector/MobileDomainInspector.tsx",
    "src/panel-framework/mobile/mobile-inspector/ServiceLogInspector.tsx",
    ...currentAutomatedEvidence,
  ],
});

export const PANEL_ROUTE_MATURITY_EVIDENCE: Record<PanelRouteId, PanelRouteMaturityEvidence> = {
  overview: {
    route: "overview",
    renderer: "overview",
    modelSource: "src/panel-framework/overview/mobile-overview/incident-lens/buildIncidentLensModel.ts",
    modelToken: "buildIncidentLensModel",
    rendererSource: "src/panel-framework/overview/mobile-overview/incident-lens/IncidentLens.tsx",
    rendererToken: "data-incident-lens-root",
    objectDetailSource: "src/panel-framework/overview/mobile-overview/incident-lens/IncidentWorkspace.tsx",
    objectDetailToken: "data-incident-lens-expanded-claim",
    failureRecoverySource: "src/panel-framework/overview/mobile-overview/incident-lens/IncidentLens.tsx",
    failureRecoveryToken: "data-incident-lens-forbids-current",
    accessibilitySource: "src/panel-framework/overview/mobile-overview/incident-lens/IncidentLens.tsx",
    accessibilityToken: "data-incident-lens-root",
    dataDepth: "domain-specific",
    objectDetail: "novel",
    failureRecovery: "route-specific",
    accessibility: "automated-only",
    independentAcceptance: "pending",
    automatedAccessibilityRoutes: ["overview"],
    acceptanceRefs: [],
    evidenceRefs: [
      "src/panel-framework/overview/deriveOverviewState.ts",
      "src/panel-framework/overview/evidence-model/buildOverviewEvidenceModel.ts",
      "src/panel-framework/overview/evidence-model/overviewEvidenceTypes.ts",
      "src/panel-framework/overview/mobile-overview/MobileOverviewEntry.tsx",
      "src/panel-framework/overview/mobile-overview/incident-lens/IncidentLens.tsx",
      "src/panel-framework/overview/mobile-overview/incident-lens/PatrolLens.tsx",
      "src/panel-framework/overview/mobile-overview/incident-lens/IncidentWorkspace.tsx",
      "src/panel-framework/overview/mobile-overview/incident-lens/buildIncidentLensModel.ts",
      "src/panel-framework/overview/mobile-overview/incident-lens/types.ts",
      "src/panel-framework/overview/mobile-overview/incident-lens/useIncidentLensSelectionHistory.ts",
      "tools/check-incident-lens-model.js",
      "tools/check-incident-lens-architecture.js",
      "tools/check-incident-lens-accessibility-static.js",
      "tools/check-incident-lens-runtime.js",
      ...currentAutomatedEvidence,
    ],
  },
  interfaces: {
    ...sectionEvidence("interfaces", "NetworkInspectors.tsx", 'if (route === "interfaces")'),
    failureRecoverySource: "src/panel-framework/sections/RouteEvidenceBoundary.tsx",
    failureRecoveryToken: "data-route-recovery={route}",
    failureRecovery: "route-specific",
    evidenceRefs: [
      ...sectionEvidence("interfaces", "NetworkInspectors.tsx", 'if (route === "interfaces")').evidenceRefs,
      "src/panel-framework/sections/RouteEvidenceBoundary.tsx",
      "src/panel-framework/mobile/mobile-interface-recovery.css",
      "tools/check-mobile-interface-evidence-boundary.js",
      "tools/check-mobile-interface-route-evidence.js",
      "tools/check-mobile-interface-focus-context.js",
      "tools/check-mobile-interface-evidence-dedup.js",
      "tools/check-mobile-interface-risk-object-focus.js",
      "tools/check-mobile-interface-route-evidence-runtime.js",
      "tools/check-interfaces-route-maturity-boundary.js",
    ],
  },
  lineStatus: sectionEvidence("lineStatus", "NetworkInspectors.tsx", 'if (route === "lineStatus")'),
  balance: sectionEvidence("balance", "NetworkInspectors.tsx", 'if (route === "balance")'),
  routes: sectionEvidence("routes", "NetworkInspectors.tsx", 'if (route === "routes")'),
  terminals: sectionEvidence("terminals", "TerminalLogInspectors.tsx", 'if (route === "terminals")'),
  dhcp: sectionEvidence("dhcp", "TerminalLogInspectors.tsx", 'if (route === "dhcp")'),
  arp: sectionEvidence("arp", "TerminalLogInspectors.tsx", 'if (route === "arp")'),
  trafficLoad: sectionEvidence("trafficLoad", "ResourceInspector.tsx", 'if (route === "trafficLoad")'),
  loadAudit: sectionEvidence("loadAudit", "ResourceInspector.tsx", 'if (route === "loadAudit")'),
  trafficAudit: sectionEvidence("trafficAudit", "TrafficAuditInspector.tsx", 'if (route === "trafficAudit")'),
  connections: sectionEvidence("connections", "NetworkInspectors.tsx", 'if (route === "connections")'),
  dns4: sectionEvidence("dns4", "NetworkInspectors.tsx", 'if (route === "dns4" || route === "dns6")'),
  dns6: sectionEvidence("dns6", "NetworkInspectors.tsx", 'if (route === "dns4" || route === "dns6")'),
  security: sectionEvidence("security", "NetworkInspectors.tsx", 'if (route === "security")'),
  logs: sectionEvidence("logs", "TerminalLogInspectors.tsx", 'if (route === "logs" || route === "serviceLogs")'),
  serviceLogs: serviceLogEvidence("serviceLogs"),
  readonlyDiagnostics: sectionEvidence("readonlyDiagnostics", "DiagnosticInspector.tsx", 'if (route === "readonlyDiagnostics")'),
  more: {
    route: "more",
    renderer: "directory",
    modelSource: "src/panel-framework/routes/panelRoutes.ts",
    modelToken: 'maturity: "unavailable"',
    rendererSource: "src/panel-framework/mobile/MobileDomainDirectory.tsx",
    rendererToken: 'data-mobile-domain-workspace="more"',
    objectDetailSource: "src/panel-framework/mobile/MobileDomainWorkspace.tsx",
    objectDetailToken: 'if (route === "more")',
    failureRecoverySource: "src/panel-framework/routes/panelRoutes.ts",
    failureRecoveryToken: 'maturity: "unavailable"',
    accessibilitySource: "tools/check-panel-runtime-browser.js",
    accessibilityToken: "",
    dataDepth: "none",
    objectDetail: "none",
    failureRecovery: "none",
    accessibility: "none",
    independentAcceptance: "none",
    automatedAccessibilityRoutes: [],
    acceptanceRefs: [],
    evidenceRefs: ["src/panel-framework/routes/panelRoutes.ts"],
  },
};

export interface PanelRouteMaturityValidation {
  missing: string[];
  extra: string[];
  missingDefinitions: string[];
  extraDefinitions: string[];
  violations: string[];
  routeMaturity: Array<{
    route: string;
    maturity: PanelRouteMaturity | null;
    accessibility: PanelRouteVerification | null;
    independentAcceptance: PanelRouteVerification | null;
  }>;
  maturityCounts: Record<PanelRouteMaturity, number>;
  completeRoutes: string[];
  contractPass: boolean;
  acceptanceComplete: boolean;
  pass: boolean;
}

export function validatePanelRouteMaturity(
  routes: Record<string, PanelRouteDefinition>,
  routeIds: readonly string[],
  evidenceRecords: Readonly<Record<string, PanelRouteMaturityEvidence>> = PANEL_ROUTE_MATURITY_EVIDENCE,
): PanelRouteMaturityValidation {
  const expected = new Set(routeIds);
  const evidenceIds = Object.keys(evidenceRecords);
  const missing = routeIds.filter((route) => !evidenceRecords[route]);
  const extra = evidenceIds.filter((route) => !expected.has(route));
  const definitionIds = Object.keys(routes);
  const missingDefinitions = routeIds.filter((route) => !Object.prototype.hasOwnProperty.call(routes, route));
  const extraDefinitions = definitionIds.filter((route) => !expected.has(route));
  const violations: string[] = [];

  for (const route of missingDefinitions) violations.push(`${route}: route definition is missing`);
  for (const route of extraDefinitions) violations.push(`${route}: route definition is not declared in PANEL_ROUTE_IDS`);

  for (const route of routeIds) {
    const definition = routes[route];
    const evidence = evidenceRecords[route];
    if (!definition || !evidence) continue;
    if (evidence.route !== route) violations.push(`${route}: evidence route id mismatch`);
    if (evidence.evidenceRefs.some((ref) => ref.startsWith("_acceptance/"))) {
      violations.push(`${route}: contract cannot depend on ignored acceptance reports`);
    }
    if (!evidence.evidenceRefs.length && definition.maturity !== "unavailable") {
      violations.push(`${route}: operational route has no evidence references`);
    }
    if (evidence.acceptanceRefs.length > 0) {
      violations.push(`${route}: route-local acceptance refs cannot prove public-release acceptance`);
    }
    if (definition.maturity === "complete") {
      if (evidence.renderer === "directory") violations.push(`${route}: complete route cannot use directory renderer`);
      if (evidence.dataDepth !== "domain-specific") violations.push(`${route}: complete route needs domain-specific data`);
      if (evidence.objectDetail !== "novel") violations.push(`${route}: complete route needs novel object detail`);
      if (evidence.failureRecovery !== "route-specific") violations.push(`${route}: complete route needs route-specific failure/recovery`);
      if (evidence.accessibility !== "automated-only") violations.push(`${route}: complete route needs automated accessibility coverage before external AT acceptance`);
      if (evidence.independentAcceptance !== "pending") violations.push(`${route}: complete route acceptance is established only by a signed public-release manifest`);
    }
    if (definition.maturity === "bounded-readonly") {
      if (evidence.renderer === "directory") violations.push(`${route}: bounded-readonly route cannot use directory renderer`);
      if (evidence.dataDepth === "none") violations.push(`${route}: bounded-readonly route needs real data depth`);
      if (evidence.objectDetail === "none") violations.push(`${route}: bounded-readonly route needs bounded object evidence`);
      if (evidence.failureRecovery === "none") violations.push(`${route}: bounded-readonly route needs a failure boundary`);
      if (evidence.independentAcceptance === "none") violations.push(`${route}: bounded-readonly route must remain auditable`);
    }
    if (definition.maturity === "fallback") {
      if (evidence.renderer !== "section-model") violations.push(`${route}: fallback route must identify its shared section renderer`);
      if (evidence.dataDepth !== "shared") violations.push(`${route}: fallback route must declare shared data depth`);
    }
    if (definition.maturity === "unavailable") {
      if (evidence.renderer !== "directory") violations.push(`${route}: unavailable route must be a directory surface`);
      if (evidence.dataDepth !== "none" || evidence.objectDetail !== "none" || evidence.failureRecovery !== "none") {
        violations.push(`${route}: unavailable route cannot claim operational evidence`);
      }
      if (evidence.accessibility !== "none" || evidence.independentAcceptance !== "none") {
        violations.push(`${route}: unavailable route cannot claim module signoff`);
      }
    }
  }

  const contractPass = missing.length === 0 && extra.length === 0 && missingDefinitions.length === 0 && extraDefinitions.length === 0 && violations.length === 0;
  // Candidate source can prove implementation maturity, never its own human
  // acceptance. Route-owner and real assistive-technology acceptance are
  // frozen external overlays consumed by the release-candidate evidence gate.
  const acceptanceComplete = false;
  const routeMaturity = routeIds.map((route) => ({
    route,
    maturity: routes[route]?.maturity || null,
    accessibility: evidenceRecords[route]?.accessibility || null,
    independentAcceptance: evidenceRecords[route]?.independentAcceptance || null,
  }));
  const maturityCounts: Record<PanelRouteMaturity, number> = {
    complete: 0,
    "bounded-readonly": 0,
    fallback: 0,
    unavailable: 0,
  };
  for (const entry of routeMaturity) {
    if (entry.maturity) maturityCounts[entry.maturity] += 1;
  }

  return {
    missing,
    extra,
    missingDefinitions,
    extraDefinitions,
    violations,
    routeMaturity,
    maturityCounts,
    completeRoutes: routeIds.filter((route) => routes[route]?.maturity === ("complete" satisfies PanelRouteMaturity)),
    contractPass,
    acceptanceComplete,
    pass: contractPass && acceptanceComplete,
  };
}
