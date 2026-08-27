import { useEffect, useState } from "react";

export interface IsoDebugSnapshot {
  zone: string;
  tile: { x: number; y: number };
  world: { x: number; y: number };
  screen: { x: number; y: number };
  depth: number;
  walkable: boolean;
  standing: boolean;
  facing: string;
  zoom: number;
  scroll: { x: number; y: number };
  gridOn: boolean;
  panMode: boolean;
}

/**
 * Read-out for the isometric debug tools: the tile the student stands on, the
 * projected depth used for sorting, and whether the collision mask says that
 * tile is standable. Pairs with the in-world grid/collision overlay.
 */
export function IsoDebugOverlay({
  open,
  getSnapshot,
}: {
  open: boolean;
  getSnapshot: () => IsoDebugSnapshot | null | undefined;
}) {
  const [snap, setSnap] = useState<IsoDebugSnapshot | null>(null);

  useEffect(() => {
    if (!open) return;
    const tick = () => setSnap(getSnapshot() ?? null);
    tick();
    const id = window.setInterval(tick, 120);
    return () => window.clearInterval(id);
  }, [open, getSnapshot]);

  if (!open) return null;

  const rows: [string, string][] = snap
    ? [
        ["zone", snap.zone],
        ["tile", `${snap.tile.x}, ${snap.tile.y}`],
        ["world px", `${snap.world.x}, ${snap.world.y}`],
        ["screen px", `${snap.screen.x}, ${snap.screen.y}`],
        ["depth layer", String(snap.depth)],
        ["tile walkable", snap.walkable ? "yes" : "no"],
        ["collision box", snap.standing ? "clear" : "blocked"],
        ["facing", snap.facing],
        ["zoom", `${snap.zoom}x`],
        ["camera", `${snap.scroll.x}, ${snap.scroll.y}`],
        ["grid overlay", snap.gridOn ? "on" : "off"],
        ["free look", snap.panMode ? "on" : "off"],
      ]
    : [["status", "waiting for the scene…"]];

  return (
    <div
      data-testid="iso-debug"
      className="pointer-events-none absolute bottom-3 left-3 z-40 w-56 rounded-md border-2 border-accent/70 bg-sidebar/95 p-2.5 font-mono text-[11px] text-sidebar-foreground shadow-lg"
    >
      <p className="mb-1 font-display text-[11px] font-black uppercase tracking-widest text-accent">
        Isometric debug
      </p>
      <dl className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-sidebar-foreground/65">{k}</dt>
            <dd data-testid={`iso-debug-${k.replace(/\s+/g, "-")}`} className="text-right">
              {v}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
