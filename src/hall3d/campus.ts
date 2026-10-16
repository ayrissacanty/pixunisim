/** Indoor campus layout (pure data). A wide ring corridor around the subject rooms and an open plaza.
 *  The library is a second floor over the north wing, reached by the plaza stairs.
 *  Grid units = world units. Grid x runs west->east, grid y runs north->south. World = (x - W/2, z = y - H/2). */
export type Subject = "math" | "ela" | "science" | "history" | "careers" | "life";
export const SUBJECTS: Subject[] = ["math", "ela", "science", "history", "careers", "life"];
export const W = 88, H = 66, WALL_H = 4.2, LOCK_D = 0.6, FLOOR_Y = 4.55;
export interface Rect { x: number; y: number; w: number; h: number }
export type Face = "N" | "S" | "E" | "W";

export const BLOCKS: { subject: Subject; rect: Rect }[] = [
  { subject: "math", rect: { x: 8, y: 8, w: 18, h: 14 } },
  { subject: "ela", rect: { x: 62, y: 8, w: 18, h: 14 } },
  { subject: "science", rect: { x: 8, y: 44, w: 18, h: 14 } },
  { subject: "history", rect: { x: 62, y: 44, w: 18, h: 14 } },
  { subject: "careers", rect: { x: 30, y: 8, w: 8, h: 11 } },
  { subject: "life", rect: { x: 52, y: 8, w: 8, h: 11 } },
];

export interface Door { subject: Subject; face: Face; cx: number; cy: number; trigger: Rect; approach: { x: number; y: number } }
/** one door per block, on the face that opens onto the plaza */
export const DOORS: Door[] = BLOCKS.map((b) => {
  const south = b.rect.y + b.rect.h / 2 < H / 2, cx = b.rect.x + b.rect.w / 2, cy = south ? b.rect.y + b.rect.h : b.rect.y;
  return { subject: b.subject, face: south ? "S" : "N", cx, cy, trigger: { x: cx - 1.2, y: south ? cy : cy - 0.9, w: 2.4, h: 0.9 }, approach: { x: cx, y: south ? cy + 1.6 : cy - 1.6 } };
});

/** the newsroom door: centred on the north outer wall */
export const NEWS = { cx: 44, cy: 0, trigger: { x: 42.8, y: 0.45, w: 2.4, h: 0.95 } as Rect, approach: { x: 44, y: 2.6 } };
/** The Open Door: the parent-run classroom, a door in the west outer wall */
export const OPEN = { cx: 0, cy: 33, trigger: { x: 0.45, y: 31.8, w: 0.95, h: 2.4 } as Rect, approach: { x: 2.8, y: 33 } };
export type Room = Subject | "news" | "open";

/** second floor: a library on the roofs of the north classrooms, so the ring corridor stays open */
export const LIB_SHELL: Rect = { x: 8, y: 8, w: 72, h: 10 };
export const LIBRARY: Rect = { x: 10, y: 9, w: 68, h: 8 };
export const LIB_SHELVES: Rect[] = [
  { x: 14, y: 10, w: 1.6, h: 5 }, { x: 22, y: 10, w: 1.6, h: 5 },
  { x: 64, y: 10, w: 1.6, h: 5 }, { x: 72, y: 10, w: 1.6, h: 5 },
];
export const STAIR_BLOCK: Rect = { x: 40, y: 18, w: 8, h: 8 };
export const STAIR_UP: Rect = { x: 40.5, y: 26.2, w: 7, h: 1.3 };
export const STAIR_DOWN: Rect = { x: 40.5, y: 15.2, w: 7, h: 1.1 };
export const STAIR_GROUND = { x: 44, y: 28.4 };
export const STAIR_TOP = { x: 44, y: 13.2 };
export const LIB_READ = { x: 44, y: 12.4 };

export interface LockerRun { rect: Rect; face: Face }
export const LOCKERS: LockerRun[] = [
  { rect: { x: 8, y: 0, w: 32, h: LOCK_D }, face: "S" }, { rect: { x: 48, y: 0, w: 32, h: LOCK_D }, face: "S" },
  { rect: { x: 8, y: H - LOCK_D, w: 28, h: LOCK_D }, face: "N" }, { rect: { x: 52, y: H - LOCK_D, w: 28, h: LOCK_D }, face: "N" },
  { rect: { x: 0, y: 8, w: LOCK_D, h: 22 }, face: "E" }, { rect: { x: 0, y: 36, w: LOCK_D, h: 22 }, face: "E" },
  { rect: { x: W - LOCK_D, y: 8, w: LOCK_D, h: 50 }, face: "W" },
];

