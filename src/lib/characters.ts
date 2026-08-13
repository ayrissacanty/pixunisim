import man00Model from "@/assets/characters/MAN_00.fbx.asset.json";
import man00Tex from "@/assets/characters/MAN_00.png.asset.json";
import man01Model from "@/assets/characters/MAN_01.fbx.asset.json";
import man01Tex from "@/assets/characters/MAN_01.png.asset.json";
import woman00Model from "@/assets/characters/WOMAN_00.fbx.asset.json";
import woman00Tex from "@/assets/characters/WOMAN_00.png.asset.json";
import woman01Model from "@/assets/characters/WOMAN_01.fbx.asset.json";
import woman01Tex from "@/assets/characters/WOMAN_01.png.asset.json";

export type CharacterId = "MAN_00" | "MAN_01" | "WOMAN_00" | "WOMAN_01";

export interface CharacterDef {
  id: CharacterId;
  name: string;
  blurb: string;
  model: string;
  texture: string;
}

export const CHARACTERS: Record<CharacterId, CharacterDef> = {
  WOMAN_00: {
    id: "WOMAN_00",
    name: "Wren",
    blurb: "Steady note-taker, front row by choice.",
    model: woman00Model.url,
    texture: woman00Tex.url,
  },
  WOMAN_01: {
    id: "WOMAN_01",
    name: "Iris",
    blurb: "Asks the question everyone was thinking.",
    model: woman01Model.url,
    texture: woman01Tex.url,
  },
  MAN_00: {
    id: "MAN_00",
    name: "Theo",
    blurb: "Sketches every diagram twice.",
    model: man00Model.url,
    texture: man00Tex.url,
  },
  MAN_01: {
    id: "MAN_01",
    name: "Cass",
    blurb: "First to the library, last to leave.",
    model: man01Model.url,
    texture: man01Tex.url,
  },
};

export const CHARACTER_IDS = Object.keys(CHARACTERS) as CharacterId[];

export const DEFAULT_AVATAR: CharacterId = "WOMAN_00";

/** Alley, the faculty character, always uses the same model. */
export const TEACHER_CHARACTER: CharacterId = "WOMAN_01";

export function characterOf(id: string | null | undefined): CharacterDef {
  return CHARACTERS[(id ?? DEFAULT_AVATAR) as CharacterId] ?? CHARACTERS[DEFAULT_AVATAR];
}

/** Deterministic classmate casting so a room looks the same on every visit. */
export function classmatesFor(seed: string, count: number, exclude?: CharacterId): CharacterId[] {
  const pool = CHARACTER_IDS.filter((id) => id !== exclude);
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return Array.from({ length: count }, (_, i) => pool[(h + i * 7) % pool.length]!);
}
