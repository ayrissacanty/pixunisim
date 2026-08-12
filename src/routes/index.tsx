import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Unify University — A Playable Campus" },
      {
        name: "description",
        content:
          "Walk a pixel-art campus, meet faculty, attend real lessons, and track progress in a traditional workspace.",
      },
      { property: "og:title", content: "Unify University — A Playable Campus" },
      {
        property: "og:description",
        content:
          "Walk a pixel-art campus, meet faculty, attend real lessons, and track progress in a traditional workspace.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { user, loading } = useAuth();

  return (
    <main className="min-h-screen bg-sidebar text-sidebar-foreground">
      <section className="mx-auto max-w-4xl px-6 py-24 text-center">
        <p className="text-[11px] uppercase tracking-[0.35em] text-accent">Est. Unify</p>
        <h1 className="mt-4 font-display text-5xl font-bold leading-tight text-sidebar-foreground sm:text-6xl">
          Unify University
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-base text-sidebar-foreground/80">
          A campus you can actually walk. Cross the Welcome Plaza, sit in a real classroom, talk to
          faculty, and study a pre-authored curriculum — then review the same record in a calm,
          traditional workspace.
        </p>
        <div className="mt-9 flex flex-wrap justify-center gap-3">
          {loading ? null : user ? (
            <>
              <Button asChild size="lg">
                <Link to="/campus">Enter the campus</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/workspace">Open workspace</Link>
              </Button>
            </>
          ) : (
            <Button asChild size="lg">
              <Link to="/auth">Enrol or sign in</Link>
            </Button>
          )}
        </div>
        <dl className="mx-auto mt-16 grid max-w-3xl gap-4 text-left sm:grid-cols-3">
          {[
            ["Explore", "Thirteen hand-built zones, from the Library stacks to the Study Gardens."],
            ["Attend", "Lessons, worked examples and knowledge checks written by faculty."],
            ["Track", "One shared record across the RPG world and the workspace."],
          ].map(([title, body]) => (
            <div key={title} className="rounded-md border border-sidebar-border bg-sidebar-accent p-4">
              <dt className="font-display text-sm font-bold text-accent">{title}</dt>
              <dd className="mt-1 text-xs text-sidebar-foreground/80">{body}</dd>
            </div>
          ))}
        </dl>
      </section>
    </main>
  );
}