export type PropKind = "tree" | "bench" | "table" | "fountain" | "planter" | "lamp" | "tv" | "bboard";
export interface Prop { kind: PropKind; x: number; y: number; rot?: number }
export const ENTRANCE = { gap: { x0: 40, x1: 48 }, tile: { x: 44, y: H - 1 } };
const tablesAt = (xs: number[], ys: number[]): Prop[] => xs.flatMap((x) => ys.map((y) => ({ kind: "table" as const, x, y })));
export const PROPS: Prop[] = [
  { kind: "fountain", x: 44, y: 38 },
  { kind: "bboard", x: 44, y: 42.2 },
  { kind: "tv", x: 54, y: 30 },
  ...[[28, 26], [60, 26], [28, 41], [60, 41], [16, 33], [72, 33]].map(([x, y]) => ({ kind: "tree" as const, x, y })),
  ...tablesAt([22, 66], [30, 36]),
  ...[[38, 36], [50, 36]].map(([x, y]) => ({ kind: "bench" as const, x, y, rot: Math.PI / 2 })),
  { kind: "planter", x: 40, y: 35.2 }, { kind: "planter", x: 48, y: 35.2 }, { kind: "planter", x: 40, y: 40.6 }, { kind: "planter", x: 48, y: 40.6 },
  ...[[14, 4], [30, 4], [58, 4], [74, 4], [14, 62], [74, 62], [4, 16], [4, 48], [84, 20], [84, 50]].map(([x, y]) => ({ kind: "lamp" as const, x, y })),
];

const SIZE: Record<PropKind, [number, number]> = { tree: [1.2, 1.2], bench: [0.7, 1.9], table: [1.9, 1.9], fountain: [4.6, 4.6], planter: [1.4, 1.4], lamp: [0.1, 0.1], tv: [2.0, 1.3], bboard: [3.2, 0.7] };

/** solid rectangles used for collision and navigation on the ground floor */
export function blockers(): Rect[] {
  const r: Rect[] = BLOCKS.map((b) => ({ ...b.rect }));
  r.push(STAIR_BLOCK);
  for (const l of LOCKERS) r.push(l.rect);
  for (const p of PROPS) { const [w, h] = SIZE[p.kind]; if (p.kind === "lamp") continue; r.push({ x: p.x - w / 2, y: p.y - h / 2, w, h }); }
  return r;
}
export const BLOCKED = blockers();

export const hit = (r: Rect, x: number, y: number, pad = 0) => x > r.x - pad && x < r.x + r.w + pad && y > r.y - pad && y < r.y + r.h + pad;
export function solidAt(x: number, y: number, pad = 0.16, floor = 0): boolean {
  if (floor === 1) {
    const L = LIBRARY;
    if (x < L.x + 0.55 || y < L.y + 0.55 || x > L.x + L.w - 0.55 || y > L.y + L.h - 0.55) return true;
    return LIB_SHELVES.some((r) => hit(r, x, y, pad));
  }
  if (x < 0.45 || y < 0.45 || x > W - 0.45) return true;
  if (y > H - 0.45) return !(x > ENTRANCE.gap.x0 && x < ENTRANCE.gap.x1 && y < H + 3);
  return BLOCKED.some((r) => hit(r, x, y, pad));
}
/** nav grid, one char per 1x1 tile: "." open, "#" blocked (tile centre inside a blocker) */
const row = (blocked: (x: number, y: number) => boolean) => Array.from({ length: H }, (_, y) => Array.from({ length: W }, (_, x) => (blocked(x + 0.5, y + 0.5) ? "#" : ".")).join(""));
export const NAV: string[] = row((x, y) => BLOCKED.some((r) => hit(r, x, y, 0.2)));
export const NAV_UP: string[] = row((x, y) => {
  const L = LIBRARY;
  if (x < L.x + 0.55 || y < L.y + 0.55 || x > L.x + L.w - 0.55 || y > L.y + L.h - 0.55) return true;
  return LIB_SHELVES.some((r) => hit(r, x, y, 0.15));
});
export const PLAZA_TILES: { x: number; y: number }[] = NAV.flatMap((line, y) => line.split("").map((c, x) => ({ c, x, y }))).filter((t) => t.c === "." && t.x >= 27 && t.x <= 61 && t.y >= 23 && t.y <= 43 && !BLOCKS.some((b) => hit(b.rect, t.x + 0.5, t.y + 0.5, 0)));
export const CORRIDOR_TILES: { x: number; y: number }[] = NAV.flatMap((line, y) => line.split("").map((c, x) => ({ c, x, y }))).filter((t) => t.c === "." && (t.x < 8 || t.x > W - 9 || t.y < 8 || t.y > H - 9));

/** outside the front doors: the class-times bulletin board by the entrance, the bus stop on the road in front of the school (grid units; y > H is outdoors) */
export const OUTSIDE = { board: { x: 52, y: H + 2.4 }, boardStand: { x: 52, y: H + 4.0 }, busStop: { x: 24, y: H + 7.6 }, busDoor: { x: 30, y: H + 5.9 }, roadY: H + 7.6 };
/** Chat Chow: the plaza tables where students sit and talk */
export const CHOW_TABLES: { x: number; y: number }[] = PROPS.filter((p) => p.kind === "table").map((p) => ({ x: p.x, y: p.y }));
