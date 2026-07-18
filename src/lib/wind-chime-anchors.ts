export type ChimeAnchorSlot = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  tone: number;
  tubeCount: number;
};

const homeSlots: ChimeAnchorSlot[] = [
  { id: "home-hero", x: 92, y: 39, width: 8, height: 31, tone: 587.33, tubeCount: 5 },
];

const quietSlots: ChimeAnchorSlot[] = [
  { id: "quiet-gutter", x: 92, y: 48, width: 8, height: 28, tone: 523.25, tubeCount: 4 },
];

const gamesSlots: ChimeAnchorSlot[] = [
  { id: "games-gutter", x: 92, y: 34, width: 8, height: 26, tone: 698.46, tubeCount: 4 },
];

export function getWindChimeAnchors(pathname: string): ChimeAnchorSlot[] {
  if (pathname.startsWith("/studio")) return [];
  if (pathname === "/") return homeSlots;
  if (pathname === "/games") return gamesSlots;
  if (pathname === "/login" || pathname === "/profile" || pathname === "/boycott") return [];
  return quietSlots;
}
