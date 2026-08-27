import { useEffect, useMemo, useRef } from "react";
import { useCampusStore } from "@/lib/campus/store";
import { getZone } from "@/lib/campus/world";
import { motionSetting } from "@/lib/a11y/motion";
import type { TileKind } from "@/lib/campus/tiles";

const COLOR: Partial<Record<TileKind, string>> = {
  grass: "#5f7a4d",
  grassAlt: "#57703f",
  flower: "#6b8452",
  path: "#cbb894",
  brick: "#9c4a44",
  stone: "#8b7d6b",
  water: "#5d7f96",
  tree: "#33502f",
  hedge: "#3d5c39",
  fountain: "#6f93a8",
  buildingWall: "#7b5c44",
  buildingRoof: "#6d2f34",
  window: "#d9a441",
  wall: "#5a4534",
  floor: "#c9b493",
  floorAlt: "#bda684",
  rug: "#8d4a3f",
  desk: "#8a6743",
  table: "#8a6743",
  chair: "#6d5136",
  shelf: "#7a5a3a",
  board: "#33503f",
  bed: "#9c6a56",
  counter: "#8a6743",
  computer: "#4d6070",
  plant: "#4c6b3f",
  bench: "#7c5a3c",
  lamp: "#d9a441",
  sign: "#b07c3f",
  door: "#d9a441",
};

/** Marker easing per second: how much of the remaining gap is closed. */
const EASE_PER_SECOND = 12;
/** Below this many pixels the marker is considered settled. */
const SNAP_EPSILON = 0.05;

/**
 * Keep the marker fully inside the minimap. Edge tiles, out-of-range values
 * from a collision nudge, or a stale position from another zone would
 * otherwise draw the dot half (or entirely) off the canvas.
 */
export function clampMarker(
  px: number,
  py: number,
  bounds: { w: number; h: number; radius: number },
) {
  const r = Math.min(bounds.radius, bounds.w / 2, bounds.h / 2);
  const clamp = (v: number, max: number) =>
    Number.isFinite(v) ? Math.min(Math.max(v, r), Math.max(r, max - r)) : r;
  return { x: clamp(px, bounds.w), y: clamp(py, bounds.h) };
}

/** Unit vector for the facing arrow. */
const FACING_VECTOR: Record<string, { x: number; y: number }> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

/**
 * Live corner minimap: the current zone painted from its tile grid, with
 * doorways, interactables, NPCs and the player rendered on top.
 *
 * The static terrain layer is rasterised once per zone into an offscreen
 * canvas; each animation frame only blits that cache and redraws the player
 * marker, which eases toward its target tile instead of snapping.
 */
