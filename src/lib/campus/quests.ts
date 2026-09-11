import { campusLessonIndex, type CampusLessonLocation } from "@/lib/campus/lesson-index";
import type { Lesson } from "@/lib/data";

/** How a quest step is satisfied. */
export type QuestStepKind = "talk" | "lesson" | "check" | "deliver";

export interface QuestStep {
  id: string;
  kind: QuestStepKind;
  label: string;
  /** NPC id for `talk` and `deliver` steps. */
  npcId?: string;
  /** Inventory item id required by a `deliver` step. */
  itemId?: string;
}

export interface QuestDef {
  id: string;
  lessonId: string;
  courseId: string;
  title: string;
  summary: string;
  giver: string;
  npcId: string;
  zoneId: string;
  zoneName: string;
  roomId?: string;
  roomName?: string;
  subject: string;
  standardCode?: string;
  steps: QuestStep[];
  /** Item handed over when the quest completes. */
  reward: { itemId: string; name: string; icon: string };
  /** Quest becomes available once this quest is complete (course order). */
  requires?: string;
}

/** Small themed keepsakes so rewards feel authored rather than generic. */
const SUBJECT_ITEM: Record<string, { name: string; icon: string }> = {
  Mathematics: { name: "Brass Proof Token", icon: "🔢" },
  Science: { name: "Field Specimen Jar", icon: "🔬" },
  "Life Science": { name: "Field Specimen Jar", icon: "🔬" },
  History: { name: "Wax-Sealed Chronicle", icon: "📜" },
  "Social Studies": { name: "Wax-Sealed Chronicle", icon: "📜" },
  "Language Arts": { name: "Annotated Folio", icon: "📖" },
  Arts: { name: "Pressed Pigment Cake", icon: "🎨" },
  "Creative Arts": { name: "Pressed Pigment Cake", icon: "🎨" },
  Computing: { name: "Punchcard Fragment", icon: "💾" },
  "Study Skills": { name: "Bound Study Plan", icon: "🗂️" },
};

const DEFAULT_ITEM = { name: "Scholar's Seal", icon: "🏅" };

export function questItemFor(subject: string) {
  return SUBJECT_ITEM[subject] ?? DEFAULT_ITEM;
}

/** Item id awarded for finishing a lesson. */
export function lessonItemId(lessonId: string) {
  return `item-${lessonId}`;
}

/** Item id minted by a tutoring session on a lesson. */
export function tutorItemId(lessonId: string) {
  return `insight-${lessonId}`;
}

export const TUTOR_ITEM = { name: "Tutor's Insight", icon: "💡" };

function subjectOf(lesson: Lesson) {
  return lesson.subject ?? "Scholarship";
}

/**
 * Builds one quest per campus-taught lesson. Quests unlock in course order, so
 * finishing a classroom lesson opens the next quest on that course track.
 */
export function buildQuests(lessons: Lesson[]): QuestDef[] {
  const locations = campusLessonIndex();
  const byLesson = new Map<string, CampusLessonLocation>();
  for (const loc of locations) if (!byLesson.has(loc.lessonId)) byLesson.set(loc.lessonId, loc);

  const ordered = [...lessons].sort(
    (a, b) => a.course_id.localeCompare(b.course_id) || a.sort_order - b.sort_order,
  );

  const previousInCourse = new Map<string, string>();
  const quests: QuestDef[] = [];

  for (const lesson of ordered) {
    const loc = byLesson.get(lesson.id);
    if (!loc) continue;

    const subject = subjectOf(lesson);
    const item = questItemFor(subject);
    const id = `quest-${lesson.id}`;
    const prior = previousInCourse.get(lesson.course_id);

    quests.push({
      id,
      lessonId: lesson.id,
      courseId: lesson.course_id,
      title: `${lesson.title}`,
      summary: lesson.summary,
      giver: loc.teacher,
      npcId: loc.npcId,
      zoneId: loc.zoneId,
      zoneName: loc.zoneName,
      ...(loc.roomId ? { roomId: loc.roomId } : {}),
      ...(loc.roomName ? { roomName: loc.roomName } : {}),
      subject,
      ...(lesson.standard_code ? { standardCode: lesson.standard_code } : {}),
      ...(prior ? { requires: `quest-${prior}` } : {}),
      reward: { itemId: lessonItemId(lesson.id), ...item },
      steps: [
        {
          id: "talk",
          kind: "talk",
          label: `Speak with ${loc.teacher} in ${loc.roomName ?? loc.zoneName}`,
          npcId: loc.npcId,
        },
        { id: "lesson", kind: "lesson", label: `Work through ${lesson.title}` },
        { id: "check", kind: "check", label: "Pass the knowledge check (70% or better)" },
        {
          id: "deliver",
          kind: "deliver",
          label: `Hand your ${item.name} to ${loc.teacher}`,
          npcId: loc.npcId,
          itemId: lessonItemId(lesson.id),
        },
      ],
    });

    previousInCourse.set(lesson.course_id, lesson.id);
  }

  return quests;
}

export interface QuestRecord {
  quest_id: string;
  status: "accepted" | "completed";
  steps: Record<string, boolean>;
}

/** A quest is available when it has no prerequisite, or the prerequisite is done. */
export function isUnlocked(quest: QuestDef, records: QuestRecord[]) {
  if (!quest.requires) return true;
  return records.some((r) => r.quest_id === quest.requires && r.status === "completed");
}

export function stepsDone(quest: QuestDef, record?: QuestRecord) {
  return quest.steps.filter((s) => record?.steps?.[s.id]).length;
}

export function allStepsDone(quest: QuestDef, record?: QuestRecord) {
  return quest.steps.every((s) => record?.steps?.[s.id]);
}
