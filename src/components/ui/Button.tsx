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
            "bg-accent text-accent-foreground hover:-translate-y-0.5 hover:shadow-xl hover:shadow-text-primary/10",
          variant === "secondary" &&
            "border border-border bg-surface/80 text-text-primary hover:-translate-y-0.5 hover:bg-surface",
          variant === "ghost" &&
            "text-text-primary hover:bg-surface-secondary",
          variant === "icon" &&
            "h-10 w-10 rounded-full border border-border bg-background p-0 text-text-primary hover:bg-surface",
          className,
        )}
        {...props}
      />
    );
  },
);

Button.displayName = "Button";
