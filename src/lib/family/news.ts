/**
 * Family News: turn raw family progress rows into a short broadcast script.
 *
 * Pure functions only — the data fetching lives in `queries.ts` and the
 * speech playback in `speech.ts`, so the summariser stays unit-testable.
 */

export interface FamilyMember {
  id: string;
  display_name: string;
  mascot_color: string;
  mascot_accessory: string;
}

export interface FamilyProgressRow {
  user_id: string;
  lesson_id: string;
  status: string;
  score: number | null;
  completed_at: string | null;
}

export interface FamilyObjectiveRow {
  user_id: string;
  objective_key: string;
  completed: boolean;
  completed_at: string | null;
}

export interface MemberReport {
  id: string;
  name: string;
  completedToday: string[];
  completedThisWeek: number;
  averageScore: number | null;
  bestScore: number | null;
  objectivesToday: number;
  /** Consecutive days ending today (or yesterday) with a completed lesson. */
  streakDays: number;
}

export interface FamilyReport {
  dateLabel: string;
  members: MemberReport[];
  lessonsToday: number;
  lessonsThisWeek: number;
  objectivesToday: number;
  headline: string;
  /** Sentences read aloud, one per beat, so the character can pace itself. */
  script: string[];
}

const DAY_MS = 86_400_000;

function dayKey(iso: string, now: Date): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  // Local calendar day, so "today" matches what the family sees on the clock.
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString().slice(0, 10);
}

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** Consecutive-day streak ending today or yesterday (a day off today is forgiven). */
export function streakFromDays(days: Set<string>, now: Date): number {
  const today = startOfDay(now);
  let cursor = days.has(new Date(today).toISOString().slice(0, 10))
    ? today
    : days.has(new Date(today - DAY_MS).toISOString().slice(0, 10))
      ? today - DAY_MS
      : null;
  if (cursor === null) return 0;
  let streak = 0;
  while (days.has(new Date(cursor).toISOString().slice(0, 10))) {
    streak += 1;
    cursor -= DAY_MS;
  }
  return streak;
}

function list(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0]!;
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

export function buildFamilyReport(input: {
  members: FamilyMember[];
  progress: FamilyProgressRow[];
  objectives: FamilyObjectiveRow[];
  lessonTitles: Record<string, string>;
  now?: Date;
}): FamilyReport {
  const now = input.now ?? new Date();
  const todayKey = new Date(startOfDay(now)).toISOString().slice(0, 10);
  const weekStart = startOfDay(now) - 6 * DAY_MS;

  const members: MemberReport[] = input.members.map((m) => {
    const rows = input.progress.filter(
      (p) => p.user_id === m.id && p.status === "completed" && p.completed_at,
    );
    const days = new Set(rows.map((r) => dayKey(r.completed_at!, now)));
    const today = rows.filter((r) => dayKey(r.completed_at!, now) === todayKey);
    const week = rows.filter((r) => new Date(r.completed_at!).getTime() >= weekStart);
    const scores = week.map((r) => r.score).filter((s): s is number => typeof s === "number");
    const objectivesToday = input.objectives.filter(
      (o) =>
        o.user_id === m.id &&
        o.completed &&
        o.completed_at &&
        dayKey(o.completed_at, now) === todayKey,
    ).length;

    return {
      id: m.id,
      name: m.display_name || "Student",
      completedToday: today.map((r) => input.lessonTitles[r.lesson_id] ?? "a lesson"),
      completedThisWeek: week.length,
      averageScore: scores.length
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : null,
      bestScore: scores.length ? Math.max(...scores) : null,
      objectivesToday,
      streakDays: streakFromDays(days, now),
    };
  });

  const lessonsToday = members.reduce((n, m) => n + m.completedToday.length, 0);
  const lessonsThisWeek = members.reduce((n, m) => n + m.completedThisWeek, 0);
  const objectivesToday = members.reduce((n, m) => n + m.objectivesToday, 0);

  const dateLabel = now.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const headline =
    lessonsToday > 0
      ? `${lessonsToday} lesson${lessonsToday === 1 ? "" : "s"} finished today`
      : lessonsThisWeek > 0
        ? `${lessonsThisWeek} lesson${lessonsThisWeek === 1 ? "" : "s"} finished this week`
        : "A quiet news day on campus";

  const script: string[] = [
    `Good day, family. Here is your Unify University briefing for ${dateLabel}.`,
  ];

  if (lessonsToday === 0 && lessonsThisWeek === 0) {
    script.push("No lessons have been completed yet, so the campus is quiet.");
    script.push("Head to campus, find a classroom, and tomorrow's report can open with you.");
  } else {
    script.push(
      lessonsToday > 0
        ? `Today the family completed ${lessonsToday} lesson${lessonsToday === 1 ? "" : "s"}.`
        : `Nothing completed today yet, but this week the family finished ${lessonsThisWeek} lesson${
            lessonsThisWeek === 1 ? "" : "s"
          }.`,
    );

    for (const m of members) {
      const beats: string[] = [];
      if (m.completedToday.length > 0) {
        beats.push(`finished ${list(m.completedToday)}`);
      }
      if (m.objectivesToday > 0) {
        beats.push(
          `ticked off ${m.objectivesToday} campus objective${m.objectivesToday === 1 ? "" : "s"}`,
        );
      }
      if (beats.length === 0) continue;
      let line = `${m.name} ${list(beats)}.`;
      if (m.bestScore != null) line += ` Top score, ${m.bestScore} percent.`;
      script.push(line);
    }

    const streakers = members.filter((m) => m.streakDays >= 2);
    for (const m of streakers) {
      script.push(`${m.name} is on a ${m.streakDays} day learning streak. Keep it going!`);
    }

    if (lessonsThisWeek > 0) {
      script.push(
        `That makes ${lessonsThisWeek} lesson${
          lessonsThisWeek === 1 ? "" : "s"
        } across the family in the last seven days.`,
      );
    }
  }

  script.push("That's the news from campus. Back to you.");

  return {
    dateLabel,
    members,
    lessonsToday,
    lessonsThisWeek,
    objectivesToday,
    headline,
    script,
  };
}

export function scriptText(report: FamilyReport): string {
  return report.script.join(" ");
}
