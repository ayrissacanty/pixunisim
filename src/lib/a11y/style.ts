import { create } from "zustand";
import type { VisualStyle } from "@/lib/campus/themes";

/**
 * Campus visual style toggle.
 *
 * storybook — the default bright, saturated palette.
 * focus     — a calmer, desaturated world with higher-contrast HUD chrome
 *             for students who find the bright map busy.
 *
 * The setting drives BOTH the Phaser tile painting (via `paintTheme`) and
 * the document-level `data-campus-style` attribute the HUD styles react to.
 */
const STORAGE_KEY = "unify:visual-style";

function initialStyle(): VisualStyle {
  if (typeof window === "undefined") return "storybook";
  return window.localStorage.getItem(STORAGE_KEY) === "focus" ? "focus" : "storybook";
}

function applyToDocument(style: VisualStyle) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset["campusStyle"] = style;
}

interface StyleState {
  style: VisualStyle;
  setStyle: (s: VisualStyle) => void;
  toggle: () => void;
}

export const useStyleStore = create<StyleState>((set, get) => ({
  style: initialStyle(),
  setStyle: (style) => {
    if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, style);
    applyToDocument(style);
    set({ style });
  },
  toggle: () => get().setStyle(get().style === "storybook" ? "focus" : "storybook"),
}));

/** Read the current style outside React (Phaser scene). */
export const visualStyle = () => useStyleStore.getState().style;

if (typeof document !== "undefined") applyToDocument(initialStyle());
