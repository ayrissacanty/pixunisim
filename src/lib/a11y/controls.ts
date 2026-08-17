import { create } from "zustand";

/**
 * Mobile control accessibility: optional larger touch layouts and a
 * high-contrast control skin for outdoor / low-vision use.
 */
const SIZE_KEY = "unify:controls-size";
const CONTRAST_KEY = "unify:controls-contrast";
const HAPTICS_KEY = "unify:controls-haptics";

export type ControlSize = "standard" | "large" | "xl";

export const CONTROL_SIZE_LABELS: Record<ControlSize, string> = {
  standard: "Standard",
  large: "Large",
  xl: "Extra large",
};

const ORDER: ControlSize[] = ["standard", "large", "xl"];

/** Pixel metrics for the joystick zone, stick and action button. */
export const CONTROL_METRICS: Record<
  ControlSize,
  { zone: number; max: number; base: number; stick: number; action: number; font: number }
> = {
  standard: { zone: 176, max: 56, base: 112, stick: 56, action: 96, font: 16 },
  large: { zone: 216, max: 72, base: 140, stick: 72, action: 120, font: 19 },
  xl: { zone: 256, max: 88, base: 168, stick: 88, action: 144, font: 22 },
};

function initialSize(): ControlSize {
  if (typeof window === "undefined") return "standard";
  const v = window.localStorage.getItem(SIZE_KEY);
  return v === "large" || v === "xl" ? v : "standard";
}

function initialContrast(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(CONTRAST_KEY) === "on";
}

function initialHaptics(): boolean {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(HAPTICS_KEY) !== "off";
}

interface ControlsState {
  size: ControlSize;
  highContrast: boolean;
  haptics: boolean;
  setSize: (s: ControlSize) => void;
  cycleSize: () => void;
  setHighContrast: (v: boolean) => void;
  toggleHighContrast: () => void;
  setHaptics: (v: boolean) => void;
  toggleHaptics: () => void;
}

export const useControlsStore = create<ControlsState>((set, get) => ({
  size: initialSize(),
  highContrast: initialContrast(),
  haptics: initialHaptics(),
  setSize: (size) => {
    if (typeof window !== "undefined") window.localStorage.setItem(SIZE_KEY, size);
    set({ size });
  },
  cycleSize: () => {
    const next = ORDER[(ORDER.indexOf(get().size) + 1) % ORDER.length]!;
    get().setSize(next);
  },
  setHighContrast: (highContrast) => {
    if (typeof window !== "undefined")
      window.localStorage.setItem(CONTRAST_KEY, highContrast ? "on" : "off");
    set({ highContrast });
  },
  toggleHighContrast: () => get().setHighContrast(!get().highContrast),
  setHaptics: (haptics) => {
    if (typeof window !== "undefined")
      window.localStorage.setItem(HAPTICS_KEY, haptics ? "on" : "off");
    set({ haptics });
  },
  toggleHaptics: () => get().setHaptics(!get().haptics),
}));
