import {
  DEFAULT_PORTRAIT,
  normalizePortrait,
  type Portrait,
  type PortraitLayer,
  PORTRAIT_LAYERS,
} from "@/lib/portrait";

/**
 * NPC casting: every campus character gets a paper-doll portrait built from the
 * RenPy customization pack plus a matching in-world sprite palette, so the
 * Phaser sprite and the dialogue portrait always read as the same person.
 */

export interface NpcPalette {
  /** Clothing / body colour of the sprite. */
  cloth: number;
  hair: number;
  skin: number;
}

/** Sprite colours matched to the paper-doll layer artwork. */
const SKIN_COLORS: Record<string, number> = {
  vanilla: 0xf0cfae,
  caramel: 0xc78d5d,
  chocolate: 0x8a563a,
};

const HAIR_COLORS: Record<string, number> = {
  honey: 0xc99a4c,
  mousey: 0x8a6a4a,
  mousse: 0x4a3324,
};

const CLOTH_COLORS: Record<string, number> = {
  lollipop: 0xa8543f,
  sunny_sea: 0x5d7f96,
};

/** Hand-cast principals so recurring faces stay stable between sessions. */
const CAST: Record<string, Portrait> = {
  "guide-rosa": { skin: "caramel", eyes: "brown", hair: "mousse", clothes: "lollipop" },
  "student-june": { skin: "chocolate", eyes: "brown", hair: "mousse", clothes: "sunny_sea" },
  "librarian-teodora": { skin: "vanilla", eyes: "grey", hair: "mousey", clothes: "sunny_sea" },
  "student-kofi": { skin: "chocolate", eyes: "brown", hair: "mousse", clothes: "lollipop" },
  "student-lila": { skin: "vanilla", eyes: "green", hair: "honey", clothes: "lollipop" },
  "career-tam": { skin: "caramel", eyes: "green", hair: "mousey", clothes: "sunny_sea" },
  "admissions-june": { skin: "caramel", eyes: "brown", hair: "mousse", clothes: "sunny_sea" },
  "registrar-owen": { skin: "vanilla", eyes: "blue", hair: "mousey", clothes: "lollipop" },
  "advisor-nadia": { skin: "chocolate", eyes: "brown", hair: "mousse", clothes: "sunny_sea" },
  "family-services": { skin: "chocolate", eyes: "brown", hair: "honey", clothes: "lollipop" },
  // Added cast (see world.ts building rosters).
  "library-aide-samir": { skin: "caramel", eyes: "brown", hair: "mousse", clothes: "sunny_sea" },
  "archivist-elke": { skin: "vanilla", eyes: "grey", hair: "mousey", clothes: "sunny_sea" },
  "barista-noor": { skin: "caramel", eyes: "brown", hair: "mousse", clothes: "lollipop" },
  "peer-mentor-drew": { skin: "vanilla", eyes: "blue", hair: "honey", clothes: "sunny_sea" },
  "career-coach-ines": { skin: "caramel", eyes: "green", hair: "mousse", clothes: "lollipop" },
  "employer-rep-hal": { skin: "vanilla", eyes: "grey", hair: "mousey", clothes: "sunny_sea" },
  "front-desk-marta": { skin: "caramel", eyes: "brown", hair: "honey", clothes: "lollipop" },
  "math-tech-hall-aide": { skin: "chocolate", eyes: "brown", hair: "mousse", clothes: "sunny_sea" },
  "science-hall-aide": { skin: "vanilla", eyes: "green", hair: "mousey", clothes: "lollipop" },
  "humanities-hall-aide": { skin: "caramel", eyes: "brown", hair: "honey", clothes: "lollipop" },
  "arts-center-aide": { skin: "caramel", eyes: "grey", hair: "mousse", clothes: "sunny_sea" },
};

function hash(value: string) {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Deterministic portrait for any NPC without a hand-authored casting entry. */
function derivePortrait(npcId: string): Portrait {
  const seed = hash(npcId);
  const pick = (layer: PortraitLayer, salt: number) => {
    const options = PORTRAIT_LAYERS[layer];
    return options[(seed >>> salt) % options.length]!.id;
  };
  return normalizePortrait({
    skin: pick("skin", 2),
    eyes: pick("eyes", 7),
    hair: pick("hair", 13),
    clothes: pick("clothes", 19),
  });
}

/** Portrait shown in the dialogue box for a given NPC. */
export function npcPortrait(npcId: string): Portrait {
  const cast = CAST[npcId];
  return cast ? normalizePortrait(cast) : derivePortrait(npcId);
}

/** Sprite colours for the Phaser character, derived from the same portrait. */
export function npcPalette(npcId: string, role = ""): NpcPalette {
  const portrait = npcPortrait(npcId);
  const staff = !role.toLowerCase().includes("student");
  return {
    cloth: staff ? 0x6d2f34 : (CLOTH_COLORS[portrait.clothes] ?? CLOTH_COLORS["lollipop"]!),
    hair: HAIR_COLORS[portrait.hair] ?? HAIR_COLORS["mousse"]!,
    skin: SKIN_COLORS[portrait.skin] ?? SKIN_COLORS["vanilla"]!,
  };
}

export const PLAYER_FALLBACK_PORTRAIT = DEFAULT_PORTRAIT;
