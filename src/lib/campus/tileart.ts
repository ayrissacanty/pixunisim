import { TILE, TILE_COLORS, isSolid, type TileKind } from "./tiles";

/**
 * Original procedural tile art — no third-party tilesets.
 *
 * Every tile is drawn at 32x32 into a 2D canvas with a limited palette,
 * 1px dark outlines on objects, soft top-down shading and a subtle grid
 * seam so the world reads as a classic top-down RPG map.
 */

export const OUTLINE = "#2a1d16";

export function hex(value: number) {
  return `#${value.toString(16).padStart(6, "0")}`;
}

/** Deterministic 0..1 noise per tile so terrain never repeats visibly. */
export function tileNoise(x: number, y: number, salt = 0) {
  const h = Math.sin((x * 127.1 + y * 311.7 + salt * 74.7) * 43758.5453);
  return h - Math.floor(h);
}

function shade(color: number, amount: number) {
  const r = (color >> 16) & 0xff;
  const g = (color >> 8) & 0xff;
  const b = color & 0xff;
  const mix = (c: number) =>
    Math.max(0, Math.min(255, Math.round(amount >= 0 ? c + (255 - c) * amount : c * (1 + amount))));
  return `#${((mix(r) << 16) | (mix(g) << 8) | mix(b)).toString(16).padStart(6, "0")}`;
}

type Ctx = CanvasRenderingContext2D;

function box(
  ctx: Ctx,
  x: number,
  y: number,
  w: number,
  h: number,
  fill: string,
  outline = true,
) {
  if (outline) {
    ctx.fillStyle = OUTLINE;
    ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
  }
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, w, h);
}

