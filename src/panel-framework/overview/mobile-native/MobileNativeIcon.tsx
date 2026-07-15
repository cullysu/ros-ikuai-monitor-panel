import {
  Activity,
  ArrowDown,
  ArrowUp,
  Cable,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  CloudOff,
  Gauge,
  LockKeyhole,
  Network,
  RadioTower,
  Route,
  Router,
  ShieldCheck,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  evidence: CircleHelp,
  "wan-offline": CloudOff,
  wan: Router,
  resource: Gauge,
  interfaces: Cable,
  interface: Cable,
  collection: RadioTower,
  route: Route,
  "fleet-scope": Network,
  fleet: Network,
  proof: ShieldCheck,
  danger: TriangleAlert,
  download: ArrowDown,
  upload: ArrowUp,
  expand: ChevronDown,
  back: ChevronLeft,
  forward: ChevronRight,
  readonly: LockKeyhole,
};

export function MobileNativeIcon({ name, size = 18, className = "" }: { name: string; size?: number; className?: string }) {
  const Icon = ICONS[name] || Activity;
  return <Icon aria-hidden="true" className={className} size={size} strokeWidth={1.8} />;
}
