import type { Lesson, Progress } from "@/lib/data";
import type { QuestDef, QuestRecord } from "@/lib/campus/quests";
import { locationForLesson } from "@/lib/campus/lesson-index";

export interface StoryItem {
  id: string;
  kind: "continue" | "mission" | "recommended" | "explore";
  title: string;
  /** Machine-readable-ish reason shown to the student. */
  reason: string;
  /** One sentence of story narration for this beat of the day. */
  beat: string;
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
    return loc ? { zoneId: loc.zoneId, zoneName: loc.zoneName } : {};
  };

  for (const row of progress) {
    if (row.status === "completed") continue;
    const lesson = lessons.find((l) => l.id === row.lesson_id);
    if (!lesson) continue;
    const loc = locationForLesson(lesson.id);
    items.push({
      id: `continue-${lesson.id}`,
      kind: "continue",
      title: lesson.title,
      reason: "picks up where you left off",
      beat: loc
        ? `${loc.teacher} left your work on ${lesson.title} open in ${loc.roomName ?? loc.zoneName}.`
        : `Your notes on ${lesson.title} are still open on the desk.`,
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
      beat: `${quest.giver} is waiting on the next step of ${quest.title}; the ${quest.reward.name} is not earned yet.`,
      lessonId: quest.lessonId,
      ...withLocation(quest.lessonId),
    });
  }

  const started = new Set(progress.map((p) => p.lesson_id));
  const nextLesson = lessons.find((l) => !started.has(l.id));
  if (nextLesson) {
    const loc = locationForLesson(nextLesson.id);
    items.push({
      id: `recommended-${nextLesson.id}`,
      kind: "recommended",
      title: nextLesson.title,
      reason: "next in your course order",
      beat: loc
        ? `A fresh page is chalked up in ${loc.roomName ?? loc.zoneName}: ${nextLesson.title}.`
        : `A fresh page is waiting: ${nextLesson.title}.`,
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
      beat: `Nobody has signed your name into ${unseen.zoneName} yet — the door is unlocked today.`,
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

export interface DayStory {
  /** Campus day counter: one more than the number of lessons finished. */
  day: number;
  chapter: string;
  opening: string;
  closing: string;
  items: StoryItem[];
}

const CHAPTERS: Array<{ upTo: number; chapter: string; opening: string }> = [
  {
    upTo: 1,
    chapter: "Chapter One · Arrival",
    opening: "The bell rings over an empty quad and the campus is brand new to you.",
  },
  {
    upTo: 3,
    chapter: "Chapter Two · Finding Your Feet",
    opening: "Doors are starting to feel familiar, and the faculty know your name.",
  },
  {
    upTo: 7,
    chapter: "Chapter Three · The Working Term",
    opening: "Your satchel is heavier this morning — real work is stacking up in it.",
  },
  {
    upTo: 14,
    chapter: "Chapter Four · Steady Scholar",
    opening: "Lanterns are lit early; the tutors have started giving you the harder pages.",
  },
  {
    upTo: Number.MAX_SAFE_INTEGER,
    chapter: "Chapter Five · Honours Track",
    opening: "The hall keeps a seat for you now. Today the campus expects something good.",
  },
];

/**
 * Wraps today's real work in a narrative frame. Every line is derived from
 * stored progress and quest rows, so the story moves only when the student
 * actually finishes something.
 */
export function buildDayStory(input: Parameters<typeof buildDailyStory>[0]): DayStory {
  const items = buildDailyStory(input);
  const completed = (input.progress ?? []).filter((p) => p.status === "completed").length;
  const day = completed + 1;
  const arc = CHAPTERS.find((c) => day <= c.upTo) ?? CHAPTERS[CHAPTERS.length - 1]!;

  const openQuests = (input.records ?? []).filter((r) => r.status === "accepted").length;
  const firstItem = items[0];

  const opening = firstItem
    ? `${arc.opening} ${firstItem.beat}`
    : `${arc.opening} Nothing is assigned yet — find a classroom and speak with the instructor.`;

  const closing =
    openQuests > 0
      ? `Finish today's beats and ${openQuests} quest${openQuests === 1 ? "" : "s"} move forward.`
      : completed > 0
        ? `${completed} lesson${completed === 1 ? "" : "s"} are already behind you. Accept a quest to turn today's work into a reward.`
        : "Accept your first quest to start earning keepsakes for your backpack.";

  return { day, chapter: arc.chapter, opening, closing, items };
}
