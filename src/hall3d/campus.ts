/** Indoor campus layout (pure data): a ring corridor around four subject blocks and a central plaza.
 *  Grid units = world units. Grid x runs west->east, grid y runs north->south. World = (x - W/2, z = y - H/2). */
export type Subject = "math" | "ela" | "science" | "history" | "careers" | "life";
export const SUBJECTS: Subject[] = ["math", "ela", "science", "history", "careers", "life"];
export const W = 56, H = 44, WALL_H = 4.2, LOCK_D = 0.6;
export interface Rect { x: number; y: number; w: number; h: number }
export type Face = "N" | "S" | "E" | "W";

export const BLOCKS: { subject: Subject; rect: Rect }[] = [
  { subject: "math", rect: { x: 5, y: 5, w: 16, h: 12 } },
  { subject: "ela", rect: { x: 35, y: 5, w: 16, h: 12 } },
  { subject: "science", rect: { x: 5, y: 27, w: 16, h: 12 } },
  { subject: "history", rect: { x: 35, y: 27, w: 16, h: 12 } },
  { subject: "careers", rect: { x: 22.5, y: 6, w: 5, h: 7 } },   // CarryingCareers: every career path, any type, in one room
  { subject: "life", rect: { x: 28.5, y: 6, w: 5, h: 7 } },       // Life Lessons: the fundamentals of growing into an independent adult
];

export interface Door { subject: Subject; face: Face; cx: number; cy: number; trigger: Rect; approach: { x: number; y: number } }
/** one door per block, on the face that opens onto the plaza band */
export const DOORS: Door[] = BLOCKS.map((b) => {
  const south = b.rect.y < 20, cx = b.rect.x + b.rect.w / 2, cy = south ? b.rect.y + b.rect.h : b.rect.y;
  return { subject: b.subject, face: south ? "S" : "N", cx, cy, trigger: { x: cx - 1.2, y: south ? cy : cy - 0.9, w: 2.4, h: 0.9 }, approach: { x: cx, y: south ? cy + 1.6 : cy - 1.6 } };
});

/** the newsroom door: centred on the north outer wall, between two locker runs */
export const NEWS = { cx: 28, cy: 0, trigger: { x: 26.8, y: 0.45, w: 2.4, h: 0.95 } as Rect, approach: { x: 28, y: 2.4 } };
/** The Open Door: the parent-run classroom, a door in the west outer wall */
export const OPEN = { cx: 0, cy: 22, trigger: { x: 0.45, y: 20.8, w: 0.95, h: 2.4 } as Rect, approach: { x: 2.6, y: 22 } };
export type Room = Subject | "news" | "open";
export interface LockerRun { rect: Rect; face: Face }
export const LOCKERS: LockerRun[] = [
  { rect: { x: 6, y: 0, w: 19, h: LOCK_D }, face: "S" }, { rect: { x: 31, y: 0, w: 19, h: LOCK_D }, face: "S" },
  { rect: { x: 6, y: H - LOCK_D, w: 18, h: LOCK_D }, face: "N" }, { rect: { x: 32, y: H - LOCK_D, w: 18, h: LOCK_D }, face: "N" },
  { rect: { x: 0, y: 6, w: LOCK_D, h: 14 }, face: "E" }, { rect: { x: 0, y: 24, w: LOCK_D, h: 14 }, face: "E" }, { rect: { x: W - LOCK_D, y: 6, w: LOCK_D, h: 32 }, face: "W" },
  { rect: { x: 6, y: 5 - LOCK_D, w: 14, h: LOCK_D }, face: "N" }, { rect: { x: 36, y: 5 - LOCK_D, w: 14, h: LOCK_D }, face: "N" },
  { rect: { x: 6, y: 39, w: 14, h: LOCK_D }, face: "S" }, { rect: { x: 36, y: 39, w: 14, h: LOCK_D }, face: "S" },
  { rect: { x: 5 - LOCK_D, y: 6, w: LOCK_D, h: 10 }, face: "W" }, { rect: { x: 5 - LOCK_D, y: 28, w: LOCK_D, h: 10 }, face: "W" },
  { rect: { x: 51, y: 6, w: LOCK_D, h: 10 }, face: "E" }, { rect: { x: 51, y: 28, w: LOCK_D, h: 10 }, face: "E" },
];

export type PropKind = "tree" | "bench" | "table" | "fountain" | "planter" | "lamp" | "tv" | "bboard";
export interface Prop { kind: PropKind; x: number; y: number; rot?: number }
export const ENTRANCE = { gap: { x0: 24, x1: 32 }, tile: { x: 28, y: H - 1 } };
const tablesAt = (xs: number[], ys: number[]): Prop[] => xs.flatMap((x) => ys.map((y) => ({ kind: "table" as const, x, y })));
export const PROPS: Prop[] = [
  { kind: "fountain", x: 28, y: 22 },
  { kind: "bboard", x: 28, y: 30.8 },   // the live bulletin board on the plaza (drawn by hallDetails)
  { kind: "tv", x: 28, y: 15.6 },   // the wired-in news box TV (drawn by HallScene); the class-times bulletin board now stands outside the entrance
  ...[[23.5, 36.5], [32.5, 36.5], [7, 22], [49, 22], [23, 30], [33, 30]].map(([x, y]) => ({ kind: "tree" as const, x, y })),
  ...tablesAt([10, 14, 18], [20, 24]), ...tablesAt([38, 42, 46], [20, 24]),
  ...[[24.2, 33], [31.8, 33]].map(([x, y]) => ({ kind: "bench" as const, x, y, rot: Math.PI / 2 })),
  { kind: "planter", x: 25.2, y: 18.2 }, { kind: "planter", x: 30.8, y: 18.2 }, { kind: "planter", x: 25.2, y: 25.8 }, { kind: "planter", x: 30.8, y: 25.8 },
  ...[[12, 2.5], [20, 2.5], [36, 2.5], [44, 2.5], [12, 41.5], [2.5, 18.5], [53.5, 22]].map(([x, y]) => ({ kind: "lamp" as const, x, y })),
];

