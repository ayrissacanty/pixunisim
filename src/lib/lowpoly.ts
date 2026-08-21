import type * as THREE_NS from "three";
import { characterOf, type CharacterDef, type CharacterId } from "@/lib/characters";

/**
 * Runtime-built low-poly people.
 *
 * The Styloo room pack is flat-shaded, untextured and chunky, so the cast is
 * generated from boxes with matte materials rather than imported from a
 * different art pack. Everything is authored in metres; a finished character
 * stands 1.7m tall with its feet on y = 0.
 */

type THREE = typeof THREE_NS;

const BUILD = {
  slim: { shoulder: 0.36, torso: 0.19, limb: 0.1 },
  regular: { shoulder: 0.42, torso: 0.22, limb: 0.115 },
  sturdy: { shoulder: 0.48, torso: 0.25, limb: 0.13 },
} as const;

function matte(THREE: THREE, color: number) {
  return new THREE.MeshLambertMaterial({ color, flatShading: true });
}

function box(
  THREE: THREE,
  material: THREE_NS.Material,
  w: number,
  h: number,
  d: number,
  x: number,
  y: number,
  z: number,
) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z);
  return mesh;
}

export interface LowPolyCharacter {
  group: THREE_NS.Group;
  /** Swing the arms/legs; `t` is seconds, `amount` scales the stride. */
  animate: (t: number, amount?: number) => void;
}

/**
 * Build one character. Returns the group plus a tiny animation hook so the
 * classroom beat can make people breathe or walk without extra plumbing.
 */
export function buildCharacter(
  THREE: THREE,
  def: CharacterDef | CharacterId | string,
): LowPolyCharacter {
  const character = typeof def === "string" ? characterOf(def) : def;
  const { palette, build, hairStyle } = character;
  const b = BUILD[build];

  const skin = matte(THREE, palette.skin);
  const hair = matte(THREE, palette.hair);
  const top = matte(THREE, palette.top);
  const bottom = matte(THREE, palette.bottom);
  const shoes = matte(THREE, palette.shoes);
  const accent = matte(THREE, palette.accent);
  const eyeMat = matte(THREE, 0x2b2320);

  const group = new THREE.Group();

  // Legs — pivot at the hip so they can swing.
  const legs: THREE_NS.Group[] = [];
  for (const side of [-1, 1]) {
    const hip = new THREE.Group();
    hip.position.set(side * b.limb * 1.15, 0.82, 0);
    hip.add(box(THREE, bottom, b.limb * 1.75, 0.5, b.limb * 1.75, 0, -0.25, 0));
    hip.add(box(THREE, shoes, b.limb * 1.85, 0.1, b.limb * 2.6, 0, -0.54, 0.03));
    group.add(hip);
    legs.push(hip);
  }

  // Torso.
  group.add(box(THREE, top, b.shoulder, 0.5, b.torso, 0, 1.08, 0));
  // Collar detail keeps the silhouette readable at classroom distance.
  group.add(box(THREE, accent, b.shoulder * 0.95, 0.06, b.torso * 1.02, 0, 1.3, 0));

  // Arms.
  const arms: THREE_NS.Group[] = [];
  for (const side of [-1, 1]) {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * (b.shoulder / 2 + b.limb * 0.55), 1.3, 0);
    shoulder.add(box(THREE, top, b.limb * 1.5, 0.32, b.limb * 1.5, 0, -0.16, 0));
    shoulder.add(box(THREE, skin, b.limb * 1.4, 0.22, b.limb * 1.4, 0, -0.42, 0));
    group.add(shoulder);
    arms.push(shoulder);
  }

  // Head.
  const head = new THREE.Group();
  head.position.set(0, 1.36, 0);
  const headW = 0.27;
  head.add(box(THREE, skin, headW, 0.28, 0.26, 0, 0.14, 0));
  head.add(box(THREE, eyeMat, 0.045, 0.045, 0.02, -0.06, 0.16, 0.135));
  head.add(box(THREE, eyeMat, 0.045, 0.045, 0.02, 0.06, 0.16, 0.135));

  // Hair styles: a cap plus one distinguishing block.
  head.add(box(THREE, hair, headW + 0.02, 0.08, 0.28, 0, 0.265, 0));
  if (hairStyle === "bob") {
    head.add(box(THREE, hair, headW + 0.02, 0.2, 0.06, 0, 0.16, -0.12));
    for (const side of [-1, 1]) head.add(box(THREE, hair, 0.05, 0.2, 0.28, side * 0.145, 0.16, 0));
  } else if (hairStyle === "bun") {
    head.add(box(THREE, hair, 0.13, 0.13, 0.13, 0, 0.36, -0.1));
  } else if (hairStyle === "curls") {
    head.add(box(THREE, hair, headW + 0.06, 0.16, 0.32, 0, 0.26, 0));
  } else if (hairStyle === "ponytail") {
    head.add(box(THREE, hair, 0.09, 0.3, 0.09, 0, 0.19, -0.19));
  } else if (hairStyle === "wrap") {
    head.add(box(THREE, accent, headW + 0.04, 0.14, 0.3, 0, 0.28, 0));
  }
  group.add(head);

  const legSwing = (t: number, amount: number) => Math.sin(t * 4) * amount;
  const animate = (t: number, amount = 0) => {
    const swing = legSwing(t, amount);
    legs[0]!.rotation.x = swing;
    legs[1]!.rotation.x = -swing;
    arms[0]!.rotation.x = -swing * 0.8;
    arms[1]!.rotation.x = swing * 0.8;
    // Always-on idle breathing so a still cast never looks frozen.
    head.position.y = 1.36 + Math.sin(t * 1.6) * 0.006;
  };
  animate(0);

  return { group, animate };
}
