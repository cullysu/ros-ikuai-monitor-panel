import type { PanelRouteId } from "../../routes/panelRoutes";

export interface RouteRecoveryAction {
  route: PanelRouteId;
  label: string;
}

export interface RouteRecoveryCopy {
  title: string;
  body: string;
  /**
   * The single investigation route that best resolves a partial or unavailable
   * observation. Historical evidence deliberately stays advisory: it does not
   * pretend that one navigation action can make an old observation current.
   */
  primaryAction?: PanelRouteId;
}

export interface RouteRecoveryPolicy {
  heading: string;
  partial: RouteRecoveryCopy;
  historical: RouteRecoveryCopy;
  unavailable: RouteRecoveryCopy;
  actions: readonly [RouteRecoveryAction, RouteRecoveryAction];
}
