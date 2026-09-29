import type { LogRowEvidence } from "./sectionRowEvidenceTypes";

export type ServiceLogCategory = "system" | "firewall" | "dhcp" | "dns" | "unknown";

export interface ServiceLogRowEvidence extends LogRowEvidence {
  serviceCategory: ServiceLogCategory;
  sourceCollection: string | null;
  categoryStatus: "observed" | "unavailable";
}

