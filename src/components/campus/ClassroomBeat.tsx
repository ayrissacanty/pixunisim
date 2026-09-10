import { useEffect, useMemo, useState } from "react";
import { useCampusStore } from "@/lib/campus/store";
import { useAlleyDialogue, useLesson, useProgress, progressFor } from "@/lib/data";
import { CharacterAvatar } from "@/components/campus/CharacterAvatar";
import { classmatesFor, characterOf, TEACHER_CHARACTER } from "@/lib/characters";
import { useAvatar } from "@/lib/profile";
import { Button } from "@/components/ui/button";
import { facultyForRoom } from "@/lib/campus/faculty";
import { BookOpenCheck, CheckCircle2, Circle } from "lucide-react";

/**
 * Layer 3 — the classroom beat, drawn entirely in 2D.
 *
 * An illustrated storybook classroom: chalkboard behind the teacher, the
 * student and two classmates at their desks, and the paced teacher dialogue
 * the student clicks through before choosing to start the class.
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

  const mates = useMemo(() => classmatesFor(roomId ?? "room", 2, avatar), [roomId, avatar]);

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
    const firstStep = lesson?.sections?.[0]?.heading
      ? [`We'll start with: ${lesson.sections[0]!.heading}. Take a seat when you're ready.`]
      : ["Take a seat when you're ready and we'll begin."];
    return [...opening, ...outline, ...firstStep];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, lesson, roomName, seen, scripted.join("|")]);

  const [step, setStep] = useState(0);
  useEffect(() => setStep(0), [roomId, phase, script.length]);

  // Only the goodbye beat plays itself out; starting a class is always the
  // student's own decision.
  useEffect(() => {
    if (!classroom || lessonOpen || phase !== "dismiss") return;
    const timer = window.setTimeout(() => leaveClassroom(), 4000);
    return () => window.clearTimeout(timer);
  }, [classroom, phase, lessonOpen, leaveClassroom]);

  if (!classroom || lessonOpen) return null;

  const atEnd = step >= script.length - 1;
  const line = script[Math.min(step, script.length - 1)] ?? "";
  const start = () => openLesson(classroom.lessonId, classroom.courseId, classroom.roomId);
  const teacher = characterOf(TEACHER_CHARACTER);
  const faculty = facultyForRoom(classroom.roomId);

  return (
    <div
      data-testid="classroom-beat"
      data-phase={phase}
      data-room={classroom.roomId}
      data-line-index={step}
      data-line-total={script.length}
      className="absolute inset-0 z-40 flex flex-col justify-end overflow-hidden bg-[var(--sky)]"
    >
      {/* Illustrated classroom backdrop */}
      <div className="absolute inset-0">
        <div className="absolute inset-x-0 top-0 h-[62%] bg-[var(--linen)]" />
        {/* windows */}
        <div className="absolute left-[6%] top-[12%] flex gap-3">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="block-panel size-16 border-warm-brown bg-[var(--sky)] sm:size-20"
              aria-hidden
            />
          ))}
        </div>
        {/* chalkboard */}
        <div
          className="block-panel-lg absolute left-1/2 top-[9%] w-[46%] max-w-md -translate-x-1/2 border-warm-brown bg-deep-green p-3 text-center"
          aria-hidden
        >
          <p className="font-display text-sm font-bold text-linen">{classroom.roomName}</p>
          <p className="mt-1 truncate text-[11px] text-linen/80">{lesson?.title ?? "Today's class"}</p>
        </div>
        {/* floor */}
        <div className="absolute inset-x-0 bottom-0 h-[38%] bg-warm-brown" />
        <div className="absolute inset-x-0 bottom-[38%] h-1.5 bg-[var(--block-edge-strong)]" aria-hidden />
      </div>

      {/* Cast */}
      <div className="relative z-10 flex items-end justify-center gap-6 pb-2 sm:gap-12">
        <div data-testid="beat-teacher" className="flex flex-col items-center">
          <img src={faculty.portrait} alt={faculty.name} width={768} height={768} loading="lazy" className="size-28 rounded-xl border-[3px] border-accent object-cover shadow-lg [image-rendering:pixelated]" />
          <span className="block-chip mt-1 border-warm-brown bg-ochre px-2 py-0.5 font-display text-[11px] font-bold text-[var(--warm-brown)]">
            {faculty.name ?? classroom.teacher ?? teacher.name}
          </span>
        </div>
        <div className="hidden flex-col items-center sm:flex">
          <CharacterAvatar character={mates[0]} size={80} facing="side" />
        </div>
        <div className="flex flex-col items-center">
          <CharacterAvatar character={avatar} size={92} />
          <span className="block-chip mt-1 border-warm-brown bg-linen px-2 py-0.5 font-display text-[11px] font-bold text-[var(--warm-brown)]">
            You
          </span>
        </div>
        <div className="hidden flex-col items-center sm:flex">
          <CharacterAvatar character={mates[1]} size={80} facing="side" />
        </div>
      </div>

      <div className="relative z-10 m-3 block-panel-lg border-accent bg-sidebar/95 p-4 text-sidebar-foreground sm:m-6">
        <p className="font-display text-xs uppercase tracking-wide text-accent">
          {classroom.roomName}
        </p>
        <p data-testid="beat-line" className="mt-1 font-display text-sm">
          <span className="font-bold">{faculty.name}:</span> {line}
        </p>

        {phase === "arrive" && (
          <div className="mt-3 grid gap-3 border-t border-sidebar-foreground/15 pt-3 sm:grid-cols-[1.25fr_1fr]">
            <div>
              <p className="text-xs font-semibold text-accent">{faculty.title} · {faculty.standard}</p>
              <p className="mt-1 text-xs leading-relaxed text-sidebar-foreground/75">{faculty.backstory}</p>
            </div>
            <ol className="space-y-1.5 text-xs" aria-label="Class quest steps">
              {faculty.quest.map((quest, index) => (
                <li key={quest} className="flex items-center gap-2">
                  {index === 0 ? <CheckCircle2 className="size-3.5 text-accent" /> : <Circle className="size-3.5 text-sidebar-foreground/40" />}
                  <span>{quest}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

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
                <BookOpenCheck className="size-4" /> Start the class
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
