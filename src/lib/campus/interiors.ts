import interiorsAsset from "@/assets/interiors_demo.png.asset.json";
import itemsAsset from "@/assets/tiles_and_items.png.asset.json";
import type { TileKind } from "./tiles";

/**
 * Pixel-art interior art. Two uploaded sheets replace the flat coloured
 * interior tiles: `interiors_demo` supplies floors, brick walls, windows and
 * most furniture; `tiles_and_items` adds rugs and a couple of soft pieces.
 *
 * Source art is 16px, blitted/drawn at x2 so it matches the 32px world grid.
 */
export const INTERIOR_KEY = "interiors-demo";
export const INTERIOR_URL = interiorsAsset.url;
export const ITEMS_KEY = "tiles-items";
export const ITEMS_URL = itemsAsset.url;

export const INT_SRC = 16;
export const INT_SCALE = 2;

export interface Frame {
  x: number;
  y: number;
}

/** 16x16 tiling frames blitted into the interior ground bake. */
export const INTERIOR_GROUND: Partial<Record<TileKind, Frame[]>> = {
  floor: [{ x: 112, y: 32 }],
  // Wood boards throughout: the sheet's only alternate floor is a pale stone
  // square, and checker-boarding it against the planks reads as noise.
  floorAlt: [{ x: 112, y: 32 }],
  wall: [
    { x: 48, y: 16 },
    { x: 64, y: 16 },
    { x: 48, y: 32 },
  ],
  door: [{ x: 112, y: 32 }],
  rug: [{ x: 112, y: 32 }],
  chair: [{ x: 112, y: 32 }],
  desk: [{ x: 112, y: 32 }],
  table: [{ x: 112, y: 32 }],
  shelf: [{ x: 112, y: 32 }],
  bed: [{ x: 112, y: 32 }],
  counter: [{ x: 112, y: 32 }],
  computer: [{ x: 112, y: 32 }],
  plant: [{ x: 112, y: 32 }],
  board: [{ x: 112, y: 32 }],
  window: [{ x: 48, y: 16 }],
};

export interface PropSprite {
  /** Which sheet the rect belongs to. */
  sheet: "interiors" | "items";
  /** Source rect [x, y, w, h] in sheet pixels. */
  rect: [number, number, number, number];
  /** Drawn width in world tiles (height follows the source aspect). */
  tiles: number;
}

/**
 * Furniture drawn above the interior floor bake, anchored bottom-centre on the
 * tile it occupies. Solidity still comes from the tile table, so what a student
 * sees is exactly what blocks them.
 */
export const INTERIOR_PROPS: Partial<Record<TileKind, PropSprite[]>> = {
  desk: [
    { sheet: "interiors", rect: [144, 48, 16, 32], tiles: 1 },
    { sheet: "interiors", rect: [160, 48, 16, 32], tiles: 1 },
  ],
  table: [
    { sheet: "interiors", rect: [0, 48, 64, 32], tiles: 2 },
    { sheet: "interiors", rect: [192, 136, 48, 32], tiles: 1.6 },
  ],
  counter: [{ sheet: "interiors", rect: [192, 136, 48, 32], tiles: 1.6 }],
  chair: [
    { sheet: "interiors", rect: [128, 96, 16, 32], tiles: 0.9 },
    { sheet: "interiors", rect: [176, 96, 16, 32], tiles: 0.9 },
    { sheet: "items", rect: [128, 142, 14, 18], tiles: 0.9 },
  ],
  shelf: [{ sheet: "interiors", rect: [160, 124, 32, 52], tiles: 1.6 }],
  board: [
    { sheet: "interiors", rect: [240, 144, 16, 16], tiles: 1 },
    { sheet: "interiors", rect: [240, 160, 16, 16], tiles: 1 },
  ],
  computer: [{ sheet: "interiors", rect: [112, 160, 16, 16], tiles: 0.8 }],
  bed: [
    { sheet: "interiors", rect: [176, 32, 48, 64], tiles: 1.6 },
    { sheet: "interiors", rect: [224, 32, 32, 64], tiles: 1.4 },
  ],
  plant: [
    { sheet: "interiors", rect: [224, 96, 16, 32], tiles: 0.9 },
    { sheet: "interiors", rect: [240, 112, 16, 16], tiles: 0.7 },
    { sheet: "items", rect: [48, 140, 14, 20], tiles: 0.9 },
  ],
  window: [{ sheet: "interiors", rect: [96, 0, 32, 32], tiles: 1 }],
  rug: [
    { sheet: "items", rect: [129, 80, 32, 14], tiles: 1.6 },
    { sheet: "items", rect: [132, 100, 38, 22], tiles: 1.8 },
    { sheet: "interiors", rect: [96, 48, 32, 32], tiles: 1.6 },
  ],
};

/** Deterministic variant so a row of desks is not perfectly identical. */
export function pick<T>(list: T[], x: number, y: number): T {
  const h = Math.abs((x * 73856093) ^ (y * 19349663));
  return list[h % list.length]!;
}
