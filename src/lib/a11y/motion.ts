import { create } from "zustand";

/**
 * Accessibility motion setting shared by the Phaser camera, the character
 * animation loop and the layer transition overlays.
 *
 * full    — the default cinematic camera lerp, walk bob and door fades.
 * reduced — slower/softer camera easing, gentler bob, shorter fades.
 * off     — camera snaps, no bob, transitions are instant flat cuts.
 */
export type MotionSetting = "full" | "reduced" | "off";

const STORAGE_KEY = "unify:motion";

function systemPrefersReduced() {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function initialSetting(): MotionSetting {
  if (typeof window === "undefined") return "full";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "full" || stored === "reduced" || stored === "off") return stored;
  return systemPrefersReduced() ? "reduced" : "full";
}

interface MotionState {
  setting: MotionSetting;
  setSetting: (s: MotionSetting) => void;
  cycle: () => void;
}

const ORDER: MotionSetting[] = ["full", "reduced", "off"];

export const useMotionStore = create<MotionState>((set, get) => ({
  setting: initialSetting(),
  setSetting: (setting) => {
    if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, setting);
    set({ setting });
  },
  cycle: () => {
    const next = ORDER[(ORDER.indexOf(get().setting) + 1) % ORDER.length]!;
    get().setSetting(next);
  },
}));

/** Read the current setting outside React (Phaser scene / timers). */
export const motionSetting = () => useMotionStore.getState().setting;

/** Camera follow lerp: lower is slower/smoother, 1 snaps to the player. */
export function cameraLerp(setting: MotionSetting = motionSetting()) {
  return setting === "off" ? 1 : setting === "reduced" ? 0.06 : 0.14;
}

/** Multiplier applied to walk-cycle bob/limb swing amplitude. */
export function bobScale(setting: MotionSetting = motionSetting()) {
  return setting === "off" ? 0 : setting === "reduced" ? 0.35 : 1;
}

/** Scales any transition duration (ms) used for door/fade/wipe beats. */
export function motionDuration(ms: number, setting: MotionSetting = motionSetting()) {
  if (setting === "off") return 0;
  if (setting === "reduced") return Math.round(ms * 0.5);
  return ms;
}

/** Whether animated transition overlays should play their keyframes. */
export function transitionsAnimated(setting: MotionSetting = motionSetting()) {
  return setting === "full";
}

export const MOTION_LABELS: Record<MotionSetting, string> = {
  full: "Motion: Full",
  reduced: "Motion: Reduced",
  off: "Motion: Off",
};
