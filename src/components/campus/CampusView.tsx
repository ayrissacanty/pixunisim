import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "@tanstack/react-router";
import type Phaser from "phaser";
import { useCampusStore, hydrateCampus, startCampusPersistence } from "@/lib/campus/store";
import { motionDuration } from "@/lib/a11y/motion";
import { debugEnabled } from "@/lib/debug";
import { getZone, ZONE_LABELS, type InteractAction, type NpcSpawn } from "@/lib/campus/world";
import { WALKTHROUGHS, buildWalkthrough } from "@/lib/campus/walkthrough";
import { isWalkableTile, reachabilityReport } from "@/lib/campus/walkable";

import type { CampusScene } from "@/game/CampusScene";
import { CampusHud } from "@/components/campus/CampusHud";
import { DialogueBox, ReadingBox } from "@/components/campus/DialogueBox";
import { CampusMapOverlay } from "@/components/campus/CampusMapOverlay";
import { LessonOverlay } from "@/components/campus/LessonOverlay";
import { ClassroomBeat } from "@/components/campus/ClassroomBeat";
import { LayerTransition } from "@/components/campus/LayerTransition";
import { PerfOverlay, type CampusPerfStats } from "@/components/campus/PerfOverlay";
import { useCampusObjectives } from "@/lib/campus/objectives";
import { useOfflineSync } from "@/lib/data";
import { prefetchCharacters } from "@/components/three/CharacterStage";
import { prefetchRoomAssets } from "@/lib/room-assets";

export function CampusView({
  initialZone = "welcome-plaza",
  tour,
}: {
  initialZone?: string;
  tour?: string | undefined;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const sceneRef = useRef<CampusScene | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    void prefetchCharacters();
  }, []);

  const [ready, setReady] = useState(false);
  const [tourStep, setTourStep] = useState<{ label: string; index: number; total: number } | null>(
    null,
  );
  useCampusObjectives();
  useOfflineSync();

  useEffect(() => startCampusPersistence(), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== "p" || e.metaKey || e.ctrlKey) return;
      if (!debugEnabled()) return;
      const s = useCampusStore.getState();
      if (s.dialogue || s.reading || s.lessonOpen) return;
      s.setPerfOpen(!s.perfOpen);
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
        // The room the student is about to walk into is warmed while the door
        // animation plays, so its 3D beat opens without a download hitch.
        if (indoors) prefetchRoomAssets(target.name);
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
        prefetchRoomAssets(`${c.roomName} ${c.roomId}`);
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
        collisionDebug: (on: boolean) => sceneRef.current?.setCollisionDebug(on),
        perf: () => sceneRef.current?.perfStats(),
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

  const move = useCallback((x: number, y: number) => {
    if (sceneRef.current) sceneRef.current.joystick = { x, y };
  }, []);

  const interact = useCallback(() => {
    sceneRef.current?.interact();
  }, []);

  const getPerfStats = useCallback(() => sceneRef.current?.perfStats() as CampusPerfStats | undefined, []);
  const resetPerfStats = useCallback(() => sceneRef.current?.resetPerfStats(), []);

  return (
    <div
      data-testid="campus-root"
      data-layer={layer}
      className="relative h-[100dvh] w-full overflow-hidden bg-[#5d7047]"
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
    </div>
  );
}
