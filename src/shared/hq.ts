/** HQ bridge: the admin apps (hq.html, staff.html, customize.html, curriculum-builder.html, academy-control.html) write
 *  localStorage keys `unify.hq.staff` (teacher/character array), `unify.hq.rooms` ({roomId:{theme,props,wallColor,floorStyle,deskLayout}})
 *  and `unify.hq.lessons` (curriculum lessons). This module lets the main 3D/2D apps APPLY those overrides: teacher identity/personality/voice
 *  per subject, room wall/floor/theme colours and decorations, and the newest assigned lesson taught in class. Everything is optional and
 *  guarded: with no HQ data the defaults are exactly what they always were. */
import * as THREE from "three";
import { TEACHER_BY_SUBJECT, PERSONALITIES, type NpcDef, type Subj } from "../hall3d/roster";
import { PERSONAS, type Emotion } from "../class3d/persona";
import { FACULTY_BY_ID } from "../hall3d/faculty";

/* ------------------------------------------------------------------ guarded storage */
const K_STAFF = "unify.hq.staff", K_ROOMS = "unify.hq.rooms", K_LESSONS = "unify.hq.lessons";
const K_PACKS = "unify.packs.v1", K_VOICE_MAP = "unify.voice.map.v1", K_DORM = "unify.dorm.v1";
function lsGet(key: string): unknown { try { const s = localStorage.getItem(key); return s == null ? null : JSON.parse(s); } catch { return null; } }
function lsSet(key: string, v: unknown): boolean { try { localStorage.setItem(key, JSON.stringify(v)); return true; } catch { return false; } }

export interface HqStaff { id?: string; role?: string; name?: string; subject?: string; classroomId?: string; personality?: string; traits?: string[]; quirk?: string; bio?: string; gender?: "F" | "M"; voice?: { pitch?: number; rate?: number; timbre?: string }; avatar?: { skin?: string; hair?: string; hairStyle?: string }; }
export interface HqRoom { theme?: string; props?: string[]; wallColor?: string; floorStyle?: string; deskLayout?: string }
export interface HqSegment { name?: string; minutes?: number; activity?: string; gesture?: string; expression?: string; media?: string }
export interface HqLesson {
  id?: string; title?: string; gradeBand?: string; subject?: string; topic?: string; durationMin?: number;
  objectives?: string[]; vocabulary?: { term?: string; def?: string }[]; resources?: unknown[]; segments?: HqSegment[];
  questions?: string[]; homework?: string; extraCredit?: string; teacherId?: string;
  delivery?: { traits?: string[]; guidelines?: string; engagement?: string[] }; assigned?: boolean; created?: number | string;
}

export function hqStaff(): HqStaff[] { const v = lsGet(K_STAFF); return Array.isArray(v) ? v.filter((x) => x && typeof x === "object") : []; }
export function hqRooms(): Record<string, HqRoom> { const v = lsGet(K_ROOMS); return v && typeof v === "object" && !Array.isArray(v) ? v as Record<string, HqRoom> : {}; }
export function hqRoom(roomId: string): HqRoom | null { const r = hqRooms()[roomId]; return r && typeof r === "object" ? r : null; }
export function hqLessons(): HqLesson[] { const v = lsGet(K_LESSONS); return Array.isArray(v) ? v.filter((x) => x && typeof x === "object") : []; }

const HEX = /^#[0-9a-fA-F]{6}$/;
export const hqColor = (v: unknown): string | null => typeof v === "string" && HEX.test(v.trim()) ? v.trim() : null;
/** darken/lighten a "#rrggbb" colour by f in [-1,1] (for deriving trims/backgrounds from an admin-picked colour) */
export function hqShade(hex: string, f: number): string {
  const n = parseInt(hex.slice(1), 16); const c = (s: number) => { const v = s + (f < 0 ? s * f : (255 - s) * f); return Math.round(Math.max(0, Math.min(255, v))); };
  return "#" + [c(n >> 16), c((n >> 8) & 255), c(n & 255)].map((v) => v.toString(16).padStart(2, "0")).join("");
}

