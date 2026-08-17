import { useControlsStore } from "@/lib/a11y/controls";

/**
 * Subtle touch feedback. Uses the Vibration API where available (Android /
 * Chrome); iOS Safari has no vibrate support, so this silently no-ops there.
 */
export type HapticKind = "tap" | "engage" | "release";

const PATTERNS: Record<HapticKind, number | number[]> = {
  engage: 12,
  release: 6,
  tap: [0, 18],
};

export function haptic(kind: HapticKind) {
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
  if (!useControlsStore.getState().haptics) return;
  try {
    navigator.vibrate(PATTERNS[kind]);
  } catch {
    /* vibration blocked by the browser — feedback is best-effort */
  }
}
