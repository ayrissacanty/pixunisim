import { create } from "zustand";

export interface DialogueChoice {
  label: string;
  action: () => void;
  variant?: "primary" | "ghost";
}

export interface DialogueState {
  speaker: string;
  role?: string;
  lines: string[];
  lineIndex: number;
  choices: DialogueChoice[];
}

export interface ReadingState {
  title: string;
  body: string;
}

export interface PromptState {
  verb: string;
  label: string;
  id: string;
}

/** Layer 1 campus · Layer 2 building interior · Layer 3 classroom beat · Layer 4 lesson. */
export type CampusLayer = 1 | 2 | 3 | 4;

export interface TransitionState {
  kind: "door" | "fade" | "wipe";
  label: string;
  toLayer: CampusLayer;
}

export interface ClassroomState {
  roomId: string;
  roomName: string;
  lessonId: string;
  courseId: string;
  teacher: string;
  /** "arrive" plays the greeting, "dismiss" plays the goodbye beat. */
  phase: "arrive" | "dismiss";
}

interface CampusState {
  layer: CampusLayer;
  transition?: TransitionState | undefined;
  classroom?: ClassroomState | undefined;
  /** Last standing position per zone so backing out never loses your place. */
  zoneMemory: Record<string, { x: number; y: number }>;
  currentZone: string;
  currentBuilding?: string | undefined;
  currentRoom?: string | undefined;
  currentRoomName?: string | undefined;
  playerPosition: { x: number; y: number };
  playerDirection: "up" | "down" | "left" | "right";
  currentObjective?: string | undefined;
  objectiveTargetZone?: string | undefined;
  interactionTarget?: PromptState | undefined;
  dialogue?: DialogueState | undefined;
  reading?: ReadingState | undefined;
  mapOpen: boolean;
  lessonOpen?: { lessonId: string; courseId: string; roomId?: string | undefined } | undefined;
  discovered: string[];
  pendingTravel?: { zone: string; x: number; y: number } | undefined;
  mobileAction: number;

  setZone: (zone: string) => void;
  setRoom: (roomId?: string | undefined, roomName?: string | undefined) => void;
  setPlayer: (x: number, y: number, dir: CampusState["playerDirection"]) => void;
  setPrompt: (p?: PromptState | undefined) => void;
  openDialogue: (d: Omit<DialogueState, "lineIndex">) => void;
  advanceDialogue: () => void;
  closeDialogue: () => void;
  openReading: (r: ReadingState) => void;
  closeReading: () => void;
  setMapOpen: (open: boolean) => void;
  openLesson: (lessonId: string, courseId: string, roomId?: string | undefined) => void;
  closeLesson: () => void;
  discover: (id: string) => void;
  travel: (zone: string, x: number, y: number) => void;
  consumeTravel: () => void;
  setObjective: (text?: string | undefined, zone?: string | undefined) => void;
  triggerMobileAction: () => void;

  setLayer: (layer: CampusLayer) => void;
  beginTransition: (t: TransitionState) => void;
  endTransition: () => void;
  rememberPosition: (zone: string, x: number, y: number) => void;
  enterClassroom: (c: Omit<ClassroomState, "phase">) => void;
  dismissClass: () => void;
  leaveClassroom: () => void;
}

export const useCampusStore = create<CampusState>((set, get) => ({
  currentZone: "welcome-plaza",
  playerPosition: { x: 16, y: 21 },
  playerDirection: "up",
  mapOpen: false,
  discovered: ["welcome-plaza"],
  mobileAction: 0,
  layer: 1,
  zoneMemory: {},

  setLayer: (layer) => set({ layer }),
  beginTransition: (t) => set({ transition: t }),
  endTransition: () => set((s) => ({ transition: undefined, layer: s.transition?.toLayer ?? s.layer })),
  rememberPosition: (zone, x, y) =>
    set((s) => ({ zoneMemory: { ...s.zoneMemory, [zone]: { x, y } } })),
  enterClassroom: (c) =>
    set({ classroom: { ...c, phase: "arrive" }, dialogue: undefined, layer: 3 }),
  dismissClass: () =>
    set((s) => ({
      lessonOpen: undefined,
      layer: 3,
      classroom: s.classroom ? { ...s.classroom, phase: "dismiss" } : undefined,
    })),
  leaveClassroom: () => set({ classroom: undefined, lessonOpen: undefined, layer: 2 }),

  setZone: (zone) =>
    set((s) => ({
      currentZone: zone,
      currentRoom: undefined,
      currentRoomName: undefined,
      discovered: s.discovered.includes(zone) ? s.discovered : [...s.discovered, zone],
    })),
  setRoom: (roomId, roomName) => set({ currentRoom: roomId, currentRoomName: roomName }),
  setPlayer: (x, y, dir) => set({ playerPosition: { x, y }, playerDirection: dir }),
  setPrompt: (p) => set({ interactionTarget: p }),
  openDialogue: (d) => set({ dialogue: { ...d, lineIndex: 0 } }),
  advanceDialogue: () => {
    const d = get().dialogue;
    if (!d) return;
    if (d.lineIndex < d.lines.length - 1) set({ dialogue: { ...d, lineIndex: d.lineIndex + 1 } });
  },
  closeDialogue: () => set({ dialogue: undefined }),
  openReading: (r) => set({ reading: r }),
  closeReading: () => set({ reading: undefined }),
  setMapOpen: (open) => set({ mapOpen: open }),
  openLesson: (lessonId, courseId, roomId) =>
    set({
      lessonOpen: { lessonId, courseId, ...(roomId ? { roomId } : {}) },
      dialogue: undefined,
      layer: 4,
    }),
  closeLesson: () =>
    set((s) => ({
      lessonOpen: undefined,
      layer: s.classroom ? 3 : 2,
      classroom: s.classroom ? { ...s.classroom, phase: "dismiss" } : undefined,
    })),
  discover: (id) =>
    set((s) => (s.discovered.includes(id) ? s : { discovered: [...s.discovered, id] })),
  travel: (zone, x, y) =>
    set((s) => ({
      pendingTravel: { zone, x, y },
      // Always bookmark where we stood so returning restores the position.
      zoneMemory: { ...s.zoneMemory, [s.currentZone]: { ...s.playerPosition } },
    })),
  consumeTravel: () => set({ pendingTravel: undefined }),
  setObjective: (text, zone) => set({ currentObjective: text, objectiveTargetZone: zone }),
  triggerMobileAction: () => set((s) => ({ mobileAction: s.mobileAction + 1 })),
}));
