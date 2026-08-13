import { TileKind, isSolid } from "./tiles";

export type InteractAction =
  | { kind: "travel"; zone: string; spawnX: number; spawnY: number }
  | { kind: "route"; to: string }
  | { kind: "read"; title: string; body: string }
  | { kind: "map" }
  | { kind: "study" }
  | { kind: "achievements" }
  | { kind: "workspace" }
  | { kind: "library" }
  | {
      kind: "classroom";
      roomId: string;
      roomName: string;
      lessonId: string;
      courseId: string;
      teacher: string;
    };

export interface Interactable {
  id: string;
  x: number;
  y: number;
  verb: string;
  label: string;
  action: InteractAction;
}

export interface NpcSpawn {
  id: string;
  x: number;
  y: number;
  name: string;
  role: string;
  lines: string[];
  behavior: "idle" | "walk" | "sit" | "read" | "study";
  roomId?: string;
  roomName?: string;
  lessonId?: string;
  courseId?: string;
  route?: string;
  routeLabel?: string;
}

export interface RoomArea {
  id: string;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ZoneMap {
  id: string;
  name: string;
  kind: "outdoor" | "interior";
  width: number;
  height: number;
  tiles: TileKind[][];
  defaultSpawn: { x: number; y: number };
  interactables: Interactable[];
  npcs: NpcSpawn[];
  rooms: RoomArea[];
  /** Position on the campus overview map (0..1). */
  mapPos: { x: number; y: number };
  parentZone?: string;
}

/* ---------------------------------- utils --------------------------------- */

function mulberry(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

class Grid {
  tiles: TileKind[][];
  constructor(
    public width: number,
    public height: number,
    fill: TileKind,
  ) {
    this.tiles = Array.from({ length: height }, () => Array.from({ length: width }, () => fill));
  }
  set(x: number, y: number, kind: TileKind) {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return;
    this.tiles[y]![x] = kind;
  }
  get(x: number, y: number): TileKind {
    return this.tiles[y]?.[x] ?? "wall";
  }
  rect(x: number, y: number, w: number, h: number, kind: TileKind) {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.set(i, j, kind);
  }
  border(x: number, y: number, w: number, h: number, kind: TileKind) {
    for (let i = x; i < x + w; i++) {
      this.set(i, y, kind);
      this.set(i, y + h - 1, kind);
    }
    for (let j = y; j < y + h; j++) {
      this.set(x, j, kind);
      this.set(x + w - 1, j, kind);
    }
  }
  hLine(x1: number, x2: number, y: number, kind: TileKind, thickness = 1) {
    for (let t = 0; t < thickness; t++) for (let i = x1; i <= x2; i++) this.set(i, y + t, kind);
  }
  vLine(y1: number, y2: number, x: number, kind: TileKind, thickness = 1) {
    for (let t = 0; t < thickness; t++) for (let j = y1; j <= y2; j++) this.set(x + t, j, kind);
  }
}

function building(g: Grid, x: number, y: number, w: number, h: number, doorX: number) {
  g.rect(x, y, w, h, "buildingWall");
  g.hLine(x, x + w - 1, y, "buildingRoof");
  if (h > 2) g.hLine(x, x + w - 1, y + 1, "buildingRoof");
  for (let i = x + 1; i < x + w - 1; i += 2) g.set(i, y + Math.floor(h / 2), "window");
  g.set(doorX, y + h - 1, "door");
}

/* --------------------------------- outdoor -------------------------------- */

function welcomePlaza(): ZoneMap {
  const g = new Grid(34, 26, "grass");
  const rnd = mulberry(11);
  // main north path
  g.vLine(0, 25, 16, "path", 2);
  // plaza
  g.rect(11, 8, 12, 10, "brick");
  g.rect(15, 11, 3, 3, "fountain");
  g.set(16, 12, "water");
  // hedges framing
  for (let x = 10; x <= 23; x++) {
    if (x < 16 || x > 17) {
      g.set(x, 7, "hedge");
      g.set(x, 18, "hedge");
    }
  }
  // trees + flowers
  for (let i = 0; i < 60; i++) {
    const x = Math.floor(rnd() * 34);
    const y = Math.floor(rnd() * 26);
    if (g.get(x, y) !== "grass") continue;
    g.set(x, y, rnd() > 0.45 ? "tree" : "flower");
  }
  // benches + lamps around plaza
  ([
    [12, 10],
    [12, 15],
    [21, 10],
    [21, 15],
  ] as const).forEach(([x, y]) => g.set(x, y, "bench"));
  ([
    [11, 8],
    [22, 8],
    [11, 17],
    [22, 17],
  ] as const).forEach(([x, y]) => g.set(x, y, "lamp"));
  // signs
  g.set(14, 20, "sign");
  g.set(19, 20, "board");
  // buildings
  building(g, 2, 8, 8, 6, 5);
  building(g, 2, 18, 7, 5, 4);
  g.vLine(14, 22, 5, "path");
  g.hLine(5, 16, 14, "path");
  g.vLine(23, 25, 4, "path");
  g.hLine(4, 16, 23, "path");

  return {
    id: "welcome-plaza",
    name: "Welcome Plaza",
    kind: "outdoor",
    width: g.width,
    height: g.height,
    tiles: g.tiles,
    defaultSpawn: { x: 16, y: 21 },
    mapPos: { x: 0.22, y: 0.78 },
    rooms: [],
    npcs: [
      {
        id: "guide-rosa",
        x: 19,
        y: 15,
        name: "Rosa Delgado",
        role: "Campus Guide",
        behavior: "walk",
        lines: [
          "Welcome to UNIFY University. You are standing in the Welcome Plaza.",
          "Head north up the brick path and you will reach the Central Quad. Every hall opens off it.",
          "Press M at any time to open the campus map — locations you discover unlock fast travel.",
        ],
      },
      {
        id: "student-amir",
        x: 13,
        y: 11,
        name: "Amir Haddad",
        role: "Student",
        behavior: "sit",
        lines: [
          "First day? The fountain is the best meeting spot on campus.",
          "Professor Maya teaches Algebra 204 in the Mathematics & Technology Hall. Start there.",
        ],
      },
    ],
    interactables: [
      {
        id: "wp-sign",
        x: 14,
        y: 20,
        verb: "READ",
        label: "Welcome Sign",
        action: {
          kind: "read",
          title: "UNIFY UNIVERSITY",
          body: "Founded for families who learn together. Every hall on this campus teaches the same curriculum you will find in your Workspace — walk in, sit down, and begin.",
        },
      },
      {
        id: "wp-board",
        x: 19,
        y: 20,
        verb: "READ",
        label: "Information Board",
        action: {
          kind: "read",
          title: "Information Board",
          body: "Controls — Move: WASD or arrow keys. Interact: E. Campus map: M. On a phone, use the joystick and the round action button.",
        },
      },
      {
        id: "wp-map",
        x: 21,
        y: 12,
        verb: "OPEN",
        label: "Campus Map Kiosk",
        action: { kind: "map" },
      },
      {
        id: "wp-admin-door",
        x: 5,
        y: 13,
        verb: "ENTER",
        label: "Administration",
        action: { kind: "travel", zone: "administration", spawnX: 12, spawnY: 12 },
      },
      {
        id: "wp-home-door",
        x: 4,
        y: 22,
        verb: "ENTER",
        label: "Personal Student Space",
        action: { kind: "travel", zone: "personal-space", spawnX: 9, spawnY: 11 },
      },
      {
        id: "wp-north",
        x: 16,
        y: 0,
        verb: "GO",
        label: "Central Quad",
        action: { kind: "travel", zone: "central-quad", spawnX: 20, spawnY: 28 },
      },
      {
        id: "wp-north-2",
        x: 17,
        y: 0,
        verb: "GO",
        label: "Central Quad",
        action: { kind: "travel", zone: "central-quad", spawnX: 20, spawnY: 28 },
      },
    ],
  };
}

function centralQuad(): ZoneMap {
  const g = new Grid(40, 30, "grass");
  const rnd = mulberry(29);
  g.vLine(0, 29, 19, "path", 2);
  g.hLine(0, 39, 14, "path", 2);
  g.rect(16, 11, 8, 8, "brick");
  g.rect(18, 13, 4, 4, "fountain");
  g.rect(19, 14, 2, 2, "water");

  building(g, 3, 3, 10, 6, 8); // math
  building(g, 26, 3, 11, 6, 31); // science
  building(g, 3, 21, 10, 6, 8); // humanities
  building(g, 26, 21, 11, 6, 31); // arts
  building(g, 15, 0, 10, 5, 20); // library

  // connector paths
  g.vLine(9, 14, 8, "path");
  g.vLine(5, 14, 20, "path");
  g.vLine(14, 21, 8, "path");
  g.vLine(9, 14, 31, "path");
  g.vLine(14, 21, 31, "path");
  g.hLine(8, 19, 14, "path");
  g.hLine(19, 31, 14, "path");

  for (let i = 0; i < 90; i++) {
    const x = Math.floor(rnd() * 40);
    const y = Math.floor(rnd() * 30);
    if (g.get(x, y) !== "grass") continue;
    const r = rnd();
    g.set(x, y, r > 0.62 ? "tree" : r > 0.42 ? "flower" : "grassAlt");
  }
  ([
    [15, 12],
    [15, 17],
    [23, 12],
    [23, 17],
    [12, 16],
    [27, 16],
  ] as const).forEach(([x, y]) => g.set(x, y, "bench"));
  ([
    [14, 10],
    [24, 10],
    [14, 19],
    [24, 19],
  ] as const).forEach(([x, y]) => g.set(x, y, "lamp"));
  g.set(11, 12, "table");
  g.set(11, 13, "chair");
  g.set(28, 12, "table");
  g.set(28, 13, "chair");
  g.set(17, 20, "board");
  g.set(22, 20, "sign");

  return {
    id: "central-quad",
    name: "Central Quad",
    kind: "outdoor",
    width: g.width,
    height: g.height,
    tiles: g.tiles,
    defaultSpawn: { x: 20, y: 20 },
    mapPos: { x: 0.45, y: 0.5 },
    rooms: [],
    npcs: [
      {
        id: "student-june",
        x: 21,
        y: 17,
        name: "June Okafor",
        role: "Student",
        behavior: "study",
        lines: [
          "I have Algebra 204 next. Professor Maya actually makes order of operations interesting.",
          "The Mathematics & Technology Hall is the ochre building at the north-west corner of the Quad.",
        ],
      },
      {
        id: "faculty-dean",
        x: 26,
        y: 15,
        name: "Dean Harriet Voss",
        role: "Faculty",
        behavior: "walk",
        lines: [
          "Good afternoon. Everything you study here is recorded once and shows up everywhere.",
          "Attend a class in a hall or read the same lesson in the Workspace — the progress is identical.",
        ],
      },
    ],
    interactables: [
      {
        id: "cq-events",
        x: 17,
        y: 20,
        verb: "READ",
        label: "Event Board",
        action: {
          kind: "read",
          title: "Campus Announcements",
          body: "Study group in the Library reading room, 4pm. Career Center pathway fair all week. Writing Studio open hours in Humanities Hall.",
        },
      },
      {
        id: "cq-sign",
        x: 22,
        y: 20,
        verb: "READ",
        label: "Quad Signpost",
        action: {
          kind: "read",
          title: "Central Quad",
          body: "North: University Library. North-west: Mathematics & Technology Hall. North-east: Science & Discovery Hall. South-west: Humanities Hall. South-east: Arts & Creative Center. East: Student Commons. South: Welcome Plaza.",
        },
      },
      {
        id: "cq-math",
        x: 8,
        y: 8,
        verb: "ENTER",
        label: "Mathematics & Technology Hall",
        action: { kind: "travel", zone: "math-tech-hall", spawnX: 12, spawnY: 12 },
      },
      {
        id: "cq-science",
        x: 31,
        y: 8,
        verb: "ENTER",
        label: "Science & Discovery Hall",
        action: { kind: "travel", zone: "science-hall", spawnX: 12, spawnY: 12 },
      },
      {
        id: "cq-humanities",
        x: 8,
        y: 26,
        verb: "ENTER",
        label: "Humanities Hall",
        action: { kind: "travel", zone: "humanities-hall", spawnX: 12, spawnY: 12 },
      },
      {
        id: "cq-arts",
        x: 31,
        y: 26,
        verb: "ENTER",
        label: "Arts & Creative Center",
        action: { kind: "travel", zone: "arts-center", spawnX: 12, spawnY: 12 },
      },
      {
        id: "cq-library",
        x: 20,
        y: 4,
        verb: "ENTER",
        label: "University Library",
        action: { kind: "travel", zone: "university-library", spawnX: 14, spawnY: 15 },
      },
      {
        id: "cq-south",
        x: 19,
        y: 29,
        verb: "GO",
        label: "Welcome Plaza",
        action: { kind: "travel", zone: "welcome-plaza", spawnX: 16, spawnY: 1 },
      },
      {
        id: "cq-south-2",
        x: 20,
        y: 29,
        verb: "GO",
        label: "Welcome Plaza",
        action: { kind: "travel", zone: "welcome-plaza", spawnX: 16, spawnY: 1 },
      },
      {
        id: "cq-east",
        x: 39,
        y: 14,
        verb: "GO",
        label: "Student Commons",
        action: { kind: "travel", zone: "student-commons", spawnX: 1, spawnY: 11 },
      },
      {
        id: "cq-east-2",
        x: 39,
        y: 15,
        verb: "GO",
        label: "Student Commons",
        action: { kind: "travel", zone: "student-commons", spawnX: 1, spawnY: 11 },
      },
      {
        id: "cq-west",
        x: 0,
        y: 14,
        verb: "GO",
        label: "Outdoor Study Gardens",
        action: { kind: "travel", zone: "study-gardens", spawnX: 25, spawnY: 10 },
      },
      {
        id: "cq-west-2",
        x: 0,
        y: 15,
        verb: "GO",
        label: "Outdoor Study Gardens",
        action: { kind: "travel", zone: "study-gardens", spawnX: 25, spawnY: 10 },
      },
    ],
  };
}

function studentCommons(): ZoneMap {
  const g = new Grid(28, 22, "brick");
  const rnd = mulberry(7);
  g.rect(0, 0, 28, 22, "grass");
  g.rect(2, 10, 24, 8, "brick");
  g.hLine(0, 27, 11, "path", 2);
  building(g, 3, 3, 10, 6, 8);
  building(g, 17, 3, 9, 6, 21);
  g.vLine(9, 11, 8, "path");
  g.vLine(9, 11, 21, "path");
  for (let i = 0; i < 40; i++) {
    const x = Math.floor(rnd() * 28);
    const y = Math.floor(rnd() * 22);
    if (g.get(x, y) !== "grass") continue;
    g.set(x, y, rnd() > 0.5 ? "tree" : "flower");
  }
  ([
    [5, 14],
    [10, 14],
    [16, 14],
    [22, 14],
  ] as const).forEach(([x, y]) => {
    g.set(x, y, "table");
    g.set(x, y + 1, "chair");
    g.set(x + 1, y, "chair");
  });
  g.set(4, 18, "board");
  g.set(24, 18, "lamp");

  return {
    id: "student-commons",
    name: "Student Commons",
    kind: "outdoor",
    width: g.width,
    height: g.height,
    tiles: g.tiles,
    defaultSpawn: { x: 14, y: 12 },
    mapPos: { x: 0.78, y: 0.45 },
    rooms: [],
    npcs: [
      {
        id: "student-mira",
        x: 11,
        y: 15,
        name: "Mira Castellanos",
        role: "Student",
        behavior: "sit",
        lines: [
          "The Student Center has the cafeteria and the club board. The Career Center is next door.",
          "I found my apprenticeship through the pathway displays in there.",
        ],
      },
    ],
    interactables: [
      {
        id: "sc-center",
        x: 8,
        y: 8,
        verb: "ENTER",
        label: "Student Center",
        action: { kind: "travel", zone: "student-center", spawnX: 13, spawnY: 14 },
      },
      {
        id: "sc-career",
        x: 21,
        y: 8,
        verb: "ENTER",
        label: "Career Center",
        action: { kind: "travel", zone: "career-center", spawnX: 12, spawnY: 13 },
      },
      {
        id: "sc-board",
        x: 4,
        y: 18,
        verb: "READ",
        label: "Community Board",
        action: {
          kind: "read",
          title: "Community Board",
          body: "Chess club, Tuesdays. Family science night, Thursday. Volunteer tutoring in the Library, weekends. Woodshop safety course, Saturday morning.",
        },
      },
      {
        id: "sc-west",
        x: 0,
        y: 11,
        verb: "GO",
        label: "Central Quad",
        action: { kind: "travel", zone: "central-quad", spawnX: 38, spawnY: 14 },
      },
    ],
  };
}

function studyGardens(): ZoneMap {
  const g = new Grid(28, 20, "grass");
  const rnd = mulberry(43);
  g.rect(8, 6, 10, 7, "water");
  g.border(8, 6, 10, 7, "stone");
  g.hLine(0, 27, 10, "path");
  g.vLine(0, 19, 25, "path");
  for (let i = 0; i < 70; i++) {
    const x = Math.floor(rnd() * 28);
    const y = Math.floor(rnd() * 20);
    if (g.get(x, y) !== "grass") continue;
    const r = rnd();
    g.set(x, y, r > 0.7 ? "tree" : r > 0.35 ? "flower" : "hedge");
  }
  ([
    [6, 8],
    [20, 8],
    [12, 15],
    [18, 15],
  ] as const).forEach(([x, y]) => g.set(x, y, "bench"));
  g.set(4, 14, "lamp");
  g.set(22, 4, "lamp");

  return {
    id: "study-gardens",
    name: "Outdoor Study Gardens",
    kind: "outdoor",
    width: g.width,
    height: g.height,
    tiles: g.tiles,
    defaultSpawn: { x: 25, y: 10 },
    mapPos: { x: 0.14, y: 0.4 },
    rooms: [],
    npcs: [
      {
        id: "student-oli",
        x: 14,
        y: 16,
        name: "Oli Brennan",
        role: "Student",
        behavior: "read",
        lines: ["Quietest place on campus. I review my knowledge checks out here before class."],
      },
    ],
    interactables: [
      {
        id: "sg-east",
        x: 27,
        y: 10,
        verb: "GO",
        label: "Central Quad",
        action: { kind: "travel", zone: "central-quad", spawnX: 1, spawnY: 14 },
      },
      {
        id: "sg-bench",
        x: 12,
        y: 15,
        verb: "STUDY",
        label: "Garden Bench",
        action: { kind: "study" },
      },
    ],
  };
}

/* -------------------------------- interiors ------------------------------- */

interface RoomSpec {
  id: string;
  name: string;
  teacher?: { id: string; name: string; lines: string[] };
  lessonId?: string;
  courseId?: string;
  furniture?: "desks" | "lab" | "computers" | "soft";
}

function academicHall(opts: {
  id: string;
  name: string;
  parent: string;
  parentSpawn: { x: number; y: number };
  rooms: RoomSpec[];
  mapPos: { x: number; y: number };
  extraNpc?: NpcSpawn;
}): ZoneMap {
  const roomW = 9;
  const width = Math.max(26, opts.rooms.length * roomW + 2);
  const height = 18;
  const g = new Grid(width, height, "floor");
  g.border(0, 0, width, height, "wall");
  // corridor stripe
  g.rect(1, 10, width - 2, 3, "floorAlt");
  const rooms: RoomArea[] = [];
  const npcs: NpcSpawn[] = [];
  const interactables: Interactable[] = [];

  opts.rooms.forEach((spec, i) => {
    const x = 1 + i * roomW;
    const w = roomW - 1;
    const y = 1;
    const h = 8;
    g.border(x, y, w, h + 1, "wall");
    g.rect(x + 1, y + 1, w - 2, h - 1, "floor");
    const doorX = x + Math.floor(w / 2);
    g.set(doorX, y + h, "door");
    g.set(x + 1, y + 1, "board");
    // furniture
    if (spec.furniture === "computers") {
      for (let cx = x + 2; cx < x + w - 1; cx += 2) {
        g.set(cx, y + 3, "computer");
        g.set(cx, y + 4, "chair");
      }
    } else if (spec.furniture === "lab") {
      g.rect(x + 2, y + 3, w - 4, 1, "counter");
      g.set(x + 2, y + 5, "chair");
      g.set(x + 4, y + 5, "chair");
      g.set(x + 6, y + 5, "plant");
    } else if (spec.furniture === "soft") {
      g.set(x + 2, y + 3, "shelf");
      g.set(x + 4, y + 4, "table");
      g.set(x + 4, y + 5, "chair");
    } else {
      for (let dy = y + 4; dy <= y + 6; dy += 2) {
        for (let dx = x + 2; dx < x + w - 1; dx += 3) {
          g.set(dx, dy, "desk");
          g.set(dx, dy + 1, "chair");
        }
      }
    }
    rooms.push({ id: spec.id, name: spec.name, x, y, w, h: h + 1 });
    if (spec.teacher) {
      npcs.push({
        id: spec.teacher.id,
        x: doorX,
        y: y + 2,
        name: spec.teacher.name,
        role: "Faculty",
        behavior: "idle",
        lines: spec.teacher.lines,
        roomId: spec.id,
        roomName: spec.name,
        ...(spec.lessonId ? { lessonId: spec.lessonId } : {}),
        ...(spec.courseId ? { courseId: spec.courseId } : {}),

      });
    }
    interactables.push({
      id: `${spec.id}-sign`,
      x: doorX,
      y: y + h + 1,
      verb: "READ",
      label: `${spec.name} sign`,
      action: {
        kind: "read",
        title: spec.name,
        body: spec.teacher
          ? `${spec.name} — instructor ${spec.teacher.name}. Step inside and speak with the instructor to attend class.`
          : `${spec.name}. Open to all students.`,
      },
    });
  });

  const exitX = Math.floor(width / 2);
  g.set(exitX, height - 1, "door");
  g.rect(2, 14, 3, 1, "bench");
  g.rect(width - 5, 14, 3, 1, "bench");
  g.set(2, 15, "plant");
  g.set(width - 3, 15, "plant");

  interactables.push({
    id: `${opts.id}-exit`,
    x: exitX,
    y: height - 1,
    verb: "GO",
    label: "Leave the building",
    action: {
      kind: "travel",
      zone: opts.parent,
      spawnX: opts.parentSpawn.x,
      spawnY: opts.parentSpawn.y,
    },
  });

  if (opts.extraNpc) npcs.push(opts.extraNpc);

  return {
    id: opts.id,
    name: opts.name,
    kind: "interior",
    width,
    height,
    tiles: g.tiles,
    defaultSpawn: { x: exitX, y: height - 3 },
    mapPos: opts.mapPos,
    rooms,
    npcs,
    interactables,
    parentZone: opts.parent,
  };
}

function libraryZone(): ZoneMap {
  const g = new Grid(30, 20, "floor");
  g.border(0, 0, 30, 20, "wall");
  g.rect(3, 3, 24, 4, "floorAlt");
  for (let x = 3; x < 27; x += 3) g.rect(x, 3, 2, 4, "shelf");
  g.rect(2, 9, 3, 1, "counter");
  for (let x = 8; x <= 20; x += 6) {
    g.rect(x, 10, 3, 1, "table");
    g.set(x, 11, "chair");
    g.set(x + 2, 11, "chair");
    g.set(x, 9, "chair");
  }
  g.rect(24, 9, 4, 1, "computer");
  g.rect(3, 14, 6, 4, "floorAlt");
  g.border(3, 14, 6, 4, "wall");
  g.set(6, 14, "door");
  g.rect(20, 14, 8, 4, "floorAlt");
  g.border(20, 14, 8, 4, "wall");
  g.set(24, 14, "door");
  g.set(22, 16, "shelf");
  g.set(26, 16, "shelf");
  g.set(14, 19, "door");
  g.set(1, 18, "plant");
  g.set(28, 18, "plant");

  return {
    id: "university-library",
    name: "University Library",
    kind: "interior",
    width: 30,
    height: 20,
    tiles: g.tiles,
    defaultSpawn: { x: 14, y: 17 },
    mapPos: { x: 0.45, y: 0.15 },
    parentZone: "central-quad",
    rooms: [
      { id: "library-quiet", name: "Quiet Room", x: 3, y: 14, w: 6, h: 4 },
      { id: "library-archives", name: "Archives", x: 20, y: 14, w: 8, h: 4 },
      { id: "library-main", name: "Reading Room", x: 6, y: 8, w: 18, h: 5 },
    ],
    npcs: [
      {
        id: "librarian-teodora",
        x: 3,
        y: 10,
        name: "Teodora Ash",
        role: "Librarian",
        behavior: "read",
        lines: [
          "Quiet room is on your left, archives on your right. What are you researching today?",
          "Every course we teach is on the shelves here — and in your Workspace, if you prefer reading at a desk.",
        ],
        route: "/workspace",
        routeLabel: "BROWSE RESOURCES",
      },
    ],
    interactables: [
      {
        id: "lib-search",
        x: 25,
        y: 9,
        verb: "SEARCH",
        label: "Library Catalogue",
        action: { kind: "library" },
      },
      {
        id: "lib-study",
        x: 14,
        y: 10,
        verb: "STUDY",
        label: "Reading Table",
        action: { kind: "study" },
      },
      {
        id: "lib-archives",
        x: 22,
        y: 16,
        verb: "READ",
        label: "Archives",
        action: {
          kind: "read",
          title: "University Archives",
          body: "Bound records of every UNIFY course, unit, and assessment, filed by the same identifiers the Workspace uses. Nothing here is duplicated; it is one collection seen from two rooms.",
        },
      },
      {
        id: "lib-exit",
        x: 14,
        y: 19,
        verb: "GO",
        label: "Leave the Library",
        action: { kind: "travel", zone: "central-quad", spawnX: 20, spawnY: 6 },
      },
    ],
  };
}

function studentCenterZone(): ZoneMap {
  const g = new Grid(28, 18, "floor");
  g.border(0, 0, 28, 18, "wall");
  g.rect(2, 2, 10, 6, "rug");
  ([
    [3, 3],
    [6, 3],
    [9, 3],
  ] as const).forEach(([x, y]) => {
    g.set(x, y, "chair");
    g.set(x, y + 2, "table");
  });
  g.rect(16, 2, 10, 6, "floorAlt");
  g.rect(16, 3, 9, 1, "counter");
  for (let x = 17; x < 25; x += 3) {
    g.set(x, 6, "table");
    g.set(x, 7, "chair");
  }
  for (let x = 4; x < 22; x += 5) {
    g.rect(x, 11, 3, 1, "table");
    g.set(x, 12, "chair");
    g.set(x + 2, 12, "chair");
  }
  g.set(2, 15, "board");
  g.set(6, 15, "board");
  g.set(25, 15, "plant");
  g.set(14, 17, "door");

  return {
    id: "student-center",
    name: "Student Center",
    kind: "interior",
    width: 28,
    height: 18,
    tiles: g.tiles,
    defaultSpawn: { x: 14, y: 15 },
    mapPos: { x: 0.8, y: 0.3 },
    parentZone: "student-commons",
    rooms: [
      { id: "lounge", name: "Student Lounge", x: 2, y: 2, w: 10, h: 6 },
      { id: "cafeteria", name: "Cafeteria", x: 16, y: 2, w: 10, h: 6 },
    ],
    npcs: [
      {
        id: "student-kofi",
        x: 8,
        y: 12,
        name: "Kofi Mensah",
        role: "Student",
        behavior: "sit",
        lines: ["Grab a table. Most of us review knowledge checks together before class."],
      },
      {
        id: "student-lila",
        x: 19,
        y: 5,
        name: "Lila Fontaine",
        role: "Student",
        behavior: "idle",
        lines: ["The club board is by the door. Chess, robotics, choir, and a family study circle."],
      },
    ],
    interactables: [
      {
        id: "stc-clubs",
        x: 2,
        y: 15,
        verb: "READ",
        label: "Club Board",
        action: {
          kind: "read",
          title: "Clubs",
          body: "Chess Club — Tuesdays. Robotics — Wednesdays in the Computer Lab. Choir — Thursdays at the Arts Center. Family Study Circle — Sunday afternoons.",
        },
      },
      {
        id: "stc-events",
        x: 6,
        y: 15,
        verb: "READ",
        label: "Events Board",
        action: {
          kind: "read",
          title: "Events",
          body: "Pathway fair at the Career Center all week. Science night in the Discovery Hall. Writing workshop in the Humanities Studio.",
        },
      },
      {
        id: "stc-exit",
        x: 14,
        y: 17,
        verb: "GO",
        label: "Leave the Student Center",
        action: { kind: "travel", zone: "student-commons", spawnX: 8, spawnY: 10 },
      },
    ],
  };
}

function careerCenterZone(): ZoneMap {
  const g = new Grid(26, 16, "floor");
  g.border(0, 0, 26, 16, "wall");
  g.rect(2, 2, 22, 1, "board");
  g.rect(3, 6, 20, 1, "counter");
  g.set(12, 8, "desk");
  g.set(12, 9, "chair");
  for (let x = 3; x < 23; x += 4) g.set(x, 12, "board");
  g.set(1, 14, "plant");
  g.set(24, 14, "plant");
  g.set(13, 15, "door");

  return {
    id: "career-center",
    name: "Career Center",
    kind: "interior",
    width: 26,
    height: 16,
    tiles: g.tiles,
    defaultSpawn: { x: 13, y: 13 },
    mapPos: { x: 0.86, y: 0.6 },
    parentZone: "student-commons",
    rooms: [{ id: "career-hall", name: "Pathway Hall", x: 1, y: 1, w: 24, h: 14 }],
    npcs: [
      {
        id: "career-tam",
        x: 12,
        y: 10,
        name: "Tam Sorensen",
        role: "Career Advisor",
        behavior: "idle",
        lines: [
          "Careers are paths, not labels. Which field interests you?",
          "The LifePath boards cover healthcare, technology, construction, business, education, creative careers, entrepreneurship, and the trades.",
        ],
        route: "/campus/career",
        routeLabel: "EXPLORE CAREERS",
      },
    ],
    interactables: [
      {
        id: "cc-boards",
        x: 7,
        y: 12,
        verb: "EXPLORE",
        label: "Pathway Displays",
        action: { kind: "route", to: "/campus/career" },
      },
      {
        id: "cc-exit",
        x: 13,
        y: 15,
        verb: "GO",
        label: "Leave the Career Center",
        action: { kind: "travel", zone: "student-commons", spawnX: 21, spawnY: 10 },
      },
    ],
  };
}

function administrationZone(): ZoneMap {
  const g = new Grid(26, 16, "floor");
  g.border(0, 0, 26, 16, "wall");
  const offices = [
    { id: "admissions", name: "Admissions", x: 1 },
    { id: "registrar", name: "Registrar", x: 7 },
    { id: "advising", name: "Academic Advising", x: 13 },
    { id: "family-services", name: "Family Services", x: 19 },
  ];
  offices.forEach((o) => {
    g.border(o.x, 1, 6, 7, "wall");
    g.rect(o.x + 1, 2, 4, 5, "floorAlt");
    g.set(o.x + 3, 7, "door");
    g.set(o.x + 2, 3, "desk");
    g.set(o.x + 4, 3, "shelf");
  });
  g.rect(2, 11, 3, 1, "bench");
  g.rect(21, 11, 3, 1, "bench");
  g.set(13, 15, "door");

  return {
    id: "administration",
    name: "Administration",
    kind: "interior",
    width: 26,
    height: 16,
    tiles: g.tiles,
    defaultSpawn: { x: 13, y: 13 },
    mapPos: { x: 0.1, y: 0.68 },
    parentZone: "welcome-plaza",
    rooms: offices.map((o) => ({ id: o.id, name: o.name, x: o.x, y: 1, w: 6, h: 7 })),
    npcs: [
      {
        id: "admissions-june",
        x: 4,
        y: 5,
        name: "Priya Raman",
        role: "Admissions",
        behavior: "idle",
        lines: ["Welcome to UNIFY. Your enrolment is active and your courses are already assigned."],
      },
      {
        id: "registrar-owen",
        x: 10,
        y: 5,
        name: "Owen Blackwood",
        role: "Registrar",
        behavior: "idle",
        lines: ["I can pull up your transcript whenever you need it."],
        route: "/workspace/transcript",
        routeLabel: "VIEW TRANSCRIPT",
      },
      {
        id: "advisor-nadia",
        x: 16,
        y: 5,
        name: "Nadia Whitfield",
        role: "Academic Advisor",
        behavior: "idle",
        lines: ["Let us look at your academic plan together and see what comes next."],
        route: "/workspace/plan",
        routeLabel: "VIEW ACADEMIC PLAN",
      },
      {
        id: "family-services",
        x: 22,
        y: 5,
        name: "Grace Odum",
        role: "Family Services",
        behavior: "idle",
        lines: ["Families learn together here. Ask me about adding a learner to your household."],
      },
    ],
    interactables: [
      {
        id: "admin-exit",
        x: 13,
        y: 15,
        verb: "GO",
        label: "Leave Administration",
        action: { kind: "travel", zone: "welcome-plaza", spawnX: 5, spawnY: 14 },
      },
    ],
  };
}

function personalSpaceZone(): ZoneMap {
  const g = new Grid(18, 14, "floor");
  g.border(0, 0, 18, 14, "wall");
  g.rect(4, 4, 10, 6, "rug");
  g.rect(2, 2, 2, 3, "bed");
  g.set(7, 2, "desk");
  g.set(8, 2, "computer");
  g.set(7, 3, "chair");
  g.rect(12, 2, 2, 1, "shelf");
  g.set(16, 2, "shelf");
  g.set(15, 12, "plant");
  g.set(2, 11, "table");
  g.set(3, 11, "chair");
  g.set(11, 1, "board");
  g.set(9, 13, "door");

  return {
    id: "personal-space",
    name: "Personal Student Space",
    kind: "interior",
    width: 18,
    height: 14,
    tiles: g.tiles,
    defaultSpawn: { x: 9, y: 11 },
    mapPos: { x: 0.08, y: 0.9 },
    parentZone: "welcome-plaza",
    rooms: [{ id: "dorm-room", name: "Your Room", x: 1, y: 1, w: 16, h: 12 }],
    npcs: [],
    interactables: [
      {
        id: "ps-computer",
        x: 8,
        y: 2,
        verb: "OPEN",
        label: "Computer",
        action: { kind: "workspace" },
      },
      {
        id: "ps-shelf",
        x: 12,
        y: 2,
        verb: "OPEN",
        label: "Bookshelf",
        action: { kind: "library" },
      },
      { id: "ps-desk", x: 7, y: 2, verb: "STUDY", label: "Desk", action: { kind: "study" } },
      {
        id: "ps-wall",
        x: 11,
        y: 1,
        verb: "VIEW",
        label: "Achievement Wall",
        action: { kind: "achievements" },
      },
      {
        id: "ps-bed",
        x: 3,
        y: 3,
        verb: "REST",
        label: "Bed",
        action: {
          kind: "read",
          title: "A short rest",
          body: "You stretch out for a few minutes. The campus is still there when you get up, and so is your place in every lesson.",
        },
      },
      {
        id: "ps-door",
        x: 9,
        y: 13,
        verb: "GO",
        label: "Go to campus",
        action: { kind: "travel", zone: "welcome-plaza", spawnX: 4, spawnY: 23 },
      },
    ],
  };
}

/* --------------------------------- registry -------------------------------- */

const builders: Record<string, () => ZoneMap> = {
  "welcome-plaza": welcomePlaza,
  "central-quad": centralQuad,
  "student-commons": studentCommons,
  "study-gardens": studyGardens,
  "university-library": libraryZone,
  "student-center": studentCenterZone,
  "career-center": careerCenterZone,
  administration: administrationZone,
  "personal-space": personalSpaceZone,
  "math-tech-hall": () =>
    academicHall({
      id: "math-tech-hall",
      name: "Mathematics & Technology Hall",
      parent: "central-quad",
      parentSpawn: { x: 8, y: 10 },
      mapPos: { x: 0.2, y: 0.2 },
      rooms: [
        {
          id: "algebra-101",
          name: "Algebra 101",
          courseId: "foundations-algebra",
          lessonId: "algebra-lesson-1",
          teacher: {
            id: "prof-idris",
            name: "Professor Idris Vale",
            lines: [
              "Algebra begins with one idea: a letter can stand for a number.",
              "Ready to work through variables and expressions?",
            ],
          },
        },
        {
          id: "algebra-204",
          name: "Algebra 204",
          courseId: "foundations-algebra",
          lessonId: "algebra-lesson-2",
          teacher: {
            id: "prof-maya",
            name: "Professor Maya Ellison",
            lines: [
              "Welcome back. Are you ready for today's lesson?",
              "Order of operations. Everyone thinks they know it until the exponents show up.",
            ],
          },
        },
        {
          id: "algebra-102",
          name: "Algebra 102",
          courseId: "foundations-algebra",
          lessonId: "algebra-lesson-3",
          teacher: {
            id: "prof-lena",
            name: "Professor Lena Marsh",
            lines: [
              "Balance both sides and the answer takes care of itself.",
              "Today we solve one-step equations.",
            ],
          },
        },
        { id: "computer-lab", name: "Computer Lab", furniture: "computers" },
        { id: "math-study-room", name: "Study Room", furniture: "soft" },
      ],
    }),
  "science-hall": () =>
    academicHall({
      id: "science-hall",
      name: "Science & Discovery Hall",
      parent: "central-quad",
      parentSpawn: { x: 31, y: 10 },
      mapPos: { x: 0.72, y: 0.2 },
      rooms: [
        {
          id: "science-classroom",
          name: "Science Classroom",
          courseId: "intro-life-science",
          lessonId: "science-lesson-1",
          teacher: {
            id: "prof-hale",
            name: "Professor Sam Hale",
            lines: [
              "Here is a hard question to start with: what makes something alive?",
              "Take a seat and we will build the list together.",
            ],
          },
        },
        {
          id: "biology-lab",
          name: "Biology Lab",
          furniture: "lab",
          courseId: "intro-life-science",
          lessonId: "science-lesson-2",
          teacher: {
            id: "prof-park",
            name: "Professor Yuna Park",
            lines: [
              "Put on the goggles. Today the cell gets taken apart.",
              "Prokaryote or eukaryote — by the end of this you will tell them apart instantly.",
            ],
          },
        },
        {
          id: "laboratory",
          name: "Laboratory",
          furniture: "lab",
          courseId: "intro-life-science",
          lessonId: "science-lesson-3",
          teacher: {
            id: "prof-reyes",
            name: "Professor Marco Reyes",
            lines: [
              "Everything in an ecosystem is connected. Let us trace the energy.",
              "Bring your food web sketch when you are ready.",
            ],
          },
        },
      ],
    }),
  "humanities-hall": () =>
    academicHall({
      id: "humanities-hall",
      name: "Humanities Hall",
      parent: "central-quad",
      parentSpawn: { x: 8, y: 28 },
      mapPos: { x: 0.2, y: 0.78 },
      rooms: [
        {
          id: "history-101",
          name: "History 101",
          courseId: "world-civilizations",
          lessonId: "history-lesson-1",
          teacher: {
            id: "prof-cole",
            name: "Professor Anton Cole",
            lines: [
              "Before we can study civilizations, we need to agree on what one is.",
              "Shall we begin?",
            ],
          },
        },
        {
          id: "literature-seminar",
          name: "Literature Seminar",
          furniture: "soft",
          courseId: "world-civilizations",
          lessonId: "history-lesson-2",
          teacher: {
            id: "prof-ines",
            name: "Professor Ines Barros",
            lines: [
              "Four rivers, four beginnings. Shall we compare them?",
              "Bring your chart; we will fill it as we read.",
            ],
          },
        },
        {
          id: "writing-studio",
          name: "Writing Studio",
          furniture: "soft",
          courseId: "world-civilizations",
          lessonId: "history-lesson-3",
          teacher: {
            id: "prof-nkem",
            name: "Professor Nkem Aduba",
            lines: [
              "Egypt lasted three thousand years. Let us find out why.",
              "We will write as we go, so keep your notes close.",
            ],
          },
        },
      ],
    }),
  "arts-center": () =>
    academicHall({
      id: "arts-center",
      name: "Arts & Creative Center",
      parent: "central-quad",
      parentSpawn: { x: 31, y: 28 },
      mapPos: { x: 0.72, y: 0.78 },
      rooms: [
        { id: "art-studio", name: "Art Studio", furniture: "soft" },
        { id: "music-room", name: "Music Room", furniture: "soft" },
        { id: "recital-hall", name: "Recital Hall", furniture: "desks" },
      ],
      extraNpc: {
        id: "arts-wren",
        x: 13,
        y: 14,
        name: "Wren Alonso",
        role: "Student",
        behavior: "idle",
        lines: ["North light in the studio all afternoon. Best drawing hours on campus."],
      },
    }),
};

const cache = new Map<string, ZoneMap>();

export function getZone(id: string): ZoneMap {
  const cached = cache.get(id);
  if (cached) return cached;
  const build = builders[id] ?? builders["welcome-plaza"]!;
  const zone = build();
  cache.set(zone.id, zone);
  return zone;
}

export const ZONE_IDS = Object.keys(builders);

export const ZONE_LABELS: Record<string, string> = {
  "welcome-plaza": "Welcome Plaza",
  "central-quad": "Central Quad",
  "student-commons": "Student Commons",
  "study-gardens": "Outdoor Study Gardens",
  "university-library": "University Library",
  "student-center": "Student Center",
  "career-center": "Career Center",
  administration: "Administration",
  "personal-space": "Personal Student Space",
  "math-tech-hall": "Mathematics & Technology Hall",
  "science-hall": "Science & Discovery Hall",
  "humanities-hall": "Humanities Hall",
  "arts-center": "Arts & Creative Center",
};

export function zoneIsSolidAt(zone: ZoneMap, tx: number, ty: number): boolean {
  if (tx < 0 || ty < 0 || tx >= zone.width || ty >= zone.height) return true;
  return isSolid(zone.tiles[ty]![tx]!);
}
