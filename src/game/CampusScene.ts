import Phaser from "phaser";
import { TILE, type TileKind } from "@/lib/campus/tiles";
import { drawTile } from "@/lib/campus/tileart";
import { paintTheme, themeKey } from "@/lib/campus/themes";
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
import { canStandBox } from "@/lib/campus/walkable";
import { interactRadius, doorTriggerRadius } from "@/lib/a11y/assist";
import { useCampusStore } from "@/lib/campus/store";
import { debugEnabled } from "@/lib/debug";
import { bobScale, cameraLerp, useMotionStore } from "@/lib/a11y/motion";
import { currentMascot, mascotAccessoryOf, mascotColorOf, useMascotStore } from "@/lib/mascot";
import { isWalkableTile, reachabilityReport } from "@/lib/campus/walkable";
import {
  ensureCharacterAnims,
  ensureCharacterTexture,
  idleFrame,
  lookFor,
  type CharacterLook,
  type SpriteDirection,
} from "@/lib/campus/charart";

const SPEED = 168;
/** Pixels/sec^2 used to ease into and out of a walk so movement is not snappy. */
const ACCEL = 1400;
const FRICTION = 1900;
/** How close (in px) the player must get to a tapped point before stopping. */
const TAP_ARRIVE = 6;

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
  private mascotUnsub?: (() => void) | undefined;
  private styleUnsub?: (() => void) | undefined;
  private groundImage?: Phaser.GameObjects.Image | undefined;

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
  private debugOn = false;
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
      placements: 0,
      liveProps: 0,
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
    const key = `zone-iso-${zone.id}-${themeKey(theme)}`;
    if (this.textures.exists(key)) return key;
    const size = isoCanvasSize(zone.width, zone.height);
    const tex = this.textures.createCanvas(key, size.width, size.height);
    if (!tex) return null;
    const ctx = tex.context;
    ctx.imageSmoothingEnabled = false;

    // Each tile is painted flat by the existing 2D tile art, then mapped onto
    // its diamond footprint with a 2:1 isometric matrix.
    const scratch = document.createElement("canvas");
    scratch.width = TILE;
    scratch.height = TILE;
    const sctx = scratch.getContext("2d");
    if (!sctx) return null;
    sctx.imageSmoothingEnabled = false;

    for (let y = 0; y < zone.height; y++) {
      for (let x = 0; x < zone.width; x++) {
        sctx.setTransform(1, 0, 0, 1, 0, 0);
        sctx.clearRect(0, 0, TILE, TILE);
        sctx.translate(-x * TILE, -y * TILE);
        drawTile(sctx, zone.tiles[y]![x]! as TileKind, x, y, theme);
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

  /** Debug overlay: red = blocked tile, amber = interactable, cyan = doorway. */
  setCollisionDebug(on: boolean) {
    this.debugOn = on;
    if (!on) {
      this.debugGraphics?.destroy();
      this.debugGraphics = undefined;
      return;
    }
    const g = this.debugGraphics ?? this.add.graphics().setDepth(4000);
    this.debugGraphics = g;
    g.clear();
    const poly = (x: number, y: number, inset = 0) => {
      const p = this.diamondPoints(x, y, inset);
      return new Phaser.Geom.Polygon(p);
    };
    for (let y = 0; y < this.zone.height; y++) {
      for (let x = 0; x < this.zone.width; x++) {
        if (isWalkableTile(this.zone, x, y)) continue;
        g.fillStyle(0xff3b30, 0.28);
        g.fillPoints(poly(x, y).points, true);
      }
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

  collisionDebugEnabled() {
    return this.debugOn;
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

  create(data: { zoneId: string; x: number; y: number }) {
    this.zone = getZone(data.zoneId);
    this.cameras.main.setBackgroundColor(this.zone.kind === "outdoor" ? "#7ec850" : "#fff0d2");

    const drawGround = (style = visualStyle()) => {
      const groundKey = this.bakeZone(this.zone, style);
      if (!groundKey) return;
      this.groundImage?.destroy();
      this.groundImage = this.add.image(0, 0, groundKey).setOrigin(0, 0).setDepth(-1);
    };
    drawGround();
    this.styleUnsub?.();
    this.styleUnsub = useStyleStore.subscribe((s) => {
      this.cameras.main.setBackgroundColor(this.zone.kind === "outdoor" ? (s.style === "focus" ? "#6eaa58" : "#7ec850") : (s.style === "focus" ? "#e6dfc7" : "#fff0d2"));
      drawGround(s.style);
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
        .setDepth(5);
    });

    // Interaction markers.
    this.interactionMarkers.clear();
    this.zone.interactables.forEach((i) => {
      const at = isoFromTile(i.x + 0.5, i.y + 0.5, this.zone.height);
      const marker = this.add.graphics().setDepth(at.y + 1);
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
      return {
        ...actor,
        spawn,
        homeX: spawn.x * TILE + 16,
        homeY: spawn.y * TILE + 16,
        timer: 0,
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
      if (!this.player) return;
      const key = this.playerTextureKey(s.mascot.color);
      ensureCharacterTexture(this, key, this.playerLook(s.mascot.color));
      ensureCharacterAnims(this, key);
      this.player.key = key;
      this.player.sprite.setTexture(key, idleFrame(this.facing));
      this.applyMascotAccessory(s.mascot.accessory);
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

    this.setupPointerWalk();

    this.events.once("shutdown", () => {
      this.motionUnsub?.();
      this.motionUnsub = undefined;
      this.mascotUnsub?.();
      this.mascotUnsub = undefined;
      this.styleUnsub?.();
      this.styleUnsub = undefined;
      this.groundImage = undefined;
      this.debugGraphics?.destroy();
      this.debugGraphics = undefined;
      this.tapMarker?.destroy();
      this.tapMarker = undefined;
      this.input.off("pointerdown");
      this.input.off("pointermove");
    });

    const kb = this.input.keyboard!;
    this.cursors = kb.createCursorKeys();
    this.keys = kb.addKeys("W,A,S,D,E,M,C") as Record<string, Phaser.Input.Keyboard.Key>;
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

  private setupPointerWalk() {
    const toTarget = (pointer: Phaser.Input.Pointer) => {
      const s = useCampusStore.getState();
      if (s.dialogue || s.reading || s.lessonOpen || s.mapOpen || s.transition) return;
      const world = worldFromIso(pointer.worldX, pointer.worldY, this.zone.height);
      this.moveTarget = world;
      this.showTapMarker(pointer.worldX, pointer.worldY);
    };
    this.input.on("pointerdown", toTarget);
    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      if (pointer.isDown) toTarget(pointer);
    });
  }

  private showTapMarker(x: number, y: number) {
    this.tapMarker?.destroy();
    const g = this.add.graphics().setDepth(3000);
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
    return `player-${color}`;
  }

  private playerLook(color: string): CharacterLook {
    const base = lookFor("unify-player", "student");
    return { ...base, shirt: mascotColorOf(color).hex };
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
      .setDepth(at.y + 10);
    const text = this.add
      .text(at.x, at.y - 34, label, { fontFamily: "monospace", fontSize: "10px", color: "#fff3d8" })
      .setOrigin(0.5)
      .setPadding(3, 1, 3, 1)
      .setBackgroundColor("#3a241caa")
      .setDepth(at.y + 11);
    return { sprite, label: text, key, dir: "down", moving: false, px, py };
  }

  /** Moves an actor in cartesian space and re-projects everything it owns. */
  private setActorPosition(actor: Actor, px: number, py: number) {
    actor.px = px;
    actor.py = py;
    const at = this.iso(px, py);
    actor.sprite.setPosition(at.x, at.y);
    actor.sprite.setDepth(at.y + 10);
    actor.label.setPosition(at.x, at.y - 34);
    actor.label.setDepth(at.y + 11);
    actor.badge?.setPosition(at.x, at.y - 24);
    actor.badge?.setDepth(at.y + 12);
  }

  private applyMascotAccessory(id: string) {
    this.player.badge?.destroy();
    this.player.badge = undefined;
    const accessory = mascotAccessoryOf(id);
    if (accessory.id === "none") return;
    const badge = this.add
      .rectangle(this.player.sprite.x, this.player.sprite.y - 24, 14, 4, accessory.hex)
      .setStrokeStyle(1, 0x241812, 0.8)
      .setDepth(this.player.sprite.y + 12);
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
