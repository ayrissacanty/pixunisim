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
import clsDesk from "@/assets/room3d/clsDesk.glb.asset.json";
import clsChair from "@/assets/room3d/clsChair.glb.asset.json";
import clsChairTable from "@/assets/room3d/clsChairTable.glb.asset.json";
import clsBlackboard from "@/assets/room3d/clsBlackboard.glb.asset.json";
import clsBlackboardSmall from "@/assets/room3d/clsBlackboardSmall.glb.asset.json";
import clsLocker from "@/assets/room3d/clsLocker.glb.asset.json";
import clsShelf from "@/assets/room3d/clsShelf.glb.asset.json";
import clsLamp from "@/assets/room3d/clsLamp.glb.asset.json";
import clsBook from "@/assets/room3d/clsBook.glb.asset.json";
import clsCurtains from "@/assets/room3d/clsCurtains.glb.asset.json";
import clsChalk from "@/assets/room3d/clsChalk.glb.asset.json";
import clsSponge from "@/assets/room3d/clsSponge.glb.asset.json";
import clsTv from "@/assets/room3d/clsTv.glb.asset.json";
import clsPencilCase from "@/assets/room3d/clsPencilCase.glb.asset.json";
import clsRadio from "@/assets/room3d/clsRadio.glb.asset.json";
import clsClock from "@/assets/room3d/clsClock.glb.asset.json";
import clsCompass from "@/assets/room3d/clsCompass.glb.asset.json";
import clsCart from "@/assets/room3d/clsCart.glb.asset.json";
import pcTable from "@/assets/room3d/pcTable.glb.asset.json";
import pcTower from "@/assets/room3d/pcTower.glb.asset.json";
import pcScreen from "@/assets/room3d/pcScreen.glb.asset.json";
import pcKeyboard from "@/assets/room3d/pcKeyboard.glb.asset.json";
import pcMouse from "@/assets/room3d/pcMouse.glb.asset.json";
import pcChair from "@/assets/room3d/pcChair.glb.asset.json";
import pcProjector from "@/assets/room3d/pcProjector.glb.asset.json";
import pcPrinter from "@/assets/room3d/pcPrinter.glb.asset.json";
import cafTable from "@/assets/room3d/cafTable.glb.asset.json";
import cafChair from "@/assets/room3d/cafChair.glb.asset.json";
import cafTray from "@/assets/room3d/cafTray.glb.asset.json";
import cafVending from "@/assets/room3d/cafVending.glb.asset.json";
import cafCoffee from "@/assets/room3d/cafCoffee.glb.asset.json";

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

  // Styloo classroom pack (glTF) — school-specific furnishings.
  clsDesk: clsDesk.url,
  clsChair: clsChair.url,
  clsChairTable: clsChairTable.url,
  clsBlackboard: clsBlackboard.url,
  clsBlackboardSmall: clsBlackboardSmall.url,
  clsLocker: clsLocker.url,
  clsShelf: clsShelf.url,
  clsLamp: clsLamp.url,
  clsBook: clsBook.url,
  clsCurtains: clsCurtains.url,
  clsChalk: clsChalk.url,
  clsSponge: clsSponge.url,
  clsTv: clsTv.url,
  clsPencilCase: clsPencilCase.url,
  clsRadio: clsRadio.url,
  clsClock: clsClock.url,
  clsCompass: clsCompass.url,
  clsCart: clsCart.url,
  pcTable: pcTable.url,
  pcTower: pcTower.url,
  pcScreen: pcScreen.url,
  pcKeyboard: pcKeyboard.url,
  pcMouse: pcMouse.url,
  pcChair: pcChair.url,
  pcProjector: pcProjector.url,
  pcPrinter: pcPrinter.url,
  cafTable: cafTable.url,
  cafChair: cafChair.url,
  cafTray: cafTray.url,
  cafVending: cafVending.url,
  cafCoffee: cafCoffee.url,
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
  /** Normalise the model so it stands this many metres tall. */
  targetHeight?: number;
  /** Set for models authored Z-up (Blender default) so they stand upright. */
  upAxis?: "y" | "z";
}

