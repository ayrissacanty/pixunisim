import type Phaser from "phaser";

/**
 * Original 32x32 character sprite sheets, generated at runtime.
 *
 * Each sheet is a 3x4 grid: three walk frames per row, rows ordered
 * down / left / right / up. Sprites use a limited palette (skin, hair,
 * shirt, trousers, shoes, accent), 1px dark outlines and soft top-down
 * shading so they read like classic top-down RPG characters.
 */

export const FRAME = 32;
export const DIRECTIONS = ["down", "left", "right", "up"] as const;
export type SpriteDirection = (typeof DIRECTIONS)[number];

export type HairStyle = "short" | "long" | "bun" | "curly" | "braids" | "cap";

export interface CharacterLook {
  skin: number;
  hair: number;
  hairStyle: HairStyle;
  shirt: number;
  pants: number;
  shoes: number;
  accent: number;
}

const OUTLINE = "#241812";

function hex(v: number) {
  return `#${v.toString(16).padStart(6, "0")}`;
}

function shade(color: number, amount: number) {
  const r = (color >> 16) & 0xff;
  const g = (color >> 8) & 0xff;
  const b = color & 0xff;
  const mix = (c: number) =>
    Math.max(0, Math.min(255, Math.round(amount >= 0 ? c + (255 - c) * amount : c * (1 + amount))));
  return `#${((mix(r) << 16) | (mix(g) << 8) | mix(b)).toString(16).padStart(6, "0")}`;
}

/* ------------------------------------------------------------------ *
 * Deterministic casting
 * ------------------------------------------------------------------ */

const SKINS = [0xf6d3b0, 0xecbc8e, 0xd39a68, 0xb4784a, 0x8c5733, 0x64402a];
const HAIRS = [0x2c1d16, 0x5a3620, 0x8c5a2b, 0xc98b3a, 0xe0c176, 0x9c3f3f, 0x3d4f7a, 0x6b4a86];
const SHIRTS = [
  0xff6f52, 0xffd54a, 0x54c0ec, 0x5ec25e, 0xff9ab0, 0x8a6bd1, 0xf3a35c, 0x3f8a5a, 0x2e6fa8,
  0xe0503a,
];
const PANTS = [0x3d4f7a, 0x4a3b30, 0x2f5d52, 0x6b4a86, 0x7a4b3a, 0x36506b];
const SHOES = [0x2c231d, 0x4a3b30, 0x8a4a2c];
const STYLES: HairStyle[] = ["short", "long", "bun", "curly", "braids", "cap"];

function hash(value: string) {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** A distinct, stable look for any character id. */
export function lookFor(id: string, role = ""): CharacterLook {
  const h = hash(id);
  const at = <T>(arr: T[], shift: number) => arr[(h >>> shift) % arr.length]!;
  const staff = role.length > 0 && !role.toLowerCase().includes("student");
  return {
    skin: at(SKINS, 2),
    hair: at(HAIRS, 6),
    hairStyle: at(STYLES, 11),
    // Staff wear the heritage bordeaux/terracotta accents; students wear the
    // bright storybook primaries.
    shirt: staff ? [0x6d2f34, 0xa8543f, 0x3f6446][(h >>> 15) % 3]! : at(SHIRTS, 15),
    pants: at(PANTS, 19),
    shoes: at(SHOES, 23),
    accent: at(SHIRTS, 27),
  };
}

/* ------------------------------------------------------------------ *
 * Drawing
 * ------------------------------------------------------------------ */

type Ctx = CanvasRenderingContext2D;

function box(ctx: Ctx, x: number, y: number, w: number, h: number, fill: string, outline = true) {
  if (w <= 0 || h <= 0) return;
  if (outline) {
    ctx.fillStyle = OUTLINE;
    ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
  }
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, w, h);
}

function drawHair(ctx: Ctx, ox: number, oy: number, look: CharacterLook, dir: SpriteDirection) {
  const hair = hex(look.hair);
  const hi = shade(look.hair, 0.28);
  const back = dir === "up";
  switch (look.hairStyle) {
    case "long":
      box(ctx, ox + 9, oy + 2, 14, 5, hair);
      box(ctx, ox + 8, oy + 4, 3, 12, hair);
      box(ctx, ox + 21, oy + 4, 3, 12, hair);
      if (back) box(ctx, ox + 10, oy + 5, 12, 9, hair, false);
      break;
    case "bun":
      box(ctx, ox + 10, oy + 2, 12, 4, hair);
      box(ctx, ox + 13, oy - 1, 6, 4, hair);
      if (back) box(ctx, ox + 10, oy + 4, 12, 9, hair, false);
      break;
    case "curly":
      box(ctx, ox + 9, oy + 1, 14, 6, hair);
      ctx.fillStyle = hair;
      ctx.fillRect(ox + 8, oy + 4, 2, 4);
      ctx.fillRect(ox + 22, oy + 4, 2, 4);
      if (back) box(ctx, ox + 10, oy + 5, 12, 9, hair, false);
      break;
    case "braids":
      box(ctx, ox + 10, oy + 2, 12, 4, hair);
      box(ctx, ox + 7, oy + 6, 3, 9, hair);
      box(ctx, ox + 22, oy + 6, 3, 9, hair);
      if (back) box(ctx, ox + 10, oy + 4, 12, 9, hair, false);
      break;
    case "cap":
      box(ctx, ox + 9, oy + 1, 14, 5, hex(look.accent));
      if (!back) box(ctx, ox + 9, oy + 6, 15, 2, shade(look.accent, -0.25), false);
      break;
    default:
      box(ctx, ox + 10, oy + 2, 12, 4, hair);
      if (back) box(ctx, ox + 10, oy + 4, 12, 9, hair, false);
      break;
  }
  if (!back && look.hairStyle !== "cap") {
    ctx.fillStyle = hi;
    ctx.fillRect(ox + 12, oy + 3, 4, 2);
  }
}

