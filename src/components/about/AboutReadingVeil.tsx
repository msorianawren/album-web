import type { ReactNode } from "react";

export type AboutReadingVeilVariant = "hero" | "body" | "quote" | "compact";

type AboutReadingVeilProps = {
  children: ReactNode;
  variant: AboutReadingVeilVariant;
  className?: string;
};

export function AboutReadingVeil({ children, variant, className }: AboutReadingVeilProps) {
  return (
    <div className={["about-reading-zone", className].filter(Boolean).join(" ")}>
      <div
        className="about-reading-veil"
        data-about-reading-veil={variant}
        data-about-reading-veil-rendered="true"
        aria-hidden="true"
      />
      <div className="about-reading-content">{children}</div>
    </div>
  );
}