/* ------------------------------------------------------------------ subjects */
const SUBJ_BY_NAME: Record<string, Subj> = {
  math: "math", mathematics: "math", algebra: "math", geometry: "math",
  english: "ela", ela: "ela", reading: "ela", "english & creative writing": "ela", "english literature": "ela", writing: "ela", drama: "ela",
  science: "science", chemistry: "science", physics: "science", biology: "science", computers: "science", "computer science": "science",
  history: "history", "social studies": "history",
  geography: "careers", careers: "careers", "geography & careers": "careers", carryingcareers: "careers",
  life: "life", "life lessons": "life", homeroom: "life", art: "life", music: "life", pe: "life",
};
/** map an HQ subject label ("Math", "English", "Geography", ...) to a main-app Subj key; unknown → "life" */
export function hqSubjectOf(label: unknown): Subj { const k = String(label ?? "").trim().toLowerCase(); return SUBJ_BY_NAME[k] ?? "life"; }
/** classroom/room ids used by the admin apps, mapped to the subject taught there */
const ROOM_TO_SUBJ: Record<string, Subj> = {
  "room 112": "math", "room-112": "math", "room 220": "ela", "room-220": "ela", "lab 204": "science", "lab-204": "science",
  "room 301": "history", "room-301": "history", "lab 110": "science", "lab-110": "science", "room 215": "ela", "room-215": "ela",
  carryingcareers: "careers", "life lessons": "life",
};
const FACULTY_SUBJ: Record<string, Subj> = { tanaka: "math", ayrissa: "ela", raman: "ela", okafor: "science", park: "science", obrien: "history", haddad: "careers", larsen: "life" };

/** the HQ staff entry that should teach this subject, or null. Matches by subject label, classroomId/room, or canonical teacher id. */
export function hqTeacherFor(subj: Subj): HqStaff | null {
  const staff = hqStaff().filter((s) => String(s.role ?? "teacher").toLowerCase() !== "student" && s.name);
  const score = (s: HqStaff): number => {
    let sc = 0;
    if (s.subject != null && hqSubjectOf(s.subject) === subj) sc = Math.max(sc, 3);
    const room = String(s.classroomId ?? "").trim().toLowerCase();
    if (room && ROOM_TO_SUBJ[room] === subj) sc = Math.max(sc, 4);
    const id = String(s.id ?? "").trim().toLowerCase();
    if (id && FACULTY_SUBJ[id] === subj) sc = Math.max(sc, 5);
    return sc;
  };
  let best: HqStaff | null = null, bs = 0;
  for (const s of staff) { const sc = score(s); if (sc > bs) { bs = sc; best = s; } }
  return best;
}

/* ------------------------------------------------------------------ teacher overrides */
const clampN = (v: unknown, a: number, b: number) => typeof v === "number" && isFinite(v) ? Math.max(a, Math.min(b, v)) : null;
function personaKeyFor(s: HqStaff): string | null {
  const cand = [String(s.personality ?? "").split(/[—–-]/)[0].trim().toLowerCase(), ...(Array.isArray(s.traits) ? s.traits.map((t) => String(t).toLowerCase()) : [])];
  for (const c of cand) if ((PERSONALITIES as readonly string[]).includes(c) || PERSONAS[c]) return c;
  return null;
}
/** mutate TEACHER_BY_SUBJECT from unify.hq.staff: name/first, personality, quirk/bio, look (skin/hair), voice (pitch/rate) — and make the
 *  saved device-voice choice re-pick by clearing the teacher's entry in unify.voice.map.v1. Returns the subjects that changed. */
export function applyTeacherOverrides(): Subj[] {
  const changed: Subj[] = [];
  try {
    for (const subj of Object.keys(TEACHER_BY_SUBJECT) as Subj[]) {
      const s = hqTeacherFor(subj); if (!s) continue;
      const d: NpcDef = TEACHER_BY_SUBJECT[subj]; let touched = false;
      const name = String(s.name ?? "").trim();
      if (name && name !== d.name) { d.name = name.slice(0, 60); d.first = name.split(" ").pop()!.slice(0, 24); touched = true; }
      const pk = personaKeyFor(s);
      if (pk && (PERSONALITIES as readonly string[]).includes(pk) && pk !== d.personality) { d.personality = pk as NpcDef["personality"]; touched = true; }
      if (s.quirk && s.quirk !== d.quirk) { d.quirk = String(s.quirk).slice(0, 200); touched = true; }
      const bio = s.bio ?? (s.personality && s.personality.includes("—") ? s.personality : null);
      if (bio && bio !== d.bio) { d.bio = String(bio).slice(0, 400); touched = true; }
      const skin = hqColor(s.avatar?.skin), hair = hqColor(s.avatar?.hair), hs = typeof s.avatar?.hairStyle === "string" ? s.avatar.hairStyle : null;
      if (skin) { (d.spec as any).skin = skin; (d.look as any).skin = skin; touched = true; }
      if (hair) { (d.spec as any).hair = hair; (d.look as any).hair = hair; touched = true; }
      if (hs) { (d.spec as any).hairStyle = hs; (d.look as any).style = hs; touched = true; }
      if ((s.gender === "F" || s.gender === "M") && d.faculty && FACULTY_BY_ID[d.faculty]) { FACULTY_BY_ID[d.faculty].gender = s.gender; touched = true; }
      const pitch = clampN(s.voice?.pitch, 0.5, 2), rate = clampN(s.voice?.rate, 0.5, 2);
      if (pitch != null || rate != null) {
        const key = d.faculty ?? d.personality, p = PERSONAS[key];
        if (p) { p.voice = { pitch: pitch ?? p.voice.pitch, rate: rate ?? p.voice.rate }; }
        // clear the saved device-voice pick so the new person gets a fresh, distinct voice
        try { const m = JSON.parse(localStorage.getItem(K_VOICE_MAP) || "{}"); if (m && typeof m === "object" && m[String(d.id)]) { delete m[String(d.id)]; localStorage.setItem(K_VOICE_MAP, JSON.stringify(m)); } } catch { /* private mode */ }
        touched = true;
      }
      if (touched) changed.push(subj);
    }
  } catch (e) { console.warn("[hq] teacher overrides skipped:", e); }
  return changed;
}

