import type { Lesson, Progress } from "@/lib/data";
import type { QuestDef, QuestRecord } from "@/lib/campus/quests";
import { locationForLesson } from "@/lib/campus/lesson-index";

export interface StoryItem {
  id: string;
  kind: "continue" | "mission" | "recommended" | "explore";
  title: string;
  /** Machine-readable-ish reason shown to the student. */
  reason: string;
  lessonId?: string;
  courseId?: string;
  zoneId?: string;
  zoneName?: string;
}

const KIND_ORDER: Record<StoryItem["kind"], number> = {
  continue: 0,
  mission: 1,
  recommended: 2,
  explore: 3,
};

/**
 * Today's Story: the day's real work, ranked. Unfinished lessons first, then
 * active quest steps, then the next lesson in the catalogue, then one place on
 * campus the student has not visited yet. Nothing here is invented.
 */
export function buildDailyStory(input: {
  lessons: Lesson[] | undefined;
  progress: Progress[] | undefined;
  quests: QuestDef[] | undefined;
  records: QuestRecord[] | undefined;
  discovered: string[];
  limit?: number;
}): StoryItem[] {
  const lessons = input.lessons ?? [];
  const progress = input.progress ?? [];
  const items: StoryItem[] = [];

  const withLocation = (lessonId: string) => {
    const loc = locationForLesson(lessonId);
    return loc
      ? { zoneId: loc.zoneId, zoneName: loc.zoneName }
      : {};
  };

  for (const row of progress) {
    if (row.status === "completed") continue;
    const lesson = lessons.find((l) => l.id === row.lesson_id);
    if (!lesson) continue;
    items.push({
      id: `continue-${lesson.id}`,
      kind: "continue",
      title: lesson.title,
      reason: "picks up where you left off",
      lessonId: lesson.id,
      courseId: lesson.course_id,
      ...withLocation(lesson.id),
    });
  }

  for (const record of input.records ?? []) {
    if (record.status === "completed") continue;
    const quest = (input.quests ?? []).find((q) => q.id === record.quest_id);
    if (!quest) continue;
    const nextStep = quest.steps.find((s) => !record.steps[s.id]);
    if (!nextStep) continue;
    items.push({
      id: `mission-${quest.id}`,
      kind: "mission",
      title: `${quest.title} — ${nextStep.label}`,
      reason: "your active quest needs this step",
      lessonId: quest.lessonId,
      ...withLocation(quest.lessonId),
    });
  }

  const started = new Set(progress.map((p) => p.lesson_id));
  const nextLesson = lessons.find((l) => !started.has(l.id));
  if (nextLesson) {
    items.push({
      id: `recommended-${nextLesson.id}`,
      kind: "recommended",
      title: nextLesson.title,
      reason: "next in your course order",
      lessonId: nextLesson.id,
      courseId: nextLesson.course_id,
      ...withLocation(nextLesson.id),
    });
  }

  const unseen = lessons
    .map((l) => locationForLesson(l.id))
    .find((loc) => loc && !input.discovered.includes(loc.zoneId));
  if (unseen) {
    items.push({
      id: `explore-${unseen.zoneId}`,
      kind: "explore",
      title: `Visit ${unseen.zoneName}`,
      reason: "somewhere on campus you have not been yet",
      zoneId: unseen.zoneId,
      zoneName: unseen.zoneName,
    });
  }

  const seen = new Set<string>();
  return items
    .filter((i) => (seen.has(i.id) ? false : (seen.add(i.id), true)))
    .sort((a, b) => KIND_ORDER[a.kind] - KIND_ORDER[b.kind])
    .slice(0, input.limit ?? 6);
}
