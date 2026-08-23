import { Clock3, Ellipsis, Gauge, Network, Router, Search } from "lucide-react";
import type { OverviewInvestigationIcon } from "../evidence-model/overviewEvidenceTypes";

const GLYPHS = {
  diagnostic: Search,
  logs: Clock3,
  network: Network,
  route: Router,
  more: Ellipsis,
  resource: Gauge,
};

export function OverviewInvestigationGlyph({ icon, size }: {
  icon: OverviewInvestigationIcon;
  size: number;
}) {
  const Glyph = GLYPHS[icon];
  return <Glyph aria-hidden="true" size={size} />;
}
