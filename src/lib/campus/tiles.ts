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

/** Warm academic palette — bordeaux, terracotta, ochre, linen, sage, deep green, muted blue, warm brown. */
export const TILE_COLORS: Record<TileKind, { base: number; detail?: number }> = {
  grass: { base: 0x6f8f5e, detail: 0x7d9c69 },
  grassAlt: { base: 0x658353, detail: 0x74926073 },
  path: { base: 0xd9c9a8, detail: 0xcbb894 },
  brick: { base: 0x9c4a44, detail: 0x873c38 },
  stone: { base: 0xb9b3a6, detail: 0xa8a294 },
  water: { base: 0x5d7f96, detail: 0x6f93a9 },
  tree: { base: 0x2f5137, detail: 0x7a5a3c },
  flower: { base: 0x6f8f5e, detail: 0xd98d3f },
  bench: { base: 0x8a5a34, detail: 0x6d4527 },
  lamp: { base: 0x4a4038, detail: 0xe0b25c },
  sign: { base: 0x7c4f2c, detail: 0xf1e6d0 },
  fountain: { base: 0xb9b3a6, detail: 0x5d7f96 },
  hedge: { base: 0x3f6446, detail: 0x4f7854 },
  wall: { base: 0x7a4b3a, detail: 0x633a2c },
  buildingWall: { base: 0xa8543f, detail: 0x8e4433 },
  buildingRoof: { base: 0x6d2f34, detail: 0x5a2429 },
  window: { base: 0x86a9bd, detail: 0x5d7f96 },
  floor: { base: 0xe8dcc4, detail: 0xded0b4 },
  floorAlt: { base: 0xdac9a8, detail: 0xcbb894 },
  rug: { base: 0x8d3f3f, detail: 0xb7643f },
  desk: { base: 0x8a5a34, detail: 0xa87446 },
  table: { base: 0x9a6a41, detail: 0xb3814f },
  chair: { base: 0xc9a26a, detail: 0xa77f4b },
  shelf: { base: 0x6f4327, detail: 0xd0b184 },
  computer: { base: 0x4b4a48, detail: 0x86a9bd },
  bed: { base: 0x8d3f3f, detail: 0xf1e6d0 },
  counter: { base: 0x7c4f2c, detail: 0xd9c9a8 },
  plant: { base: 0xa8543f, detail: 0x3f6446 },
  board: { base: 0x5a4632, detail: 0xf1e6d0 },
  door: { base: 0x6d4527, detail: 0xe0b25c },
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
