import { Link } from "@tanstack/react-router";
import { Accessibility, Compass, Gauge, LayoutDashboard, Map, MoveDiagonal } from "lucide-react";
import { useCampusStore } from "@/lib/campus/store";
import { ZONE_LABELS } from "@/lib/campus/world";
import { Button } from "@/components/ui/button";
import { Minimap } from "@/components/campus/Minimap";
import { ObjectiveTracker } from "@/components/campus/ObjectiveTracker";
import { MOTION_LABELS, useMotionStore } from "@/lib/a11y/motion";
import { ASSIST_LABEL, useAssistStore } from "@/lib/a11y/assist";
import { useDebugMode } from "@/lib/debug";
import { TouchControls } from "@/components/campus/TouchControls";

export function CampusHud({
  onMove,
  onAction,
}: {
  onMove: (x: number, y: number) => void;
  onAction: () => void;
}) {
  const zone = useCampusStore((s) => s.currentZone);
  const roomName = useCampusStore((s) => s.currentRoomName);
  const prompt = useCampusStore((s) => s.interactionTarget);
  const perfOpen = useCampusStore((s) => s.perfOpen);
  const setPerfOpen = useCampusStore((s) => s.setPerfOpen);
  const setMapOpen = useCampusStore((s) => s.setMapOpen);
  const busy = useCampusStore((s) => !!(s.dialogue || s.reading || s.lessonOpen || s.mapOpen));
  const motion = useMotionStore((s) => s.setting);
  const cycleMotion = useMotionStore((s) => s.cycle);
  const assist = useAssistStore((s) => s.assist);
  const toggleAssist = useAssistStore((s) => s.toggle);
  const debug = useDebugMode();

  return (
    <div className="pointer-events-none absolute inset-0 z-20">
      <div className="pointer-events-auto absolute left-3 top-3 flex flex-col gap-2">
        <div className="rounded-md border border-accent/60 bg-sidebar/90 px-3 py-2 shadow-lg">
          <p className="font-display text-sm font-bold text-accent">
            {ZONE_LABELS[zone] ?? zone}
          </p>
          <p className="text-[11px] text-sidebar-foreground/80">
            {roomName ?? "Unify University"}
          </p>
        </div>
        <ObjectiveTracker />
        {debug && (
          <>
        <button
          type="button"
          onClick={() => setPerfOpen(!perfOpen)}
          data-testid="perf-toggle"
          data-perf={perfOpen ? "on" : "off"}
          aria-pressed={perfOpen}
          aria-label="Toggle the campus performance profiling overlay"
          title="Show streamed prop counts and frame-time spikes"
          className="flex items-center gap-1.5 self-start rounded-md border border-border bg-card/95 px-2.5 py-1.5 text-[11px] font-semibold text-foreground shadow hover:bg-accent hover:text-accent-foreground"
        >
          <Gauge className="size-3.5" aria-hidden="true" />
          Profiler {perfOpen ? "on" : "off"}
        </button>
        <button
          type="button"
          onClick={cycleMotion}
          data-testid="motion-toggle"
          data-motion={motion}
          aria-label={`${MOTION_LABELS[motion]} — click to change camera and transition motion`}
          title="Reduce camera motion and transition effects"
          className="flex items-center gap-1.5 self-start rounded-md border border-border bg-card/95 px-2.5 py-1.5 text-[11px] font-semibold text-foreground shadow hover:bg-accent hover:text-accent-foreground"
        >
          <Accessibility className="size-3.5" aria-hidden="true" />
          {MOTION_LABELS[motion]}
        </button>
        <button
          type="button"
          onClick={toggleAssist}
          data-testid="assist-toggle"
          data-assist={assist ? "on" : "off"}
          aria-pressed={assist}
          aria-label={`${ASSIST_LABEL(assist)} — widens door, chair and rug tolerances to reduce accidental bumping`}
          title="Widen interaction tolerances around doors, rugs and chair edges"
          className="flex items-center gap-1.5 self-start rounded-md border border-border bg-card/95 px-2.5 py-1.5 text-[11px] font-semibold text-foreground shadow hover:bg-accent hover:text-accent-foreground"
        >
          <MoveDiagonal className="size-3.5" aria-hidden="true" />
          {ASSIST_LABEL(assist)}
        </button>
          </>
        )}
      </div>

      {!busy && (
        <div className="pointer-events-auto absolute bottom-3 right-3 hidden md:block">
          <Minimap />
        </div>
      )}

      <div className="pointer-events-auto absolute right-3 top-3 flex gap-2">
        <Button size="sm" variant="secondary" onClick={() => setMapOpen(true)}>
          <Map className="size-4" /> Map
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link to="/workspace">
            <LayoutDashboard className="size-4" /> Workspace
          </Link>
        </Button>
      </div>

      {prompt && !busy && (
        <div className="absolute bottom-32 left-1/2 -translate-x-1/2 rounded-md border border-accent bg-sidebar/95 px-4 py-2 text-sm text-sidebar-foreground shadow-lg sm:bottom-24">
          <span className="mr-2 rounded bg-accent px-1.5 py-0.5 text-[11px] font-bold text-accent-foreground">
            E
          </span>
          {prompt.verb} · {prompt.label}
        </div>
      )}

      {!busy && <TouchControls onMove={onMove} onAction={onAction} />}

      <div className="absolute bottom-3 left-1/2 hidden -translate-x-1/2 items-center gap-3 rounded-md bg-sidebar/80 px-3 py-1.5 text-[11px] text-sidebar-foreground/90 md:flex">
        <Compass className="size-3.5" />
        WASD / arrows to move · E to interact · M for map
      </div>
    </div>
  );
}
