import Phaser from "phaser";
import { TILE, type TileKind } from "@/lib/campus/tiles";
import { OUTLINE, drawGroundBed, drawTile, drawTileObject, hex, shadeColor } from "@/lib/campus/tileart";
import {
  blockHeight,
  bedKindFor,
  buildingFootprints,
  isBuildingKind,
  isFlatObject,
  isoLayerFor,
  isoObjectsFor,
  propHeight,
  type BuildingFootprint,
} from "@/lib/campus/isoprops";
import { buildingDepthFor, footprintDepth, isoDepth, actorDepth, DEPTH_BIAS, GROUND_DEPTH, OVERLAY_DEPTH } from "@/lib/campus/depth";
import { paintTheme, themeKey, themedColors } from "@/lib/campus/themes";
import {
  ISO_H,
  ISO_W,
  isoCanvasSize,
  isoFromTile,
  isoFromWorld,
  isoInputToWorld,
  worldFromIso,
} from "@/lib/campus/iso";
import { useStyleStore, visualStyle } from "@/lib/a11y/style";
import { getZone, type Interactable, type NpcSpawn, type ZoneMap } from "@/lib/campus/world";
import { decorFor, type DecorPlacement } from "@/lib/campus/decor";
import {
  clearPropOverrides,
  exportPropOverrides,
  savePropOverrides,
  type PropOverride,
} from "@/lib/campus/prop-overrides";
import { canStandBox } from "@/lib/campus/walkable";
import { interactRadius, doorTriggerRadius } from "@/lib/a11y/assist";
import { useCampusStore } from "@/lib/campus/store";
import { debugEnabled } from "@/lib/debug";
import { bobScale, cameraLerp, useMotionStore } from "@/lib/a11y/motion";
import {
  appearanceKey,
  currentAppearance,
  lookFromAppearance,
  useAppearanceStore,
} from "@/lib/campus/appearance";
import { currentMascot, mascotAccessoryOf, mascotColorOf, useMascotStore } from "@/lib/mascot";
import { isWalkableTile, reachabilityReport } from "@/lib/campus/walkable";
import {
  ensureCharacterAnims,
  CHAR_RENDER_SCALE,
  ensureCharacterTexture,
  idleFrame,
  lookFor,
  type CharacterLook,
  type SpriteDirection,
} from "@/lib/campus/charart";
import { ORIGINAL_ART, originalGroundKey, originalPropKey } from "@/lib/campus/isoart";
import { applyAmbient, createAmbience, type Ambience } from "@/lib/campus/ambience";
import { phaseAt, useClockStore } from "@/lib/campus/daynight";
import { createBrain, stepBrain, type NpcBrain } from "@/lib/campus/npc-brain";

const SPEED = 168;
/** Pixels/sec^2 used to ease into and out of a walk so movement is not snappy. */
const ACCEL = 1400;
const FRICTION = 1900;
/** How close (in px) the player must get to a tapped point before stopping. */
const TAP_ARRIVE = 6;
/** Camera zoom limits for free-look inspection of the isometric world. */
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 4;


export type Direction = SpriteDirection;

export interface CampusAssetEntry {
  key: string;
  group: "zone" | "interior" | "character" | "system";
  width: number;
  height: number;
  frames: number;
  source: "procedural canvas" | "file";
  url?: string;
  suspect3d: boolean;
}

export interface CampusAssetReport {
  zone: string;
  zoneKind: "outdoor" | "interior";
  rooms: string[];
  entries: CampusAssetEntry[];
  suspect: number;
  /** Keys that would be rejected if an unsafe 3D source reached the loader. */
  blockedAssetKeys: string[];
  blockedReason: string;
}



interface Actor {
  sprite: Phaser.GameObjects.Sprite;
  /** Cartesian world position in px — the projection happens at render time. */
  px: number;
  py: number;
  label: Phaser.GameObjects.Text;
  badge?: Phaser.GameObjects.Rectangle | undefined;
  key: string;
  dir: Direction;
  moving: boolean;
}

interface NpcActor extends Actor {
  spawn: NpcSpawn;
  homeX: number;
  homeY: number;
  timer: number;
  brain: NpcBrain;
}

export class CampusScene extends Phaser.Scene {
  private zone!: ZoneMap;
  private player!: Actor;
  private vx = 0;
  private vy = 0;
  private facing: Direction = "down";
  private doorCooldown = 0;
  /** Doors re-arm only after the player has stepped clear of the trigger. */
  private doorArmed = false;
  private motionUnsub?: (() => void) | undefined;
  private appearanceUnsub?: (() => void) | undefined;
  private mascotUnsub?: (() => void) | undefined;
  private styleUnsub?: (() => void) | undefined;
  private groundImage?: Phaser.GameObjects.Image | undefined;
  private propImages: Phaser.GameObjects.Image[] = [];
  /** One graphics volume per building structure (walls + roof). */
  private buildingShapes: Phaser.GameObjects.Graphics[] = [];
  /** Building volumes paired with their footprint, for viewer-aware sorting. */
  private buildingVolumes: { g: Phaser.GameObjects.Graphics; fp: { x: number; y: number; w: number; h: number } }[] = [];
  /** Decor sprites (subset of propImages) paired with their placement data. */
  private decorSprites: { image: Phaser.GameObjects.Image; placement: DecorPlacement }[] = [];
  private propEditorOn = false;
  private selectedProp: Phaser.GameObjects.Image | null = null;
  private culledProps = 0;
  private cullFrame = 0;
  /** True once the hand-painted ground/prop art has finished streaming in. */
  private artReady = false;
  /** Weather / day-night atmosphere layer. */
  private ambience?: Ambience | undefined;
  private ambientTimer = 0;
  /** Proximity action reticle drawn on the nearest interactable. */
  private reticleRing?: Phaser.GameObjects.Graphics | undefined;
  private reticleText?: Phaser.GameObjects.Text | undefined;


  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private npcs: NpcActor[] = [];
  private interactionMarkers = new Map<string, Phaser.GameObjects.Graphics>();
  private lastPromptId: string | null = null;
  private lastRoomId: string | null = null;
  private lastSentTx = -1;
  private lastSentTy = -1;
  private lastSentFacing: Direction | null = null;
  private scanTimer = 0;
  private debugGraphics?: Phaser.GameObjects.Graphics | undefined;
  private debugDynamic?: Phaser.GameObjects.Graphics | undefined;
  private debugTexts: Phaser.GameObjects.Text[] = [];
  private debugOn = false;
  private panMode = false;
  private pinchDist = 0;
  private recenterTimer?: Phaser.Time.TimerEvent | undefined;

  /** Tap / drag-to-walk destination in world pixels. */
  private moveTarget: { x: number; y: number } | null = null;
  private tapMarker?: Phaser.GameObjects.Graphics | undefined;
  private perfSpikes = 0;
  private perfWorst = 0;
  private perfFrames = 0;
  private perfTotal = 0;

  joystick: { x: number; y: number } = { x: 0, y: 0 };

  constructor() {
    super("campus");
  }

  perfStats() {
    const avg = this.perfFrames ? this.perfTotal / this.perfFrames : 0;
    return {
      zone: this.zone?.id ?? "—",
      streaming: false,
      placements: this.propImages.length,
      liveProps: this.propImages.length - this.culledProps,
      culledProps: this.culledProps,
      propSpawns: 0,
      propRecycles: 0,
      rooms: this.zone?.rooms.length ?? 0,
      doors: (this.zone?.interactables ?? []).filter((i) => i.action.kind === "travel").length,
      npcs: this.npcs.length,
      avgFrameMs: Math.round(avg * 10) / 10,
      worstFrameMs: Math.round(this.perfWorst * 10) / 10,
      spikes: this.perfSpikes,
      fps: avg > 0 ? Math.round(1000 / avg) : 0,
    };
  }

  resetPerfStats() {
    this.perfSpikes = 0;
    this.perfWorst = 0;
    this.perfFrames = 0;
    this.perfTotal = 0;
  }

  /* ---------------------------------------------------------------- *
   * World painting
   * ---------------------------------------------------------------- */

