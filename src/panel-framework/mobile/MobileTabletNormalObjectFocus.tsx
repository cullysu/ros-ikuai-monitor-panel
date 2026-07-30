import type { ReactNode } from "react";

export function MobileTabletNormalObjectFocus({ children }: { children: ReactNode }) {
  return (
    <div
      className="mp-tablet-object-focus"
      data-tablet-normal-object-focus="early"
      data-tablet-space-purpose="object-selection"
    >
      {children}
    </div>
  );
}
