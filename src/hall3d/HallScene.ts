import { Events } from "../game/events";
import * as THREE from "three";
import { Beam } from "../shared/beam";
import { dprCap, shadowSize, vignette, rimLight, smallScreen } from "../shared/polish";
import { PERIODS, DAY, DAY_START, periodAt, astar, rnd, shuffle } from "./logic";
import { bakeSheet, DIRS, COLS, FW, FH, SCALE, FEET, SKINS, SHIRTS, HAIRS, AGE_SCALE, type Age, type Look } from "./characters";
import { SUBJECTS, W, H, WALL_H, LOCK_D, FLOOR_Y, BLOCKS, DOORS, NEWS, OPEN, LOCKERS, PROPS, ENTRANCE, OUTSIDE, NAV, NAV_UP, LIB_SHELL, LIB_SHELVES, LIBRARY, WEST_HALL, EAST_HALL, AUDITORIUM, NEWSROOM, UP_DOORS, STAIR_BLOCK, STAIR_UP, STAIR_DOWN, STAIR_GROUND, STAIR_TOP, LIB_READ, LIB_DESK, AUD_DOOR, NEWS_DOOR, COLUMNS, GREENS, underUpper, hit, solidAt, type Subject, type Room, type Rect, type Face } from "./campus";
import * as T from "./textures";
import { ROSTER, STAFF, HALL_COUNT, type NpcDef } from "./roster";
import { drawBoard } from "../game/timesui";
import { Social } from "./social";
import { drawPicFinal, picsFor, picTitle } from "../game/wallart";
import { newsItems, newsIsLive, loadNews, onNews } from "../game/newstv";
import { Progress } from "../game/progress";
import { CURRICULUM } from "../class3d/curriculum";
import { toLook, type AvatarSpec } from "./avatar";
import { Mood, Gfx } from "./mood";
import { buildHallDetails } from "./hallDetails";
import { isPixar } from "../shared/look";
import { PixarHall, PixarCrowd } from "./pixarHall";
import { getStyle } from "../dorm/style";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { ACTIONS, POSE_KEYS, POSE_IX, GAITS, GAIT_BY_PERSONALITY, FIDGETS, bakeActions, frameAt } from "./actions";

import { INTERIOR_SCALE as IS, CHAR_K, PROP_H, scaleScene } from "../shared/scale";
import { makeBody } from "../shared/body3d";
const DR = PROP_H.hallDoor;   // door height (design units)
const UNIT = 1.75 / 45;                                              // one drawing unit of the chibi art in world units
const g2w = (gx: number, gy: number) => new THREE.Vector3(gx - W / 2, 0, gy - H / 2);
const STYLES = ["crop", "pony", "bun", "curly", "bob", "long", "crop", "pony", "curly", "bob"];
const LOCKER_COL = ["#7fb2d6", "#f2a79b", "#9fd0b0", "#f4d488", "#b8a8da", "#f6b294", "#8fc9c4", "#e9a0c0"];
const SUBJ_COL: Record<Subject, string> = { math: "#4F91C7", ela: "#88B89A", science: "#8FC9E8", history: "#C98569", careers: "#E8A33D", life: "#7CB6A0" };
const SUBJ_LABEL: Record<Subject, string> = { math: "MATH", ela: "ELA", science: "SCIENCE", history: "HISTORY", careers: "CAREERS", life: "LIFE" };
/** grade bands by student index: K-2 (smallest) up to high school; adults (staff) are the tallest */
const AGES: Age[] = ["k2", "g35", "g68", "hs", "g35", "g68", "k2", "hs", "g68", "g35"];
export const AGE_LABEL: Record<Age, string> = { adult: "Staff", hs: "High school", g68: "Grades 6-8", g35: "Grades 3-5", k2: "Grades K-2" };
const hash = (a: number, b: number) => { const n = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return n - Math.floor(n); };
export type ViewMode = "close" | "overview" | "first";
/** destinations offered by the "Go to" menu */
export const GOTO = [
  { key: "math", label: "Math", color: SUBJ_COL.math }, { key: "ela", label: "ELA", color: SUBJ_COL.ela },
  { key: "science", label: "Science", color: SUBJ_COL.science }, { key: "history", label: "History", color: SUBJ_COL.history }, { key: "careers", label: "CarryingCareers", color: SUBJ_COL.careers }, { key: "life", label: "Life Lessons", color: SUBJ_COL.life },
  { key: "news", label: "Auditorium (upstairs)", color: "#8E7CC3" }, { key: "newsroom", label: "Newsroom (upstairs)", color: "#E07A66" }, { key: "open", label: "The Open Door (parent classes)", color: "#E8A33D" },
  { key: "library", label: "Library (upstairs)", color: "#6E8B74" },
  { key: "board", label: "Class-times board", color: "#C9A36B" }, { key: "plaza", label: "Plaza fountain", color: "#EAB94E" }, { key: "entrance", label: "Main entrance", color: "#F28F7E" },
];

export interface Person { speaking?: boolean; actTex?: THREE.Texture; act?: { name: string; t: number; auto?: boolean } | null; gait?: string; baseScale?: THREE.Vector3; fidgetT?: number; sitTex?: THREE.Texture; def?: NpcDef; talking?: boolean; id: number; look: Look; sprite: THREE.Sprite; body: THREE.Group; mat: THREE.SpriteMaterial; tex: THREE.Texture; blob: THREE.Mesh; pos: THREE.Vector3; dir: number; frame: number; moving: boolean }
export interface Stu extends Person { hidden: boolean; path: THREE.Vector3[]; speed: number; pending: null | { delay: number; dest: { x: number; y: number }; hide: boolean; appear?: { x: number; y: number } }; lastDoor: { x: number; y: number }; hideOnArrive: boolean; fade: number }
interface Occluder { mats: THREE.Material[]; box: THREE.Box3; o: number }

export class HallScene {
  renderer: THREE.WebGLRenderer; scene = new THREE.Scene(); camera = new THREE.PerspectiveCamera(48, 1, 0.1, 260 * IS);
  clock = 0; idx = -1; speed = 1; view: ViewMode = "close"; tint: [number, number, number, number] = [255, 255, 255, 0];
  students: Stu[] = []; player!: Person; monitor!: Person; duty: Person[] = []; inDoor: Room | null = null; onToast: (m: string) => void = () => {};
  keys: Record<string, boolean> = {}; input = { x: 0, y: 0 }; rotate = 0; inputLocked = false;
  /** per-frame hooks (dt = real seconds, sim = simulated seconds) and tap handling for the social layer */
  onTick: ((dt: number, sim: number) => void)[] = []; onTap: (p: Person | null) => void = () => {}; onPic: (pid: string, title: string, subject: string) => void = () => {}; onTV: () => void = () => {}; onBooks: () => void = () => {}; onNewsroom: () => void = () => {}; hallPics: THREE.Mesh[] = []; tvScreen: THREE.Mesh | null = null; private bookLatch = false; private newsLatch = false; private sentUp = false;
  /** Chat Chow seats (stools at the plaza tables): tap one to sit; the player sits there when idle */
  seats: { pos: THREE.Vector3; ctr: THREE.Vector3; mesh: THREE.Mesh }[] = []; sitting: number | null = null; private pendingSeat: number | null = null;
  /** scripted walking (arrival from the bus, walking in) that ignores walls and input */
  cine: { pts: THREE.Vector3[]; done?: () => void; speed: number } | null = null; bus: THREE.Group | null = null; private busState: { t: number; mode: "idle" | "in" | "wait" | "out"; from: number; to: number; arm: THREE.Mesh; door: THREE.Mesh } | null = null; onBusStopped: () => void = () => {};
  yaw = 0; pitch = 0.36; zoom = 1; fpitch = 0; navLabel = "";
  private nav: { pts: THREE.Vector3[]; label: string } | null = null; private navThen: (() => void) | null = null;
  /** 0 = ground floor, 1 = library */
  floor = 0;
  private walkers: { p: Person; stops: number[][]; path: THREE.Vector3[]; leg: number; speed: number }[] = []; teacher!: Person;
  open: { x: number; y: number }[] = [];
  private occl: Occluder[] = []; private sun!: THREE.DirectionalLight; private hemi!: THREE.HemisphereLight; private tintT = 9; private shadowR = 0;
  private texCache = new Map<string, THREE.Texture>(); private beam!: Beam;
  /** Pixar edition only (null in the normal build) */
  private px: PixarHall | null = null; private bodies: PixarCrowd | null = null; private playerSpec: AvatarSpec = Social.profile.avatar; private floorMesh: THREE.Mesh | null = null; private lockMats: THREE.Material[] = [];
  private camPos = new THREE.Vector3(0, 6, 8); private camLook = new THREE.Vector3(0, 1, -4);
  private last = performance.now(); private t = 0; private blobTex = T.blobTex();

  constructor(public host: HTMLElement) {
    const phone = smallScreen();
    const r = this.renderer = new THREE.WebGLRenderer({ antialias: !phone, alpha: false, powerPreference: phone ? "low-power" : "high-performance" });
    r.setPixelRatio(dprCap()); r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFShadowMap; r.outputColorSpace = THREE.SRGBColorSpace;
    scaleScene(this.scene); host.appendChild(r.domElement); this.scene.background = new THREE.Color("#EADFCB"); this.scene.fog = new THREE.Fog("#EADFCB", 70 * IS, 340 * IS);
    this.reachable(); this.buildLights(); this.buildCampus(); this.buildDetails(); this.buildDoorLeaves(); this.buildOutside(); this.buildRoad(); this.buildBus(); this.buildPeople();
    if (this.px) this.px.finish({ floor: this.floorMesh!, lockers: this.lockMats, winSpots: this.winSpots });
    addEventListener("resize", () => this.resize()); this.resize();
    addEventListener("keydown", (e) => { if ((e.target as HTMLElement)?.tagName === "INPUT") return; this.keys[e.key.toLowerCase()] = true; if (e.key.startsWith("Arrow")) e.preventDefault(); });
    addEventListener("keyup", (e) => { this.keys[e.key.toLowerCase()] = false; });
    addEventListener("blur", () => { this.keys = {}; });
    addEventListener("message", (e) => { const m = e.data; if (m && m.type === "unify:exit") this.placeAtDoor(m.room); });
    this.bindPointer(r.domElement);
    if (!this.px) this.bodies = new PixarCrowd(this.scene, getStyle("pixar"));
    this.setView("close", true); requestAnimationFrame(this.frame);
  }
  resize() { const w = this.host.clientWidth || innerWidth, h = this.host.clientHeight || innerHeight; this.renderer.setSize(w, h); this.camera.aspect = w / h; this.camera.fov = w / h < 0.8 ? 62 : 48; this.camera.updateProjectionMatrix(); this.px?.resize(w, h); }
  private tex(key: string, make: () => THREE.Texture) { let t = this.texCache.get(key); if (!t) { t = make(); this.texCache.set(key, t); } return t; }
  /** shared texture with its own repeat count (the canvas is shared, only the sampler differs) */
  private rep(key: string, make: () => THREE.Texture, rx: number, ry = 1) {
    const k = `${key}@${rx.toFixed(2)}x${ry.toFixed(2)}`; let t = this.texCache.get(k);
    if (!t) { t = this.tex(key, make).clone(); t.repeat.set(rx, ry); t.needsUpdate = true; this.texCache.set(k, t); } return t;
  }

  /* ------------------------------------------------------------ orbit input: drag, wheel, Q/E, buttons */
  private bindPointer(el: HTMLElement) {
    let down = false, px = 0, py = 0, sx = 0, sy = 0, st = 0;
    el.addEventListener("pointerdown", (e) => { down = true; px = sx = e.clientX; py = sy = e.clientY; st = performance.now(); el.setPointerCapture(e.pointerId); });
    el.addEventListener("pointermove", (e) => {
      if (!down) return; const dx = e.clientX - px, dy = e.clientY - py; px = e.clientX; py = e.clientY;
      this.yaw -= dx * 0.0065;
      if (this.view === "first") this.fpitch = Math.max(-0.6, Math.min(0.6, this.fpitch - dy * 0.004)); else this.pitch = Math.max(0.2, Math.min(1.3, this.pitch + dy * 0.004));
    });
    el.addEventListener("pointerup", (e) => { const was = down; down = false; if (was && Math.hypot(e.clientX - sx, e.clientY - sy) < 7 && performance.now() - st < 500) this.handleTap(e.clientX, e.clientY); });
    el.addEventListener("pointercancel", () => { down = false; });
    el.addEventListener("wheel", (e) => { e.preventDefault(); this.zoom = Math.max(0.45, Math.min(1.6, this.zoom * Math.exp(e.deltaY * 0.0012))); }, { passive: false });
  }

  /* ------------------------------------------------------------ lights */
  private buildLights() {
    const hemi = this.hemi = new THREE.HemisphereLight(0xfff6e8, 0xe4d3b4, 1.85); this.scene.add(hemi);
    const sun = this.sun = new THREE.DirectionalLight(0xfff0d8, 1.6); sun.castShadow = true;
    sun.shadow.mapSize.set(shadowSize(2048), shadowSize(2048)); sun.shadow.camera.near = 1; sun.shadow.camera.far = 110 * IS; sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02; sun.shadow.radius = 5;
    this.scene.add(sun, sun.target);
    if (isPixar()) this.px = new PixarHall(this.renderer, this.scene, this.camera, sun, hemi);   // golden key, teal fill, coloured rims, haze and post stack (lights follow Mood themselves)
    else { Mood.rig({ hemi, sun, bg: this.scene.background as THREE.Color, fog: this.scene.fog as THREE.Fog });
      rimLight(this.scene, 0.5); vignette(this.host, 0.24); }   // cool back light + soft screen-edge darkening
    this.beam = new Beam(this.scene, Social.profile.avatar.shirt);   // light pillar over the player
  }

