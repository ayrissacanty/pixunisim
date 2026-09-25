import type { TileKind } from "./tiles";
import type { ZoneMap } from "./world";

/**
 * Which rendering layer a tile kind belongs to in the true-isometric world.
 *
 * - `ground` — painted flat into the baked zone texture.
 * - `block`  — extruded into an isometric volume (walls, buildings, roofs).
 * - `prop`   — a billboard sprite standing on its tile (furniture, trees…).
 *
 * Collision data is untouched: this only decides how a tile is drawn.
 */
export type IsoLayer = "ground" | "block" | "prop";

const BLOCKS: Partial<Record<TileKind, number>> = {
  // value = extrusion height in tiles (1 tile ≈ one storey)
  wall: 1.1,
  buildingWall: 2.9,
  buildingRoof: 3.5,
  window: 2.9,
};


/**
 * Ground-hugging objects. They read better painted flat onto the tile diamond
 * than billboarded, so they stay part of the baked ground pass.
 */
const FLAT = new Set<TileKind>(["hedge", "flower", "fountain", "rug"]);

export function isFlatObject(kind: TileKind): boolean {
  return FLAT.has(kind);
}

const PROPS: Partial<Record<TileKind, number>> = {
  // value = billboard height in tiles
  tree: 1.9,
  bench: 0.8,
  lamp: 1.6,
  sign: 1.1,
  desk: 0.95,
  table: 0.95,
  chair: 0.9,
  shelf: 1.5,
  computer: 0.7,
  bed: 1,
  counter: 1,
  plant: 1,
  board: 1.3,
};

export function isoLayerFor(kind: TileKind): IsoLayer {
  if (FLAT.has(kind)) return "ground";
  if (BLOCKS[kind] !== undefined) return "block";
  if (PROPS[kind] !== undefined) return "prop";
  return "ground";
}

/**
 * Extrusion height (in tiles) for a block kind. Interior rooms use low
 * wainscoted walls so a classroom reads as a room, not a canyon of towers.
 */
export function blockHeight(kind: TileKind, zoneKind?: ZoneMap["kind"]): number {
  if (zoneKind === "interior") return kind === "buildingRoof" ? 1 : 0.85;
  return BLOCKS[kind] ?? 1;
}

/** Billboard height (in tiles) for a prop kind. */
export function propHeight(kind: TileKind): number {
  return PROPS[kind] ?? 1;
}

/** Ground bed painted beneath an extruded or billboarded tile. */
export function bedKindFor(kind: TileKind, zoneKind: ZoneMap["kind"]): TileKind {
  switch (kind) {
    case "tree":
    case "hedge":
    case "flower":
      return "grass";
    case "bench":
    case "lamp":
    case "sign":
    case "fountain":
      return "path";
    case "wall":
    case "buildingWall":
    case "buildingRoof":
    case "window":
      return zoneKind === "interior" ? "floor" : "grass";
    default:
      return zoneKind === "interior" ? "floor" : "path";
  }
}

export interface IsoObject {
  x: number;
  y: number;
  kind: TileKind;
  layer: "block" | "prop";
}

/** Every tile in the zone that must be drawn as a depth-sorted object. */
export function isoObjectsFor(zone: ZoneMap): IsoObject[] {
  const out: IsoObject[] = [];
  for (let y = 0; y < zone.height; y += 1) {
    for (let x = 0; x < zone.width; x += 1) {
      const kind = zone.tiles[y]?.[x];
      if (!kind) continue;
      const layer = isoLayerFor(kind);
      if (layer === "ground") continue;
      out.push({ x, y, kind, layer });
    }
  }
  // Top-down painter order: northern rows first, with x as a stable tie-break.
  out.sort((a, b) => a.y - b.y || a.x - b.x);
  return out;
}

/** Tile kinds that are part of a building shell (walls, glazing, roofs). */
const BUILDING_KINDS = new Set<TileKind>(["buildingWall", "buildingRoof", "window"]);

export function isBuildingKind(kind: TileKind): boolean {
  return BUILDING_KINDS.has(kind);
}

export interface BuildingFootprint {
  x: number;
  y: number;
  w: number;
  h: number;
  /** Tiles of the footprint that carry glazing, used to place window rows. */
  hasWindows: boolean;
}

/**
 * Groups contiguous building tiles into whole-structure footprints so the
 * renderer can extrude ONE solid volume per building (walls + roof) instead of
 * a grid of separate cubes.
 */
export function buildingFootprints(zone: ZoneMap): BuildingFootprint[] {
  // Indoors there are no buildings: window tiles are glazing in a room wall,
  // never a structure to extrude.
  if (zone.kind === "interior") return [];
  const seen = new Set<string>();
  const out: BuildingFootprint[] = [];
  const at = (x: number, y: number) => zone.tiles[y]?.[x];

  for (let y = 0; y < zone.height; y += 1) {
    for (let x = 0; x < zone.width; x += 1) {
      const kind = at(x, y);
      if (!kind || !BUILDING_KINDS.has(kind) || seen.has(`${x},${y}`)) continue;
      // Flood fill the connected structure.
      const stack = [[x, y] as const];
      let x0 = x;
      let x1 = x;
      let y0 = y;
      let y1 = y;
      let hasWindows = false;
      seen.add(`${x},${y}`);
      while (stack.length) {
        const [cx, cy] = stack.pop()!;
        const k = at(cx, cy)!;
        if (k === "window") hasWindows = true;
        x0 = Math.min(x0, cx);
        x1 = Math.max(x1, cx);
        y0 = Math.min(y0, cy);
        y1 = Math.max(y1, cy);
        for (const [nx, ny] of [
          [cx + 1, cy],
          [cx - 1, cy],
          [cx, cy + 1],
          [cx, cy - 1],
        ] as const) {
          const nk = at(nx, ny);
          if (!nk || !BUILDING_KINDS.has(nk) || seen.has(`${nx},${ny}`)) continue;
          seen.add(`${nx},${ny}`);
          stack.push([nx, ny]);
        }
      }
      out.push({ x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1, hasWindows });
    }
  }
  out.sort((a, b) => a.x + a.y - (b.x + b.y));
  return out;
}
