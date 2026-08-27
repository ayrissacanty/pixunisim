import { TILE } from "./tiles";

/**
 * Isometric projection helpers.
 *
 * All gameplay logic (collision, tile lookups, pathing, saved positions) stays
 * in the original cartesian tile grid. Only rendering is projected, so the
 * world reads as a classic 2:1 isometric campus while the data model is
 * unchanged.
 */

/** Screen width of one tile diamond. */
export const ISO_W = 64;
/** Screen height of one tile diamond. */
export const ISO_H = 32;

const HW = ISO_W / 2;
const HH = ISO_H / 2;

/** Horizontal offset that keeps the whole projected zone in positive space. */
export function isoOrigin(zoneHeight: number) {
  return zoneHeight * HW;
}

/** Cartesian tile coords -> screen pixels. */
export function isoFromTile(u: number, v: number, zoneHeight: number) {
  return { x: (u - v) * HW + isoOrigin(zoneHeight), y: (u + v) * HH };
}

/** Cartesian world pixels (32px grid) -> screen pixels. */
export function isoFromWorld(px: number, py: number, zoneHeight: number) {
  return isoFromTile(px / TILE, py / TILE, zoneHeight);
}

/** Screen pixels -> cartesian world pixels. */
export function worldFromIso(sx: number, sy: number, zoneHeight: number) {
  const dx = sx - isoOrigin(zoneHeight);
  const u = dx / ISO_W + sy / ISO_H;
  const v = sy / ISO_H - dx / ISO_W;
  return { x: u * TILE, y: v * TILE };
}

/**
 * Turns a screen-space input vector (WASD / joystick / tap direction) into the
 * cartesian direction that moves the character that way on screen.
 */
export function isoInputToWorld(ix: number, iy: number) {
  const x = ix / 2 + iy;
  const y = iy - ix / 2;
  const len = Math.hypot(x, y);
  return len > 0 ? { x: x / len, y: y / len } : { x: 0, y: 0 };
}

/** Screen size of a projected zone. */
export function isoCanvasSize(width: number, height: number) {
  return { width: (width + height) * HW, height: (width + height) * HH };
}
