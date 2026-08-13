import tilesetAsset from "@/assets/punyworld-overworld-tileset.png.asset.json";
import type { TileKind } from "./tiles";

/** CDN url for the Punyworld overworld tileset (16px source tiles, upscaled x2 at runtime). */
export const TILESET_URL = tilesetAsset.url;
export const TILESET_KEY = "punyworld-src";
export const TILESET_SCALED_KEY = "punyworld";
export const SRC_TILE = 16;
export const SCALE = 2;

export interface TileFrame {
  x: number;
  y: number;
}

/**
 * Hand-picked source tiles. Only outdoor terrain is sourced from the tileset —
 * interiors and furniture stay on the hand-painted pixel pass.
 */
export const TILE_FRAMES: Partial<Record<TileKind, TileFrame[]>> = {
  grass: [
    { x: 0, y: 0 },
    { x: 16, y: 80 },
    { x: 0, y: 0 },
    { x: 0, y: 32 },
  ],
  grassAlt: [
    { x: 16, y: 80 },
    { x: 0, y: 32 },
  ],
  flower: [{ x: 0, y: 32 }],
  path: [
    { x: 128, y: 16 },
    { x: 176, y: 16 },
  ],
  stone: [{ x: 240, y: 16 }],
  water: [
    { x: 368, y: 176 },
    { x: 288, y: 176 },
  ],
  tree: [
    { x: 0, y: 432 },
    { x: 0, y: 464 },
  ],
  hedge: [{ x: 0, y: 464 }],
};

/** Tiles that need a grass bed painted underneath before the sprite. */
export const OVERLAY_TILES = new Set<TileKind>(["tree", "hedge", "flower"]);

export function frameName(kind: TileKind, index: number) {
  return `${kind}_${index}`;
}

/** Deterministic per-cell variant so terrain does not tile visibly. */
export function variantFor(x: number, y: number, count: number) {
  if (count <= 1) return 0;
  const h = (x * 73856093) ^ (y * 19349663);
  return Math.abs(h) % count;
}
