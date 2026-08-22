import { useEffect, useMemo, useState } from "react";
import { useCampusStore } from "@/lib/campus/store";
import { useAlleyDialogue, useLesson, useProgress, progressFor } from "@/lib/data";
import { CharacterStage, type StageActor } from "@/components/three/CharacterStage";
import { propsForRoom } from "@/lib/props3d";
import { prefetchRoomAssets } from "@/lib/room-assets";
import { classmatesFor, TEACHER_CHARACTER } from "@/lib/characters";
import { useAvatar } from "@/lib/profile";
import { Button } from "@/components/ui/button";

/**
 * Layer 3 — the classroom beat. The teacher greets the student, talks through
 * a short scripted exchange, and the student explicitly starts the class; the
 * first objective of the lesson is shown before they commit.
 */
export function ClassroomBeat() {
  const classroom = useCampusStore((s) => s.classroom);
  const openLesson = useCampusStore((s) => s.openLesson);
  const leaveClassroom = useCampusStore((s) => s.leaveClassroom);
  const lessonOpen = useCampusStore((s) => s.lessonOpen);
  const objective = useCampusStore((s) => s.currentObjective);
  const { data: lesson } = useLesson(classroom?.lessonId);
  const { data: progress } = useProgress();
  const { data: lines } = useAlleyDialogue(classroom?.roomId);
  const avatar = useAvatar();

  const roomId = classroom?.roomId;
  const roomName = classroom?.roomName;
  const phase = classroom?.phase;

  // Alley at the board, the student front-and-centre, classmates either side.
  const cast = useMemo<StageActor[]>(() => {
    const mates = classmatesFor(roomId ?? "room", 2, avatar);
    return [
      { character: TEACHER_CHARACTER, x: 0, z: -3, rotation: 0, scale: 1.02 },
      { character: avatar, x: 0, z: 0.8, rotation: Math.PI },
      { character: mates[0]!, x: -1.9, z: -0.2, rotation: Math.PI - 0.35, scale: 0.97 },
      { character: mates[1]!, x: 1.9, z: -0.2, rotation: Math.PI + 0.35, scale: 0.97 },
    ];
  }, [roomId, avatar]);

  const roomProps = useMemo(
    () => propsForRoom(`${roomName ?? ""} ${roomId ?? ""}`),
    [roomName, roomId],
  );

  // Warm this room's models the moment the beat mounts (they are usually
  // already cached from the corridor prefetch).
  useEffect(() => {
    if (roomId) prefetchRoomAssets(`${roomName ?? ""} ${roomId}`);
  }, [roomId, roomName]);

  const seen = progressFor(progress, classroom?.lessonId ?? "");
  const context = phase === "dismiss" ? "completion" : seen ? "lesson_resume" : "lesson_start";
  const scripted = lines?.filter((l) => l.trigger_context === context).map((l) => l.text) ?? [];

  /** The teacher's scripted exchange for this beat. */
  const script = useMemo(() => {
    if (phase === "dismiss") {
      return scripted.length
        ? scripted
        : ["That is the bell. Nice work today — your progress is already saved."];
    }
    const opening = scripted.length
      ? scripted
      : [
          lesson?.alley_greeting ??
            (seen
              ? `Good to see you back. Let's pick up ${lesson?.title ?? "where we left off"}.`
              : `Welcome to ${roomName ?? "class"}. Today we cover ${lesson?.title ?? "our next topic"}.`),
        ];
    const outline = lesson?.summary ? [lesson.summary] : [];
    const firstStep = lesson?.sections?.[0]?.title
      ? [`We'll start with: ${lesson.sections[0]!.title}. Take a seat when you're ready.`]
      : ["Take a seat when you're ready and we'll begin."];
    return [...opening, ...outline, ...firstStep];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, lesson, roomName, seen, scripted.join("|")]);

  const [step, setStep] = useState(0);
  useEffect(() => setStep(0), [roomId, phase, script.length]);

  // Hold the beat until the room has actually rendered.
  const [castReady, setCastReady] = useState(false);
  useEffect(() => setCastReady(false), [roomId, phase]);

  // Only the goodbye beat plays itself out; starting a class is always the
  // student's own decision.
  useEffect(() => {
    if (!classroom || lessonOpen || phase !== "dismiss") return;
    const timer = window.setTimeout(() => leaveClassroom(), castReady ? 4000 : 9000);
    return () => window.clearTimeout(timer);
  }, [classroom, phase, lessonOpen, castReady, leaveClassroom]);

  if (!classroom || lessonOpen) return null;

  const atEnd = step >= script.length - 1;
  const line = script[Math.min(step, script.length - 1)] ?? "";
  const start = () => openLesson(classroom.lessonId, classroom.courseId, classroom.roomId);

  return (
    <div
      data-testid="classroom-beat"
      data-phase={phase}
      data-room={classroom.roomId}
      data-line-index={step}
      data-line-total={script.length}
      className="absolute inset-0 z-40 flex flex-col justify-end bg-[#2b2118]"
    >
      <div className="absolute inset-0 overflow-hidden">
        <div data-testid="beat-teacher" className="absolute inset-0">
          <CharacterStage
            actors={cast}
            props={roomProps}
            shell={{ width: 9.4, depth: 11.5, height: 2.8, door: true, windows: true }}
            camera={{ y: 2.3, z: 6.6, lookY: 1.1, fov: 42 }}
            floorColor={0x8a6a45}
            height={520}
            onReady={() => setCastReady(true)}
            background={0x8a6a45}
            className="h-full w-full overflow-hidden"
          />
        </div>
      </div>

      <div className="relative z-10 m-3 rounded-md border-2 border-accent bg-sidebar/95 p-4 text-sidebar-foreground shadow-2xl sm:m-6">
        <p className="font-display text-xs uppercase tracking-wide text-accent">
          {classroom.roomName}
        </p>
        <p data-testid="beat-line" className="mt-1 font-display text-sm">
          <span className="font-bold">{classroom.teacher}:</span> {line}
        </p>

        {phase === "arrive" && objective && (
          <p
            data-testid="beat-objective"
            className="mt-3 rounded-sm border-l-4 border-accent bg-background/40 px-3 py-2 text-xs"
          >
            <span className="font-display uppercase tracking-wide text-accent">Objective</span>{" "}
            {objective}
          </p>
        )}

        <div className="mt-3 flex flex-wrap gap-2">
          {phase === "arrive" ? (
            <>
              {!atEnd && (
                <Button size="sm" variant="secondary" onClick={() => setStep((s) => s + 1)}>
                  Next
                </Button>
              )}
              <Button size="sm" data-testid="start-class" onClick={start}>
                Start the class
              </Button>
              <Button size="sm" variant="ghost" onClick={leaveClassroom}>
                Not now
              </Button>
            </>
          ) : (
            <Button size="sm" onClick={leaveClassroom}>
              Leave the classroom
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