  /** Bakes the whole zone into one isometric canvas texture. */
  private bakeZone(zone: ZoneMap, style = visualStyle()): string | null {
    const theme = paintTheme(zone.id, style);
    const key = `zone-iso-${zone.id}-${themeKey(theme)}-${this.artReady ? "art" : "plain"}`;
    if (this.textures.exists(key)) return key;
    const size = isoCanvasSize(zone.width, zone.height);
    const tex = this.textures.createCanvas(key, size.width, size.height);
    if (!tex) return null;
    const ctx = tex.context;
    ctx.imageSmoothingEnabled = false;

    // Original UNIFY ground paintings are sampled per cartesian tile and then
    // projected. Uncovered indoor/object kinds still use the crisp procedural
    // 32px renderer, so art never changes collision or room data.
    const scratch = document.createElement("canvas");
    scratch.width = TILE;
    scratch.height = TILE;
    const sctx = scratch.getContext("2d");
    if (!sctx) return null;
    sctx.imageSmoothingEnabled = false;

    for (let y = 0; y < zone.height; y += 1) {
      for (let x = 0; x < zone.width; x += 1) {
        const tile = zone.tiles[y]?.[x] as TileKind | undefined;
        if (!tile) continue;
        // Extruded blocks and standing props are drawn as depth-sorted
        // objects, so the bake only lays down the ground bed underneath them.
        const kind: TileKind =
          isoLayerFor(tile) === "ground" ? tile : bedKindFor(tile, zone.kind);
        sctx.setTransform(1, 0, 0, 1, 0, 0);
        sctx.clearRect(0, 0, TILE, TILE);
        const flat = isFlatObject(kind);
        const originalKey = flat ? undefined : originalGroundKey(kind);
        const source = originalKey ? this.textures.get(originalKey)?.source[0]?.image : undefined;
        if (source) {
          const sourceWidth = source.width || TILE;
          const sourceHeight = source.height || TILE;
          const sample = Math.min(96, sourceWidth, sourceHeight);
          const maxX = Math.max(1, sourceWidth - sample);
          const maxY = Math.max(1, sourceHeight - sample);
          const sx = (x * 53 + y * 17) % maxX;
          const sy = (y * 47 + x * 11) % maxY;
          sctx.drawImage(source, sx, sy, sample, sample, 0, 0, TILE, TILE);
          // Recolour the painted ground with the zone/style palette so the
          // Bright/Focus toggle and per-zone tints stay visible on photo art:
          // "color" keeps the painting's luminance but takes the themed hue.
          const themed = themedColors(kind, theme);
          sctx.save();
          sctx.globalCompositeOperation = "color";
          sctx.globalAlpha = style === "focus" ? 0.9 : 0.6;
          sctx.fillStyle = hex(themed.base);
          sctx.fillRect(0, 0, TILE, TILE);
          sctx.restore();
          // Paved kinds keep their theme path pattern (cobble, herringbone,
          // boardwalk) layered over the painting.
          if (kind === "path" || kind === "brick") {
            sctx.save();
            sctx.globalAlpha = 0.45;
            sctx.translate(-x * TILE, -y * TILE);
            drawGroundBed(sctx, kind, x, y, theme);
            sctx.restore();
          }
          if (style === "focus") {
            sctx.fillStyle = "rgba(240, 244, 236, 0.16)";
            sctx.fillRect(0, 0, TILE, TILE);
          }
        } else {
          sctx.translate(-x * TILE, -y * TILE);
          if (flat) drawTile(sctx, kind, x, y, theme);
          else drawGroundBed(sctx, kind, x, y, theme);
        }

        const top = isoFromTile(x, y, zone.height);
        ctx.save();
        ctx.setTransform(1, 0.5, -1, 0.5, top.x, top.y);
        ctx.drawImage(scratch, -0.5, -0.5, TILE + 1, TILE + 1);
        ctx.restore();
      }
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    tex.refresh();
    return key;
  }

  /**
   * Builds (and caches) the isometric volume texture for a block tile kind:
   * a diamond top face plus the two visible side faces, so walls, windows and
   * roofs read as real geometry instead of a flat painted square.
   */
  private blockTexture(kind: TileKind, theme: ReturnType<typeof paintTheme>): string | null {
    const rise = Math.round(blockHeight(kind) * ISO_H);
    const key = `iso-block-${kind}-${themeKey(theme)}`;
    if (this.textures.exists(key)) return key;
    const height = rise + ISO_H;
    const tex = this.textures.createCanvas(key, ISO_W, height);
    if (!tex) return null;
    const ctx = tex.context;
    ctx.imageSmoothingEnabled = false;

    const colors = themedColors(kind, theme);
    const top = hex(colors.base);
    const left = shadeColor(colors.base, -0.18);
    const right = shadeColor(colors.base, -0.4);
    const bottomY = height;
    const midY = height - ISO_H / 2;
    const topApex = bottomY - ISO_H - rise;
    const isBuilding = kind === "buildingWall" || kind === "window" || kind === "buildingRoof";

    /** Point on the left facade: t across (0..1), h up from the ground vertex. */
    const lp = (t: number, h: number) => ({ x: (ISO_W / 2) * t, y: midY + (ISO_H / 2) * t - h });
    /** Point on the right facade: t across (0..1) from the near vertex. */
    const rp = (t: number, h: number) => ({
      x: ISO_W / 2 + (ISO_W / 2) * t,
      y: bottomY - (ISO_H / 2) * t - h,
    });
    const quad = (pts: { x: number; y: number }[], fill: string, alpha = 1) => {
      ctx.globalAlpha = alpha;
      ctx.fillStyle = fill;
      ctx.beginPath();
      ctx.moveTo(pts[0]!.x, pts[0]!.y);
      for (let i = 1; i < pts.length; i += 1) ctx.lineTo(pts[i]!.x, pts[i]!.y);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
    };

    // Left face (t goes from the near vertex outwards to the left corner).
    quad([lp(0, 0), lp(1, 0), lp(1, rise), lp(0, rise)], left);
    // Right face.
    quad([rp(0, 0), rp(1, 0), rp(1, rise), rp(0, rise)], right);
    // Top face (the diamond cap).
    ctx.fillStyle = top;
    ctx.beginPath();
    ctx.moveTo(ISO_W / 2, topApex);
    ctx.lineTo(ISO_W, midY - rise);
    ctx.lineTo(ISO_W / 2, bottomY - rise);
    ctx.lineTo(0, midY - rise);
    ctx.closePath();
    ctx.fill();

    if (isBuilding) {
      const storeys = Math.max(1, Math.round(rise / ISO_H));
      const glassLeft = colors.detail !== undefined ? hex(colors.detail) : "#cfe6f2";
      const glassRight = shadeColor(colors.detail ?? colors.base, -0.2);

      for (let s = 0; s < storeys; s += 1) {
        const base = (rise / storeys) * s;
        const wTop = base + (rise / storeys) * 0.78;
        const wBot = base + (rise / storeys) * 0.3;
        // Two windows per facade per storey.
        for (const [a, b] of [
          [0.16, 0.44],
          [0.56, 0.84],
        ] as const) {
          quad([lp(a, wBot), lp(b, wBot), lp(b, wTop), lp(a, wTop)], glassLeft, 0.85);
          quad([rp(a, wBot), rp(b, wBot), rp(b, wTop), rp(a, wTop)], glassRight, 0.85);
        }
        // Floor-slab band between storeys.
        if (s > 0) {
          const y0 = base - 1.5;
          const y1 = base + 1.5;
          quad([lp(0, y0), lp(1, y0), lp(1, y1), lp(0, y1)], shadeColor(colors.base, -0.05), 0.6);
          quad([rp(0, y0), rp(1, y0), rp(1, y1), rp(0, y1)], shadeColor(colors.base, -0.28), 0.6);
        }
      }
      // Cornice under the roofline and a plinth at street level.
      quad(
        [lp(0, rise - 4), lp(1, rise - 4), lp(1, rise), lp(0, rise)],
        shadeColor(colors.base, 0.12),
        0.8,
      );
      quad(
        [rp(0, rise - 4), rp(1, rise - 4), rp(1, rise), rp(0, rise)],
        shadeColor(colors.base, -0.14),
        0.8,
      );
      quad([lp(0, 0), lp(1, 0), lp(1, 5), lp(0, 5)], shadeColor(colors.base, -0.34), 0.75);
      quad([rp(0, 0), rp(1, 0), rp(1, 5), rp(0, 5)], shadeColor(colors.base, -0.5), 0.75);
    } else if (colors.detail !== undefined) {
      quad(
        [lp(0, rise * 0.55), lp(1, rise * 0.55), lp(1, rise * 0.8), lp(0, rise * 0.8)],
        hex(colors.detail),
        0.4,
      );
    }

    // Vertical corner seam adds a readable edge between the two facades.
    ctx.strokeStyle = "rgba(0,0,0,0.25)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(ISO_W / 2, bottomY);
    ctx.lineTo(ISO_W / 2, bottomY - rise);
    ctx.stroke();

    // 1px dark contour keeps the storybook outline language.
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(ISO_W / 2 + 0.5, topApex + 0.5);
    ctx.lineTo(ISO_W - 0.5, midY - rise);
    ctx.lineTo(ISO_W - 0.5, midY);
    ctx.lineTo(ISO_W / 2 + 0.5, bottomY - 0.5);
    ctx.lineTo(0.5, midY);
    ctx.lineTo(0.5, midY - rise);
    ctx.closePath();
    ctx.stroke();

    tex.refresh();
    return key;
  }


  /** Builds (and caches) a transparent billboard texture for a prop tile kind. */
  private propTexture(kind: TileKind, theme: ReturnType<typeof paintTheme>): string | null {
    const key = `iso-prop-${kind}-${themeKey(theme)}`;
    if (this.textures.exists(key)) return key;
    const tex = this.textures.createCanvas(key, TILE, TILE);
    if (!tex) return null;
    const ctx = tex.context;
    ctx.imageSmoothingEnabled = false;
    drawTileObject(ctx, kind, 0, 0, theme);
    tex.refresh();
    return key;
  }

  /**
   * Extrudes ONE building volume for a whole footprint: solid walls with
   * storey-high window rows plus a pitched hip roof, so a structure reads as a
   * real building instead of a grid of separate cubes lying on the ground.
   */
  private drawBuilding(
    zone: ZoneMap,
    fp: BuildingFootprint,
    theme: ReturnType<typeof paintTheme>,
  ) {
    const wall = themedColors("buildingWall", theme);
    const roof = themedColors("buildingRoof", theme);
    const glassBase = themedColors("window", theme);
    const glass = glassBase.detail ?? glassBase.base;

    const H = blockHeight("buildingWall") * ISO_H;
    // Modest, fixed roof rise: a tall pyramid reads as a slab lying on the
    // ground, while a shallow pitched roof keeps the building reading upright.
    const R = ISO_H * 0.85;

    const p = (u: number, v: number, lift = 0) => {
      const s = isoFromTile(u, v, zone.height);
      return new Phaser.Math.Vector2(s.x, s.y - lift);
    };
    const g = this.add.graphics();
    const face = (pts: Phaser.Math.Vector2[], color: number, alpha = 1) => {
      g.fillStyle(color, alpha);
      g.fillPoints(pts, true, true);
    };
    const ink = (pts: Phaser.Math.Vector2[], alpha = 0.82) => {
      g.lineStyle(1, 0x3b2418, alpha);
      g.strokePoints([...pts, pts[0]!], false);
    };
    const facadeSeed = (fp.x * 17 + fp.y * 31 + fp.w * 13 + fp.h * 7) % 3;

    const { x, y, w, h } = fp;
    const A = (l = 0) => p(x, y, l); // north
    const B = (l = 0) => p(x + w, y, l); // east
    const C = (l = 0) => p(x + w, y + h, l); // south (nearest camera)
    const D = (l = 0) => p(x, y + h, l); // west

    // --- Roof: a proper gable with upright triangular end walls ---
    // The ridge runs the FULL length of the long axis (no inset), so the
    // short ends become vertical gable triangles in wall colour — that is
    // what makes the massing read as an upright building instead of a
    // pyramid tent lying on the ground.
    const ridgeLift = H + R;
    let r1: Phaser.Math.Vector2;
    let r2: Phaser.Math.Vector2;
    const eaveN = A(H);
    const eaveE = B(H);
    const eaveS = C(H);
    const eaveW = D(H);
    if (w >= h) {
      // Ridge along the east-west axis; gables on the west and east ends.
      r1 = p(x, y + h / 2, ridgeLift);
      r2 = p(x + w, y + h / 2, ridgeLift);
      // Far (north) slope first — darkest, in shadow.
      face([eaveN, eaveE, r2, r1], roof.base);
      face([eaveN, eaveE, r2, r1], 0x000000, 0.28);
      // Gable end walls (upright triangles, wall colour).
      face([eaveN, eaveW, r1], wall.base); // west gable
      face([eaveN, eaveW, r1], 0x000000, 0.1);
      face([eaveN, eaveE, r2], wall.base); // east gable
      face([eaveN, eaveE, r2], 0x000000, 0.22);
      // Near (south) slope last — catches the light.
      face([eaveS, eaveW, r1, r2], roof.base);
      face([eaveS, eaveW, r1, r2], 0xffffff, 0.1);
    } else {
      // Ridge along the north-south axis; gables on the north and south ends.
      r1 = p(x + w / 2, y, ridgeLift);
      r2 = p(x + w / 2, y + h, ridgeLift);
      // Far (west) slope first.
      face([eaveN, eaveW, r2, r1], roof.base);
      face([eaveN, eaveW, r2, r1], 0x000000, 0.22);
      // Gable end walls.
      face([eaveN, eaveE, r1], wall.base); // north gable
      face([eaveN, eaveE, r1], 0x000000, 0.18);
      face([eaveS, eaveW, r2], wall.base); // south gable
      face([eaveS, eaveW, r2], 0x000000, 0.08);
      // Near (east) slope last.
      face([eaveE, eaveS, r2, r1], roof.base);
      face([eaveE, eaveS, r2, r1], 0x000000, 0.1);
    }


    // --- Walls: the two camera-facing faces ---
    face([B(), C(), C(H), B(H)], wall.base); // right / east face
    face([C(), D(), D(H), C(H)], wall.base); // left / south-west face
    // Directional shading: the east face sits in shadow.
    face([B(), C(), C(H), B(H)], 0x000000, 0.22);
    face([C(), D(), D(H), C(H)], 0x000000, 0.06);

    // Quiet, deterministic plaster/brick bands make each facade feel drawn
    // by hand without turning the building into a noisy texture tile.
    const band = wall.detail ?? wall.base;
    const bandAlpha = 0.08 + facadeSeed * 0.025;
    for (let level = 0; level < Math.max(1, Math.round(H / ISO_H)); level += 1) {
      const lift = level * ISO_H + ISO_H * (0.12 + facadeSeed * 0.03);
      face([p(x + w, y, lift), p(x + w, y + h, lift), p(x + w, y + h, lift + 2), p(x + w, y, lift + 2)], band, bandAlpha);
      face([p(x + w, y + h, lift), p(x, y + h, lift), p(x, y + h, lift + 2), p(x + w, y + h, lift + 2)], band, bandAlpha + 0.02);
      g.lineStyle(1, 0x3b2418, 0.2);
      g.strokePoints([p(x + w, y, lift + 2), p(x + w, y + h, lift + 2)], false);
      g.strokePoints([p(x + w, y + h, lift + 2), p(x, y + h, lift + 2)], false);
    }

    // --- Storey window rows on both visible faces ---
    const storeys = Math.max(1, Math.round(H / ISO_H));
    const winRow = (
      from: (t: number, lift: number) => Phaser.Math.Vector2,
      span: number,
      shade: number,
    ) => {
      for (let s = 0; s < storeys; s += 1) {
        const bottom = (H / storeys) * s + (H / storeys) * 0.28;
        const top = (H / storeys) * s + (H / storeys) * 0.76;
        for (let t = 0; t < span; t += 1) {
          for (const [a, b] of [
            [0.18, 0.44],
            [0.56, 0.82],
          ] as const) {
            const t0 = t + a;
            const t1 = t + b;
            const panel = [from(t0, bottom), from(t1, bottom), from(t1, top), from(t0, top)];
            face(panel, glass, 0.9);
            face(panel, 0x000000, shade);
            // Ink frame, mullion and sill keep windows legible at game scale.
            ink(panel, 0.9);
            g.lineStyle(1, 0xf7f0cf, 0.42);
            g.strokePoints([
              from(t0 + (t1 - t0) * 0.18, bottom + (top - bottom) * 0.16),
              from(t0 + (t1 - t0) * 0.18, top - (top - bottom) * 0.16),
            ], false);
            g.lineStyle(1, 0x3b2418, 0.58);
            g.strokePoints([from((t0 + t1) / 2, bottom), from((t0 + t1) / 2, top)], false);
            g.strokePoints([from(t0 - 0.03, bottom), from(t1 + 0.03, bottom)], false);
          }
        }
      }
      // Cornice and plinth are outlined like the rest of the inked facade.
      const cornice = [from(0, H - 5), from(span, H - 5), from(span, H), from(0, H)];
      face(cornice, 0xffffff, 0.12);
      ink(cornice, 0.45);
      const plinth = [from(0, 0), from(span, 0), from(span, 6), from(0, 6)];
      face(plinth, 0x000000, 0.25);
      ink(plinth, 0.5);
    };
    // East face runs along v, west/south face runs along u.
    winRow((t, lift) => p(x + w, y + t, lift), h, 0.25);
    winRow((t, lift) => p(x + w - t, y + h, lift), w, 0.06);

    // Corner seam and entrance details. The door is projected on the near
    // facade at the same tile column as the exterior trigger.
    const doorTile = zone.tiles[y + h]?.findIndex(
      (kind, index) => kind === "door" && index >= x && index < x + w,
    );
    const doorU = (doorTile !== undefined && doorTile >= 0 ? doorTile - x : Math.floor(w / 2)) + 0.5;
    const door = [
      p(x + doorU - 0.3, y + h + 0.015, 0),
      p(x + doorU + 0.3, y + h + 0.015, 0),
      p(x + doorU + 0.3, y + h + 0.015, ISO_H * 1.15),
      p(x + doorU - 0.3, y + h + 0.015, ISO_H * 1.15),
    ];
    face(door, 0x8a4a2c);
    ink(door, 1);
    g.lineStyle(1, 0xf7d174, 0.9);
    g.strokePoints([
      p(x + doorU, y + h + 0.02, ISO_H * 0.08),
      p(x + doorU, y + h + 0.02, ISO_H * 1.05),
    ], false);
    const step = [
      p(x + doorU - 0.42, y + h + 0.04, 0),
      p(x + doorU + 0.42, y + h + 0.04, 0),
      p(x + doorU + 0.42, y + h + 0.04, 4),
      p(x + doorU - 0.42, y + h + 0.04, 4),
    ];
    face(step, 0x3b2418, 0.55);
    ink(step, 0.7);

    g.lineStyle(1, 0x3b2418, 0.48);
    g.strokePoints([C(), C(H)], false);
    g.lineStyle(1, Phaser.Display.Color.HexStringToColor(OUTLINE).color, 1);
    g.strokePoints([D(), C(), B(), B(H), eaveE, r2, r1, eaveW, D(H), D()], false);

    g.setDepth(buildingDepthFor(fp.x, fp.y, fp.w, fp.h, this.player?.px ?? 0, this.player?.py ?? 0));
    this.buildingShapes.push(g);
    this.buildingVolumes.push({ g, fp: { x: fp.x, y: fp.y, w: fp.w, h: fp.h } });
  }

  /**
   * The single depth-sorted object layer.
   *
   * Everything that stands above the ground — extruded building blocks,
   * furniture, trees, scattered decor — is created here and sorted with the
   * shared `footprintDepth` helper, which is the same function the actors use.
   * That is what keeps occlusion consistent between packs and procedural art.
   */
  private renderIsoObjects(zone: ZoneMap, style = visualStyle()) {
    this.propImages.forEach((image) => image.destroy());
    this.propImages = [];
    this.buildingShapes.forEach((g) => g.destroy());
    this.buildingShapes = [];
    this.buildingVolumes = [];
    const theme = paintTheme(zone.id, style);

    // Whole buildings are extruded as one solid volume per structure.
    for (const fp of buildingFootprints(zone)) {
      this.drawBuilding(zone, fp, theme);
    }

    for (const object of isoObjectsFor(zone)) {
      const anchor = isoFromTile(object.x + 0.5, object.y + 0.5, zone.height);
      if (object.layer === "block") {
        if (isBuildingKind(object.kind)) continue; // drawn as part of its building
        const key = this.blockTexture(object.kind, theme);
        if (!key) continue;
        // Anchored at the bottom vertex of the tile diamond.
        const bottom = isoFromTile(object.x + 1, object.y + 1, zone.height);
        const image = this.add
          .image(bottom.x, bottom.y, key)
          .setOrigin(0.5, 1)
          .setDepth(footprintDepth(object.x, object.y));
        this.propImages.push(image);
        continue;
      }

      const key = this.propTexture(object.kind, theme);
      if (!key) continue;
      const tiles = propHeight(object.kind);
      const image = this.add
        .image(anchor.x, anchor.y + ISO_H / 2, key)
        .setOrigin(0.5, 1)
        .setScale((ISO_W * 0.85) / TILE, (tiles * ISO_H * 1.6) / TILE)
        .setDepth(footprintDepth(object.x, object.y));
      this.propImages.push(image);
    }

    // Original hand-painted scatter decor rides the same depth model.
    this.decorSprites = [];
    for (const placement of decorFor(zone)) {
      const key = originalPropKey(placement.frame);
      if (!key || !this.textures.exists(key)) continue;
      const at = this.iso(placement.px, placement.py);
      const image = this.add
        .image(at.x, at.y, key)
        .setOrigin(0.5, 1)
        // The source art is 816px square; TILE/204 maps it onto one tile.
        .setScale(placement.scale * (TILE / 204))
        .setAngle(placement.rotation ?? 0)
        .setFlipX(placement.flipX ?? false)
        .setDepth(isoDepth(placement.px, placement.py));
      this.propImages.push(image);
      this.decorSprites.push({ image, placement });
      if (this.propEditorOn) this.makeEditable(image);
    }
  }


  /* ---------------------------------------------------------------- *
   * Debug prop placement editor
   *
   * Enabled from the campus preview (`?editor=1`). Decor props become
   * draggable; on drop they snap to the true-iso tile footprint under the
   * cursor, R / Shift+R flip and rotate the selection, and every change is
   * persisted to localStorage (exportable as JSON for baking into world data).
   * ---------------------------------------------------------------- */

  private makeEditable(image: Phaser.GameObjects.Image) {
    image.setInteractive({ draggable: true, useHandCursor: true });
    this.input.setDraggable(image);
    image.on("pointerdown", () => {
      this.decorSprites.forEach(({ image: other }) => other.clearTint());
      image.setTint(0xfff1a8);
      this.selectedProp = image;
    });
    image.on("drag", (pointer: Phaser.Input.Pointer) => {
      image.setPosition(pointer.worldX, pointer.worldY);
    });
    image.on("dragend", () => this.snapAndSave(image));
  }

  /** Snap a dragged prop to its tile footprint and persist the placement. */
  private snapAndSave(image: Phaser.GameObjects.Image) {
    const entry = this.decorSprites.find((s) => s.image === image);
    if (!entry) return;
    const world = worldFromIso(image.x, image.y, this.zone.height);
    // Anchor is bottom-centre: footprint tile is the one beneath the anchor.
    const tx = Phaser.Math.Clamp(Math.round(world.x / TILE - 0.5), 0, this.zone.width - 1);
    const ty = Phaser.Math.Clamp(Math.round(world.y / TILE - 1), 0, this.zone.height - 1);
    entry.placement.px = tx * TILE + TILE / 2;
    entry.placement.py = (ty + 1) * TILE;
    const at = this.iso(entry.placement.px, entry.placement.py);
    image.setPosition(at.x, at.y);
    image.setDepth(isoDepth(entry.placement.px, entry.placement.py));
    this.persistPlacements();
  }

  /** Rotate (Q/E = ±15°) or flip (R) the selected prop. */
  private nudgeSelectedProp(key: string) {
    if (!this.propEditorOn || !this.selectedProp) return;
    const entry = this.decorSprites.find((s) => s.image === this.selectedProp);
    if (!entry) return;
    if (key === "r") {
      entry.placement.flipX = !entry.placement.flipX;
      this.selectedProp.setFlipX(entry.placement.flipX);
    } else {
      const delta = key === "e" ? 15 : -15;
      entry.placement.rotation = ((entry.placement.rotation ?? 0) + delta) % 360;
      this.selectedProp.setAngle(entry.placement.rotation);
    }
    this.persistPlacements();
  }

  private placementsAsOverrides(): PropOverride[] {
    return this.decorSprites.map(({ placement }) => ({
      frame: placement.frame,
      tx: Math.round(placement.px / TILE - 0.5),
      ty: Math.round(placement.py / TILE - 1),
      flipX: placement.flipX ?? false,
      rotation: placement.rotation ?? 0,
      scale: placement.scale,
    }));
  }

  private persistPlacements() {
    // Never persist an empty layout — that would read as "delete all decor".
    if (this.decorSprites.length === 0) return;
    savePropOverrides(this.zone.id, this.placementsAsOverrides());
  }

  /** Toggle the editor. Turning it on captures the current layout as the baseline. */
  setPropEditor(on: boolean) {
    this.propEditorOn = on;
    this.selectedProp = null;
    this.decorSprites.forEach(({ image }) => {
      image.clearTint();
      if (on) {
        this.makeEditable(image);
      } else {
        image.disableInteractive();
      }
    });
    if (on) this.persistPlacements();
  }

  /** JSON export of the current placements, for baking into world data. */
  exportPlacements(): string {
    return exportPropOverrides(this.zone.id, this.placementsAsOverrides());
  }

  /** Drop saved overrides and re-render the procedural layout. */
  resetPlacements() {
    clearPropOverrides(this.zone.id);
    this.renderIsoObjects(this.zone);
  }

  /**
   * Camera culling for the iso object layer. Phaser skips off-screen sprites
   * in the renderer, but each visible sprite still costs transform + batch
   * work every frame; hiding everything outside the inflated camera view
   * keeps large zones cheap. Fully occluded props keep rendering — true
   * occlusion queries cost more than the sprites themselves at this scale.
   */
  private cullIsoObjects() {
    const view = this.cameras.main.worldView;
    const margin = ISO_W * 3;
    const left = view.x - margin;
    const right = view.right + margin;
    const top = view.y - margin;
    const bottom = view.bottom + margin + ISO_H * 4; // tall sprites lean above their anchor
    let culled = 0;
    for (const image of this.propImages) {
      const visible =
        image.x >= left - image.displayWidth &&
        image.x <= right + image.displayWidth &&
        image.y >= top - image.displayHeight &&
        image.y <= bottom;
      image.setVisible(visible);
      if (!visible) culled += 1;
    }
    this.culledProps = culled;
  }

  /** Screen position for a cartesian world-pixel coordinate. */
  private iso(px: number, py: number) {
    return isoFromWorld(px, py, this.zone.height);
  }

  private diamondPoints(x: number, y: number, inset = 0) {
    const c = isoFromTile(x + 0.5, y + 0.5, this.zone.height);
    const hw = ISO_W / 2 - inset;
    const hh = ISO_H / 2 - inset / 2;
    return [c.x, c.y - hh, c.x + hw, c.y, c.x, c.y + hh, c.x - hw, c.y];
  }

  /**
   * Debug overlay: red = blocked tile, amber = interactable, cyan = doorway,
   * plus tile grid coordinates and the projected depth value per row so
   * depth sorting and movement alignment can be verified visually.
   */
  setCollisionDebug(on: boolean) {
    this.debugOn = on;
    this.debugTexts.forEach((t) => t.destroy());
    this.debugTexts = [];
    if (!on) {
      this.debugGraphics?.destroy();
      this.debugGraphics = undefined;
      this.debugDynamic?.destroy();
      this.debugDynamic = undefined;
      return;
    }
    const g = this.debugGraphics ?? this.add.graphics().setDepth(OVERLAY_DEPTH);
    this.debugGraphics = g;
    this.debugDynamic = this.debugDynamic ?? this.add.graphics().setDepth(OVERLAY_DEPTH + 2);
    g.clear();
    const poly = (x: number, y: number, inset = 0) => {
      const p = this.diamondPoints(x, y, inset);
      return new Phaser.Geom.Polygon(p);
    };
    for (let y = 0; y < this.zone.height; y++) {
      for (let x = 0; x < this.zone.width; x++) {
        // Grid definition for every tile diamond.
        g.lineStyle(1, 0x1c2b1a, 0.22);
        g.strokePoints(poly(x, y).points, true);
        if (!isWalkableTile(this.zone, x, y)) {
          g.fillStyle(0xff3b30, 0.28);
          g.fillPoints(poly(x, y).points, true);
        }
        // Coordinate + depth labels, sparse so the map stays readable.
        if (x % 3 === 0 && y % 3 === 0) {
          const c = isoFromTile(x + 0.5, y + 0.5, this.zone.height);
          this.debugTexts.push(
            this.add
              .text(c.x, c.y, `${x},${y}\nz${Math.round(c.y + 10)}`, {
                fontFamily: "monospace",
                fontSize: "8px",
                color: "#fff3d8",
                align: "center",
                backgroundColor: "#1c120c99",
              })
              .setOrigin(0.5)
              .setDepth(OVERLAY_DEPTH + 1),
          );
        }
      }
    }
    // Depth bands: one line per isometric row, so sorting order is visible.
    for (let s = 0; s < this.zone.width + this.zone.height; s += 4) {
      const a = isoFromTile(Math.min(s, this.zone.width), Math.max(0, s - this.zone.width), this.zone.height);
      const b = isoFromTile(Math.max(0, s - this.zone.height), Math.min(s, this.zone.height), this.zone.height);
      g.lineStyle(1, 0x35d0ff, 0.35);
      g.lineBetween(a.x, a.y, b.x, b.y);
    }
    for (const i of this.zone.interactables) {
      const cyan = i.action.kind === "travel";
      g.lineStyle(2, cyan ? 0x35d0ff : 0xd9a441, 0.9);
      g.strokePoints(poly(i.x, i.y, 3).points, true);
    }
    for (const bad of reachabilityReport(this.zone).unreachable) {
      g.lineStyle(2, 0xff00ff, 1);
      g.strokePoints(poly(bad.x, bad.y).points, true);
    }
  }

  /** Per-frame debug layer: the player's collision box and occupied tile. */
  private drawDynamicDebug() {
    const g = this.debugDynamic;
    if (!g || !this.player) return;
    g.clear();
    const tx = Math.round(this.player.px / TILE);
    const ty = Math.round(this.player.py / TILE);
    g.lineStyle(2, 0x7cff6b, 0.95);
    g.strokePoints(new Phaser.Geom.Polygon(this.diamondPoints(tx, ty, 2)).points, true);
    // Collision box (cartesian) projected as a diamond footprint.
    const half = TILE / 3;
    const corners = [
      [this.player.px - half, this.player.py - half],
      [this.player.px + half, this.player.py - half],
      [this.player.px + half, this.player.py + half],
      [this.player.px - half, this.player.py + half],
    ].map(([x, y]) => this.iso(x!, y!));
    g.lineStyle(2, 0xffd54a, 0.95);
    g.beginPath();
    g.moveTo(corners[0]!.x, corners[0]!.y);
    corners.slice(1).forEach((c) => g.lineTo(c.x, c.y));
    g.closePath();
    g.strokePath();
  }

  /** Live figures for the React debug overlay. */
  debugSnapshot() {
    if (!this.zone || !this.player) return null;
    const at = this.iso(this.player.px, this.player.py);
    const tx = Math.round(this.player.px / TILE);
    const ty = Math.round(this.player.py / TILE);
    const cam = this.cameras.main;
    return {
      zone: this.zone.id,
      tile: { x: tx, y: ty },
      world: { x: Math.round(this.player.px), y: Math.round(this.player.py) },
      screen: { x: Math.round(at.x), y: Math.round(at.y) },
      depth: Math.round(actorDepth(this.player.px, this.player.py)),
      walkable: isWalkableTile(this.zone, tx, ty),
      standing: this.canStand(this.player.px, this.player.py),
      facing: this.facing,
      zoom: Math.round(cam.zoom * 100) / 100,
      scroll: { x: Math.round(cam.scrollX), y: Math.round(cam.scrollY) },
      gridOn: this.debugOn,
      panMode: this.panMode,
    };
  }

  collisionDebugEnabled() {
    return this.debugOn;
  }

  /* ---------------------------------------------------------------- *
   * Camera pan & zoom
   * ---------------------------------------------------------------- */

  /** Free-look mode: drag pans the camera instead of walking the student. */
  setPanMode(on: boolean) {
    this.panMode = on;
    const cam = this.cameras.main;
    if (on) {
      cam.stopFollow();
      this.moveTarget = null;
    } else {
      this.recenterCamera();
    }
  }

  panModeEnabled() {
    return this.panMode;
  }

  /** Re-attaches the camera to the student and clears any free-look offset. */
  recenterCamera() {
    const cam = this.cameras.main;
    const lerp = cameraLerp();
    cam.startFollow(this.player.sprite, true, lerp, lerp);
    cam.centerOn(this.player.sprite.x, this.player.sprite.y);
  }

  cameraZoom() {
    return this.cameras.main.zoom;
  }

  /** Multiplies the zoom, optionally keeping a screen point anchored. */
  zoomBy(factor: number, anchor?: { x: number; y: number }) {
    const cam = this.cameras.main;
    const next = Phaser.Math.Clamp(cam.zoom * factor, MIN_ZOOM, MAX_ZOOM);
    if (next === cam.zoom) return next;
    if (anchor) {
      const before = cam.getWorldPoint(anchor.x, anchor.y);
      cam.setZoom(next);
      const after = cam.getWorldPoint(anchor.x, anchor.y);
      cam.scrollX += before.x - after.x;
      cam.scrollY += before.y - after.y;
    } else {
      cam.setZoom(next);
    }
    return next;
  }

  private setupCameraControls() {
    this.input.addPointer(2);
    const cam = this.cameras.main;

    this.input.on(
      "wheel",
      (
        pointer: Phaser.Input.Pointer,
        _objects: unknown,
        _dx: number,
        dy: number,
        _dz: number,
        event?: WheelEvent,
      ) => {
        event?.preventDefault?.();
        // Scale by delta magnitude so one trackpad flick doesn't slam to max.
        const factor = Math.exp(-dy * 0.0015);
        if (!this.panMode) cam.stopFollow();
        this.zoomBy(factor, { x: pointer.x, y: pointer.y });
        if (!this.panMode) this.recenterFollowSoon();
      },
    );

    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      const p2 = this.input.pointer2;
      if (p2 && p2.isDown && pointer.isDown) {
        // Pinch zoom: the distance between two fingers drives the scale.
        const dist = Phaser.Math.Distance.Between(pointer.x, pointer.y, p2.x, p2.y);
        if (this.pinchDist > 0) {
          cam.stopFollow();
          this.zoomBy(dist / this.pinchDist, {
            x: (pointer.x + p2.x) / 2,
            y: (pointer.y + p2.y) / 2,
          });
        }
        this.pinchDist = dist;
        this.moveTarget = null;
        return;
      }
      this.pinchDist = 0;
      if (!this.panMode || !pointer.isDown) return;
      cam.scrollX -= (pointer.x - pointer.prevPosition.x) / cam.zoom;
      cam.scrollY -= (pointer.y - pointer.prevPosition.y) / cam.zoom;
    });

