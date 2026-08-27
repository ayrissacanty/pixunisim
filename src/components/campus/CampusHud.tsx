import { memo } from "react";
import { Link } from "@tanstack/react-router";
import { Accessibility, Boxes, Compass, Gauge, LayoutDashboard, Map, MoveDiagonal, Palette } from "lucide-react";
import { useCampusStore } from "@/lib/campus/store";
import { ZONE_LABELS } from "@/lib/campus/world";
import { Button } from "@/components/ui/button";
import { Minimap } from "@/components/campus/Minimap";
import { ObjectiveTracker } from "@/components/campus/ObjectiveTracker";
import { MOTION_LABELS, useMotionStore } from "@/lib/a11y/motion";
import { ASSIST_LABEL, useAssistStore } from "@/lib/a11y/assist";
import { useDebugMode } from "@/lib/debug";
import { useStyleStore } from "@/lib/a11y/style";
import { STYLE_LABELS } from "@/lib/campus/themes";
import { TouchControls } from "@/components/campus/TouchControls";
import { MobileA11ySettings } from "@/components/campus/MobileA11ySettings";
import { CampusCameraControls } from "@/components/campus/CampusCameraControls";


const MemoizedMinimap = memo(Minimap);
const MemoizedObjectiveTracker = memo(ObjectiveTracker);
const MemoizedTouchControls = memo(TouchControls);

export interface CampusCameraApi {
  panMode: boolean;
  gridOn: boolean;
  onTogglePan: () => void;
  onToggleGrid: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onRecenter: () => void;
}

