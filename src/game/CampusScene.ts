import Phaser from "phaser";
import { TILE, TILE_COLORS, type TileKind } from "@/lib/campus/tiles";
import { getZone, type Interactable, type NpcSpawn, type ZoneMap } from "@/lib/campus/world";
import { canStandBox } from "@/lib/campus/walkable";
import { interactRadius, doorTriggerRadius } from "@/lib/a11y/assist";
import { npcPalette, type NpcPalette } from "@/lib/campus/npc-cast";
import { useCampusStore } from "@/lib/campus/store";
import { debugEnabled } from "@/lib/debug";
import { bobScale, cameraLerp, useMotionStore } from "@/lib/a11y/motion";
import { currentMascot, mascotAccessoryOf, mascotColorOf, useMascotStore } from "@/lib/mascot";
import {
  DECOR_KEY,
  DECOR_URL,
  decorFor,
  frameRect,
  type DecorPlacement,
} from "@/lib/campus/decor";
import { isWalkableTile, reachabilityReport } from "@/lib/campus/walkable";
import {
  INTERIOR_GROUND,
  INTERIOR_KEY,
  INTERIOR_PROPS,
  INTERIOR_URL,
  INT_SCALE,
  INT_SRC,
  ITEMS_KEY,
  ITEMS_URL,
  pick as pickVariant,
} from "@/lib/campus/interiors";
import {
  OVERLAY_TILES,
  SCALE,
  SRC_TILE,
  TILESET_KEY,
  TILESET_URL,
  TILE_FRAMES,
  variantFor,
} from "@/lib/campus/tileset";

const SPEED = 168;
/** Pixels/sec^2 used to ease into and out of a walk so movement is not snappy. */
const ACCEL = 1400;
const FRICTION = 1900;

export type Direction = "up" | "down" | "left" | "right";

interface CharacterParts {
  shadow: Phaser.GameObjects.Ellipse;
  legL: Phaser.GameObjects.Rectangle;
  legR: Phaser.GameObjects.Rectangle;
  armL: Phaser.GameObjects.Rectangle;
  armR: Phaser.GameObjects.Rectangle;
  body: Phaser.GameObjects.Rectangle;
  head: Phaser.GameObjects.Arc;
  hair: Phaser.GameObjects.Rectangle;
  face: Phaser.GameObjects.Rectangle;
}

export interface CharacterContainer extends Phaser.GameObjects.Container {
  parts: CharacterParts;
}

interface NpcSprite {
  spawn: NpcSpawn;
  container: CharacterContainer;
  homeX: number;
  homeY: number;
  dir: number;
  timer: number;
}

