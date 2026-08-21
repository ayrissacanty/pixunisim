import barnAsset from "@/assets/barn.png.asset.json";
import bladeAsset from "@/assets/blade.png.asset.json";
import wheelAsset from "@/assets/water-wheel.png.asset.json";

/**
 * Agricultural Science Field art.
 *
 * "[LPC] Farm" by bluecarrot16, Wolthera van Hövell tot Westerflier and Ivan
 * Voirol (opengameart.org/content/lpc-farm) — CC-BY 4.0 / GPL-3.0 / OGA-BY-3.0.
 * The windmill blades and water wheel are animated strips adapted from Ivan
 * Voirol's Slates set.
 */
export const BARN_KEY = "farm-barn";
export const BARN_URL = barnAsset.url;
export const BLADE_KEY = "farm-blade";
export const BLADE_URL = bladeAsset.url;
export const WHEEL_KEY = "farm-wheel";
export const WHEEL_URL = wheelAsset.url;

/** Frame size of the animated strips (vertical sheets). */
export const BLADE_FRAME = { w: 128, h: 128, count: 8 };
export const WHEEL_FRAME = { w: 64, h: 96, count: 4 };

export interface FarmStructure {
  /** Source rect on barn.png. */
  rect: [number, number, number, number];
  /** Solid footprint in tiles; the sprite is drawn to this width, bottom-aligned. */
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Hand-placed buildings; world.ts blocks the same footprints. */
export const FARM_STRUCTURES: FarmStructure[] = [
  // Red teaching barn, centre-north.
  { rect: [0, 278, 190, 222], x: 11, y: 3, w: 6, h: 6 },
  // Brown implement barn, north-east.
  { rect: [196, 278, 188, 222], x: 21, y: 4, w: 6, h: 6 },
  // Grain silos, north-west.
  { rect: [0, 770, 190, 180], x: 4, y: 3, w: 5, h: 5 },
  // Thatched storage silos, west.
  { rect: [185, 780, 155, 170], x: 2, y: 13, w: 4, h: 4 },
  // Open hay shed, south of the channel.
  { rect: [575, 330, 135, 170], x: 18, y: 16, w: 4, h: 4 },
];

/** Windmill tower footprint (drawn as plain masonry, blades animate above it). */
export const WINDMILL_TOWER = { x: 25, y: 13, w: 2, h: 4 };


export interface FarmAnimated {
  kind: "blade" | "wheel";
  /** Tile coordinates of the sprite centre. */
  tx: number;
  ty: number;
  tiles: number;
  /** Frames per second of the loop. */
  fps: number;
}

export const FARM_ANIMATED: FarmAnimated[] = [
  // Windmill blades turning above the tower.
  { kind: "blade", tx: 26, ty: 12.4, tiles: 4, fps: 10 },
  // Water wheel on the irrigation channel.
  { kind: "wheel", tx: 17.5, ty: 14, tiles: 2, fps: 8 },
];


/** Zone the farm art belongs to. */
export const FARM_ZONE = "agricultural-field";
