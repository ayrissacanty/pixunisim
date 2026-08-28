import { create } from "zustand";
import {
  BOTTOM_COLORS,
  HAIR_COLORS,
  HAIR_STYLES,
  OUTFIT_COLORS,
  SHOE_COLORS,
  SKIN_TONES,
  type CharacterLook,
  type HairStyle,
} from "./charart";

/**
 * Full appearance customization for the student's own campus character.
 *
 * Stored as small indices / ids so the profile row stays tiny, and mirrored
 * into a zustand store so the Phaser scene can read the current selection
 * synchronously (same pattern as the mascot).
 */
export interface Appearance {
  skin: number;
  hair: number;
  hairStyle: HairStyle;
  shirt: number;
  pants: number;
  shoes: number;
  accent: number;
}

export const APPEARANCE_SWATCHES = {
  skin: SKIN_TONES,
  hair: HAIR_COLORS,
  shirt: OUTFIT_COLORS,
  pants: BOTTOM_COLORS,
  shoes: SHOE_COLORS,
  accent: OUTFIT_COLORS,
} as const;

export const HAIR_STYLE_LABELS: Record<HairStyle, string> = {
  short: "Short",
  long: "Long",
  bun: "Bun",
  curly: "Curls",
  braids: "Braids",
  cap: "Cap",
};

export const APPEARANCE_STYLES = HAIR_STYLES;

export const DEFAULT_APPEARANCE: Appearance = {
  skin: 0,
  hair: 1,
  hairStyle: "short",
  shirt: 0,
  pants: 0,
  shoes: 0,
  accent: 1,
};

function clampIndex(value: unknown, length: number, fallback: number) {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value < length
    ? value
    : fallback;
}

/** Coerce whatever is stored in the profile JSON into a valid appearance. */
export function normalizeAppearance(value: unknown): Appearance {
  const raw = (value ?? {}) as Partial<Record<keyof Appearance, unknown>>;
  return {
    skin: clampIndex(raw.skin, SKIN_TONES.length, DEFAULT_APPEARANCE.skin),
    hair: clampIndex(raw.hair, HAIR_COLORS.length, DEFAULT_APPEARANCE.hair),
    hairStyle: HAIR_STYLES.includes(raw.hairStyle as HairStyle)
      ? (raw.hairStyle as HairStyle)
      : DEFAULT_APPEARANCE.hairStyle,
    shirt: clampIndex(raw.shirt, OUTFIT_COLORS.length, DEFAULT_APPEARANCE.shirt),
    pants: clampIndex(raw.pants, BOTTOM_COLORS.length, DEFAULT_APPEARANCE.pants),
    shoes: clampIndex(raw.shoes, SHOE_COLORS.length, DEFAULT_APPEARANCE.shoes),
    accent: clampIndex(raw.accent, OUTFIT_COLORS.length, DEFAULT_APPEARANCE.accent),
  };
}

/** Turn the stored selection into the palette the sprite painter needs. */
export function lookFromAppearance(a: Appearance): CharacterLook {
  return {
    skin: SKIN_TONES[a.skin]!,
    hair: HAIR_COLORS[a.hair]!,
    hairStyle: a.hairStyle,
    shirt: OUTFIT_COLORS[a.shirt]!,
    pants: BOTTOM_COLORS[a.pants]!,
    shoes: SHOE_COLORS[a.shoes]!,
    accent: OUTFIT_COLORS[a.accent]!,
  };
}

/** Stable texture key for a selection, so Phaser reuses generated sheets. */
export function appearanceKey(a: Appearance) {
  return `player-${a.skin}-${a.hair}-${a.hairStyle}-${a.shirt}-${a.pants}-${a.shoes}-${a.accent}`;
}

interface AppearanceState {
  appearance: Appearance;
  setAppearance: (a: Appearance) => void;
}

export const useAppearanceStore = create<AppearanceState>((set) => ({
  appearance: DEFAULT_APPEARANCE,
  setAppearance: (appearance) => set({ appearance }),
}));

/** Current appearance for imperative (non-hook) callers such as the scene. */
export function currentAppearance(): Appearance {
  return useAppearanceStore.getState().appearance;
}
