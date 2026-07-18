import type { EnvironmentState } from "@/lib/environment/presets";

export function EnvironmentStaticFallback({ state, brightness }: { state: EnvironmentState; brightness: number }) {
  return (
    <div
      className="environment-static-fallback"
      aria-hidden="true"
      style={{
        "--environment-clear": state.clearColor,
        "--environment-fog": state.fogColor,
        "--environment-key": state.keyLight,
        "--environment-fill": state.fillLight,
        "--environment-brightness": brightness / 100,
      } as React.CSSProperties}
    />
  );
}
