import { useEffect, useMemo, useRef } from "react";
import { useCampusStore } from "@/lib/campus/store";
import { getZone } from "@/lib/campus/world";
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

/**
 * Live corner minimap: the current zone painted from its tile grid, with
 * doorways, interactables, NPCs and the player rendered on top.
 */
export function Minimap({ size = 132 }: { size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const zoneId = useCampusStore((s) => s.currentZone);
  const player = useCampusStore((s) => s.playerPosition);
  const zone = useMemo(() => getZone(zoneId), [zoneId]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const cell = Math.max(1, Math.floor(size / Math.max(zone.width, zone.height)));
    const w = zone.width * cell;
    const h = zone.height * cell;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    for (let y = 0; y < zone.height; y++) {
      for (let x = 0; x < zone.width; x++) {
        ctx.fillStyle = COLOR[zone.tiles[y]![x]!] ?? "#4a3a2c";
        ctx.fillRect(x * cell, y * cell, cell, cell);
      }
    }

    // Points of interest.
    zone.interactables.forEach((i) => {
      ctx.fillStyle = i.action.kind === "classroom" ? "#e0553f" : "#d9a441";
      ctx.fillRect(i.x * cell - 1, i.y * cell - 1, cell + 2, cell + 2);
    });
    zone.npcs.forEach((n) => {
      ctx.fillStyle = "#f1e6d0";
      ctx.fillRect(n.x * cell, n.y * cell, cell, cell);
    });

    // Player marker with a soft halo so it stays readable on any terrain.
    const px = (player.x / TILE) * cell;
    const py = (player.y / TILE) * cell;
    ctx.beginPath();
    ctx.fillStyle = "rgba(224, 85, 63, 0.32)";
    ctx.arc(px, py, cell * 2.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.fillStyle = "#e0553f";
    ctx.strokeStyle = "#f1e6d0";
    ctx.lineWidth = 1;
    ctx.arc(px, py, Math.max(2, cell * 0.9), 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }, [zone, player.x, player.y, size]);

  return (
    <div
      data-testid="minimap"
      data-zone={zoneId}
      className="rounded-md border border-accent/60 bg-sidebar/90 p-1.5 shadow-lg"
    >
      <canvas ref={canvasRef} className="block [image-rendering:pixelated]" />
      <p className="pt-1 text-center text-[9px] uppercase tracking-widest text-sidebar-foreground/70">
        {zone.name}
      </p>
    </div>
  );
}
