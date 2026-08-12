import type { Progress } from "@/lib/data";

/**
 * Conflict-safe merge for a single lesson's progress record.
 * Completion is sticky, and the highest score / furthest reading position wins,
 * so an offline device can never roll back work done elsewhere.
 */
export function mergeProgress(a: Progress, b: Progress | null | undefined): Progress {
  if (!b) return a;
  const status: Progress["status"] =
    a.status === "completed" || b.status === "completed" ? "completed" : "in_progress";
  const score =
    a.score === null || a.score === undefined
      ? (b.score ?? null)
      : b.score === null || b.score === undefined
        ? a.score
        : Math.max(a.score, b.score);
  return {
    lesson_id: a.lesson_id,
    course_id: a.course_id || b.course_id,
    status,
    score,
    sections_read: Math.max(a.sections_read ?? 0, b.sections_read ?? 0),
  };
}
