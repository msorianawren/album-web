export type WindChimeMaterial = "silver" | "champagne" | "bronze";

export type ChimeAnchorSlot = {
  id: string;
  sectionIndex: number;
  side: "left" | "right";
  align: number;
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
  { id: "home-hero", sectionIndex: 0, side: "right", align: 0.2, scale: 0.46, depth: 0, tone: 587.33, tubeCount: 5, material: "champagne" },
  { id: "home-editorial", sectionIndex: 1, side: "left", align: 0.22, scale: 0.32, depth: -0.2, tone: 523.25, tubeCount: 4, material: "silver" },
  { id: "home-worlds", sectionIndex: 2, side: "right", align: 0.2, scale: 0.34, depth: 0.1, tone: 659.25, tubeCount: 5, material: "champagne" },
  { id: "home-social", sectionIndex: 4, side: "left", align: 0.2, scale: 0.31, depth: -0.3, tone: 493.88, tubeCount: 4, material: "silver" },
  { id: "home-private", sectionIndex: 5, side: "right", align: 0.22, scale: 0.33, depth: 0.15, tone: 698.46, tubeCount: 5, material: "champagne" },
  { id: "home-collaborators", sectionIndex: 7, side: "left", align: 0.22, scale: 0.3, depth: -0.15, tone: 440, tubeCount: 4, material: "silver" },
];

const albumsSlots: ChimeAnchorSlot[] = [
  { id: "albums-intro", sectionIndex: 0, side: "right", align: 0.2, scale: 0.32, depth: 0, tone: 523.25, tubeCount: 4, material: "silver" },
  { id: "albums-archive", sectionIndex: 1, side: "left", align: 0.2, scale: 0.3, depth: -0.2, tone: 587.33, tubeCount: 5, material: "champagne" },
  { id: "albums-lower", sectionIndex: 1, side: "right", align: 0.8, scale: 0.29, depth: 0.1, tone: 659.25, tubeCount: 4, material: "silver" },
];

const aboutSlots: ChimeAnchorSlot[] = [
  { id: "about-hero", sectionIndex: 0, side: "left", align: 0.2, scale: 0.34, depth: 0, tone: 523.25, tubeCount: 5, material: "champagne" },
  { id: "about-story", sectionIndex: 2, side: "right", align: 0.2, scale: 0.31, depth: -0.2, tone: 587.33, tubeCount: 4, material: "silver" },
  { id: "about-portfolio", sectionIndex: 5, side: "left", align: 0.2, scale: 0.29, depth: 0.1, tone: 493.88, tubeCount: 4, material: "champagne" },
];

const contactSlots: ChimeAnchorSlot[] = [
  { id: "contact-intro", sectionIndex: 0, side: "right", align: 0.2, scale: 0.29, depth: 0, tone: 523.25, tubeCount: 4, material: "silver" },
  { id: "contact-form", sectionIndex: 0, side: "left", align: 0.78, scale: 0.28, depth: -0.2, tone: 587.33, tubeCount: 4, material: "champagne" },
];

const gameSlots: ChimeAnchorSlot[] = [
  { id: "games-intro", sectionIndex: 0, side: "right", align: 0.18, scale: 0.29, depth: 0, tone: 659.25, tubeCount: 4, material: "champagne" },
  { id: "games-lower", sectionIndex: 0, side: "left", align: 0.84, scale: 0.27, depth: -0.2, tone: 493.88, tubeCount: 4, material: "silver" },
];

const albumDetailSlots: ChimeAnchorSlot[] = [
  { id: "album-detail-hero", sectionIndex: 0, side: "left", align: 0.18, scale: 0.3, depth: 0, tone: 523.25, tubeCount: 4, material: "champagne" },
  { id: "album-detail-gallery", sectionIndex: 1, side: "right", align: 0.2, scale: 0.27, depth: -0.2, tone: 587.33, tubeCount: 4, material: "silver" },
];

const quietSlots: ChimeAnchorSlot[] = [
  { id: "quiet-page", sectionIndex: 0, side: "right", align: 0.2, scale: 0.26, depth: 0, tone: 523.25, tubeCount: 4, material: "silver" },
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
