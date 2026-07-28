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
  // ALBUM_DEMO_FIXTURE=1 is a build-time opt-in used exclusively in CI/E2E
  // builds. It is never set in production or normal local development.
  if (process.env.ALBUM_DEMO_FIXTURE === "1") {
    return true;
  }
  return policy.albums === "local_demo";
}
