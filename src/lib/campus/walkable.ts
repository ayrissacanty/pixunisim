import { TILE, isSolid } from "./tiles";
import { decorFor } from "./decor";
import { collisionBox } from "@/lib/a11y/assist";
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

  // Doorways and travel triggers must always stay walkable, even if a decor
  // prop or a wall tile happens to sit on them.
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (zone.tiles[y]![x] === "door") data[y * width + x] = 1;
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
 * clear on all four corners before the move is committed. The default box
 * comes from the accessibility assist setting, which slims it down so chair
 * edges, rug corners and door jambs stop catching the player.
 */
export function canStandBox(
  zone: ZoneMap,
  px: number,
  py: number,
  halfW?: number,
  top?: number,
  bottom?: number,
) {
  const box = collisionBox();
  const hw = halfW ?? box.halfW;
  const t = top ?? box.top;
  const b = bottom ?? box.bottom;
  const corners: Array<[number, number]> = [
    [px - hw, py + t],
    [px + hw, py + t],
    [px - hw, py + b],
    [px + hw, py + b],
  ];
  return corners.every(([x, y]) => isWalkableTile(zone, Math.floor(x / TILE), Math.floor(y / TILE)));
}

/* --------------------------- reachability checks -------------------------- */

export interface ReachabilityReport {
  zoneId: string;
  reachable: number;
  ok: boolean;
  /** Targets that the player can never walk to from the zone spawn. */
  unreachable: Array<{ kind: "door" | "interactable" | "npc" | "room"; id: string; x: number; y: number }>;
}

/** Flood fill of every tile walkable from `start`, ignoring the feet box. */
export function floodFill(zone: ZoneMap, start: { x: number; y: number }): Set<string> {
  const seen = new Set<string>();
  const queue: Array<[number, number]> = [];
  const push = (x: number, y: number) => {
    const key = `${x},${y}`;
    if (seen.has(key) || !isWalkableTile(zone, x, y)) return;
    seen.add(key);
    queue.push([x, y]);
  };
  push(start.x, start.y);
  // A spawn tile that is itself blocked should still seed from its neighbours.
  if (!seen.size) {
    push(start.x + 1, start.y);
    push(start.x - 1, start.y);
    push(start.x, start.y + 1);
    push(start.x, start.y - 1);
  }
  while (queue.length) {
    const [x, y] = queue.shift()!;
    push(x + 1, y);
    push(x - 1, y);
    push(x, y + 1);
    push(x, y - 1);
  }
  return seen;
}

/**
 * Confirms that every doorway, interactable, NPC and room in a zone can still
 * be walked to once decor prop collision is baked into the mask.
 */
export function reachabilityReport(zone: ZoneMap): ReachabilityReport {
  const seen = floodFill(zone, zone.defaultSpawn);
  const unreachable: ReachabilityReport["unreachable"] = [];
  const near = (x: number, y: number) =>
    seen.has(`${x},${y}`) ||
    seen.has(`${x + 1},${y}`) ||
    seen.has(`${x - 1},${y}`) ||
    seen.has(`${x},${y + 1}`) ||
    seen.has(`${x},${y - 1}`);

  for (let y = 0; y < zone.height; y++) {
    for (let x = 0; x < zone.width; x++) {
      if (zone.tiles[y]![x] !== "door") continue;
      if (!near(x, y)) unreachable.push({ kind: "door", id: `door-${x}-${y}`, x, y });
    }
  }
  for (const i of zone.interactables) {
    if (!near(i.x, i.y)) unreachable.push({ kind: "interactable", id: i.id, x: i.x, y: i.y });
  }
  for (const n of zone.npcs) {
    if (!near(n.x, n.y)) unreachable.push({ kind: "npc", id: n.id, x: n.x, y: n.y });
  }
  for (const r of zone.rooms) {
    let found = false;
    for (let y = r.y; y < r.y + r.h && !found; y++)
      for (let x = r.x; x < r.x + r.w && !found; x++) if (seen.has(`${x},${y}`)) found = true;
    if (!found) unreachable.push({ kind: "room", id: r.id, x: r.x, y: r.y });
  }

  return { zoneId: zone.id, reachable: seen.size, ok: unreachable.length === 0, unreachable };
}