/**
 * Layer 3/4 classroom, furnished from the Styloo school pack: chalkboard wall
 * at the front, teacher desk, and student desk-chair pairs in rows.
 */
export const CLASSROOM_PROPS: PropPlacement[] = [
  { model: "clsBlackboard", x: 0, z: -5.0, rotation: 0, targetHeight: 1.35 },
  { model: "clsChalk", x: -0.6, z: -4.75, targetHeight: 0.04 },
  { model: "clsSponge", x: 0.5, z: -4.75, targetHeight: 0.08 },
  { model: "clsDesk", x: 0, z: -4.0, rotation: Math.PI, targetHeight: 0.76, upAxis: "z" as const },
  { model: "officeChair", x: 1.1, z: -4.5, rotation: Math.PI },
  { model: "laptop", x: -0.3, z: -4.0, rotation: Math.PI, scale: 0.9 },
  { model: "mug", x: 0.7, z: -3.95, scale: 0.85 },
  { model: "clsClock", x: 2.6, z: -4.95, targetHeight: 0.3 },
  { model: "clsBlackboardSmall", x: -2.9, z: -4.95, targetHeight: 0.7 },
  { model: "clsShelf", x: -3.8, z: -3.4, rotation: Math.PI / 2, targetHeight: 1.6 },
  { model: "clsLocker", x: 3.8, z: -3.2, rotation: -Math.PI / 2, targetHeight: 1.85 },
  { model: "clsCurtains", x: 3.9, z: -0.6, rotation: -Math.PI / 2, targetHeight: 1.9, upAxis: "z" as const },
  { model: "clsTv", x: -3.8, z: -1.2, rotation: Math.PI / 2, targetHeight: 0.7 },
  { model: "light", x: 0, z: -2.4 },
  { model: "clsDesk", x: -2.1, z: -0.9, targetHeight: 0.74, upAxis: "z" as const },
  { model: "clsChair", x: -2.1, z: -0.1, rotation: Math.PI, targetHeight: 0.9 },
  { model: "clsDesk", x: 2.1, z: -0.9, targetHeight: 0.74, upAxis: "z" as const },
  { model: "clsChair", x: 2.1, z: -0.1, rotation: Math.PI, targetHeight: 0.9 },
  { model: "clsDesk", x: 0, z: 1.7, targetHeight: 0.74, upAxis: "z" as const },
  { model: "clsChair", x: 0, z: 2.5, rotation: Math.PI, targetHeight: 0.9 },
  { model: "clsBook", x: 0.35, z: 1.65, y: 0.75, targetHeight: 0.05 },
  { model: "clsPencilCase", x: -0.3, z: 1.7, y: 0.75, targetHeight: 0.06 },
  { model: "clsCart", x: -3.4, z: 2.2, rotation: Math.PI / 2, targetHeight: 1.0 },
  { model: "trashCan", x: 3.9, z: 1.4, scale: 0.9 },
  { model: "carpet", x: 0, z: 0.4, scale: 1.6 },
];

