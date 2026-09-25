import { TILE } from "./tiles";

/**
 * Isometric projection helpers.
 *
 * All gameplay logic (collision, tile lookups, pathing, saved positions) stays
 * in the original cartesian tile grid. Only rendering is projected, so the
 * world reads as a classic 2:1 isometric campus while the data model is
 * unchanged.
 */

/** Screen size of one top-down pixel tile. Kept under the historic ISO names
 * so collision, camera and debug callers retain one stable projection API. */
export const ISO_W = TILE;
export const ISO_H = TILE;

/** Horizontal offset that keeps the whole projected zone in positive space. */
export function isoOrigin(zoneHeight: number) {
  void zoneHeight;
  return 0;
}

/** Cartesian tile coords -> screen pixels. */
export function isoFromTile(u: number, v: number, zoneHeight: number) {
  void zoneHeight;
  return { x: u * TILE, y: v * TILE };
}

/** Cartesian world pixels (32px grid) -> screen pixels. */
export function isoFromWorld(px: number, py: number, zoneHeight: number) {
  return isoFromTile(px / TILE, py / TILE, zoneHeight);
}

/** Screen pixels -> cartesian world pixels. */
export function worldFromIso(sx: number, sy: number, zoneHeight: number) {
  void zoneHeight;
  return { x: sx, y: sy };
}

/**
 * Turns a screen-space input vector (WASD / joystick / tap direction) into the
 * cartesian direction that moves the character that way on screen.
 */
export function isoInputToWorld(ix: number, iy: number) {
  const len = Math.hypot(ix, iy);
  return len > 0 ? { x: ix / len, y: iy / len } : { x: 0, y: 0 };
}

/** Screen size of a projected zone. */
export function isoCanvasSize(width: number, height: number) {
  return { width: width * TILE, height: height * TILE };
}
