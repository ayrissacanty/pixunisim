import { TILE } from "./tiles";

/**
 * Canonical isometric depth model.
 *
 * Every drawable in the world — ground, extruded building blocks, props,
 * NPCs, the player and their labels — is sorted with the SAME function so
 * occlusion is consistent no matter which system spawned the object.
 *
 * Sorting happens in cartesian space (`px + py`), which is exactly the
 * painter's order for a 2:1 isometric projection: the further a thing sits
 * along the combined x+y axis, the closer it is to the camera.
 */

/** Depth added per cartesian pixel along the x+y axis. */
export const DEPTH_SCALE = 0.5;

/** Small, stable tie-breakers for things sharing one footprint. */
export const DEPTH_BIAS = {
  /** Flat decals (shadows, rugs, interaction rings). */
  decal: 0,
  /** Standing props, furniture and extruded building blocks. */
  object: 1,
  /** Characters. */
  actor: 2,
  /** Name plates and accessories that must sit above their owner. */
  label: 3,
} as const;

/** Depth band used for the baked ground texture (always behind everything). */
export const GROUND_DEPTH = -10000;
/** Depth band for HUD-ish scene overlays (debug graphics, prompts). */
export const OVERLAY_DEPTH = 100000;

/** Depth for a cartesian world-pixel anchor. */
export function isoDepth(px: number, py: number, bias: number = DEPTH_BIAS.object) {
  return (px + py) * DEPTH_SCALE + bias;
}

/**
 * Depth for a tile footprint. The anchor is the footprint's NEAR corner
 * (bottom-right in cartesian space), which is the point closest to the camera,
 * so anything standing in front of the footprint always draws over it.
 */
export function footprintDepth(
  tileX: number,
  tileY: number,
  w = 1,
  h = 1,
  bias: number = DEPTH_BIAS.object,
) {
  return isoDepth((tileX + w) * TILE, (tileY + h) * TILE, bias);
}

/** Depth for a single tile. */
export function tileDepth(tileX: number, tileY: number, bias: number = DEPTH_BIAS.object) {
  return footprintDepth(tileX, tileY, 1, 1, bias);
}

/** Depth for an actor standing at a cartesian pixel position. */
export function actorDepth(px: number, py: number, bias: number = DEPTH_BIAS.actor) {
  return isoDepth(px, py, bias);
}

/**
 * Stable depth for a large building volume.
 *
 * A whole building is one graphics object. Its depth must not move with the
 * player because that would also reorder it against unrelated props and NPCs.
 */
export function buildingDepthFor(
  tileX: number,
  tileY: number,
  w: number,
  h: number,
  _actorPx: number,
  _actorPy: number,
) {
  return footprintDepth(tileX, tileY, w, h);
}

/** Raises an actor just above any building whose south/east facade they passed. */
export function actorDepthWithBuildings(
  px: number,
  py: number,
  buildings: ReadonlyArray<{ x: number; y: number; w: number; h: number }>,
  bias: number = DEPTH_BIAS.actor,
) {
  let depth = actorDepth(px, py, bias);
  for (const fp of buildings) {
    const southOf = py >= (fp.y + fp.h) * TILE && px >= fp.x * TILE && px <= (fp.x + fp.w) * TILE;
    const eastOf = px >= (fp.x + fp.w) * TILE && py >= fp.y * TILE && py <= (fp.y + fp.h) * TILE;
    if (southOf || eastOf) depth = Math.max(depth, footprintDepth(fp.x, fp.y, fp.w, fp.h) + bias);
  }
  return depth;
}
