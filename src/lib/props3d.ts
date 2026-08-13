import palette from "@/assets/props/Color_Palette.png.asset.json";
import Desk from "@/assets/props/Desk_01_01.fbx.asset.json";
import Chair from "@/assets/props/Chair_01_01.fbx.asset.json";
import OfficeChair from "@/assets/props/Office_Chair_01_01.fbx.asset.json";
import MeetingTable from "@/assets/props/Meeting_Table_01.fbx.asset.json";
import Shelf from "@/assets/props/Shelf_01_01.fbx.asset.json";
import WallShelf from "@/assets/props/Wall_Shelf_01_01.fbx.asset.json";
import Book from "@/assets/props/Book_01_01.fbx.asset.json";
import Laptop from "@/assets/props/Laptop_01.fbx.asset.json";
import Light from "@/assets/props/Light_01.fbx.asset.json";
import Painting from "@/assets/props/Painting_01.fbx.asset.json";
import Window from "@/assets/props/Window_01.fbx.asset.json";
import Carpet from "@/assets/props/Carpet_01_01.fbx.asset.json";
import Bed from "@/assets/props/Bed_01_01.fbx.asset.json";
import Closet from "@/assets/props/Closet_01_01.fbx.asset.json";
import Table from "@/assets/props/Table_02_01.fbx.asset.json";
import Sofa from "@/assets/props/Sofa_01_01.fbx.asset.json";
import Tv from "@/assets/props/Smart_TV.fbx.asset.json";
import TrashCan from "@/assets/props/Trash_Can_01.fbx.asset.json";
import Mug from "@/assets/props/Mug_01.fbx.asset.json";

/** Shared low-poly palette texture every prop samples from. */
export const PROP_PALETTE_URL = palette.url;

export const PROP_MODELS = {
  desk: Desk.url,
  chair: Chair.url,
  officeChair: OfficeChair.url,
  meetingTable: MeetingTable.url,
  shelf: Shelf.url,
  wallShelf: WallShelf.url,
  book: Book.url,
  laptop: Laptop.url,
  light: Light.url,
  painting: Painting.url,
  window: Window.url,
  carpet: Carpet.url,
  bed: Bed.url,
  closet: Closet.url,
  table: Table.url,
  sofa: Sofa.url,
  tv: Tv.url,
  trashCan: TrashCan.url,
  mug: Mug.url,
} as const;

export type PropId = keyof typeof PROP_MODELS;

export interface PropPlacement {
  model: PropId;
  x?: number;
  z?: number;
  y?: number;
  rotation?: number;
  /** Multiplier on the metre-normalised size. */
  scale?: number;
}

/** Layer 3/4 classroom: teacher desk at the board, student desks in rows. */
export const CLASSROOM_PROPS: PropPlacement[] = [
  { model: "desk", x: 0, z: -4.1, rotation: Math.PI, scale: 1.1 },
  { model: "officeChair", x: 1.1, z: -4.6, rotation: Math.PI },
  { model: "laptop", x: -0.3, z: -4.1, rotation: Math.PI, scale: 0.9 },
  { model: "mug", x: 0.7, z: -4.0, scale: 0.85 },
  { model: "shelf", x: -3.6, z: -3.6, rotation: Math.PI / 2 },
  { model: "wallShelf", x: 3.6, z: -3.8, rotation: -Math.PI / 2 },
  { model: "painting", x: -2.4, z: -4.9, rotation: Math.PI },
  { model: "window", x: 2.2, z: -4.9, rotation: Math.PI },
  { model: "light", x: 0, z: -2.4 },
  { model: "desk", x: -2.1, z: -0.9, scale: 0.95 },
  { model: "chair", x: -2.1, z: -0.1 },
  { model: "desk", x: 2.1, z: -0.9, scale: 0.95 },
  { model: "chair", x: 2.1, z: -0.1 },
  { model: "desk", x: 0, z: 1.7, scale: 0.95 },
  { model: "chair", x: 0, z: 2.5 },
  { model: "book", x: 0.35, z: 1.6, scale: 0.9 },
  { model: "meetingTable", x: -3.2, z: 2.2, rotation: Math.PI / 2, scale: 0.9 },
  { model: "trashCan", x: 3.9, z: -1.4, scale: 0.9 },
  { model: "carpet", x: 0, z: 0.4, scale: 1.6 },
];

/** The student's personal space: bed, study desk, shelves and a sofa corner. */
export const DORM_PROPS: PropPlacement[] = [
  { model: "bed", x: -2.6, z: -2.4, rotation: Math.PI / 2 },
  { model: "closet", x: -3.4, z: 0.9, rotation: Math.PI / 2 },
  { model: "desk", x: 1.6, z: -2.6, rotation: Math.PI },
  { model: "officeChair", x: 1.6, z: -1.6 },
  { model: "laptop", x: 1.4, z: -2.6, rotation: Math.PI, scale: 0.9 },
  { model: "mug", x: 2.3, z: -2.5, scale: 0.9 },
  { model: "shelf", x: 3.5, z: -2.2, rotation: -Math.PI / 2 },
  { model: "book", x: 3.2, z: -1.1, scale: 0.9 },
  { model: "sofa", x: 1.4, z: 1.8, rotation: Math.PI },
  { model: "table", x: 1.4, z: 0.6, scale: 0.9 },
  { model: "tv", x: -1.6, z: 1.9, rotation: Math.PI / 2 },
  { model: "carpet", x: 0.6, z: 1.1, scale: 1.4 },
  { model: "light", x: -0.2, z: -0.6 },
  { model: "painting", x: 0.4, z: -3.4, rotation: Math.PI },
];

/** Compact desk set behind the Layer 4 lesson cast. */
export const LESSON_DESK_PROPS: PropPlacement[] = [
  { model: "desk", x: -0.9, z: -1.6, rotation: Math.PI, scale: 0.9 },
  { model: "desk", x: 0.9, z: -1.6, rotation: Math.PI, scale: 0.9 },
  { model: "shelf", x: -2.6, z: -1.9, rotation: Math.PI / 2, scale: 0.9 },
  { model: "painting", x: 2.3, z: -2.2, rotation: Math.PI },
  { model: "carpet", x: 0, z: 0.3, scale: 1.2 },
];
