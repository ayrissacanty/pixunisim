import envAtlas from "@/assets/env_props.png.asset.json";
import atlasIndex from "./env-atlas.json";
import type { ZoneMap } from "./world";
import { TILE, type TileKind } from "./tiles";

/** CDN url for the packed 100px environment prop atlas. */
export const DECOR_URL = envAtlas.url;
export const DECOR_KEY = "env-props";

type Rect = [number, number, number, number];
const FRAMES = atlasIndex as unknown as Record<string, Rect>;

/**
 * Curated slice of the pack: gardens, planters, ponds, wells and small
 * structures that read as campus grounds. The fantasy/creature pieces are
 * deliberately left out so the academic palette still leads.
 */
const GARDEN = ["03", "04", "09", "15", "16", "21", "23", "24", "29", "32", "40", "42", "44", "48"];
const WATER_SIDE = ["11", "17", "27", "28", "57", "59"];
const GROVE = ["07", "08", "37", "47", "49", "56", "58"];
const STRUCTURE = ["06", "13", "14", "19", "41", "43", "45", "51", "52", "54", "60"];

export function isEducationalInterior(zone: ZoneMap): boolean {
  return (
    zone.kind === "interior" &&
    (zone.id.endsWith("-hall") || zone.id === "arts-center" || zone.id === "university-library")
  );
}

export interface DecorPlacement {
  frame: string;
  /** Pixel position of the sprite's bottom-centre anchor. */
  px: number;
  py: number;
  scale: number;
  /** Whether the prop physically blocks movement (feeds the walkability mask). */
  solid: boolean;
}

export function frameRect(name: string): Rect | undefined {
  return FRAMES[name];
}

function hash(x: number, y: number, salt: number) {
  const h = Math.imul(x * 73856093 ^ y * 19349663 ^ salt * 83492791, 2654435761);
  return ((h >>> 0) % 10000) / 10000;
}

/**
 * Deterministic scatter of props across an outdoor zone. Props sit on grass
 * that is clear of paths, buildings, interactables and NPC spawns, and never
 * block movement — they are pure set dressing above the baked ground layer.
 */
export function decorFor(zone: ZoneMap): DecorPlacement[] {
  if (zone.kind !== "outdoor") return interiorDecorFor(zone);
  const blocked = new Set<string>();
  const reserve = (x: number, y: number, r = 1) => {
    for (let dy = -r; dy <= r; dy++)
      for (let dx = -r; dx <= r; dx++) blocked.add(`${x + dx},${y + dy}`);
  };
  zone.interactables.forEach((i) => reserve(i.x, i.y, 2));
  zone.npcs.forEach((n) => reserve(n.x, n.y, 2));
  reserve(zone.defaultSpawn.x, zone.defaultSpawn.y, 3);
  zone.rooms.forEach((r) => {
    for (let y = r.y - 1; y <= r.y + r.h; y++)
      for (let x = r.x - 1; x <= r.x + r.w; x++) blocked.add(`${x},${y}`);
  });

  const out: DecorPlacement[] = [];
  const seed = zone.id.length * 31 + zone.width;

  for (let y = 1; y < zone.height - 1; y++) {
    for (let x = 1; x < zone.width - 1; x++) {
      const kind = zone.tiles[y]?.[x];
      if (kind !== "grass" && kind !== "grassAlt" && kind !== "flower") continue;
      if (blocked.has(`${x},${y}`)) continue;

      const roll = hash(x, y, seed);
      if (roll > 0.045) continue;

      // Keep a walkable buffer between props.
      let crowded = false;
      for (const p of out) {
        if (Math.abs(p.px - (x * TILE + TILE / 2)) < TILE * 3 && Math.abs(p.py - (y + 1) * TILE) < TILE * 3) {
          crowded = true;
          break;
        }
      }
      if (crowded) continue;

      const nearWater =
        zone.tiles[y + 1]?.[x] === "water" ||
        zone.tiles[y - 1]?.[x] === "water" ||
        zone.tiles[y]?.[x + 1] === "water" ||
        zone.tiles[y]?.[x - 1] === "water";
      const pick = hash(x, y, seed + 7);
      const pool = nearWater
        ? WATER_SIDE
        : pick < 0.45
          ? GARDEN
          : pick < 0.75
            ? GROVE
            : STRUCTURE;
      const frame = pool[Math.floor(hash(x, y, seed + 13) * pool.length) % pool.length]!;

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

/**
 * Interiors are now dressed entirely from the pixel interior sheets
 * (`src/lib/campus/interiors.ts`): the scene draws real furniture sprites on
 * the furniture tiles themselves, so the old outdoor prop scatter would only
 * double up in a mismatched art style. Collision for interiors therefore comes
 * purely from the tile solidity table.
 */
function interiorDecorFor(_zone: ZoneMap): DecorPlacement[] {
  return [];
}
