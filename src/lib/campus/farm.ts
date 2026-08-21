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
  /** Tile coordinates of the sprite's bottom-centre anchor. */
  tx: number;
  ty: number;
  /** Drawn width in world tiles (height follows the source aspect). */
  tiles: number;
}

/** Hand-placed buildings for the field; footprints are blocked in world.ts. */
export const FARM_STRUCTURES: FarmStructure[] = [
  // Red teaching barn, centre-north.
  { rect: [0, 278, 190, 222], tx: 14, ty: 8, tiles: 6 },
  // Brown implement barn, east.
  { rect: [196, 278, 188, 222], tx: 24, ty: 9, tiles: 6 },
  // Grain silos behind the red barn.
  { rect: [0, 770, 190, 180], tx: 8, ty: 7, tiles: 5.5 },
  // Thatched storage silos, west edge.
  { rect: [185, 780, 155, 170], tx: 4, ty: 14, tiles: 4.5 },
  // Open hay shed by the south path.
  { rect: [575, 330, 135, 170], tx: 21, ty: 17, tiles: 4 },
];

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
  // Windmill blades on the tower at the west edge.
  { kind: "blade", tx: 3, ty: 4.2, tiles: 4, fps: 10 },
  // Water wheel on the irrigation channel.
  { kind: "wheel", tx: 18, ty: 14.2, tiles: 2, fps: 8 },
];


/** Zone the farm art belongs to. */
export const FARM_ZONE = "agricultural-field";
