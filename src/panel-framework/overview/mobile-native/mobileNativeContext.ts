import type { OverviewDerivedState, OverviewRawRoute, OverviewRawSnapshot } from "../index";
import type {
  MobileCollectionChannelEvidence,
  MobileEvidenceMode,
  MobileRiskKey,
  MobileRouteVerification,
} from "./mobileNativeTypes";

export interface MobileFocusContext {
  snapshot: OverviewRawSnapshot;
  state: OverviewDerivedState;
  mode: MobileEvidenceMode;
  verification: MobileRouteVerification;
  route: OverviewRawRoute | null;
  risks: MobileRiskKey[];
  channels: { rest: MobileCollectionChannelEvidence; ssh: MobileCollectionChannelEvidence };
}
