import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFamilyLedger } from "@/lib/family/ledger";

export const Route = createFileRoute("/_authenticated/ledger")({
  head: () => ({
    meta: [
      { title: "Parent Ledger — Unify University" },
      {
        name: "description",
        content:
          "Every completed lesson, standard met and minute studied for each child, with printable homeschool reports.",
      },
      { property: "og:title", content: "Parent Ledger — Unify University" },
      {
        property: "og:description",
        content: "Completed lessons, standards met and time studied for each child.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LedgerPage,
});

function LedgerPage() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const { data: children, isLoading } = useFamilyLedger({
    from: from || undefined,
    to: to || undefined,
  });

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 print:max-w-none print:py-0">
      <div className="flex flex-wrap items-end justify-between gap-3 print:hidden">
        <div>
          <h1 className="font-display text-3xl font-bold">Parent ledger</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Completed lessons, standards met and time studied for each child.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div className="grid gap-1">
            <Label htmlFor="from">From</Label>
            <Input id="from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="to">To</Label>
            <Input id="to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="size-4" /> Print report
          </Button>
          <Button asChild variant="ghost">
            <Link to="/family">Family news</Link>
          </Button>
        </div>
      </div>

      <h2 className="hidden font-display text-2xl font-bold print:block">
        Unify University — homeschool progress report
      </h2>

      {isLoading && <p className="mt-6 text-sm text-muted-foreground">Loading the ledger…</p>}

      {!isLoading && (children?.length ?? 0) === 0 && (
        <p className="mt-6 text-sm text-muted-foreground">
          No students in this family yet. Create a student to start the ledger.
        </p>
      )}

      <div className="mt-6 grid gap-6" data-testid="ledger-children">
        {(children ?? []).map((child) => (
          <section
            key={child.id}
            className="rounded-xl border-2 border-border bg-card p-4 print:break-inside-avoid"
          >
            <header className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="font-display text-xl font-bold">{child.name}</h3>
              <p className="text-xs text-muted-foreground">
                {child.gradeBand ? `Grade band ${child.gradeBand}` : "Grade band not set"}
                {child.learningStyle ? ` · ${child.learningStyle} learner` : ""}
              </p>
            </header>

            <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
              <Stat label="Lessons completed" value={String(child.completedCount)} />
              <Stat label="In progress" value={String(child.inProgressCount)} />
              <Stat
                label="Average score"
                value={child.averageScore == null ? "—" : `${child.averageScore}%`}
              />
              <Stat label="Time studied" value={`${child.totalMinutes} min`} />
              <Stat label="Tutoring sessions" value={String(child.tutorSessionCount)} />
            </dl>

            <p className="mt-3 text-xs font-semibold uppercase tracking-wide">Standards met</p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {child.standardsMet.length === 0 ? (
                <span className="text-xs text-muted-foreground">None recorded yet.</span>
              ) : (
                child.standardsMet.map((standard) => (
                  <span
                    key={standard}
                    className="rounded border border-border bg-muted px-1.5 py-0.5 text-[11px] font-bold"
                  >
                    {standard}
                  </span>
                ))
              )}
            </div>

            <p className="mt-3 text-xs font-semibold uppercase tracking-wide">Tutoring sessions</p>
            <ul className="mt-1 flex flex-wrap gap-1.5" data-testid="ledger-tutoring">
              {child.tutorSessions.length === 0 ? (
                <span className="text-xs text-muted-foreground">None recorded yet.</span>
              ) : (
                child.tutorSessions.map((session) => (
                  <li
                    key={session.lessonId}
                    className="rounded border border-border bg-muted px-1.5 py-0.5 text-[11px]"
                  >
                    {session.title} · {session.sessions}×{" "}
                    {new Date(session.lastAt).toLocaleDateString()}
                  </li>
                ))
              )}
            </ul>

            <table className="mt-4 w-full text-left text-sm">
              <thead>
                <tr className="border-b-2 border-border text-xs uppercase tracking-wide">
                  <th className="py-1.5">Lesson</th>
                  <th className="py-1.5">Standard</th>
                  <th className="py-1.5">Status</th>
                  <th className="py-1.5">Score</th>
                  <th className="py-1.5">Minutes</th>
                  <th className="py-1.5">Completed</th>
                </tr>
              </thead>
              <tbody>
                {child.lessons.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-2 text-muted-foreground">
                      No lesson activity in this range.
                    </td>
                  </tr>
                ) : (
                  child.lessons.map((lesson) => (
                    <tr key={lesson.lessonId} className="border-b border-border/60">
                      <td className="py-1.5">{lesson.title}</td>
                      <td className="py-1.5">{lesson.standard ?? "—"}</td>
                      <td className="py-1.5">{lesson.status.replace("_", " ")}</td>
                      <td className="py-1.5">{lesson.score == null ? "—" : `${lesson.score}%`}</td>
                      <td className="py-1.5">{lesson.minutes}</td>
                      <td className="py-1.5">
                        {lesson.completedAt
                          ? new Date(lesson.completedAt).toLocaleDateString()
                          : "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </section>
        ))}
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-muted/50 p-2">
      <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="font-display text-lg font-bold">{value}</dd>
    </div>
  );
}
