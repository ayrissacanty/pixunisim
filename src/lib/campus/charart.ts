import type Phaser from "phaser";

/**
 * Original UNIFY character art, drawn at runtime in a hand-illustrated style.
 *
 * Every character is painted with soft curved shapes, a warm ink contour,
 * cel-shaded volumes and painted cheeks — closer to a storybook illustration
 * than to a blocky pixel doll. Sheets are a 3x4 grid of walk frames ordered
 * down / left / right / up, so the scene's animation wiring is unchanged.
 */

/** Source resolution of one frame. Sprites are drawn big and scaled down. */
export const FRAME = 64;
/** Scale applied by the scene so a character reads ~40px tall in the world. */
export const CHAR_RENDER_SCALE = 0.62;
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

const INK = "#3a2418";

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

export const SKIN_TONES = [0xf7d7b8, 0xefc094, 0xd8a06e, 0xb87c4c, 0x8d5a35, 0x60402b];
export const HAIR_COLORS = [
  0x2c1d16, 0x5a3620, 0x8c5a2b, 0xc98b3a, 0xe6cf92, 0x9c3f3f, 0x3d4f7a, 0x6b4a86,
];
export const OUTFIT_COLORS = [
  0xff6f52, 0xffd54a, 0x54c0ec, 0x5ec25e, 0xff9ab0, 0x8a6bd1, 0xf3a35c, 0x3f8a5a, 0x2e6fa8,
  0x6d2f34,
];
export const BOTTOM_COLORS = [0x3d4f7a, 0x4a3b30, 0x2f5d52, 0x6b4a86, 0x7a4b3a, 0x36506b];
export const SHOE_COLORS = [0x2c231d, 0x4a3b30, 0x8a4a2c, 0xd8d2c4];
export const HAIR_STYLES: HairStyle[] = ["short", "long", "bun", "curly", "braids", "cap"];

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
    skin: at(SKIN_TONES, 2),
    hair: at(HAIR_COLORS, 6),
    hairStyle: at(HAIR_STYLES, 11),
    shirt: staff ? [0x6d2f34, 0xa8543f, 0x3f6446][(h >>> 15) % 3]! : at(OUTFIT_COLORS, 15),
    pants: at(BOTTOM_COLORS, 19),
    shoes: at(SHOE_COLORS, 23),
    accent: at(OUTFIT_COLORS, 27),
  };
}

/* ------------------------------------------------------------------ *
 * Drawing helpers — soft, hand-inked shapes
 * ------------------------------------------------------------------ */

type Ctx = CanvasRenderingContext2D;

function inked(ctx: Ctx, fill: string, width = 2.4) {
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = width;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.stroke();
}

/** Rounded capsule used for limbs and torsos. */
function capsule(
  ctx: Ctx,
  x: number,
  y: number,
  w: number,
  h: number,
  fill: string,
  r = Math.min(w, h) / 2,
  outline = true,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  if (outline) inked(ctx, fill);
  else {
    ctx.fillStyle = fill;
    ctx.fill();
  }
}

function ellipse(ctx: Ctx, cx: number, cy: number, rx: number, ry: number, fill: string, outline = true) {
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  if (outline) inked(ctx, fill);
  else {
    ctx.fillStyle = fill;
    ctx.fill();
  }
}

/** Clip helper so shading strokes stay inside the shape they belong to. */
function clipped(ctx: Ctx, path: () => void, paint: () => void) {
  ctx.save();
  ctx.beginPath();
  path();
  ctx.clip();
  paint();
  ctx.restore();
}