/* ------------------------------------------------------------------ lessons → curriculum packs */
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "x";
const HQ_GESTURES = new Set(["cheer", "clap", "headhands", "shrug", "crossed", "wave", "chin", "facepalm", "explain", "finger", "point"]);
const HQ_MOODS = new Set(["neutral", "smile", "joy", "frown", "upset", "frustrated", "surprised", "thinking", "stern"]);
const txt = (v: unknown, max = 400) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);
const txts = (v: unknown, n: number, max = 300) => (Array.isArray(v) ? v.map((x) => txt(x, max)).filter(Boolean).slice(0, n) : []);

/** the lesson the owner most recently assigned to a class (assigned=true, newest `created` wins) */
export function hqAssignedLesson(): HqLesson | null {
  const ls = hqLessons().filter((l) => l.assigned === true && txt(l.title));
  if (!ls.length) return null;
  const ts = (l: HqLesson) => { const c = l.created; const n = typeof c === "number" ? c : Date.parse(String(c ?? "")); return isFinite(n) ? n : 0; };
  return ls.sort((a, b) => ts(b) - ts(a))[0];
}

/** translate one HQ curriculum lesson into the exact pack format src/class3d/packs.ts accepts (validated by cleanPack on load). */
export function hqLessonToPack(lesson: HqLesson) {
  const subject = hqSubjectOf(lesson.subject), title = txt(lesson.title, 100) || "HQ Lesson", topic = txt(lesson.topic, 120);
  const objectives = txts(lesson.objectives, 6), segs = (Array.isArray(lesson.segments) ? lesson.segments : []).filter((s) => s && txt(s.name ?? s.activity)).slice(0, 12);
  const d = lesson.delivery ?? {}, traits = txts(d.traits, 5, 40), guidelines = txt(d.guidelines, 300), engage = txts(d.engagement, 4, 120);
  // intro: what the class will be able to do by the end (from the objectives)
  const intro = objectives.length ? `By the end of this lesson you will be able to: ${objectives.map((o) => o.replace(/\.$/, "")).join("; ")}.` : `Today's lesson: ${title}.`;
  // a teaching-style preamble, phrased the way a teacher would actually say it (not a verbatim settings dump)
  const preamble: string[] = [];
  if (traits.length) preamble.push(`A quick word about how I teach: around here we keep things ${traits.slice(0, 3).join(", ")} — so come ready for that.`);
  if (guidelines) preamble.push(`One thing before we start: ${guidelines.replace(/\.$/, "")}.`);
  if (engage.length) preamble.push(`I'll keep you involved: ${engage.slice(0, 2).join(", ").replace(/\.$/, "")}.`);
  // key points: one per segment, with the media woven in
  const points = segs.map((s) => `${txt(s.name, 60)} — ${txt(s.activity, 200)}${s.media ? ` (using ${txt(s.media, 60)})` : ""}`);
  // the performed script: preamble, then each segment spoken with its own gesture/expression, then the questions
  const script: Record<string, unknown>[] = [];
  for (const p of preamble) script.push({ say: p, mood: "smile" });
  script.push({ board: { side: "left", title, lines: points.slice(0, 8) } });
  for (const s of segs) {
    const step: Record<string, unknown> = { say: `${txt(s.name, 60)}. ${txt(s.activity, 300)}${s.media ? ` — watch the ${txt(s.media, 60)} for this part.` : ""}` };
    const g = String(s.gesture ?? "").toLowerCase(); if (HQ_GESTURES.has(g)) step.gesture = g;
    const m = String(s.expression ?? "").toLowerCase(); if (HQ_MOODS.has(m)) step.mood = m as Emotion;
    script.push(step);
  }
  for (const q of txts(lesson.questions, 4, 240)) { script.push({ say: q, mood: "thinking", gesture: "chin" }); script.push({ ask: true }); }
  // vocabulary, homework (+ extra credit)
  const glossary: Record<string, string> = {};
  for (const v of Array.isArray(lesson.vocabulary) ? lesson.vocabulary.slice(0, 12) : []) { const t = txt(v?.term, 40), df = txt(v?.def, 300); if (t && df) glossary[t] = df; }
  let homework = txt(lesson.homework, 300); const ec = txt(lesson.extraCredit, 200);
  if (ec) homework = homework ? `${homework} Extra credit: ${ec}` : `Extra credit: ${ec}`;
  return {
    id: "hq-" + slug(txt(lesson.id, 40) || title), title: `${title} (HQ)`, subject, kind: "regular" as const,
    grades: txt(lesson.gradeBand, 40) || undefined, course: topic || undefined,
    lessons: [{
      id: slug(txt(lesson.id, 40) || title), title, blurb: [topic, lesson.durationMin ? `~${Math.max(1, Math.round(Number(lesson.durationMin) || 0))} min` : ""].filter(Boolean).join(" · ") || undefined,
      intro, points: points.length ? points : [title], examples: objectives.length ? objectives.slice(0, 4) : points.slice(0, 2),
      wrap: `We covered ${topic || title}. ${objectives[0] ? "Remember: " + objectives[0].replace(/\.$/, "") + "." : ""}`.trim(),
      homework: homework || undefined, glossary, script,
    }],
  };
}

