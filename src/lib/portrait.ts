import skinVanilla from "@/assets/paperdoll/skin_vanilla.png.asset.json";
import skinCaramel from "@/assets/paperdoll/skin_caramel.png.asset.json";
import skinChocolate from "@/assets/paperdoll/skin_chocolate.png.asset.json";
import eyesBlue from "@/assets/paperdoll/eyes_blue.png.asset.json";
import eyesBrown from "@/assets/paperdoll/eyes_brown.png.asset.json";
import eyesGreen from "@/assets/paperdoll/eyes_green.png.asset.json";
import eyesGrey from "@/assets/paperdoll/eyes_grey.png.asset.json";
import hairHoney from "@/assets/paperdoll/hair_honey.png.asset.json";
import hairMousey from "@/assets/paperdoll/hair_mousey.png.asset.json";
import hairMousse from "@/assets/paperdoll/hair_mousse.png.asset.json";
import clothesLollipop from "@/assets/paperdoll/clothes_lollipop.png.asset.json";
import clothesSunnySea from "@/assets/paperdoll/clothes_sunny_sea.png.asset.json";

export interface PortraitOption {
  id: string;
  label: string;
  url: string;
}

export const PORTRAIT_LAYERS = {
  skin: [
    { id: "vanilla", label: "Vanilla", url: skinVanilla.url },
    { id: "caramel", label: "Caramel", url: skinCaramel.url },
    { id: "chocolate", label: "Chocolate", url: skinChocolate.url },
  ],
  eyes: [
    { id: "brown", label: "Brown", url: eyesBrown.url },
    { id: "blue", label: "Blue", url: eyesBlue.url },
    { id: "green", label: "Green", url: eyesGreen.url },
    { id: "grey", label: "Grey", url: eyesGrey.url },
  ],
  hair: [
    { id: "honey", label: "Honey", url: hairHoney.url },
    { id: "mousey", label: "Mousey", url: hairMousey.url },
    { id: "mousse", label: "Mousse", url: hairMousse.url },
  ],
  clothes: [
    { id: "lollipop", label: "Lollipop", url: clothesLollipop.url },
    { id: "sunny_sea", label: "Sunny Sea", url: clothesSunnySea.url },
  ],
} satisfies Record<string, PortraitOption[]>;

export type PortraitLayer = keyof typeof PORTRAIT_LAYERS;
export const PORTRAIT_LAYER_ORDER: PortraitLayer[] = ["skin", "clothes", "eyes", "hair"];

export type Portrait = Record<PortraitLayer, string>;

export const DEFAULT_PORTRAIT: Portrait = {
  skin: "vanilla",
  eyes: "brown",
  hair: "honey",
  clothes: "lollipop",
};

/** Resolve a stored portrait selection to ordered CDN layer urls. */
export function portraitUrls(portrait: Portrait): string[] {
  return PORTRAIT_LAYER_ORDER.map((layer) => {
    const options = PORTRAIT_LAYERS[layer] as PortraitOption[];
    const chosen = options.find((o) => o.id === portrait[layer]) ?? options[0]!;
    return chosen.url;
  });
}

/** Coerce whatever is stored in the profile JSON into a valid portrait. */
export function normalizePortrait(value: unknown): Portrait {
  const raw = (value ?? {}) as Partial<Record<PortraitLayer, unknown>>;
  const out = { ...DEFAULT_PORTRAIT };
  for (const layer of PORTRAIT_LAYER_ORDER) {
    const id = raw[layer];
    const options = PORTRAIT_LAYERS[layer] as PortraitOption[];
    if (typeof id === "string" && options.some((o) => o.id === id)) out[layer] = id;
  }
  return out;
}