function drawFrame(ctx: Ctx, ox: number, oy: number, look: CharacterLook, dir: SpriteDirection, frame: number) {
  const swing = frame === 0 ? -1 : frame === 2 ? 1 : 0;
  const bob = frame === 1 ? 0 : -1;

  // Ground shadow.
  ctx.fillStyle = "rgba(20,14,10,0.22)";
  ctx.beginPath();
  ctx.ellipse(ox + 16, oy + 29, 8, 3, 0, 0, Math.PI * 2);
  ctx.fill();

  const pants = hex(look.pants);
  const shoes = hex(look.shoes);
  const shirt = hex(look.shirt);
  const skin = hex(look.skin);

  // Legs + shoes.
  const legTop = 22 + bob;
  if (dir === "left" || dir === "right") {
    box(ctx, ox + 13, oy + legTop + swing, 5, 6 - swing, pants);
    box(ctx, ox + 13, oy + legTop + swing + (6 - swing), 6, 2, shoes);
  } else {
    box(ctx, ox + 11, oy + legTop - Math.max(0, swing), 4, 6, pants);
    box(ctx, ox + 17, oy + legTop - Math.max(0, -swing), 4, 6, pants);
    box(ctx, ox + 11, oy + legTop + 6 - Math.max(0, swing), 4, 2, shoes);
    box(ctx, ox + 17, oy + legTop + 6 - Math.max(0, -swing), 4, 2, shoes);
  }

  // Torso.
  const torsoY = 12 + bob;
  box(ctx, ox + 10, oy + torsoY, 12, 11, shirt);
  ctx.fillStyle = shade(look.shirt, 0.22);
  ctx.fillRect(ox + 10, oy + torsoY, 12, 2);
  ctx.fillStyle = shade(look.shirt, -0.2);
  ctx.fillRect(ox + 10, oy + torsoY + 9, 12, 2);

  // Arms.
  if (dir === "left") {
    box(ctx, ox + 8, oy + torsoY + 1 - swing, 3, 8, shirt);
    box(ctx, ox + 8, oy + torsoY + 9 - swing, 3, 3, skin);
  } else if (dir === "right") {
    box(ctx, ox + 21, oy + torsoY + 1 + swing, 3, 8, shirt);
    box(ctx, ox + 21, oy + torsoY + 9 + swing, 3, 3, skin);
  } else {
    box(ctx, ox + 7, oy + torsoY + 1 - swing, 3, 8, shirt);
    box(ctx, ox + 22, oy + torsoY + 1 + swing, 3, 8, shirt);
    box(ctx, ox + 7, oy + torsoY + 9 - swing, 3, 3, skin);
    box(ctx, ox + 22, oy + torsoY + 9 + swing, 3, 3, skin);
  }

  // Head.
  const headY = 3 + bob;
  box(ctx, ox + 10, oy + headY, 12, 11, skin);
  ctx.fillStyle = shade(look.skin, -0.16);
  ctx.fillRect(ox + 10, oy + headY + 9, 12, 2);

  // Face.
  if (dir !== "up") {
    ctx.fillStyle = OUTLINE;
    if (dir === "left") {
      ctx.fillRect(ox + 11, oy + headY + 5, 2, 2);
    } else if (dir === "right") {
      ctx.fillRect(ox + 19, oy + headY + 5, 2, 2);
    } else {
      ctx.fillRect(ox + 12, oy + headY + 5, 2, 2);
      ctx.fillRect(ox + 18, oy + headY + 5, 2, 2);
      ctx.fillStyle = shade(look.skin, -0.3);
      ctx.fillRect(ox + 14, oy + headY + 8, 4, 1);
    }
  }

  drawHair(ctx, ox, oy + bob, look, dir);
}

/** Builds (or reuses) a 3x4 walk-cycle sheet texture for one look. */
export function ensureCharacterTexture(scene: Phaser.Scene, key: string, look: CharacterLook) {
  if (scene.textures.exists(key)) return key;
  const tex = scene.textures.createCanvas(key, FRAME * 3, FRAME * 4);
  if (!tex) return key;
  const ctx = tex.context;
  ctx.imageSmoothingEnabled = false;
  DIRECTIONS.forEach((dir, row) => {
    for (let col = 0; col < 3; col += 1) {
      drawFrame(ctx, col * FRAME, row * FRAME, look, dir, col);
      tex.add(row * 3 + col, 0, col * FRAME, row * FRAME, FRAME, FRAME);
    }
  });
  tex.refresh();
  return key;
}

/** Registers walk animations for a generated sheet. */
export function ensureCharacterAnims(scene: Phaser.Scene, key: string) {
  DIRECTIONS.forEach((dir, row) => {
    const animKey = `${key}-walk-${dir}`;
    if (scene.anims.exists(animKey)) return;
    const base = row * 3;
    scene.anims.create({
      key: animKey,
      frames: [base, base + 1, base + 2, base + 1].map((frame) => ({ key, frame })),
      frameRate: 8,
      repeat: -1,
    });
  });
}

export function idleFrame(dir: SpriteDirection) {
  return DIRECTIONS.indexOf(dir) * 3 + 1;
}
