import type { ComponentProps } from "react";
import { Module } from "./DesktopModule";

type ModuleComponentProps = ComponentProps<typeof Module>;

export function EvidenceChain({ className = "", ...props }: ModuleComponentProps) {
  return <Module {...props} className={`ro-semantic-evidence-chain ${className}`.trim()} />;
}
