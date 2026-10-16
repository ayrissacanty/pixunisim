/** A small solid person: head, hair, torso, arms and legs. Used anywhere a character used to be a flat sprite. */
import * as THREE from "three";

export interface BodyBits { armL: THREE.Group; armR: THREE.Group; legL: THREE.Group; legR: THREE.Group; prev: THREE.Vector3 }

const mat = (c: string) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.62 });

export function makeBody(look: { skin?: string; hair?: string; shirt?: string; pants?: string; shoes?: string; style?: string }, height: number) {
  const H = Math.max(0.8, height);
  const g = new THREE.Group();
  const skin = look.skin || "#e3ad7f", hair = look.hair || "#3a2a30", shirt = look.shirt || "#4F91C7", pants = look.pants || "#2b3a55", shoes = look.shoes || "#2b2b33";
  const add = (geo: THREE.BufferGeometry, color: string, x: number, y: number, z: number, parent: THREE.Object3D) => {
    const m = new THREE.Mesh(geo, mat(color)); m.castShadow = true; m.position.set(x, y, z); parent.add(m); return m;
  };
  const hip = 0.46 * H;
  const legL = new THREE.Group(); legL.position.set(-0.09 * H, hip, 0); g.add(legL);
  const legR = new THREE.Group(); legR.position.set(0.09 * H, hip, 0); g.add(legR);
  const legH = 0.34 * H;
  for (const leg of [legL, legR]) {
    add(new THREE.CapsuleGeometry(0.055 * H, legH, 2, 6), pants, 0, -legH * 0.48, 0, leg);
    add(new THREE.BoxGeometry(0.1 * H, 0.06 * H, 0.18 * H), shoes, 0, -legH * 0.98, 0.03 * H, leg);
  }
  add(new THREE.CapsuleGeometry(0.15 * H, 0.26 * H, 3, 8), shirt, 0, hip + 0.2 * H, 0, g);
  const shoulder = hip + 0.38 * H;
  const armL = new THREE.Group(); armL.position.set(-0.2 * H, shoulder, 0); g.add(armL);
  const armR = new THREE.Group(); armR.position.set(0.2 * H, shoulder, 0); g.add(armR);
  for (const arm of [armL, armR]) add(new THREE.CapsuleGeometry(0.042 * H, 0.26 * H, 2, 6), shirt, 0, -0.16 * H, 0, arm);
  const headY = hip + 0.5 * H;
  add(new THREE.SphereGeometry(0.125 * H, 12, 10), skin, 0, headY, 0, g);
  add(new THREE.SphereGeometry(0.016 * H, 6, 5), "#1c1c1c", -0.04 * H, headY + 0.01 * H, 0.1 * H, g);
  add(new THREE.SphereGeometry(0.016 * H, 6, 5), "#1c1c1c", 0.04 * H, headY + 0.01 * H, 0.1 * H, g);
  if (look.style !== "bald") {
    add(new THREE.SphereGeometry(0.132 * H, 10, 8), hair, 0, headY + 0.06 * H, -0.01 * H, g);
    if (["long", "wavy", "pony", "braids", "pigtails", "bob"].includes(look.style || "")) add(new THREE.BoxGeometry(0.18 * H, 0.2 * H, 0.08 * H), hair, 0, headY - 0.12 * H, -0.06 * H, g);
  }
  g.userData.bits = { armL, armR, legL, legR, prev: new THREE.Vector3() } as BodyBits;
  return g;
}

/** Put the body on its feet at pos, face the way it moved, and swing the limbs. */
export function stepBody(g: THREE.Group, pos: THREE.Vector3, moving: boolean, t: number, seated = false) {
  const b = g.userData.bits as BodyBits; if (!b) return;
  g.position.copy(pos);
  if (!seated && moving) {
    const dx = pos.x - b.prev.x, dz = pos.z - b.prev.z;
    if (dx * dx + dz * dz > 1e-8) g.rotation.y = Math.atan2(dx, dz);
  } else if (seated) g.rotation.y = 0;
  b.prev.copy(pos);
  const swing = seated ? 0.2 : moving ? Math.sin(t * 9) * 0.75 : Math.sin(t * 1.5) * 0.05;
  b.armL.rotation.x = swing; b.armR.rotation.x = -swing;
  b.legL.rotation.x = seated ? -1.4 : -swing; b.legR.rotation.x = seated ? -1.4 : swing;
  if (seated) { g.position.y = pos.y - 0.08; b.armL.rotation.x = -0.4; b.armR.rotation.x = -0.4; }
}
