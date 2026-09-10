import { createFileRoute, Link } from "@tanstack/react-router";
import { useCourses, useLessons, useProgress, progressFor } from "@/lib/data";
import { Progress as ProgressBar } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/workspace/")({
  head: () => ({
    meta: [
      { title: "Workspace — Unify University" },
      {
        name: "description",
        content: "Your courses, lessons and progress at Unify University in a traditional view.",
      },
      { property: "og:title", content: "Workspace — Unify University" },
      {
        property: "og:description",
        content: "Your courses, lessons and progress at Unify University in a traditional view.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: WorkspaceHome,
});

function WorkspaceHome() {
  const { data: courses } = useCourses();
  const { data: lessons } = useLessons();
  const { data: progress } = useProgress();

  const completed = (progress ?? []).filter((p) => p.status === "completed").length;
  const total = lessons?.length ?? 0;

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Workspace</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            The same courses and progress as the campus world — in a focused reading view.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="secondary">
            <Link to="/family">Today&apos;s Report</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/workspace/avatar">Your character</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/workspace/room">Your room</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/workspace/achievements">Achievements</Link>
          </Button>
          <Button asChild>
            <Link to="/campus">Enter campus</Link>
          </Button>
        </div>
      </div>

      <div className="mt-6 rounded-md border border-border bg-card p-4">
        <p className="text-sm font-semibold">
          {completed} of {total} lessons completed
        </p>
        <ProgressBar value={total ? (completed / total) * 100 : 0} className="mt-2 h-2" />
      </div>

      <div className="mt-8 space-y-8">
        {(courses ?? []).map((course) => {
          const courseLessons = (lessons ?? []).filter((l) => l.course_id === course.id);
          return (
            <section key={course.id}>
              <h2 className="text-xl font-semibold">{course.title}</h2>
              <p className="text-sm text-muted-foreground">{course.description}</p>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {courseLessons.map((lesson) => {
                  const p = progressFor(progress, lesson.id);
                  return (
                    <li key={lesson.id}>
                      <Link
                        to="/workspace/lesson/$lessonId"
                        params={{ lessonId: lesson.id }}
                        className="block rounded-md border border-border bg-background p-3 transition-colors hover:bg-muted"
                      >
                        <p className="text-sm font-medium">{lesson.title}</p>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {lesson.standard_code && (
                            <span className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-bold">
                              {lesson.standard_code}
                            </span>
                          )}
                          <span className="text-[10px] text-muted-foreground">
                            {lesson.curriculum_source ?? "UNIFY authored"}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {p?.status === "completed"
                            ? `Completed${p.score != null ? ` · ${p.score}%` : ""}`
                            : p
                              ? "In progress"
                              : "Not started"}
                        </p>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </main>
  );
}
