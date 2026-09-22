import type { TileKind } from "@/lib/campus/tiles";

/**
 * One reusable classroom engine. Rooms are never hand-built per grade — a
 * room's subject and grade band produce a configuration, and the same builder
 * renders it.
 */
export interface ClassroomConfig {
  templateId: string;
  subject: SubjectKey;
  gradeBand: "k-5" | "6-8" | "9-12";
  architecture: { wallStyle: string; floorStyle: string; windowStyle: string; doorStyle: string };
  furniture: {
    /** Tile used for the student work surfaces in this room. */
    deskKind: TileKind;
    teacherDesk: boolean;
    bookshelf: boolean;
    /** Rows of student seating — younger rooms sit fewer, wider. */
    rows: number;
  };
  decorations: string[];
  interactables: string[];
}

export type SubjectKey =
  | "mathematics"
  | "science"
  | "literature"
  | "history"
  | "art"
  | "music"
  | "computing"
  | "study";

const SUBJECT_PACKS: Record<
  SubjectKey,
  { deskKind: TileKind; decorations: string[]; label: string }
> = {
  mathematics: {
    deskKind: "desk",
    label: "Mathematics",
    decorations: ["number line", "fractions chart", "geometry poster", "manipulative bins"],
  },
  science: {
    deskKind: "table",
    label: "Science",
    decorations: ["periodic table", "microscope bench", "specimen shelf", "solar system mobile"],
  },
  literature: {
    deskKind: "desk",
    label: "Literature",
    decorations: ["reading corner", "vocabulary wall", "author portraits", "story map"],
  },
  history: {
    deskKind: "desk",
    label: "History",
    decorations: ["world map", "timeline banner", "artifact case", "primary source folio"],
  },
  art: {
    deskKind: "table",
    label: "Art",
    decorations: ["easels", "colour wheel", "supply shelves", "student gallery"],
  },
  music: {
    deskKind: "chair",
    label: "Music",
    decorations: ["music stands", "instrument rack", "staff board", "recital posters"],
  },
  computing: {
    deskKind: "computer",
    label: "Computing",
    decorations: ["algorithm poster", "keyboard trays", "robotics kit", "project screens"],
  },
  study: {
    deskKind: "table",
    label: "Study skills",
    decorations: ["planner wall", "goal board", "quiet lamps", "note-taking guides"],
  },
};

// Order matters: a "computer lab" is a computing room, not a science one.
const KEYWORDS: Array<[RegExp, SubjectKey]> = [
  [/comput|robot|code|coding|tech|digital/i, "computing"],
  [/algebra|math|geometry|number/i, "mathematics"],
  [/music|choir|recital|band/i, "music"],
  [/art|studio|gallery|design/i, "art"],
  [/science|lab|biology|chem|physics|agri/i, "science"],
  [/lit|english|writing|seminar|reading/i, "literature"],
  [/history|humanities|civic|social/i, "history"],
  [/study|skills|advis|career/i, "study"],
];

/** Best-guess subject for a room from its id, name or stored subject. */
export function subjectFor(input: { subject?: string | null; roomId?: string; roomName?: string }): SubjectKey {
  const hay = `${input.subject ?? ""} ${input.roomId ?? ""} ${input.roomName ?? ""}`;
  for (const [pattern, key] of KEYWORDS) if (pattern.test(hay)) return key;
  return "study";
}

export function gradeBandFor(grade?: number | null): ClassroomConfig["gradeBand"] {
  if (!grade) return "6-8";
  if (grade <= 5) return "k-5";
  if (grade <= 8) return "6-8";
  return "9-12";
}

/** Builds the configuration a classroom is rendered from. */
export function classroomConfig(input: {
  subject?: string | null;
  grade?: number | null;
  roomId?: string;
  roomName?: string;
}): ClassroomConfig {
  const subject = subjectFor(input);
  const gradeBand = gradeBandFor(input.grade);
  const pack = SUBJECT_PACKS[subject];
  return {
    templateId: "cozy-classroom-v1",
    subject,
    gradeBand,
    architecture: {
      wallStyle: "cream plaster",
      floorStyle: "warm wood",
      windowStyle: "classic",
      doorStyle: "painted",
    },
    furniture: {
      deskKind: pack.deskKind,
      teacherDesk: true,
      bookshelf: true,
      rows: gradeBand === "k-5" ? 1 : 2,
    },
    decorations: pack.decorations,
    interactables: ["teacher", "board", "desk", "bookshelf"],
  };
}

export function subjectLabel(subject: SubjectKey): string {
  return SUBJECT_PACKS[subject].label;
}