function drawHair(ctx: Ctx, cx: number, headY: number, look: CharacterLook, dir: SpriteDirection) {
  const hair = hex(look.hair);
  const dark = shade(look.hair, -0.3);
  const back = dir === "up";

  // Back mass first so it reads behind the head.
  if (look.hairStyle === "long" || back) {
    ellipse(ctx, cx, headY + 4, 12.5, 13, look.hairStyle === "cap" ? hex(look.accent) : hair);
  }

  switch (look.hairStyle) {
    case "long":
      capsule(ctx, cx - 13, headY - 6, 7, 24, hair, 3.5);
      capsule(ctx, cx + 6, headY - 6, 7, 24, hair, 3.5);
      break;
    case "bun":
      ellipse(ctx, cx, headY - 13, 5.5, 5, hair);
      break;
    case "curly":
      for (const [dx, dy, r] of [
        [-10, -6, 5],
        [-3, -10, 5.5],
        [5, -9, 5],
        [11, -4, 4.5],
        [-12, 1, 4],
        [12, 2, 4],
      ] as const) {
        ellipse(ctx, cx + dx, headY + dy, r, r * 0.9, hair);
      }
      break;
    case "braids":
      capsule(ctx, cx - 15, headY - 3, 6, 20, hair, 3);
      capsule(ctx, cx + 9, headY - 3, 6, 20, hair, 3);
      ellipse(ctx, cx - 12, headY + 17, 3.4, 3, dark);
      ellipse(ctx, cx + 12, headY + 17, 3.4, 3, dark);
      break;
    case "cap":
      ctx.beginPath();
      ctx.ellipse(cx, headY - 2, 12, 10, 0, Math.PI, Math.PI * 2);
      ctx.closePath();
      inked(ctx, hex(look.accent));
      if (!back) {
        ctx.beginPath();
        ctx.ellipse(cx + 2, headY - 2, 14, 4, 0, 0, Math.PI);
        ctx.closePath();
        inked(ctx, shade(look.accent, -0.25));
      }
      break;
    default:
      break;
  }

  if (look.hairStyle !== "cap") {
    // Fringe cap over the top of the skull.
    ctx.beginPath();
    ctx.ellipse(cx, headY - 3, 12.4, 10.5, 0, Math.PI, Math.PI * 2);
    ctx.quadraticCurveTo(cx + 6, headY + 2, cx - 12.4, headY - 3);
    ctx.closePath();
    inked(ctx, hair);
    // Painted highlight sweep.
    clipped(
      ctx,
      () => ctx.ellipse(cx, headY - 3, 12.4, 10.5, 0, 0, Math.PI * 2),
      () => {
        ctx.strokeStyle = shade(look.hair, 0.35);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx - 1, headY - 2, 8, Math.PI * 1.15, Math.PI * 1.75);
        ctx.stroke();
      },
    );
  }
}

