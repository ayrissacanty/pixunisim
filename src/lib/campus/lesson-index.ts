import { ZONE_IDS, ZONE_LABELS, getZone } from "./world";

export interface CampusLessonLocation {
  lessonId: string;
  courseId: string;
  roomId?: string;
  roomName?: string;
  zoneId: string;
  zoneName: string;
  teacher: string;
}

let index: CampusLessonLocation[] | null = null;

/**
 * Every classroom on campus that teaches a stored lesson, keyed by the exact
 * same `lesson_id` / `course_id` the Traditional Workspace loads.
 */
export function campusLessonIndex(): CampusLessonLocation[] {
  if (index) return index;
  const out: CampusLessonLocation[] = [];
  for (const zoneId of ZONE_IDS) {
    const zone = getZone(zoneId);
    for (const npc of zone.npcs) {
      if (!npc.lessonId || !npc.courseId) continue;
      out.push({
        lessonId: npc.lessonId,
        courseId: npc.courseId,
        ...(npc.roomId ? { roomId: npc.roomId } : {}),
        ...(npc.roomName ? { roomName: npc.roomName } : {}),
        zoneId: zone.id,
        zoneName: ZONE_LABELS[zone.id] ?? zone.name,
        teacher: npc.name,
      });
    }
  }
  index = out;
  return out;
}

export function locationForLesson(lessonId: string): CampusLessonLocation | undefined {
  return campusLessonIndex().find((l) => l.lessonId === lessonId);
}
