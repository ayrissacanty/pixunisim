import { memo } from "react";
import { Link } from "@tanstack/react-router";
import {
  Accessibility,
  Backpack,
  BookOpen,
  Boxes,
  Compass,
  Gauge,
  LayoutDashboard,
  Map,
  MoveDiagonal,
  Palette,
  ScrollText,
  Sunrise,
} from "lucide-react";
import { useCampusStore } from "@/lib/campus/store";
import { ZONE_LABELS } from "@/lib/campus/world";
import { Button } from "@/components/ui/button";
import { Minimap } from "@/components/campus/Minimap";
import { CampusTracker } from "@/components/campus/QuestPanel";
import { MOTION_LABELS, useMotionStore } from "@/lib/a11y/motion";
import { ASSIST_LABEL, useAssistStore } from "@/lib/a11y/assist";
import { useDebugMode } from "@/lib/debug";
import { useStyleStore } from "@/lib/a11y/style";
import { STYLE_LABELS } from "@/lib/campus/themes";
import { TouchControls } from "@/components/campus/TouchControls";
import { MobileA11ySettings } from "@/components/campus/MobileA11ySettings";
import { CampusCameraControls } from "@/components/campus/CampusCameraControls";
import { CampusClock } from "@/components/campus/CampusClock";
import { LevelBadge } from "@/components/campus/LevelBadge";


const MemoizedMinimap = memo(Minimap);
const MemoizedTracker = memo(CampusTracker);
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
  const setQuestsOpen = useCampusStore((s) => s.setQuestsOpen);
  const setModulesOpen = useCampusStore((s) => s.setModulesOpen);
  const setBackpackOpen = useCampusStore((s) => s.setBackpackOpen);
  const setDailyOpen = useCampusStore((s) => s.setDailyOpen);
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
      className="academy pointer-events-none absolute inset-0 z-20 flex flex-col"
      style={{
        paddingTop: "max(0.75rem, env(safe-area-inset-top))",
        paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))",
      }}
    >
      {/* Compact academic status bar leaves the tiled world as the focus. */}
      <div className="px-2 sm:px-3">
        <div className="pointer-events-auto flex min-h-14 items-center justify-between gap-3 border-4 border-sidebar-border bg-sidebar/95 px-3 py-2 shadow-[0_4px_0_0_var(--block-edge-strong)]">
          <div className="flex items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center border-2 border-accent bg-primary text-base font-black text-primary-foreground shadow-[2px_2px_0_0_var(--block-edge-strong)]">
              <span aria-hidden="true">🎓</span>
            </div>
            <div className="min-w-0">
              <p className="font-display text-[8px] font-black uppercase text-accent">
                Campus
              </p>
              <p className="truncate text-sm font-bold tracking-wide text-foreground">
                {ZONE_LABELS[zone] ?? zone}
              </p>
              <p className="truncate text-[11px] font-semibold text-sidebar-foreground/70">
                {roomName ?? "Unify University"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <LevelBadge />
            <CampusClock />
          </div>
        </div>
      </div>

      {/* Debug-only toggles sit just under the header, out of the play area. */}
      {debug && (
        <div className="pointer-events-auto mt-2 flex flex-col gap-2 self-start pl-3">
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

      {/* Spacer keeps the bottom rail anchored without absolute stacking. */}
      <div className="flex-1" />

      <div className="mb-[4.75rem] flex items-end justify-between gap-3 px-3 md:mb-[5.5rem]">
        <div className="min-w-0 flex-1">
          <MemoizedTracker />
          {prompt && !busy && (
            <div className="block-panel pointer-events-none mx-auto mt-2 w-fit border-accent bg-sidebar/95 px-4 py-2.5 text-sm font-semibold text-sidebar-foreground">
              <span className="mr-2 block-chip border-accent-foreground/25 bg-accent px-2 py-0.5 text-[11px] font-black text-accent-foreground">
                E
              </span>
              {prompt.verb} · {prompt.label}
            </div>
          )}
           <div className="block-panel mx-auto mt-2 hidden w-fit items-center gap-3 border-accent/40 bg-sidebar/95 px-3.5 py-2 text-[10px] font-semibold text-sidebar-foreground/90 md:flex">
            <Compass className="size-3.5" />
            WASD / arrows or tap a tile to move · E to interact · M for map · scroll or pinch to zoom
          </div>
        </div>
        {!busy && (
          <div className="pointer-events-auto hidden items-end gap-2 md:flex">
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
            <MemoizedMinimap />
          </div>
        )}

      </div>

      {/* Walnut command rail, inspired by a classic 16-bit RPG inventory bar. */}
      <div className="pointer-events-auto absolute inset-x-0 bottom-0 z-20 flex min-h-[4.25rem] items-center justify-center gap-1.5 border-t-4 border-accent/60 bg-sidebar/95 px-2 py-2 shadow-[0_-4px_0_0_var(--block-edge-strong)] sm:gap-2">
        <Button
          size="sm"
          variant="secondary"
          className="block-btn size-11 border-secondary-foreground/25 p-0 sm:size-12"
          aria-label="Open the campus map"
          data-testid="hud-map"
          title="Map"
          onClick={() => setMapOpen(true)}
        >
          <Map className="size-5" />
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="block-btn size-11 border-accent/40 p-0 sm:size-12"
          aria-label="Open today's story"
          data-testid="hud-daily"
          title="Today's story"
          onClick={() => setDailyOpen(true)}
        >
          <Sunrise className="size-5" />
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="block-btn size-11 border-accent/40 p-0 sm:size-12"
          aria-label="Open the quest log"
          data-testid="hud-quests"
          title="Quests"
          onClick={() => setQuestsOpen(true)}
        >
          <ScrollText className="size-5" />
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="block-btn size-11 border-accent/40 p-0 sm:size-12"
          aria-label="Open the module hub"
          data-testid="hud-modules"
          title="Modules"
          onClick={() => setModulesOpen(true)}
        >
          <BookOpen className="size-5" />
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="block-btn size-11 border-accent/40 p-0 sm:size-12"
          aria-label="Open your backpack"
          data-testid="hud-backpack"
          title="Backpack"
          onClick={() => setBackpackOpen(true)}
        >
          <Backpack className="size-5" />
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="block-btn hidden size-11 border-accent/40 p-0 sm:inline-flex sm:size-12"
          aria-label={`${STYLE_LABELS[style]} — click to change campus visual style`}
          data-testid="style-toggle"
          data-style={style}
          title={STYLE_LABELS[style]}
          onClick={toggleStyle}
        >
          <Palette className="size-5" />
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="block-btn hidden size-11 border-accent/40 p-0 sm:inline-flex sm:size-12"
          aria-label="Open the loaded 2D asset inspector"
          data-testid="hud-assets"
          data-assets={assetsOpen ? "on" : "off"}
          title="Assets"
          onClick={() => setAssetsOpen(!assetsOpen)}
        >
          <Boxes className="size-5" />
        </Button>
        <MobileA11ySettings />
        <Button
          asChild
          size="sm"
          variant="default"
          className="block-btn size-11 border-primary-foreground/25 bg-accent p-0 text-accent-foreground sm:size-12"
        >
          <Link to="/workspace" aria-label="Go to your workspace" data-testid="hud-workspace" title="Workspace">
            <LayoutDashboard className="size-5" />
          </Link>
        </Button>
      </div>

      {!busy && <MemoizedTouchControls onMove={onMove} onAction={onAction} />}
    </div>
  );
}
