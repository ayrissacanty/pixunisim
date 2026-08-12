import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import type Phaser from "phaser";
import { useCampusStore } from "@/lib/campus/store";
import { getZone, type InteractAction, type NpcSpawn } from "@/lib/campus/world";
import type { CampusScene } from "@/game/CampusScene";
import { CampusHud } from "@/components/campus/CampusHud";
import { DialogueBox, ReadingBox } from "@/components/campus/DialogueBox";
import { CampusMapOverlay } from "@/components/campus/CampusMapOverlay";
import { LessonOverlay } from "@/components/campus/LessonOverlay";
import { useCampusObjectives } from "@/lib/campus/objectives";
import { useOfflineSync } from "@/lib/data";

export function CampusView({ initialZone = "welcome-plaza" }: { initialZone?: string }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const sceneRef = useRef<CampusScene | null>(null);
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
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

      const runAction = (action: InteractAction, label: string) => {
        switch (action.kind) {
          case "travel":
            store.travel(action.zone, action.spawnX, action.spawnY);
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

      game.events.on("unify-talk", (npc: NpcSpawn) => {
        const choices = [] as {
          label: string;
          action: () => void;
          variant?: "primary" | "ghost";
        }[];
        if (npc.lessonId && npc.courseId) {
          choices.push({
            label: "Attend the lesson",
            action: () =>
              store.openLesson(npc.lessonId!, npc.courseId!, npc.roomId ?? undefined),
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
      });
    };

    void boot();

    return () => {
      disposed = true;
      gameRef.current?.destroy(true);
      gameRef.current = null;
      sceneRef.current = null;
    };
  }, [initialZone, navigate]);

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
  }, [pendingTravel, consumeTravel]);

  const move = (x: number, y: number) => {
    if (sceneRef.current) sceneRef.current.joystick = { x, y };
  };

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-[#5d7047]">
      <div ref={containerRef} className="absolute inset-0" aria-label="Campus world" />
      {!ready && (
        <div className="absolute inset-0 grid place-items-center bg-sidebar text-sidebar-foreground">
          <p className="font-display text-lg">Opening the campus gates…</p>
        </div>
      )}
      <CampusHud onMove={move} onAction={() => sceneRef.current?.interact()} />
      <DialogueBox />
      <ReadingBox />
      <CampusMapOverlay />
      <LessonOverlay />
    </div>
  );
}