function drawFrame(
  ctx: Ctx,
  ox: number,
  oy: number,
  look: CharacterLook,
  dir: SpriteDirection,
  frame: number,
) {
  const swing = frame === 0 ? -1 : frame === 2 ? 1 : 0;
  const bob = frame === 1 ? 0 : -1.5;
  const cx = ox + 32;
  const skin = hex(look.skin);
  const shirt = hex(look.shirt);
  const pants = hex(look.pants);
  const shoes = hex(look.shoes);

  // Soft ground shadow.
  ctx.fillStyle = "rgba(30,20,14,0.20)";
  ctx.beginPath();
  ctx.ellipse(cx, oy + 57, 14, 4.5, 0, 0, Math.PI * 2);
  ctx.fill();

  const hipY = oy + 40 + bob;
  // Legs.
  if (dir === "left" || dir === "right") {
    capsule(ctx, cx - 5, hipY + swing, 9, 13 - swing, pants, 4);
    capsule(ctx, cx - 7 + swing * 2, hipY + 12, 13, 6, shoes, 3);
  } else {
    capsule(ctx, cx - 9, hipY - Math.max(0, swing) * 1.5, 8, 14, pants, 4);
    capsule(ctx, cx + 1, hipY - Math.max(0, -swing) * 1.5, 8, 14, pants, 4);
    capsule(ctx, cx - 10, hipY + 12 - Math.max(0, swing) * 1.5, 10, 6, shoes, 3);
    capsule(ctx, cx, hipY + 12 - Math.max(0, -swing) * 1.5, 10, 6, shoes, 3);
  }

  // Torso — a soft rounded tunic that flares slightly at the hem.
  const torsoY = oy + 23 + bob;
  ctx.beginPath();
  ctx.moveTo(cx - 10, torsoY + 2);
  ctx.quadraticCurveTo(cx, torsoY - 4, cx + 10, torsoY + 2);
  ctx.quadraticCurveTo(cx + 14, torsoY + 12, cx + 12, torsoY + 19);
  ctx.quadraticCurveTo(cx, torsoY + 23, cx - 12, torsoY + 19);
  ctx.quadraticCurveTo(cx - 14, torsoY + 12, cx - 10, torsoY + 2);
  ctx.closePath();
  inked(ctx, shirt);
  clipped(
    ctx,
    () => {
      ctx.moveTo(cx - 14, torsoY - 4);
      ctx.lineTo(cx + 14, torsoY - 4);
      ctx.lineTo(cx + 14, torsoY + 24);
      ctx.lineTo(cx - 14, torsoY + 24);
    },
    () => {
      ctx.fillStyle = shade(look.shirt, -0.22);
      ctx.fillRect(cx + 5, torsoY - 6, 12, 32);
      ctx.fillStyle = shade(look.shirt, 0.26);
      ctx.fillRect(cx - 13, torsoY - 6, 5, 32);
      // Accent hem + collar trim.
      ctx.fillStyle = hex(look.accent);
      ctx.fillRect(cx - 16, torsoY + 16, 32, 3);
      if (dir !== "up") {
        ctx.beginPath();
        ctx.ellipse(cx, torsoY + 1, 6, 3.5, 0, 0, Math.PI);
        ctx.fill();
      }
    },
  );

  // Arms.
  const armY = torsoY + 3;
  if (dir === "left") {
    capsule(ctx, cx - 14, armY - swing, 7, 15, shirt, 3.5);
    ellipse(ctx, cx - 10.5, armY + 16 - swing, 3.6, 3.4, skin);
  } else if (dir === "right") {
    capsule(ctx, cx + 7, armY + swing, 7, 15, shirt, 3.5);
    ellipse(ctx, cx + 10.5, armY + 16 + swing, 3.6, 3.4, skin);
  } else {
    capsule(ctx, cx - 16, armY - swing, 7, 15, shirt, 3.5);
    capsule(ctx, cx + 9, armY + swing, 7, 15, shirt, 3.5);
    ellipse(ctx, cx - 12.5, armY + 16 - swing, 3.6, 3.4, skin);
    ellipse(ctx, cx + 12.5, armY + 16 + swing, 3.6, 3.4, skin);
  }

  // Head.
  const headY = oy + 15 + bob;
  capsule(ctx, cx - 3, headY + 8, 6, 6, shade(look.skin, -0.22), 3);
  ellipse(ctx, cx, headY, 12, 12.5, skin);
  clipped(
    ctx,
    () => ctx.ellipse(cx, headY, 12, 12.5, 0, 0, Math.PI * 2),
    () => {
      ctx.fillStyle = shade(look.skin, -0.16);
      ctx.fillRect(cx + 5, headY - 14, 14, 28);
      ctx.fillStyle = shade(look.skin, 0.22);
      ctx.beginPath();
      ctx.ellipse(cx - 5, headY - 3, 5, 6, 0, 0, Math.PI * 2);
      ctx.fill();
    },
  );

  // Face.
  if (dir !== "up") {
    const eye = (ex: number) => {
      ellipse(ctx, cx + ex, headY + 1, 2.6, 3, "#fffaf1", false);
      ctx.fillStyle = INK;
      ctx.beginPath();
      ctx.ellipse(cx + ex + (dir === "left" ? -0.6 : dir === "right" ? 0.6 : 0), headY + 1.4, 1.5, 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.fillRect(cx + ex - 0.4, headY, 1.1, 1.1);
      ctx.strokeStyle = shade(look.hair, -0.1);
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(cx + ex, headY + 0.5, 3.4, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
    };
    const blush = (bx: number) => {
      ctx.fillStyle = "rgba(232,124,110,0.35)";
      ctx.beginPath();
      ctx.ellipse(cx + bx, headY + 5, 3, 1.8, 0, 0, Math.PI * 2);
      ctx.fill();
    };
    if (dir === "left") {
      eye(-4);
      blush(-7);
    } else if (dir === "right") {
      eye(4);
      blush(7);
    } else {
      eye(-4.5);
      eye(4.5);
      blush(-8);
      blush(8);
    }
    // Smile.
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    const mx = dir === "left" ? -3 : dir === "right" ? 3 : 0;
    ctx.arc(cx + mx, headY + 5.5, 2.6, Math.PI * 0.15, Math.PI * 0.85);
    ctx.stroke();
  }

  drawHair(ctx, cx, headY, look, dir);
}

/** Paints one hand-drawn character frame into any 2D canvas context. */
export function paintCharacter(
  ctx: Ctx,
  look: CharacterLook,
  dir: SpriteDirection = "down",
  frame = 1,
  ox = 0,
  oy = 0,
) {
  drawFrame(ctx, ox, oy, look, dir, frame);
}

/** Builds (or reuses) a 3x4 walk-cycle sheet texture for one look. */
export function ensureCharacterTexture(scene: Phaser.Scene, key: string, look: CharacterLook) {
  if (scene.textures.exists(key)) return key;
  const tex = scene.textures.createCanvas(key, FRAME * 3, FRAME * 4);
  if (!tex) return key;
  const ctx = tex.context;
  ctx.imageSmoothingEnabled = true;
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
