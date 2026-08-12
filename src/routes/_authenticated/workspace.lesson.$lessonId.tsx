import { createFileRoute, Link } from "@tanstack/react-router";
import { LessonPlayer } from "@/components/lesson/LessonPlayer";

export const Route = createFileRoute("/_authenticated/workspace/lesson/$lessonId")({
  head: () => ({
    meta: [
      { title: "Lesson — Unify University" },
      { name: "description", content: "Study a Unify University lesson with your assistant." },
      { property: "og:title", content: "Lesson — Unify University" },
      {
        property: "og:description",
        content: "Study a Unify University lesson with your assistant.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LessonRoute,
});

function LessonRoute() {
  const { lessonId } = Route.useParams();
  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <Link
        to="/workspace"
        className="text-[11px] uppercase tracking-widest text-muted-foreground hover:underline"
      >
        ← Workspace
      </Link>
      <div className="mt-4">
        <LessonPlayer lessonId={lessonId} />
      </div>
    </main>
  );
}
