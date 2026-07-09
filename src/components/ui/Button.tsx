import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "icon";

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", type = "button", ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          "inline-flex h-11 min-w-0 items-center justify-center gap-2 rounded-full px-4 text-[0.68rem] font-semibold uppercase tracking-[0.1em] transition-all duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 sm:px-5 sm:text-xs sm:tracking-[0.14em]",
          variant === "primary" &&
            "bg-accent text-accent-foreground hover:-translate-y-0.5 hover:shadow-[var(--preset-glow)]",
          variant === "secondary" &&
            "border border-[var(--glass-border)] bg-[var(--glass-bg)] backdrop-blur-md text-text-primary hover:-translate-y-0.5 hover:border-[var(--preset-accent)] hover:bg-[var(--preset-hover-bg)] hover:shadow-[var(--preset-glow)]",
          variant === "ghost" &&
            "text-text-primary hover:bg-[var(--preset-hover-bg)] hover:text-[var(--preset-accent)]",
          variant === "icon" &&
            "h-10 w-10 shrink-0 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg)] backdrop-blur-md p-0 text-text-primary hover:-translate-y-0.5 hover:border-[var(--preset-accent)] hover:bg-[var(--preset-hover-bg)] hover:shadow-[var(--preset-glow)]",
          "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg]:stroke-current",
          className,
        )}
        {...props}
      />
    );
  },
);

Button.displayName = "Button";
