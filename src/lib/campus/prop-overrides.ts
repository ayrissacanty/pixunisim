import { TILE } from "./tiles";

/**
 * Saved prop placements from the debug prop editor.
 *
 * The procedural decor generator is deterministic; the editor lets a
 * designer override it per zone. Overrides live in localStorage (the editor
 * is a debug tool) and can be exported as JSON to be baked into the world
 * definition later.
 */

export interface PropOverride {
  /** Original-art prop frame id (tree, bench, sign, …). */
  frame: string;
  /** Tile footprint the prop is snapped to. */
  tx: number;
  ty: number;
  flipX: boolean;
  /** Visual rotation in degrees (iso props are usually only flipped). */
  rotation: number;
  scale: number;
}

const keyFor = (zoneId: string) => `unify.prop-overrides.${zoneId}`;

function read(zoneId: string): PropOverride[] | null {
  try {
    const raw = localStorage.getItem(keyFor(zoneId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PropOverride[];
    if (!Array.isArray(parsed)) return null;
    return parsed.filter(
      (p) => typeof p.frame === "string" && Number.isFinite(p.tx) && Number.isFinite(p.ty),
    );
  } catch {
    return null;
  }
}

/** Overrides for a zone, or null when the procedural layout stands. */
export function propOverridesFor(zoneId: string): PropOverride[] | null {
  if (typeof localStorage === "undefined") return null;
  return read(zoneId);
}

export function savePropOverrides(zoneId: string, props: PropOverride[]) {
  try {
    localStorage.setItem(keyFor(zoneId), JSON.stringify(props));
  } catch {
    /* storage full / unavailable — editor still exports JSON */
  }
}

export function clearPropOverrides(zoneId: string) {
  try {
    localStorage.removeItem(keyFor(zoneId));
  } catch {
    /* noop */
  }
}

/** Export payload shared by the in-app toolbar and tests. */
export function exportPropOverrides(zoneId: string, props: PropOverride[]) {
  return JSON.stringify({ zone: zoneId, exportedAt: new Date().toISOString(), props }, null, 2);
}

/** Convert an override into the placement shape the renderer consumes. */
export function overridePlacement(p: PropOverride) {
  return {
    frame: p.frame,
    px: p.tx * TILE + TILE / 2,
    py: (p.ty + 1) * TILE,
    scale: p.scale,
    solid: true,
    flipX: p.flipX,
    rotation: p.rotation,
  };
}
