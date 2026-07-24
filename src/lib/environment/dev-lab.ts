export interface EnvironmentDevLabState {
  mistSceneFog?: boolean;
  mistFarHaze?: boolean;
  mistMiddle?: boolean;
  mistGround?: boolean;
  mistFore?: boolean;
  vegetationOnly?: boolean;
  atmosphereOnly?: boolean;
  staticFallback?: boolean;
  freezeAnimation?: boolean;
  mistEdgeDebug?: boolean;
  mistNoiseContrast?: number;
  mistOpacityMultiplier?: number;
  mistMotionSpeed?: number;
}

type EnvironmentDevLabWindow = Window & {
  __DEV_LAB__?: EnvironmentDevLabState;
};

export function getEnvironmentDevLabState(): EnvironmentDevLabState {
  if (typeof window === "undefined") return {};
  return (window as EnvironmentDevLabWindow).__DEV_LAB__ ?? {};
}

export function setEnvironmentDevLabState(value: EnvironmentDevLabState) {
  (window as EnvironmentDevLabWindow).__DEV_LAB__ = value;
}
