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
 * sky blue, with bordeaux / terracotta / ochre / sage kept as accent tones.
 */
export const TILE_COLORS: Record<TileKind, { base: number; detail?: number }> = {
  grass: { base: 0x76bd57, detail: 0x8ed065 },
  grassAlt: { base: 0x6aae4d, detail: 0x84c65e },
  path: { base: 0xf2dfae, detail: 0xe4cb94 },
  brick: { base: 0xd85f45, detail: 0xb84a34 },
  stone: { base: 0xd6cfbe, detail: 0xc0b8a4 },
  water: { base: 0x4fa8d8, detail: 0x74c3ea },
  tree: { base: 0x3f8a45, detail: 0x8a6236 },
  flower: { base: 0x76bd57, detail: 0xf2b23c },
  bench: { base: 0xa9713f, detail: 0x7f5029 },
  lamp: { base: 0x5c5047, detail: 0xf7cf5f },
  sign: { base: 0x9a6234, detail: 0xfff3d8 },
  fountain: { base: 0xd6cfbe, detail: 0x4fa8d8 },
  hedge: { base: 0x4c9b52, detail: 0x5fb264 },
  wall: { base: 0x7a4b3a, detail: 0x633a2c },
  buildingWall: { base: 0xf0b25a, detail: 0xd9973f },
  buildingRoof: { base: 0xe0644a, detail: 0xb84a34 },
  window: { base: 0x9fd8f2, detail: 0x4fa8d8 },
  floor: { base: 0xf5e8cd, detail: 0xe6d6b6 },
  floorAlt: { base: 0xdac9a8, detail: 0xcbb894 },
  rug: { base: 0xd8574d, detail: 0xf2b23c },
  desk: { base: 0x8a5a34, detail: 0xa87446 },
  table: { base: 0x9a6a41, detail: 0xb3814f },
  chair: { base: 0xc9a26a, detail: 0xa77f4b },
  shelf: { base: 0x6f4327, detail: 0xd0b184 },
  computer: { base: 0x4b4a48, detail: 0x86a9bd },
  bed: { base: 0x8d3f3f, detail: 0xf1e6d0 },
  counter: { base: 0x7c4f2c, detail: 0xd9c9a8 },
  plant: { base: 0xd85f45, detail: 0x4c9b52 },
  board: { base: 0x5a4632, detail: 0xf1e6d0 },
  door: { base: 0x8a5730, detail: 0xf7cf5f },
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
