export type WindChimeMaterial = "silver" | "champagne" | "bronze";

export type ChimeAnchorSlot = {
  id: string;
  viewportX: number;
  viewportY: number;
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

const homeSlots: ChimeAnchorSlot[] = [
  { id: "home-hero", viewportX: 0.92, viewportY: 0.35, scale: 0.72, depth: 0, tone: 587.33, tubeCount: 6, material: "champagne" },
  { id: "home-editorial", viewportX: 0.08, viewportY: 0.72, scale: 0.5, depth: -0.2, tone: 523.25, tubeCount: 4, material: "silver" },
];

const albumsSlots: ChimeAnchorSlot[] = [
  { id: "albums-intro", viewportX: 0.92, viewportY: 0.28, scale: 0.62, depth: 0, tone: 523.25, tubeCount: 5, material: "silver" },
  { id: "albums-archive", viewportX: 0.08, viewportY: 0.74, scale: 0.46, depth: -0.2, tone: 587.33, tubeCount: 5, material: "champagne" },
];

const aboutSlots: ChimeAnchorSlot[] = [
  { id: "about-hero", viewportX: 0.08, viewportY: 0.31, scale: 0.6, depth: 0, tone: 523.25, tubeCount: 5, material: "champagne" },
  { id: "about-story", viewportX: 0.92, viewportY: 0.73, scale: 0.44, depth: -0.2, tone: 587.33, tubeCount: 4, material: "silver" },
];

const contactSlots: ChimeAnchorSlot[] = [
  { id: "contact-intro", viewportX: 0.92, viewportY: 0.3, scale: 0.54, depth: 0, tone: 523.25, tubeCount: 4, material: "silver" },
  { id: "contact-form", viewportX: 0.08, viewportY: 0.74, scale: 0.42, depth: -0.2, tone: 587.33, tubeCount: 4, material: "champagne" },
];

const gameSlots: ChimeAnchorSlot[] = [
  { id: "games-intro", viewportX: 0.92, viewportY: 0.28, scale: 0.54, depth: 0, tone: 659.25, tubeCount: 4, material: "champagne" },
  { id: "games-lower", viewportX: 0.08, viewportY: 0.74, scale: 0.42, depth: -0.2, tone: 493.88, tubeCount: 4, material: "silver" },
];

const albumDetailSlots: ChimeAnchorSlot[] = [
  { id: "album-detail-hero", viewportX: 0.08, viewportY: 0.3, scale: 0.52, depth: 0, tone: 523.25, tubeCount: 4, material: "champagne" },
  { id: "album-detail-gallery", viewportX: 0.92, viewportY: 0.72, scale: 0.4, depth: -0.2, tone: 587.33, tubeCount: 4, material: "silver" },
];

const quietSlots: ChimeAnchorSlot[] = [
  { id: "quiet-page", viewportX: 0.92, viewportY: 0.3, scale: 0.46, depth: 0, tone: 523.25, tubeCount: 4, material: "silver" },
];

export function getWindChimeAnchors(pathname: string): ChimeAnchorSlot[] {
  if (pathname.startsWith("/studio")) return [];
  if (pathname === "/") return homeSlots;
  if (pathname === "/albums") return albumsSlots;
  if (pathname.startsWith("/albums/")) return albumDetailSlots;
  if (pathname === "/about") return aboutSlots;
  if (pathname === "/contact") return contactSlots;
  if (pathname === "/games") return gameSlots;
  if (pathname === "/login" || pathname === "/profile" || pathname === "/boycott") return quietSlots;
  return quietSlots;
}
