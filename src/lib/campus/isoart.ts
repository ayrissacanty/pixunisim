import grassAsset from "@/assets/unify/ground-grass.jpg.asset.json";
import pathAsset from "@/assets/unify/ground-path.jpg.asset.json";
import stoneAsset from "@/assets/unify/ground-stone.jpg.asset.json";
import waterAsset from "@/assets/unify/ground-water.jpg.asset.json";
import benchAsset from "@/assets/unify/prop-bench.png.asset.json";
import flowerAsset from "@/assets/unify/prop-flower.png.asset.json";
import fountainAsset from "@/assets/unify/prop-fountain.png.asset.json";
import hedgeAsset from "@/assets/unify/prop-hedge.png.asset.json";
import lampAsset from "@/assets/unify/prop-lamp.png.asset.json";
import signAsset from "@/assets/unify/prop-sign.png.asset.json";
import treeAsset from "@/assets/unify/prop-tree.png.asset.json";
import type { TileKind } from "./tiles";

/** Original UNIFY art used by the isometric renderer. */
export const ORIGINAL_ART = {
  "unify-ground-grass": grassAsset.url,
  "unify-ground-path": pathAsset.url,
  "unify-ground-stone": stoneAsset.url,
  "unify-ground-water": waterAsset.url,
  "unify-prop-bench": benchAsset.url,
  "unify-prop-flower": flowerAsset.url,
  "unify-prop-fountain": fountainAsset.url,
  "unify-prop-hedge": hedgeAsset.url,
  "unify-prop-lamp": lampAsset.url,
  "unify-prop-sign": signAsset.url,
  "unify-prop-tree": treeAsset.url,
} as const;

export function originalGroundKey(kind: TileKind): string | undefined {
  switch (kind) {
    case "grass":
    case "grassAlt":
    case "flower":
      return "unify-ground-grass";
    case "path":
    case "brick":
      return "unify-ground-path";
    case "stone":
      return "unify-ground-stone";
    case "water":
      return "unify-ground-water";
    default:
      return undefined;
  }
}

const PROP_KEYS: Record<string, string> = {
  bench: "unify-prop-bench",
  flower: "unify-prop-flower",
  fountain: "unify-prop-fountain",
  hedge: "unify-prop-hedge",
  lamp: "unify-prop-lamp",
  sign: "unify-prop-sign",
  tree: "unify-prop-tree",
};

export function originalPropKey(frame: string): string | undefined {
  return PROP_KEYS[frame];
}
