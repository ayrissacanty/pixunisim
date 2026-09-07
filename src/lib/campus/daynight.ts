import { create } from "zustand";

/**
 * Campus day/night cycle.
 *
 * A single lightweight clock drives the ambient palette, the NPC schedules and
 * the HUD clock chip. Time is expressed as minutes since midnight so schedules
 * read naturally ("lecture at 09:00").
 */

export type DayPhase = "dawn" | "morning" | "midday" | "afternoon" | "dusk" | "night";

export interface AmbientTint {
  /** Overlay colour laid over the world, as 0xRRGGBB. */
  color: number;
  /** Overlay strength, 0..1. */
  alpha: number;
  /** Outdoor sky/background colour used behind the tiles. */
  sky: string;
  label: string;
}

/** Real seconds per in-world minute. A full day lasts eight real minutes. */
export const MINUTES_PER_SECOND = 3;
export const DAY_MINUTES = 24 * 60;

const PHASES: { phase: DayPhase; from: number; tint: AmbientTint }[] = [
  {
    phase: "night",
    from: 0,
    tint: { color: 0x1a1510, alpha: 0.52, sky: "#171a24", label: "Night" },
  },
  {
    phase: "dawn",
    from: 5 * 60,
    tint: { color: 0xc27847, alpha: 0.26, sky: "#6f5f66", label: "Dawn" },
  },
  {
    phase: "morning",
    from: 8 * 60,
    tint: { color: 0xeedcc5, alpha: 0.1, sky: "#7ec850", label: "Morning" },
  },
  {
    phase: "midday",
    from: 11 * 60,
    tint: { color: 0xfff4d6, alpha: 0.04, sky: "#8ed35c", label: "Midday" },
  },
  {
    phase: "afternoon",
    from: 15 * 60,
    tint: { color: 0xd4a373, alpha: 0.14, sky: "#7ec050", label: "Afternoon" },
  },
  {
    phase: "dusk",
    from: 18 * 60,
    tint: { color: 0x3d271d, alpha: 0.34, sky: "#4d4038", label: "Dusk" },
  },
  {
    phase: "night",
    from: 21 * 60,
    tint: { color: 0x1a1510, alpha: 0.52, sky: "#171a24", label: "Night" },
  },
];

function indexFor(minutes: number) {
  let idx = 0;
  for (let i = 0; i < PHASES.length; i += 1) if (minutes >= PHASES[i]!.from) idx = i;
  return idx;
}

export function phaseAt(minutes: number): DayPhase {
  return PHASES[indexFor(minutes)]!.phase;
}

function mixChannel(a: number, b: number, t: number, shift: number) {
  const ca = (a >> shift) & 0xff;
  const cb = (b >> shift) & 0xff;
  return Math.round(ca + (cb - ca) * t) << shift;
}

function mixHex(a: string, b: string, t: number) {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const v = mixChannel(pa, pb, t, 16) | mixChannel(pa, pb, t, 8) | mixChannel(pa, pb, t, 0);
  return `#${v.toString(16).padStart(6, "0")}`;
}

/** Ambient tint for a moment in the day, smoothly blended between phases. */
export function ambientAt(minutes: number): AmbientTint {
  const i = indexFor(minutes);
  const current = PHASES[i]!;
  const next = PHASES[i + 1] ?? { ...PHASES[PHASES.length - 1]!, from: DAY_MINUTES };
  const span = Math.max(1, next.from - current.from);
  const t = Math.min(1, Math.max(0, (minutes - current.from) / span));
  const a = current.tint;
  const b = next.tint;
  return {
    color:
      mixChannel(a.color, b.color, t, 16) |
      mixChannel(a.color, b.color, t, 8) |
      mixChannel(a.color, b.color, t, 0),
    alpha: a.alpha + (b.alpha - a.alpha) * t,
    sky: mixHex(a.sky, b.sky, t),
    label: t < 0.5 ? a.label : b.label,
  };
}

export function clockLabel(minutes: number) {
  const m = ((Math.floor(minutes) % DAY_MINUTES) + DAY_MINUTES) % DAY_MINUTES;
  const h24 = Math.floor(m / 60);
  const h = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h}:${String(m % 60).padStart(2, "0")} ${h24 < 12 ? "AM" : "PM"}`;
}

interface ClockState {
  minutes: number;
  /** When false the clock is frozen — used by tests and the walkthrough. */
  running: boolean;
  advance: (deltaMs: number) => void;
  setMinutes: (minutes: number) => void;
  setRunning: (running: boolean) => void;
}

export const useClockStore = create<ClockState>((set) => ({
  minutes: 8 * 60 + 40,
  running: true,
  advance: (deltaMs) =>
    set((s) =>
      s.running
        ? { minutes: (s.minutes + (deltaMs / 1000) * MINUTES_PER_SECOND) % DAY_MINUTES }
        : s,
    ),
  setMinutes: (minutes) => set({ minutes: ((minutes % DAY_MINUTES) + DAY_MINUTES) % DAY_MINUTES }),
  setRunning: (running) => set({ running }),
}));

export function currentMinutes() {
  return useClockStore.getState().minutes;
}
