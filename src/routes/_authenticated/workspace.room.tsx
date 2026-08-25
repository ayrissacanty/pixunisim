import { createFileRoute, Link } from "@tanstack/react-router";
import { CharacterAvatar } from "@/components/campus/CharacterAvatar";
import { PortraitView } from "@/components/campus/PortraitView";
import { MascotView } from "@/components/campus/MascotView";
import { useAvatar, useMascot, usePortrait, useProfile } from "@/lib/profile";
import { useCourses, useLessons, useProgress } from "@/lib/data";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/workspace/room")({
  head: () => ({
    meta: [
      { title: "Your student space — Unify University" },
      {
        name: "description",
        content:
          "Step into your personal study room at Unify University: your character, your desk and your study streak.",
      },
      { property: "og:title", content: "Your student space — Unify University" },
      {
        property: "og:description",
        content: "A personal study room where your character rests between classes.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StudentSpace,
});

function StudentSpace() {
  const avatar = useAvatar();
  const portrait = usePortrait();
  const mascot = useMascot();
  const { data: profile } = useProfile();
  const { data: courses } = useCourses();
  const { data: lessons } = useLessons();
  const { data: progress } = useProgress();

  const done = (progress ?? []).filter((p) => p.status === "completed");
  const inProgress = (progress ?? []).filter((p) => p.status === "in_progress");
  const nextLesson = (lessons ?? []).find(
    (l) => !(progress ?? []).some((p) => p.lesson_id === l.id && p.status === "completed"),
  );
  const nextCourse = (courses ?? []).find((c) => c.id === nextLesson?.course_id);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Your student space</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {profile?.display_name
              ? `${profile.display_name}'s room — desk, shelves and a place to think.`
              : "Your room — desk, shelves and a place to think."}
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link to="/workspace/avatar">Customise character</Link>
          </Button>
          <Button asChild>
            <Link to="/workspace">Back to workspace</Link>
          </Button>
        </div>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-[1fr_260px]">
        <section
          data-testid="dorm-room"
          className="block-panel-lg relative overflow-hidden border-warm-brown bg-[var(--linen)]"
        >
          <div className="relative h-[400px]">
            <div className="absolute inset-x-0 bottom-0 h-[38%] bg-warm-brown" />
            <div className="absolute left-[8%] top-[12%] block-panel size-24 border-warm-brown bg-[var(--sky)]" aria-hidden />
            <div className="absolute right-[10%] top-[14%] block-panel h-28 w-36 border-warm-brown bg-ochre/70" aria-hidden>
              <div className="mt-2 space-y-2 px-2">
                <div className="h-3 rounded-sm bg-bordeaux/70" />
                <div className="h-3 rounded-sm bg-deep-green/70" />
                <div className="h-3 rounded-sm bg-terracotta/70" />
              </div>
            </div>
            <div className="absolute bottom-[30%] left-[12%] block-panel h-16 w-40 border-warm-brown bg-sage" aria-hidden />
            <div className="absolute bottom-[28%] right-[14%] block-panel h-14 w-28 border-warm-brown bg-terracotta/80" aria-hidden />
            <div className="absolute bottom-[10%] left-1/2 -translate-x-1/2">
              <CharacterAvatar character={avatar} size={140} />
            </div>
          </div>
        </section>

        <aside className="space-y-4">
          <div className="flex flex-col items-center rounded-md border border-border bg-card p-3">
            <MascotView mascot={mascot} size={110} />
            <p className="mt-2 text-center text-xs text-muted-foreground">Your mascot</p>
          </div>

          <div className="rounded-md border border-border bg-card p-3">
            <PortraitView portrait={portrait} />
            <p className="mt-2 text-center text-xs text-muted-foreground">Your dialogue portrait</p>
          </div>


          <div className="rounded-md border border-border bg-card p-4 text-sm">
            <p className="font-semibold">Study log</p>
            <p className="mt-2 text-muted-foreground">
              {done.length} lesson{done.length === 1 ? "" : "s"} completed
            </p>
            <p className="text-muted-foreground">
              {inProgress.length} in progress
            </p>
            {nextLesson && (
              <div className="mt-3 border-t border-border pt-3">
                <p className="text-xs uppercase tracking-widest text-accent">Up next</p>
                <p className="mt-1 font-medium">{nextLesson.title}</p>
                {nextCourse && (
                  <p className="text-xs text-muted-foreground">{nextCourse.title}</p>
                )}
                <Button asChild size="sm" className="mt-3 w-full">
                  <Link to="/workspace/lesson/$lessonId" params={{ lessonId: nextLesson.id }}>
                    Open lesson
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </aside>
      </div>
    </main>
  );
}
