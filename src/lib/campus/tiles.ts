export type TileKind =
  | "grass"
  | "grassAlt"
  | "path"
  | "brick"
  | "stone"
  | "water"
  | "tree"
  | "flower"
  | "bench"
  | "lamp"
  | "sign"
  | "fountain"
  | "hedge"
  | "wall"
  | "buildingWall"
  | "buildingRoof"
  | "window"
  | "floor"
  | "floorAlt"
  | "rug"
  | "desk"
  | "table"
  | "chair"
  | "shelf"
  | "computer"
  | "bed"
  | "counter"
  | "plant"
  | "board"
  | "door";

export const TILE = 32;

/**
 * Warm storybook palette — bright saturated coral, sunflower, grass green and
 * sky blue as the primaries; bordeaux / terracotta / ochre / sage survive only
 * as small accents (trim, shingles, shelf spines).
 *
 * These values drive BOTH the Phaser world (via `src/lib/campus/tileart.ts`)
 * and the HUD minimap, so the campus palette lives in exactly one place.
 */
export const TILE_COLORS: Record<TileKind, { base: number; detail?: number }> = {
  grass: { base: 0x6faa4e, detail: 0x88c163 },
  grassAlt: { base: 0x669f47, detail: 0x7fb95a },
  path: { base: 0xe3cfa6, detail: 0xcbb083 },
  brick: { base: 0xc98a5a, detail: 0xa96b3f },
  stone: { base: 0xefe3ce, detail: 0xd3c2a4 },
  water: { base: 0x5aa9c9, detail: 0x9ccfe3 },
  tree: { base: 0x3f8a4a, detail: 0x7a4b27 },
  flower: { base: 0x6faa4e, detail: 0xd9a441 },
  bench: { base: 0xb5763f, detail: 0x7a4b27 },
  lamp: { base: 0x4a3a2c, detail: 0xd9a441 },
  sign: { base: 0xd9a441, detail: 0x7a4b27 },
  fountain: { base: 0xefe3ce, detail: 0x5aa9c9 },
  hedge: { base: 0x54984e, detail: 0x76b568 },
  wall: { base: 0xefe3ce, detail: 0x8b5a2e },
  buildingWall: { base: 0xe8d8bc, detail: 0xc0a67f },
  buildingRoof: { base: 0x9c4f36, detail: 0x7b3b28 },
  window: { base: 0xc7e2ef, detail: 0x7fa8c7 },
  floor: { base: 0xab7440, detail: 0x8d5c30 },
  floorAlt: { base: 0xbc8551, detail: 0x9a663a },
  rug: { base: 0x3f7f8c, detail: 0x2f606b },
  desk: { base: 0xb5763f, detail: 0xd79a63 },
  table: { base: 0xa96b3a, detail: 0xcf9560 },
  chair: { base: 0x9c6a3c, detail: 0xc28c55 },
  shelf: { base: 0x7a4b27, detail: 0xc9a46a },
  computer: { base: 0x2e3440, detail: 0x8fb6d6 },
  bed: { base: 0xc0765a, detail: 0xf2e4cc },
  counter: { base: 0x8b5a2e, detail: 0xe6d6b8 },
  plant: { base: 0xa8582f, detail: 0x4e8a45 },
  board: { base: 0x3a5c4a, detail: 0x8b5a2e },
  door: { base: 0x8b5a2e, detail: 0xd9a441 },
};

export const SOLID_TILES = new Set<TileKind>([
  "water",
  "tree",
  "bench",
  "lamp",
  "sign",
  "fountain",
  "hedge",
  "wall",
  "buildingWall",
  "buildingRoof",
  "window",
  "desk",
  "table",
  "chair",
  "shelf",
  "computer",
  "bed",
  "counter",
  "plant",
  "board",
]);

export function isSolid(kind: TileKind): boolean {
  return SOLID_TILES.has(kind);
}
