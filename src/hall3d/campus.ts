/** Indoor campus layout (pure data). A wide ring corridor around the subject rooms and an open plaza.
 *  The library is a second floor over the north wing, reached by the plaza stairs.
 *  Grid units = world units. Grid x runs west->east, grid y runs north->south. World = (x - W/2, z = y - H/2). */
export type Subject = "math" | "ela" | "science" | "history" | "careers" | "life";
export const SUBJECTS: Subject[] = ["math", "ela", "science", "history", "careers", "life"];
export const W = 108, H = 82, WALL_H = 4.6, LOCK_D = 0.55, FLOOR_Y = 5.05;
export interface Rect { x: number; y: number; w: number; h: number }
export type Face = "N" | "S" | "E" | "W";

export const BLOCKS: { subject: Subject; rect: Rect }[] = [
  { subject: "math", rect: { x: 14, y: 14, w: 16, h: 12 } },
  { subject: "ela", rect: { x: 78, y: 14, w: 16, h: 12 } },
  { subject: "science", rect: { x: 14, y: 56, w: 16, h: 12 } },
  { subject: "history", rect: { x: 78, y: 56, w: 16, h: 12 } },
  { subject: "careers", rect: { x: 38, y: 14, w: 12, h: 10 } },
  { subject: "life", rect: { x: 58, y: 14, w: 12, h: 10 } },
];

export interface Door { subject: Subject; face: Face; cx: number; cy: number; trigger: Rect; approach: { x: number; y: number } }
/** one door per block, on the face that opens onto the plaza */
export const DOORS: Door[] = BLOCKS.map((b) => {
  const south = b.rect.y + b.rect.h / 2 < H / 2, cx = b.rect.x + b.rect.w / 2, cy = south ? b.rect.y + b.rect.h : b.rect.y;
  return { subject: b.subject, face: south ? "S" : "N", cx, cy, trigger: { x: cx - 1.2, y: south ? cy : cy - 0.9, w: 2.4, h: 0.9 }, approach: { x: cx, y: south ? cy + 1.6 : cy - 1.6 } };
});

/** the newsroom door: centred on the north outer wall */
export const NEWS = { cx: 54, cy: 0, trigger: { x: 52.8, y: 0.45, w: 2.4, h: 0.95 } as Rect, approach: { x: 54, y: 3.2 } };
/** The Open Door: the parent-run classroom, a door in the west outer wall */
export const OPEN = { cx: 0, cy: 41, trigger: { x: 0.45, y: 39.8, w: 0.95, h: 2.4 } as Rect, approach: { x: 3.2, y: 41 } };
export type Room = Subject | "news" | "open";

/** second floor: a library on the roofs of the north classrooms, so the ring corridor stays open */
export const LIB_SHELL: Rect = { x: 14, y: 14, w: 80, h: 12 };
export const LIBRARY: Rect = { x: 16, y: 15.4, w: 76, h: 9.2 };
export const LIB_SHELVES: Rect[] = [
  { x: 20, y: 16.2, w: 1.5, h: 6 }, { x: 28, y: 16.2, w: 1.5, h: 6 },
  { x: 78, y: 16.2, w: 1.5, h: 6 }, { x: 86, y: 16.2, w: 1.5, h: 6 },
];
export const STAIR_BLOCK: Rect = { x: 50, y: 27, w: 8, h: 6 };
export const STAIR_UP: Rect = { x: 50.5, y: 33.2, w: 7, h: 1.3 };
export const STAIR_DOWN: Rect = { x: 50.5, y: 22.6, w: 7, h: 1.1 };
export const STAIR_GROUND = { x: 54, y: 35.2 };
export const STAIR_TOP = { x: 54, y: 21.2 };
export const LIB_READ = { x: 54, y: 19.2 };

export interface LockerRun { rect: Rect; face: Face }
export const LOCKERS: LockerRun[] = [
  { rect: { x: 16, y: 0.4, w: 28, h: LOCK_D }, face: "S" }, { rect: { x: 64, y: 0.4, w: 28, h: LOCK_D }, face: "S" },
  { rect: { x: 16, y: H - LOCK_D - 0.4, w: 30, h: LOCK_D }, face: "N" }, { rect: { x: 62, y: H - LOCK_D - 0.4, w: 30, h: LOCK_D }, face: "N" },
  { rect: { x: 0.4, y: 16, w: LOCK_D, h: 20 }, face: "E" }, { rect: { x: 0.4, y: 48, w: LOCK_D, h: 20 }, face: "E" },
  { rect: { x: W - LOCK_D - 0.4, y: 16, w: LOCK_D, h: 48 }, face: "W" },
];

export type PropKind = "tree" | "bench" | "table" | "fountain" | "planter" | "lamp" | "tv" | "bboard";
export interface Prop { kind: PropKind; x: number; y: number; rot?: number }
export const ENTRANCE = { gap: { x0: 50, x1: 58 }, tile: { x: 54, y: H - 1 } };
const tablesAt = (xs: number[], ys: number[]): Prop[] => xs.flatMap((x) => ys.map((y) => ({ kind: "table" as const, x, y })));
export const PROPS: Prop[] = [
  { kind: "fountain", x: 54, y: 46 },
  { kind: "bboard", x: 54, y: 52 },
  { kind: "tv", x: 68, y: 40 },
  ...[[32, 36], [76, 36], [32, 58], [76, 58], [22, 42], [86, 42]].map(([x, y]) => ({ kind: "tree" as const, x, y })),
  ...tablesAt([28, 80], [40, 50]),
  ...[[46, 44], [62, 44], [8, 34], [100, 40]].map(([x, y]) => ({ kind: "bench" as const, x, y, rot: x < 20 || x > 90 ? 0 : Math.PI / 2 })),
  { kind: "planter", x: 48, y: 42 }, { kind: "planter", x: 60, y: 42 }, { kind: "planter", x: 48, y: 50 }, { kind: "planter", x: 60, y: 50 },
  { kind: "planter", x: 22, y: 8 }, { kind: "planter", x: 86, y: 8 }, { kind: "planter", x: 22, y: 74 }, { kind: "planter", x: 86, y: 74 },
  ...[[10, 6], [30, 6], [78, 6], [98, 6], [10, 76], [98, 76], [6, 24], [6, 58], [102, 24], [102, 58]].map(([x, y]) => ({ kind: "lamp" as const, x, y })),
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
export const PLAZA_TILES: { x: number; y: number }[] = NAV.flatMap((line, y) => line.split("").map((c, x) => ({ c, x, y }))).filter((t) => t.c === "." && t.x >= 32 && t.x <= 76 && t.y >= 30 && t.y <= 62 && !BLOCKS.some((b) => hit(b.rect, t.x + 0.5, t.y + 0.5, 0)));
export const CORRIDOR_TILES: { x: number; y: number }[] = NAV.flatMap((line, y) => line.split("").map((c, x) => ({ c, x, y }))).filter((t) => t.c === "." && (t.x < 14 || t.x > W - 15 || t.y < 14 || t.y > H - 15));

/** outside the front doors: the class-times bulletin board by the entrance, the bus stop on the road in front of the school (grid units; y > H is outdoors) */
export const OUTSIDE = { board: { x: 64, y: H + 2.4 }, boardStand: { x: 64, y: H + 4.0 }, busStop: { x: 28, y: H + 7.6 }, busDoor: { x: 36, y: H + 5.9 }, roadY: H + 7.6 };
/** Chat Chow: the plaza tables where students sit and talk */
export const CHOW_TABLES: { x: number; y: number }[] = PROPS.filter((p) => p.kind === "table").map((p) => ({ x: p.x, y: p.y }));
