import Phaser from "phaser";
import { TILE, type TileKind } from "@/lib/campus/tiles";
import { drawTile } from "@/lib/campus/tileart";
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

interface Actor {
  sprite: Phaser.GameObjects.Sprite;
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

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private npcs: NpcActor[] = [];
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

  /** Bakes the whole zone into one canvas texture of original 32px tiles. */
  private bakeZone(zone: ZoneMap): string | null {
    const key = `zone-${zone.id}`;
    if (this.textures.exists(key)) return key;
    const tex = this.textures.createCanvas(key, zone.width * TILE, zone.height * TILE);
    if (!tex) return null;
    const ctx = tex.context;
    ctx.imageSmoothingEnabled = false;
    for (let y = 0; y < zone.height; y++) {
      for (let x = 0; x < zone.width; x++) {
        drawTile(ctx, zone.tiles[y]![x]! as TileKind, x, y);
      }
    }
    tex.refresh();
    return key;
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
      }
    }
    for (const i of this.zone.interactables) {
      const cyan = i.action.kind === "travel";
      g.lineStyle(2, cyan ? 0x35d0ff : 0xd9a441, 0.9);
      g.strokeRect(i.x * TILE + 2, i.y * TILE + 2, TILE - 4, TILE - 4);
    }
    for (const bad of reachabilityReport(this.zone).unreachable) {
      g.lineStyle(2, 0xff00ff, 1);
      g.strokeRect(bad.x * TILE - 2, bad.y * TILE - 2, TILE + 4, TILE + 4);
    }
  }

  collisionDebugEnabled() {
    return this.debugOn;
  }

  reachability() {
    return reachabilityReport(this.zone);
  }

  /* ---------------------------------------------------------------- *
   * Lifecycle
   * ---------------------------------------------------------------- */

  create(data: { zoneId: string; x: number; y: number }) {
    this.zone = getZone(data.zoneId);
    this.cameras.main.setBackgroundColor(this.zone.kind === "outdoor" ? "#7ec850" : "#fff0d2");

    const groundKey = this.bakeZone(this.zone);
    if (groundKey) this.add.image(0, 0, groundKey).setOrigin(0, 0).setDepth(-1);

    // Room signposts — chunky plaques the way an illustrated campus board reads.
    this.zone.rooms.forEach((room) => {
      this.add
        .text(room.x * TILE + 8, room.y * TILE + 4, room.name.toUpperCase(), {
          fontFamily: "monospace",
          fontStyle: "bold",
          fontSize: "11px",
          color: "#4a2a12",
          backgroundColor: "#fff3d8",
          padding: { x: 6, y: 3 },
        })
        .setStroke("#8a5730", 3)
        .setShadow(0, 2, "#00000055", 0, true, true)
        .setDepth(2);
    });

    // Interaction markers.
    this.zone.interactables.forEach((i) => {
      const marker = this.add.graphics().setDepth(1);
      marker.fillStyle(0x241812, 0.35);
      marker.fillCircle(i.x * TILE + 16, i.y * TILE + 18, 8);
      marker.fillStyle(0xffd54a, 1);
      marker.fillCircle(i.x * TILE + 16, i.y * TILE + 16, 6);
      marker.fillStyle(0xfff3d8, 1);
      marker.fillCircle(i.x * TILE + 14, i.y * TILE + 14, 2);
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
    if (!this.canStand(this.player.sprite.x, this.player.sprite.y)) {
      const spot = this.nearestWalkable(data.x, data.y);
      this.setActorPosition(this.player, spot.x * TILE + 16, spot.y * TILE + 16);
    }
    this.doorCooldown = 500;
    this.doorArmed = false;
    this.moveTarget = null;

    const cam = this.cameras.main;
    cam.setBounds(0, 0, this.zone.width * TILE, this.zone.height * TILE);
    cam.setZoom(this.scale.width < 720 ? 1.9 : 2.2);
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
        Math.round(this.player.sprite.x / TILE),
        Math.round(this.player.sprite.y / TILE),
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
      this.moveTarget = { x: pointer.worldX, y: pointer.worldY };
      this.showTapMarker(pointer.worldX, pointer.worldY);
    };
    this.input.on("pointerdown", toTarget);
    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      if (pointer.isDown) toTarget(pointer);
    });
  }

  private showTapMarker(x: number, y: number) {
    this.tapMarker?.destroy();
    const g = this.add.graphics().setDepth(9);
    g.lineStyle(2, 0xfff3d8, 0.95);
    g.strokeCircle(x, y, 9);
    g.lineStyle(2, 0xff6f52, 0.95);
    g.strokeCircle(x, y, 5);
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
    x: number,
    y: number,
    key: string,
    look: CharacterLook,
    label: string,
  ): Actor {
    ensureCharacterTexture(this, key, look);
    ensureCharacterAnims(this, key);
    const sprite = this.add
      .sprite(x, y, key, idleFrame("down"))
      .setOrigin(0.5, 0.72)
      .setDepth(10);
    const text = this.add
      .text(x, y - 28, label, { fontFamily: "monospace", fontSize: "10px", color: "#fff3d8" })
      .setOrigin(0.5)
      .setPadding(3, 1, 3, 1)
      .setBackgroundColor("#3a241caa")
      .setDepth(11);
    return { sprite, label: text, key, dir: "down", moving: false };
  }

  private setActorPosition(actor: Actor, x: number, y: number) {
    actor.sprite.setPosition(x, y);
    actor.label.setPosition(x, y - 28);
    actor.badge?.setPosition(x, y - 18);
  }

  private applyMascotAccessory(id: string) {
    this.player.badge?.destroy();
    this.player.badge = undefined;
    const accessory = mascotAccessoryOf(id);
    if (accessory.id === "none") return;
    const badge = this.add
      .rectangle(this.player.sprite.x, this.player.sprite.y - 18, 14, 4, accessory.hex)
      .setStrokeStyle(1, 0x241812, 0.8)
      .setDepth(12);
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
    const px = this.player.sprite.x / TILE;
    const py = this.player.sprite.y / TILE;
    let best: { dist: number; kind: "object" | "npc"; index: number } | null = null;
    this.zone.interactables.forEach((i, index) => {
      const d = Math.hypot(i.x + 0.5 - px, i.y + 0.5 - py);
      if (d < interactRadius("object") && (!best || d < best.dist))
        best = { dist: d, kind: "object", index };
    });
    this.npcs.forEach((n, index) => {
      const d = Math.hypot(n.sprite.x / TILE - px, n.sprite.y / TILE - py);
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
    const px = this.player.sprite.x / TILE;
    const py = this.player.sprite.y / TILE;
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

    // Any direct input cancels a tap-to-walk destination.
    if (ix !== 0 || iy !== 0) this.moveTarget = null;
    else if (this.moveTarget) {
      const dx = this.moveTarget.x - this.player.sprite.x;
      const dy = this.moveTarget.y - this.player.sprite.y;
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
    const nx = this.player.sprite.x + this.vx * dt;
    if (this.canStand(nx, this.player.sprite.y)) this.player.sprite.x = nx;
    else {
      this.vx = 0;
      blockedX = true;
    }
    const ny = this.player.sprite.y + this.vy * dt;
    if (this.canStand(this.player.sprite.x, ny)) this.player.sprite.y = ny;
    else {
      this.vy = 0;
      blockedY = true;
    }
    // Walking into a wall on the way to a tapped point: give up rather than
    // grinding against it forever.
    if (this.moveTarget && blockedX && blockedY) this.moveTarget = null;

    this.setActorPosition(this.player, this.player.sprite.x, this.player.sprite.y);

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
    }
    this.animate(this.player, this.facing, moving);

    if (moving) {
      const ptx = Math.round(this.player.sprite.x / TILE);
      const pty = Math.round(this.player.sprite.y / TILE);
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
      if (
        n.sprite.x < view.x - 64 ||
        n.sprite.x > view.right + 64 ||
        n.sprite.y < view.y - 64 ||
        n.sprite.y > view.bottom + 64
      )
        return;
      if (n.spawn.behavior === "walk") {
        const targetX = idleMotion ? n.homeX + Math.sin(n.timer / 1400) * 48 : n.homeX;
        const walking = idleMotion && this.canStand(targetX, n.sprite.y);
        if (walking) this.setActorPosition(n, targetX, n.sprite.y);
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
    } else if (this.lastPromptId) {
      this.lastPromptId = null;
      store.setPrompt(undefined);
    }

    const tx = this.player.sprite.x / TILE;
    const ty = this.player.sprite.y / TILE;
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