/** Draws a tile with a little hand-placed detail so the world does not read as flat squares. */
function paintTile(g: Phaser.GameObjects.Graphics, kind: TileKind, px: number, py: number) {
  const c = TILE_COLORS[kind];
  const base = c.base;
  const detail = c.detail ?? c.base;
  g.fillStyle(base, 1);
  g.fillRect(px, py, TILE, TILE);

  switch (kind) {
    case "grass":
    case "grassAlt":
      g.fillStyle(detail, 1);
      g.fillRect(px + 6, py + 20, 3, 5);
      g.fillRect(px + 20, py + 8, 3, 5);
      break;
    case "path":
    case "stone":
      g.fillStyle(detail, 1);
      g.fillRect(px, py + 15, TILE, 2);
      g.fillRect(px + 15, py, 2, TILE);
      break;
    case "brick":
      g.fillStyle(detail, 1);
      g.fillRect(px, py + 14, TILE, 2);
      g.fillRect(px + 14, py, 2, 14);
      g.fillRect(px + 4, py + 16, 2, 16);
      break;
    case "water":
      g.fillStyle(detail, 0.8);
      g.fillRect(px + 4, py + 8, 12, 3);
      g.fillRect(px + 16, py + 20, 10, 3);
      break;
    case "tree":
      g.fillStyle(TILE_COLORS.grass.base, 1);
      g.fillRect(px, py, TILE, TILE);
      g.fillStyle(detail, 1);
      g.fillRect(px + 13, py + 20, 6, 12);
      g.fillStyle(base, 1);
      g.fillCircle(px + 16, py + 14, 13);
      g.fillStyle(0x3f6446, 1);
      g.fillCircle(px + 11, py + 11, 6);
      break;
    case "flower":
      g.fillStyle(detail, 1);
      g.fillCircle(px + 10, py + 12, 3);
      g.fillCircle(px + 22, py + 20, 3);
      g.fillStyle(0xf1e6d0, 1);
      g.fillCircle(px + 16, py + 8, 2);
      break;
    case "hedge":
      g.fillStyle(detail, 1);
      g.fillRect(px + 2, py + 2, 12, 12);
      g.fillRect(px + 18, py + 16, 12, 12);
      break;
    case "bench":
      g.fillStyle(TILE_COLORS.path.base, 1);
      g.fillRect(px, py, TILE, TILE);
      g.fillStyle(base, 1);
      g.fillRect(px + 2, py + 12, 28, 8);
      g.fillStyle(detail, 1);
      g.fillRect(px + 2, py + 20, 4, 8);
      g.fillRect(px + 26, py + 20, 4, 8);
      break;
    case "lamp":
      g.fillStyle(TILE_COLORS.path.base, 1);
      g.fillRect(px, py, TILE, TILE);
      g.fillStyle(base, 1);
      g.fillRect(px + 14, py + 10, 4, 20);
      g.fillStyle(detail, 1);
      g.fillCircle(px + 16, py + 8, 6);
      break;
    case "sign":
    case "board":
      g.fillStyle(detail, 1);
      g.fillRect(px + 3, py + 4, 26, 16);
      g.fillStyle(base, 1);
      g.fillRect(px + 14, py + 20, 4, 10);
      g.lineStyle(2, base, 1);
      g.strokeRect(px + 3, py + 4, 26, 16);
      break;
    case "fountain":
      g.fillStyle(detail, 0.6);
      g.fillCircle(px + 16, py + 16, 10);
      break;
    case "buildingWall":
      g.fillStyle(detail, 1);
      g.fillRect(px, py + 15, TILE, 2);
      g.fillRect(px + 15, py, 2, TILE);
      break;
    case "buildingRoof":
      g.fillStyle(detail, 1);
      g.fillRect(px, py + 22, TILE, 10);
      break;
    case "window":
      g.fillStyle(TILE_COLORS.buildingWall.base, 1);
      g.fillRect(px, py, TILE, TILE);
      g.fillStyle(base, 1);
      g.fillRect(px + 5, py + 6, 22, 20);
      g.fillStyle(detail, 1);
      g.fillRect(px + 15, py + 6, 2, 20);
      break;
    case "door":
      g.fillStyle(base, 1);
      g.fillRect(px + 4, py + 2, 24, 30);
      g.fillStyle(detail, 1);
      g.fillCircle(px + 23, py + 18, 2);
      break;
    case "floor":
    case "floorAlt":
      g.lineStyle(1, detail, 0.7);
      g.strokeRect(px + 0.5, py + 0.5, TILE - 1, TILE - 1);
      break;
    case "rug":
      g.fillStyle(detail, 1);
      g.fillRect(px + 3, py + 3, TILE - 6, TILE - 6);
      break;
    case "desk":
    case "table":
    case "counter":
      g.fillStyle(TILE_COLORS.floor.base, 1);
      g.fillRect(px, py, TILE, TILE);
      g.fillStyle(base, 1);
      g.fillRect(px + 1, py + 6, 30, 20);
      g.fillStyle(detail, 1);
      g.fillRect(px + 1, py + 6, 30, 4);
      break;
    case "chair":
      g.fillStyle(TILE_COLORS.floor.base, 1);
      g.fillRect(px, py, TILE, TILE);
      g.fillStyle(base, 1);
      g.fillRect(px + 8, py + 10, 16, 14);
      g.fillStyle(detail, 1);
      g.fillRect(px + 8, py + 6, 16, 4);
      break;
    case "shelf":
      g.fillStyle(base, 1);
      g.fillRect(px + 1, py + 1, 30, 30);
      g.fillStyle(detail, 1);
      for (let i = 0; i < 3; i++) g.fillRect(px + 3, py + 4 + i * 9, 26, 5);
      break;
    case "computer":
      g.fillStyle(TILE_COLORS.floor.base, 1);
      g.fillRect(px, py, TILE, TILE);
      g.fillStyle(base, 1);
      g.fillRect(px + 6, py + 6, 20, 16);
      g.fillStyle(detail, 1);
      g.fillRect(px + 8, py + 8, 16, 12);
      break;
    case "bed":
      g.fillStyle(base, 1);
      g.fillRect(px + 2, py + 2, 28, 28);
      g.fillStyle(detail, 1);
      g.fillRect(px + 4, py + 4, 24, 10);
      break;
    case "plant":
      g.fillStyle(TILE_COLORS.floor.base, 1);
      g.fillRect(px, py, TILE, TILE);
      g.fillStyle(base, 1);
      g.fillRect(px + 10, py + 20, 12, 10);
      g.fillStyle(detail, 1);
      g.fillCircle(px + 16, py + 14, 9);
      break;
    case "wall":
      g.fillStyle(detail, 1);
      g.fillRect(px, py + 12, TILE, 3);
      g.fillRect(px, py + 26, TILE, 3);
      break;
    default:
      break;
  }
}

