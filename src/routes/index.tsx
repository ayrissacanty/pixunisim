import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import campusPreview from "@/assets/campus-preview.jpg";
import alleyMascot from "@/assets/alley-mascot.png";

const DESCRIPTION =
  "Unify University is a K-12 homeschool platform where kids learn by exploring a real campus — guided by Alley, an AI teacher, on standards-aligned curriculum parents can track.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Unify University — Homeschool on a Campus Kids Can Explore" },
      { name: "description", content: DESCRIPTION },
      {
        property: "og:title",
        content: "Unify University — Homeschool on a Campus Kids Can Explore",
      },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const PILLARS = [
  {
    tag: "Explore",
    title: "A campus, not a menu",
    body: "Thirteen hand-built zones — Welcome Plaza, the Library stacks, Academic Halls, Study Gardens. Kids walk in, knock on a door, and class begins.",
  },
  {
    tag: "Alley",
    title: "An AI teacher with a syllabus",
    body: "Alley explains, re-explains and quizzes — but only from the lesson your child is in. She can't invent coursework, so the plan stays the plan.",
  },
  {
    tag: "Standards",
    title: "Real curriculum underneath",
    body: "Every lesson carries a standard code, worked examples and knowledge checks. The game is the doorway; the coursework is the point.",
  },
  {
    tag: "Parents",
    title: "One record, two views",
    body: "Scores, streaks and objectives land in a calm workspace — plus a daily Family News briefing read aloud to the whole household.",
  },
];

const STEPS = [
  ["01", "Create a family", "One parent account holds the household, the roster and the reports."],
  ["02", "Add your learners", "Share your family code; each child joins with their own student record."],
  ["03", "Walk to class", "They explore, meet faculty, sit down and complete real lessons with Alley."],
  ["04", "Read the report", "Today's Report summarises what got finished, scored and celebrated."],
];

function Landing() {
  const { user, loading } = useAuth();

  return (
    <main className="min-h-screen bg-sidebar text-sidebar-foreground">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(to right, currentColor 2px, transparent 2px), linear-gradient(to bottom, currentColor 2px, transparent 2px)",
            backgroundSize: "48px 48px",
          }}
        />
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-6 py-16 lg:grid-cols-[1.05fr_1fr] lg:py-24">
          <div>
            <span className="block-chip inline-flex items-center gap-2 border-accent/70 bg-sidebar-accent px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.22em] text-accent">
              K-12 Homeschool · Est. Unify
            </span>
            <h1 className="mt-5 font-display text-4xl font-bold leading-[1.05] sm:text-5xl lg:text-6xl">
              Homeschool that your kid
              <span className="text-accent"> actually walks into.</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-sidebar-foreground/85 sm:text-lg">
              Unify University is a full K-12 homeschool platform wearing a campus. Your child
              explores halls, gardens and classrooms, sits down with{" "}
              <strong className="text-sidebar-foreground">Alley</strong>, our AI teacher, and works
              through standards-aligned curriculum written by faculty — while you watch the record
              build in a plain, parent-friendly workspace.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              {loading ? null : user ? (
                <>
                  <Button asChild size="lg" className="text-base">
                    <Link to="/campus">Enter the campus</Link>
                  </Button>
                  <Button asChild size="lg" variant="outline" className="text-base">
                    <Link to="/workspace">Open workspace</Link>
                  </Button>
                </>
              ) : (
                <>
                  <Button asChild size="lg" className="text-base">
                    <Link to="/auth" search={{ intent: "create" }}>
                      Create a Family
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="secondary" className="text-base">
                    <Link to="/auth" search={{ intent: "join" }}>
                      Join a Family
                    </Link>
                  </Button>
                </>
              )}
            </div>
            <p className="mt-3 text-xs text-sidebar-foreground/60">
              Parents start a household. Kids join with a family code.
            </p>
          </div>

          {/* Product glimpse */}
          <div className="relative">
            <figure className="block-panel-lg overflow-hidden border-accent/70 bg-sidebar-accent">
              <img
                src={campusPreview}
                alt="Top-down pixel-art view of the Unify University campus: brick academic halls, a library with columns, lantern-lit paths and a central plaza fountain"
                width={1280}
                height={800}
                className="block w-full [image-rendering:pixelated]"
              />
              <figcaption className="flex items-center justify-between gap-3 border-t-[3px] border-accent/40 bg-sidebar px-4 py-2.5 text-[11px] uppercase tracking-[0.18em] text-sidebar-foreground/70">
                <span>Central Quad · Live world</span>
                <span className="text-accent">13 zones</span>
              </figcaption>
            </figure>

            <div className="block-panel absolute -bottom-8 -left-4 flex max-w-[16rem] items-center gap-3 border-accent/70 bg-card p-3 text-card-foreground sm:-left-8">
              <img
                src={alleyMascot}
                alt="Alley, the owl AI teacher mascot in a graduation cap"
                width={816}
                height={816}
                loading="lazy"
                className="h-14 w-14 shrink-0 [image-rendering:pixelated]"
              />
              <p className="text-xs leading-snug">
                <span className="font-display font-bold text-primary">Alley:</span> “Let’s work
                through Algebra 204 together — one step at a time.”
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* What it is */}
      <section className="border-t-[3px] border-sidebar-border bg-sidebar-accent/40">
        <div className="mx-auto max-w-6xl px-6 py-16 lg:py-20">
          <h2 className="font-display text-2xl font-bold sm:text-3xl">
            A game skin on nothing? No — a curriculum with a front door.
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PILLARS.map((p) => (
              <article
                key={p.tag}
                className="block-panel border-accent/50 bg-card p-5 text-card-foreground"
              >
                <span className="block-chip inline-block border-primary/30 bg-accent px-2 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-accent-foreground">
                  {p.tag}
                </span>
                <h3 className="mt-3 font-display text-base font-bold">{p.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-6 py-16 lg:py-20">
        <h2 className="font-display text-2xl font-bold sm:text-3xl">How a family gets started</h2>
        <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(([num, title, body]) => (
            <li key={num} className="block-panel border-sidebar-border bg-sidebar-accent p-5">
              <span className="font-display text-3xl font-bold text-accent">{num}</span>
              <h3 className="mt-2 font-display text-base font-bold">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-sidebar-foreground/75">{body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Closing CTA */}
      <section className="border-t-[3px] border-sidebar-border">
        <div className="mx-auto max-w-4xl px-6 py-16 text-center lg:py-20">
          <img
            src={alleyMascot}
            alt="Alley the AI teacher mascot waving"
            width={816}
            height={816}
            loading="lazy"
            className="mx-auto h-24 w-24 [image-rendering:pixelated]"
          />
          <h2 className="mt-4 font-display text-2xl font-bold sm:text-3xl">
            Class starts whenever your family is ready.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-sidebar-foreground/80 sm:text-base">
            Set up the household in a minute, hand your learner a family code, and let them find
            their first classroom.
          </p>
          {!loading && !user && (
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Button asChild size="lg" className="text-base">
                <Link to="/auth" search={{ intent: "create" }}>
                  Create a Family
                </Link>
              </Button>
              <Button asChild size="lg" variant="secondary" className="text-base">
                <Link to="/auth" search={{ intent: "join" }}>
                  Join a Family
                </Link>
              </Button>
            </div>
          )}
        </div>
      </section>

      <footer className="border-t-[3px] border-sidebar-border px-6 py-8 text-center text-xs text-sidebar-foreground/60">
        Unify University · A homeschool campus for K-12 families.
      </footer>
    </main>
  );
}