    this.input.on("pointerup", () => {
      this.pinchDist = 0;
    });
  }

  /** After a wheel zoom in follow mode, glide back onto the student. */
  private recenterFollowSoon() {
    if (this.recenterTimer) this.recenterTimer.remove();
    this.recenterTimer = this.time.delayedCall(450, () => {
      if (!this.panMode) this.recenterCamera();
    });
  }

  reachability() {
    return reachabilityReport(this.zone);
  }


  /**
   * Every texture Phaser currently holds, grouped the way the campus uses
   * them. Feeds the in-app asset debug screen so it is provable that nothing
   * 3D (GLB/GLTF/FBX) is ever loaded — all art is baked canvas or sprite
   * sheets generated at runtime.
   */
  assetReport(): CampusAssetReport {
    const entries: CampusAssetEntry[] = [];
    for (const key of this.textures.getTextureKeys()) {
      const tex = this.textures.get(key);
      const src = tex.source[0];
      const image = src?.image as { src?: string } | undefined;
      const url = typeof image?.src === "string" ? image.src : "";
      const external = /^https?:|^\/|^blob:/.test(url) && !url.startsWith("data:");
      // Theme-aware zone textures are keyed as zone-{id}-{style}-{path}… .
      const zoneId = key.startsWith("zone-iso-")
        ? key.slice(9).split(/-(?:storybook|focus)-/)[0]
        : undefined;
      const group: CampusAssetEntry["group"] = key.startsWith("zone-iso-")
        ? zoneId && getZone(zoneId).kind === "interior"
          ? "interior"
          : "zone"
        : key.startsWith("unify-")
          ? "zone"
          : key.startsWith("char-")
            ? "character"
            : "system";
      entries.push({
        key,
        group,
        width: src?.width ?? 0,
        height: src?.height ?? 0,
        frames: tex.frameTotal,
        source: external ? "file" : "procedural canvas",
        ...(external ? { url } : {}),
        suspect3d: /\.(glb|gltf|fbx|obj)(\?|$)/i.test(url),
      });
    }
    entries.sort((a, b) => a.group.localeCompare(b.group) || a.key.localeCompare(b.key));
    const blockedAssetKeys = entries.filter((e) => e.suspect3d).map((e) => e.key);
    return {
      zone: this.zone?.id ?? "—",
      zoneKind: this.zone?.kind ?? "outdoor",
      rooms: (this.zone?.rooms ?? []).map((r) => r.name),
      entries,
      suspect: blockedAssetKeys.length,
      blockedAssetKeys,
      blockedReason: "The build-time 2D guard rejects GLTF, GLB, FBX, OBJ and Three.js sources before Phaser can load them.",
    };
  }

  /* ---------------------------------------------------------------- *
   * Lifecycle
   * ---------------------------------------------------------------- */

  /**
   * The hand-painted art is several megabytes, so it is NOT preloaded: the
   * world paints instantly with the procedural 32px renderer and swaps to the
   * paintings in the background once they arrive.
   */
  private loadOriginalArt(onReady: () => void) {
    const pending = Object.entries(ORIGINAL_ART).filter(([key]) => !this.textures.exists(key));
    if (pending.length === 0) {
      this.artReady = true;
      return;
    }
    for (const [key, url] of pending) this.load.image(key, url);
    this.load.once(Phaser.Loader.Events.COMPLETE, () => {
      this.artReady = true;
      onReady();
    });
    this.load.start();
  }

  create(data: { zoneId: string; x: number; y: number }) {
    // Preview-only debug handle for E2E tests and the prop editor.
    if (typeof window !== "undefined" && window.location.pathname.startsWith("/campus-preview")) {
      (window as unknown as Record<string, unknown>)["__campusScene"] = this;
    }
    this.zone = getZone(data.zoneId);
    this.cameras.main.setBackgroundColor(this.zone.kind === "outdoor" ? "#7ec850" : "#fff0d2");

    const drawGround = (style = visualStyle()) => {
      const groundKey = this.bakeZone(this.zone, style);
      if (!groundKey) return;
      this.groundImage?.destroy();
      this.groundImage = this.add.image(0, 0, groundKey).setOrigin(0, 0).setDepth(GROUND_DEPTH);
    };
    drawGround();
    this.renderIsoObjects(this.zone);
    this.loadOriginalArt(() => {
      if (!this.scene.isActive()) return;
      drawGround();
      this.renderIsoObjects(this.zone);
    });

    this.styleUnsub?.();
    this.styleUnsub = useStyleStore.subscribe((s) => {
      this.cameras.main.setBackgroundColor(this.zone.kind === "outdoor" ? (s.style === "focus" ? "#6eaa58" : "#7ec850") : (s.style === "focus" ? "#e6dfc7" : "#fff0d2"));
      drawGround(s.style);
      this.renderIsoObjects(this.zone, s.style);
    });

    // Room signposts — chunky plaques the way an illustrated campus board reads.
    this.zone.rooms.forEach((room) => {
      const at = isoFromTile(room.x + room.w / 2, room.y + room.h / 2, this.zone.height);
      this.add
        .text(at.x, at.y, room.name.toUpperCase(), {
          fontFamily: "monospace",
          fontStyle: "bold",
          fontSize: "11px",
          color: "#4a2a12",
          backgroundColor: "#fff3d8",
          padding: { x: 6, y: 3 },
        })
        .setOrigin(0.5, 1)
        .setStroke("#8a5730", 3)
        .setShadow(0, 2, "#00000055", 0, true, true)
        .setDepth(OVERLAY_DEPTH - 100);
    });

    // Interaction markers.
    this.interactionMarkers.clear();
    this.zone.interactables.forEach((i) => {
      const at = isoFromTile(i.x + 0.5, i.y + 0.5, this.zone.height);
      const marker = this.add.graphics().setDepth(footprintDepth(i.x, i.y, 1, 1, DEPTH_BIAS.decal));
      marker.fillStyle(0x241812, 0.35);
      marker.fillEllipse(at.x, at.y + 4, 20, 10);
      marker.fillStyle(0xffd54a, 1);
      marker.fillCircle(at.x, at.y - 6, 6);
      marker.fillStyle(0xfff3d8, 1);
      marker.fillCircle(at.x - 2, at.y - 8, 2);
      this.interactionMarkers.set(i.id, marker);
      if (bobScale() > 0) {
        this.tweens.add({
          targets: marker,
          alpha: 0.45,
          duration: 780,
          yoyo: true,
          repeat: -1,
        });
      }
    });

    // NPCs — every character gets its own generated sheet, so nobody is a clone.
    this.npcs = this.zone.npcs.map((spawn) => {
      const actor = this.makeActor(
        spawn.x * TILE + 16,
        spawn.y * TILE + 16,
        `npc-${spawn.id}`,
        lookFor(spawn.id, spawn.role),
        spawn.name.split(" ")[0]!,
      );
      const homeX = spawn.x * TILE + 16;
      const homeY = spawn.y * TILE + 16;
      return {
        ...actor,
        spawn,
        homeX,
        homeY,
        timer: 0,
        brain: createBrain(spawn, homeX, homeY),
      };
    });

    // Player: mascot colour drives the shirt, everything else is their own look.
    const mascot = currentMascot();
    this.player = this.makeActor(
      data.x * TILE + 16,
      data.y * TILE + 16,
      this.playerTextureKey(mascot.color),
      this.playerLook(mascot.color),
      "You",
    );
    this.applyMascotAccessory(mascot.accessory);
    this.mascotUnsub?.();
    this.mascotUnsub = useMascotStore.subscribe((s) => {
      this.refreshPlayerTexture(s.mascot.color);
      this.applyMascotAccessory(s.mascot.accessory);
    });
    this.appearanceUnsub?.();
    this.appearanceUnsub = useAppearanceStore.subscribe(() => {
      this.refreshPlayerTexture(currentMascot().color);
    });

    this.vx = 0;
    this.vy = 0;
    if (!this.canStand(this.player.px, this.player.py)) {
      const spot = this.nearestWalkable(data.x, data.y);
      this.setActorPosition(this.player, spot.x * TILE + 16, spot.y * TILE + 16);
    }
    this.doorCooldown = 500;
    this.doorArmed = false;
    this.moveTarget = null;

    const cam = this.cameras.main;
    const size = isoCanvasSize(this.zone.width, this.zone.height);
    cam.setBounds(0, 0, size.width, size.height);
    cam.setZoom(this.scale.width < 720 ? 1.5 : 1.8);
    cam.setRoundPixels(true);
    const lerp = cameraLerp();
    cam.startFollow(this.player.sprite, true, lerp, lerp);
    cam.setDeadzone(48, 36);
    cam.setLerp(lerp, lerp);
    this.motionUnsub?.();
    this.motionUnsub = useMotionStore.subscribe((s) => {
      const l = cameraLerp(s.setting);
      this.cameras.main.setLerp(l, l);
    });

    // Atmosphere: drifting leaves, fountain splashes and the ambient wash.
    this.ambience?.destroy();
    this.ambience = createAmbience(this, this.zone, (px, py) => this.iso(px, py), {
      motion: bobScale(),
    });
    this.ambientTimer = 1000;

    // Proximity action reticle.
    this.reticleRing = this.add.graphics().setDepth(OVERLAY_DEPTH - 10).setVisible(false);
    this.reticleText = this.add
      .text(0, 0, "", {
        fontFamily: "monospace",
        fontStyle: "bold",
        fontSize: "10px",
        color: "#eedcc5",
        backgroundColor: "#1a1510cc",
        padding: { x: 5, y: 2 },
      })
      .setOrigin(0.5, 1)
      .setDepth(OVERLAY_DEPTH - 9)
      .setVisible(false);

    this.setupPointerWalk();
    this.setupCameraControls();

    this.events.once("shutdown", () => {
      this.motionUnsub?.();
      this.motionUnsub = undefined;
      this.mascotUnsub?.();
      this.mascotUnsub = undefined;
      this.appearanceUnsub?.();
      this.appearanceUnsub = undefined;
      this.styleUnsub?.();
      this.styleUnsub = undefined;
      this.groundImage = undefined;
      this.propImages.forEach((image) => image.destroy());
      this.propImages = [];
      this.buildingShapes.forEach((shape) => shape.destroy());
      this.buildingShapes = [];
      this.buildingVolumes = [];
      this.debugGraphics?.destroy();
      this.debugGraphics = undefined;
      this.debugDynamic?.destroy();
      this.debugDynamic = undefined;
      this.debugTexts.forEach((t) => t.destroy());
      this.debugTexts = [];
      this.recenterTimer?.remove();
      this.recenterTimer = undefined;
      this.tapMarker?.destroy();
      this.tapMarker = undefined;
      this.ambience?.destroy();
      this.ambience = undefined;
      this.reticleRing?.destroy();
      this.reticleRing = undefined;
      this.reticleText?.destroy();
      this.reticleText = undefined;
      this.input.off("pointerdown");
      this.input.off("pointermove");
      this.input.off("pointerup");
      this.input.off("wheel");
    });

    const kb = this.input.keyboard!;
    this.cursors = kb.createCursorKeys();
    this.keys = kb.addKeys("W,A,S,D,E,M,C") as Record<string, Phaser.Input.Keyboard.Key>;
    // Prop-editor hotkeys: R flips, Q/E rotate the selected prop (no-ops
    // unless the editor is enabled, so gameplay keys are unaffected).
    kb.on("keydown", (event: KeyboardEvent) => {
      const k = event.key.toLowerCase();
      if (k === "r" || k === "q" || k === "e") this.nudgeSelectedProp(k);
    });
    this.keys["E"]!.on("down", () => this.interact());
    this.keys["M"]!.on("down", () => useCampusStore.getState().setMapOpen(true));
    this.keys["C"]!.on("down", () => {
      if (!debugEnabled()) return;
      this.setCollisionDebug(!this.debugOn);
    });

    useCampusStore.getState().setZone(this.zone.id);
    useCampusStore
      .getState()
      .setPlayer(
        Math.round(this.player.px / TILE),
        Math.round(this.player.py / TILE),
        this.facing,
      );
  }

  /* ---------------------------------------------------------------- *
   * Touch-to-move
   * ---------------------------------------------------------------- */

  /**
   * Unprojects a screen point back onto the tile grid and snaps to that
   * tile's centre, so a click always lands the student on the diamond the
   * cursor was over rather than a fractional point between tiles.
   */
  tileAtScreen(worldX: number, worldY: number) {
    const world = worldFromIso(worldX, worldY, this.zone.height);
    return { x: Math.floor(world.x / TILE), y: Math.floor(world.y / TILE) };
  }

  private setupPointerWalk() {
    const toTarget = (pointer: Phaser.Input.Pointer) => {
      const s = useCampusStore.getState();
      if (s.dialogue || s.reading || s.lessonOpen || s.mapOpen || s.transition) return;
      if (this.panMode || (this.input.pointer2 && this.input.pointer2.isDown)) return;
      const tile = this.tileAtScreen(pointer.worldX, pointer.worldY);
      const spot = this.canStand(tile.x * TILE + TILE / 2, tile.y * TILE + TILE / 2)
        ? tile
        : this.nearestWalkable(tile.x, tile.y);
      this.moveTarget = { x: spot.x * TILE + TILE / 2, y: spot.y * TILE + TILE / 2 };
      const at = isoFromTile(spot.x + 0.5, spot.y + 0.5, this.zone.height);
      this.showTapMarker(at.x, at.y);
    };
    this.input.on("pointerdown", toTarget);
    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      if (pointer.isDown) toTarget(pointer);
    });
  }


  private showTapMarker(x: number, y: number) {
    this.tapMarker?.destroy();
    const g = this.add.graphics().setDepth(OVERLAY_DEPTH - 50);
    g.lineStyle(2, 0xfff3d8, 0.95);
    g.strokeEllipse(x, y, 22, 11);
    g.lineStyle(2, 0xff6f52, 0.95);
    g.strokeEllipse(x, y, 12, 6);
    this.tapMarker = g;
    this.tweens.add({
      targets: g,
      alpha: 0,
      scale: 1.4,
      duration: 520,
      onComplete: () => {
        g.destroy();
        if (this.tapMarker === g) this.tapMarker = undefined;
      },
    });
  }

  /* ---------------------------------------------------------------- *
   * Characters
   * ---------------------------------------------------------------- */

  private playerTextureKey(color: string) {
    return `${appearanceKey(currentAppearance())}-${color}`;
  }

  private playerLook(color: string): CharacterLook {
    // The student's saved customization drives everything; the mascot colour
    // just tints the shirt so pet and student stay coordinated.
    return { ...lookFromAppearance(currentAppearance()), shirt: mascotColorOf(color).hex };
  }

  /** Rebuilds the player sheet after appearance or mascot changes. */
  private refreshPlayerTexture(color: string) {
    if (!this.player) return;
    const key = this.playerTextureKey(color);
    ensureCharacterTexture(this, key, this.playerLook(color));
    ensureCharacterAnims(this, key);
    this.player.key = key;
    this.player.sprite.setTexture(key, idleFrame(this.facing));
  }

  private makeActor(
    px: number,
    py: number,
    key: string,
    look: CharacterLook,
    label: string,
  ): Actor {
    ensureCharacterTexture(this, key, look);
    ensureCharacterAnims(this, key);
    const at = this.iso(px, py);
    const sprite = this.add
      .sprite(at.x, at.y, key, idleFrame("down"))
      .setOrigin(0.5, 0.86)
      .setScale(CHAR_RENDER_SCALE)
      .setDepth(actorDepth(px, py));
    const text = this.add
      .text(at.x, at.y - 38, label, { fontFamily: "monospace", fontSize: "10px", color: "#fff3d8" })
      .setOrigin(0.5)
      .setPadding(3, 1, 3, 1)
      .setBackgroundColor("#3a241caa")
      .setDepth(actorDepth(px, py, DEPTH_BIAS.label));
    return { sprite, label: text, key, dir: "down", moving: false, px, py };
  }

  /** Keeps building volumes sorted behind the player when they stand in front. */
  private sortBuildings() {
    for (const { g, fp } of this.buildingVolumes) {
      g.setDepth(buildingDepthFor(fp.x, fp.y, fp.w, fp.h, this.player.px, this.player.py));
    }
  }

  /** Moves an actor in cartesian space and re-projects everything it owns. */
  private setActorPosition(actor: Actor, px: number, py: number) {
    actor.px = px;
    actor.py = py;
    const at = this.iso(px, py);
    actor.sprite.setPosition(at.x, at.y);
    actor.sprite.setDepth(actorDepth(px, py));
    actor.label.setPosition(at.x, at.y - 38);
    actor.label.setDepth(actorDepth(px, py, DEPTH_BIAS.label));
    actor.badge?.setPosition(at.x, at.y - 24);
    actor.badge?.setDepth(actorDepth(px, py, DEPTH_BIAS.label));
  }

  private applyMascotAccessory(id: string) {
    this.player.badge?.destroy();
    this.player.badge = undefined;
    const accessory = mascotAccessoryOf(id);
    if (accessory.id === "none") return;
    const badge = this.add
      .rectangle(this.player.sprite.x, this.player.sprite.y - 24, 14, 4, accessory.hex)
      .setStrokeStyle(1, 0x241812, 0.8)
      .setDepth(actorDepth(this.player.px, this.player.py, DEPTH_BIAS.label));
    this.player.badge = badge;
  }

  /** Plays or parks the right walk cycle for an actor. */
  private animate(actor: Actor, dir: Direction, moving: boolean) {
    const animated = moving && bobScale() > 0;
    if (actor.dir === dir && actor.moving === animated) return;
    actor.dir = dir;
    actor.moving = animated;
    if (animated) actor.sprite.play(`${actor.key}-walk-${dir}`, true);
    else {
      actor.sprite.stop();
      actor.sprite.setFrame(idleFrame(dir));
    }
  }

  private canStand(px: number, py: number) {
    return canStandBox(this.zone, px, py);
  }

  private nearestInteraction() {
    const px = this.player.px / TILE;
    const py = this.player.py / TILE;
    let best: { dist: number; kind: "object" | "npc"; index: number } | null = null;
    this.zone.interactables.forEach((i, index) => {
      const d = Math.hypot(i.x + 0.5 - px, i.y + 0.5 - py);
      if (d < interactRadius("object") && (!best || d < best.dist))
        best = { dist: d, kind: "object", index };
    });
    this.npcs.forEach((n, index) => {
      const d = Math.hypot(n.px / TILE - px, n.py / TILE - py);
      if (d < interactRadius("npc") && (!best || d < best.dist))
        best = { dist: d, kind: "npc", index };
    });
    return best as { dist: number; kind: "object" | "npc"; index: number } | null;
  }

  interact() {
    const store = useCampusStore.getState();
    if (store.dialogue || store.reading || store.lessonOpen || store.mapOpen) return;
    const hit = this.nearestInteraction();
    if (!hit) return;
    this.moveTarget = null;
    if (hit.kind === "object") {
      const target = this.zone.interactables[hit.index]!;
      this.game.events.emit("unify-interact", target.action, target.label);
    } else {
      const npc = this.npcs[hit.index]!.spawn;
      this.game.events.emit("unify-talk", npc);
    }
  }

  placePlayer(tileX: number, tileY: number) {
    if (!this.player) return;
    const spot = this.canStand(tileX * TILE + 16, tileY * TILE + 16)
      ? { x: tileX, y: tileY }
      : this.nearestWalkable(tileX, tileY);
    this.setActorPosition(this.player, spot.x * TILE + 16, spot.y * TILE + 16);
    this.vx = 0;
    this.vy = 0;
    this.moveTarget = null;
    this.doorCooldown = 900;
    this.doorArmed = false;
    this.cameras.main.centerOn(this.player.sprite.x, this.player.sprite.y);
    useCampusStore.getState().setPlayer(spot.x, spot.y, "down");
  }

  private nearestWalkable(tx: number, ty: number) {
    for (let r = 1; r < 12; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          const x = tx + dx;
          const y = ty + dy;
          if (this.canStand(x * TILE + 16, y * TILE + 16)) return { x, y };
        }
      }
    }
    return { x: tx, y: ty };
  }

  private checkDoorTrigger(delta: number) {
    if (this.doorCooldown > 0) {
      this.doorCooldown -= delta;
      return;
    }
    const px = this.player.px / TILE;
    const py = this.player.py / TILE;
    let nearest: { d: number; i: Interactable } | null = null;
    for (const i of this.zone.interactables) {
      if (i.action.kind !== "travel") continue;
      const d = Math.hypot(i.x + 0.5 - px, i.y + 0.5 - py);
      if (!nearest || d < nearest.d) nearest = { d, i };
    }
    if (!nearest) return;
    if (!this.doorArmed) {
      if (nearest.d > doorTriggerRadius() + 0.8) this.doorArmed = true;
      return;
    }
    if (nearest.d > doorTriggerRadius()) return;
    this.doorArmed = false;
    this.doorCooldown = 1200;
    this.moveTarget = null;
    this.game.events.emit("unify-door", nearest.i.action, nearest.i.label);
  }

  override update(_time: number, delta: number) {
    this.perfFrames += 1;
    this.perfTotal += delta;
    if (delta > this.perfWorst) this.perfWorst = delta;
    if (delta > 33) this.perfSpikes += 1;
    if (this.perfFrames > 600) {
      this.perfFrames = 1;
      this.perfTotal = delta;
    }

    // Cull the iso object layer every few frames (camera moves are smooth,
    // so a 5-frame cadence never pops a sprite into view late).
    this.cullFrame = (this.cullFrame + 1) % 5;
    if (this.cullFrame === 0) this.cullIsoObjects();

    const store = useCampusStore.getState();
    const blocked = !!(store.dialogue || store.reading || store.lessonOpen || store.mapOpen);
    if (blocked) this.moveTarget = null;
    const dt = Math.min(delta, 50) / 1000;
    let ix = 0;
    let iy = 0;
    if (!blocked) {
      if (this.cursors.left.isDown || this.keys["A"]!.isDown) ix -= 1;
      if (this.cursors.right.isDown || this.keys["D"]!.isDown) ix += 1;
      if (this.cursors.up.isDown || this.keys["W"]!.isDown) iy -= 1;
      if (this.cursors.down.isDown || this.keys["S"]!.isDown) iy += 1;
      ix += this.joystick.x;
      iy += this.joystick.y;
    }

    // Screen-space input is rotated into the cartesian grid so pressing "up"
    // walks up-screen along the isometric axes.
    if (ix !== 0 || iy !== 0) {
      this.moveTarget = null;
      const dir = isoInputToWorld(ix, iy);
      ix = dir.x;
      iy = dir.y;
    } else if (this.moveTarget) {
      const dx = this.moveTarget.x - this.player.px;
      const dy = this.moveTarget.y - this.player.py;
      const dist = Math.hypot(dx, dy);
      if (dist <= TAP_ARRIVE) {
        this.moveTarget = null;
      } else {
        ix = dx / dist;
        iy = dy / dist;
      }
    }

    const len = Math.hypot(ix, iy);
    if (len > 1) {
      ix /= len;
      iy /= len;
    }

    const targetVX = ix * SPEED;
    const targetVY = iy * SPEED;
    const approach = (v: number, target: number) => {
      const rate = (target === 0 ? FRICTION : ACCEL) * dt;
      if (v < target) return Math.min(v + rate, target);
      if (v > target) return Math.max(v - rate, target);
      return v;
    };
    this.vx = approach(this.vx, targetVX);
    this.vy = approach(this.vy, targetVY);

    // Axis-separated collision so sliding along a hedge or riverbank works.
    let blockedX = false;
    let blockedY = false;
    const nx = this.player.px + this.vx * dt;
    if (this.canStand(nx, this.player.py)) this.player.px = nx;
    else {
      this.vx = 0;
      blockedX = true;
    }
    const ny = this.player.py + this.vy * dt;
    if (this.canStand(this.player.px, ny)) this.player.py = ny;
    else {
      this.vy = 0;
      blockedY = true;
    }
    // Walking into a wall on the way to a tapped point: give up rather than
    // grinding against it forever.
    if (this.moveTarget && blockedX && blockedY) this.moveTarget = null;

    this.setActorPosition(this.player, this.player.px, this.player.py);
    this.sortBuildings();
    if (this.debugOn) this.drawDynamicDebug();


    const speed = Math.hypot(this.vx, this.vy);
    const moving = speed > 6;
    if (moving) {
      // Facing is chosen from the on-screen direction of travel.
      const svx = (this.vx - this.vy) * (ISO_W / 2);
      const svy = (this.vx + this.vy) * (ISO_H / 2);
      this.facing =
        Math.abs(svx) > Math.abs(svy)
          ? svx > 0
            ? "right"
            : "left"
          : svy > 0
            ? "down"
            : "up";
    }
    this.animate(this.player, this.facing, moving);

    if (moving) {
      const ptx = Math.round(this.player.px / TILE);
      const pty = Math.round(this.player.py / TILE);
      if (
        ptx !== this.lastSentTx ||
        pty !== this.lastSentTy ||
        this.facing !== this.lastSentFacing
      ) {
        this.lastSentTx = ptx;
        this.lastSentTy = pty;
        this.lastSentFacing = this.facing;
        store.setPlayer(ptx, pty, this.facing);
      }
      this.checkDoorTrigger(delta);
    } else if (this.doorCooldown > 0) {
      this.doorCooldown -= delta;
    }

    // NPC behaviour — skip anyone off camera, and skip idle motion entirely
    // when reduced motion is on.
    const view = this.cameras.main.worldView;
    const idleMotion = bobScale() > 0;
    this.npcs.forEach((n) => {
      n.timer += delta;
      const projected = this.iso(n.px, n.py);
      if (
        projected.x < view.x - 64 ||
        projected.x > view.right + 64 ||
        projected.y < view.y - 64 ||
        projected.y > view.bottom + 64
      )
        return;
      if (n.spawn.behavior === "walk") {
        const targetX = idleMotion ? n.homeX + Math.sin(n.timer / 1400) * 48 : n.homeX;
        const walking = idleMotion && this.canStand(targetX, n.py);
        if (walking) this.setActorPosition(n, targetX, n.py);
        this.animate(n, Math.cos(n.timer / 1400) > 0 ? "right" : "left", walking);
      } else {
        this.animate(n, "down", false);
      }
    });

    // Prompt + room tracking, throttled well below human reaction time.
    this.scanTimer += delta;
    if (this.scanTimer < 100) return;
    this.scanTimer = 0;

    const hit = this.nearestInteraction();
    if (hit) {
      const prompt =
        hit.kind === "object"
          ? {
              id: this.zone.interactables[hit.index]!.id,
              verb: this.zone.interactables[hit.index]!.verb,
              label: this.zone.interactables[hit.index]!.label,
            }
          : {
              id: this.npcs[hit.index]!.spawn.id,
              verb: "TALK",
              label: this.npcs[hit.index]!.spawn.name,
            };
      if (prompt.id !== this.lastPromptId) {
        this.lastPromptId = prompt.id;
        store.setPrompt(prompt);
      }
      this.interactionMarkers.forEach((marker, id) => {
        const active = hit.kind === "object" && id === prompt.id;
        marker.setScale(active ? 1.16 : 1);
        marker.setAlpha(active ? 1 : 0.8);
      });
    } else if (this.lastPromptId) {
      this.lastPromptId = null;
      store.setPrompt(undefined);
      this.interactionMarkers.forEach((marker) => marker.setScale(1).setAlpha(0.8));
    }

    const tx = this.player.px / TILE;
    const ty = this.player.py / TILE;
    const room = this.zone.rooms.find(
      (r) => tx >= r.x && tx <= r.x + r.w && ty >= r.y && ty <= r.y + r.h,
    );
    const roomId = room?.id ?? null;
    if (roomId !== this.lastRoomId) {
      this.lastRoomId = roomId;
      store.setRoom(room?.id, room?.name);
      if (room) store.discover(room.id);
    }
  }
}
