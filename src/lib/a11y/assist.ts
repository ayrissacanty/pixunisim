import { create } from "zustand";

/**
 * Accessibility "Easy Navigation" assist.
 *
 * When enabled the player is less likely to bump into scenery by accident:
 * the feet collision box is slimmer (so chair edges, rug corners and doorway
 * jambs no longer snag), doors trigger from further away, and the interaction
 * radius around objects and NPCs is widened.
 */
const STORAGE_KEY = "unify:assist";

function initialAssist(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(STORAGE_KEY) === "on";
}

interface AssistState {
  assist: boolean;
  setAssist: (v: boolean) => void;
  toggle: () => void;
}

export const useAssistStore = create<AssistState>((set, get) => ({
  assist: initialAssist(),
  setAssist: (assist) => {
    if (typeof window !== "undefined")
      window.localStorage.setItem(STORAGE_KEY, assist ? "on" : "off");
    set({ assist });
  },
  toggle: () => get().setAssist(!get().assist),
}));

/** Read the current setting outside React (Phaser scene / collision mask). */
export const assistEnabled = () => useAssistStore.getState().assist;

/** Feet collision box used by the walkability test. */
export function collisionBox(assist = assistEnabled()) {
  return assist
    ? { halfW: 4, top: 7, bottom: 11 }
    : { halfW: 7, top: 4, bottom: 12 };
}

/** Tile radius within which an object / NPC can be interacted with. */
export function interactRadius(kind: "object" | "npc", assist = assistEnabled()) {
  const base = kind === "npc" ? 1.8 : 1.6;
  return assist ? base + 0.7 : base;
}

/** Tile distance at which walking into a doorway triggers the transition. */
export function doorTriggerRadius(assist = assistEnabled()) {
  return assist ? 0.95 : 0.62;
}

export const ASSIST_LABEL = (assist: boolean) =>
  assist ? "Easy Navigation: On" : "Easy Navigation: Off";
