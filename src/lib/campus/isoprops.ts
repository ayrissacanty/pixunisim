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
  // value = extrusion height in tiles
  wall: 1,
  buildingWall: 1.15,
  buildingRoof: 1.5,
  window: 1.15,
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

/** Extrusion height (in tiles) for a block kind. */
export function blockHeight(kind: TileKind): number {
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
  // Painter's order: far tiles first. Depth values still drive Phaser sorting,
  // this simply keeps creation order predictable for tests and debugging.
  out.sort((a, b) => a.x + a.y - (b.x + b.y));
  return out;
}
