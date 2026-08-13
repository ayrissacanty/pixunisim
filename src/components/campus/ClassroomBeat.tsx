import { useEffect, useMemo } from "react";
import { useCampusStore } from "@/lib/campus/store";
import { useAlleyDialogue, useLesson, useProgress, progressFor } from "@/lib/data";
import { CharacterStage, type StageActor } from "@/components/three/CharacterStage";
import { classmatesFor, TEACHER_CHARACTER } from "@/lib/characters";
import { useAvatar } from "@/lib/profile";
import { Button } from "@/components/ui/button";

/**
 * Layer 3 — a short narrative beat inside the classroom. No pathing or
 * collision: just the room, the teacher and a greeting so the jump into
 * Layer 4 (the lesson) has continuity.
 */
export function ClassroomBeat() {
  const classroom = useCampusStore((s) => s.classroom);
  const openLesson = useCampusStore((s) => s.openLesson);
  const leaveClassroom = useCampusStore((s) => s.leaveClassroom);
  const lessonOpen = useCampusStore((s) => s.lessonOpen);
  const { data: lesson } = useLesson(classroom?.lessonId);
  const { data: progress } = useProgress();
  const { data: lines } = useAlleyDialogue(classroom?.roomId);
  const avatar = useAvatar();

  const roomId = classroom?.roomId;
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

  const phase = classroom?.phase;
  // Hold the beat until the room has actually rendered, then let it play out.
  const [castReady, setCastReady] = useState(false);
  useEffect(() => setCastReady(false), [roomId, phase]);

  useEffect(() => {
    if (!classroom || lessonOpen) return;
    const wait = castReady ? (phase === "arrive" ? 2600 : 1800) : 9000;
    const timer = window.setTimeout(() => {
      if (phase === "arrive") {
        openLesson(classroom.lessonId, classroom.courseId, classroom.roomId);
      } else {
        leaveClassroom();
      }
    }, wait);
    return () => window.clearTimeout(timer);
  }, [classroom, phase, lessonOpen, castReady, openLesson, leaveClassroom]);

  if (!classroom || lessonOpen) return null;

  const seen = progressFor(progress, classroom.lessonId);
  const context =
    phase === "dismiss" ? "completion" : seen ? "lesson_resume" : "lesson_start";
  const scripted = lines?.find((l) => l.trigger_context === context)?.text;

  const greeting =
    scripted ??
    (phase === "dismiss"
      ? "Great work today. Head back out whenever you're ready."
      : (lesson?.alley_greeting ??
        `Let's pick up where we left off${lesson ? ` with ${lesson.title}` : ""}.`));


  return (
    <div
      data-testid="classroom-beat"
      data-phase={phase}
      data-room={classroom.roomId}
      className="absolute inset-0 z-40 flex flex-col justify-end bg-[#2b2118]"
    >
      {/* Room backdrop: board, then the 3D cast standing in the room. */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-2/5 bg-[#7c6a52]" />
        <div className="absolute left-1/2 top-8 h-24 w-64 -translate-x-1/2 rounded-sm border-4 border-[#5a4630] bg-[#31462f] shadow-inner" />
        <div data-testid="beat-teacher" className="absolute inset-x-0 bottom-0 top-1/4">
          <CharacterStage
            actors={cast}
            height={420}
            background={0x8a6a45}
            className="h-full w-full overflow-hidden"
          />
        </div>
      </div>

      <div className="relative z-10 m-3 rounded-md border-2 border-accent bg-sidebar/95 p-4 text-sidebar-foreground shadow-2xl sm:m-6">
        <p className="font-display text-xs uppercase tracking-wide text-accent">
          {classroom.roomName}
        </p>
        <p className="mt-1 font-display text-sm">
          <span className="font-bold">{classroom.teacher}:</span> {greeting}
        </p>
        <div className="mt-3 flex gap-2">
          {phase === "arrive" ? (
            <Button
              size="sm"
              onClick={() =>
                openLesson(classroom.lessonId, classroom.courseId, classroom.roomId)
              }
            >
              Take your seat
            </Button>
          ) : (
            <Button size="sm" onClick={leaveClassroom}>
              Leave the classroom
            </Button>
          )}
          {phase === "arrive" && (
            <Button size="sm" variant="ghost" onClick={leaveClassroom}>
              Not now
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
