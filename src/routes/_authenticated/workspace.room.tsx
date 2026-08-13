import { createFileRoute, Link } from "@tanstack/react-router";
import { CharacterStage } from "@/components/three/CharacterStage";
import { PortraitView } from "@/components/campus/PortraitView";
import { DORM_PROPS } from "@/lib/props3d";
import { useAvatar, usePortrait, useProfile } from "@/lib/profile";
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
        content: "A personal 3D study room where your character rests between classes.",
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
        <CharacterStage
          actors={[{ character: avatar, x: 0, z: 0.2, rotation: 0 }]}
          props={DORM_PROPS}
          camera={{ x: 0, y: 2.4, z: 6.4, lookY: 1, fov: 44 }}
          background={0x241c15}
          floorColor={0x7a5a3c}
          height={400}
        />

        <aside className="space-y-4">
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