export class CampusScene extends Phaser.Scene {
  private zone!: ZoneMap;
  private player!: CharacterContainer;
  private vx = 0;
  private vy = 0;
  private facing: Direction = "down";
  private doorCooldown = 0;
  /** Doors re-arm only after the player has stepped clear of the trigger. */
  private doorArmed = false;
  private motionUnsub?: (() => void) | undefined;
  private mascotUnsub?: (() => void) | undefined;
  private mascotBadge?: Phaser.GameObjects.Rectangle | undefined;

  /** Draw (or clear) the single accessory badge above the player's head. */
  private applyMascotAccessory(id: string) {
    this.mascotBadge?.destroy();
    this.mascotBadge = undefined;
    const accessory = mascotAccessoryOf(id);
    if (accessory.id === "none" || !this.player) return;
    const badge = this.add
      .rectangle(0, -22, 14, 4, accessory.hex)
      .setStrokeStyle(1, 0x2b1e18, 0.5);
    this.player.add(badge);
    this.mascotBadge = badge;
  }

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private npcs: NpcSprite[] = [];
  private stepPhase = 0;
  private lastPromptId: string | null = null;
  private lastRoomId: string | null = null;
  /** Last tile/facing published to the store — avoids per-frame React updates. */
  private lastSentTx = -1;
  private lastSentTy = -1;
  private lastSentFacing: Direction | null = null;
  /** Throttle accumulator for prompt/room scans. */
  private scanTimer = 0;
  /** Characters already parked in their idle pose (skip redundant writes). */
  private idleParked = new WeakSet<object>();
  /** Interior prop streaming: placements are baked once, sprites come and go. */
  private decorPlacements: DecorPlacement[] = [];
  private decorSprites = new Map<number, Phaser.GameObjects.Image>();
  private decorStreamed = false;
  private decorTimer = 0;
  private debugGraphics?: Phaser.GameObjects.Graphics | undefined;
  private debugOn = false;
  /** Profiling counters surfaced by the campus performance overlay. */
  private perfSpikes = 0;
  private perfWorst = 0;
  private perfFrames = 0;
  private perfTotal = 0;
  private perfSpawns = 0;
  private perfDestroys = 0;