/** the grand staircase in the entrance lobby: rises eastward along the south corridor up to the balcony gallery.
 *  `footprint` blocks the ground floor under it; `up`/`down` are the walk-in triggers at each end. */
export const STAIRS = {
  base: { x: 34, y: 41 }, top: { x: 43, y: 41 },
  up: { x: 33.5, y: 40.7, w: 1.6, h: 1.8 } as Rect, down: { x: 42.7, y: 40.7, w: 1.7, h: 1.8 } as Rect,
  footprint: { x: 35, y: 40.6, w: 7.2, h: 2.2 } as Rect,
};

const SIZE: Record<PropKind, [number, number]> = { tree: [1.2, 1.2], bench: [0.7, 1.9], table: [1.9, 1.9], fountain: [4.6, 4.6], planter: [1.4, 1.4], lamp: [0.1, 0.1], tv: [2.0, 1.3], bboard: [3.2, 0.7] };

/** solid rectangles used for collision and navigation */
export function blockers(): Rect[] {
  const r: Rect[] = BLOCKS.map((b) => ({ ...b.rect }));
  for (const l of LOCKERS) r.push(l.rect);
  for (const p of PROPS) { const [w, h] = SIZE[p.kind]; if (p.kind === "lamp") continue; r.push({ x: p.x - w / 2, y: p.y - h / 2, w, h }); }
  r.push({ ...STAIRS.footprint });   // the grand staircase is solid at ground level
  return r;
}
export const BLOCKED = blockers();

export const hit = (r: Rect, x: number, y: number, pad = 0) => x > r.x - pad && x < r.x + r.w + pad && y > r.y - pad && y < r.y + r.h + pad;
export function solidAt(x: number, y: number, pad = 0.16): boolean {
  if (x < 0.45 || y < 0.45 || x > W - 0.45) return true;
  if (y > H - 0.45) return !(x > ENTRANCE.gap.x0 && x < ENTRANCE.gap.x1 && y < H + 3);
  return BLOCKED.some((r) => hit(r, x, y, pad));
}
/** nav grid, one char per 1x1 tile: "." open, "#" blocked (tile centre inside a blocker) */
export const NAV: string[] = Array.from({ length: H }, (_, y) => Array.from({ length: W }, (_, x) => (BLOCKED.some((r) => hit(r, x + 0.5, y + 0.5, 0.2)) ? "#" : ".")).join(""));
export const PLAZA_TILES: { x: number; y: number }[] = NAV.flatMap((row, y) => row.split("").map((c, x) => ({ c, x, y }))).filter((t) => t.c === "." && t.x >= 7 && t.x <= 48 && t.y >= 7 && t.y <= 37 && !BLOCKS.some((b) => hit(b.rect, t.x + 0.5, t.y + 0.5, 0)));
export const CORRIDOR_TILES: { x: number; y: number }[] = NAV.flatMap((row, y) => row.split("").map((c, x) => ({ c, x, y }))).filter((t) => t.c === "." && (t.x < 4 || t.x > W - 5 || t.y < 4 || t.y > H - 5));

/** upstairs: a three-tile-wide balcony gallery ringing the atrium, overlooking the plaza below */
export const UP_NAV: string[] = Array.from({ length: H }, (_, y) => Array.from({ length: W }, (_, x) =>
  (x >= 1 && x <= 3) || (x >= W - 4 && x <= W - 2) || (y >= 1 && y <= 3) || (y >= H - 4 && y <= H - 2) ? "." : "#").join(""));
export function upSolidAt(x: number, y: number, pad = 0.16): boolean {
  if (x < 0.45 || y < 0.45 || x > W - 0.45 || y > H - 0.45) return true;
  const inRing = (x > 1 - pad && x < 4 + pad) || (x > W - 4 - pad && x < W - 1 + pad) || (y > 1 - pad && y < 4 + pad) || (y > H - 4 - pad && y < H - 1 + pad);
  return !inRing;
}

/** outside the front doors: the class-times bulletin board by the entrance, the bus stop on the road in front of the school (grid units; y > H is outdoors) */
export const OUTSIDE = { board: { x: 35.2, y: H + 2.4 }, boardStand: { x: 35.2, y: H + 4.0 }, busStop: { x: 16, y: H + 7.6 }, busDoor: { x: 21.6, y: H + 5.9 }, roadY: H + 7.6 };
/** Chat Chow: the plaza tables where students sit and talk (the six west and six east tables) */
export const CHOW_TABLES: { x: number; y: number }[] = PROPS.filter((p) => p.kind === "table").map((p) => ({ x: p.x, y: p.y }));
