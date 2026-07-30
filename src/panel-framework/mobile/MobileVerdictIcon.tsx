import { CircleAlert, ShieldCheck } from "lucide-react";
import type { OverviewTone } from "../overview";

export function MobileVerdictIcon({ tone }: { tone: OverviewTone }) {
  if (tone !== "ok") return <CircleAlert aria-hidden="true" size={22} />;
  return <ShieldCheck aria-hidden="true" size={22} />;
}
