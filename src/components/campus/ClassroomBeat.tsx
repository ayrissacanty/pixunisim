import { useEffect } from "react";
import { useCampusStore } from "@/lib/campus/store";
import { useLesson } from "@/lib/data";
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

  const phase = classroom?.phase;
  useEffect(() => {
    if (!classroom || lessonOpen) return;
    const timer = window.setTimeout(
      () => {
        if (phase === "arrive") {
          openLesson(classroom.lessonId, classroom.courseId, classroom.roomId);
        } else {
          leaveClassroom();
        }
      },
      phase === "arrive" ? 2000 : 1500,
    );
    return () => window.clearTimeout(timer);
  }, [classroom, phase, lessonOpen, openLesson, leaveClassroom]);

  if (!classroom || lessonOpen) return null;

  const greeting =
    phase === "dismiss"
      ? "Great work today. Head back out whenever you're ready."
      : (lesson?.alley_greeting ??
        `Let's pick up where we left off${lesson ? ` with ${lesson.title}` : ""}.`);

  return (
    <div
      data-testid="classroom-beat"
      data-phase={phase}
      data-room={classroom.roomId}
      className="absolute inset-0 z-40 flex flex-col justify-end bg-[#2b2118]"
    >
      {/* Room backdrop: board, teacher, seated students, desks. */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-2/5 bg-[#7c6a52]" />
        <div className="absolute inset-x-0 bottom-0 h-3/5 bg-[#8a6a45]" />
        <div className="absolute left-1/2 top-8 h-24 w-64 -translate-x-1/2 rounded-sm border-4 border-[#5a4630] bg-[#31462f] shadow-inner" />
        <div
          data-testid="beat-teacher"
          className="absolute left-1/2 top-36 -translate-x-1/2 text-center"
        >
          <div className="mx-auto size-10 rounded-sm bg-[#e3c39b]" />
          <div className="mx-auto h-12 w-8 bg-[#8c2f39]" />
          <p className="mt-1 font-display text-xs text-sidebar-foreground">{classroom.teacher}</p>
        </div>
        <div className="absolute inset-x-0 bottom-40 flex justify-center gap-6">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="text-center">
              <div className="mx-auto size-6 rounded-sm bg-[#d9b48a]" />
              <div className="mx-auto h-7 w-6 bg-[#4d6b8a]" />
              <div className="mx-auto mt-1 h-3 w-12 bg-[#6b4a2f]" />
            </div>
          ))}
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
