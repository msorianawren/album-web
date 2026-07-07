import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type InputProps = InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "h-12 w-full min-w-0 rounded-2xl border border-border bg-surface/80 px-4 text-sm text-text-primary outline-none transition file:mr-3 file:rounded-full file:border-0 file:bg-accent file:px-3 file:py-1.5 file:text-xs file:font-semibold file:uppercase file:tracking-[0.1em] file:text-accent-foreground focus:border-accent focus:ring-2 focus:ring-ring placeholder:text-text-secondary",
          className,
        )}
        {...props}
      />
    );
  },
);

Input.displayName = "Input";
