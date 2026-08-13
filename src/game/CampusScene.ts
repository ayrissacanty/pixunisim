import Phaser from "phaser";
import { TILE, TILE_COLORS, type TileKind } from "@/lib/campus/tiles";
import { getZone, zoneIsSolidAt, type NpcSpawn, type ZoneMap } from "@/lib/campus/world";
import { useCampusStore } from "@/lib/campus/store";
import { DECOR_KEY, DECOR_URL, decorFor, frameRect } from "@/lib/campus/decor";
import {
  OVERLAY_TILES,
  SCALE,
  SRC_TILE,
  TILESET_KEY,
  TILESET_URL,
  TILE_FRAMES,
  variantFor,
} from "@/lib/campus/tileset";

const SPEED = 150;

interface NpcSprite {
  spawn: NpcSpawn;
  container: Phaser.GameObjects.Container;
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
  private player!: Phaser.GameObjects.Container;
  private playerBody!: Phaser.GameObjects.Rectangle;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private npcs: NpcSprite[] = [];
  private stepPhase = 0;
  private lastPromptId: string | null = null;
  private lastRoomId: string | null = null;
  joystick: { x: number; y: number } = { x: 0, y: 0 };

  constructor() {
    super("campus");
  }

  preload() {
    if (!this.textures.exists(TILESET_KEY)) this.load.image(TILESET_KEY, TILESET_URL);
    if (!this.textures.exists(DECOR_KEY)) this.load.image(DECOR_KEY, DECOR_URL);
  }

  /**
   * Scatters pixel-art environment props across the outdoor grounds. Props are
   * decoration only — they sit above the ground bake and below the cast.
   */
  private addDecor(zone: ZoneMap) {
    if (!this.textures.exists(DECOR_KEY)) return;
    const texture = this.textures.get(DECOR_KEY);
    for (const placement of decorFor(zone)) {
      const rect = frameRect(placement.frame);
      if (!rect) continue;
      if (!texture.has(placement.frame)) {
        texture.add(placement.frame, 0, rect[0], rect[1], rect[2], rect[3]);
      }
      this.add
        .image(placement.px, placement.py, DECOR_KEY, placement.frame)
        .setOrigin(0.5, 1)
        .setScale(placement.scale)
        .setDepth(5);
    }
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
        spawn.role.toLowerCase().includes("student") ? 0x5d7f96 : 0x6d2f34,
        spawn.name.split(" ")[0]!,
      ),
      homeX: spawn.x * TILE + 16,
      homeY: spawn.y * TILE + 16,
      dir: 1,
      timer: 0,
    }));

    this.player = this.makeCharacter(data.x * TILE + 16, data.y * TILE + 16, 0xa8543f, "You");
    this.playerBody = this.player.getAt(1) as Phaser.GameObjects.Rectangle;

    this.cameras.main.setBounds(0, 0, this.zone.width * TILE, this.zone.height * TILE);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.cameras.main.setZoom(this.scale.width < 720 ? 1.5 : 1.8);

    const kb = this.input.keyboard!;
    this.cursors = kb.createCursorKeys();
    this.keys = kb.addKeys("W,A,S,D,E,M") as Record<string, Phaser.Input.Keyboard.Key>;
    this.keys["E"]!.on("down", () => this.interact());
    this.keys["M"]!.on("down", () => useCampusStore.getState().setMapOpen(true));

    useCampusStore.getState().setZone(this.zone.id);
  }

  private makeCharacter(x: number, y: number, color: number, label: string) {
    const shadow = this.add.ellipse(0, 12, 20, 8, 0x000000, 0.18);
    const body = this.add.rectangle(0, 0, 16, 20, color).setStrokeStyle(1, 0x2b1e18, 0.5);
    const head = this.add.circle(0, -14, 7, 0xe8c9a0).setStrokeStyle(1, 0x2b1e18, 0.4);
    const hair = this.add.rectangle(0, -19, 14, 5, 0x4a3324);
    const name = this.add
      .text(0, -34, label, { fontFamily: "monospace", fontSize: "10px", color: "#f1e6d0" })
      .setOrigin(0.5)
      .setPadding(3, 1, 3, 1)
      .setBackgroundColor("#6d2f34aa");
    const c = this.add.container(x, y, [shadow, body, head, hair, name]);
    c.setDepth(10);
    return c;
  }

  private canStand(px: number, py: number) {
    const half = 7;
    const pts = [
      [px - half, py + 4],
      [px + half, py + 4],
      [px - half, py + 12],
      [px + half, py + 12],
    ] as const;
    return pts.every(([x, y]) => !zoneIsSolidAt(this.zone, Math.floor(x / TILE), Math.floor(y / TILE)));
  }

  private nearestInteraction() {
    const px = this.player.x / TILE;
    const py = this.player.y / TILE;
    let best: { dist: number; kind: "object" | "npc"; index: number } | null = null;
    this.zone.interactables.forEach((i, index) => {
      const d = Math.hypot(i.x + 0.5 - px, i.y + 0.5 - py);
      if (d < 1.6 && (!best || d < best.dist)) best = { dist: d, kind: "object", index };
    });
    this.npcs.forEach((n, index) => {
      const d = Math.hypot(n.container.x / TILE - px, n.container.y / TILE - py);
      if (d < 1.8 && (!best || d < best.dist)) best = { dist: d, kind: "npc", index };
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

  override update(_time: number, delta: number) {
    const store = useCampusStore.getState();
    const blocked = !!(store.dialogue || store.reading || store.lessonOpen || store.mapOpen);
    let vx = 0;
    let vy = 0;
    if (!blocked) {
      if (this.cursors.left.isDown || this.keys["A"]!.isDown) vx -= 1;
      if (this.cursors.right.isDown || this.keys["D"]!.isDown) vx += 1;
      if (this.cursors.up.isDown || this.keys["W"]!.isDown) vy -= 1;
      if (this.cursors.down.isDown || this.keys["S"]!.isDown) vy += 1;
      vx += this.joystick.x;
      vy += this.joystick.y;
    }
    const len = Math.hypot(vx, vy);
    if (len > 0) {
      vx /= len;
      vy /= len;
      const step = (SPEED * delta) / 1000;
      const nx = this.player.x + vx * step;
      const ny = this.player.y + vy * step;
      if (this.canStand(nx, this.player.y)) this.player.x = nx;
      if (this.canStand(this.player.x, ny)) this.player.y = ny;
      this.stepPhase += delta / 90;
      this.playerBody.y = Math.sin(this.stepPhase) * 1.5;
      const dir =
        Math.abs(vx) > Math.abs(vy) ? (vx > 0 ? "right" : "left") : vy > 0 ? "down" : "up";
      this.playerBody.scaleX = dir === "left" ? -1 : 1;
      store.setPlayer(
        Math.round(this.player.x / TILE),
        Math.round(this.player.y / TILE),
        dir as "up" | "down" | "left" | "right",
      );
    } else {
      this.playerBody.y = 0;
    }

    // NPC behaviour
    this.npcs.forEach((n) => {
      n.timer += delta;
      if (n.spawn.behavior === "walk") {
        const targetX = n.homeX + Math.sin(n.timer / 1400) * 48;
        if (this.canStand(targetX, n.container.y)) n.container.x = targetX;
      } else if (n.spawn.behavior === "study" || n.spawn.behavior === "read") {
        n.container.y = n.homeY + Math.sin(n.timer / 600) * 1.2;
      }
    });

    // prompt + room tracking
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
