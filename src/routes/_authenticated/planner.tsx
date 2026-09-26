import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarClock, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLessons } from "@/lib/data";
import {
  formatPlanTime,
  useAddPlan,
  useFamilyMembers,
  useFamilyPlans,
  useRemovePlan,
} from "@/lib/planner";

export const Route = createFileRoute("/_authenticated/planner")({
  head: () => ({
    meta: [
      { title: "Lesson planner — Unify University" },
      { name: "description", content: "Schedule which lesson each child works on next, by day and time." },
      { property: "og:title", content: "Lesson planner — Unify University" },
      { property: "og:description", content: "Schedule which lesson each child works on next, by day and time." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PlannerPage,
});

function PlannerPage() {
  const { data: fam } = useFamilyMembers();
  const { data: lessons } = useLessons();
  const { data: plans } = useFamilyPlans();
  const add = useAddPlan();
  const remove = useRemovePlan();
  const isParent = fam?.me?.family_role === "parent";
  const kids = (fam?.members ?? []).filter((m) => m.family_role !== "parent");
  const [studentId, setStudentId] = useState("");
  const [lessonId, setLessonId] = useState("");
  const [day, setDay] = useState("");
  const [time, setTime] = useState("09:00");
  const [error, setError] = useState<string | null>(null);

  const lessonById = useMemo(() => new Map((lessons ?? []).map((l) => [l.id, l])), [lessons]);
  const nameById = useMemo(() => new Map((fam?.members ?? []).map((m) => [m.id, m.display_name])), [fam]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const lesson = lessonById.get(lessonId);
    if (!fam?.me?.family_id || !lesson || !studentId || !day) return;
    try {
      await add.mutateAsync({
        family_id: fam.me.family_id,
        student_id: studentId,
        lesson_id: lesson.id,
        course_id: lesson.course_id,
        scheduled_at: new Date(`${day}T${time}`).toISOString(),
        note: null,
      });
      setLessonId("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not schedule that lesson.");
    }
  };

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <Link to="/family" className="text-[11px] uppercase tracking-widest text-muted-foreground hover:underline">
        ← Family dashboard
      </Link>
      <h1 className="mt-2 flex items-center gap-2 text-3xl font-bold">
        <CalendarClock className="size-7 text-primary" /> Lesson planner
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Scheduled lessons appear as "Up next" in each child's quest panel on campus.
      </p>

      {isParent ? (
        <form onSubmit={submit} className="block-panel mt-6 grid gap-3 bg-card p-4 sm:grid-cols-4">
          <div>
            <Label htmlFor="pl-child">Child</Label>
            <select id="pl-child" required value={studentId} onChange={(e) => setStudentId(e.target.value)} className="h-9 w-full border border-input bg-background px-2 text-sm">
              <option value="">Choose…</option>
              {kids.map((k) => (
                <option key={k.id} value={k.id}>{k.display_name}</option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-3">
            <Label htmlFor="pl-lesson">Lesson</Label>
            <select id="pl-lesson" required value={lessonId} onChange={(e) => setLessonId(e.target.value)} className="h-9 w-full border border-input bg-background px-2 text-sm">
              <option value="">Choose…</option>
              {(lessons ?? []).map((l) => (
                <option key={l.id} value={l.id}>{l.subject ? `${l.subject} — ` : ""}{l.title}</option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="pl-day">Day</Label>
            <Input id="pl-day" type="date" required value={day} onChange={(e) => setDay(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="pl-time">Time</Label>
            <Input id="pl-time" type="time" required value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
          <div className="flex items-end sm:col-span-2">
            <Button type="submit" disabled={add.isPending || kids.length === 0}>Schedule lesson</Button>
          </div>
          {kids.length === 0 && (
            <p className="text-sm text-muted-foreground sm:col-span-4">Add a child on the family dashboard first.</p>
          )}
          {error && <p className="text-sm text-destructive sm:col-span-4">{error}</p>}
        </form>
      ) : (
        <p className="mt-6 text-sm text-muted-foreground">Only parents can change the schedule.</p>
      )}

      <ul className="mt-6 space-y-2">
        {(plans ?? []).length === 0 && <li className="text-sm text-muted-foreground">Nothing scheduled yet.</li>}
        {(plans ?? []).map((p) => (
          <li key={p.id} className="block-panel flex items-center gap-3 bg-card px-4 py-3 text-sm">
            <span className="w-36 shrink-0 font-bold">{formatPlanTime(p.scheduled_at)}</span>
            <span className="flex-1">
              <span className="font-semibold">{nameById.get(p.student_id) ?? "Student"}</span> ·{" "}
              {lessonById.get(p.lesson_id)?.title ?? p.lesson_id}
            </span>
            {isParent && (
              <Button size="icon" variant="ghost" aria-label="Remove from schedule" onClick={() => remove.mutate(p.id)}>
                <Trash2 className="size-4" />
              </Button>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}
