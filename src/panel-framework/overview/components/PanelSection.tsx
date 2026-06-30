import type { ReactNode } from "react";

interface PanelSectionProps {
  title: string;
  subtitle?: string;
  aside?: ReactNode;
  className?: string;
  children: ReactNode;
}

export function PanelSection({
  title,
  subtitle,
  aside,
  className,
  children
}: PanelSectionProps) {
  return (
    <section className={["overview-section", className].filter(Boolean).join(" ")}>
      <div className="overview-section__header">
        <div>
          <h2 className="overview-section__title">{title}</h2>
          {subtitle ? <p className="overview-section__subtitle">{subtitle}</p> : null}
        </div>
        {aside ? <div className="overview-section__aside">{aside}</div> : null}
      </div>
      {children}
    </section>
  );
}
