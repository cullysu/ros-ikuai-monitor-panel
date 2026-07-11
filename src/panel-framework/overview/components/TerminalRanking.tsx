import type { ComponentProps } from "react";
import { Module } from "./DesktopModule";

type ModuleComponentProps = ComponentProps<typeof Module>;

export function TerminalRanking({ className = "", ...props }: ModuleComponentProps) {
  return <Module {...props} className={`ro-semantic-terminal-ranking ${className}`.trim()} />;
}
