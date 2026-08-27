import { TILE_COLORS, type TileKind } from "./tiles";

/**
 * Per-area art themes for the procedural 2D tileset.
 *
 * Every campus area gets its own path masonry, roof covering and foliage
 * silhouette plus a small hue/saturation shift, so the Welcome Plaza, the
 * gardens and the science quarter never look like the same map recoloured.
 * Everything stays 32x32 canvas pixel art — no external tilesets.
 */

export type PathStyle = "flagstone" | "cobble" | "herringbone" | "boardwalk";
export type RoofStyle = "shingle" | "tile" | "thatch" | "slate";
export type FoliageStyle = "round" | "pine" | "broadleaf" | "blossom";

/** Global visual style: bright storybook, or a calmer low-saturation mode. */
export type VisualStyle = "storybook" | "focus";

export interface ZoneTheme {
  path: PathStyle;
  roof: RoofStyle;
  foliage: FoliageStyle;
  /** Hue rotation in degrees applied to every tile colour. */
  hue: number;
  /** Saturation multiplier. */
  sat: number;
  /** Lightness offset (-1..1). */
  light: number;
}

export interface PaintTheme extends ZoneTheme {
  style: VisualStyle;
}

export const DEFAULT_THEME: ZoneTheme = {
  path: "flagstone",
  roof: "shingle",
  foliage: "round",
  hue: 0,
  sat: 1,
  light: 0,
};

/** Hand-tuned per-zone looks; anything unlisted falls back to a stable hash. */
export const ZONE_THEMES: Record<string, Partial<ZoneTheme>> = {
  "welcome-plaza": { path: "flagstone", roof: "tile", foliage: "blossom", hue: 4, sat: 1.05 },
  "central-quad": { path: "cobble", roof: "shingle", foliage: "round", hue: 0, sat: 1 },
  "study-gardens": { path: "boardwalk", roof: "thatch", foliage: "broadleaf", hue: 14, sat: 0.98 },
  "student-commons": { path: "herringbone", roof: "tile", foliage: "round", hue: -8, sat: 1.05 },
  "student-center": { path: "herringbone", roof: "tile", foliage: "blossom", hue: -10, sat: 1.04 },
  "math-tech-hall": { path: "cobble", roof: "slate", foliage: "pine", hue: -18, sat: 0.94 },
  "mathematics-hall": { path: "cobble", roof: "slate", foliage: "pine", hue: -18, sat: 0.94 },
  "science-hall": { path: "flagstone", roof: "slate", foliage: "pine", hue: -24, sat: 0.96 },
  "humanities-hall": { path: "cobble", roof: "shingle", foliage: "broadleaf", hue: 18, sat: 0.98 },
  "arts-center": { path: "herringbone", roof: "tile", foliage: "blossom", hue: 26, sat: 1.08 },
  "university-library": { path: "flagstone", roof: "slate", foliage: "broadleaf", hue: 10, sat: 0.92 },
  administration: { path: "flagstone", roof: "tile", foliage: "round", hue: -4, sat: 0.97 },
  "career-center": { path: "cobble", roof: "slate", foliage: "pine", hue: -14, sat: 0.95 },
  "personal-space": { path: "boardwalk", roof: "thatch", foliage: "blossom", hue: 8, sat: 1.02 },
  "agri-field": { path: "boardwalk", roof: "thatch", foliage: "broadleaf", hue: 20, sat: 1.05 },
};

const PATHS: PathStyle[] = ["flagstone", "cobble", "herringbone", "boardwalk"];
const ROOFS: RoofStyle[] = ["shingle", "tile", "thatch", "slate"];
const FOLIAGE: FoliageStyle[] = ["round", "pine", "broadleaf", "blossom"];

function hash(id: string) {
  let h = 2166136261;
  for (let i = 0; i < id.length; i += 1) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/** Resolve the art theme for a zone id (stable, deterministic). */
export function zoneTheme(zoneId: string): ZoneTheme {
  const h = hash(zoneId);
  const fallback: ZoneTheme = {
    path: PATHS[h % PATHS.length] ?? "flagstone",
    roof: ROOFS[(h >> 3) % ROOFS.length] ?? "shingle",
    foliage: FOLIAGE[(h >> 6) % FOLIAGE.length] ?? "round",
    hue: ((h >> 9) % 33) - 16,
    sat: 0.94 + ((h >> 12) % 16) / 100,
    light: 0,
  };
  return { ...fallback, ...(ZONE_THEMES[zoneId] ?? {}) };
}

/** Compose the painting theme actually handed to the tile renderer. */
export function paintTheme(zoneId: string, style: VisualStyle): PaintTheme {
  return { ...zoneTheme(zoneId), style };
}

/** Short, stable string used to key baked textures per theme. */
export function themeKey(t: PaintTheme) {
  return `${t.style}-${t.path}-${t.roof}-${t.foliage}-${Math.round(t.hue)}-${Math.round(t.sat * 100)}`;
}

/* --------------------------------- colour --------------------------------- */

function rgbToHsl(c: number) {
  const r = ((c >> 16) & 0xff) / 255;
  const g = ((c >> 8) & 0xff) / 255;
  const b = (c & 0xff) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { h: 0, s: 0, l };
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return { h, s, l };
}

function hue2rgb(p: number, q: number, t: number) {
  let x = t;
  if (x < 0) x += 1;
  if (x > 1) x -= 1;
  if (x < 1 / 6) return p + (q - p) * 6 * x;
  if (x < 1 / 2) return q;
  if (x < 2 / 3) return p + (q - p) * (2 / 3 - x) * 6;
  return p;
}

function hslToRgb(h: number, s: number, l: number) {
  if (s === 0) {
    const v = Math.round(l * 255);
    return (v << 16) | (v << 8) | v;
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const to = (t: number) => Math.round(Math.max(0, Math.min(1, hue2rgb(p, q, t))) * 255);
  return (to(h + 1 / 3) << 16) | (to(h) << 8) | to(h - 1 / 3);
}

/** Apply a theme's hue/saturation/lightness shift to a packed RGB colour. */
export function tint(color: number, theme: PaintTheme) {
  const { h, s, l } = rgbToHsl(color);
  const focus = theme.style === "focus";
  const sat = Math.max(0, Math.min(1, s * theme.sat * (focus ? 0.52 : 1)));
  const light = Math.max(
    0,
    Math.min(1, l + theme.light + (focus ? (l > 0.6 ? -0.05 : 0.04) : 0)),
  );
  const hue = (((h + theme.hue / 360) % 1) + 1) % 1;
  return hslToRgb(hue, sat, light);
}

/** Themed base/detail pair for a tile kind. */
export function themedColors(kind: TileKind, theme: PaintTheme) {
  const c = TILE_COLORS[kind];
  return {
    base: tint(c.base, theme),
    detail: tint(c.detail ?? c.base, theme),
  };
}

export const STYLE_LABELS: Record<VisualStyle, string> = {
  storybook: "Style: Storybook",
  focus: "Style: Focus",
};
