import type { EnvironmentState } from "@/lib/environment/presets";
import "./EnvironmentStaticFallback.css";

export function EnvironmentStaticFallback({ state, brightness }: { state: EnvironmentState; brightness: number }) {
  const isMist = state.preset === "mist";
  
  return (
    <div
      className={`environment-static-fallback ${isMist ? 'environment-static-fallback--mist' : ''}`}
      aria-hidden="true"
      style={{
        "--environment-clear": state.clearColor,
        "--environment-fog": state.fogColor,
        "--environment-key": state.keyLight,
        "--environment-fill": state.fillLight,
        "--environment-branch": state.branchColor,
        "--environment-brightness": brightness / 100,
      } as React.CSSProperties}
    >
      {isMist && (
        <div className="mist-fallback-layers">
          <div className="mist-fallback-layer mist-fallback-layer--far"></div>
          <div className="mist-fallback-layer mist-fallback-layer--mid"></div>
          <div className="mist-fallback-layer mist-fallback-layer--fog"></div>
        </div>
      )}
    </div>
  );
}
