import type { ZoneMap } from "./world";
import { TILE } from "./tiles";
import { propOverridesFor, overridePlacement } from "./prop-overrides";

export interface DecorPlacement {
  /** Original UNIFY prop id, resolved to a loaded transparent image by the scene. */
  frame: string;
  /** Pixel position of the sprite's bottom-centre anchor. */
  px: number;
  py: number;
  scale: number;
  /** Whether the prop physically blocks movement (feeds the walkability mask). */
  solid: boolean;
  /** Editor-authored orientation (defaults: upright, unflipped). */
  flipX?: boolean;
  rotation?: number;
}

const GARDEN = ["flower", "bench", "sign"];
const WATER_SIDE = ["fountain", "flower"];
const GROVE = ["tree", "hedge"];
const STRUCTURE = ["lamp", "sign", "bench"];

function hash(x: number, y: number, salt: number) {
  const h = Math.imul(x * 73856093 ^ y * 19349663 ^ salt * 83492791, 2654435761);
  return ((h >>> 0) % 10000) / 10000;
}

/**
 * Deterministic original-art scatter for outdoor zones. Props are reserved away
 * from paths, buildings, doors, NPCs and the default spawn, keeping the
 * walkability mask and the rendered world in agreement.
 */
export function decorFor(zone: ZoneMap): DecorPlacement[] {
  if (zone.kind !== "outdoor") return [];
  // Placements saved by the debug prop editor replace the procedural scatter.
  const overrides = propOverridesFor(zone.id);
  if (overrides) return overrides.map(overridePlacement);
  const blocked = new Set<string>();
  const reserve = (x: number, y: number, r = 1) => {
    for (let dy = -r; dy <= r; dy += 1)
      for (let dx = -r; dx <= r; dx += 1) blocked.add(`${x + dx},${y + dy}`);
  };
  zone.interactables.forEach((item) => reserve(item.x, item.y, 2));
  zone.npcs.forEach((npc) => reserve(npc.x, npc.y, 2));
  reserve(zone.defaultSpawn.x, zone.defaultSpawn.y, 3);
  zone.rooms.forEach((room) => {
    for (let y = room.y - 1; y <= room.y + room.h; y += 1)
      for (let x = room.x - 1; x <= room.x + room.w; x += 1) blocked.add(`${x},${y}`);
  });

  const out: DecorPlacement[] = [];
  const seed = zone.id.length * 31 + zone.width;
  for (let y = 1; y < zone.height - 1; y += 1) {
    for (let x = 1; x < zone.width - 1; x += 1) {
      const kind = zone.tiles[y]?.[x];
      if (kind !== "grass" && kind !== "grassAlt" && kind !== "flower") continue;
      if (blocked.has(`${x},${y}`) || hash(x, y, seed) > 0.045) continue;
      if (out.some((prop) => Math.abs(prop.px - (x * TILE + TILE / 2)) < TILE * 3 && Math.abs(prop.py - (y + 1) * TILE) < TILE * 3)) continue;

      const nearWater =
        zone.tiles[y + 1]?.[x] === "water" ||
        zone.tiles[y - 1]?.[x] === "water" ||
        zone.tiles[y]?.[x + 1] === "water" ||
        zone.tiles[y]?.[x - 1] === "water";
      const choice = hash(x, y, seed + 7);
      const pool = nearWater ? WATER_SIDE : choice < 0.45 ? GARDEN : choice < 0.75 ? GROVE : STRUCTURE;
      const frame = pool[Math.floor(hash(x, y, seed + 13) * pool.length) % pool.length];
      if (!frame) continue;
      out.push({
        frame,
        px: x * TILE + TILE / 2,
        py: (y + 1) * TILE,
        scale: pool === STRUCTURE || pool === GROVE ? 0.72 : 0.6,
        solid: pool === STRUCTURE || pool === GROVE || pool === WATER_SIDE,
      });
      reserve(x, y, 1);
    }
  }
  return out;
}
