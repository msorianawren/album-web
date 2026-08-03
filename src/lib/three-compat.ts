/**
 * Three.js Deprecation Warning Handler & Compatibility Layer
 * Safely silences upstream Three.js r185 deprecation logs (e.g. THREE.Clock / PCFSoftShadowMap)
 * while keeping 100% full visual fidelity and performance.
 */

if (typeof window !== "undefined") {
  const originalWarn = console.warn;
  console.warn = (...args: unknown[]) => {
    if (typeof args[0] === "string") {
      if (
        args[0].includes("THREE.Clock: This module has been deprecated") ||
        args[0].includes("THREE.WebGLShadowMap: PCFSoftShadowMap has been deprecated")
      ) {
        return;
      }
    }
    originalWarn.apply(console, args);
  };
}

export {};
