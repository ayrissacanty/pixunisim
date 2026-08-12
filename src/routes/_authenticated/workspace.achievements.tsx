import { createFileRoute, Link } from "@tanstack/react-router";
import { useCourses, useLessons, useProgress } from "@/lib/data";

export const Route = createFileRoute("/_authenticated/workspace/achievements")({
  head: () => ({
    meta: [
      { title: "Achievements — Unify University" },
      { name: "description", content: "Track your completed lessons and campus discoveries." },
      { property: "og:title", content: "Achievements — Unify University" },
      {
        property: "og:description",
        content: "Track your completed lessons and campus discoveries.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Achievements,
});

function Achievements() {
  const { data: courses } = useCourses();
  const { data: lessons } = useLessons();
  const { data: progress } = useProgress();
  const done = (progress ?? []).filter((p) => p.status === "completed");

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <Link
        to="/workspace"
        className="text-[11px] uppercase tracking-widest text-muted-foreground hover:underline"
      >
        ← Workspace
      </Link>
      <h1 className="mt-3 text-3xl font-bold">Achievements</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {done.length} lessons completed across {courses?.length ?? 0} courses.
      </p>
      <ul className="mt-6 space-y-2">
        {done.map((p) => {
          const lesson = lessons?.find((l) => l.id === p.lesson_id);
          return (
            <li
              key={p.lesson_id}
              className="rounded-md border border-secondary bg-secondary/20 px-4 py-3 text-sm"
            >
              <span className="font-medium">{lesson?.title ?? p.lesson_id}</span>
              {p.score != null && (
                <span className="ml-2 text-muted-foreground">{p.score}%</span>
              )}
            </li>
          );
        })}
        {!done.length && (
          <li className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No lessons completed yet — head to campus and attend your first class.
          </li>
        )}
      </ul>
    </main>
  );
}
