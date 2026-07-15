export type DemoFixturePolicy = Readonly<{
  albums: "disabled" | "local_demo";
}>;

// This is an explicit code flag, not an environment fallback. Production and
// normal local development both keep fixtures disabled unless intentionally changed.
export const demoFixturePolicy: DemoFixturePolicy = Object.freeze({
  albums: "disabled",
});

export function albumDemoFixturesEnabled(
  policy: DemoFixturePolicy = demoFixturePolicy,
) {
  return policy.albums === "local_demo";
}
