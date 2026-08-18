import { create } from "zustand";

/**
 * Light mascot personalization: one base colour plus a single accessory slot.
 * Deliberately NOT a full character creator — the 3D avatar and paper-doll
 * portrait cover the deeper customization.
 *
 * Art note: accessories currently render as simple vector/colour placeholders
 * so the data model and UI can ship before the final mascot art lands. When the
 * real sprites arrive, add an `art` url to each entry and swap the render in
 * `MascotView` — stored ids stay valid.
 */

export interface MascotColor {
  id: string;
  label: string;
  /** CSS colour for the DOM mascot. */
  css: string;
  /** Same colour as a Phaser hex int for the campus sprite. */
  hex: number;
}

export interface MascotAccessory {
  id: string;
  label: string;
  /** Placeholder glyph shown until final art is confirmed. */
  glyph: string;
  /** Accent colour used by the placeholder badge and campus sprite. */
  css: string;
  hex: number;
}

export const MASCOT_COLORS: MascotColor[] = [
  { id: "bordeaux", label: "Bordeaux", css: "#6d2f34", hex: 0x6d2f34 },
  { id: "terracotta", label: "Terracotta", css: "#a8543f", hex: 0xa8543f },
  { id: "ochre", label: "Ochre", css: "#d9a441", hex: 0xd9a441 },
  { id: "sage", label: "Sage", css: "#9fb08a", hex: 0x9fb08a },
  { id: "deep_green", label: "Deep Green", css: "#3f6446", hex: 0x3f6446 },
  { id: "muted_blue", label: "Muted Blue", css: "#5b7793", hex: 0x5b7793 },
  { id: "warm_brown", label: "Warm Brown", css: "#7a5638", hex: 0x7a5638 },
  { id: "linen", label: "Linen", css: "#e6d7bd", hex: 0xe6d7bd },
];

export const MASCOT_ACCESSORIES: MascotAccessory[] = [
  { id: "none", label: "None", glyph: "", css: "#00000000", hex: 0x000000 },
  { id: "cap", label: "Ball cap", glyph: "🧢", css: "#6d2f34", hex: 0x6d2f34 },
  { id: "beret", label: "Beret", glyph: "🎨", css: "#3f6446", hex: 0x3f6446 },
  { id: "grad_cap", label: "Grad cap", glyph: "🎓", css: "#2b1e18", hex: 0x2b1e18 },
  { id: "scarf", label: "Scarf", glyph: "🧣", css: "#a8543f", hex: 0xa8543f },
  { id: "glasses", label: "Glasses", glyph: "🤓", css: "#5b7793", hex: 0x5b7793 },
  { id: "headphones", label: "Headphones", glyph: "🎧", css: "#d9a441", hex: 0xd9a441 },
];

export interface Mascot {
  color: string;
  accessory: string;
}

export const DEFAULT_MASCOT: Mascot = { color: "bordeaux", accessory: "none" };

export function mascotColorOf(id: string | null | undefined): MascotColor {
  return MASCOT_COLORS.find((c) => c.id === id) ?? MASCOT_COLORS[0]!;
}

export function mascotAccessoryOf(id: string | null | undefined): MascotAccessory {
  return MASCOT_ACCESSORIES.find((a) => a.id === id) ?? MASCOT_ACCESSORIES[0]!;
}

/** Coerce stored profile values into a valid mascot selection. */
export function normalizeMascot(color: unknown, accessory: unknown): Mascot {
  return {
    color: mascotColorOf(typeof color === "string" ? color : null).id,
    accessory: mascotAccessoryOf(typeof accessory === "string" ? accessory : null).id,
  };
}

interface MascotState {
  mascot: Mascot;
  setMascot: (m: Mascot) => void;
}

/**
 * Mirror of the persisted selection so non-React code (the Phaser scene) can
 * read the current mascot synchronously. The profile row stays the source of
 * truth; this store is hydrated from it.
 */
export const useMascotStore = create<MascotState>((set) => ({
  mascot: DEFAULT_MASCOT,
  setMascot: (mascot) => set({ mascot }),
}));

/** Current mascot for imperative (non-hook) callers such as the game scene. */
export function currentMascot(): Mascot {
  return useMascotStore.getState().mascot;
}
