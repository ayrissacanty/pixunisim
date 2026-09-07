import type Phaser from "phaser";
import { TILE } from "./tiles";
import { OVERLAY_DEPTH } from "./depth";
import type { ZoneMap } from "./world";
import { ambientAt, type AmbientTint } from "./daynight";

/**
 * Atmosphere layer: drifting autumn leaves, fountain / water splash emitters
 * and the day-night ambient wash. All of it is purely decorative — nothing
 * here touches collision, progress or interaction state.
 */

const LEAF_KEY = "fx-leaf";
const DROP_KEY = "fx-drop";

const LEAF_COLORS = [0xc27847, 0xd4a373, 0xa8543f, 0xb98b3a];

export function ensureFxTextures(scene: Phaser.Scene) {
  if (!scene.textures.exists(LEAF_KEY)) {
    const tex = scene.textures.createCanvas(LEAF_KEY, 10, 10);
    if (tex) {
      const ctx = tex.context;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.moveTo(5, 0);
      ctx.quadraticCurveTo(10, 4, 5, 10);
      ctx.quadraticCurveTo(0, 4, 5, 0);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "rgba(58,36,24,0.55)";
      ctx.lineWidth = 1;
      ctx.stroke();
      tex.refresh();
    }
  }
  if (!scene.textures.exists(DROP_KEY)) {
    const tex = scene.textures.createCanvas(DROP_KEY, 6, 6);
    if (tex) {
      const ctx = tex.context;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(3, 3, 2.6, 0, Math.PI * 2);
      ctx.fill();
      tex.refresh();
    }
  }
}

export interface Ambience {
  leaves?: Phaser.GameObjects.Particles.ParticleEmitter;
  splashes: Phaser.GameObjects.Particles.ParticleEmitter[];
  overlay: Phaser.GameObjects.Rectangle;
  destroy: () => void;
}

/** Finds the water / fountain tiles worth putting a splash emitter on. */
export function splashPoints(zone: ZoneMap, limit = 6) {
  const points: { x: number; y: number }[] = [];
  for (let y = 0; y < zone.height && points.length < limit; y += 1) {
    for (let x = 0; x < zone.width && points.length < limit; x += 1) {
      const kind = zone.tiles[y]?.[x];
      if (kind !== "fountain") continue;
      points.push({ x: x * TILE + TILE / 2, y: y * TILE + TILE / 2 });
    }
  }
  return points;
}

export function createAmbience(
  scene: Phaser.Scene,
  zone: ZoneMap,
  project: (px: number, py: number) => { x: number; y: number },
  options: { motion: number },
): Ambience {
  ensureFxTextures(scene);
  const outdoor = zone.kind === "outdoor";
  const cam = scene.cameras.main;

  const overlay = scene.add
    .rectangle(0, 0, cam.width, cam.height, 0x1a1510, 0)
    .setOrigin(0, 0)
    .setScrollFactor(0)
    .setDepth(OVERLAY_DEPTH - 20)
    .setBlendMode(Phaser.BlendModes.MULTIPLY);

  const splashes: Phaser.GameObjects.Particles.ParticleEmitter[] = [];
  let leaves: Phaser.GameObjects.Particles.ParticleEmitter | undefined;

  if (options.motion > 0) {
    if (outdoor) {
      leaves = scene.add.particles(0, 0, LEAF_KEY, {
        x: { min: 0, max: cam.width },
        y: -20,
        lifespan: 9000,
        speedY: { min: 16, max: 34 },
        speedX: { min: -26, max: 10 },
        scale: { min: 0.5, max: 1.1 },
        rotate: { min: -180, max: 180 },
        alpha: { start: 0.9, end: 0.35 },
        tint: LEAF_COLORS,
        frequency: 520,
        quantity: 1,
      });
      leaves.setScrollFactor(0).setDepth(OVERLAY_DEPTH - 30);
    }

    for (const point of splashPoints(zone)) {
      const at = project(point.x, point.y);
      const emitter = scene.add.particles(at.x, at.y - 18, DROP_KEY, {
        lifespan: 900,
        speed: { min: 18, max: 46 },
        angle: { min: 240, max: 300 },
        gravityY: 90,
        scale: { start: 0.9, end: 0.1 },
        alpha: { start: 0.8, end: 0 },
        tint: [0xbfe4f2, 0xe8f6ff],
        frequency: 140,
        quantity: 1,
      });
      emitter.setDepth(OVERLAY_DEPTH - 40);
      splashes.push(emitter);
    }
  }

  const resize = () => {
    overlay.setSize(scene.scale.width, scene.scale.height);
    leaves?.setEmitterAngle?.(0);
  };
  scene.scale.on("resize", resize);

  return {
    ...(leaves ? { leaves } : {}),
    splashes,
    overlay,
    destroy: () => {
      scene.scale.off("resize", resize);
      leaves?.destroy();
      splashes.forEach((s) => s.destroy());
      overlay.destroy();
    },
  };
}

/** Applies the ambient wash for a moment in the day. */
export function applyAmbient(
  scene: Phaser.Scene,
  ambience: Ambience,
  minutes: number,
  outdoor: boolean,
): AmbientTint {
  const tint = ambientAt(minutes);
  ambience.overlay.setSize(scene.scale.width, scene.scale.height);
  ambience.overlay.setFillStyle(tint.color, 1);
  ambience.overlay.setAlpha(outdoor ? tint.alpha : tint.alpha * 0.45);
  return tint;
}