/** install the newest assigned HQ lesson into the curriculum packs store (`unify.packs.v1`), replacing any previous HQ pack with the same id
 *  (so reloads never duplicate it). Returns the pack that was written, or null when nothing is assigned. */
export function installHqLessonPack(): ReturnType<typeof hqLessonToPack> | null {
  try {
    const lesson = hqAssignedLesson(); if (!lesson) return null;
    const pack = hqLessonToPack(lesson);
    const arr = lsGet(K_PACKS); const list = (Array.isArray(arr) ? arr : []).filter((p: any) => p && p.id !== pack.id);
    list.push(pack);
    if (!lsSet(K_PACKS, list)) return null;
    return pack;
  } catch (e) { console.warn("[hq] lesson pack skipped:", e); return null; }
}

/* ------------------------------------------------------------------ room decor helpers */
/** emoji for the admin apps' known prop ids (customize.html / academy-control.html lists) */
export const HQ_PROP_EMOJI: Record<string, string> = {
  plants: "🪴", plant: "🪴", posters: "🖼️", poster: "🖼️", bookshelf: "📚", books: "📚", rug: "🟫", globe: "🌍",
  "fairy lights": "✨", fairylights: "✨", lights: "✨", "trophy shelf": "🏆", trophy: "🏆", trophies: "🏆",
  aquarium: "🐠", fish: "🐠", readingcorner: "🛋️", "reading corner": "🛋️", whiteboard: "⬜",
};
/** a tiny emoji billboard sprite (canvas texture) for a room prop */
export function hqEmojiSprite(emoji: string, h = 1.4): THREE.Sprite {
  const cv = document.createElement("canvas"); cv.width = cv.height = 128;
  const c = cv.getContext("2d")!; c.font = "96px 'Apple Color Emoji','Segoe UI Emoji',sans-serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(emoji, 64, 72);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true })); sp.scale.set(h, h, 1); return sp;
}
/** place known HQ props as emoji sprites at the given spots (cycles spots if there are more props); unknown props are logged, never fatal */
export function hqPlaceProps(scene: THREE.Object3D, roomId: string, spots: [number, number, number][], h = 1.4): number {
  const r = hqRoom(roomId); const props = Array.isArray(r?.props) ? r!.props! : [];
  let placed = 0;
  props.forEach((p, i) => {
    const e = HQ_PROP_EMOJI[String(p).toLowerCase().trim()];
    if (!e || !spots.length) { if (!e) console.info(`[hq] no decoration for prop "${p}" in ${roomId} (colour/theme overrides still apply)`); return; }
    const [x, y, z] = spots[i % spots.length]; const sp = hqEmojiSprite(e, h); sp.position.set(x, y, z); scene.add(sp); placed++;
  });
  return placed;
}
/** theme → default wall colour (used when the admin set a theme but no explicit wall colour) */
export const HQ_THEME_WALL: Record<string, string> = { classic: "#F7ECD6", nature: "#DCE8CE", space: "#D8DCEC", art: "#F6E3D4", cozy: "#EBDCC8", sports: "#DDE8F2" };
/** theme → hallway locker palettes */
export const HQ_THEME_LOCKERS: Record<string, string[]> = {
  nature: ["#9fd0b0", "#7fb2a0", "#b8d8a8", "#8fc9c4", "#a9dcc0", "#88b89a", "#c9e0b0", "#7cb6a0"],
  space: ["#7f92d6", "#9fa2da", "#6a7fc0", "#b8a8da", "#8fc9e8", "#a0b8e0", "#c0b8e8", "#7a8ac8"],
  art: ["#f2a79b", "#f4d488", "#9fd0b0", "#8fc9e8", "#e9a0c0", "#f6b294", "#b8a8da", "#eab94e"],
  cozy: ["#c9a36b", "#b8905a", "#d8b88a", "#a8865a", "#c98569", "#b8a08a", "#d0a878", "#9a7a5a"],
  sports: ["#7fb2d6", "#e07a66", "#f4d488", "#88b89a", "#4f91c7", "#d9564a", "#eab94e", "#5e9c72"],
};
/** wall colour for an HQ room: explicit wallColor first, then a theme default */
export function hqRoomWall(roomId: string): string | null {
  const r = hqRoom(roomId); if (!r) return null;
  return hqColor(r.wallColor) ?? HQ_THEME_WALL[String(r.theme ?? "").toLowerCase()] ?? null;
}

