/**
 * Compatibility projection for navigation consumers. Route maturity facts and
 * validation live exclusively in the canonical panel route maturity module.
 */
export {
  PANEL_ROUTE_MATURITY_V1,
  ROUTE_MATURITY_STATES,
  deriveRouteMaturityContracts,
  routeMaturityV1,
  validateRouteMaturityContract,
  type RouteMaturityContract,
  type RouteMaturityState,
  type RouteMaturityValidation,
  type RoutePresentationRequirement,
} from "../routes/panelRouteMaturity";
