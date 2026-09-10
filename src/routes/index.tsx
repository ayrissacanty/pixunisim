import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import campusPreview from "@/assets/campus-preview.jpg";
import alleyMascot from "@/assets/alley-mascot.png";
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Feather,
  MapPin,
  BookOpen,
  Landmark,
  Users,
  Compass,
} from "lucide-react";
import { FACULTY } from "@/lib/campus/faculty";

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

type Room = "classroom" | "library" | "hall";

const ROOMS: { id: Room; label: string; tag: string; title: string; badge: string }[] = [
  { id: "classroom", label: "Classroom #1", tag: "Active Session", title: "Algebra 204: Linear Equations", badge: "Standard Code: HS-ALG.2" },
  { id: "library", label: "The Library", tag: "Reading Stacks", title: "American Literature Archive", badge: "Quiet Zone" },
  { id: "hall", label: "Academic Hall", tag: "Central Junction", title: "Main Academic Hallway", badge: "13 Zones Unlocked" },
];

function Landing() {
  const { user, loading } = useAuth();
  const [room, setRoom] = useState<Room>("classroom");
  const enterHref = user ? "/campus" : "/auth";

  return (
    <main className="manor min-h-screen bg-background font-body text-foreground selection:bg-primary">
      {/* Top Navigation */}
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-secondary bg-primary text-foreground shadow-lg">
              <Feather className="h-5 w-5" />
            </div>
            <div>
              <span className="block font-display text-xl font-bold tracking-tight text-foreground">UNIFY</span>
              <span className="block text-[11px] uppercase tracking-[0.2em] text-muted-foreground">K-12 Pixel Campus</span>
            </div>
          </div>

          <nav className="hidden items-center gap-8 text-sm font-medium text-foreground/80 md:flex">
            <a href="#world" className="transition-colors hover:text-accent">The World</a>
            <a href="#curriculum" className="transition-colors hover:text-accent">Curriculum</a>
            <a href="#parents" className="transition-colors hover:text-accent">Parent Ledger</a>
          </nav>

          <div className="flex items-center gap-4">
            {loading ? null : user ? (
              <>
                <Button asChild variant="ghost" size="sm">
                  <Link to="/workspace">Workspace</Link>
                </Button>
                <Button asChild size="sm">
                  <Link to="/campus">Enter Campus</Link>
                </Button>
              </>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm">
                  <Link to="/auth">Sign In</Link>
                </Button>
                <Button asChild size="sm">
                  <Link to="/auth" search={{ intent: "create" }}>
                    Open Household
                  </Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border/30 pb-24 pt-12 lg:pb-32 lg:pt-20">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 lg:grid-cols-12">
          {/* Left */}
          <div className="space-y-8 lg:col-span-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted px-3.5 py-1.5 text-xs font-medium text-foreground/80">
              <Sparkles className="h-3.5 w-3.5 text-accent" />
              <span>A hand-crafted pixel campus for K-12</span>
            </div>

            <h1 className="font-display text-5xl font-normal leading-[1.1] tracking-tight text-foreground lg:text-7xl">
              Homeschooling,
              <br />
              <span className="font-light italic text-accent">built as a living world.</span>
            </h1>

            <p className="max-w-xl text-lg font-normal leading-relaxed text-muted-foreground">
              Step away from sterile, flat software. Unify gives your child an exquisite, hand-drawn pixel world of
              academic halls, quiet study corners, and interactive classrooms — paired with a calm, rigorous workspace
              for parents.
            </p>

            <div className="flex flex-col items-stretch gap-4 pt-2 sm:flex-row sm:items-center">
              {loading ? null : user ? (
                <Button asChild size="lg" className="gap-3 text-base">
                  <Link to="/campus">
                    Enter the Campus
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              ) : (
                <Button asChild size="lg" className="gap-3 text-base">
                  <Link to="/auth" search={{ intent: "create" }}>
                    Start Your Household
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              )}
              <div className="flex items-center justify-center gap-2 px-2 text-xs text-muted-foreground/80 sm:justify-start">
                <ShieldCheck className="h-4 w-4 text-accent" />
                <span>Standards-aligned curriculum underneath every room.</span>
              </div>
              <Button asChild variant="ghost" className="w-fit gap-2 px-0 text-accent hover:bg-transparent hover:text-foreground">
                <Link to="/campus-preview"><Compass className="size-4" /> Tour the campus without signing in</Link>
              </Button>
            </div>
          </div>

          {/* Right — immersive room preview frame */}
          <div className="lg:col-span-6">
            <div className="relative rounded-3xl border border-border bg-card p-4 shadow-2xl">
              {/* Room selector tabs */}
              <div className="mb-4 flex gap-1.5 rounded-2xl border border-border/50 bg-background p-1.5">
                {ROOMS.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setRoom(r.id)}
                    className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2 text-xs font-medium transition-all ${
                      room === r.id
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <MapPin className="h-3.5 w-3.5" />
                    <span>{r.label}</span>
                  </button>
                ))}
              </div>

              {/* Atmosphere frame */}
              <div className="relative space-y-6 overflow-hidden rounded-2xl border border-border/60 bg-background p-6">
                <div className="pointer-events-none absolute right-0 top-0 p-4 font-mono text-xs opacity-10">
                  ZONE_ACTIVE // 01
                </div>

                {ROOMS.map((r) =>
                  room === r.id ? (
                    <div key={r.id} className="space-y-4">
                      <div className="flex items-center justify-between border-b border-border/40 pb-4">
                        <div>
                          <span className="text-xs font-semibold uppercase tracking-wider text-accent">{r.tag}</span>
                          <h3 className="font-display text-xl font-bold text-foreground">{r.title}</h3>
                        </div>
                        <span className="rounded-full border border-border/60 bg-primary/40 px-3 py-1 font-mono text-xs text-accent">
                          {r.badge}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 rounded-xl border border-border/50 bg-card p-5">
                        {r.id === "classroom" ? (
                          <img
                            src={alleyMascot}
                            alt="Alley, the owl AI teacher mascot in a graduation cap"
                            width={816}
                            height={816}
                            loading="lazy"
                            className="h-14 w-14 shrink-0 rounded-xl border border-secondary bg-primary [image-rendering:pixelated]"
                          />
                        ) : (
                          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-secondary bg-primary text-accent">
                            {r.id === "library" ? <BookOpen className="h-6 w-6" /> : <Landmark className="h-6 w-6" />}
                          </div>
                        )}
                        <div className="space-y-1">
                          {r.id === "classroom" ? (
                            <>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-foreground">Alley</span>
                                <span className="rounded bg-accent/20 px-2 py-0.5 text-[10px] text-accent">AI Instructor</span>
                              </div>
                              <p className="text-xs italic text-foreground/80">
                                “Take a seat at desk four. Let’s break down slope-intercept forms together, step by step.”
                              </p>
                            </>
                          ) : (
                            <>
                              <span className="text-sm font-bold text-foreground">
                                {r.id === "library" ? "Primary Text Collection" : "The Grand Quad"}
                              </span>
                              <p className="text-xs text-foreground/80">
                                {r.id === "library"
                                  ? "Explore classic primary sources, historical letters, and guided comprehension checks."
                                  : "Navigate between science labs, history corridors, and the administrative parent ledger."}
                              </p>
                            </>
                          )}
                        </div>
                      </div>

                      <Button asChild className="w-full gap-2">
                        <Link to={enterHref}>
                          {r.id === "classroom"
                            ? "Sit Down & Enter Lesson"
                            : r.id === "library"
                              ? "Browse Library Stacks"
                              : "Walk the Hallway"}
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  ) : null,
                )}
              </div>
            </div>

            {/* Glimpse of the real world */}
            <figure className="mt-6 overflow-hidden rounded-2xl border border-border bg-card">
              <img
                src={campusPreview}
                alt="Top-down pixel-art view of the Unify University campus: brick academic halls, a library with columns, lantern-lit paths and a central plaza fountain"
                width={1280}
                height={800}
                loading="lazy"
                className="block w-full [image-rendering:pixelated]"
              />
              <figcaption className="flex items-center justify-between gap-3 border-t border-border/60 bg-background px-4 py-2.5 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                <span>Central Quad · Live world</span>
                <span className="text-accent">13 zones</span>
              </figcaption>
            </figure>
          </div>
        </div>
      </section>

      {/* What it is */}
      <section id="world" className="border-b border-border/30 bg-muted/40">
        <div className="mx-auto max-w-7xl px-6 py-16 lg:py-20">
          <h2 className="font-display text-2xl font-bold sm:text-3xl">
            A game skin on nothing? No — a curriculum with a front door.
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PILLARS.map((p) => (
              <article key={p.tag} className="rounded-2xl border border-border/60 bg-card p-5 text-card-foreground">
                <span className="inline-block rounded-lg border border-border/60 bg-primary px-2 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-accent">
                  {p.tag}
                </span>
                <h3 className="mt-3 font-display text-base font-bold">{p.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-border/30 bg-[#141210]">
        <div className="mx-auto max-w-7xl px-6 py-16 lg:py-20">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[.22em] text-accent">Meet the faculty</p>
            <h2 className="mt-2 font-display text-3xl font-bold">Every room has a keeper and a quest.</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">Faculty dialogue gives each subject a memorable voice. Standards, lesson records, and parent controls remain visible beneath the story.</p>
          </div>
          <div className="mt-8 grid gap-5 lg:grid-cols-3">
            {FACULTY.map((faculty) => (
              <article key={faculty.id} className="group overflow-hidden rounded-2xl border border-border bg-card">
                <div className="relative aspect-[16/10] overflow-hidden bg-primary">
                  <img src={faculty.portrait} alt={`${faculty.name}, ${faculty.title}`} width={768} height={768} loading="lazy" className="h-full w-full object-cover object-[center_28%] transition-transform duration-500 group-hover:scale-105 [image-rendering:pixelated]" />
                  <span className="absolute bottom-3 left-3 rounded-md border border-[#eedcc5]/25 bg-[#141210]/85 px-2 py-1 text-[10px] font-bold text-[#eedcc5] backdrop-blur">{faculty.standard}</span>
                </div>
                <div className="p-5">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-accent">{faculty.title}</p>
                  <h3 className="mt-1 font-display text-xl font-bold">{faculty.name}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{faculty.backstory}</p>
                  <ol className="mt-4 space-y-2 border-t border-border/50 pt-4">
                    {faculty.quest.map((step, index) => <li key={step} className="flex items-center gap-2 text-xs"><span className="flex size-5 items-center justify-center rounded-full bg-primary font-mono text-[10px] text-primary-foreground">{index + 1}</span>{step}</li>)}
                  </ol>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="curriculum" className="mx-auto max-w-7xl px-6 py-16 lg:py-20">
        <div className="flex items-center gap-3">
          <Compass className="h-6 w-6 text-accent" />
          <h2 className="font-display text-2xl font-bold sm:text-3xl">How a family gets started</h2>
        </div>
        <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(([num, title, body]) => (
            <li key={num} className="rounded-2xl border border-border/60 bg-muted p-5">
              <span className="font-display text-3xl font-bold text-accent">{num}</span>
              <h3 className="mt-2 font-display text-base font-bold">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-foreground/75">{body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Parents / Closing CTA */}
      <section id="parents" className="border-t border-border/30">
        <div className="mx-auto max-w-4xl px-6 py-16 text-center lg:py-20">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-secondary bg-primary text-accent">
            <Users className="h-7 w-7" />
          </div>
          <img
            src={alleyMascot}
            alt="Alley the AI teacher mascot waving"
            width={816}
            height={816}
            loading="lazy"
            className="mx-auto h-24 w-24 [image-rendering:pixelated]"
          />
          <h2 className="mt-4 font-display text-2xl font-bold sm:text-3xl">Class starts whenever your family is ready.</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground sm:text-base">
            Set up the household in a minute, hand your learner a family code, and let them find their first classroom.
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

      <footer className="border-t border-border/30 px-6 py-8 text-center text-xs text-muted-foreground">
        <p>Unify University · A homeschool campus for K-12 families.</p>
        <p className="mt-2">
          Graphics created by Penzilla Design. ·{" "}
          <Link to="/credits" className="underline underline-offset-2">
            Full asset credits
          </Link>
        </p>
      </footer>
    </main>
  );
}