/* ------------------------------------------------------------------ dorm write-through */
const DORM_WALL_PAT: Record<string, string> = { classic: "plain", nature: "stripes", space: "dots", art: "dots", cozy: "plain", sports: "brick" };
const DORM_FLOOR_PAT: Record<string, string> = { wood: "wood", tile: "tile", checker: "tile", terrazzo: "tile", carpet: "carpet", grass: "carpet" };
/** translate unify.hq.rooms.dorm {wallColor,floorStyle,theme} into the dorm layout theme (src/dorm/room.ts) and write it to unify.dorm.v1,
 *  so the next loadLocal()/sanitizeLayout() picks it up. Call BEFORE the dorm page reads its saved layout. */
export function applyHqDormTheme(): boolean {
  try {
    const r = hqRoom("dorm"); if (!r) return false;
    const theme = String(r.theme ?? "").toLowerCase(), wallC = hqColor(r.wallColor), floorC = hqColor((r as any).floorColor);
    const wallPat = DORM_WALL_PAT[theme] ?? "plain", floorPat = DORM_FLOOR_PAT[String(r.floorStyle ?? "").toLowerCase()] ?? null;
    if (!wallC && !floorPat && !HQ_THEME_WALL[theme]) return false;
    const cur = lsGet(K_DORM); const layout = cur && typeof cur === "object" && !Array.isArray(cur) ? { ...(cur as any) } : { v: 1 };
    const th = { ...((layout as any).theme && typeof (layout as any).theme === "object" ? (layout as any).theme : {}) };
    const baseWall = typeof th.wall === "string" && HEX.test(th.wall.split("|")[0]) ? th.wall.split("|")[0] : "#4FB6B2";
    const baseFloorC = typeof th.floor === "string" && HEX.test(th.floor.split("|")[0]) ? th.floor.split("|")[0] : "#C98F58";
    th.wall = `${wallC ?? HQ_THEME_WALL[theme] ?? baseWall}|${wallPat}`;
    if (floorPat) th.floor = `${floorC ?? baseFloorC}|${floorPat}`;
    (layout as any).theme = th; (layout as any).v = 1;
    return lsSet(K_DORM, layout);
  } catch (e) { console.warn("[hq] dorm theme skipped:", e); return false; }
}

/* ------------------------------------------------------------------ live updates */
/** subscribe to HQ writes: cross-tab `storage` events (filtered to unify.hq.*) and the same-tab `unify-hq-update` CustomEvent.
 *  Default callback reloads the page so every override re-applies cleanly. Returns an unsubscribe function. */
export function onHqChange(cb: (key: string) => void = () => location.reload()): () => void {
  if (typeof window === "undefined") return () => {};
  const onStorage = (e: StorageEvent) => { if (!e.key || e.key.startsWith("unify.hq.")) cb(e.key ?? "unify.hq"); };
  const onCustom = (e: Event) => { const k = (e as CustomEvent).detail?.key; cb(typeof k === "string" ? k : "unify.hq"); };
  window.addEventListener("storage", onStorage);
  window.addEventListener("unify-hq-update", onCustom);
  return () => { window.removeEventListener("storage", onStorage); window.removeEventListener("unify-hq-update", onCustom); };
}
