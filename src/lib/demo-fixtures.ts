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
  if (
    process.env.CI ||
    process.env.NEXT_PUBLIC_SUPABASE_URL?.includes("example.supabase.co")
  ) {
    return true;
  }
  return policy.albums === "local_demo";
}
