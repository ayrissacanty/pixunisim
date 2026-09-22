import { useMemo } from "react";
import { BookOpen, CheckCircle2, Circle, Lightbulb, Lock, X } from "lucide-react";
import { useCampusStore } from "@/lib/campus/store";
import { useCourses, useLessons, useProgress } from "@/lib/data";
import { useInventory } from "@/lib/quests";
import { locationForLesson } from "@/lib/campus/lesson-index";
import { tutorItemId } from "@/lib/campus/quests";

type NodeStatus = "completed" | "in_progress" | "open" | "locked";

interface SkillNode {
  lessonId: string;
  title: string;
  standard: string | null;
  status: NodeStatus;
  score: number | null;
  tutorSessions: number;
  room: string;
  teacher: string;
}

/**
 * Module hub: every course is a skill track. Each lesson is a node showing its
 * objective, whether it is completed, and how many tutoring sessions the
 * student has banked against it.
 */
export function ModulesHub() {
  const open = useCampusStore((s) => s.modulesOpen);
  const setOpen = useCampusStore((s) => s.setModulesOpen);
  const openLesson = useCampusStore((s) => s.openLesson);
  const { data: courses } = useCourses();
  const { data: lessons } = useLessons();
  const { data: progress } = useProgress();
  const { data: inventory } = useInventory();

  const tracks = useMemo(() => {
    const rows = lessons ?? [];
    return (courses ?? []).map((course) => {
      const ordered = rows
        .filter((l) => l.course_id === course.id)
        .sort((a, b) => a.sort_order - b.sort_order);
      let priorDone = true;
      const nodes: SkillNode[] = ordered.map((lesson) => {
        const row = progress?.find((p) => p.lesson_id === lesson.id);
        const insight = inventory?.find((i) => i.item_id === tutorItemId(lesson.id));
        const status: NodeStatus = row
          ? row.status === "completed"
            ? "completed"
            : "in_progress"
          : priorDone
            ? "open"
            : "locked";
        priorDone = status === "completed";
        const loc = locationForLesson(lesson.id);
        return {
          lessonId: lesson.id,
          title: lesson.title,
          standard: lesson.standard_code ?? null,
          status,
          score: row?.score ?? null,
          tutorSessions: insight?.quantity ?? 0,
          room: loc?.roomName ?? loc?.zoneName ?? "Traditional Workspace",
          teacher: loc?.teacher ?? "Alley",
        };
      });
      const done = nodes.filter((n) => n.status === "completed").length;
      return { course, nodes, done };
    });
  }, [courses, lessons, progress, inventory]);

  const tutorTotal = useMemo(
    () =>
      (inventory ?? [])
        .filter((i) => i.item_id.startsWith("insight-"))
        .reduce((sum, i) => sum + i.quantity, 0),
    [inventory],
  );

  if (!open) return null;

  return (
    <div
      data-testid="modules-hub"
      data-tutor-sessions={tutorTotal}
      className="academy absolute inset-0 z-40 flex items-center justify-center bg-background/80 p-3 backdrop-blur-sm"
    >
      <div className="block-panel flex max-h-full w-full max-w-3xl flex-col overflow-hidden border-accent/60 bg-card">
        <div className="flex items-center gap-2 border-b-[3px] border-accent/60 bg-accent px-4 py-2.5">
          <BookOpen className="size-4 text-accent-foreground" aria-hidden="true" />
          <h2 className="font-display text-sm font-black uppercase tracking-[0.18em] text-accent-foreground">
            Modules
          </h2>
          <span className="ml-2 rounded-full bg-accent-foreground/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent-foreground">
            {tutorTotal} tutoring session{tutorTotal === 1 ? "" : "s"}
          </span>
          <button
            type="button"
            aria-label="Close the module hub"
            onClick={() => setOpen(false)}
            className="ml-auto rounded-full bg-accent-foreground/15 p-1 text-accent-foreground hover:bg-accent-foreground/30"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="space-y-5 overflow-y-auto p-4">
          <SkillTrees
            onOpen={(lessonId, courseId) => {
              setOpen(false);
              openLesson(lessonId, courseId);
            }}
          />
          {tracks.length === 0 && (
            <p className="text-sm text-muted-foreground">Loading your course tracks…</p>
          )}
          {tracks.map(({ course, nodes, done }) => (
            <section key={course.id} data-track={course.id}>
              <header className="flex flex-wrap items-baseline gap-2">
                <h3 className="font-display text-base font-bold">{course.title}</h3>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {course.subject} · {done}/{nodes.length} mastered
                </span>
              </header>

              <ol className="mt-2 space-y-2">
                {nodes.map((node) => (
                  <li
                    key={node.lessonId}
                    data-skill-node={node.lessonId}
                    data-status={node.status}
                    className="block-panel flex flex-wrap items-center gap-2 bg-background/60 p-2.5"
                  >
                    {node.status === "completed" ? (
                      <CheckCircle2 className="size-4 shrink-0 text-primary" aria-hidden="true" />
                    ) : node.status === "locked" ? (
                      <Lock className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    ) : (
                      <Circle className="size-4 shrink-0 text-accent" aria-hidden="true" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">{node.title}</p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        Objective: master {node.standard ?? node.title} with {node.teacher} ·{" "}
                        {node.room}
                      </p>
                    </div>
                    {node.tutorSessions > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                        <Lightbulb className="size-3" aria-hidden="true" /> {node.tutorSessions}
                      </span>
                    )}
                    {node.score != null && (
                      <span className="text-[11px] font-bold text-primary">{node.score}%</span>
                    )}
                    <button
                      type="button"
                      disabled={node.status === "locked"}
                      onClick={() => {
                        setOpen(false);
                        openLesson(node.lessonId, course.id);
                      }}
                      className="block-btn border-primary/40 bg-primary px-2.5 py-1 text-[11px] font-black uppercase tracking-wider text-primary-foreground disabled:opacity-40"
                    >
                      {node.status === "completed" ? "Review" : "Open"}
                    </button>
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
