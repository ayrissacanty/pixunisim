import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface LedgerLesson {
  lessonId: string;
  title: string;
  subject: string | null;
  standard: string | null;
  grade: number | null;
  status: string;
  score: number | null;
  completedAt: string | null;
  minutes: number;
}

export interface LedgerTutorSession {
  lessonId: string;
  title: string;
  sessions: number;
  lastAt: string;
}

export interface LedgerChild {
  id: string;
  name: string;
  gradeBand: string | null;
  learningStyle: string | null;
  lessons: LedgerLesson[];
  completedCount: number;
  inProgressCount: number;
  averageScore: number | null;
  totalMinutes: number;
  standardsMet: string[];
  tutorSessions: LedgerTutorSession[];
  tutorSessionCount: number;
}

export interface TutorRow {
  user_id: string;
  item_id: string;
  quantity: number;
  acquired_at: string;
}

interface ProgressRow {
  user_id: string;
  lesson_id: string;
  status: string;
  score: number | null;
  completed_at: string | null;
  time_spent_seconds: number | null;
}

interface LessonRow {
  id: string;
  title: string;
  subject: string | null;
  standard_code: string | null;
  grade: number | null;
}

interface ProfileRow {
  id: string;
  display_name: string;
  grade_band: string | null;
  learning_style: string | null;
}

/** Shape the raw family rows into per-child ledger cards. */
export function buildLedger(
  profiles: ProfileRow[],
  progress: ProgressRow[],
  lessons: LessonRow[],
  range?: { from?: string | undefined; to?: string | undefined },
  tutorRows: TutorRow[] = [],
): LedgerChild[] {
  const lessonById = new Map(lessons.map((lesson) => [lesson.id, lesson]));
  return profiles.map((profile) => {
    const rows = progress
      .filter((row) => row.user_id === profile.id)
      .filter((row) => {
        if (!range?.from && !range?.to) return true;
        const when = row.completed_at;
        if (!when) return !range.from && !range.to ? true : false;
        if (range.from && when < range.from) return false;
        if (range.to && when > `${range.to}T23:59:59Z`) return false;
        return true;
      });

    const entries: LedgerLesson[] = rows.map((row) => {
      const lesson = lessonById.get(row.lesson_id);
      return {
        lessonId: row.lesson_id,
        title: lesson?.title ?? row.lesson_id,
        subject: lesson?.subject ?? null,
        standard: lesson?.standard_code ?? null,
        grade: lesson?.grade ?? null,
        status: row.status,
        score: row.score,
        completedAt: row.completed_at,
        minutes: Math.round((row.time_spent_seconds ?? 0) / 60),
      };
    });

    const completed = entries.filter((entry) => entry.status === "completed");
    const scores = completed.map((entry) => entry.score).filter((s): s is number => s != null);

    // Tutoring sessions are stored as "insight-<lesson id>" keepsakes.
    const tutorSessions: LedgerTutorSession[] = tutorRows
      .filter((row) => row.user_id === profile.id && row.item_id.startsWith("insight-"))
      .filter((row) => {
        if (range?.from && row.acquired_at < range.from) return false;
        if (range?.to && row.acquired_at > `${range.to}T23:59:59Z`) return false;
        return true;
      })
      .map((row) => {
        const lessonId = row.item_id.replace(/^insight-/, "");
        return {
          lessonId,
          title: lessonById.get(lessonId)?.title ?? lessonId,
          sessions: row.quantity,
          lastAt: row.acquired_at,
        };
      })
      .sort((a, b) => b.lastAt.localeCompare(a.lastAt));

    return {
      id: profile.id,
      name: profile.display_name,
      gradeBand: profile.grade_band,
      learningStyle: profile.learning_style,
      lessons: entries.sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? "")),
      completedCount: completed.length,
      inProgressCount: entries.length - completed.length,
      averageScore: scores.length
        ? Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length)
        : null,
      totalMinutes: entries.reduce((sum, entry) => sum + entry.minutes, 0),
      standardsMet: Array.from(
        new Set(completed.map((entry) => entry.standard).filter((s): s is string => !!s)),
      ).sort(),
      tutorSessions,
      tutorSessionCount: tutorSessions.reduce((sum, s) => sum + s.sessions, 0),
    };
  });
}

/**
 * Family-scoped ledger read. RLS restricts every row to the caller's family,
 * so no extra filters are needed here.
 */
export function useFamilyLedger(range?: { from?: string | undefined; to?: string | undefined }) {
  return useQuery({
    queryKey: ["family-ledger", range?.from ?? "", range?.to ?? ""],
    staleTime: 30_000,
    queryFn: async (): Promise<LedgerChild[]> => {
      const [{ data: profiles }, { data: progress }, { data: lessons }] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, display_name, grade_band, learning_style")
          .order("display_name", { ascending: true }),
        supabase
          .from("student_progress")
          .select("user_id, lesson_id, status, score, completed_at, time_spent_seconds"),
        supabase.from("lessons").select("id, title, subject, standard_code, grade"),
      ]);

      return buildLedger(
        (profiles ?? []) as ProfileRow[],
        (progress ?? []) as ProgressRow[],
        (lessons ?? []) as LessonRow[],
        range,
      );
    },
  });
}
