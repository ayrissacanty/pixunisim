import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, ChevronLeft, ChevronRight, GraduationCap, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress as ProgressBar } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { AiTeacher } from "@/components/lesson/AiTeacher";
import { ImmersiveLessonWorld } from "@/components/lesson/three/ImmersiveLessonWorld";
import { useCampusStore } from "@/lib/campus/store";
import {
  useLesson,
  useQuestions,
  useProgress,
  useSaveProgress,
  progressFor,
  type Question,
} from "@/lib/data";

const SECTION_LABEL: Record<string, string> = {
  concept: "Concept",
  example: "Worked example",
  activity: "Try it",
};

function QuestionCard({ q, onAnswered }: { q: Question; onAnswered: (correct: boolean) => void }) {
  const [picked, setPicked] = useState<string | null>(null);
  const revealed = picked !== null;
  return (
    <div className="rounded-md border border-border bg-card p-4">
      <p className="text-sm font-medium text-foreground">{q.prompt}</p>
      <div className="mt-3 grid gap-2">
        {q.choices.map((choice) => {
          const isAnswer = choice === q.answer;
          const state = !revealed
            ? "idle"
            : choice === picked
              ? isAnswer
                ? "correct"
                : "wrong"
              : isAnswer
                ? "correct"
                : "idle";
          return (
            <button
              key={choice}
              disabled={revealed}
              onClick={() => {
                setPicked(choice);
                onAnswered(isAnswer);
              }}
              className={[
                "flex items-center gap-2 rounded-md border px-3 py-2 text-left text-sm transition-colors",
                state === "correct"
                  ? "border-secondary bg-secondary/30 text-secondary-foreground"
                  : state === "wrong"
                    ? "border-destructive bg-destructive/10 text-foreground"
                    : "border-border bg-background hover:bg-muted",
              ].join(" ")}
            >
              {state === "correct" && <CheckCircle2 className="size-4 shrink-0" />}
              {state === "wrong" && <XCircle className="size-4 shrink-0" />}
              <span>{choice}</span>
            </button>
          );
        })}
      </div>
      {revealed && (
        <p className="mt-3 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
          {q.explanation}
        </p>
      )}
    </div>
  );
}

