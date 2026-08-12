import { useEffect } from "react";
import { useCampusStore } from "@/lib/campus/store";
import { campusLessonIndex } from "@/lib/campus/lesson-index";
import { useLessons, useProgress } from "@/lib/data";

/**
 * Derives the student's next objective from stored progress, so finishing a
 * lesson or knowledge check re-points the HUD without a manual refresh.
 */
export function useCampusObjectives() {
  const { data: lessons } = useLessons();
  const { data: progress } = useProgress();
  const setObjective = useCampusStore((s) => s.setObjective);

  useEffect(() => {
    if (!lessons?.length) return;
    const locations = campusLessonIndex();
    const done = new Set(
      (progress ?? []).filter((p) => p.status === "completed").map((p) => p.lesson_id),
    );

    const ordered = [...lessons].sort(
      (a, b) => a.course_id.localeCompare(b.course_id) || a.sort_order - b.sort_order,
    );
    const next = ordered.find((l) => !done.has(l.id) && locations.some((c) => c.lessonId === l.id));

    if (!next) {
      setObjective("Every class is complete — explore the campus or review in the Workspace.");
      return;
    }
    const where = locations.find((c) => c.lessonId === next.id)!;
    setObjective(
      `Attend ${next.title} — ${where.roomName ?? where.zoneName}, ${where.zoneName}`,
      where.zoneId,
    );
  }, [lessons, progress, setObjective]);
}