export function Minimap({ size = 132 }: { size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const zoneId = useCampusStore((s) => s.currentZone);
  const player = useCampusStore((s) => s.playerPosition);
  const facing = useCampusStore((s) => s.playerDirection);
  const zone = useMemo(() => getZone(zoneId), [zoneId]);


  // Interpolated marker position, in tile units.
  const markerRef = useRef<{ x: number; y: number } | null>(null);
  const rafRef = useRef<number | null>(null);
  const baseRef = useRef<HTMLCanvasElement | null>(null);

  // The minimap uses the same 2:1 isometric projection as the Phaser world.
  // `unit` is half a tile's diamond width, keeping the entire zone visible.
  const unit = Math.max(1, size / Math.max(zone.width + zone.height, 1));
  const w = Math.ceil((zone.width + zone.height) * unit);
  const h = Math.ceil((zone.width + zone.height) * unit / 2);
  const iso = (x: number, y: number) => ({
    x: (x - y + zone.height) * unit,
    y: (x + y) * unit / 2,
  });
  const diamond = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    const c = iso(x + 0.5, y + 0.5);
    ctx.beginPath();
    ctx.moveTo(c.x, c.y - unit / 2);
    ctx.lineTo(c.x + unit, c.y);
    ctx.lineTo(c.x, c.y + unit / 2);
    ctx.lineTo(c.x - unit, c.y);
    ctx.closePath();
  };

  // Rasterise the static layer (terrain, POIs, NPCs) once per zone/size.
  useEffect(() => {
    const base = document.createElement("canvas");
    base.width = w;
    base.height = h;
    const ctx = base.getContext("2d");
    if (!ctx) return;
    for (let y = 0; y < zone.height; y++) {
      for (let x = 0; x < zone.width; x++) {
        ctx.fillStyle = COLOR[zone.tiles[y]![x]!] ?? "#4a3a2c";
        diamond(ctx, x, y);
        ctx.fill();
      }
    }
    zone.interactables.forEach((i) => {
      const at = iso(i.x + 0.5, i.y + 0.5);
      ctx.fillStyle = i.action.kind === "classroom" ? "#e0553f" : "#d9a441";
      ctx.beginPath();
      ctx.arc(at.x, at.y, Math.max(2, unit * 0.32), 0, Math.PI * 2);
      ctx.fill();
    });
    zone.npcs.forEach((n) => {
      const at = iso(n.x + 0.5, n.y + 0.5);
      ctx.fillStyle = "#f1e6d0";
      ctx.fillRect(at.x - Math.max(1, unit * 0.2), at.y - Math.max(1, unit * 0.2), Math.max(2, unit * 0.4), Math.max(2, unit * 0.4));
    });
    baseRef.current = base;
    // A new zone means the marker teleports rather than slides across the map.
    markerRef.current = null;
  }, [zone, unit, w, h]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const draw = () => {
      const marker = markerRef.current ?? { x: player.x, y: player.y };
      ctx.clearRect(0, 0, w, h);
      const base = baseRef.current;
      if (base) ctx.drawImage(base, 0, 0, w, h);

      // playerPosition is in tile coordinates; project the tile *centre* the
      // same way interactables and NPCs are projected so the dot sits on the
      // same diamond the student occupies in the world.
      const dot = Math.max(2, unit * 0.32);
      const markerAt = iso(marker.x + 0.5, marker.y + 0.5);

      const { x: px, y: py } = clampMarker(markerAt.x, markerAt.y, {
        w,
        h,
        radius: dot + 1,
      });
      ctx.beginPath();
      ctx.fillStyle = "rgba(224, 85, 63, 0.32)";
      ctx.arc(px, py, unit * 1.2, 0, Math.PI * 2);
      ctx.fill();

      // Facing arrow: a small triangle offset from the dot in the look direction.
      const v = FACING_VECTOR[facing] ?? FACING_VECTOR["down"]!;
      const tip = dot + Math.max(3, unit * 0.75);
      const half = Math.max(2, unit * 0.4);
      ctx.beginPath();
      ctx.fillStyle = "#f1e6d0";
      ctx.moveTo(px + v.x * tip, py + v.y * tip);
      ctx.lineTo(px + v.x * dot - v.y * half, py + v.y * dot + v.x * half);
      ctx.lineTo(px + v.x * dot + v.y * half, py + v.y * dot - v.x * half);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.fillStyle = "#e0553f";
      ctx.strokeStyle = "#f1e6d0";
      ctx.lineWidth = 1;
      ctx.arc(px, py, dot, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    };


    const animate = motionSetting() === "full" && markerRef.current !== null;
    if (!animate) {
      // First paint, a zone change, or reduced motion: place the marker exactly.
      markerRef.current = { x: player.x, y: player.y };
      draw();
      return;
    }

    let last = performance.now();
    const step = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const m = markerRef.current!;
      const t = 1 - Math.exp(-EASE_PER_SECOND * dt);
      m.x += (player.x - m.x) * t;
      m.y += (player.y - m.y) * t;
      const settled =
        Math.abs(player.x - m.x) * unit < SNAP_EPSILON &&
        Math.abs(player.y - m.y) * unit < SNAP_EPSILON;
      if (settled) {
        m.x = player.x;
        m.y = player.y;
      }
      draw();
      rafRef.current = settled ? null : requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [zone, player.x, player.y, facing, unit, w, h]);

  return (
    <div
      data-testid="minimap"
      data-zone={zoneId}
      className="block-panel border-accent/70 bg-sidebar/95 p-2"
    >
      <canvas ref={canvasRef} className="block [image-rendering:pixelated]" />
      <p className="pt-1 text-center text-[9px] uppercase tracking-widest text-sidebar-foreground/70">
        {zone.name}
      </p>
    </div>
  );
}
