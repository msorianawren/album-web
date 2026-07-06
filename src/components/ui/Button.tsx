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
          "inline-flex h-11 items-center justify-center gap-2 rounded-xl px-5 text-sm font-medium transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50",
          variant === "primary" &&
            "bg-accent text-accent-foreground hover:scale-[1.02]",
          variant === "secondary" &&
            "border border-border bg-surface text-text-primary hover:bg-surface-secondary",
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