export function LessonPlayer({
  lessonId,
  compact = false,
  onComplete,
}: {
  lessonId: string;
  compact?: boolean;
  onComplete?: () => void;
}) {
  const { data: lesson, isLoading } = useLesson(lessonId);
  const { data: questions } = useQuestions(lessonId);
  const { data: progress } = useProgress();
  const save = useSaveProgress();
  const [step, setStep] = useState(0);
  const [results, setResults] = useState<Record<string, boolean>>({});
  const [tutorOpen, setTutorOpen] = useState(false);
  const resumed = useRef(false);
  const logged = useRef(false);

  const existing = progressFor(progress, lessonId);

  // Seamless resume: the saved bookmark (shared by campus + Workspace) decides
  // the opening step the first time progress arrives.
  useEffect(() => {
    if (resumed.current || !progress || !lesson) return;
    resumed.current = true;
    const saved = existing?.last_position?.step ?? (existing ? existing.sections_read - 1 : -1);
    const max = (lesson.sections?.length ?? 0) + 1;
    if (saved > 0) setStep(Math.min(saved, Math.max(max - 1, 0)));
  }, [progress, lesson, existing]);
  // Tracker feed is shared by both views: opening a lesson in the Workspace
  // shows up on the campus HUD exactly like starting it in class does.
  useEffect(() => {
    if (logged.current || !lesson) return;
    logged.current = true;
    const done = existing?.status === "completed";
    useCampusStore
      .getState()
      .logEvent("lesson", `${done ? "Reviewing" : "Studying"} ${lesson.title}`);
  }, [lesson, existing]);

  const sections = lesson?.sections ?? [];
  const checks = useMemo(() => (questions ?? []).filter((q) => q.kind === "check"), [questions]);
  const practice = useMemo(
    () => (questions ?? []).filter((q) => q.kind === "practice"),
    [questions],
  );
  const totalSteps = sections.length + (checks.length ? 1 : 0);
  const onQuiz = step >= sections.length;

  if (isLoading || !lesson) {
    return <div className="p-6 text-sm text-muted-foreground">Loading lesson…</div>;
  }

  const answeredChecks = checks.filter((q) => q.id in results);
  const correct = answeredChecks.filter((q) => results[q.id]).length;
  const allAnswered = checks.length > 0 && answeredChecks.length === checks.length;
  const score = checks.length ? Math.round((correct / checks.length) * 100) : null;

  const persist = (status: "in_progress" | "completed", sectionsRead: number, atStep: number) =>
    save.mutateAsync({
      lesson_id: lesson.id,
      course_id: lesson.course_id,
      status,
      score: status === "completed" ? score : (existing?.score ?? null),
      sections_read: Math.max(sectionsRead, existing?.sections_read ?? 0),
      last_position: { step: atStep },
    });

  const next = () => {
    const target = Math.min(step + 1, totalSteps - 1);
    setStep(target);
    void persist("in_progress", Math.min(target + 1, sections.length), target);
  };

  const back = () => {
    const target = Math.max(0, step - 1);
    setStep(target);
    void persist("in_progress", Math.min(target + 1, sections.length), target);
  };

  // Wait for the save to settle before closing, so leaving the classroom can
  // never cancel the in-flight completion write.
  const finish = async () => {
    await persist("completed", sections.length, Math.max(totalSteps - 1, 0));
    useCampusStore
      .getState()
      .logEvent(
        "assessment",
        `Assessment recorded — ${lesson.title}${score === null ? "" : ` (${score}%)`}`,
      );
    onComplete?.();
  };

  const section = sections[step];

  return (
    <div className={compact ? "flex flex-col gap-4" : "grid gap-6 lg:grid-cols-[1fr_340px]"}>
      <div className="min-w-0">
        <div className="relative mb-4 border-l-4 border-coral bg-card px-4 py-3 shadow-[4px_4px_0_0_var(--block-edge)] before:absolute before:-top-2 before:left-5 before:h-4 before:w-12 before:-rotate-2 before:bg-sunflower/80 before:content-[''] after:absolute after:-bottom-2 after:right-7 after:h-4 after:w-10 after:rotate-3 after:bg-sky/70 after:content-['']">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{lesson.summary ? "Lesson" : "Lesson"}</Badge>
            {lesson.standard_code && <Badge variant="outline">{lesson.standard_code}</Badge>}
            {existing?.status === "completed" && (
              <Badge className="bg-secondary text-secondary-foreground">Completed</Badge>
            )}
          </div>
          <h2 className="mt-2 text-2xl font-bold text-foreground">{lesson.title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{lesson.summary}</p>
          <p className="mt-2 text-[11px] font-medium text-muted-foreground">
            {lesson.curriculum_source ?? "UNIFY authored curriculum"}
            {lesson.subject ? ` · ${lesson.subject}` : ""}
            {lesson.grade != null ? ` · Grade ${lesson.grade}` : ""}
          </p>
          <ProgressBar value={((step + 1) / Math.max(totalSteps, 1)) * 100} className="mt-4 h-2" />
          <p className="mt-1 text-xs text-muted-foreground">
            Step {step + 1} of {totalSteps}
          </p>
        </div>

        <ImmersiveLessonWorld
          subject={lesson.subject}
          title={lesson.title}
          courseId={lesson.course_id}
          sectionHeading={section?.heading}
          sectionHeadings={sections.map((s) => s.heading)}
          activeSection={step}
          onJumpToSection={(target) => {
            setStep(target);
            void persist("in_progress", Math.min(target + 1, sections.length), target);
          }}
        />

        {!onQuiz && section && (
          <article className="rounded-md border border-border bg-card p-5">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-accent">
              {SECTION_LABEL[section.type] ?? "Concept"}
            </p>
            <h3 className="mt-1 text-lg font-semibold text-foreground">{section.heading}</h3>
            <div className="mt-3 space-y-3 text-sm leading-relaxed text-foreground/90">
              {section.body.split("\n\n").map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
            {step === sections.length - 1 && practice.length > 0 && (
              <div className="mt-5 space-y-3">
                <h4 className="text-sm font-semibold">Practice</h4>
                {practice.map((q) => (
                  <QuestionCard key={q.id} q={q} onAnswered={() => undefined} />
                ))}
              </div>
            )}
          </article>
        )}

        {onQuiz && (
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <GraduationCap className="size-4 text-primary" />
              <h3 className="text-lg font-semibold">Knowledge check</h3>
            </div>
            {checks.map((q) => (
              <QuestionCard
                key={q.id}
                q={q}
                onAnswered={(ok) => setResults((r) => ({ ...r, [q.id]: ok }))}
              />
            ))}
            {allAnswered && (
              <div className="rounded-md border border-secondary bg-secondary/20 p-4">
                <p className="text-sm font-semibold">
                  You scored {score}% ({correct}/{checks.length})
                </p>
                <Button className="mt-3" disabled={save.isPending} onClick={() => void finish()}>
                  Record lesson as complete
                </Button>
              </div>
            )}
          </section>
        )}

        <div className="mt-5 flex items-center gap-2">
          <Button variant="outline" onClick={back} disabled={step === 0}>
            <ChevronLeft className="size-4" /> Back
          </Button>
          <Button onClick={next} disabled={step >= totalSteps - 1}>
            Next <ChevronRight className="size-4" />
          </Button>
          {compact && (
            <Button variant="ghost" onClick={() => setTutorOpen((v) => !v)}>
              {tutorOpen ? "Hide assistant" : "Ask assistant"}
            </Button>
          )}
        </div>

        {compact && tutorOpen && (
          <div className="mt-4 h-80">
            <AiTeacher lessonId={lesson.id} lessonTitle={lesson.title} />
          </div>
        )}
      </div>

      {!compact && (
        <aside className="h-[520px] lg:sticky lg:top-6">
          <AiTeacher lessonId={lesson.id} lessonTitle={lesson.title} />
        </aside>
      )}
    </div>
  );
}
