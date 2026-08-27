import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "@tanstack/react-router";
import type Phaser from "phaser";
import { useCampusStore, hydrateCampus } from "@/lib/campus/store";
import { motionDuration } from "@/lib/a11y/motion";
import { debugEnabled } from "@/lib/debug";
import { getZone, ZONE_LABELS, type InteractAction, type NpcSpawn } from "@/lib/campus/world";
import { WALKTHROUGHS, buildWalkthrough } from "@/lib/campus/walkthrough";
import { isWalkableTile, reachabilityReport } from "@/lib/campus/walkable";

import type { CampusScene, CampusAssetReport } from "@/game/CampusScene";
import { CampusHud } from "@/components/campus/CampusHud";
import { DialogueBox, ReadingBox } from "@/components/campus/DialogueBox";
import { CampusMapOverlay } from "@/components/campus/CampusMapOverlay";
import { LessonOverlay } from "@/components/campus/LessonOverlay";
import { ClassroomBeat } from "@/components/campus/ClassroomBeat";
import { LayerTransition } from "@/components/campus/LayerTransition";
import { PerfOverlay, type CampusPerfStats } from "@/components/campus/PerfOverlay";
import { AssetDebugPanel } from "@/components/campus/AssetDebugPanel";

export function CampusView({
  initialZone = "welcome-plaza",
  tour,
  preview = false,
}: {
  initialZone?: string;
  tour?: string | undefined;
  /** Preview mode: no auth required, debug tools always available. */
  preview?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const sceneRef = useRef<CampusScene | null>(null);
  const navigate = useNavigate();

  const [ready, setReady] = useState(false);
  const [panMode, setPanMode] = useState(false);
  const [gridOn, setGridOn] = useState(false);
  const [tourStep, setTourStep] = useState<{ label: string; index: number; total: number } | null>(
    null,
  );

  // Objectives, offline sync and persistence run in the authenticated shell so
  // the Workspace shares them; the campus only needs to read the saved state.

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "p" && !e.metaKey && !e.ctrlKey) {
        if (!debugEnabled()) return;
        const s = useCampusStore.getState();
        if (s.dialogue || s.reading || s.lessonOpen) return;
        s.setPerfOpen(!s.perfOpen);
      }
      if (e.key.toLowerCase() === "a" && (e.ctrlKey || e.metaKey) && e.shiftKey) {
        e.preventDefault();
        const s = useCampusStore.getState();
        if (!s.dialogue && !s.reading && !s.lessonOpen) s.setAssetsOpen(!s.assetsOpen);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    let disposed = false;

    const boot = async () => {
      const [{ default: PhaserLib }, { CampusScene: Scene }] = await Promise.all([
        import("phaser"),
        import("@/game/CampusScene"),
      ]);
      if (disposed || !containerRef.current) return;

      const saved = hydrateCampus();
      const zone = getZone(saved?.currentZone ?? initialZone);
      const spawn = saved?.currentZone
        ? (saved.playerPosition ?? zone.defaultSpawn)
        : zone.defaultSpawn;
      const game = new PhaserLib.Game({
        type: PhaserLib.AUTO,
        parent: containerRef.current,
        backgroundColor: "#5d7047",
        pixelArt: true,
        scale: {
          mode: PhaserLib.Scale.RESIZE,
          width: "100%",
          height: "100%",
        },
        scene: [Scene],
      });
      gameRef.current = game;
      useCampusStore.getState().setZone(zone.id);
      game.scene.start("campus", {
        zoneId: zone.id,
        x: spawn.x,
        y: spawn.y,
      });
      sceneRef.current = game.scene.getScene("campus") as CampusScene;
      setReady(true);

      const store = useCampusStore.getState();

      /**
       * Walk through a door. Doors carry their own landing tile, so the
       * student always steps out of the matching doorway on the other side —
       * the remembered position is only a fallback for map travel, which has
       * no door of its own.
       */
      const enterZone = (zoneId: string, x: number, y: number, exact = true) => {
        const target = getZone(zoneId);
        const current = useCampusStore.getState();
        if (current.transition) return;
        store.rememberPosition(
          current.currentZone,
          current.playerPosition.x,
          current.playerPosition.y,
        );
        const remembered = exact ? undefined : current.zoneMemory[zoneId];
        const spawnX = remembered?.x ?? x;
        const spawnY = remembered?.y ?? y;
        const indoors = target.kind === "interior";
        store.beginTransition({
          kind: indoors ? "door" : "fade",
          label: indoors
            ? `Opening the doors — ${ZONE_LABELS[zoneId] ?? target.name}`
            : `Stepping outside — ${ZONE_LABELS[zoneId] ?? target.name}`,
          toLayer: indoors ? 2 : 1,
        });
        window.setTimeout(() => store.travel(zoneId, spawnX, spawnY), motionDuration(340));
      };

      const enterClassroom = (c: {
        roomId: string;
        roomName: string;
        lessonId: string;
        courseId: string;
        teacher: string;
      }) => {
        store.beginTransition({ kind: "wipe", label: `Entering ${c.roomName}`, toLayer: 3 });
        window.setTimeout(() => {
          store.endTransition();
          store.enterClassroom(c);
        }, motionDuration(420));
      };

      const runAction = (action: InteractAction, label: string) => {
        switch (action.kind) {
          case "travel":
            enterZone(action.zone, action.spawnX, action.spawnY);
            break;
          case "classroom":
            enterClassroom({
              roomId: action.roomId,
              roomName: action.roomName,
              lessonId: action.lessonId,
              courseId: action.courseId,
              teacher: action.teacher,
            });
            break;
          case "route":
            void navigate({ to: action.to as string });
            break;
          case "read":
            store.openReading({ title: action.title, body: action.body });
            break;
          case "map":
            store.setMapOpen(true);
            break;
          case "workspace":
          case "study":
            void navigate({ to: "/workspace" });
            break;
          case "achievements":
            void navigate({ to: "/workspace/achievements" });
            break;
          case "library":
            store.openReading({
              title: label,
              body: "The stacks hold every course reading in the university catalogue. Use the Workspace to browse the full catalogue.",
            });
            break;
        }
      };

      game.events.on("unify-interact", runAction);

      game.events.on("unify-door", (action: InteractAction) => {
        if (action.kind !== "travel") return;
        const s = useCampusStore.getState();
        if (s.dialogue || s.reading || s.lessonOpen || s.mapOpen || s.transition) return;
        s.setLastDoor(ZONE_LABELS[action.zone] ?? action.zone);
        s.logEvent("travel", `Through the door into ${ZONE_LABELS[action.zone] ?? action.zone}`);
        enterZone(action.zone, action.spawnX, action.spawnY);
      });

      const talkTo = (npc: NpcSpawn) => {
        const choices = [] as {
          label: string;
          action: () => void;
          variant?: "primary" | "ghost";
        }[];
        if (npc.lessonId && npc.courseId) {
          choices.push({
            label: "Attend the lesson",
            action: () =>
              enterClassroom({
                roomId: npc.roomId ?? npc.id,
                roomName: npc.roomName ?? "Classroom",
                lessonId: npc.lessonId!,
                courseId: npc.courseId!,
                teacher: npc.name,
              }),
          });
        }
        if (npc.route) {
          choices.push({
            label: npc.routeLabel ?? "Open workspace",
            variant: "ghost",
            action: () => void navigate({ to: npc.route as string }),
          });
        }
        store.logEvent("npc", `Talked to ${npc.name}`);
        store.openDialogue({
          speaker: npc.name,
          role: npc.role,
          speakerId: npc.id,
          lines: npc.lines,
          choices,
        });
        store.discover(npc.id);
      };

      game.events.on("unify-talk", talkTo);

      const runTour = async (tourId: string) => {
        const preset = WALKTHROUGHS[tourId];
        const walk = buildWalkthrough(preset?.lessonId ?? tourId);
        for (const [i, stepInfo] of walk.steps.entries()) {
          if (disposed) return;
          setTourStep({ label: stepInfo.label, index: i, total: walk.steps.length });
          store.travel(stepInfo.zone, stepInfo.x, stepInfo.y);
          await new Promise((r) => setTimeout(r, 900));
        }
        if (disposed) return;
        setTourStep(null);
        talkTo(walk.npc);
      };

      (window as unknown as Record<string, unknown>)["__unifyCampus"] = {
        tour: (id: string) => runTour(id),
        walkthrough: (id: string) => {
          const w = buildWalkthrough(WALKTHROUGHS[id]?.lessonId ?? id);
          return {
            roomId: w.roomId,
            zoneId: w.zoneId,
            courseId: w.courseId,
            lessonId: w.lessonId,
            teacher: w.npc.name,
            steps: w.steps,
          };
        },
        travel: (zoneId: string, x = 1, y = 1) => store.travel(zoneId, x, y),
        enterClassroom: (id: string) => {
          const w = buildWalkthrough(WALKTHROUGHS[id]?.lessonId ?? id);
          useCampusStore.getState().enterClassroom({
            roomId: w.roomId,
            roomName: w.roomId,
            teacher: w.npc.name,
            courseId: w.courseId,
            lessonId: w.lessonId,
          });
        },
        walkable: (zoneId: string, x: number, y: number) => isWalkableTile(getZone(zoneId), x, y),
        reachability: (zoneId?: string) =>
          reachabilityReport(getZone(zoneId ?? useCampusStore.getState().currentZone)),
        collisionDebug: (on: boolean) =>
          (gameRef.current?.scene.getScene("campus") as CampusScene | null)?.setCollisionDebug(on),
        perf: () => (gameRef.current?.scene.getScene("campus") as CampusScene | null)?.perfStats(),
        assets: () =>
          (gameRef.current?.scene.getScene("campus") as CampusScene | null)?.assetReport(),
        assetPanel: (on: boolean) => useCampusStore.getState().setAssetsOpen(on),
        interact: () =>
          (gameRef.current?.scene.getScene("campus") as CampusScene | null)?.interact(),
        perfOverlay: (on: boolean) => useCampusStore.getState().setPerfOpen(on),
        state: () => {
          const s = useCampusStore.getState();
          return {
            zone: s.currentZone,
            player: s.playerPosition,
            zoneMemory: s.zoneMemory,
            room: s.currentRoom,
            objective: s.currentObjective,
            lessonOpen: s.lessonOpen,
            layer: s.layer,
            lastDoor: s.lastDoor,
            events: s.events,
            classroom: s.classroom,
            transition: s.transition,
          };
        },
      };

      if (tour) void runTour(tour);
    };

    void boot();

    return () => {
      disposed = true;
      delete (window as unknown as Record<string, unknown>)["__unifyCampus"];
      gameRef.current?.destroy(true);
      gameRef.current = null;
      sceneRef.current = null;
    };
  }, [initialZone, navigate, tour]);

  const pendingTravel = useCampusStore((s) => s.pendingTravel);
  const consumeTravel = useCampusStore((s) => s.consumeTravel);
  useEffect(() => {
    if (!pendingTravel || !gameRef.current) return;
    const { zone, x, y } = pendingTravel;
    consumeTravel();
    gameRef.current.scene.stop("campus");
    gameRef.current.scene.start("campus", { zoneId: zone, x, y });
    sceneRef.current = gameRef.current.scene.getScene("campus") as CampusScene;
    const t = window.setTimeout(
      () => useCampusStore.getState().endTransition(),
      motionDuration(260),
    );
    return () => window.clearTimeout(t);
  }, [pendingTravel, consumeTravel]);

  const layer = useCampusStore((s) => s.layer);

  // Stepping back out of a classroom returns the student to that room's own
  // doorway rather than wherever they happened to stand before.
  const classroom = useCampusStore((s) => s.classroom);
  const lastRoomRef = useRef<string | null>(null);
  useEffect(() => {
    if (classroom) {
      lastRoomRef.current = classroom.roomId;
      return;
    }
    const roomId = lastRoomRef.current;
    lastRoomRef.current = null;
    const scene = gameRef.current?.scene.getScene("campus") as CampusScene | null;
    if (!roomId || !scene) return;
    const zone = getZone(useCampusStore.getState().currentZone);
    const door = zone.interactables.find(
      (i) => i.action.kind === "classroom" && i.action.roomId === roomId,
    );
    if (door) scene.placePlayer(door.x, door.y);
  }, [classroom]);

  /**
   * Always resolve the live scene from the game instance. A cached ref can be
   * nulled by an effect cleanup (React strict double-mount, HMR), which used
   * to silently break the ACT button and the joystick.
   */
  const getScene = useCallback(
    () => (gameRef.current?.scene.getScene("campus") as CampusScene | null) ?? null,
    [],
  );

  const move = useCallback(
    (x: number, y: number) => {
      const scene = getScene();
      if (scene) scene.joystick = { x, y };
    },
    [getScene],
  );

  const interact = useCallback(() => {
    getScene()?.interact();
  }, [getScene]);

  const getPerfStats = useCallback(
    () => getScene()?.perfStats() as CampusPerfStats | undefined,
    [getScene],
  );
  const resetPerfStats = useCallback(() => getScene()?.resetPerfStats(), [getScene]);
  const getAssetReport = useCallback(
    () => getScene()?.assetReport() as CampusAssetReport | undefined,
    [getScene],
  );

  return (
    <div
      data-testid="campus-root"
      data-layer={layer}
      className="relative h-[100dvh] w-full overflow-hidden bg-grass"
    >
      <div ref={containerRef} className="absolute inset-0" aria-label="Campus world" />
      {!ready && (
        <div className="absolute inset-0 grid place-items-center bg-sidebar text-sidebar-foreground">
          <p className="font-display text-lg">Opening the campus gates…</p>
        </div>
      )}
      {tourStep && (
        <div
          data-testid="tour-step"
          data-step-index={tourStep.index}
          data-step-total={tourStep.total}
          data-step-label={tourStep.label}
          data-step-zone={useCampusStore.getState().currentZone}
          className="pointer-events-auto absolute left-1/2 top-4 z-40 -translate-x-1/2 rounded-md border-2 border-accent bg-sidebar/95 px-4 py-2 font-display text-sm text-sidebar-foreground shadow-lg"
        >
          Guided route: {tourStep.label}
        </div>
      )}

      <CampusHud onMove={move} onAction={interact} />
      <DialogueBox />
      <ReadingBox />
      <CampusMapOverlay />
      <ClassroomBeat />
      <LessonOverlay />
      <LayerTransition />
      <PerfOverlay
        getStats={getPerfStats}
        onReset={resetPerfStats}
      />
      <AssetDebugPanel getReport={getAssetReport} />
    </div>
  );
}