  /** Snapshot for the on-screen profiler: streaming + frame-time health. */
  perfStats() {
    const avg = this.perfFrames ? this.perfTotal / this.perfFrames : 0;
    return {
      zone: this.zone?.id ?? "—",
      streaming: this.decorStreamed,
      placements: this.decorPlacements.length,
      liveProps: this.decorSprites.size,
      propSpawns: this.perfSpawns,
      propRecycles: this.perfDestroys,
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
    this.perfSpawns = 0;
    this.perfDestroys = 0;
  }
  joystick: { x: number; y: number } = { x: 0, y: 0 };

  constructor() {
    super("campus");
  }

  preload() {
    if (!this.textures.exists(TILESET_KEY)) this.load.image(TILESET_KEY, TILESET_URL);
    if (!this.textures.exists(DECOR_KEY)) this.load.image(DECOR_KEY, DECOR_URL);
    if (!this.textures.exists(INTERIOR_KEY)) this.load.image(INTERIOR_KEY, INTERIOR_URL);
    if (!this.textures.exists(ITEMS_KEY)) this.load.image(ITEMS_KEY, ITEMS_URL);
  }

  /**
   * Bakes an interior floor/wall layer from the pixel interior sheet, so rooms
   * read as boarded floors and brick walls instead of flat colour blocks.
   */
  private bakeInterior(zone: ZoneMap): string | null {
    if (!this.textures.exists(INTERIOR_KEY)) return null;
    const key = `interior-${zone.id}`;
    if (this.textures.exists(key)) return key;
    const src = this.textures.get(INTERIOR_KEY).getSourceImage() as HTMLImageElement;
    const tex = this.textures.createCanvas(key, zone.width * TILE, zone.height * TILE);
    if (!tex) return null;
    const ctx = tex.context;
    ctx.imageSmoothingEnabled = false;
    let painted = false;

    for (let y = 0; y < zone.height; y++) {
      for (let x = 0; x < zone.width; x++) {
        const kind = zone.tiles[y]![x]!;
        const frames = INTERIOR_GROUND[kind];
        if (!frames?.length) continue;
        const f = pickVariant(frames, x, y);
        ctx.drawImage(
          src,
          f.x,
          f.y,
          INT_SRC,
          INT_SRC,
          x * TILE,
          y * TILE,
          INT_SRC * INT_SCALE,
          INT_SRC * INT_SCALE,
        );
        painted = true;
      }
    }
    tex.refresh();
    if (!painted) {
      this.textures.remove(key);
      return null;
    }
    return key;
  }

  /** Draws the furniture sprites that sit on furnished interior tiles. */
  private addInteriorProps(zone: ZoneMap) {
    if (!this.textures.exists(INTERIOR_KEY) || !this.textures.exists(ITEMS_KEY)) return;
    for (let y = 0; y < zone.height; y++) {
      for (let x = 0; x < zone.width; x++) {
        const kind = zone.tiles[y]![x]!;
        const options = INTERIOR_PROPS[kind];
        if (!options?.length) continue;
        const prop = pickVariant(options, x, y);
        const key = prop.sheet === "items" ? ITEMS_KEY : INTERIOR_KEY;
        const [sx, sy, sw, sh] = prop.rect;
        const frame = `${prop.sheet}-${sx}-${sy}-${sw}-${sh}`;
        const texture = this.textures.get(key);
        if (!texture.has(frame)) texture.add(frame, 0, sx, sy, sw, sh);
        const width = prop.tiles * TILE;
        const image = this.add
          .image(x * TILE + TILE / 2, (y + 1) * TILE + 2, key, frame)
          .setOrigin(0.5, 1)
          .setDisplaySize(width, (width / sw) * sh)
          .setDepth(kind === "rug" ? 0 : 4);
        if (kind === "rug") image.setDepth(0);
      }
    }
  }

  /**
   * Scatters pixel-art environment props across the outdoor grounds. Props are
   * decoration only — they sit above the ground bake and below the cast.
   */
  private addDecor(zone: ZoneMap) {
    if (!this.textures.exists(DECOR_KEY)) return;
    this.decorPlacements = decorFor(zone);
    this.decorSprites.clear();
    // Furnished interiors can hold hundreds of props; stream only the ones
    // near the player (current room + adjacent doors) and recycle the rest.
    this.decorStreamed = zone.kind === "interior";
    // Streaming waits for the player: the first pass runs from their spawn.
    if (this.decorStreamed) return;
    this.decorPlacements.forEach((_, index) => this.spawnDecor(index));
  }

  private spawnDecor(index: number) {
    const placement = this.decorPlacements[index];
    if (!placement || this.decorSprites.has(index)) return;
    const texture = this.textures.get(DECOR_KEY);
    const rect = frameRect(placement.frame);
    if (!rect) return;
    if (!texture.has(placement.frame)) {
      texture.add(placement.frame, 0, rect[0], rect[1], rect[2], rect[3]);
    }
    const image = this.add
      .image(placement.px, placement.py, DECOR_KEY, placement.frame)
      .setOrigin(0.5, 1)
      .setScale(placement.scale)
      .setDepth(5);
    this.decorSprites.set(index, image);
    this.perfSpawns += 1;
  }

  /** Creates props inside the stream radius and destroys those well outside. */
  private streamDecor(force = false) {
    if (!this.decorStreamed || !this.textures.exists(DECOR_KEY)) return;
    const px = this.player?.x ?? this.cameras.main.scrollX;
    const py = this.player?.y ?? this.cameras.main.scrollY;
    const inner = 15 * TILE;
    const outer = 21 * TILE;
    this.decorPlacements.forEach((placement, index) => {
      const d = Math.hypot(placement.px - px, placement.py - py);
      const live = this.decorSprites.get(index);
      if (d <= inner) {
        if (!live) this.spawnDecor(index);
      } else if (live && (force || d > outer)) {
        live.destroy();
        this.decorSprites.delete(index);
        this.perfDestroys += 1;
      }
    });
  }

  /** Debug overlay: red = blocked tile, amber = interactable, cyan = doorway. */
  setCollisionDebug(on: boolean) {
    this.debugOn = on;
    if (!on) {
      this.debugGraphics?.destroy();
      this.debugGraphics = undefined;
      return;
    }
    const g = this.debugGraphics ?? this.add.graphics().setDepth(40);
    this.debugGraphics = g;
    g.clear();
    for (let y = 0; y < this.zone.height; y++) {
      for (let x = 0; x < this.zone.width; x++) {
        if (isWalkableTile(this.zone, x, y)) continue;
        g.fillStyle(0xff3b30, 0.28);
        g.fillRect(x * TILE, y * TILE, TILE, TILE);
        g.lineStyle(1, 0xff3b30, 0.5);
        g.strokeRect(x * TILE + 0.5, y * TILE + 0.5, TILE - 1, TILE - 1);
      }
    }
    for (const i of this.zone.interactables) {
      const cyan = i.action.kind === "travel";
      g.lineStyle(2, cyan ? 0x35d0ff : 0xd9a441, 0.9);
      g.strokeRect(i.x * TILE + 2, i.y * TILE + 2, TILE - 4, TILE - 4);
    }
    // Anything the reachability pass cannot walk to is ringed in magenta.
    for (const bad of reachabilityReport(this.zone).unreachable) {
      g.lineStyle(2, 0xff00ff, 1);
      g.strokeRect(bad.x * TILE - 2, bad.y * TILE - 2, TILE + 4, TILE + 4);
    }
  }

  collisionDebugEnabled() {
    return this.debugOn;
  }

  /** Reachability audit for the current zone, used by tests and the overlay. */
  reachability() {
    return reachabilityReport(this.zone);
  }

  /**
   * Bakes the whole outdoor ground layer into one canvas texture by blitting
   * 16px source tiles at x2. Returns the texture key, or null when unavailable.
   */
  private bakeGround(zone: ZoneMap): string | null {
    if (!this.textures.exists(TILESET_KEY)) return null;
    const key = `ground-${zone.id}`;
    if (this.textures.exists(key)) return key;
    const src = this.textures.get(TILESET_KEY).getSourceImage() as HTMLImageElement;
    const tex = this.textures.createCanvas(key, zone.width * TILE, zone.height * TILE);
    if (!tex) return null;
    const ctx = tex.context;
    ctx.imageSmoothingEnabled = false;
    let painted = false;

    const blit = (frame: { x: number; y: number }, px: number, py: number) => {
      ctx.drawImage(src, frame.x, frame.y, SRC_TILE, SRC_TILE, px, py, SRC_TILE * SCALE, SRC_TILE * SCALE);
    };

    for (let y = 0; y < zone.height; y++) {
      for (let x = 0; x < zone.width; x++) {
        const kind = zone.tiles[y]![x]!;
        const frames = TILE_FRAMES[kind];
        if (!frames || !frames.length) continue;
        if (OVERLAY_TILES.has(kind)) {
          const bed = TILE_FRAMES.grass!;
          blit(bed[variantFor(x, y, bed.length)]!, x * TILE, y * TILE);
        }
        blit(frames[variantFor(x, y, frames.length)]!, x * TILE, y * TILE);
        painted = true;
      }
    }
    tex.refresh();
    if (!painted) {
      this.textures.remove(key);
      return null;
    }
    return key;
  }

  create(data: { zoneId: string; x: number; y: number }) {
    this.zone = getZone(data.zoneId);
    this.cameras.main.setBackgroundColor(this.zone.kind === "outdoor" ? "#5d7047" : "#cbb894");

    const groundKey = this.zone.kind === "outdoor" ? this.bakeGround(this.zone) : null;

    const g = this.add.graphics();
    for (let y = 0; y < this.zone.height; y++) {
      for (let x = 0; x < this.zone.width; x++) {
        const kind = this.zone.tiles[y]![x]!;
        if (groundKey && TILE_FRAMES[kind]?.length) continue;
        paintTile(g, kind, x * TILE, y * TILE);
      }
    }
    g.setDepth(0);
    if (groundKey) this.add.image(0, 0, groundKey).setOrigin(0, 0).setDepth(-1);

    this.addDecor(this.zone);

    // room labels
    this.zone.rooms.forEach((room) => {
      this.add
        .text(room.x * TILE + 8, room.y * TILE + 6, room.name.toUpperCase(), {
          fontFamily: "monospace",
          fontSize: "11px",
          color: "#5a2429",
        })
        .setDepth(1);
    });

    // interactable markers
    this.zone.interactables.forEach((i) => {
      const marker = this.add.graphics().setDepth(1);
      marker.fillStyle(0xd9a441, 0.85);
      marker.fillCircle(i.x * TILE + 16, i.y * TILE + 16, 4);
    });

    // NPCs
    this.npcs = this.zone.npcs.map((spawn) => ({
      spawn,
      container: this.makeCharacter(
        spawn.x * TILE + 16,
        spawn.y * TILE + 16,
        npcPalette(spawn.id, spawn.role),
        spawn.name.split(" ")[0]!,
      ),
      homeX: spawn.x * TILE + 16,
      homeY: spawn.y * TILE + 16,
      dir: 1,
      timer: 0,
    }));

    // Personalization: the student's mascot colour tints their sprite, and the
    // accessory slot adds a small badge above the head.
    const mascot = currentMascot();
    this.player = this.makeCharacter(
      data.x * TILE + 16,
      data.y * TILE + 16,
      { cloth: mascotColorOf(mascot.color).hex, hair: 0x4a3324, skin: 0xe8c9a0 },
      "You",
    );
    this.applyMascotAccessory(mascot.accessory);
    this.mascotUnsub?.();
    this.mascotUnsub = useMascotStore.subscribe((s) => {
      if (!this.player) return;
      const cloth = mascotColorOf(s.mascot.color).hex;
      const parts = this.player.parts;
      parts.body.setFillStyle(cloth);
      parts.armL.setFillStyle(cloth);
      parts.armR.setFillStyle(cloth);
      this.applyMascotAccessory(s.mascot.accessory);
    });
    this.vx = 0;
    this.vy = 0;
    // Spawning inside a blocked tile would trap the player: nudge to the
    // nearest walkable tile before the first frame.
    if (!this.canStand(this.player.x, this.player.y)) {
      const spot = this.nearestWalkable(data.x, data.y);
      this.player.setPosition(spot.x * TILE + 16, spot.y * TILE + 16);
    }
    this.streamDecor(true);
    // Doors we spawn on should not immediately fire a transition back.
    this.doorCooldown = 500;
    this.doorArmed = false;

    const cam = this.cameras.main;
    cam.setBounds(0, 0, this.zone.width * TILE, this.zone.height * TILE);
    cam.setZoom(this.scale.width < 720 ? 1.5 : 1.8);
    cam.setRoundPixels(true);
    const lerp = cameraLerp();
    cam.startFollow(this.player, true, lerp, lerp);
    cam.setDeadzone(48, 36);
    cam.setLerp(lerp, lerp);
    // Live-apply the accessibility motion setting without needing a reload.
    this.motionUnsub?.();
    this.motionUnsub = useMotionStore.subscribe((s) => {
      const l = cameraLerp(s.setting);
      this.cameras.main.setLerp(l, l);
    });
    this.events.once("shutdown", () => {
      this.motionUnsub?.();
      this.motionUnsub = undefined;
      this.mascotUnsub?.();
      this.mascotUnsub = undefined;
      this.mascotBadge = undefined;
      this.decorSprites.forEach((sprite) => sprite.destroy());
      this.decorSprites.clear();
      this.decorPlacements = [];
      this.debugGraphics?.destroy();
      this.debugGraphics = undefined;
    });


    const kb = this.input.keyboard!;
    this.cursors = kb.createCursorKeys();
    this.keys = kb.addKeys("W,A,S,D,E,M,C") as Record<string, Phaser.Input.Keyboard.Key>;
    this.keys["E"]!.on("down", () => this.interact());
    this.keys["M"]!.on("down", () => useCampusStore.getState().setMapOpen(true));
    // Collision overlay is a dev tool: never reachable in a production run.
    this.keys["C"]!.on("down", () => {
      if (!debugEnabled()) return;
      this.setCollisionDebug(!this.debugOn);
    });

    useCampusStore.getState().setZone(this.zone.id);
    useCampusStore
      .getState()
      .setPlayer(Math.round(this.player.x / TILE), Math.round(this.player.y / TILE), this.facing);
  }

  private makeCharacter(x: number, y: number, palette: NpcPalette, label: string) {
    const color = palette.cloth;
    const shadow = this.add.ellipse(0, 12, 20, 8, 0x000000, 0.18);
    const legL = this.add.rectangle(-4, 10, 5, 8, 0x3b2c22);
    const legR = this.add.rectangle(4, 10, 5, 8, 0x3b2c22);
    const armL = this.add.rectangle(-9, 0, 4, 12, color).setStrokeStyle(1, 0x2b1e18, 0.4);
    const armR = this.add.rectangle(9, 0, 4, 12, color).setStrokeStyle(1, 0x2b1e18, 0.4);
    const body = this.add.rectangle(0, 0, 16, 20, color).setStrokeStyle(1, 0x2b1e18, 0.5);
    const head = this.add.circle(0, -14, 7, palette.skin).setStrokeStyle(1, 0x2b1e18, 0.4);
    const hair = this.add.rectangle(0, -19, 14, 5, palette.hair);
    const face = this.add.rectangle(0, -13, 8, 3, 0x2b1e18, 0.55);
    const name = this.add
      .text(0, -34, label, { fontFamily: "monospace", fontSize: "10px", color: "#f1e6d0" })
      .setOrigin(0.5)
      .setPadding(3, 1, 3, 1)
      .setBackgroundColor("#6d2f34aa");
    const c = this.add.container(x, y, [shadow, legL, legR, armL, armR, body, head, hair, face, name]);
    c.setDepth(10);
    (c as CharacterContainer).parts = { shadow, legL, legR, armL, armR, body, head, hair, face };
    return c as CharacterContainer;
  }

  /**
   * Directional walk cycle: swinging legs and arms, a small body bob and a
   * face marker that turns with the movement direction.
   */
  private animateCharacter(c: CharacterContainer, dir: Direction, phase: number, moving: boolean) {
    const p = c.parts;
    // Accessibility: reduced motion damps (or removes) the walk bob and swing.
    const amp = bobScale();
    const animated = moving && amp > 0;
    // A still character (or motion "off") only needs its idle pose written once
    // instead of the same values 60 times a second.
    if (!animated) {
      if (this.idleParked.has(c) && this.lastSentFacing === dir) return;
      this.idleParked.add(c);
    } else {
      this.idleParked.delete(c);
    }
    const swing = animated ? Math.sin(phase) * amp : 0;
    const bob = animated ? Math.abs(Math.cos(phase)) * -1.2 * amp : 0;
    p.legL.y = 10 + swing * 2;
    p.legR.y = 10 - swing * 2;
    p.armL.y = swing * 2.5;
    p.armR.y = -swing * 2.5;
    p.body.y = bob;
    p.head.y = -14 + bob;
    p.hair.y = p.head.y - 5;

    const sideways = dir === "left" || dir === "right";
    p.armL.setVisible(!sideways);
    p.armR.setVisible(!sideways || dir === "right");
    p.face.setVisible(dir !== "up");
    p.face.x = dir === "left" ? -2 : dir === "right" ? 2 : 0;
    p.face.y = p.head.y + 1;
    p.hair.height = dir === "up" ? 9 : 5;
  }


  private canStand(px: number, py: number) {
    return canStandBox(this.zone, px, py);
  }


  private nearestInteraction() {
    const px = this.player.x / TILE;
    const py = this.player.y / TILE;
    let best: { dist: number; kind: "object" | "npc"; index: number } | null = null;
    this.zone.interactables.forEach((i, index) => {
      const d = Math.hypot(i.x + 0.5 - px, i.y + 0.5 - py);
      if (d < interactRadius("object") && (!best || d < best.dist))
        best = { dist: d, kind: "object", index };
    });
    this.npcs.forEach((n, index) => {
      const d = Math.hypot(n.container.x / TILE - px, n.container.y / TILE - py);
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
    if (hit.kind === "object") {
      const target = this.zone.interactables[hit.index]!;
      this.game.events.emit("unify-interact", target.action, target.label);
    } else {
      const npc = this.npcs[hit.index]!.spawn;
      this.game.events.emit("unify-talk", npc);
    }
  }

  /** Breadth-first search for the closest walkable tile to a spawn point. */
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

  /**
   * Door trigger: standing on (or right beside) a travel interactable fades
   * into the next zone without needing an explicit key press.
   */
  private checkDoorTrigger(delta: number) {
    if (this.doorCooldown > 0) {
      this.doorCooldown -= delta;
      return;
    }
    const px = this.player.x / TILE;
    const py = this.player.y / TILE;
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
    this.game.events.emit("unify-door", nearest.i.action, nearest.i.label);
  }

  override update(_time: number, delta: number) {
    // Frame-time profiling (a "spike" is any frame over ~33ms / 30fps).
    this.perfFrames += 1;
    this.perfTotal += delta;
    if (delta > this.perfWorst) this.perfWorst = delta;
    if (delta > 33) this.perfSpikes += 1;
    if (this.perfFrames > 600) {
      this.perfFrames = 1;
      this.perfTotal = delta;
    }
    const store = useCampusStore.getState();
    const blocked = !!(store.dialogue || store.reading || store.lessonOpen || store.mapOpen);
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
    const len = Math.hypot(ix, iy);
    if (len > 1) {
      ix /= len;
      iy /= len;
    }

    // Accelerate toward the desired velocity, decelerate to a stop.
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
    const nx = this.player.x + this.vx * dt;
    if (this.canStand(nx, this.player.y)) this.player.x = nx;
    else this.vx = 0;
    const ny = this.player.y + this.vy * dt;
    if (this.canStand(this.player.x, ny)) this.player.y = ny;
    else this.vy = 0;

    const speed = Math.hypot(this.vx, this.vy);
    const moving = speed > 6;
    if (moving) {
      this.facing =
        Math.abs(this.vx) > Math.abs(this.vy)
          ? this.vx > 0
            ? "right"
            : "left"
          : this.vy > 0
            ? "down"
            : "up";
      this.stepPhase += (delta / 1000) * (4 + (speed / SPEED) * 7);
    } else {
      this.stepPhase = 0;
    }
    this.animateCharacter(this.player, this.facing, this.stepPhase, moving);
    if (moving) {
      // Only publish to the React store when the tile or facing actually
      // changes; a per-frame store write re-rendered the HUD 60x/sec.
      const ptx = Math.round(this.player.x / TILE);
      const pty = Math.round(this.player.y / TILE);
      if (ptx !== this.lastSentTx || pty !== this.lastSentTy || this.facing !== this.lastSentFacing) {
        this.lastSentTx = ptx;
        this.lastSentTy = pty;
        this.lastSentFacing = this.facing;
        store.setPlayer(ptx, pty, this.facing);
      }
      this.checkDoorTrigger(delta);
    } else if (this.doorCooldown > 0) {
      this.doorCooldown -= delta;
    }

    // NPC behaviour — skip anyone the camera cannot see, and skip decorative
    // idle motion entirely when reduced motion is on.
    const view = this.cameras.main.worldView;
    const idleMotion = bobScale() > 0;
    this.npcs.forEach((n) => {
      n.timer += delta;
      const c = n.container;
      if (
        c.x < view.x - 64 ||
        c.x > view.right + 64 ||
        c.y < view.y - 64 ||
        c.y > view.bottom + 64
      )
        return;
      if (n.spawn.behavior === "walk") {
        const targetX = idleMotion ? n.homeX + Math.sin(n.timer / 1400) * 48 : n.homeX;
        const walking = idleMotion && this.canStand(targetX, c.y);
        if (walking) c.x = targetX;
        this.animateCharacter(
          c,
          Math.cos(n.timer / 1400) > 0 ? "right" : "left",
          n.timer / 130,
          walking,
        );
      } else if (n.spawn.behavior === "study" || n.spawn.behavior === "read") {
        if (idleMotion) c.y = n.homeY + Math.sin(n.timer / 600) * 1.2;
        this.animateCharacter(c, "down", 0, false);
      }
    });



    // Interior prop streaming runs on a timer, not every frame.
    if (this.decorStreamed) {
      this.decorTimer += delta;
      if (this.decorTimer > 140) {
        this.decorTimer = 0;
        this.streamDecor();
      }
    }

    // prompt + room tracking — scanning every interactable, NPC and room on
    // every frame was pure overhead; 100ms is well below human reaction time.
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
    } else if (this.lastPromptId) {
      this.lastPromptId = null;
      store.setPrompt(undefined);
    }

    const tx = this.player.x / TILE;
    const ty = this.player.y / TILE;
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
