import { TILE, isSolid } from "./tiles";
import { decorFor } from "./decor";
import type { ZoneMap } from "./world";

/**
 * Per-zone walkability mask. 1 = walkable, 0 = blocked.
 *
 * The mask is the single source of truth for collision: it merges the tile
 * solidity table (water, hedges, trees, walls, furniture …) with the footprint
 * of any decor prop that is physically there (groves, structures, pond edges).
 * Baked once per zone and cached, so the update loop only does array lookups.
 */
export interface WalkMask {
  width: number;
  height: number;
  data: Uint8Array;
}

const cache = new Map<string, WalkMask>();

export function buildWalkMask(zone: ZoneMap): WalkMask {
  const { width, height } = zone;
  const data = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      data[y * width + x] = isSolid(zone.tiles[y]![x]!) ? 0 : 1;
    }
  }

  // Solid decor props occupy the tile they stand on.
  for (const p of decorFor(zone)) {
    if (!p.solid) continue;
    const tx = Math.floor(p.px / TILE);
    const ty = Math.floor((p.py - 1) / TILE);
    if (tx < 0 || ty < 0 || tx >= width || ty >= height) continue;
    data[ty * width + tx] = 0;
  }

  // Doors and the tile in front of them must stay walkable so the player can
  // always reach a transition trigger, even if decor lands nearby.
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (zone.tiles[y]![x] !== "door") continue;
      data[y * width + x] = 1;
      if (y + 1 < height && zone.tiles[y + 1]![x] !== "wall") data[(y + 1) * width + x] = 1;
      if (y > 0 && zone.tiles[y - 1]![x] !== "wall") data[(y - 1) * width + x] = 1;
    }
  }
  for (const i of zone.interactables) {
    if (i.action.kind !== "travel") continue;
    if (i.x >= 0 && i.y >= 0 && i.x < width && i.y < height) data[i.y * width + i.x] = 1;
  }

  return { width, height, data };
}

export function getWalkMask(zone: ZoneMap): WalkMask {
  const cached = cache.get(zone.id);
  if (cached) return cached;
  const mask = buildWalkMask(zone);
  cache.set(zone.id, mask);
  return mask;
}

export function isWalkableTile(zone: ZoneMap, tx: number, ty: number): boolean {
  if (tx < 0 || ty < 0 || tx >= zone.width || ty >= zone.height) return false;
  const mask = getWalkMask(zone);
  return mask.data[ty * mask.width + tx] === 1;
}

/**
 * Box test used for movement: the character's feet box (in pixels) must be
 * clear on all four corners before the move is committed.
 */
export function canStandBox(zone: ZoneMap, px: number, py: number, halfW = 7, top = 4, bottom = 12) {
  const corners: Array<[number, number]> = [
    [px - halfW, py + top],
    [px + halfW, py + top],
    [px - halfW, py + bottom],
    [px + halfW, py + bottom],
  ];
  return corners.every(([x, y]) => isWalkableTile(zone, Math.floor(x / TILE), Math.floor(y / TILE)));
}
