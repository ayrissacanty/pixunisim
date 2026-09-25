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
  grass: { base: 0x6ab04c, detail: 0x91d45d },
  grassAlt: { base: 0x55a33f, detail: 0x7bcf58 },
  path: { base: 0xf6d889, detail: 0xd9aa63 },
  brick: { base: 0xeb6a5b, detail: 0xb83f4f },
  stone: { base: 0xffedc1, detail: 0xd4b7c7 },
  water: { base: 0x48bde0, detail: 0x9ce8f2 },
  tree: { base: 0x359447, detail: 0x74402f },
  flower: { base: 0x6ab04c, detail: 0xff4d6d },
  bench: { base: 0xb5763f, detail: 0x7a4b27 },
  lamp: { base: 0x4a3a2c, detail: 0xd9a441 },
  sign: { base: 0xf9ca24, detail: 0x74402f },
  fountain: { base: 0xffedc1, detail: 0x48bde0 },
  hedge: { base: 0x3f9f4e, detail: 0x7bd45f },
  wall: { base: 0xffedc1, detail: 0x8b5a3c },
  buildingWall: { base: 0xffdfb0, detail: 0xd59b76 },
  buildingRoof: { base: 0xd74763, detail: 0x7b358d },
  window: { base: 0xa9e5f5, detail: 0x7067cf },
  floor: { base: 0xab7440, detail: 0x8d5c30 },
  floorAlt: { base: 0xbc8551, detail: 0x9a663a },
  rug: { base: 0x6c5ce7, detail: 0x4435a6 },
  desk: { base: 0xb5763f, detail: 0xd79a63 },
  table: { base: 0xa96b3a, detail: 0xcf9560 },
  chair: { base: 0x9c6a3c, detail: 0xc28c55 },
  shelf: { base: 0x7a4b27, detail: 0xc9a46a },
  computer: { base: 0x29263a, detail: 0x66c7f2 },
  bed: { base: 0xff7185, detail: 0xffedc1 },
  counter: { base: 0x8b5a2e, detail: 0xe6d6b8 },
  plant: { base: 0xeb4d4b, detail: 0x4cab58 },
  board: { base: 0x2d7d67, detail: 0xf9ca24 },
  door: { base: 0x8b5a3c, detail: 0xf9ca24 },
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
