import { useEffect, useState } from "react";
import { useCampusStore } from "@/lib/campus/store";

export interface CampusPerfStats {
  zone: string;
  streaming: boolean;
  placements: number;
  liveProps: number;
  propSpawns: number;
  propRecycles: number;
  rooms: number;
  doors: number;
  npcs: number;
  avgFrameMs: number;
  worstFrameMs: number;
  spikes: number;
  fps: number;
}

/**
 * Optional profiling HUD: streamed prop counts, room/door totals and
 * frame-time spikes, so streaming improvements are measurable in-game.
 */
export function PerfOverlay({
  getStats,
  onReset,
}: {
  getStats: () => CampusPerfStats | undefined;
  onReset: () => void;
}) {
  const open = useCampusStore((s) => s.perfOpen);
  const setOpen = useCampusStore((s) => s.setPerfOpen);
  const [stats, setStats] = useState<CampusPerfStats | undefined>(undefined);

  useEffect(() => {
    if (!open) return;
    const tick = () => setStats(getStats());
    tick();
    const id = window.setInterval(tick, 500);
    return () => window.clearInterval(id);
  }, [open, getStats]);

  if (!open) return null;

  const rows: [string, string | number][] = stats
    ? [
        ["Zone", stats.zone],
        ["Streaming", stats.streaming ? "on (interior)" : "off (baked)"],
        ["Prop placements", stats.placements],
        ["Live prop sprites", stats.liveProps],
        ["Props instantiated", stats.propSpawns],
        ["Props recycled", stats.propRecycles],
        ["Rooms / doors", `${stats.rooms} / ${stats.doors}`],
        ["NPCs", stats.npcs],
        ["FPS (avg)", stats.fps],
        ["Frame avg / worst", `${stats.avgFrameMs}ms / ${stats.worstFrameMs}ms`],
        ["Spikes >33ms", stats.spikes],
      ]
    : [["Status", "waiting for the scene…"]];

  return (
    <div
      data-testid="perf-overlay"
      className="pointer-events-auto absolute right-3 top-24 z-30 w-60 rounded-md border border-accent/60 bg-sidebar/95 p-3 font-mono text-[11px] text-sidebar-foreground shadow-lg"
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="font-display text-xs font-bold text-accent">Performance</span>
        <button
          onClick={() => setOpen(false)}
          className="rounded px-1 text-sidebar-foreground/70 hover:text-accent"
          aria-label="Close performance overlay"
        >
          ✕
        </button>
      </div>
      <dl className="space-y-0.5">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-2">
            <dt className="text-sidebar-foreground/70">{k}</dt>
            <dd data-perf-key={k} className="text-right">
              {v}
            </dd>
          </div>
        ))}
      </dl>
      <button
        onClick={() => {
          onReset();
          setStats(getStats());
        }}
        className="mt-2 w-full rounded border border-accent/60 px-2 py-1 hover:bg-accent hover:text-accent-foreground"
      >
        Reset counters
      </button>
    </div>
  );
}
