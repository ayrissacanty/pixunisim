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

/** Props that read as furnishings once they are indoors. */
const INDOOR = ["21", "22", "29", "30", "35", "39", "40"];
const INDOOR_WALL = ["23", "31", "33", "34"];

/**
 * Educational interiors (academic halls, the library) are furnished from the
 * uploaded prop pack rather than flat coloured tiles: every furniture tile is
 * dressed with a matching sprite, and free floor picks up lecterns, bookcases
 * and study clutter. `solid` mirrors the physical footprint so the walkability
 * mask blocks exactly what is drawn.
 */
const FURNISH: Partial<Record<TileKind, { frames: string[]; scale: number; solid: boolean }>> = {
  desk: { frames: ["21", "22", "30"], scale: 0.52, solid: true },
  table: { frames: ["22", "35", "39"], scale: 0.56, solid: true },
  counter: { frames: ["30", "39", "40"], scale: 0.56, solid: true },
  computer: { frames: ["35", "36", "38"], scale: 0.46, solid: true },
  shelf: { frames: ["31", "33", "34"], scale: 0.62, solid: true },
  board: { frames: ["23", "31"], scale: 0.6, solid: true },
  bed: { frames: ["29", "30"], scale: 0.58, solid: true },
  plant: { frames: ["03", "09", "24"], scale: 0.5, solid: true },
  // Chairs stay walkable so students can slide into a seat.
  chair: { frames: ["25", "26", "37"], scale: 0.38, solid: false },
  rug: { frames: ["44", "48"], scale: 0.7, solid: false },
};

/** Free-standing pieces dropped into the clear floor of a classroom. */
const CLASSROOM_EXTRA = ["21", "29", "35", "39", "40"];

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
 * Interior dressing: planters, crates, side tables and wall pieces tucked into
 * the free floor of each room and along the corridor, never on doorways,
 * furniture, NPCs or the tiles a student needs to walk through.
 */
function interiorDecorFor(zone: ZoneMap): DecorPlacement[] {
  const blocked = new Set<string>();
  const reserve = (x: number, y: number, r = 1) => {
    for (let dy = -r; dy <= r; dy++)
      for (let dx = -r; dx <= r; dx++) blocked.add(`${x + dx},${y + dy}`);
  };
  zone.interactables.forEach((i) => reserve(i.x, i.y, 1));
  zone.npcs.forEach((n) => reserve(n.x, n.y, 1));
  reserve(zone.defaultSpawn.x, zone.defaultSpawn.y, 2);
  for (let y = 0; y < zone.height; y++)
    for (let x = 0; x < zone.width; x++)
      if (zone.tiles[y]?.[x] === "door") reserve(x, y, 2);

  const out: DecorPlacement[] = [];
  const seed = zone.id.length * 17 + zone.height;

  // Pass 1 — dress every furniture tile of an educational interior with the
  // matching prop sprite, so classrooms and the library read as furnished.
  if (isEducationalInterior(zone)) {
    for (let y = 0; y < zone.height; y++) {
      for (let x = 0; x < zone.width; x++) {
        const kind = zone.tiles[y]?.[x];
        if (!kind) continue;
        const spec = FURNISH[kind];
        if (!spec) continue;
        const frame = spec.frames[Math.floor(hash(x, y, seed + 3) * spec.frames.length) % spec.frames.length]!;
        out.push({
          frame,
          px: x * TILE + TILE / 2,
          py: (y + 1) * TILE,
          scale: spec.scale,
          solid: spec.solid,
        });
        reserve(x, y, 1);
      }
    }

    // Pass 2 — a few free-standing pieces (lecterns, bookcases, study carts)
    // in the clear floor of each room, always leaving the doorway lane open.
    zone.rooms.forEach((room, ri) => {
      for (let i = 0; i < 2; i++) {
        const rx = room.x + 1 + Math.floor(hash(room.x + i, room.y, seed + 21 + ri) * Math.max(1, room.w - 2));
        const ry = room.y + 1 + Math.floor(hash(room.x, room.y + i, seed + 29 + ri) * Math.max(1, room.h - 2));
        const kind = zone.tiles[ry]?.[rx];
        if (kind !== "floor" && kind !== "floorAlt") continue;
        if (blocked.has(`${rx},${ry}`)) continue;
        const frame =
          CLASSROOM_EXTRA[Math.floor(hash(rx, ry, seed + 41) * CLASSROOM_EXTRA.length) % CLASSROOM_EXTRA.length]!;
        out.push({
          frame,
          px: rx * TILE + TILE / 2,
          py: (ry + 1) * TILE,
          scale: 0.5,
          solid: true,
        });
        reserve(rx, ry, 1);
      }
    });
  }

  for (let y = 1; y < zone.height - 1; y++) {
    for (let x = 1; x < zone.width - 1; x++) {
      const kind = zone.tiles[y]?.[x];
      if (kind !== "floor" && kind !== "floorAlt") continue;
      if (blocked.has(`${x},${y}`)) continue;

      // Corners next to a wall read best; keep the middle of rooms clear.
      const againstWall =
        zone.tiles[y - 1]?.[x] === "wall" ||
        zone.tiles[y]?.[x - 1] === "wall" ||
        zone.tiles[y]?.[x + 1] === "wall";
      if (!againstWall) continue;

      const roll = hash(x, y, seed);
      if (roll > 0.22) continue;

      let crowded = false;
      for (const p of out) {
        if (Math.abs(p.px - (x * TILE + TILE / 2)) < TILE * 4 && Math.abs(p.py - (y + 1) * TILE) < TILE * 3) {
          crowded = true;
          break;
        }
      }
      if (crowded) continue;

      const pool = zone.tiles[y - 1]?.[x] === "wall" ? INDOOR_WALL : INDOOR;
      const frame = pool[Math.floor(hash(x, y, seed + 5) * pool.length) % pool.length]!;

      out.push({
        frame,
        px: x * TILE + TILE / 2,
        py: (y + 1) * TILE,
        scale: 0.5,
        solid: true,
      });
      reserve(x, y, 1);
    }
  }
  return out;
}