/** Computer lab variant — workstations instead of writing desks. */
export const COMPUTER_LAB_PROPS: PropPlacement[] = [
  { model: "clsBlackboard", x: 0, z: -5.0, targetHeight: 1.35 },
  { model: "pcProjector", x: 0, z: -2.6, y: 1.9, targetHeight: 0.28 },
  { model: "pcTable", x: -2.2, z: -1.0, rotation: Math.PI, targetHeight: 0.75 },
  { model: "pcScreen", x: -2.2, z: -1.15, y: 0.75, targetHeight: 0.42 },
  { model: "pcKeyboard", x: -2.2, z: -0.75, y: 0.75, targetHeight: 0.03 },
  { model: "pcMouse", x: -1.75, z: -0.75, y: 0.75, targetHeight: 0.04 },
  { model: "pcTower", x: -3.1, z: -1.0, targetHeight: 0.45 },
  { model: "pcChair", x: -2.2, z: -0.1, rotation: Math.PI, targetHeight: 1.0 },
  { model: "pcTable", x: 2.2, z: -1.0, rotation: Math.PI, targetHeight: 0.75 },
  { model: "pcScreen", x: 2.2, z: -1.15, y: 0.75, targetHeight: 0.42 },
  { model: "pcKeyboard", x: 2.2, z: -0.75, y: 0.75, targetHeight: 0.03 },
  { model: "pcChair", x: 2.2, z: -0.1, rotation: Math.PI, targetHeight: 1.0 },
  { model: "pcTable", x: 0, z: 1.8, rotation: Math.PI, targetHeight: 0.75 },
  { model: "pcScreen", x: 0, z: 1.65, y: 0.75, targetHeight: 0.42 },
  { model: "pcChair", x: 0, z: 2.6, rotation: Math.PI, targetHeight: 1.0 },
  { model: "pcPrinter", x: 3.7, z: -3.0, rotation: -Math.PI / 2, targetHeight: 0.4 },
  { model: "clsLocker", x: -3.9, z: -3.2, rotation: Math.PI / 2, targetHeight: 1.85 },
  { model: "light", x: 0, z: -2.4 },
  { model: "carpet", x: 0, z: 0.4, scale: 1.6 },
];

/** Student centre / dining hall variant. */
export const CAFETERIA_PROPS: PropPlacement[] = [
  { model: "cafVending", x: -3.7, z: -4.2, targetHeight: 1.9 },
  { model: "cafCoffee", x: 3.6, z: -4.2, targetHeight: 0.45 },
  { model: "cafTable", x: -2.0, z: -1.4, targetHeight: 0.75 },
  { model: "cafChair", x: -2.0, z: -0.5, rotation: Math.PI, targetHeight: 0.9 },
  { model: "cafChair", x: -2.0, z: -2.3, targetHeight: 0.9 },
  { model: "cafTray", x: -2.0, z: -1.4, y: 0.76, targetHeight: 0.05 },
  { model: "cafTable", x: 2.0, z: -1.4, targetHeight: 0.75 },
  { model: "cafChair", x: 2.0, z: -0.5, rotation: Math.PI, targetHeight: 0.9 },
  { model: "cafChair", x: 2.0, z: -2.3, targetHeight: 0.9 },
  { model: "cafTable", x: 0, z: 1.9, targetHeight: 0.75 },
  { model: "cafChair", x: 0, z: 2.8, rotation: Math.PI, targetHeight: 0.9 },
  { model: "clsRadio", x: 3.7, z: -1.0, targetHeight: 0.25 },
  { model: "light", x: 0, z: -2.4 },
  { model: "carpet", x: 0, z: 0.4, scale: 1.6 },
];

/** Pick the furnishing set that fits the room the student walked into. */
export function propsForRoom(name?: string): PropPlacement[] {
  const n = (name ?? "").toLowerCase();
  if (/comput|tech|lab|coding|digital/.test(n)) return COMPUTER_LAB_PROPS;
  if (/cafe|dining|student center|commons|lounge/.test(n)) return CAFETERIA_PROPS;
  return CLASSROOM_PROPS;
}

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
  { model: "window", x: -3.4, z: -1.0, rotation: Math.PI / 2 },
  { model: "wallShelf", x: 3.4, z: 0.6, rotation: -Math.PI / 2 },
  { model: "trashCan", x: 2.9, z: -0.4, scale: 0.85 },
];

/** Compact desk set behind the Layer 4 lesson cast. */
export const LESSON_DESK_PROPS: PropPlacement[] = [
  { model: "clsDesk", x: -0.9, z: -1.6, rotation: Math.PI, targetHeight: 0.74, upAxis: "z" as const },
  { model: "clsDesk", x: 0.9, z: -1.6, rotation: Math.PI, targetHeight: 0.74, upAxis: "z" as const },
  { model: "clsBlackboardSmall", x: -2.5, z: -2.1, targetHeight: 0.7 },
  { model: "clsShelf", x: 2.5, z: -2.0, rotation: -Math.PI / 2, targetHeight: 1.5 },
  { model: "carpet", x: 0, z: 0.3, scale: 1.2 },
];
