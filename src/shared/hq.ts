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
const txts = (v: unknown, n: number, max = 300) => (Array.isArray(v) ? v.map((x) => txt(x, max)).filter(Boolean) : []).slice(0, n);

/** newest assigned HQ lesson, or null */
export function hqAssignedLesson(): HqLesson | null {
  const ls = hqLessons().filter((l) => l.assigned && l.title);
  if (!ls.length) return null;
  const stamp = (l: HqLesson) => { const c = l.created; const t = typeof c === "number" ? c : Date.parse(String(c ?? "")); return isFinite(t as number) ? t as number : 0; };
  return ls.sort((a, b) => stamp(b) - stamp(a))[0];
}

/** translate an HQ lesson into the packs.ts pack format (best-effort; missing fields get sensible fallbacks) */
export function hqLessonToPack(l: HqLesson): unknown {
  const teacher = hqTeacherFor(hqSubjectOf(l.subject));
  const name = txt(l.title || l.topic || "HQ lesson", 80);
  const segs = (Array.isArray(l.segments) ? l.segments : []).map((s) => ({
    title: txt(s.name || "Segment", 60),
    minutes: typeof s.minutes === "number" && s.minutes > 0 ? Math.min(60, s.minutes) : 5,
    say: txt(s.activity || "", 600),
    gesture: HQ_GESTURES.has(String(s.gesture)) ? s.gesture : "explain",
    mood: HQ_MOODS.has(String(s.expression)) ? s.expression : "neutral",
    media: txt(s.media || "", 120) || undefined,
  }));
  return {
    id: "hq-" + slug(l.id || name), title: name, subject: l.subject || "", gradeBand: l.gradeBand || "",
    teacher: teacher?.name || undefined,
    objectives: txts(l.objectives, 8),
    vocabulary: (Array.isArray(l.vocabulary) ? l.vocabulary : []).slice(0, 20).map((v) => ({ term: txt(v?.term, 60), def: txt(v?.def, 240) })).filter((v) => v.term),
    script: segs.length ? segs : [{ title: "Lesson", minutes: 15, say: txt(l.topic || name, 600), gesture: "explain", mood: "neutral" }],
    questions: txts(l.questions, 10),
    homework: txt(l.homework || "", 400) || undefined,
    extraCredit: txt(l.extraCredit || "", 400) || undefined,
  };
}

/** install the newest assigned HQ lesson as a curriculum pack (unify.packs.v1) so the classroom picks it up. Returns the pack id or null. */
export function installHqLessonPack(): string | null {
  const l = hqAssignedLesson(); if (!l) return null;
  try {
    const pack = hqLessonToPack(l) as { id: string };
    const cur = lsGet(K_PACKS); const arr = Array.isArray(cur) ? cur.filter((p) => p && (p as { id?: string }).id !== pack.id) : [];
    arr.unshift(pack);
    lsSet(K_PACKS, arr.slice(0, 50));
    return pack.id;
  } catch { return null; }
}

/* ------------------------------------------------------------------ room décor helpers (3D scenes) */
export const HQ_THEME_LOCKERS: Record<string, string> = {
  ocean: "#3D7A9E", forest: "#4E8A64", sunset: "#E07A66", candy: "#D9789E", royal: "#6A5FA8", sunshine: "#D9A13B", mint: "#6FA89B", berry: "#8A4E6E",
};
export const HQ_PROP_EMOJI: Record<string, string> = { plant: "🪴", books: "📚", globe: "🌍", poster: "🖼️", clock: "🕰️", trophy: "🏆", rocket: "🚀", star: "⭐", rug: "🟫", lamp: "💡", aquarium: "🐠", skeleton: "🦴", easel: "🎨", music: "🎵", beakers: "⚗️", map: "🗺️" };

/** make a small emoji sprite for a room prop (shared by hallway/auditorium/classroom decorators) */
export function hqEmojiSprite(emoji: string, px = 128): THREE.Sprite {
  const cv = document.createElement("canvas"); cv.width = cv.height = px;
  const x = cv.getContext("2d")!; x.font = `${px * 0.72}px serif"; x.textAlign = "center"; x.textBaseline = "middle";
  x.fillText(emoji, px / 2, px / 2 + px * 0.04);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  sp.scale.set(0.6, 0.6, 1);
  return sp;
}

/** place HQ props as emoji sprites along a wall run. positions spread between x0..x1 at height y, facing z. */
export function hqPlaceProps(scene: THREE.Scene, props: string[], x0: number, x1: number, y: number, z: number): void {
  const list = (props || []).map((p) => HQ_PROP_EMOJI[p]).filter(Boolean).slice(0, 10);
  list.forEach((e, i) => {
    const sp = hqEmojiSprite(e);
    const t = list.length === 1 ? 0.5 : i / (list.length - 1);
    sp.position.set(x0 + (x1 - x0) * t, y, z);
    scene.add(sp);
  });
}

/** wall colour for a room from HQ, or null */
export function hqRoomWall(roomId: string): string | null { const r = hqRoom(roomId); return r ? hqColor(r.wallColor) : null; }

/* ------------------------------------------------------------------ dorm theme */
export function applyHqDormTheme(): boolean {
  const r = hqRoom("dorm") || hqRoom("dorm3d"); if (!r) return false;
  try {
    const cur = lsGet(K_DORM) || {};
    const next = { ...(typeof cur === "object" ? cur as Record<string, unknown> : {}), hqTheme: r.theme || undefined, hqWall: hqColor(r.wallColor) || undefined, hqFloor: r.floorStyle || undefined, hqProps: Array.isArray(r.props) ? r.props.slice(0, 12) : undefined };
    return lsSet(K_DORM, next);
  } catch { return false; }
}

/* ------------------------------------------------------------------ change notifications */
/** call cb when any HQ key changes (same-tab CustomEvent or cross-tab storage). Default behaviour (reload: true) reloads the page so every scene re-reads. */
export function onHqChange(cb?: (key: string) => void, reload = true): void {
  const keys = [K_STAFF, K_ROOMS, K_LESSONS];
  const fire = (key: string) => { if (cb) { try { cb(key); } catch { /* ignore */ } } else if (reload) location.reload(); };
  try { window.addEventListener("unify-hq-update", (e) => { const k = String((e as CustomEvent).detail?.key ?? ""); if (keys.includes(k)) fire(k); }); } catch { /* ignore */ }
  try { window.addEventListener("storage", (e) => { if (e.key && keys.includes(e.key)) fire(e.key); }); } catch { /* ignore */ }
}