  /* ------------------------------------------------------------ building blocks */
  private std(map: THREE.Texture | null, color = "#ffffff") { return new THREE.MeshStandardMaterial({ map, color, roughness: 0.95, metalness: 0 }); }
  private plain(color: string) { return new THREE.MeshStandardMaterial({ color, roughness: 1 }); }
  private box(w: number, h: number, d: number, mats: THREE.Material | THREE.Material[], x: number, y: number, z: number, o: { outline?: boolean; occlude?: boolean; shadow?: boolean } = {}) {
    const { outline = !this.px, occlude = false, shadow = true } = o;
    if (occlude) mats = (Array.isArray(mats) ? mats : [mats]).map((m) => m.clone());       // own materials so each can fade alone
    const m = new THREE.Mesh(this.px ? new RoundedBoxGeometry(w, h, d, 2, Math.min(0.08, w / 4, h / 4, d / 4)) : new THREE.BoxGeometry(w, h, d), mats); m.position.set(x, y, z); m.castShadow = shadow; m.receiveShadow = true; this.scene.add(m);
    if (outline) m.add(new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry), new THREE.LineBasicMaterial({ color: 0x6d5a5f, transparent: true, opacity: 0.55 })));
    if (occlude) this.occl.push({ mats: Array.isArray(mats) ? mats : [mats], box: new THREE.Box3().setFromCenterAndSize(m.position, new THREE.Vector3(w + 0.05, h, d + 0.05)), o: 1 });
    return m;
  }
  /** a sign or picture with real thickness, not a paper cutout */
  private card(tex: THREE.Texture, w: number, h: number, x: number, y: number, z: number, rotY: number, basic = false) {
    const g = new THREE.Group(), slab = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.08), this.plain("#F6EBD8")); slab.castShadow = true; g.add(slab);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.94, h * 0.9), basic ? new THREE.MeshBasicMaterial({ map: tex, transparent: true }) : new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85, transparent: true }));
    m.position.z = 0.045; m.receiveShadow = true; g.add(m); g.position.set(x, y, z); g.rotation.y = rotY; this.scene.add(g); return m;
  }
  private flat(tex: THREE.Texture, w: number, d: number, x: number, z: number, y = 0.012, rotY = 0) {
    const geo = new THREE.PlaneGeometry(w, d); geo.rotateX(-Math.PI / 2); if (rotY) geo.rotateY(rotY);
    const m = new THREE.Mesh(geo, this.std(tex)); m.position.set(x, y, z); m.receiveShadow = true; this.scene.add(m); return m;
  }
  private winSpots: { x: number; y: number; z: number; rot: number }[] = [];
  /** a window card; its glass glows warm at night (Mood) */
  private win(x: number, y: number, z: number, rot: number) { this.winSpots.push({ x, y, z, rot }); const m = this.card(this.tex("win", () => T.windowTex()), 1.5, 1.9, x, y, z, rot); Mood.window(m.material as THREE.MeshStandardMaterial); return m; }
  private rotOf(f: Face) { return f === "S" ? 0 : f === "N" ? Math.PI : f === "E" ? Math.PI / 2 : -Math.PI / 2; }
  /** world position on the outside of a rect's face, `t` along it (0..1) and `off` away from it */
  private onFace(r: Rect, f: Face, t: number, off: number) {
    if (f === "S") return { x: r.x + r.w * t - W / 2, z: r.y + r.h - H / 2 + off };
    if (f === "N") return { x: r.x + r.w * t - W / 2, z: r.y - H / 2 - off };
    if (f === "E") return { x: r.x + r.w - W / 2 + off, z: r.y + r.h * t - H / 2 };
    return { x: r.x - W / 2 - off, z: r.y + r.h * t - H / 2 };
  }

  /* ------------------------------------------------------------ the campus: floors, outer walls, blocks, lockers, doors, plaza */
  private buildCampus() {
    const S = this.scene, cap = this.plain("#F7ECD6"), outer = this.plain("#D8C6A4");
    // soft diorama shadow on the ground
    const under = new THREE.Mesh(new THREE.PlaneGeometry(W + 7, H + 7), new THREE.MeshBasicMaterial({ map: this.tex("dio", () => T.cardShadowTex()), transparent: true, opacity: 0.7, depthWrite: false }));
    under.rotation.x = -Math.PI / 2; under.position.set(0.4, -0.02, 0.4); S.add(under);
    // floors: blue hall tile everywhere, warm paving for the plaza band and the central atrium, runner rugs around the ring
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, H), Mood.tinted(this.std(this.rep("floor", () => T.floorTex(), W / 2, H / 2)), "floor", 1)); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; S.add(floor); this.floorMesh = floor;
    this.flat(this.rep("stoneA", () => T.stoneTex(), (W - 10) / 4, 10 / 4), W - 10, 10, 0, 0, 0.012);
    this.flat(this.rep("stoneB", () => T.stoneTex(), 14 / 4, (H - 10) / 4), 14, H - 10, 0, 0, 0.012);
    const rug = (len: number, cx: number, cz: number, horiz: boolean) => this.flat(this.rep("rug", () => T.rugTex(), 1, len / 4), 2, len, cx, cz, 0.014, horiz ? Math.PI / 2 : 0);
    rug(W - 4, 0, -H / 2 + 2.5, true); rug(H - 4, -W / 2 + 2.5, 0, false); rug(H - 4, W / 2 - 2.5, 0, false);
    rug((W - 8) / 2 - 1, -W / 4 - 2.5, H / 2 - 2.5, true); rug((W - 8) / 2 - 1, W / 4 + 2.5, H / 2 - 2.5, true);

    // outer walls (paper thickness: pale cap, darker outside); the south wall has the entrance gap with a lintel + banner
    const wall = (len: number, cx: number, cz: number, horiz: boolean, innerIdx: number) => {
      const inner = Mood.tinted(this.std(this.rep("wall", () => T.wallTex(), len / 4)), "wash", 1), mats = [outer, outer, cap, outer, outer, outer]; mats[innerIdx] = inner;
      this.box(horiz ? len : 0.3, WALL_H, horiz ? 0.3 : len, mats, cx, WALL_H / 2, cz, { outline: false, occlude: true });
    };
    wall(W + 0.6, 0, -H / 2 - 0.15, true, 4); wall(H, -W / 2 - 0.15, 0, false, 0); wall(H, W / 2 + 0.15, 0, false, 1);
    const g0 = ENTRANCE.gap.x0 - W / 2, g1 = ENTRANCE.gap.x1 - W / 2, sz = H / 2 + 0.15;
    wall(g0 + W / 2 + 0.3, (-W / 2 - 0.3 + g0) / 2, sz, true, 5); wall(W / 2 + 0.3 - g1, (g1 + W / 2 + 0.3) / 2, sz, true, 5);
    this.box(g1 - g0, 0.9, 0.3, [outer, outer, cap, outer, outer, this.std(this.rep("wall", () => T.wallTex(), 2))], (g0 + g1) / 2, WALL_H - 0.45, sz, { outline: false });
    this.card(this.tex("banner", () => T.bannerTex("UNIFY ACADEMY")), 7.6, 1.2, (g0 + g1) / 2, 3.35, H / 2 - 0.05, Math.PI, true);
    this.card(this.tex("exit", () => T.bannerTex("WELCOME")), 5.2, 0.8, (g0 + g1) / 2, 3.35, H / 2 + 0.35, 0, true);
    this.card(this.tex("vista", () => this.vistaTex()), 2.4, 1.7, g0 - 2.2, 2.3, H / 2 - 0.2, Math.PI, true);
    this.card(this.tex("vista", () => this.vistaTex()), 2.4, 1.7, g1 + 2.2, 2.3, H / 2 - 0.2, Math.PI, true);
    this.card(this.tex("clock", () => T.clockTex()), 1.1, 1.1, -9, 3.05, -H / 2 + 0.17, 0);
    // windows along the outer walls (above the lockers), skipping the entrance
    for (let x = 4; x < W - 3; x += 6) if (Math.abs(x - W / 2) > 1.5) this.win(x - W / 2, 3.05, -H / 2 + 0.17, 0);
    for (let x = 4; x < W - 3; x += 6) if (x < ENTRANCE.gap.x0 - 2 || x > ENTRANCE.gap.x1 + 2) this.win(x - W / 2, 3.05, H / 2 - 0.17, Math.PI);
    for (let z = 5; z < H - 3; z += 6) { if (Math.abs(z - OPEN.cy) < 2.4) { this.win(W / 2 - 0.17, 3.05, z - H / 2, -Math.PI / 2); continue; } this.win(-W / 2 + 0.17, 3.05, z - H / 2, Math.PI / 2); this.win(W / 2 - 0.17, 3.05, z - H / 2, -Math.PI / 2); }
    { // newsroom door in the north wall, between the locker runs
      const dx = NEWS.cx - W / 2, dz = -H / 2;
      this.box(1.9, DR + 0.35, 0.18, this.plain("#9A653D"), dx, (DR + 0.35) / 2, dz + 0.09);
      const dm = new THREE.Mesh(new THREE.BoxGeometry(1.5, DR, 0.12), new THREE.MeshStandardMaterial({ map: this.tex("door-news", () => T.doorTex("#8E7CC3")), roughness: 0.95 })); dm.position.set(dx, DR / 2, dz + 0.19); dm.receiveShadow = true; S.add(dm);
      const sg = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 0.48), new THREE.MeshBasicMaterial({ map: this.tex("sign-news", () => T.signTex("AUDITORIUM UPSTAIRS", "#6B5AA8")), transparent: true })); sg.position.set(dx, DR + 0.55, dz + 0.2); S.add(sg);
    }
    { // The Open Door: parent-run classroom, west wall
      const dx = -W / 2, dz = OPEN.cy - H / 2;
      this.box(0.18, DR + 0.35, 1.9, this.plain("#9A653D"), dx + 0.09, (DR + 0.35) / 2, dz);
      const dm = new THREE.Mesh(new THREE.BoxGeometry(1.5, DR, 0.12), new THREE.MeshStandardMaterial({ map: this.tex("door-open", () => T.doorTex("#E8A33D")), roughness: 0.95 })); dm.position.set(dx + 0.19, DR / 2, dz); dm.rotation.y = Math.PI / 2; dm.receiveShadow = true; S.add(dm);
      const sg = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 0.48), new THREE.MeshBasicMaterial({ map: this.tex("sign-open", () => T.signTex("THE OPEN DOOR", "#B8741A")), transparent: true })); sg.position.set(dx + 0.2, DR + 0.55, dz); sg.rotation.y = Math.PI / 2; S.add(sg);
    }
    this.doorMat(-W / 2 + 1.45, OPEN.cy - H / 2, Math.PI / 2, "#E8A33D"); this.doorMat(NEWS.cx - W / 2, -H / 2 + 1.45, 0, "#8E7CC3");
    this.bunting([[-W / 2 + 0.06, -H / 2 + 0.06, W / 2 - 0.06, -H / 2 + 0.06], [-W / 2 + 0.06, -H / 2 + 0.06, -W / 2 + 0.06, H / 2 - 0.06], [W / 2 - 0.06, -H / 2 + 0.06, W / 2 - 0.06, H / 2 - 0.06]], 3.95);

    // subject blocks: solid paper boxes with a big roof label, windows, posters and one door each
    for (const b of BLOCKS) {
      const r = b.rect, s = b.subject, door = DOORS.find((d) => d.subject === s)!;
      const sx = Mood.tinted(this.std(this.rep("wall", () => T.wallTex(), r.h / 4)), "wash", 1), sz2 = Mood.tinted(this.std(this.rep("wall", () => T.wallTex(), r.w / 4)), "wash", 1);
      const roof = this.std(this.tex(`roof-${s}`, () => T.roofLabelTex(SUBJ_LABEL[s], SUBJ_COL[s], s === "science" ? "#3b3340" : "#FFF9F0")));
      this.box(r.w, WALL_H, r.h, [sx, sx, roof, outer, sz2, sz2], r.x + r.w / 2 - W / 2, WALL_H / 2, r.y + r.h / 2 - H / 2, { occlude: true });
      const faces: Face[] = ["N", "S", "E", "W"];
      for (const f of faces) {
        const len = f === "N" || f === "S" ? r.w : r.h, n = Math.round(len / 4.6);
        for (let k = 0; k < n; k++) {
          const t = (k + 0.5) / n, p = this.onFace(r, f, t, 0.17), gx = f === "N" || f === "S" ? r.x + r.w * t : door.cx;
          if (f === door.face && Math.abs(gx - door.cx) < 2.6) continue;
          this.win(p.x, 3.05, p.z, this.rotOf(f));
        }
      }
      // plaza-side wall: posters + notice board beside the door
      const df = door.face, q = (dx: number, i: number) => { const p = this.onFace(r, df, (door.cx + dx - r.x) / r.w, 0.17); return { p, i }; };
      const a = q(-5.2, 0), c2 = q(5.2, 1), bd = q(-3.4, 2), tr = q(3.4, 3);
      const roomy = r.w >= 12;
      if (roomy) {
      { const ls = CURRICULUM[s] ?? [], cur = ls[Progress.index(s, ls.length)], pids = picsFor(s, cur?.pics ?? [], 2);    // wall pictures match what is being taught in this room
        const pic = (pos: { p: { x: number; z: number } }, pid: string) => { const tx = new THREE.CanvasTexture(drawPicFinal(pid)); tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 4; const fr = new THREE.Mesh(new THREE.BoxGeometry(1.86, 1.12, 0.06), this.plain("#9A653D")); fr.position.set(pos.p.x, 1.55, pos.p.z); fr.rotation.y = this.rotOf(df); this.scene.add(fr); const m = this.card(tx, 1.7, 0.96, pos.p.x, 1.55, pos.p.z, this.rotOf(df), true); m.position.z += 0.04; m.userData = { pid, title: picTitle(pid), subject: s }; this.hallPics.push(m); };
        pic(a, pids[0]); if (s !== "math") pic(c2, pids[1]); }
      this.card(this.tex("board", () => T.boardTex()), 1.6, 1.1, bd.p.x, 2.2, bd.p.z, this.rotOf(df)); this.card(this.tex("trophy", () => T.trophyTex()), 1.1, 1.0, tr.p.x, 2.2, tr.p.z, this.rotOf(df));
      }
      // door + frame + sign
      const out = df === "S" ? 1 : -1, dz = door.cy - H / 2, dx = door.cx - W / 2, rot = out > 0 ? 0 : Math.PI;
      this.doorMat(dx, dz + out * 1.45, 0, SUBJ_COL[s]);   // a bright welcome mat in the subject's colour
      this.box(1.9, DR + 0.35, 0.18, this.plain("#9A653D"), dx, (DR + 0.35) / 2, dz + out * 0.09, { occlude: false });
      const dm = new THREE.Mesh(new THREE.BoxGeometry(1.5, DR, 0.12), new THREE.MeshStandardMaterial({ map: this.tex(`door-${s}`, () => T.doorTex(SUBJ_COL[s])), roughness: 0.95 })); dm.position.set(dx, DR / 2, dz + out * 0.19); dm.rotation.y = rot; dm.receiveShadow = true; S.add(dm);
      const sg = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 0.48), new THREE.MeshBasicMaterial({ map: this.tex(`sign-${s}`, () => T.signTex(s === "careers" ? "CARRYING CAREERS" : s === "life" ? "LIFE LESSONS" : SUBJ_LABEL[s], SUBJ_COL[s], s === "science" ? "#3b3340" : "#FFF9F0")), transparent: true })); sg.position.set(dx, DR + 0.55, dz + out * 0.2); sg.rotation.y = rot; S.add(sg);
    }

    // locker runs: one long box each, the four locker colours repeating on the front face
    LOCKERS.forEach((l, i) => {
      const r = l.rect, len = l.face === "N" || l.face === "S" ? r.w : r.h, front = Mood.tinted(this.std(this.rep("lockers", () => T.lockerStripTex(LOCKER_COL), len / LOCKER_COL.length)), "accent", 0.16), side = this.plain("#9db8c8"), top = this.plain("#FFF6E6");
      const mats = [side, side, top, side, side, side]; mats[{ E: 0, W: 1, S: 4, N: 5 }[l.face]] = front; this.lockMats.push(front);
      this.box(r.w, PROP_H.locker, r.h, mats, r.x + r.w / 2 - W / 2, PROP_H.locker / 2, r.y + r.h / 2 - H / 2, { occlude: true });
      void i;
    });

    this.buildClassBoard(); this.buildNewsTV();
    // plaza furniture
    for (const p of PROPS) {
      const x = p.x - W / 2, z = p.y - H / 2;
      if (p.kind === "tree") this.tree(x, z); else if (p.kind === "fountain") this.fountain(x, z); else if (p.kind === "table") this.table(x, z);
      else if (p.kind === "bench") this.bench(x, z, p.rot ?? 0); else if (p.kind === "planter") this.plant(x, z); else if (p.kind === "tv" || p.kind === "bboard") { /* built by buildNewsTV / buildHallDetails */ } else this.lamp(x, z, i2c(p.x + p.y));
    }
    for (const g of GREENS) this.plant(g.x - W / 2, g.y - H / 2);
    this.buildLibrary();
    this.buildColumns();
  }
  /** a scenic panel over the front doors: sky, hills, and the school, so the entry has a view */
  private vistaTex() {
    const cv = document.createElement("canvas"); cv.width = 640; cv.height = 280; const c = cv.getContext("2d")!;
    const sky = c.createLinearGradient(0, 0, 0, 280); sky.addColorStop(0, "#2E9FE8"); sky.addColorStop(0.55, "#8FD4FF"); sky.addColorStop(1, "#FFE3A3"); c.fillStyle = sky; c.fillRect(0, 0, 640, 280);
    c.fillStyle = "#F8E27A"; c.beginPath(); c.arc(520, 64, 28, 0, 7); c.fill();
    c.fillStyle = "#2F9A56"; c.beginPath(); c.moveTo(0, 190); c.lineTo(80, 120); c.lineTo(170, 188); c.lineTo(260, 100); c.lineTo(360, 190); c.lineTo(470, 130); c.lineTo(560, 188); c.lineTo(640, 150); c.lineTo(640, 280); c.lineTo(0, 280); c.fill();
    c.fillStyle = "#1F7A48"; c.fillRect(0, 200, 640, 80);
    c.fillStyle = "#F4E2C4"; c.fillRect(250, 150, 140, 70); c.fillStyle = "#C45A4A"; c.beginPath(); c.moveTo(240, 150); c.lineTo(320, 108); c.lineTo(400, 150); c.fill();
    c.fillStyle = "#3DB7E8"; for (const x of [270, 310, 350]) c.fillRect(x, 168, 18, 22);
    c.fillStyle = "#fff"; c.font = "700 28px Georgia, serif"; c.textAlign = "center"; c.fillText("Walk in", 320, 40);
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
  }
  /** limestone columns with a jewel band, flanking the entry and the stairs */
  private buildColumns() {
    const jewel = ["#E23B4A", "#1F9A78", "#2E86C1", "#F0B429"];
    const stone = this.plain("#F7F1E6"), gold = this.plain("#E8C56B"), foot = this.plain("#C9843A");
    COLUMNS.forEach((c, i) => {
      const x = c.x - W / 2, z = c.y - H / 2, g = new THREE.Group();
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.46, 3.5, 14), stone); shaft.position.y = 1.9; shaft.castShadow = true; g.add(shaft);
      const base = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.28, 1.05), foot); base.position.y = 0.14; base.castShadow = true; g.add(base);
      const cap = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.28, 1.05), gold); cap.position.y = 3.78; cap.castShadow = true; g.add(cap);
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.14, 14), this.plain(jewel[i % 4])); band.position.y = 3.5; g.add(band);
      g.position.set(x, 0, z); this.scene.add(g);
      if (i < 4) this.plant(x + (x < 0 ? -0.9 : 0.9), z, 0);
    });
    const banner = (x: number, z: number, col: string, word: string) => {
      const cv = document.createElement("canvas"); cv.width = 128; cv.height = 320; const c = cv.getContext("2d")!;
      c.fillStyle = col; c.fillRect(0, 0, 128, 320); c.fillStyle = "#fff8e8"; c.font = "700 36px Georgia, serif"; c.textAlign = "center";
      c.save(); c.translate(64, 170); c.rotate(-Math.PI / 2); c.fillText(word, 0, 0); c.restore();
      const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.7, 0.7), new THREE.MeshBasicMaterial({ map: t }));
      m.position.set(x, 3.15, z); this.scene.add(m);
    };
    banner(44 - W / 2, 73.5 - H / 2, "#E23B4A", "WELCOME"); banner(64 - W / 2, 73.5 - H / 2, "#2E86C1", "WELCOME");
    banner(43 - W / 2, 38.5 - H / 2, "#1F9A78", "UPSTAIRS"); banner(65 - W / 2, 38.5 - H / 2, "#F0B429", "UPSTAIRS");
    const med = new THREE.Mesh(new THREE.CircleGeometry(2.4, 28), new THREE.MeshBasicMaterial({ color: "#F0B429", transparent: true, opacity: 0.85 }));
    med.rotation.x = -Math.PI / 2; med.position.set(0, 0.02, 74 - H / 2); this.scene.add(med);
    const med2 = new THREE.Mesh(new THREE.CircleGeometry(1.5, 24), new THREE.MeshBasicMaterial({ color: "#E23B4A" }));
    med2.rotation.x = -Math.PI / 2; med2.position.set(0, 0.025, 74 - H / 2); this.scene.add(med2);
  }
  /** the second floor: library, side halls, auditorium and newsroom, finished like the ground floor */
  private buildLibrary() {
    const y0 = FLOOR_Y, wh = WALL_H;
    const gx = (x: number) => x - W / 2, gz = (y: number) => y - H / 2;
    const upper = this.plain("#F6E4C4"), wain = this.plain("#2C6B62"), crown = this.plain("#E2A84A"), wood = this.plain("#A86B3C"), ink = this.plain("#6B4228"), cream = this.plain("#F3E2C4");
    const slab = (r: Rect, floorCol: THREE.Material) => {
      this.box(r.w, 0.2, r.h, floorCol, gx(r.x + r.w / 2), y0 + 0.02, gz(r.y + r.h / 2), { outline: false, shadow: false });
      this.box(Math.max(0.4, r.w - 1.4), 0.08, Math.max(0.4, r.h - 1.4), cream, gx(r.x + r.w / 2), y0 + wh - 0.06, gz(r.y + r.h / 2), { outline: false, shadow: false });
    };
    const oak = this.plain("#C4894A"), hallTile = this.std(this.rep("upfloor", () => T.floorTex(), 4, 3));
    slab(LIBRARY, oak);
    for (const r of [WEST_HALL, EAST_HALL, AUDITORIUM, NEWSROOM]) slab(r, hallTile);
    const edge = (x: number, y: number, w: number, d: number) => {
      if (w < 0.4 || d < 0.3) return;
      const cx = gx(x + w / 2), cz = gz(y + d / 2);
      this.box(w, wh * 0.7, d, upper, cx, y0 + wh * 0.62, cz, { outline: false, occlude: true, shadow: false });
      this.box(w + 0.06, 1.2, d + 0.06, wain, cx, y0 + 0.6, cz, { outline: false, shadow: false });
      this.box(w + 0.08, 0.14, d + 0.08, crown, cx, y0 + wh - 0.08, cz, { outline: false, shadow: false });
    };
    edge(8, 6, 92, 0.45); edge(8, 6, 0.45, 28); edge(99.55, 6, 0.45, 28);
    edge(8, 33.55, 3, 0.45); edge(23, 33.55, 62, 0.45); edge(97, 33.55, 3, 0.45);
    edge(8, 34, 0.45, 18); edge(25.55, 34, 0.45, 18); edge(8, 34, 3, 0.4); edge(23, 34, 3, 0.4); edge(8, 51.6, 3, 0.4); edge(23, 51.6, 3, 0.4);
    edge(82, 34, 0.45, 18); edge(99.55, 34, 0.45, 18); edge(82, 34, 3, 0.4); edge(97, 34, 3, 0.4); edge(82, 51.6, 3, 0.4); edge(97, 51.6, 3, 0.4);
    edge(8, 52, 0.45, 22); edge(8, 73.55, 52, 0.45); edge(8, 52, 3, 0.45); edge(23, 52, 37, 0.45);
    edge(59.55, 52, 0.45, 8); edge(59.55, 68, 0.45, 6);
    edge(99.55, 52, 0.45, 22); edge(60, 73.55, 40, 0.45); edge(60, 52, 25, 0.45); edge(97, 52, 3, 0.45);
    edge(60, 52, 0.45, 8); edge(60, 68, 0.45, 6);
    const winAt = (x: number, y: number, rot: number) => this.win(gx(x), y0 + 2.35, gz(y), rot);
    for (let x = 16; x < 96; x += 10) winAt(x, 6.3, 0);
    for (let x = 16; x < 56; x += 10) winAt(x, 73.7, Math.PI);
    for (let x = 68; x < 96; x += 10) winAt(x, 73.7, Math.PI);
    for (let y = 12; y < 30; y += 8) { winAt(8.3, y, Math.PI / 2); winAt(99.7, y, -Math.PI / 2); }
    const sign = (text: string, col: string, x: number, y: number, rot: number) => this.card(this.tex("sg-" + text, () => T.signTex(text, col)), 2.4, 0.55, gx(x), y0 + 3.15, gz(y), rot, true);
    sign("LIBRARY", "#6E8B74", 54, 7.2, 0); sign("TO THE AUDITORIUM", "#6B5AA8", 17, 32.4, Math.PI); sign("TO THE NEWSROOM", "#E07A66", 91, 32.4, Math.PI);
    sign("AUDITORIUM", "#6B5AA8", 32, 71.6, Math.PI); sign("NEWSROOM", "#E07A66", 80, 71.6, Math.PI);
    const spines = this.tex("spines", () => {
      const cv = document.createElement("canvas"); cv.width = 256; cv.height = 128; const c = cv.getContext("2d")!;
      c.fillStyle = "#8A6239"; c.fillRect(0, 0, 256, 128);
      const cols = ["#6E8B74", "#4F91C7", "#C46B4A", "#E0B15A", "#F4E2C4", "#8E5A3C", "#D4786A", "#7C6BB5"];
      const titles = ["COUNT", "WEATHER", "CELLS", "ALGEBRA", "STORIES", "FACTS", "SPEECH", "FRACTIONS"];
      let x = 4, i = 0; while (x < 248) { const w = 14 + (i % 3) * 6; c.fillStyle = cols[i % cols.length]; c.fillRect(x, 8, w - 3, 112); c.fillStyle = "#fffaf2"; c.font = "700 11px Georgia, serif"; c.save(); c.translate(x + 4, 108); c.rotate(-Math.PI / 2); c.fillText(titles[i % titles.length], 0, 0); c.restore(); x += w; i++; }
      const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
    });
    const front = new THREE.MeshStandardMaterial({ map: spines, roughness: 0.8 });
    for (const r of LIB_SHELVES) {
      this.box(r.w, 3.15, r.h, [front, front, wood, ink, ink, ink], gx(r.x + r.w / 2), y0 + 1.58, gz(r.y + r.h / 2), { outline: false, shadow: true });
      this.box(r.w + 0.08, 0.08, r.h + 0.08, crown, gx(r.x + r.w / 2), y0 + 3.2, gz(r.y + r.h / 2), { outline: false, shadow: false });
    }
    this.flat(this.rep("librug", () => T.rugTex(), 1, 4), 3.2, 16, gx(54), gz(20), y0 + 0.08);
    this.box(6.4, 0.95, 1.3, wood, gx(54), y0 + 0.5, gz(13.4), { outline: false });
    this.box(6.6, 0.12, 1.5, crown, gx(54), y0 + 1.02, gz(13.4), { outline: false, shadow: false });
    this.card(this.tex("deskplate", () => T.signTex("CHECK OUT A BOOK", "#2C6B62")), 3.2, 0.46, gx(54), y0 + 1.35, gz(12.7), 0, true);
    const globe = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 12), this.plain("#3E8FD4")); globe.position.set(gx(50.2), y0 + 1.35, gz(13.4)); this.scene.add(globe);
    this.box(0.9, 0.7, 0.55, ink, gx(58), y0 + 0.4, gz(12.2), { outline: false });
    for (const [x, y] of [[42, 18], [66, 18], [48, 26], [60, 26]] as const) {
      this.box(2.2, 0.08, 1.05, wood, gx(x), y0 + 0.74, gz(y), { outline: false });
      for (const s of [-1, 1]) this.box(0.08, 0.7, 0.08, ink, gx(x + s), y0 + 0.35, gz(y), { outline: false, shadow: false });
      this.box(0.42, 0.42, 0.42, this.plain("#C45A4A"), gx(x - 0.7), y0 + 0.42, gz(y + 0.85), { outline: false, shadow: false });
      this.lamp(gx(x + 0.7), gz(y - 0.15), "#F0B429", y0);
    }
    for (const [x, y] of [[14, 30], [94, 30], [14, 58], [94, 58], [20, 70], [80, 70]] as const) this.plant(gx(x), gz(y), y0);
    for (const [x, y] of [[12, 40], [96, 40], [30, 70], [86, 70]] as const) this.lamp(gx(x), gz(y), "#F8D977", y0);
    this.bench(gx(18), gz(62), Math.PI / 2, y0); this.bench(gx(40), gz(62), Math.PI / 2, y0);
    this.box(16, 0.45, 5, wood, gx(32), y0 + 0.28, gz(70), { outline: false });
    for (const x of [14, 46]) { this.box(0.55, 4.05, 0.55, this.plain("#F7F1E6"), gx(x), y0 + 2.05, gz(60), { outline: false, shadow: false }); this.box(0.9, 0.18, 0.9, this.plain("#E8C56B"), gx(x), y0 + 4.15, gz(60), { outline: false, shadow: false }); }
    this.card(this.tex("sg-courage", () => T.signTex("COURAGE", "#C0392B")), 0.7, 1.6, gx(14), y0 + 2.6, gz(64), 0, true);
    this.card(this.tex("sg-wonder", () => T.signTex("WONDER", "#1F6FB2")), 0.7, 1.6, gx(46), y0 + 2.6, gz(64), 0, true);
    this.card(this.tex("stagesign", () => T.signTex("WALK UP TO OPEN THE SHOW", "#6B5AA8")), 3.4, 0.5, gx(32), y0 + 1.3, gz(67.6), Math.PI, true);
    this.box(2.2, 0.9, 1.0, ink, gx(80), y0 + 0.45, gz(68), { outline: false });
    this.card(this.tex("newsset", () => T.bannerTex("THE NEWSROOM")), 3.2, 1.6, gx(80), y0 + 2.2, gz(72.6), Math.PI, true);
    const anchor = (x: number, shirt: string) => {
      const person = new THREE.Group();
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), this.plain("#F2C7A0")); head.position.y = 1.55; person.add(head);
      const hair = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 8), this.plain("#4A3728")); hair.position.y = 1.68; hair.scale.y = 0.6; person.add(hair);
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.7, 0.2), this.plain(shirt)); body.position.y = 1.05; person.add(body);
      person.position.set(gx(x), y0, gz(66)); this.scene.add(person);
    };
    anchor(76, "#E07A66"); anchor(84, "#4F91C7");
    this.box(1.2, 0.7, 0.15, this.plain("#2b2b34"), gx(80), y0 + 1.35, gz(64.2), { outline: false });
    const n = 8, z0 = gz(STAIR_BLOCK.y + STAIR_BLOCK.h), z1 = gz(STAIR_BLOCK.y), mid = STAIR_BLOCK.x + STAIR_BLOCK.w / 2;
    for (let i = 0; i < n; i++) { const t = (i + 0.5) / n, z = z0 + (z1 - z0) * t, h = 0.28 + t * (y0 - 0.28); this.box(7.2, h, Math.abs(z1 - z0) / n + 0.02, wood, gx(mid), h / 2, z, { outline: false, shadow: false }); }
    for (const side of [-1, 1]) this.box(0.12, 1.05, 8.2, ink, gx(mid + side * 3.7), y0 * 0.45 + 0.4, (z0 + z1) / 2, { outline: false, shadow: false });
    void UP_DOORS;
  }
  private fx!: { tick(t: number, dt: number): void };
  private buildDetails() {
    const doors = DOORS.map((d) => ({ x: d.cx - W / 2, z: d.cy - H / 2, rot: d.face === "S" ? 0 : Math.PI, col: SUBJ_COL[d.subject] }));
    doors.push({ x: NEWS.cx - W / 2, z: -H / 2, rot: 0, col: "#8E7CC3" }, { x: -W / 2, z: OPEN.cy - H / 2, rot: Math.PI / 2, col: "#E8A33D" });
    this.fx = buildHallDetails(this.scene, { wins: this.winSpots, doors, benches: PROPS.filter((p) => p.kind === "bench").map((p) => ({ x: p.x - W / 2, z: p.y - H / 2, rot: p.rot ?? 0 })) });
  }
  private tree(x: number, z: number, s = 1) {
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16 * s, 0.28 * s, 2.1 * s, 8), this.plain("#8A5A32")); trunk.position.y = 1.05 * s; trunk.castShadow = true; g.add(trunk);
    const bark = new THREE.Mesh(new THREE.CylinderGeometry(0.2 * s, 0.22 * s, 0.35 * s, 8), this.plain("#6B4228")); bark.position.y = 0.2 * s; g.add(bark);
    const greens = ["#1F8A4C", "#3CB371", "#167A45", "#7DDE8A", "#0E6B3C"];
    [[0, 2.5, 0, 1.15], [0.55, 2.15, 0.2, 0.72], [-0.5, 2.25, -0.25, 0.78], [0.15, 3.15, -0.1, 0.7], [-0.2, 2.0, 0.5, 0.62]].forEach(([dx, dy, dz, r], i) => {
      const f = new THREE.Mesh(new THREE.IcosahedronGeometry(r * s, 1), new THREE.MeshStandardMaterial({ color: greens[i % greens.length], roughness: 0.85, flatShading: true }));
      f.position.set(dx * s, dy * s, dz * s); f.castShadow = true; g.add(f);
    });
    g.position.set(x, 0, z); this.scene.add(g);
  }
  private fountain(x: number, z: number) {
    const g = new THREE.Group(), cream = this.plain("#F7ECD6");
    const base = new THREE.Mesh(new THREE.CylinderGeometry(2.25, 2.35, 0.6, 28), cream); base.position.y = 0.3; base.castShadow = base.receiveShadow = true; g.add(base);
    base.add(new THREE.LineSegments(new THREE.EdgesGeometry(base.geometry, 40), new THREE.LineBasicMaterial({ color: 0x6d5a5f, transparent: true, opacity: 0.5 })));
    const water = new THREE.Mesh(new THREE.CylinderGeometry(1.95, 1.95, 0.05, 28), new THREE.MeshStandardMaterial({ color: "#8FC9E8", emissive: "#8FC9E8", emissiveIntensity: 0.25, roughness: 0.4 })); water.position.y = 0.6; g.add(water);
    const pil = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.42, 1.5, 14), cream); pil.position.y = 1.2; pil.castShadow = true; g.add(pil);
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.5, 0.3, 20), cream); bowl.position.y = 1.9; bowl.castShadow = true; g.add(bowl);
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.05, 20), new THREE.MeshStandardMaterial({ color: "#8FC9E8", emissive: "#8FC9E8", emissiveIntensity: 0.25 })); top.position.y = 2.05; g.add(top);
    const spray = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.9, 10), new THREE.MeshStandardMaterial({ color: "#DDF3FB", emissive: "#DDF3FB", emissiveIntensity: 0.4, transparent: true, opacity: 0.85 })); spray.position.y = 2.55; spray.userData.spray = 1; g.add(spray);
    g.userData.water = water; g.userData.spray = spray; this.fountains.push(g);
    g.position.set(x, 0, z); this.scene.add(g);
  }
  private table(x: number, z: number, y = 0) {
    const g = new THREE.Group(), top = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.08, 20), this.plain("#F1C887")); top.position.y = 0.78; top.castShadow = top.receiveShadow = true; g.add(top);
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.14, 0.78, 8), this.plain("#9A653D")); leg.position.y = 0.39; g.add(leg);
    ["#F28F7E", "#8FC9E8", "#A9DCC0", "#B8A8DA"].forEach((c, i) => { const a = (i / 4) * Math.PI * 2 + 0.4, st = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.2, 0.46, 10), this.plain(c)); st.position.set(Math.cos(a) * 1.0, 0.23, Math.sin(a) * 1.0); st.castShadow = true; st.userData.seat = this.seats.length; g.add(st); this.seats.push({ pos: new THREE.Vector3(x + Math.cos(a) * 1.0, y, z + Math.sin(a) * 1.0), ctr: new THREE.Vector3(x, y, z), mesh: st }); });
    const cm = new THREE.MeshStandardMaterial({ color: "#F8EBD2", roughness: 0.95 }), cloth = new THREE.Mesh(new THREE.CylinderGeometry(0.88, 0.95, 0.03, 24), cm); cloth.position.y = 0.84; cloth.receiveShadow = true; g.add(cloth);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.3, 6), this.plain("#9A653D")); pole.position.set(0, 1.5, 0); g.add(pole);
    const flag = this.emo("⭐", 0.8), sign = this.emo("The Crew", 0.28, true); flag.position.set(0, 2.35, 0); sign.position.set(0, 1.05, 0.45); flag.visible = sign.visible = false; g.add(flag, sign);
    this.tables.push({ x, z, cloth, flag, sign, mat: cm });
    g.position.set(x, y, z); this.scene.add(g);
  }
  private bench(x: number, z: number, rot: number, y = 0) {
    const g = new THREE.Group(); g.add(this.part(0.62, 0.1, 1.8, "#F1C887", 0, 0.5, 0)); g.add(this.part(0.12, 0.45, 1.7, "#9A653D", -0.24, 0.25, 0)); g.add(this.part(0.1, 0.5, 1.8, "#F28F7E", -0.3, 0.8, 0));
    g.rotation.y = rot; g.position.set(x, y, z); this.scene.add(g);
  }
  private part(w: number, h: number, d: number, col: string, x: number, y: number, z: number) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), this.plain(col)); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; return m; }
  private lamp(x: number, z: number, col: string, y = 0) {
    const g = new THREE.Group(); const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 3.0, 6), this.plain("#9A653D")); pole.position.y = 1.5; pole.castShadow = true; g.add(pole);
    const l = new THREE.Mesh(new THREE.SphereGeometry(0.34, 18, 12), Mood.lit(new THREE.MeshStandardMaterial({ map: this.tex(`lan-${col}`, () => T.lanternTex(col)), emissive: col, emissiveIntensity: 0.3, roughness: 1 }), 1.1, 0.3)); l.scale.y = 1.2; l.position.y = 3.2; l.castShadow = true; g.add(l);
    g.position.set(x, y, z); this.scene.add(g);
  }
  private plant(x: number, z: number, y = 0) {
    const g = new THREE.Group(); const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.32, 0.55, 12), this.plain("#C46B4A")); pot.position.y = 0.28; pot.castShadow = true; g.add(pot);
    const cols = ["#1F8A4C", "#3CB371", "#7DDE8A", "#0E6B3C"];
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2, h = 1.7 + (i % 3) * 0.35;
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.045, h, 5), this.plain("#2F6B32")); stem.position.set(Math.cos(a) * 0.16, 0.45 + h / 2, Math.sin(a) * 0.16); g.add(stem);
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), this.plain(cols[i % 4])); leaf.scale.set(1.4, 0.45, 0.7); leaf.position.set(Math.cos(a) * 0.28, 0.4 + h, Math.sin(a) * 0.28); leaf.castShadow = true; g.add(leaf);
    }
    g.position.set(x, y, z); this.scene.add(g);
  }
  /** one merged mesh of paper pennants hung along wall segments [x0,z0,x1,z1] */
  /** a colourful striped welcome mat in front of a door (colour = the room's colour) */
  private doorMat(x: number, z: number, rotY: number, col: string) {
    const cv = document.createElement("canvas"); cv.width = 256; cv.height = 128; const c = cv.getContext("2d")!, base = new THREE.Color(col);
    c.fillStyle = "#" + base.clone().multiplyScalar(0.62).getHexString(); c.fillRect(0, 0, 256, 128); c.fillStyle = col; c.fillRect(10, 10, 236, 108);
    for (let i = 0; i < 6; i++) { c.fillStyle = i % 2 ? "rgba(255,255,255,.55)" : "rgba(255,255,255,.18)"; c.fillRect(24 + i * 36, 24, 18, 80); }
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 1.4), new THREE.MeshBasicMaterial({ map: t, transparent: true, opacity: 0.95 })); m.rotation.x = -Math.PI / 2; m.rotation.z = rotY; m.position.set(x, 0.035, z); this.scene.add(m);
  }
  private bunting(segs: number[][], y: number) {
    const cols = [0xF28F7E, 0xEAB94E, 0x8FC9E8, 0xA9DCC0, 0xB8A8DA, 0xEAA5B2].map((c) => new THREE.Color(c)), pos: number[] = [], col: number[] = [];
    for (const [x0, z0, x1, z1] of segs) {
      const len = Math.hypot(x1 - x0, z1 - z0), n = Math.floor(len / 0.9), tx = (x1 - x0) / len, tz = (z1 - z0) / len;
      for (let i = 0; i < n; i++) {
        const d = 0.45 + i * 0.9, cx = x0 + tx * d, cz = z0 + tz * d, c = cols[i % 6];
        pos.push(cx - tx * 0.22, y, cz - tz * 0.22, cx + tx * 0.22, y, cz + tz * 0.22, cx, y - 0.5, cz); for (let k = 0; k < 3; k++) col.push(c.r, c.g, c.b);
      }
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
    const bm = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide })); this.scene.add(bm); this.buntMeshes.push(bm);
  }
  private buntMeshes: THREE.Mesh[] = []; private tables: { x: number; z: number; cloth: THREE.Mesh; flag: THREE.Sprite; sign: THREE.Sprite; mat: THREE.MeshStandardMaterial }[] = []; private decorG = new THREE.Group(); private emoCache = new Map<string, THREE.CanvasTexture>(); private fountains: THREE.Group[] = [];
  /** a small emoji picture (or short text) as a billboard */
  private emo(ch: string, size: number, text = false): THREE.Sprite {
    const key = ch + (text ? "t" : ""); let t = this.emoCache.get(key);
    if (!t) { const cv = document.createElement("canvas"); cv.width = text ? 256 : 128; cv.height = text ? 64 : 128; const c = cv.getContext("2d")!; c.textAlign = "center"; c.textBaseline = "middle";
      if (text) { c.fillStyle = "rgba(255,249,240,.95)"; c.beginPath(); c.roundRect(2, 6, 252, 52, 22); c.fill(); c.strokeStyle = "rgba(90,60,50,.35)"; c.lineWidth = 3; c.stroke(); c.fillStyle = "#4A3B3F"; c.font = "700 30px 'Trebuchet MS',sans-serif"; c.fillText(ch.slice(0, 16), 128, 34); }
      else { c.font = "96px 'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif"; c.fillText(ch, 64, 70); }
      t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; this.emoCache.set(key, t); }
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false })); sp.scale.set(text ? size * 4 : size, size, 1); return sp;
  }
  /** recolour the bunting flags (theme palette) */
  setBuntingPalette(cols: string[]) { const cs = cols.map((c) => new THREE.Color(c)); for (const m of this.buntMeshes) { const a = m.geometry.getAttribute("color") as THREE.BufferAttribute; for (let i = 0; i < a.count; i++) { const c = cs[Math.floor(i / 3) % cs.length]; a.setXYZ(i, c.r, c.g, c.b); } a.needsUpdate = true; } }
  /** seasonal / holiday decorations indoors (or none): garlands over every door, a ring around the fountain, corner pieces, and a matching bunting palette */
  setTheme(th: { palette: string[]; decor: string[] } | null) {
    this.scene.remove(this.decorG); this.decorG = new THREE.Group(); this.scene.add(this.decorG);
    this.setBuntingPalette(th ? th.palette : ["#F28F7E", "#EAB94E", "#8FC9E8", "#A9DCC0", "#B8A8DA", "#EAA5B2"]); if (!th) return;
    const G = this.decorG, D = th.decor, put = (i: number, x: number, y: number, z: number, sz = 0.55) => { const sp = this.emo(D[i % D.length], sz); sp.position.set(x, y, z); G.add(sp); return sp; };
    const doors: { x: number; z: number; ox: number; oz: number }[] = DOORS.map((d) => { const p = g2w(d.cx, d.cy), o = d.face === "S" ? 0.45 : -0.45; return { x: p.x, z: p.z, ox: 0, oz: o }; });
    const nw = g2w(NEWS.cx, 0), ow = g2w(OPEN.cx, OPEN.cy); doors.push({ x: nw.x, z: nw.z, ox: 0, oz: 0.45 }, { x: ow.x, z: ow.z, ox: 0.45, oz: 0 });
    doors.forEach((d, k) => { const side = d.ox ? "z" : "x"; for (let i = -2; i <= 2; i++) { const sp = put(i + 2 + k, d.x + (side === "x" ? i * 0.5 : d.ox), 3.55 - Math.abs(i) * 0.08, d.z + (side === "z" ? i * 0.5 : d.oz), 0.46); sp.userData.sway = i; } });
    const fount = PROPS.find((p) => p.kind === "fountain")!;
    const fc = g2w(fount.x, fount.y); for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2, sp = put(i, fc.x + Math.cos(a) * 3.9, 0.55, fc.z + Math.sin(a) * 3.9, 0.7); sp.userData.bob = i; }
    for (const [cx, cz] of [[10, 6], [W - 10, 6], [10, H - 8], [W - 10, H - 8]] as const) { const p = g2w(cx, cz); put(3, p.x, 1.1, p.z, 1.3); put(0, p.x + 0.9, 0.6, p.z + 0.4, 0.7); }
  }
  /** per-frame life for the decorations (gentle sway and bobbing) */
  tickDecor(t: number) { for (const sp of this.decorG.children) { const u = sp.userData; if (u.sway != null) sp.position.y += Math.sin(t * 2 + u.sway) * 0.0008; if (u.bob != null) sp.position.y = 0.55 + Math.abs(Math.sin(t * 1.6 + u.bob)) * 0.12; } for (const g of this.fountains) { const spray = g.userData.spray as THREE.Object3D, water = g.userData.water as THREE.Object3D; if (spray) { spray.position.y = 2.55 + Math.sin(t * 3) * 0.08; spray.rotation.y = t * 1.4; } if (water) water.scale.x = water.scale.z = 1 + Math.sin(t * 2.2) * 0.015; } }
  /** Chat Chow crew look: the table you sit at gets your cloth colour, flag and crew name */
  applyChow(home: number, cloth: string, flag: string, crew: string) {
    this.tables.forEach((t, i) => { const mine = i === home; t.mat.color.set(mine ? cloth : "#F8EBD2"); t.flag.visible = mine; t.sign.visible = mine; if (mine) { const nf = this.emo(flag, 0.8), ns = this.emo(crew, 0.28, true); t.flag.material.map = nf.material.map; t.flag.material.needsUpdate = true; t.sign.material.map = ns.material.map; t.sign.material.needsUpdate = true; } });
  }
  get tableCount() { return this.tables.length; }
  tableNear(x: number, z: number): number { let b = 0, bd = 1e9; this.tables.forEach((t, i) => { const d = Math.hypot(t.x - x, t.z - z); if (d < bd) { bd = d; b = i; } }); return b; }

  /* ------------------------------------------------------------ outside the walls: lawn, paths, trees, houses, hills (so the paper is never empty) */
  private buildOutside() {
    const S = this.scene;
    const gt = this.rep("grass", () => T.groundTex(), 60, 60), ground = new THREE.Mesh(new THREE.PlaneGeometry(480, 480), this.std(gt)); ground.rotation.x = -Math.PI / 2; ground.position.y = -0.04; ground.receiveShadow = true; S.add(ground);
    this.flat(this.rep("stoneP", () => T.stoneTex(), 2, 7), 7.4, 28, 0, H / 2 + 14, -0.02);
    const disc = new THREE.Mesh(new THREE.CircleGeometry(9, 40), this.std(this.rep("stoneD", () => T.stoneTex(), 5, 5))); disc.rotation.x = -Math.PI / 2; disc.position.set(0, -0.015, H / 2 + 30); disc.receiveShadow = true; S.add(disc);
    // instanced paper trees: a trunk + a faceted crown each
    const spots: { x: number; z: number; s: number }[] = [];
    for (let i = 0; i < 900 && spots.length < 190; i++) {
      const x = (hash(i, 1) - 0.5) * 150, z = (hash(i, 2) - 0.5) * 140 + 8;
      if (Math.abs(x) < W / 2 + 5 && Math.abs(z) < H / 2 + 5) continue;                   // keep clear of the building
      if (Math.abs(x) < 6 && z > 0) continue;                                              // and the entrance path
      if (Math.abs(x) < 18 && z > H / 2 - 2 && z < H / 2 + 22) continue;                   // keep the front walk, the bus lane and the bulletin board clear
      if (Math.hypot(x, z - (H / 2 + 30)) < 11) continue;
      spots.push({ x, z, s: 0.8 + hash(i, 3) * 0.9 });
    }
    const crown = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1.5, 0), new THREE.MeshStandardMaterial({ roughness: 1, flatShading: true }), spots.length), trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.16, 0.24, 1.8, 6), this.plain("#9A653D"), spots.length);
    const m4 = new THREE.Matrix4(), greens = ["#5E9C72", "#88B89A", "#3F7655", "#A9DCC0", "#EAB94E", "#F2A79B"];
    spots.forEach((p, i) => {
      m4.compose(new THREE.Vector3(p.x, 2.7 * p.s, p.z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, hash(i, 5) * 6, 0)), new THREE.Vector3(p.s, p.s * 1.15, p.s)); crown.setMatrixAt(i, m4);
      crown.setColorAt(i, new THREE.Color(greens[hash(i, 6) < 0.12 ? 4 + (i & 1) : Math.floor(hash(i, 7) * 4)]));
      m4.compose(new THREE.Vector3(p.x, 0.9 * p.s, p.z), new THREE.Quaternion(), new THREE.Vector3(p.s, p.s, p.s)); trunk.setMatrixAt(i, m4);
    });
    crown.castShadow = trunk.castShadow = true; S.add(crown, trunk);
    for (const x of [-16, -26, -36, 16, 26, 36]) this.tree(x, H / 2 + 10, 1.35);
    for (const x of [-20, 20]) this.tree(x, H / 2 + 18, 1.6);
    // little paper houses and hills ringing the lawn
    const wallCols = ["#F2A79B", "#F4D488", "#9FD0B0", "#9CC3E0", "#E8C39A", "#C9B7E8"], roofCols = ["#C98569", "#9A653D", "#7C94B0", "#B8604F"];
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * Math.PI * 2 + hash(i, 8) * 0.2, rx = 78 + hash(i, 9) * 18, x = Math.cos(a) * rx * 1.1, z = Math.sin(a) * rx * 0.85 + 6;
      if (Math.abs(x) < 8 && z > 0) continue;
      const w = 5 + hash(i, 10) * 4, h = 3.5 + hash(i, 11) * 2.5, g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, w * 0.9), this.plain(wallCols[i % 6])); body.position.y = h / 2; body.castShadow = true; g.add(body);
      body.add(new THREE.LineSegments(new THREE.EdgesGeometry(body.geometry), new THREE.LineBasicMaterial({ color: 0x6d5a5f, transparent: true, opacity: 0.45 })));
      const roof = new THREE.Mesh(new THREE.ConeGeometry(w * 0.82, h * 0.7, 4), this.plain(roofCols[i % 4])); roof.position.y = h + h * 0.35; roof.rotation.y = Math.PI / 4; roof.castShadow = true; g.add(roof);
      g.position.set(x, 0, z); g.rotation.y = hash(i, 12) * 6; S.add(g);
    }
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2 + 0.2, r = 118 + hash(i, 13) * 30, s = 14 + hash(i, 14) * 14, hill = new THREE.Mesh(new THREE.ConeGeometry(s * 1.5, s, 6), new THREE.MeshStandardMaterial({ color: ["#A9CDB8", "#B7D8A4", "#9CC3A8"][i % 3], roughness: 1, flatShading: true }));
      hill.position.set(Math.cos(a) * r * 1.15, s / 2 - 0.5, Math.sin(a) * r * 0.9 + 6); S.add(hill);
    }
  }

  /* ------------------------------------------------------------ people (billboarded chibi sprites baked from the vector art) */
  private makePerson(id: number, look: Look, h = AGE_SCALE[look.age ?? "hs"] * ((look as any).hScale ?? 1)): Person {
    const tex = new THREE.CanvasTexture(bakeSheet(look)); tex.colorSpace = THREE.SRGBColorSpace; tex.repeat.set(1 / COLS, 1 / DIRS.length); tex.anisotropy = 4;
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 1, depthWrite: false }); const sprite = new THREE.Sprite(mat);
    sprite.center.set(0.5, FEET / FH); sprite.scale.set(((FW / SCALE) * UNIT) * h * CHAR_K, ((FH / SCALE) * UNIT) * h * CHAR_K, 1); this.scene.add(sprite);
    const body = makeBody(look, sprite.scale.y * 0.92); body.visible = false;
    const blob = new THREE.Mesh(new THREE.CircleGeometry(0.28, 14), new THREE.MeshBasicMaterial({ color: "#000", transparent: true, opacity: 0.18, depthWrite: false })); blob.rotation.x = -Math.PI / 2; blob.position.y = 0.02; this.scene.add(blob);
    return { id, look, sprite, body, mat, tex, blob, pos: new THREE.Vector3(), dir: 0, frame: 0, moving: false, baseScale: sprite.scale.clone(), gait: "steady", fidgetT: 4 + Math.random() * 10 };
  }

  /* ------------------------------------------------------------ friends visiting (real people you are connected with, opt-in on both sides) */
  visitors = new Map<string, Person & { tx: number; tz: number; sig: string; label: THREE.Sprite }>();
  myState() { return { x: +this.player.pos.x.toFixed(2), z: +this.player.pos.z.toFixed(2), dir: this.player.dir, moving: this.player.moving }; }
  private dropVisitor(p: Person & { label: THREE.Sprite }) { this.scene.remove(p.sprite, p.body, p.blob, p.label); p.tex.dispose(); p.mat.dispose(); (p.label.material as THREE.SpriteMaterial).map?.dispose(); p.label.material.dispose(); }
  setVisitors(list: { id: string; name: string; spec: any; x: number; z: number; dir: number; moving: boolean }[]) {
    const seen = new Set<string>();
    for (const v of list) {
      seen.add(v.id); let p = this.visitors.get(v.id); const sig = JSON.stringify(v.spec);
      if (!p || p.sig !== sig) {
        if (p) this.dropVisitor(p);
        let look: Look; try { look = { ...toLook(v.spec, 900 + this.visitors.size), tag: false } as Look; } catch { continue; }
        const q = this.makePerson(900 + this.visitors.size, look); const cv = document.createElement("canvas"); cv.width = 256; cv.height = 64; const c = cv.getContext("2d")!; c.font = "600 28px Fredoka, sans-serif"; c.textAlign = "center";
        const nm = "\u{1F44B} " + String(v.name).slice(0, 18), w = Math.min(244, c.measureText(nm).width + 24); c.fillStyle = "rgba(255,244,220,.92)"; c.beginPath(); c.roundRect((256 - w) / 2, 8, w, 46, 14); c.fill(); c.fillStyle = "#4A3B3F"; c.fillText(nm, 128, 41);
        const lt = new THREE.CanvasTexture(cv); const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: lt, transparent: true, depthTest: false })); label.scale.set(2.2, 0.55, 1); label.renderOrder = 12; this.scene.add(label);
        p = Object.assign(q, { tx: v.x, tz: v.z, sig, label }); p.pos.set(v.x, 0, v.z); this.visitors.set(v.id, p);
      }
      p.tx = v.x; p.tz = v.z; p.dir = v.dir; p.moving = v.moving;
    }
    for (const [id, p] of this.visitors) if (!seen.has(id)) { this.dropVisitor(p); this.visitors.delete(id); }
  }
  private tickVisitors(dt: number) {
    for (const p of this.visitors.values()) {
      const dx = p.tx - p.pos.x, dz = p.tz - p.pos.z, d = Math.hypot(dx, dz); if (d > 8) p.pos.set(p.tx, 0, p.tz); else if (d > 0.02) { const k = Math.min(1, dt * 4); p.pos.x += dx * k; p.pos.z += dz * k; }
      p.frame = p.moving || d > 0.15 ? 1 + (Math.floor(this.t * 9) % 4) : 0;
      const h = (p.sprite.scale.y || 1); p.label.position.set(p.pos.x, h + 0.5, p.pos.z);
    }
  }
  /** open tiles the entrance can actually reach (flood fill), used as idle spots */
  private reachable() {
    const seen = new Set<number>(), q = [ENTRANCE.tile.y * W + ENTRANCE.tile.x]; seen.add(q[0]);
    while (q.length) { const k = q.pop()!, x = k % W, y = Math.floor(k / W); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, nk = ny * W + nx; if (nx < 0 || ny < 0 || nx >= W || ny >= H || NAV[ny][nx] !== "." || seen.has(nk)) continue; seen.add(nk); q.push(nk); } }
    this.open = [...seen].map((k) => ({ x: k % W, y: Math.floor(k / W) })).filter((t) => t.y < H - 2);
  }
  private buildPeople() {
    const ent = g2w(ENTRANCE.tile.x + 0.5, ENTRANCE.tile.y + 0.5);
    this.students = ROSTER.slice(0, HALL_COUNT).map((def, i) => {
      const age = def.age, p = this.makePerson(def.id, Events.dress(def.look, def.id, false));
      p.pos.copy(ent); p.sprite.visible = false; p.blob.visible = false; p.def = def; const d = DOORS[i % 4];
      const gait = GAIT_BY_PERSONALITY[def.personality] ?? "steady"; return Object.assign(p, { gait, hidden: true, path: [], speed: rnd(2.3, 3.1) * GAITS[gait].speed * (age === "k2" ? 0.8 : age === "g35" ? 0.9 : age === "g68" ? 0.97 : 1), pending: null, lastDoor: { x: Math.floor(d.approach.x), y: Math.floor(d.approach.y) }, hideOnArrive: false, fade: 1 }) as Stu;
    });
    this.player = this.makePerson(11, Events.dress({ ...toLook(Social.profile.avatar, 11), tag: true }, 11, true));
    this.player.pos.copy(g2w(54, 40));
    // staff: a hall monitor and a teacher (adults, the tallest size class) walking loops of the plaza and ring corridor
    this.monitor = this.makePerson(STAFF[0].id, STAFF[0].look); this.monitor.def = STAFF[0]; this.monitor.pos.copy(g2w(18, 30));
    this.teacher = this.makePerson(STAFF[1].id, STAFF[1].look); this.teacher.def = STAFF[1]; this.teacher.pos.copy(g2w(64, 34));
    this.duty = STAFF.filter((d) => d.faculty === "park").map((d, i) => { const p = this.makePerson(d.id, d.look); p.def = d; p.pos.copy(g2w(i ? 70 : 18, i ? 60 : 4)); return p; });
    const ring = [[8, 8], [54, 6], [100, 22], [100, 52], [90, 74], [54, 74], [8, 58], [8, 30]];
    this.walkers = [
      ...(this.duty[0] ? [{ p: this.duty[0], stops: ring, path: [] as THREE.Vector3[], leg: 0, speed: 0.95 }] : []),
      { p: this.monitor, stops: [[36, 40], [72, 40], [72, 56], [36, 56], [54, 36], [10, 8]], path: [], leg: 0, speed: 1.15 },
      { p: this.teacher, stops: [[70, 48], [36, 48], [8, 50], [54, 68], [96, 50], [54, 36]], path: [], leg: 0, speed: 1.0 },
    ];
  }
  /** the class-times bulletin board: a free-standing corkboard on the plaza that shows today's picked times and lesson numbers */
  boardPos = g2w(OUTSIDE.board.x, OUTSIDE.board.y); private boardTex!: THREE.CanvasTexture; private boardCv!: HTMLCanvasElement;
  refreshBoard() { const c = this.boardCv.getContext("2d")!; drawBoard(c, this.boardCv.width, this.boardCv.height); this.boardTex.needsUpdate = true; }
  private buildClassBoard() {
    const cv = this.boardCv = document.createElement("canvas"); cv.width = 1024; cv.height = 680; this.boardTex = new THREE.CanvasTexture(cv); this.boardTex.colorSpace = THREE.SRGBColorSpace; this.boardTex.anisotropy = 4; this.refreshBoard();
    const g = new THREE.Group(), wood = this.plain("#9A653D");
    for (const sx of [-1.35, 1.35]) { const post = new THREE.Mesh(new THREE.BoxGeometry(0.14, 2.7, 0.14), wood); post.position.set(sx, 1.35, 0); post.castShadow = true; g.add(post); }
    const back = new THREE.Mesh(new THREE.BoxGeometry(3.0, 2.0, 0.1), wood); back.position.set(0, 1.75, 0); back.castShadow = true; g.add(back);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(2.86, 1.9), new THREE.MeshBasicMaterial({ map: this.boardTex, toneMapped: false })); face.position.set(0, 1.75, 0.06); g.add(face);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(3.3, 0.14, 0.4), this.plain("#E07A66")); roof.position.set(0, 2.82, 0.04); roof.castShadow = true; g.add(roof);
    g.position.copy(this.boardPos); this.scene.add(g);
    addEventListener("unify:progress", () => this.refreshBoard()); setInterval(() => this.refreshBoard(), 60000);
  }

  /* ------------------------------------------------------------ the school bus, arrival, and Chat Chow seats */
  private buildBus() {
    const g = new THREE.Group(), yel = this.plain("#F2B632"), blk = this.plain("#2b2b34"), win = new THREE.MeshStandardMaterial({ color: "#8FC9E8", roughness: 0.3, emissive: "#355a70", emissiveIntensity: 0.25 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(8.6, 2.5, 2.7), yel); body.position.set(0.7, 1.85, 0); body.castShadow = true; g.add(body);
    const hood = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.4, 2.5), yel); hood.position.set(-4.6, 1.3, 0); hood.castShadow = true; g.add(hood);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(8.4, 0.12, 2.5), this.plain("#F8D977")); roof.position.set(0.7, 3.14, 0); g.add(roof);
    for (const sz of [-1.36, 1.36]) { const strip = new THREE.Mesh(new THREE.BoxGeometry(8.62, 0.14, 0.02), blk); strip.position.set(0.7, 1.55, sz); g.add(strip); const strip2 = strip.clone(); strip2.position.y = 2.4; g.add(strip2);
      for (let i = 0; i < 8; i++) { const w = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.7, 0.03), win); w.position.set(-2.55 + i * 0.99, 2.7 - 0.0, sz); w.position.y = 2.72; g.add(w); } }
    for (const [wx, wz] of [[-4.6, -1.15], [-4.6, 1.15], [2.9, -1.2], [2.9, 1.2], [0.5, -1.2], [0.5, 1.2]].slice(0, 4)) { const wh = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.34, 14), blk); wh.rotation.x = Math.PI / 2; wh.position.set(wx, 0.62, wz); wh.castShadow = true; wh.userData.wheel = 1; g.add(wh); }
    for (const sz of [-0.85, 0.85]) { const hl = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6), new THREE.MeshBasicMaterial({ color: "#FFF3B0" })); hl.position.set(-5.62, 1.0, sz); g.add(hl); }
    const lbl = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 0.55), new THREE.MeshBasicMaterial({ map: T.signTex("UNIFY ACADEMY", "#2b2b34"), transparent: true })); lbl.position.set(1.4, 2.0, -1.37); lbl.rotation.y = Math.PI; g.add(lbl);
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.04, 8), new THREE.MeshBasicMaterial({ color: "#D8433A" })); arm.rotation.x = Math.PI / 2; arm.rotation.z = Math.PI / 8; arm.position.set(-2.6, 2.1, -1.4); arm.visible = false; g.add(arm);
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.85, 1.9, 0.05), this.plain("#d9a31f")); door.position.set(-3.0, 1.55, -1.37); g.add(door);
    g.rotation.y = 0; g.position.set(OUTSIDE.busStop.x - W / 2 + 60, 0, OUTSIDE.busStop.y - H / 2); g.visible = false; this.scene.add(g); this.bus = g; this.busState = { t: 0, mode: "idle", from: g.position.x, to: OUTSIDE.busStop.x - W / 2, arm, door };
  }
  private buildRoad() {
    const road = new THREE.Mesh(new THREE.PlaneGeometry(220, 6.4), new THREE.MeshStandardMaterial({ color: "#5d5a62", roughness: 1 })); road.rotation.x = -Math.PI / 2; road.position.set(0, -0.005, OUTSIDE.roadY - H / 2); road.receiveShadow = true; this.scene.add(road);
    for (let x = -100; x < 100; x += 4) { const d = new THREE.Mesh(new THREE.PlaneGeometry(2, 0.14), new THREE.MeshBasicMaterial({ color: "#F8D977" })); d.rotation.x = -Math.PI / 2; d.position.set(x, 0.002, OUTSIDE.roadY - H / 2 - 1.4); this.scene.add(d); }
    for (let i = 0; i < 7; i++) { const z = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 6.2), new THREE.MeshBasicMaterial({ color: "#F4EEE0" })); z.rotation.x = -Math.PI / 2; z.position.set(-3 + i * 1.0, 0.003, OUTSIDE.roadY - H / 2); this.scene.add(z); }
    const walk = new THREE.Mesh(new THREE.PlaneGeometry(60, 4.2), this.std(this.rep("stoneW", () => T.stoneTex(), 14, 1))); walk.rotation.x = -Math.PI / 2; walk.position.set(0, -0.012, H / 2 + 3.0); this.scene.add(walk);
  }
  /** is a seat free (no one else is meant to be there) */
  standUp() { if (this.sitting == null) return; const s = this.seats[this.sitting]; const out = s.pos.clone().sub(s.ctr).setY(0).normalize().multiplyScalar(0.7); this.player.pos.copy(s.pos).add(out); this.sitting = null; this.pendingSeat = null; }
  /** walk to a Chat Chow seat and sit; face the table */
  sitAt(i: number) {
    if (this.inputLocked || this.cine) return false; const s = this.seats[i]; if (!s) return false; this.standUp();
    const out = s.pos.clone().sub(s.ctr).setY(0).normalize(), pre = s.pos.clone().addScaledVector(out, 0.9), gx = pre.x + W / 2, gy = pre.z + H / 2;
    if (!this.planNav(Math.floor(gx) + 0.5, Math.floor(gy) + 0.5, "a seat at Chat Chow", s.pos.clone())) return false; this.pendingSeat = i; return true;
  }
  /** the nearest free-looking seat to the player (idle behaviour) */
  autoSit() { if (this.sitting != null || this.nav || this.cine || this.inputLocked) return false; let bi = -1, bd = 1e9; this.seats.forEach((s, i) => { const d = s.pos.distanceTo(this.player.pos); if (d < bd) { bd = d; bi = i; } }); return bi >= 0 ? this.sitAt(bi) : false; }
  private ensureSitTex(p: Person) { if (p.sitTex) return; const t = new THREE.CanvasTexture(bakeSheet({ ...p.look, sit: true } as Look)); t.colorSpace = THREE.SRGBColorSpace; t.repeat.set(1 / COLS, 1 / DIRS.length); t.anisotropy = 4; p.sitTex = t; }
  /** the morning arrival: the bus rolls in, the avatar steps off and walks to the bulletin board; `onAtBoard` fires when they get there */
  startArrival(onAtBoard: () => void) {
    if (!this.bus || !this.busState) { onAtBoard(); return; }
    this.standUp(); this.nav = null; const B = this.bus, st = this.busState; B.visible = true; B.position.x = st.from; st.t = 0; st.mode = "in"; st.arm.visible = false; this.player.sprite.visible = false; this.player.blob.visible = false; this.arrivalHide = true; this.arrivalCam = true; this.inputLocked = true;
    this.onBusStopped = () => {
      const door = new THREE.Vector3(B.position.x - 3.0, 0, B.position.z - 2.2); this.player.pos.copy(door); this.arrivalHide = false; this.player.dir = 0;
      const bs = g2w(OUTSIDE.boardStand.x, OUTSIDE.boardStand.y), walk = g2w(OUTSIDE.boardStand.x - 6, OUTSIDE.boardStand.y);
      this.cine = { speed: 3.3, pts: [new THREE.Vector3(door.x, 0, bs.z + 0.4), new THREE.Vector3(walk.x, 0, bs.z + 0.4), new THREE.Vector3(bs.x, 0, bs.z)], done: () => { this.cine = null; this.inputLocked = false; onAtBoard(); setTimeout(() => { if (this.busState) this.busState.mode = "out"; }, 1200); } };
    };
  }
  private arrivalHide = false; arrivalCam = false;
  /** after the schedule is made: walk through the front doors into the school, then on to where the day goes next */
  walkInside(next: () => void) {
    this.standUp(); this.inputLocked = false; const bs = g2w(OUTSIDE.boardStand.x, OUTSIDE.boardStand.y);
    this.cine = { speed: 3.6, pts: [g2w(54, H + 1.8), g2w(54, H - 1.4), g2w(54, H - 5)], done: () => { this.cine = null; this.arrivalCam = false; next(); } }; void bs;
  }
  skipCine() { if (!this.cine) return; const last = this.cine.pts[this.cine.pts.length - 1], d = this.cine.done; this.player.pos.copy(last); this.cine = null; this.arrivalHide = false; this.arrivalCam = false; if (this.busState) { this.busState.mode = "out"; } d?.(); }
  private updateBus(dt: number) {
    const st = this.busState, B = this.bus; if (!st || !B) return;
    const spin = (v: number) => B.children.forEach((c) => { if (c.userData.wheel) c.rotation.z -= v; });
    if (st.mode === "in") { st.t += dt; const k = Math.min(1, st.t / 4.2), e = 1 - Math.pow(1 - k, 3), nx = st.from + (st.to - st.from) * e; spin((nx - B.position.x) * -1.6); B.position.x = nx; if (this.arrivalHide) this.player.pos.set(B.position.x - 3.0, 0, B.position.z); if (k >= 1) { st.mode = "wait"; st.t = 0; st.arm.visible = true; } }
    else if (st.mode === "wait") { st.t += dt; st.door.position.z = -1.37 - Math.min(1, st.t / 0.5) * 0.0; st.door.rotation.y = Math.min(1, st.t / 0.5) * 1.3; if (st.t > 1.1 && this.onBusStopped) { const f = this.onBusStopped; this.onBusStopped = () => {}; f(); } }
    else if (st.mode === "out") { st.t += dt; st.arm.visible = false; st.door.rotation.y = Math.max(0, st.door.rotation.y - dt * 2.6); const sp = Math.min(14, 2 + st.t * 4); B.position.x -= sp * dt; spin(sp * dt * 1.6); if (B.position.x < st.to - 90) { B.visible = false; st.mode = "idle"; B.position.x = st.from; } }
  }

  /* ------------------------------------------------------------ body language: actions, talking mouths, walking styles */
  private actOwners: Person[] = [];
  private ensureAct(p: Person) {
    if (p.actTex) return; const t = new THREE.CanvasTexture(bakeActions(p.look)); t.colorSpace = THREE.SRGBColorSpace; t.repeat.set(1 / POSE_KEYS.length, 1); t.anisotropy = 4; p.actTex = t; this.actOwners.push(p);
    if (this.actOwners.length > 14) { const o = this.actOwners.shift()!; if (o !== this.player && !o.act) { o.actTex?.dispose(); o.actTex = undefined; } else this.actOwners.push(o); }
  }
  /** play a named action on a person (ignored while they are walking, sitting or already doing something) */
  playAction(p: Person, name: string): boolean {
    if (!ACTIONS[name] || (p.act && !p.act.auto) || p.moving) return false; if (p === this.player && this.sitting != null) return false;
    this.ensureAct(p); p.act = { name, t: 0 }; return true;
  }
  /** the player's emote: stops walking first */
  emote(name: string) { if (this.nav) this.cancelNav(); if (this.sitting != null) this.standUp(); this.player.moving = false; return this.playAction(this.player, name); }
  /** make an NPC react (used by conversations): by roster id */
  react(id: number, name: string) { const p = this.persons().find((q) => q.def?.id === id) ?? (id === 11 ? this.player : undefined); return p ? this.playAction(p, name) : false; }
  setGait(name: string) { if (GAITS[name]) { this.player.gait = name; try { localStorage.setItem("unify.gait", name); } catch { /* private mode */ } } }
  get gait() { return this.player.gait ?? "steady"; }
  private applyBody(p: Person, dt: number, isPlayer: boolean) {
    const base = p.baseScale; if (!base) return; const seated = isPlayer && this.sitting != null;
    let a = p.act ?? null; if (!a && p.speaking && !p.moving && !seated) { a = p.act = { name: "talk", t: 0, auto: true }; } if (a && a.auto && !p.speaking) { p.act = a = null; }
    if (a && (p.moving || seated)) { p.act = a = null; }
    if (a) { const A = ACTIONS[a.name]; a.t += dt; if (!A.loop && a.t >= A.dur) { p.act = a = null; } }
    this.showAct(p, a?.name ?? "");
    let mv: { y?: number; x?: number; roll?: number; sy?: number } = {};
    if (a) { const A = ACTIONS[a.name]; const key = frameAt(A, a.t); this.ensureAct(p); p.mat.map = p.actTex!; p.actTex!.offset.set(POSE_IX[key] / POSE_KEYS.length, 0); mv = A.move?.(A.loop ? a.t % A.dur : a.t) ?? {}; }
    else if (!isPlayer && p.mat.map !== p.tex) p.mat.map = p.tex;
    let y = mv.y ?? 0, x = mv.x ?? 0, roll = mv.roll ?? 0, sy = mv.sy ?? 1;
    if (!a && p.moving && !seated) { const g = GAITS[p.gait ?? "steady"] ?? GAITS.steady, ph = this.t * 9 * g.stepHz; y += Math.abs(Math.sin(ph)) * g.bounce; roll += Math.sin(ph) * g.sway; sy *= 1 - g.squash * Math.abs(Math.cos(ph)); }
    const e = this.camera.matrixWorld.elements; p.sprite.position.x += e[0] * x; p.sprite.position.z += e[2] * x; p.sprite.position.y += y; p.mat.rotation = roll; p.sprite.scale.set(base.x, base.y * sy, 1);
  }
  private actMarks = new Map<Person, THREE.Sprite>();
  private showAct(p: Person, name: string) {
    const icon: Record<string, string> = { wave: "👋", highfive: "🙌", cheer: "🎉", jump: "⬆️", hop: "⬆️", dance: "💃", clap: "👏", laugh: "😄", nod: "🙂", shake: "🙅", talk: "💬", scratch: "🤔", shy: "😊", shrug: "🤷", point: "👉", think: "💭", thumbs: "👍" };
    let sp = this.actMarks.get(p);
    if (!name || !icon[name]) { if (sp) sp.visible = false; return; }
    if (!sp) { sp = this.emo(icon[name], 0.42); sp.userData.act = name; this.scene.add(sp); this.actMarks.set(p, sp); }
    else if (sp.userData.act !== name) { (sp.material as THREE.SpriteMaterial).map = this.emo(icon[name], 0.42).material.map!; sp.userData.act = name; }
    sp.visible = true; sp.position.set(p.pos.x, p.pos.y + 2.15, p.pos.z);
  }
  private fidget(s: Stu, dt: number) {
    if (s.hidden || s.path.length || s.pending || s.talking || s.act || !s.def) return; s.fidgetT = (s.fidgetT ?? 6) - dt; if (s.fidgetT > 0) return;
    s.fidgetT = rnd(7, 18); const list = FIDGETS[s.def.personality] ?? ["wave", "nod"]; this.playAction(s, list[Math.floor(Math.random() * list.length)]);
  }
  private patrol(dt: number, fwd: THREE.Vector3) {
    for (const w of this.walkers) {
      const m = w.p; if (m.talking) { m.moving = false; m.frame = 0; continue; }
      if (!w.path.length) { const gx = Math.floor(m.pos.x + W / 2), gy = Math.floor(m.pos.z + H / 2), [tx, ty] = w.stops[w.leg]; w.leg = (w.leg + 1) % w.stops.length; w.path = astar(NAV, Math.max(0, Math.min(W - 1, gx)), Math.max(0, Math.min(H - 1, gy)), tx, ty).map((t) => g2w(t.x + 0.5, t.y + 0.5)); }
      const tgt = w.path[0]; if (!tgt) { m.moving = false; m.frame = 0; continue; }
      const step = w.speed * dt, aim = tgt.clone().sub(m.pos); aim.y = 0; if (this.approach(m, tgt.x, tgt.z, step, 0)) w.path.shift(); if (aim.lengthSq() > 1e-4) m.dir = this.dirFrom(aim, fwd, m.dir);
      m.moving = true; m.frame = 1 + (Math.floor(this.t * 5) % 4);
    }
  }
  private setFrame(p: Person, dirIdx: number, frame: number) {
    const seated = p === this.player && this.sitting != null && !!p.sitTex, tx = seated ? p.sitTex! : p.tex; if (p === this.player && p.mat.map !== tx) { p.mat.map = tx; }
    tx.offset.set((seated ? 0 : frame) / COLS, 1 - (dirIdx + 1) / DIRS.length);
  }
  /** choose down/up/left/right relative to the camera from a world-space velocity */
  /** facing index for a world-space direction, relative to where the camera looks */
  faceDir(v: THREE.Vector3, keep: number) { const f = new THREE.Vector3(); this.camera.getWorldDirection(f); f.y = 0; if (f.lengthSq() < 1e-4) f.set(0, 0, -1); return this.dirFrom(v, f.normalize(), keep); }
  private dirFrom(v: THREE.Vector3, fwd: THREE.Vector3, keep: number) {
    const a = v.x * fwd.x + v.z * fwd.z, b = v.x * -fwd.z + v.z * fwd.x; if (Math.hypot(a, b) < 1e-3) return keep;
    return Math.abs(a) >= Math.abs(b) ? (a > 0 ? 1 : 0) : b > 0 ? 3 : 2;
  }

  /** everyone currently on screen */
  persons(): Person[] { return [...this.students.filter((s) => !s.hidden), this.monitor, this.teacher, ...this.duty]; }
  private ray = new THREE.Raycaster();
  /** tap/click: a person (sprite hit, else the nearest to the ray) or a spot on the floor to walk to */
  private handleTap(cx: number, cy: number) {
    const r = this.renderer.domElement.getBoundingClientRect(), nd = new THREE.Vector2(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1); this.ray.setFromCamera(nd, this.camera);
    const people = this.persons(), hits = this.ray.intersectObjects(people.map((p) => p.sprite).filter((sp) => sp.visible), false);
    let who: Person | null = hits.length ? people.find((p) => p.sprite === hits[0].object) ?? null : null;
    if (!who) { let best = 0.85; for (const p of people) { const c = p.pos.clone().multiplyScalar(IS).setY(0.8 * AGE_SCALE[p.look.age ?? "hs"] + 0.2), d = this.ray.ray.distanceToPoint(c); if (d < best) { best = d; who = p; } } }
    if (who) { this.onTap(who); return; }
    const sh = this.ray.intersectObjects(this.seats.map((q) => q.mesh), false); if (sh.length && sh[0].distance < 70) { this.sitAt(sh[0].object.userData.seat); return; }
    const art = this.ray.intersectObjects([...this.hallPics, ...(this.tvScreen ? [this.tvScreen] : [])], false);
    if (art.length && art[0].distance < (art[0].object === this.tvScreen ? 90 : 60)) { const o = art[0].object; if (o === this.tvScreen) { this.onTV(); return; } const u = o.userData; this.onPic(u.pid, u.title, u.subject); return; }
    this.onTap(null);
    const hit = new THREE.Vector3(); if (this.view !== "first" && this.ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit)) this.walkToPoint(hit.x / IS + W / 2, hit.z / IS + H / 2, "that spot");
  }
  /* ---- the news TV: mounted high on the plaza wall, playing the papercut newsroom ---- */
  private tvCv!: HTMLCanvasElement; private tvI = 0; private tvAt = 0; private tvTex!: THREE.CanvasTexture;
  private buildNewsTV() {
    const pos = g2w(22, 26.2), cv = this.tvCv = document.createElement("canvas"); cv.width = 1024; cv.height = 576; this.tvTex = new THREE.CanvasTexture(cv); this.tvTex.colorSpace = THREE.SRGBColorSpace; this.tvTex.anisotropy = 4;
    const g = new THREE.Group(), dark = this.plain("#2b2b34"), wood = this.plain("#C4894A");
    const frame = new THREE.Mesh(new THREE.BoxGeometry(3.4, 2.05, 0.12), wood); frame.position.set(0, 3.15, 0); frame.castShadow = true; g.add(frame);
    const bezel = new THREE.Mesh(new THREE.BoxGeometry(3.05, 1.72, 0.08), dark); bezel.position.set(0, 3.15, 0.04); g.add(bezel);
    const sc = new THREE.Mesh(new THREE.PlaneGeometry(2.85, 1.55), new THREE.MeshBasicMaterial({ map: this.tvTex, toneMapped: false })); sc.position.set(0, 3.15, 0.1); g.add(sc); this.tvScreen = sc;
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.28), new THREE.MeshBasicMaterial({ map: T.signTex("NEWSROOM  ·  TAP", "#E07A66"), transparent: true })); plate.position.set(0, 1.95, 0.08); g.add(plate);
    g.position.copy(pos); this.scene.add(g);
    void loadNews(); onNews(() => this.drawTV()); this.drawTV(); setInterval(() => this.drawTV(), 200);
  }
  private drawTV() {
    const c = this.tvCv.getContext("2d")!, w = 1024, h = 576, now = Date.now(), its = newsItems(); if (now - this.tvAt > 8000) { this.tvAt = now; this.tvI = (this.tvI + 1) % Math.max(1, its.length); } const it = its[this.tvI % its.length];
    c.fillStyle = "#7EC8F0"; c.fillRect(0, 0, w, h); c.fillStyle = "#3CB371"; c.fillRect(0, 340, w, 236);
    c.fillStyle = "#F4E2C4"; c.fillRect(40, 250, 280, 160); c.fillStyle = "#C45A4A"; c.beginPath(); c.moveTo(30, 250); c.lineTo(180, 150); c.lineTo(330, 250); c.fill();
    const bob = Math.sin(now / 280) * 8;
    const paper = (x: number, y: number, shirt: string, name: string) => {
      c.fillStyle = "#F2C7A0"; c.beginPath(); c.arc(x, y - 70 + bob, 28, 0, 7); c.fill();
      c.fillStyle = "#4A3728"; c.fillRect(x - 26, y - 98 + bob, 52, 18);
      c.fillStyle = shirt; c.fillRect(x - 26, y - 40 + bob, 52, 58); c.fillStyle = "#2C3E6B"; c.fillRect(x - 22, y + 18 + bob, 18, 40); c.fillRect(x + 4, y + 18 + bob, 18, 40);
      c.fillStyle = "#fff"; c.font = "700 22px Georgia, serif"; c.textAlign = "center"; c.fillText(name, x, y + 80);
    };
    paper(620, 300, "#E07A66", "Maya"); paper(820, 300, "#4F91C7", "Marcus");
    c.fillStyle = "#E07A66"; c.fillRect(0, 0, w, 78); c.fillStyle = "#fff"; c.font = "700 40px Georgia, serif"; c.textAlign = "left"; c.fillText("PAPERCUT NEWS", 28, 52);
    c.fillStyle = newsIsLive() ? "#2f7a4c" : "#8a5f1c"; c.beginPath(); c.roundRect(w - 270, 20, 242, 44, 22); c.fill(); c.fillStyle = "#fff"; c.font = "700 24px 'Trebuchet MS',sans-serif"; c.textAlign = "center"; c.fillText(newsIsLive() ? "LIVE HEADLINES" : "SCHOOL BULLETIN", w - 149, 51);
    c.textAlign = "left"; c.fillStyle = "#f8d977"; c.font = "700 26px 'Trebuchet MS',sans-serif"; c.fillText(it.tag, 36, 134);
    const wrap = (txt: string, font: string, maxW: number, maxL: number) => { c.font = font; const words = txt.split(/\s+/), out: string[] = []; let cur = ""; for (const wd of words) { const tst = cur ? cur + " " + wd : wd; if (c.measureText(tst).width > maxW && cur) { out.push(cur); cur = wd; if (out.length >= maxL) break; } else cur = tst; } if (cur && out.length < maxL) out.push(cur); return out; };
    const tl = wrap(it.title, "700 50px 'Trebuchet MS',sans-serif", w - 72, 4); c.fillStyle = "#fff"; c.font = "700 50px 'Trebuchet MS',sans-serif"; tl.forEach((l, i) => c.fillText(l, 36, 196 + i * 58)); const ty = 196 + tl.length * 58 + 12;
    c.fillStyle = "#cfe3f5"; wrap(it.sub, "400 28px 'Trebuchet MS',sans-serif", w - 72, 3).forEach((l, i) => { if (ty + i * 36 < h - 70) { c.font = "400 28px 'Trebuchet MS',sans-serif"; c.fillText(l, 36, ty + i * 36); } });
    c.fillStyle = "#0b1626"; c.fillRect(0, h - 56, w, 56); c.font = "600 26px 'Trebuchet MS',sans-serif"; const line = its.map((x) => x.title).join("   •   "), lw = c.measureText(line).width + 120, off = -((now / 40) % lw); c.fillStyle = "#f8d977"; c.fillText(line + "   •   " + line, off, h - 18);
    for (let i = 0; i < Math.min(12, its.length); i++) { c.fillStyle = i === this.tvI % its.length ? "#E07A66" : "rgba(255,255,255,.3)"; c.beginPath(); c.arc(w - 40 - i * 22, 112, 6, 0, 7); c.fill(); }
    this.tvTex.needsUpdate = true;
  }
  /** walk the player to a floor point (grid units), snapping to the nearest open tile */
  walkToPoint(gx: number, gy: number, label = "there") {
    if (this.inputLocked) return false;
    let best: { x: number; y: number } | null = null, bd = 1e9; const tx = Math.floor(gx), ty = Math.floor(gy);
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const x = tx + dx, y = ty + dy; if (x < 0 || y < 0 || x >= W || y >= H || NAV[y][x] !== ".") continue; const d = Math.hypot(x + 0.5 - gx, y + 0.5 - gy); if (d < bd) { bd = d; best = { x, y }; } }
    if (!best || bd > 2.2) return false; return this.planNav(best.x + 0.5, best.y + 0.5, label, null);
  }
  /** swap the player's look (avatar creator) */
  setAvatar(spec: AvatarSpec) {
    const old = this.player, pos = old.pos.clone(); this.scene.remove(old.sprite, old.body, old.blob); old.tex.dispose(); old.mat.dispose();
    this.beam?.setColor(spec.shirt); this.playerSpec = spec;
    this.player = this.makePerson(11, Events.dress({ ...toLook(spec, 11), tag: true }, 11, true)); this.player.pos.copy(pos); this.player.dir = old.dir; this.player.def = undefined;
  }

  /* ------------------------------------------------------------ doors, navigation */
  placeAtDoor(room: string) {
    if (room === "news") { this.floor = 1; this.player.pos.copy(g2w(28, 62)); this.player.pos.y = FLOOR_Y; this.inDoor = null; this.nav = null; this.navLabel = ""; this.navThen = null; this.onToast(""); return; }
    const d = room === "open" ? { approach: OPEN.approach, subject: "open" as Room } : DOORS.find((x) => x.subject === room) ?? DOORS[0]; this.floor = 0; this.player.pos.copy(g2w(d.approach.x, d.approach.y)); this.player.pos.y = 0; this.inDoor = d.subject; this.nav = null; this.navLabel = ""; this.navThen = null; this.onToast("");
  }
  private clear(a: THREE.Vector3, b: THREE.Vector3) {
    const n = Math.ceil(a.distanceTo(b) / 0.25); for (let i = 1; i < n; i++) { const p = a.clone().lerp(b, i / n); if (solidAt(p.x + W / 2, p.z + H / 2, 0.3, this.floor)) return false; } return true;
  }
  /** walk the player to a class door, the library, the plaza fountain, or the main entrance */
  goTo(key: string) {
    if (key === "library" || key === "news" || key === "newsroom") {
      if (this.floor === 0) {
        this.navThen = () => this.climb(1, () => this.goTo(key));
        if (!this.planNav(STAIR_GROUND.x, STAIR_GROUND.y, "the upstairs stairs", null)) this.navThen = null;
        return;
      }
      const goal = key === "news" ? { x: 28, y: 66 } : key === "newsroom" ? { x: 78, y: 66 } : LIB_READ;
      const label = key === "news" ? "the auditorium" : key === "newsroom" ? "the newsroom" : "the reading room";
      this.planNav(goal.x, goal.y, label, null); return;
    }
    if (this.floor === 1) { this.navThen = null; this.climb(0, () => this.goTo(key)); return; }
    const fount = PROPS.find((p) => p.kind === "fountain")!, board = PROPS.find((p) => p.kind === "bboard")!;
    const door = DOORS.find((d) => d.subject === key), goal = door ? door.approach : key === "news" ? NEWS.approach : key === "open" ? OPEN.approach : key === "plaza" ? { x: fount.x, y: fount.y + 3.2 } : key === "board" ? { x: board.x, y: board.y + 1.6 } : { x: ENTRANCE.tile.x, y: ENTRANCE.tile.y - 2 };
    const label = door ? `${door.subject === "careers" ? "CarryingCareers" : door.subject === "life" ? "Life Lessons" : SUBJ_LABEL[door.subject]} classroom` : key === "news" ? "the auditorium" : key === "open" ? "The Open Door" : key === "plaza" ? "the plaza fountain" : key === "board" ? "the class-times bulletin board" : "the main entrance";
    const tail = door ? g2w(door.cx, door.cy + (door.face === "S" ? 0.5 : -0.5)) : key === "news" ? g2w(NEWS.cx, 0.95) : key === "open" ? g2w(0.95, OPEN.cy) : null;
    if (key === "board" || key === "outside") { this.standUp(); if (this.planNav(ENTRANCE.tile.x + 0.5, ENTRANCE.tile.y - 0.5, label, null) || true) { const pts = this.nav?.pts ?? (this.nav = { pts: [], label }).pts; pts.push(g2w(ENTRANCE.tile.x, H + 0.7), g2w(OUTSIDE.boardStand.x - 2.5, OUTSIDE.boardStand.y), g2w(OUTSIDE.boardStand.x, OUTSIDE.boardStand.y)); this.navLabel = label; } return; }
    if (this.planNav(goal.x, goal.y, label, tail)) { if (this.inDoor === (door?.subject ?? (key === "news" || key === "open" ? key : null))) this.inDoor = null; }
  }
  /** walk to the floor in front of a locker */
  goToSlot(sl: { fx: number; fy: number; id: number }) { this.planNav(sl.fx, sl.fy, `locker ${sl.id}`, null); }
  private beacon: THREE.Group | null = null;
  /** a glowing light pillar and bobbing arrow over the auditorium ("news"), "open" or a class door; null removes it */
  setBeacon(key: string | null) {
    if (this.beacon) { this.scene.remove(this.beacon); this.beacon = null; }
    if (!key) return;
    const door = DOORS.find((d) => d.subject === key), p = door ? g2w(door.cx, door.cy) : key === "news" ? g2w(NEWS.cx, 0.8) : key === "open" ? g2w(0.8, OPEN.cy) : key === "library" ? g2w(STAIR_GROUND.x, STAIR_GROUND.y) : null; if (!p) return;
    const g = new THREE.Group(), mat = (o: number) => new THREE.MeshBasicMaterial({ color: 0xffd45e, transparent: true, opacity: o, depthWrite: false, toneMapped: false, blending: THREE.AdditiveBlending });
    const pil = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 5, 16, 1, true), mat(0.3)); pil.position.y = 2.5; g.add(pil);
    const arr = new THREE.Mesh(new THREE.ConeGeometry(0.5, 0.9, 4), new THREE.MeshBasicMaterial({ color: 0xffb800, toneMapped: false })); arr.rotation.x = Math.PI; arr.name = "arr"; g.add(arr);
    g.position.set(p.x, 0, p.z); this.scene.add(g); this.beacon = g;
  }
  private lockerMark: THREE.Mesh | null = null;
  /** a gold name plate on the player's locker (null removes it) */
  setMyLocker(sl: { cx: number; cy: number; face: string } | null, name: string) {
    if (this.lockerMark) { this.scene.remove(this.lockerMark); (this.lockerMark.material as THREE.MeshBasicMaterial).map?.dispose(); this.lockerMark = null; }
    if (!sl) return;
    const cv = document.createElement("canvas"); cv.width = 256; cv.height = 96; const c = cv.getContext("2d")!;
    c.fillStyle = "#EAB94E"; c.beginPath(); c.roundRect(4, 4, 248, 88, 18); c.fill(); c.lineWidth = 6; c.strokeStyle = "#8a5f1c"; c.stroke(); c.fillStyle = "#4A3B3F"; c.font = "700 40px 'Trebuchet MS',sans-serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText((name || "Mine").slice(0, 10), 128, 50);
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; const m = new THREE.Mesh(new THREE.PlaneGeometry(0.86, 0.32), new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false }));
    const pos = g2w(sl.cx, sl.cy), off = 0.03; m.position.set(pos.x, PROP_H.locker - 0.2, pos.z);
    if (sl.face === "S") { m.position.z += off; } else if (sl.face === "N") { m.position.z -= off; m.rotation.y = Math.PI; } else if (sl.face === "E") { m.position.x += off; m.rotation.y = Math.PI / 2; } else { m.position.x -= off; m.rotation.y = -Math.PI / 2; }
    this.scene.add(m); this.lockerMark = m;
  }
  private doorLeaves: { subject: string; hinge: THREE.Group; yaw0: number }[] = [];
  private doorAnim: { subject: Room; t: number; sent: boolean } | null = null;
  private peek: THREE.Mesh | null = null;
  /** a real door on every classroom, the open door, and the auditorium. It stays shut until you walk up. */
  private buildDoorLeaves() {
    const add = (subject: string, cx: number, cy: number, face: Face | "W", col: string, y = 0) => {
      const p = g2w(cx, cy), hinge = new THREE.Group();
      const leaf = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.35, 0.1), this.plain(col)); leaf.position.set(0.62, 1.22, 0); leaf.castShadow = true; hinge.add(leaf);
      const knob = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), this.plain("#E8C56B")); knob.position.set(1.08, 1.15, 0.08); hinge.add(knob);
      const win = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.7, 0.04), new THREE.MeshBasicMaterial({ color: "#D7F1FF" })); win.position.set(0.62, 1.7, 0.07); hinge.add(win);
      let yaw = 0;
      if (face === "S") { hinge.position.set(p.x - 0.65, y, p.z + 0.12); yaw = 0; }
      else if (face === "N") { hinge.position.set(p.x + 0.65, y, p.z - 0.12); yaw = Math.PI; }
      else if (face === "E") { hinge.position.set(p.x + 0.12, y, p.z - 0.65); yaw = Math.PI / 2; }
      else { hinge.position.set(p.x - 0.12, y, p.z + 0.65); yaw = -Math.PI / 2; }
      hinge.rotation.y = yaw; this.scene.add(hinge); this.doorLeaves.push({ subject, hinge, yaw0: yaw });
    };
    for (const d of DOORS) add(d.subject, d.cx, d.cy, d.face, SUBJ_COL[d.subject]);
    add("open", 1.2, OPEN.cy, "W", "#E8A33D");
    add("news", AUD_DOOR.x + 2, AUD_DOOR.y + 0.4, "S", "#6B5AA8", FLOOR_Y);
  }
  private roomLabel(subject: Room) {
    return subject === "open" ? "The Open Door" : subject === "news" ? "Auditorium" : subject === "careers" ? "CarryingCareers" : subject === "life" ? "Life Lessons" : SUBJ_LABEL[subject];
  }
  private showPeek(subject: Room) {
    if (this.peek) { this.scene.remove(this.peek); (this.peek.material as THREE.Material).dispose(); this.peek = null; }
    const cv = document.createElement("canvas"); cv.width = 640; cv.height = 400; const c = cv.getContext("2d")!;
    const col = subject === "news" ? "#6B5AA8" : subject === "open" ? "#E8A33D" : SUBJ_COL[subject as Subject] || "#E07A66";
    c.fillStyle = "#F4E2C4"; c.fillRect(0, 0, 640, 400);
    c.fillStyle = "#7EC8F0"; c.fillRect(0, 0, 640, 150);
    c.fillStyle = "#3CB371"; c.fillRect(0, 130, 640, 40);
    c.fillStyle = col; c.fillRect(40, 40, 560, 54); c.fillStyle = "#fff"; c.font = "700 32px Georgia, serif"; c.textAlign = "center"; c.fillText(this.roomLabel(subject), 320, 76);
    c.fillStyle = "#C4894A"; for (let row = 0; row < 3; row++) for (let colI = 0; colI < 5; colI++) c.fillRect(70 + colI * 108, 175 + row * 58, 78, 26);
    c.fillStyle = "#F2C7A0"; c.beginPath(); c.arc(320, 168, 16, 0, 7); c.fill(); c.fillStyle = col; c.fillRect(304, 184, 32, 28);
    c.fillStyle = "#4A3B3F"; c.font = "600 20px Georgia, serif"; c.fillText("The door is open. You can see inside.", 320, 372);
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.5), new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide }));
    const door = DOORS.find((d) => d.subject === subject);
    const spot = subject === "news" ? g2w(AUD_DOOR.x + AUD_DOOR.w / 2, AUD_DOOR.y + 1.2) : subject === "open" ? g2w(2.4, OPEN.cy) : door ? g2w(door.approach.x, door.approach.y) : this.player.pos.clone();
    mesh.position.set(spot.x, (subject === "news" ? FLOOR_Y : 0) + 1.6, spot.z);
    mesh.lookAt(this.camera.position); this.scene.add(mesh); this.peek = mesh;
  }
  /** a wall, a column, or the closed outside of the building */
  private wallAt(x: number, z: number, floor: number) { return solidAt(x + W / 2, z + H / 2, 0.18, floor); }
  /** someone else is standing on this spot */
  private tooClose(x: number, z: number, self: Person) {
    const all = [this.player, this.monitor, this.teacher, ...this.duty, ...this.students];
    for (const o of all) {
      if (!o || o === self || (o as Stu).hidden) continue;
      if (Math.abs((o.pos.y || 0) - (self.pos.y || 0)) > 2.2) continue;
      if (Math.hypot(o.pos.x - x, o.pos.z - z) < 0.42) return true;
    }
    return false;
  }
  /** step toward a point. Walls always win. People slide aside instead of freezing in the doorway. */
  private approach(p: Person, tx: number, tz: number, step: number, floor: number) {
    const dx = tx - p.pos.x, dz = tz - p.pos.z, len = Math.hypot(dx, dz);
    if (len < 0.08) return true;
    if (len < 0.55 && !this.wallAt(tx, tz, floor)) return true;
    const k = Math.min(step, len) / len, nx = p.pos.x + dx * k, nz = p.pos.z + dz * k;
    const open = (x: number, z: number) => !this.wallAt(x, z, floor) && !this.tooClose(x, z, p);
    if (open(nx, nz)) { p.pos.x = nx; p.pos.z = nz; return len <= step + 0.02; }
    if (!this.wallAt(nx, p.pos.z, floor) && !this.tooClose(nx, p.pos.z, p)) { p.pos.x = nx; return false; }
    if (!this.wallAt(p.pos.x, nz, floor) && !this.tooClose(p.pos.x, nz, p)) { p.pos.z = nz; return false; }
    const side = ((p.id ?? 0) % 2 ? 1 : -1) * 0.2, ox = p.pos.x + (-dz / len) * side, oz = p.pos.z + (dx / len) * side;
    if (!this.wallAt(ox, oz, floor)) { p.pos.x = ox; p.pos.z = oz; }
    return false;
  }
  planNav(gxGoal: number, gyGoal: number, label: string, tail: THREE.Vector3 | null) {
    if (this.sitting != null) this.standUp();
    const P = this.player.pos, sx = Math.max(0, Math.min(W - 1, Math.floor(P.x + W / 2))), sy = Math.max(0, Math.min(H - 1, Math.floor(P.z + H / 2)));
    const nav = this.floor === 1 ? NAV_UP : NAV, baseY = this.floor === 1 ? FLOOR_Y : 0;
    const tiles = astar(nav, sx, sy, Math.floor(gxGoal), Math.floor(gyGoal));
    if (!tiles.length && !(sx === Math.floor(gxGoal) && sy === Math.floor(gyGoal))) { this.onToast("No path found from here"); return false; }
    const at = (x: number, y: number) => { const v = g2w(x, y); v.y = baseY; return v; };
    const raw = [P.clone(), ...tiles.slice(0, -1).map((t) => at(t.x + 0.5, t.y + 0.5)), at(gxGoal, gyGoal)], pts: THREE.Vector3[] = [];
    for (let i = 0; i < raw.length - 1;) { let j = raw.length - 1; while (j > i + 1 && !this.clear(raw[i], raw[j])) j--; pts.push(raw[j]); i = j; }
    if (tail) pts.push(tail);
    this.nav = { pts, label }; this.navLabel = label; if (label !== "that spot" && label !== "there") this.onToast(`Walking to ${label}… (move to cancel)`); return true;
  }
  cancelNav() { this.navThen = null; if (this.nav) { this.nav = null; this.navLabel = ""; this.onToast(""); } }
  get walking() { return !!this.nav; }
  private enterDoor(subject: Room) {
    if (this.doorAnim) return;
    this.inDoor = subject; this.nav = null; this.navLabel = "";
    this.onToast(`${this.roomLabel(subject)}: the door is opening.`);
    this.showPeek(subject);
    this.doorAnim = { subject, t: 0, sent: false };
  }
  private finishDoor() {
    const subject = this.doorAnim?.subject; if (!subject || this.doorAnim?.sent) return;
    this.doorAnim!.sent = true;
    if (this.peek) { this.scene.remove(this.peek); (this.peek.material as THREE.Material).dispose(); this.peek = null; }
    const si = SUBJECTS.indexOf(subject as Subject), swap = PERIODS[Math.max(0, this.idx)].swap ? 1 : 0, attendees = subject === "news" || subject === "open" ? [] : this.students.filter((_, n) => (n + swap) % 4 === si).map((x) => x.def!.id);
    if (parent !== window) parent.postMessage({ type: "unify:enter", subject, room: subject, attendees }, "*");
    else this.onToast(`${this.roomLabel(subject)}: open the school page to go inside`);
  }

  /* ------------------------------------------------------------ schedule -> student intents */
  private enterPeriod(i: number) {
    const P = PERIODS[i], spots = shuffle(this.open), ent = ENTRANCE.tile, pt = { x: Math.floor(this.player.pos.x + W / 2), y: Math.floor(this.player.pos.z + H / 2) };
    const near = shuffle(this.open.filter((t) => Math.hypot(t.x - pt.x, t.y - pt.y) <= 3.6 && Math.hypot(t.x - pt.x, t.y - pt.y) >= 1.2)); let ni = 0;
    this.students.forEach((s, n) => {
      if (P.kind === "class") {
        if (n % 5 < 2) { const spot = spots[(n * 3) % Math.max(1, spots.length)] || ent; s.pending = { delay: rnd(0, 6), dest: spot, hide: false, appear: s.hidden ? (s.lastDoor || ent) : undefined }; }
        else { const d = DOORS[(n + (P.swap ? 1 : 0)) % DOORS.length], t = { x: Math.floor(d.approach.x), y: Math.floor(d.approach.y) }; s.lastDoor = t; s.pending = { delay: rnd(0, 8), dest: t, hide: true }; }
      }
      else if (P.kind === "lunch") { const buddy = s.def && Social.peek(s.def.id)?.lunchBuddy && near[ni]; s.pending = { delay: rnd(0, 10), dest: buddy ? near[ni++] : spots[n], hide: false, appear: s.hidden ? s.lastDoor : undefined }; }
      else if (P.kind === "arrive") {
        if (this.bus && this.busState) { this.bus.visible = true; this.bus.position.set(this.busState.to, 0, OUTSIDE.busStop.y - H / 2); if (this.busState.mode === "idle") this.busState.mode = "wait"; }
        const door = { x: 48 + (n % 8) * 2.4, y: H + 4.4 };
        s.hidden = true; s.sprite.visible = false; s.blob.visible = false; s.path = []; s.pending = { delay: 0.35 + n * 0.22, dest: spots[n] || ent, hide: false, appear: door };
      }
      else s.pending = { delay: rnd(0, 12), dest: ent, hide: true, appear: s.hidden ? s.lastDoor : undefined };
    });
  }
  private begin(s: Stu) {
    const p = s.pending!; s.pending = null;
    if (p.appear) { s.pos.copy(g2w(p.appear.x + 0.5, p.appear.y + 0.5)); s.hidden = false; s.sprite.visible = true; s.blob.visible = true; s.fade = 0; s.mat.opacity = 0; }
    const outside = p.appear != null && p.appear.y > H;
    const sx = Math.min(W - 1, Math.max(0, Math.floor(outside ? 54 : s.pos.x + W / 2))), sy = Math.min(H - 1, Math.max(0, Math.floor(outside ? H - 2 : s.pos.z + H / 2)));
    const indoors = astar(NAV, sx, sy, p.dest.x, p.dest.y).map((t) => g2w(t.x + 0.5, t.y + 0.5));
    s.path = outside ? [g2w(54, H + 1.6), g2w(54, H - 1.6), ...indoors] : indoors; s.hideOnArrive = p.hide; s.moving = s.path.length > 0;
    if (!s.path.length && p.hide) { s.hidden = true; s.sprite.visible = false; s.blob.visible = false; }
  }

  /** walk up or down the library stairs. `to` 1 is the library, 0 is the plaza. */
  private climb(to: 0 | 1, done?: () => void) {
    if (this.cine) return;
    const top = g2w(STAIR_TOP.x, STAIR_TOP.y); top.y = FLOOR_Y;
    const bot = g2w(STAIR_GROUND.x, STAIR_GROUND.y); bot.y = 0;
    const from = this.player.pos.clone(), dest = to === 1 ? top : bot, pts: THREE.Vector3[] = [];
    for (let i = 1; i <= 10; i++) { const p = from.clone().lerp(dest, i / 10); p.y = from.y + (dest.y - from.y) * (i / 10); pts.push(p); }
    this.nav = null; this.navLabel = "";
    this.cine = { pts, speed: 3.2, done: () => { this.floor = to; this.player.pos.y = dest.y; this.onToast(to ? "Upstairs. The library is ahead. The auditorium and newsroom are down the side halls." : "Back on the ground floor."); done?.(); } };
  }

  /* ------------------------------------------------------------ player + camera */
  private movePlayer(dt: number, fwd: THREE.Vector3) {
    const K = this.keys, ix = (K.d || K.arrowright ? 1 : 0) - (K.a || K.arrowleft ? 1 : 0) + this.input.x, iz = (K.s || K.arrowdown ? 1 : 0) - (K.w || K.arrowup ? 1 : 0) + this.input.y;
    const P = this.player, st = Math.sin(this.yaw), ct = Math.cos(this.yaw), manual = !this.inputLocked && !this.cine && Math.hypot(ix, iz) > 0.1;
    if (this.cine) {                                                // a scripted walk: ignore walls and input
      const c = this.cine, tgt = c.pts[0]; if (!tgt) { const dn = c.done; this.cine = null; dn?.(); return; }
      const d = tgt.clone().sub(P.pos); const dy = d.y; d.y = 0; const len = d.length(), step = c.speed * dt; P.moving = true;
      if (len <= step) { P.pos.copy(tgt); c.pts.shift(); if (!c.pts.length) { P.moving = false; P.frame = 0; const dn = c.done; this.cine = null; dn?.(); } } else { const k = step / Math.max(len, 1e-4); P.pos.addScaledVector(d, k); P.pos.y += dy * k; P.dir = this.dirFrom(d, fwd, P.dir); P.frame = 1 + (Math.floor(this.t * 9) % 4); }
      return;
    }
    if (this.sitting != null) {                                    // seated: face the table; any movement input stands up
      if (manual) this.standUp(); else { const s = this.seats[this.sitting], f = s.ctr.clone().sub(s.pos); f.y = 0; P.pos.copy(s.pos); P.dir = this.dirFrom(f, fwd, P.dir); P.moving = false; P.frame = 0; return; }
    }
    if (manual && this.nav) { this.cancelNav(); this.pendingSeat = null; }
    if (manual) {                                                  // controls follow the camera: up = away from the viewer
      const v = new THREE.Vector3(ct * ix + st * iz, 0, -st * ix + ct * iz).normalize().multiplyScalar(4 * dt); P.moving = true;
      const gx0 = P.pos.x + W / 2, gy0 = P.pos.z + H / 2;
      if (!solidAt(gx0 + v.x, gy0, 0.16, this.floor) && !this.tooClose(P.pos.x + v.x, P.pos.z, P)) P.pos.x += v.x;
      if (!solidAt(P.pos.x + W / 2, gy0 + v.z, 0.16, this.floor) && !this.tooClose(P.pos.x, P.pos.z + v.z, P)) P.pos.z += v.z;
      P.dir = this.dirFrom(v, fwd, P.dir); P.frame = 1 + (Math.floor(this.t * 9) % 4);
    } else if (this.nav) {
      const tgt = this.nav.pts[0], step = 4.6 * dt; P.moving = true;
      if (this.approach(P, tgt.x, tgt.z, step, this.floor)) this.nav.pts.shift();
      const aim = tgt.clone().sub(P.pos); aim.y = 0; if (aim.lengthSq() > 1e-4) P.dir = this.dirFrom(aim, fwd, P.dir);
      if (!this.nav.pts.length) { const label = this.nav.label; this.nav = null; this.navLabel = ""; const then = this.navThen; this.navThen = null; if (then) { then(); return; } if (this.pendingSeat != null) { this.sitting = this.pendingSeat; this.pendingSeat = null; this.ensureSitTex(P); this.onToast("Sitting at Chat Chow. Move to get up."); return; } if (this.floor === 0 && ![...DOORS, NEWS, OPEN].some((q) => hit(q.trigger, P.pos.x + W / 2, P.pos.z + H / 2))) this.onToast(`Arrived at ${label}`); }
      P.frame = 1 + (Math.floor(this.t * 9) % 4);
    } else { P.moving = false; P.frame = 0; }
    const gx = P.pos.x + W / 2, gy = P.pos.z + H / 2;
    if (this.floor === 0 && hit(STAIR_UP, gx, gy)) { this.climb(1); return; }
    if (this.floor === 1 && hit(STAIR_DOWN, gx, gy)) { this.climb(0); return; }
    if (this.floor === 1) {
      if (hit(AUD_DOOR, gx, gy) && this.inDoor !== "news") this.enterDoor("news");
      else if (!hit(AUD_DOOR, gx, gy) && this.inDoor === "news") this.inDoor = null;
      if (hit(NEWS_DOOR, gx, gy)) { if (!this.newsLatch) { this.newsLatch = true; this.onNewsroom(); } } else this.newsLatch = false;
      if (hit(LIB_DESK, gx, gy)) { if (!this.bookLatch) { this.bookLatch = true; this.onBooks(); } } else this.bookLatch = false;
      return;
    }
    if (hit(NEWS.trigger, gx, gy)) { if (!this.sentUp) { this.sentUp = true; this.goTo("news"); } return; }
    if (!hit(NEWS.trigger, gx, gy)) this.sentUp = false;
    const d = DOORS.find((q) => hit(q.trigger, gx, gy)) ?? (hit(OPEN.trigger, gx, gy) ? { subject: "open" as Room } : undefined);
    if (d && this.inDoor !== d.subject) this.enterDoor(d.subject);
    else if (!d && this.inDoor) { const r = this.inDoor === "news" ? NEWS.trigger : this.inDoor === "open" ? OPEN.trigger : DOORS.find((x) => x.subject === this.inDoor)!.trigger, dist = Math.hypot(Math.max(r.x - gx, 0, gx - r.x - r.w), Math.max(r.y - gy, 0, gy - r.y - r.h)); if (dist > 0.35) this.inDoor = null; }
  }
  setView(v: ViewMode, instant = false) {
    this.view = v; this.zoom = 1; if (v === "overview") this.pitch = 1.0; else if (v === "close") this.pitch = 0.62; this.fpitch = 0;
    if (instant) this.updateCamera(1, true);
  }
  cycleView() { this.setView(this.view === "close" ? "overview" : this.view === "overview" ? "first" : "close"); return this.view; }
  private updateCamera(dt: number, snap = false) {
    const P = this.player.pos, st = Math.sin(this.yaw), ct = Math.cos(this.yaw); let pos: THREE.Vector3, look: THREE.Vector3;
    if (this.view === "close") { const ap = this.arrivalCam, pit = ap ? 0.38 : this.pitch, d = (ap ? 7.2 : 6.8) * this.zoom, cp = Math.cos(pit); pos = new THREE.Vector3(P.x + st * cp * d, P.y + 1.15 + Math.sin(pit) * d, P.z + ct * cp * d); look = new THREE.Vector3(P.x - st * 1.2, P.y + 1.35, P.z - ct * 1.2); }
    else if (this.view === "overview") { const d = Math.max(70, Math.max(W, H) * 0.92) * this.zoom, cp = Math.cos(this.pitch); pos = new THREE.Vector3(st * cp * d, P.y + Math.sin(this.pitch) * d, ct * cp * d + 3); look = new THREE.Vector3(P.x * 0.25, P.y, P.z * 0.25); }
    else { const ey = P.y + 1.7 / IS; pos = new THREE.Vector3(P.x, ey, P.z); look = new THREE.Vector3(P.x - st * 6, ey + Math.tan(this.fpitch) * 6, P.z - ct * 6); }
    if (this.view !== "overview") {
      const gx = P.x + W / 2, gy = P.z + H / 2, under = underUpper(gx, gy);
      const ceil = (this.floor === 1 ? FLOOR_Y + WALL_H : under ? FLOOR_Y : 99) - 0.7;
      if (pos.y > ceil) pos.y = ceil;
    }
    const k = snap ? 1 : Math.min(1, dt * 9); this.camPos.lerp(pos, k); this.camLook.lerp(look, k); this.camera.position.copy(this.camPos).multiplyScalar(IS); this.camera.lookAt(this.camLook.clone().multiplyScalar(IS));
    // sun follows the action; the shadow box widens in overview
    const R = this.view === "overview" ? 56 : 22, c = this.view === "overview" ? new THREE.Vector3(0, 0, 3) : P;
    this.sun.target.position.copy(c); if (this.px) this.sun.position.set(c.x + 11, 9, c.z + 7); else this.sun.position.set(c.x + 7, 15, c.z + 9);   // Pixar: a low golden sun
    if (R !== this.shadowR) { this.shadowR = R; const sc = this.sun.shadow.camera; sc.left = -R * IS; sc.right = R * IS; sc.top = R * IS; sc.bottom = -R * IS; sc.updateProjectionMatrix(); }
  }
  /** walls/blocks standing between the camera and the player fade out so nobody is hidden */
  private fadeOccluders(dt: number) {
    const from = this.camera.position.clone().divideScalar(IS), to = this.player.pos.clone(), dir = to.clone().sub(from), len = dir.length(), ray = new THREE.Ray(from, dir.normalize()), tmp = new THREE.Vector3();
    for (const o of this.occl) {
      const blocking = this.view !== "first" && !!ray.intersectBox(o.box, tmp) && tmp.distanceTo(from) < len - 0.2, target = blocking ? 0.16 : 1;
      o.o += (target - o.o) * Math.min(1, dt * 9); const solid = o.o > 0.985;
      for (const m of o.mats) { m.opacity = solid ? 1 : o.o; m.transparent = !solid; m.depthWrite = solid; }
    }
  }

  /* ------------------------------------------------------------ frame */
  private lastClockMsg = 0; private todOverride: number | null = Mood.queryTod();
  private frame = (now: number) => {
    const raw = now - this.last, dt = Math.min(0.05, raw / 1000); this.last = now; this.t += dt; this.tickDecor(this.t); if (this.beacon) { const a = this.beacon.getObjectByName("arr"); if (a) { a.position.y = 3.6 + Math.sin(this.t * 4) * 0.25; a.rotation.y = this.t * 2; } } const sim = dt * this.speed;
    this.clock += sim; if (this.clock >= DAY) this.clock -= DAY;
    // the day's colour comes from Mood: school-day clock mapped to a sunrise-to-dusk hour, season and any palette the academy sent
    Gfx.tick(raw); Mood.update(dt, this.todOverride ?? 6.8 + Math.min(1, Math.max(0, this.clock / DAY)) * 11.5); this.fx.tick(this.t, dt);

    if (parent !== window && now - this.lastClockMsg > 1000) { this.lastClockMsg = now; parent.postMessage({ type: "unify:clock", minutes: DAY_START + Math.floor(this.clock) }, "*"); }
    const idx = periodAt(this.clock); if (idx !== this.idx) { this.idx = idx; this.enterPeriod(idx); }
    const rot = this.inputLocked ? 0 : (this.keys.e ? 1 : 0) - (this.keys.q ? 1 : 0) + this.rotate; if (rot) this.yaw += rot * 1.9 * dt;
    const fwd = new THREE.Vector3(); this.camera.getWorldDirection(fwd); fwd.y = 0; if (fwd.lengthSq() < 1e-4) fwd.set(0, 0, -1); fwd.normalize();
    for (const s of this.students) {
      if (s.pending) { s.pending.delay -= sim; if (s.pending.delay <= 0) this.begin(s); }
      if (s.hidden) continue;
      if (s.talking) { s.moving = false; s.frame = 0; continue; }
      this.fidget(s, dt);
      if (s.act && !s.path.length) { s.moving = false; s.frame = 0; continue; }
      if (s.fade < 1) { s.fade = Math.min(1, s.fade + sim * 3); s.mat.opacity = s.fade; }
      if (s.path.length) {
        const tgt = s.path[0], step = s.speed * sim; if (this.approach(s, tgt.x, tgt.z, step, s.pos.y > 2 ? 1 : 0)) s.path.shift(); s.dir = this.dirFrom(tgt.clone().sub(s.pos), fwd, s.dir);
        s.moving = true; s.frame = 1 + (Math.floor((this.t * s.speed * 3.4)) % 4);
        if (!s.path.length && s.hideOnArrive) { s.hidden = true; s.sprite.visible = false; s.blob.visible = false; s.moving = false; }
      } else { s.moving = false; s.frame = 0; }
    }
    this.patrol(sim, fwd);
    for (const f of this.onTick) f(dt, sim);
    this.movePlayer(dt, fwd); this.updateBus(dt);
    if (this.doorAnim) {
      this.doorAnim.t += dt; const leaf = this.doorLeaves.find((d) => d.subject === this.doorAnim!.subject), k = Math.min(1, this.doorAnim.t / 0.7);
      if (leaf) leaf.hinge.rotation.y = leaf.yaw0 - k * 1.25;
      if (this.peek) this.peek.lookAt(this.camera.position);
      if (this.doorAnim.t > 1.55) { this.finishDoor(); this.doorAnim = null; }
    }
    this.updateCamera(dt);
    this.fadeOccluders(dt);
    this.player.sprite.visible = this.view !== "first" && !this.arrivalHide; this.player.blob.visible = this.view !== "first" && !this.arrivalHide;
    this.tickVisitors(dt);
    for (const p of [...this.students, this.player, this.monitor, this.teacher, ...this.duty, ...this.visitors.values()]) { if ((p as Stu).hidden) { p.body.visible = false; continue; } p.body.visible = false; p.sprite.position.copy(p.pos); if (this.view === "first" && p !== this.player) { const near = p.pos.distanceTo(this.camera.position.clone().divideScalar(IS)) < 1.1; p.sprite.visible = !near; p.blob.visible = !near; } else if (p !== this.player) { p.sprite.visible = true; p.blob.visible = true; } p.blob.position.set(p.pos.x, p.pos.y + 0.02, p.pos.z); this.setFrame(p, p.dir, p.frame); this.applyBody(p, dt, p === this.player); if (this.view !== "first" && (p.look.age === "adult" || p.def?.role === "staff")) p.sprite.scale.multiplyScalar(1.55); }
    const crowd = this.px?.crowd ?? this.bodies;
    if (crowd) {
      if (this.px) this.px.tick(this.t, this.player.pos);
      crowd.update(dt, [this.player, ...this.students, this.monitor, this.teacher, ...this.duty], { player: this.player, playerSpec: this.playerSpec, camera: this.camera, shown: this.view !== "first" && !this.arrivalHide, first: this.view === "first", seat: this.sitting != null ? this.seats[this.sitting] : null, talkingTo: this.persons().find((q) => q.talking) ?? null });
    }
    const tg = PERIODS[this.idx].tint, k = Math.min(1, dt * 1.5); for (let i = 0; i < 4; i++) this.tint[i] += (tg[i] - this.tint[i]) * k;
    if (this.sitting != null) this.player.sprite.position.y -= 0.12;
    this.beam.update(this.t, this.camera, this.player.pos, this.view !== "first" && !this.arrivalHide, IS);
    if (!this.px?.render()) this.renderer.render(this.scene, this.camera); requestAnimationFrame(this.frame);
  };
}
const LAMP_COLS = ["#F8D977", "#F28F7E", "#8FC9E8", "#A9DCC0"];
const i2c = (n: number) => LAMP_COLS[Math.floor(n) % 4];
void LOCK_D;
