import type { CSSProperties } from "react";

export function mobilePatrolStateStyle(risk: string): CSSProperties {
  const warn = risk === "resource" || risk === "collection" || risk === "route" || risk === "interface-review";
  const error = risk === "wan" || risk === "interfaces" || risk === "evidence";
  return {
    "--mp-state-accent": warn ? "var(--mp-warn)" : error ? "var(--mp-danger)" : "var(--mp-blue-dark)",
  } as CSSProperties;
}
