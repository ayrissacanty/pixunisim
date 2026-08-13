import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import type Phaser from "phaser";
import { useCampusStore } from "@/lib/campus/store";
import { getZone, ZONE_LABELS, type InteractAction, type NpcSpawn } from "@/lib/campus/world";
import { WALKTHROUGHS, buildWalkthrough } from "@/lib/campus/walkthrough";
import { isWalkableTile } from "@/lib/campus/walkable";

import type { CampusScene } from "@/game/CampusScene";
import { CampusHud } from "@/components/campus/CampusHud";
import { DialogueBox, ReadingBox } from "@/components/campus/DialogueBox";
import { CampusMapOverlay } from "@/components/campus/CampusMapOverlay";
import { LessonOverlay } from "@/components/campus/LessonOverlay";
import { ClassroomBeat } from "@/components/campus/ClassroomBeat";
import { LayerTransition } from "@/components/campus/LayerTransition";
import { useCampusObjectives } from "@/lib/campus/objectives";
import { useOfflineSync } from "@/lib/data";
import { prefetchCharacters } from "@/components/three/CharacterStage";

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
  // Warm the 3D cast while the student is still walking around outside.
  useEffect(() => {
    void prefetchCharacters();
  }, []);
  const [ready, setReady] = useState(false);
  const [tourStep, setTourStep] = useState<{ label: string; index: number; total: number } | null>(
    null,
  );
  useCampusObjectives();
  useOfflineSync();



  useEffect(() => {
    let disposed = false;

    const boot = async () => {
      const [{ default: PhaserLib }, { CampusScene: Scene }] = await Promise.all([
        import("phaser"),
        import("@/game/CampusScene"),
      ]);
      if (disposed || !containerRef.current) return;

      const zone = getZone(initialZone);
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
        x: zone.defaultSpawn.x,
        y: zone.defaultSpawn.y,
      });
      sceneRef.current = game.scene.getScene("campus") as CampusScene;
      setReady(true);

      const store = useCampusStore.getState();

      /** Layer 1 <-> Layer 2 movement, always through an animated beat. */
      const enterZone = (zoneId: string, x: number, y: number) => {
        const target = getZone(zoneId);
        const current = useCampusStore.getState();
        if (current.transition) return;
        store.rememberPosition(
          current.currentZone,
          current.playerPosition.x,
          current.playerPosition.y,
        );
        // Returning to a zone puts you back exactly where you left it.
        const remembered = current.zoneMemory[zoneId];
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
        window.setTimeout(() => store.travel(zoneId, spawnX, spawnY), 340);
      };

      /** Layer 2 -> Layer 3: the classroom beat. */
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
        }, 420);
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

      /** Walking into a doorway transitions automatically (no key press). */
      game.events.on("unify-door", (action: InteractAction) => {
        if (action.kind !== "travel") return;
        const s = useCampusStore.getState();
        if (s.dialogue || s.reading || s.lessonOpen || s.mapOpen || s.transition) return;
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
        store.openDialogue({ speaker: npc.name, role: npc.role, lines: npc.lines, choices });
        store.discover(npc.id);
      };

      game.events.on("unify-talk", talkTo);

      /** Scripted camera route: /campus?tour=algebra-204 */
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

      // Test/automation hook used by the Playwright end-to-end walkthrough.
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
        walkable: (zoneId: string, x: number, y: number) => isWalkableTile(getZone(zoneId), x, y),
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


  // Zone changes (doors, fast travel) restart the scene in place.
  const pendingTravel = useCampusStore((s) => s.pendingTravel);
  const consumeTravel = useCampusStore((s) => s.consumeTravel);
  useEffect(() => {
    if (!pendingTravel || !gameRef.current) return;
    const { zone, x, y } = pendingTravel;
    consumeTravel();
    gameRef.current.scene.stop("campus");
    gameRef.current.scene.start("campus", { zoneId: zone, x, y });
    sceneRef.current = gameRef.current.scene.getScene("campus") as CampusScene;
    const t = window.setTimeout(() => useCampusStore.getState().endTransition(), 260);
    return () => window.clearTimeout(t);
  }, [pendingTravel, consumeTravel]);

  const layer = useCampusStore((s) => s.layer);

  const move = (x: number, y: number) => {
    if (sceneRef.current) sceneRef.current.joystick = { x, y };
  };

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
          className="pointer-events-none absolute left-1/2 top-4 z-40 -translate-x-1/2 rounded-md border-2 border-accent bg-sidebar/95 px-4 py-2 font-display text-sm text-sidebar-foreground shadow-lg"
        >
          Guided route: {tourStep.label}
        </div>
      )}

      <CampusHud onMove={move} onAction={() => sceneRef.current?.interact()} />
      <DialogueBox />
      <ReadingBox />
      <CampusMapOverlay />
      <ClassroomBeat />
      <LessonOverlay />
      <LayerTransition />
    </div>
  );
}