export function CampusHud({
  onMove,
  onAction,
  camera,
  forceDebug = false,
}: {
  onMove: (x: number, y: number) => void;
  onAction: () => void;
  camera?: CampusCameraApi;
  forceDebug?: boolean;
}) {
  const zone = useCampusStore((s) => s.currentZone);
  const roomName = useCampusStore((s) => s.currentRoomName);
  const prompt = useCampusStore((s) => s.interactionTarget);
  const perfOpen = useCampusStore((s) => s.perfOpen);
  const setPerfOpen = useCampusStore((s) => s.setPerfOpen);
  const assetsOpen = useCampusStore((s) => s.assetsOpen);
  const setAssetsOpen = useCampusStore((s) => s.setAssetsOpen);
  const setMapOpen = useCampusStore((s) => s.setMapOpen);
  const busy = useCampusStore((s) => !!(s.dialogue || s.reading || s.lessonOpen || s.mapOpen));
  const motion = useMotionStore((s) => s.setting);
  const cycleMotion = useMotionStore((s) => s.cycle);
  const assist = useAssistStore((s) => s.assist);
  const toggleAssist = useAssistStore((s) => s.toggle);
  const style = useStyleStore((s) => s.style);
  const toggleStyle = useStyleStore((s) => s.toggle);
  const debug = useDebugMode() || forceDebug;


  return (
    <div
      className="pointer-events-none absolute inset-0 z-20 flex flex-col"
      style={{
        paddingTop: "max(0.75rem, env(safe-area-inset-top))",
        paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))",
      }}
    >
      {/* Top bar: location + objective on the left, actions on the right.
          Two independent columns so panels can never stack over each other. */}
      <div className="flex items-start justify-between gap-3 px-3">
        <div className="pointer-events-auto flex min-w-0 flex-col gap-2">
          <div className="block-panel flex items-center gap-2 border-accent/70 bg-sidebar/95 px-3.5 py-2.5">
            <Compass className="size-4 shrink-0 text-accent" aria-hidden="true" />
            <div className="min-w-0">
              <p className="font-display text-sm font-black uppercase tracking-wide leading-tight text-accent">
                {ZONE_LABELS[zone] ?? zone}
              </p>
              <p className="truncate text-[11px] font-semibold text-sidebar-foreground/80">
                {roomName ?? "Unify University"}
              </p>
            </div>
          </div>

          <MemoizedObjectiveTracker />
          {debug && (
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setPerfOpen(!perfOpen)}
                data-testid="perf-toggle"
                data-perf={perfOpen ? "on" : "off"}
                aria-pressed={perfOpen}
                aria-label="Toggle the campus performance profiling overlay"
                title="Show streamed prop counts and frame-time spikes"
                className="block-btn flex items-center gap-1.5 self-start border-border bg-card/95 px-2.5 py-1.5 text-[11px] font-bold text-foreground hover:bg-accent hover:text-accent-foreground"
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
                className="block-btn flex items-center gap-1.5 self-start border-border bg-card/95 px-2.5 py-1.5 text-[11px] font-bold text-foreground hover:bg-accent hover:text-accent-foreground"
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
                className="block-btn flex items-center gap-1.5 self-start border-border bg-card/95 px-2.5 py-1.5 text-[11px] font-bold text-foreground hover:bg-accent hover:text-accent-foreground"
              >
                <MoveDiagonal className="size-3.5" aria-hidden="true" />
                {ASSIST_LABEL(assist)}
              </button>
            </div>
          )}
        </div>

        <div className="pointer-events-auto flex shrink-0 flex-col items-end gap-2 sm:flex-row sm:items-start">
          <Button
            size="sm"
            variant="secondary"
            className="block-btn h-10 border-secondary-foreground/25 px-3 font-black uppercase tracking-wide"
            aria-label="Open the campus map"
            data-testid="hud-map"
            onClick={() => setMapOpen(true)}
          >
            <Map className="size-4" /> <span className="hidden sm:inline">Map</span>
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="block-btn h-10 px-3 font-black uppercase tracking-wide"
            aria-label={`${STYLE_LABELS[style]} — click to change campus visual style`}
            data-testid="style-toggle"
            data-style={style}
            onClick={toggleStyle}
          >
            <Palette className="size-4" /> <span className="hidden sm:inline">{style === "storybook" ? "Bright" : "Focus"}</span>
          </Button>
          <Button size="sm" variant="outline" className="block-btn h-10 px-3 font-black uppercase tracking-wide" aria-label="Open the loaded 2D asset inspector" data-testid="hud-assets" data-assets={assetsOpen ? "on" : "off"} onClick={() => setAssetsOpen(!assetsOpen)}>
            <Boxes className="size-4" /> <span className="hidden sm:inline">Assets</span>
          </Button>
          <MobileA11ySettings />
          <Button
            asChild
            size="sm"
            variant="default"
            className="block-btn h-10 border-primary-foreground/25 px-3 font-black uppercase tracking-wide"
          >
            <Link to="/workspace" aria-label="Go to your workspace" data-testid="hud-workspace">
              <LayoutDashboard className="size-4" />{" "}
              <span className="hidden sm:inline">Workspace</span>
            </Link>
          </Button>
        </div>

      </div>

      {/* Spacer keeps the bottom rail anchored without absolute stacking. */}
      <div className="flex-1" />

      <div className="flex items-end justify-between gap-3 px-3">
        <div className="min-w-0 flex-1">
          {prompt && !busy && (
            <div className="block-panel pointer-events-none mx-auto w-fit border-accent bg-sidebar/95 px-4 py-2.5 text-sm font-semibold text-sidebar-foreground">
              <span className="mr-2 block-chip border-accent-foreground/25 bg-accent px-2 py-0.5 text-[11px] font-black text-accent-foreground">
                E
              </span>
              {prompt.verb} · {prompt.label}
            </div>
          )}
          <div className="block-panel mx-auto mt-2 hidden w-fit items-center gap-3 border-accent/40 bg-sidebar/90 px-3.5 py-2 text-[11px] font-semibold text-sidebar-foreground/90 md:flex">
            <Compass className="size-3.5" />
            WASD / arrows or tap a tile to move · E to interact · M for map · scroll or pinch to zoom
          </div>
        </div>
        {!busy && (
          <div className="flex items-end gap-2">
            {camera && (
              <CampusCameraControls
                panMode={camera.panMode}
                gridOn={camera.gridOn}
                onTogglePan={camera.onTogglePan}
                onToggleGrid={camera.onToggleGrid}
                onZoomIn={camera.onZoomIn}
                onZoomOut={camera.onZoomOut}
                onRecenter={camera.onRecenter}
                showGrid={debug}
              />
            )}
            <div className="pointer-events-auto hidden md:block">
              <MemoizedMinimap />
            </div>
          </div>
        )}

      </div>

      {!busy && <MemoizedTouchControls onMove={onMove} onAction={onAction} />}
    </div>
  );
}

