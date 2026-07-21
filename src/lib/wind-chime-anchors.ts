import type { EnvironmentChimeMaterial } from "./environment/chime-materials";

export type WindChimeMaterial = EnvironmentChimeMaterial;

export type ChimeAnchorSlot = {
  id: string;
  selector: string;
  side: "left" | "right";
  scale: number;
  depth: number;
  tone: number;
  tubeCount: number;
  material: WindChimeMaterial;
};

export type ChimeAnchorRect = ChimeAnchorSlot & {
  left: number;
  top: number;
  widthPx: number;
  heightPx: number;
  visible: boolean;
};

const identities = [
  { selector: "[data-environment-anchor='hero-right']", side: "right", scale: .6, depth: 0, tone: 587.33, tubeCount: 5, material: "champagne" },
  { selector: "[data-environment-anchor='archive-left']", side: "left", scale: .6, depth: -.15, tone: 587.33, tubeCount: 5, material: "champagne" },
  { selector: "[data-environment-anchor='story-right']", side: "right", scale: .6, depth: -.3, tone: 587.33, tubeCount: 5, material: "champagne" },
  { selector: "[data-environment-anchor='footer-branch']", side: "left", scale: .6, depth: -.4, tone: 587.33, tubeCount: 5, material: "champagne" },
] as const;

function createSlots(prefix: string): ChimeAnchorSlot[] {
  return identities.map((identity, index) => ({ ...identity, id: `${prefix}-${index + 1}` }));
}

export function getWindChimeAnchors(pathname: string): ChimeAnchorSlot[] {
  if (
    pathname.startsWith("/studio")
    || pathname === "/login"
    || pathname.startsWith("/auth/")
    || pathname === "/boycott"
  ) return [];
  if (pathname === "/") return createSlots("home");
  if (pathname === "/albums") return createSlots("albums");
  if (pathname.startsWith("/albums/")) return createSlots("album-detail");
  if (pathname === "/about") return createSlots("about");
  if (pathname === "/contact") return createSlots("contact");
  if (pathname === "/games") return createSlots("games");
  if (pathname === "/profile") return createSlots("profile");
  return [];
}
