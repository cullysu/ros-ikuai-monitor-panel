import type { ComponentProps } from "react";
import { Module } from "./DesktopModule";

type ModuleComponentProps = ComponentProps<typeof Module>;

export function WanTrend({ className = "", ...props }: ModuleComponentProps) {
  return <Module {...props} className={`ro-semantic-wan-trend ${className}`.trim()} />;
}
