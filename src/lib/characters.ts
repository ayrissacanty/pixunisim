export type CharacterId = "MAN_00" | "MAN_01" | "WOMAN_00" | "WOMAN_01" | "NB_00" | "NB_01";

export type HairStyle = "bob" | "bun" | "crop" | "curls" | "ponytail" | "wrap";
export type Build = "slim" | "regular" | "sturdy";

/**
 * Low-poly cast, authored to sit inside the Styloo classroom pack: flat matte
 * colours, chunky proportions, no textures. Every character is built from
 * boxes at runtime (see `src/lib/lowpoly.ts`) so the whole campus shares one
 * consistent art direction and nothing has to be downloaded.
 */
export interface CharacterDef {
  id: CharacterId;
  name: string;
  blurb: string;
  build: Build;
  hairStyle: HairStyle;
  palette: {
    skin: number;
    hair: number;
    top: number;
    bottom: number;
    shoes: number;
    accent: number;
  };
}

export const CHARACTERS: Record<CharacterId, CharacterDef> = {
  WOMAN_00: {
    id: "WOMAN_00",
    name: "Wren",
    blurb: "Steady note-taker, front row by choice.",
    build: "slim",
    hairStyle: "bob",
    palette: {
      skin: 0xe8b892,
      hair: 0x4a3324,
      top: 0xd9704f,
      bottom: 0x40566b,
      shoes: 0x2f2a26,
      accent: 0xf2d7a0,
    },
  },
  WOMAN_01: {
    id: "WOMAN_01",
    name: "Iris",
    blurb: "Asks the question everyone was thinking.",
    build: "regular",
    hairStyle: "bun",
    palette: {
      skin: 0x8a563a,
      hair: 0x241a14,
      top: 0x5f8a6a,
      bottom: 0x3b3f4a,
      shoes: 0x2f2a26,
      accent: 0xe6c463,
    },
  },
  MAN_00: {
    id: "MAN_00",
    name: "Theo",
    blurb: "Sketches every diagram twice.",
    build: "regular",
    hairStyle: "crop",
    palette: {
      skin: 0xc78d5d,
      hair: 0x35251a,
      top: 0x4c6d8c,
      bottom: 0x6b5136,
      shoes: 0x33302c,
      accent: 0xd9d3c4,
    },
  },
  MAN_01: {
    id: "MAN_01",
    name: "Cass",
    blurb: "First to the library, last to leave.",
    build: "sturdy",
    hairStyle: "curls",
    palette: {
      skin: 0x6f452c,
      hair: 0x1d1512,
      top: 0xb2543f,
      bottom: 0x35404d,
      shoes: 0x2b2724,
      accent: 0xefe2c6,
    },
  },
  NB_00: {
    id: "NB_00",
    name: "Juno",
    blurb: "Runs the study group whiteboard.",
    build: "slim",
    hairStyle: "ponytail",
    palette: {
      skin: 0xf0cfae,
      hair: 0xc99a4c,
      top: 0x7b6aa3,
      bottom: 0x2f3a46,
      shoes: 0x33302c,
      accent: 0xf5efe0,
    },
  },
  NB_01: {
    id: "NB_01",
    name: "Alma",
    blurb: "Keeps a spare pencil for everyone.",
    build: "sturdy",
    hairStyle: "wrap",
    palette: {
      skin: 0x9c6844,
      hair: 0x2a1e18,
      top: 0xd6a13f,
      bottom: 0x4a4438,
      shoes: 0x2f2a26,
      accent: 0xb2543f,
    },
  },
};

export const CHARACTER_IDS = Object.keys(CHARACTERS) as CharacterId[];

export const DEFAULT_AVATAR: CharacterId = "WOMAN_00";

/** Alley, the faculty character, always uses the same look. */
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
