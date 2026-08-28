/**
 * Third-party asset attributions shown on /credits.
 *
 * Penzilla Design's license REQUIRES the exact credit line below to be
 * visible in the app — do not reword or remove it while any Penzilla pack
 * art is in use.
 */

export interface AssetCredit {
  creator: string;
  packs: string[];
  /** Exact, legally-required credit line when the license mandates one. */
  requiredLine?: string;
  license: string;
  status: "licensed" | "free-commercial" | "unverified" | "original";
  usedFor: string;
}

export const ASSET_CREDITS: AssetCredit[] = [
  {
    creator: "Penzilla Design",
    packs: ["Isometric RPG Village", "Isometric City Builder"],
    requiredLine: "Graphics created by Penzilla Design.",
    license: "Paid license — visible attribution required by the creator.",
    status: "licensed",
    usedFor: "Isometric campus buildings, including the school and college sprites.",
  },
  {
    creator: "pixel_Salvaje",
    packs: ["Isometric Interiors (TinyHouse)"],
    license: "Commercial use confirmed by the creator.",
    status: "licensed",
    usedFor:
      "Interior props for classrooms, the computer lab, the library and the principal's office.",
  },
  {
    creator: "AlloyTrinity",
    packs: ["Isometric Buildings"],
    license: "Free pack — the creator requests a light credit.",
    status: "free-commercial",
    usedFor: "Supplementary isometric building shells around the campus.",
  },
  {
    creator: "trislin",
    packs: ["Pixel Lands — Village demo"],
    license: "Confirmed free for commercial use.",
    status: "free-commercial",
    usedFor: "Village scatter reference and small outdoor props.",
  },
  {
    creator: "Denzi",
    packs: ["16x16 Modern Mixed", "16x16 Walls"],
    license: "Pack sheets included with the project assets.",
    status: "licensed",
    usedFor: "Interior wall and floor detail tiles.",
  },
  {
    creator: "Punyworld Overworld",
    packs: ["Overworld tileset (1,755 tiles)"],
    license:
      "Source and license unverified — excluded from the production renderer until the license is confirmed.",
    status: "unverified",
    usedFor: "Not used in the shipped campus; retained only as reference.",
  },
  {
    creator: "Unify University",
    packs: ["UNIFY original ground & prop paintings"],
    license: "Created in-house for Unify University. All rights reserved.",
    status: "original",
    usedFor:
      "Hand-painted grass, path, stone and water grounds plus trees, benches, lamps, signs, fountains and flower beds.",
  },
];
