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
  grass: { base: 0x7ec850, detail: 0x9ade64 },
  grassAlt: { base: 0x72bd46, detail: 0x8fd35a },
  path: { base: 0xfbe08e, detail: 0xecc568 },
  brick: { base: 0xf7d174, detail: 0xe0a94e },
  stone: { base: 0xf1e7cf, detail: 0xd8c9a8 },
  water: { base: 0x54c0ec, detail: 0x9ae0f7 },
  tree: { base: 0x46ad55, detail: 0x9a6435 },
  flower: { base: 0x7ec850, detail: 0xffd54a },
  bench: { base: 0xf3a35c, detail: 0xc4703a },
  lamp: { base: 0x6b5c4e, detail: 0xffd54a },
  sign: { base: 0xffd45e, detail: 0x8a4a2c },
  fountain: { base: 0xf1e7cf, detail: 0x54c0ec },
  hedge: { base: 0x5ec25e, detail: 0x8ade7a },
  wall: { base: 0xffc95a, detail: 0xf0a94b },
  buildingWall: { base: 0xffd45e, detail: 0xe9ab43 },
  buildingRoof: { base: 0xff6f52, detail: 0xe0503a },
  window: { base: 0x9ae0f7, detail: 0x54c0ec },
  floor: { base: 0xfff0d2, detail: 0xecd8ae },
  floorAlt: { base: 0xf3dfb4, detail: 0xdcc191 },
  rug: { base: 0xff7a5f, detail: 0xffd54a },
  desk: { base: 0xd79256, detail: 0xf0b978 },
  table: { base: 0xe0a061, detail: 0xf5c286 },
  chair: { base: 0xffb877, detail: 0xd07f42 },
  shelf: { base: 0xc07a3f, detail: 0xffe6ad },
  computer: { base: 0x6b6f76, detail: 0x9ae0f7 },
  bed: { base: 0xff8a6b, detail: 0xfff3d8 },
  counter: { base: 0xd79256, detail: 0xffeec4 },
  plant: { base: 0xff8a6b, detail: 0x5ec25e },
  board: { base: 0x3f8a5a, detail: 0xfff3d8 },
  door: { base: 0xff6f52, detail: 0xffd54a },
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