function disc(ctx: Ctx, cx: number, cy: number, r: number, fill: string, outline = true) {
  if (outline) {
    ctx.fillStyle = OUTLINE;
    ctx.beginPath();
    ctx.arc(cx, cy, r + 1, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
}

/** Ground bed painted underneath object tiles so nothing floats on a void. */
function bedFor(kind: TileKind): TileKind | null {
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
    case "desk":
    case "table":
    case "counter":
    case "chair":
    case "computer":
    case "plant":
    case "shelf":
    case "bed":
    case "board":
    case "rug":
    case "door":
      return "floor";
    default:
      return null;
  }
}

function paintGround(ctx: Ctx, kind: TileKind, px: number, py: number, x: number, y: number) {
  const c = TILE_COLORS[kind];
  const base = hex(c.base);
  const detail = hex(c.detail ?? c.base);
  ctx.fillStyle = base;
  ctx.fillRect(px, py, TILE, TILE);

  const n = tileNoise(x, y);
  switch (kind) {
    case "grass":
    case "grassAlt": {
      // Dithered two-tone bed so large lawns don't read as flat color.
      ctx.fillStyle = shade(c.base, 0.06);
      for (let dy = 0; dy < TILE; dy += 4) {
        for (let dx = ((y + dy / 4) % 2) * 4; dx < TILE; dx += 8) {
          ctx.fillRect(px + dx, py + dy, 4, 4);
        }
      }
      // Three deterministic tufts with a darker root pixel each.
      for (let i = 0; i < 3; i += 1) {
        const gx = px + 3 + Math.floor(tileNoise(x, y, i * 5 + 1) * 25);
        const gy = py + 4 + Math.floor(tileNoise(x, y, i * 7 + 3) * 22);
        ctx.fillStyle = shade(c.base, -0.22);
        ctx.fillRect(gx, gy + 4, 2, 2);
        ctx.fillStyle = detail;
        ctx.fillRect(gx, gy, 2, 4);
        ctx.fillRect(gx + 2, gy + 2, 2, 3);
      }
      // Soft top-light band.
      ctx.fillStyle = shade(c.base, 0.12);
      ctx.fillRect(px, py, TILE, 2);
      break;
    }
    case "flower": {
      ctx.fillStyle = hex(TILE_COLORS.grass.base);
      ctx.fillRect(px, py, TILE, TILE);
      ctx.fillStyle = hex(TILE_COLORS.grass.detail ?? TILE_COLORS.grass.base);
      ctx.fillRect(px + 6, py + 22, 2, 5);
      ctx.fillRect(px + 20, py + 24, 2, 4);
      // Petal rosettes: four petals + contrasting center.
      const bloom = (bx: number, by: number, petal: string, core: string) => {
        ctx.fillStyle = petal;
        ctx.fillRect(bx - 3, by - 1, 2, 3);
        ctx.fillRect(bx + 2, by - 1, 2, 3);
        ctx.fillRect(bx - 1, by - 4, 3, 2);
        ctx.fillRect(bx - 1, by + 2, 3, 2);
        ctx.fillStyle = core;
        ctx.fillRect(bx - 1, by - 1, 3, 3);
      };
      bloom(px + 10, py + 13, detail, "#ffffff");
      bloom(px + 21, py + 20, "#ff8fa8", "#ffe9a8");
      break;
    }

    case "path":
    case "stone":
    case "brick": {
      // Mortar bed.
      ctx.fillStyle = shade(c.base, -0.16);
      ctx.fillRect(px, py, TILE, TILE);
      const stoneH = kind === "brick" ? 10 : 14;
      const stoneW = kind === "brick" ? 15 : 14;
      const rows = Math.ceil(TILE / stoneH) + 1;
      for (let r = 0; r < rows; r++) {
        const offset = (y * 2 + r) % 2 === 0 ? 0 : -Math.floor(stoneW / 2);
        for (let cIdx = -1; cIdx < 3; cIdx++) {
          const sx = px + offset + cIdx * (stoneW + 2) + 1;
          const sy = py + r * stoneH + 1;
          const left = Math.max(px, sx);
          const right = Math.min(px + TILE, sx + stoneW);
          const top = Math.max(py, sy);
          const bottom = Math.min(py + TILE, sy + stoneH - 2);
          if (right <= left || bottom <= top) continue;
          const w = right - left;
          const h = bottom - top;
          const tint = tileNoise(x * 4 + cIdx, y * 4 + r) * 0.12 - 0.05;
          ctx.fillStyle = shade(c.base, tint);
          ctx.fillRect(left, top, w, h);
          // Bevel: light top-left, dark bottom-right.
          ctx.fillStyle = shade(c.base, 0.22);
          ctx.fillRect(left, top, w, 1);
          ctx.fillRect(left, top, 1, h);
          ctx.fillStyle = shade(c.base, -0.22);
          ctx.fillRect(left, top + h - 1, w, 1);
          ctx.fillRect(left + w - 1, top, 1, h);
        }
      }
      break;
    }
    case "water": {
      ctx.fillStyle = base;
      ctx.fillRect(px, py, TILE, TILE);
      // Depth gradient bands.
      ctx.fillStyle = shade(c.base, -0.1);
      ctx.fillRect(px, py + 18, TILE, 8);
      ctx.fillStyle = shade(c.base, -0.2);
      ctx.fillRect(px, py + TILE - 6, TILE, 6);
      // Ripple crests with a bright caps line above each.
      const rip = (rx: number, ry: number, w: number) => {
        ctx.fillStyle = detail;
        ctx.fillRect(rx, ry, w, 2);
        ctx.fillStyle = shade(c.detail ?? c.base, 0.45);
        ctx.fillRect(rx + 1, ry, Math.max(2, w - 6), 1);
      };
      rip(px + 3 + Math.floor(tileNoise(x, y) * 4), py + 7, 12);
      rip(px + 16, py + 18, 10);
      rip(px + 6, py + 26, 7);
      break;
    }
    case "floor":
    case "floorAlt": {
      ctx.fillStyle = base;
      ctx.fillRect(px, py, TILE, TILE);
      // Plank/tile seams with a warm bevel.
      ctx.fillStyle = shade(c.base, -0.1);
      ctx.fillRect(px, py + 15, TILE, 1);
      ctx.fillStyle = detail;
      ctx.fillRect(px, py + TILE - 2, TILE, 2);
      ctx.fillStyle = shade(c.base, 0.2);
      ctx.fillRect(px, py, TILE, 2);
      ctx.fillRect(px, py + 16, TILE, 1);
      break;
    }

    default:
      break;
  }

  // Grid seam: a faint darker edge that gives the map tile definition.
  ctx.fillStyle = "rgba(30,20,14,0.10)";
  ctx.fillRect(px, py + TILE - 1, TILE, 1);
  ctx.fillRect(px + TILE - 1, py, 1, TILE);
}

function paintObject(ctx: Ctx, kind: TileKind, px: number, py: number, x: number, y: number) {
  const c = TILE_COLORS[kind];
  const base = hex(c.base);
  const detail = hex(c.detail ?? c.base);

  switch (kind) {
    case "tree": {
      // Cast shadow on the ground first.
      ctx.fillStyle = "rgba(30,20,14,0.20)";
      ctx.beginPath();
      ctx.ellipse(px + 16, py + 29, 10, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      // Trunk with bark shading.
      box(ctx, px + 14, py + 18, 5, 13, hex(c.detail ?? 0x8a5a34));
      ctx.fillStyle = shade(c.detail ?? 0x8a5a34, -0.25);
      ctx.fillRect(px + 17, py + 18, 2, 13);
      // Layered canopy: three overlapping clusters for a fuller silhouette.
      disc(ctx, px + 16, py + 15, 12, base);
      disc(ctx, px + 9, py + 12, 7, base);
      disc(ctx, px + 23, py + 13, 7, base);
      // Sunlit crown.
      ctx.fillStyle = shade(c.base, 0.26);
      ctx.beginPath();
      ctx.arc(px + 12, py + 9, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = shade(c.base, 0.42);
      ctx.beginPath();
      ctx.arc(px + 11, py + 7, 3, 0, Math.PI * 2);
      ctx.fill();
      // Shadowed underside.
      ctx.fillStyle = shade(c.base, -0.24);
      ctx.beginPath();
      ctx.arc(px + 21, py + 20, 5, 0, Math.PI * 2);
      ctx.fill();
      // Leaf speckle.
      ctx.fillStyle = shade(c.base, 0.16);
      ctx.fillRect(px + 18, py + 11, 2, 2);
      ctx.fillRect(px + 7, py + 16, 2, 2);
      break;
    }

    case "hedge": {
      box(ctx, px + 1, py + 6, 30, 24, base);
      ctx.fillStyle = shade(c.base, 0.2);
      ctx.fillRect(px + 2, py + 7, 28, 4);
      ctx.fillStyle = detail;
      ctx.fillRect(px + 5, py + 14, 6, 4);
      ctx.fillRect(px + 19, py + 20, 6, 4);
      break;
    }
    case "bench": {
      box(ctx, px + 2, py + 12, 28, 8, base);
      ctx.fillStyle = shade(c.base, 0.2);
      ctx.fillRect(px + 3, py + 13, 26, 2);
      box(ctx, px + 4, py + 20, 4, 7, detail);
      box(ctx, px + 24, py + 20, 4, 7, detail);
      break;
    }
    case "lamp": {
      box(ctx, px + 14, py + 12, 4, 18, base);
      disc(ctx, px + 16, py + 8, 6, detail);
      ctx.fillStyle = "rgba(255,235,150,0.35)";
      ctx.beginPath();
      ctx.arc(px + 16, py + 10, 13, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "sign":
    case "board": {
      box(ctx, px + 14, py + 18, 4, 12, hex(0x8a5a34));
      box(ctx, px + 3, py + 4, 26, 16, base);
      ctx.fillStyle = detail;
      ctx.fillRect(px + 6, py + 8, 20, 2);
      ctx.fillRect(px + 6, py + 13, 14, 2);
      break;
    }
    case "fountain": {
      disc(ctx, px + 16, py + 16, 14, hex(TILE_COLORS.stone.base));
      disc(ctx, px + 16, py + 16, 10, hex(TILE_COLORS.water.base), false);
      ctx.fillStyle = shade(TILE_COLORS.water.detail ?? TILE_COLORS.water.base, 0.3);
      ctx.fillRect(px + 13, py + 8, 6, 10);
      break;
    }
    case "buildingWall": {
      ctx.fillStyle = base;
      ctx.fillRect(px, py, TILE, TILE);
      // Plaster blocks with soft mortar lines.
      ctx.fillStyle = shade(c.base, -0.08);
      ctx.fillRect(px, py + 15, TILE, 1);
      for (let i = 0; i < 2; i += 1) {
        const bx = px + ((y + i) % 2 === 0 ? 10 : 22);
        ctx.fillRect(bx, py + i * 16, 1, 15);
      }
      ctx.fillStyle = shade(c.base, 0.18);
      ctx.fillRect(px, py, TILE, 3);
      ctx.fillStyle = detail;
      ctx.fillRect(px, py + 16, TILE, 2);
      ctx.fillStyle = "rgba(42,29,22,0.24)";
      ctx.fillRect(px, py + TILE - 2, TILE, 2);
      ctx.fillRect(px + TILE - 2, py, 2, TILE);
      break;
    }
    case "buildingRoof": {
      ctx.fillStyle = base;
      ctx.fillRect(px, py, TILE, TILE);
      // Scalloped shingle rows: rounded caps + shaded lip.
      for (let r = 0; r < 3; r++) {
        const sy = py + r * 11;
        const offset = (y * 3 + r) % 2 === 0 ? 0 : 6;
        for (let i = -1; i < 4; i++) {
          const sx = px + offset + i * 12;
          ctx.fillStyle = shade(c.base, 0.1);
          ctx.fillRect(sx, sy, 11, 9);
          ctx.fillStyle = detail;
          ctx.fillRect(sx, sy + 7, 11, 3);
          ctx.fillStyle = shade(c.base, 0.3);
          ctx.fillRect(sx + 1, sy + 1, 4, 2);
        }
      }
      ctx.fillStyle = shade(c.base, 0.34);
      ctx.fillRect(px, py, TILE, 2);
      ctx.fillStyle = "rgba(42,29,22,0.18)";
      ctx.fillRect(px, py + TILE - 1, TILE, 1);
      break;
    }

    case "window": {
      ctx.fillStyle = hex(TILE_COLORS.buildingWall.base);
      ctx.fillRect(px, py, TILE, TILE);
      box(ctx, px + 5, py + 7, 22, 19, base);
      ctx.fillStyle = shade(c.base, 0.35);
      ctx.fillRect(px + 7, py + 9, 8, 7);
      ctx.fillStyle = detail;
      ctx.fillRect(px + 15, py + 7, 2, 19);
      ctx.fillRect(px + 5, py + 15, 22, 2);
      break;
    }
    case "door": {
      box(ctx, px + 5, py + 3, 22, 28, base);
      ctx.fillStyle = shade(c.base, 0.18);
      ctx.fillRect(px + 7, py + 5, 18, 4);
      disc(ctx, px + 22, py + 18, 2, detail, false);
      break;
    }
    case "wall": {
      ctx.fillStyle = base;
      ctx.fillRect(px, py, TILE, TILE);
      ctx.fillStyle = detail;
      for (let r = 0; r < 3; r++) {
        const sy = py + r * 11 + 2;
        const offset = (y + r) % 2 === 0 ? 0 : 8;
        for (let i = -1; i < 3; i++) ctx.fillRect(px + offset + i * 16 + 1, sy, 14, 8);
      }
      ctx.fillStyle = "rgba(42,29,22,0.3)";
      ctx.fillRect(px, py + TILE - 2, TILE, 2);
      break;
    }
    case "rug": {
      box(ctx, px + 1, py + 1, 30, 30, base, false);
      ctx.fillStyle = detail;
      ctx.fillRect(px + 4, py + 4, 24, 3);
      ctx.fillRect(px + 4, py + 25, 24, 3);
      break;
    }
    case "desk":
    case "table":
    case "counter": {
      box(ctx, px + 1, py + 8, 30, 18, base);
      ctx.fillStyle = shade(c.base, 0.22);
      ctx.fillRect(px + 2, py + 9, 28, 4);
      ctx.fillStyle = detail;
      ctx.fillRect(px + 2, py + 22, 28, 3);
      break;
    }
    case "chair": {
      box(ctx, px + 9, py + 12, 14, 13, base);
      box(ctx, px + 9, py + 5, 14, 6, detail);
      break;
    }
    case "shelf": {
      box(ctx, px + 1, py + 1, 30, 30, base);
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = detail;
        ctx.fillRect(px + 3, py + 4 + i * 9, 26, 6);
        ctx.fillStyle = shade(c.detail ?? c.base, -0.25);
        ctx.fillRect(px + 3 + (i % 2) * 6, py + 4 + i * 9, 4, 6);
      }
      break;
    }
    case "computer": {
      box(ctx, px + 6, py + 6, 20, 15, base);
      ctx.fillStyle = detail;
      ctx.fillRect(px + 8, py + 8, 16, 11);
      ctx.fillStyle = shade(c.detail ?? c.base, 0.35);
      ctx.fillRect(px + 9, py + 9, 6, 3);
      box(ctx, px + 8, py + 23, 16, 4, hex(0x9a8f80));
      break;
    }
    case "bed": {
      box(ctx, px + 3, py + 2, 26, 28, base);
      ctx.fillStyle = detail;
      ctx.fillRect(px + 5, py + 4, 22, 9);
      ctx.fillStyle = shade(c.base, -0.18);
      ctx.fillRect(px + 5, py + 16, 22, 12);
      break;
    }
    case "plant": {
      box(ctx, px + 10, py + 20, 12, 10, base);
      disc(ctx, px + 16, py + 13, 9, hex(TILE_COLORS.hedge.base));
      ctx.fillStyle = shade(TILE_COLORS.hedge.base, 0.25);
      ctx.fillRect(px + 11, py + 8, 5, 3);
      break;
    }
    default:
      break;
  }
}

/** Draw a single tile (ground bed + object) into a canvas context. */
export function drawTile(ctx: Ctx, kind: TileKind, x: number, y: number) {
  const px = x * TILE;
  const py = y * TILE;
  const bed = bedFor(kind);
  if (bed) {
    paintGround(ctx, bed, px, py, x, y);
    paintObject(ctx, kind, px, py, x, y);
    return;
  }
  if (kind === "wall" || kind === "buildingWall" || kind === "buildingRoof" || kind === "window") {
    paintObject(ctx, kind, px, py, x, y);
    return;
  }
  paintGround(ctx, kind, px, py, x, y);
}
