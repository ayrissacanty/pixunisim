/** Hair-swing gating, shared by the 2D sprite path (hall3d) and the 3D characters (dorm/char3d).
 *  Hair should only visibly swing when (a) the hairstyle is loose/flowing and (b) the character is
 *  moving at a run/fast-walk speed — otherwise swing is damped to a small fraction (glitch fix). */
export const LOOSE_HAIR: ReadonlySet<string> = new Set([
  "long", "wavy", "shag", "hime", "halfup", "mullet", "locs", "bob",
]);
export const isLooseHair = (style: string | null | undefined): boolean => !!style && LOOSE_HAIR.has(style);
/** world-units/sec: at or above this a character counts as running / fast-walking (player walks at 4, NPC strolls at ~1.8-3.1) */
export const HAIR_SWING_SPEED = 3.4;
/** swing multiplier when the hair is tied or the character is slow (keeps a hint of life, kills the glitchy swing) */
export const HAIR_SWING_DAMP = 0.3;
/** how much of the full swing applies for this style + speed */
export const hairSwingK = (style: string | null | undefined, speed: number): number =>
  isLooseHair(style) && speed >= HAIR_SWING_SPEED ? 1 : HAIR_SWING_DAMP;
