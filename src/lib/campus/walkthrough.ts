import { getZone, ZONE_LABELS, type NpcSpawn } from "./world";
import { locationForLesson } from "./lesson-index";

export interface WalkStep {
  /** Zone the camera should be in after this step. */
  zone: string;
  x: number;
  y: number;
  label: string;
}

export interface Walkthrough {
  id: string;
  title: string;
  steps: WalkStep[];
  /** Teacher to auto-greet at the end of the route. */
  npc: NpcSpawn;
  courseId: string;
  lessonId: string;
  roomId: string;
  zoneId: string;
}

/** Named spawn presets: `?tour=algebra-204` on /campus replays the route. */
export const WALKTHROUGHS: Record<string, { lessonId: string; title: string }> = {
  "algebra-204": {
    lessonId: "algebra-lesson-2",
    title: "Welcome Plaza → Mathematics Hall → Algebra 204",
  },
};

/** The teacher NPC that owns a classroom, or undefined when the room has none. */
export function teacherForRoom(zoneId: string, roomId: string): NpcSpawn | undefined {
  return getZone(zoneId).npcs.find((n) => n.roomId === roomId && !!n.lessonId);
}

/**
 * Builds a deterministic route from Welcome Plaza to the classroom that teaches
 * `lessonId`, asserting the classroom is wired to the same course/lesson IDs the
 * Traditional Workspace loads.
 */
export function buildWalkthrough(lessonId: string): Walkthrough {
  const where = locationForLesson(lessonId);
  if (!where) throw new Error(`No campus classroom teaches lesson "${lessonId}"`);
  if (!where.roomId) throw new Error(`Classroom for "${lessonId}" has no room id`);

  const zone = getZone(where.zoneId);
  const npc = teacherForRoom(where.zoneId, where.roomId);
  if (!npc) throw new Error(`No teacher NPC found in room "${where.roomId}"`);
  if (npc.lessonId !== lessonId || npc.courseId !== where.courseId) {
    throw new Error(
      `Classroom ${where.roomId} is wired to ${npc.courseId}/${npc.lessonId}, expected ${where.courseId}/${lessonId}`,
    );
  }

  const parent = zone.parentZone ?? "central-quad";
  const parentZone = getZone(parent);
  const doorway = getZone(parent).interactables.find(
    (i) => i.action.kind === "travel" && i.action.zone === zone.id,
  );
  const doorSpawn =
    doorway && doorway.action.kind === "travel"
      ? { x: doorway.action.spawnX, y: doorway.action.spawnY }
      : zone.defaultSpawn;

  const plaza = getZone("welcome-plaza");

  const steps: WalkStep[] = [
    {
      zone: "welcome-plaza",
      x: plaza.defaultSpawn.x,
      y: plaza.defaultSpawn.y,
      label: "Welcome Plaza",
    },
    {
      zone: parent,
      x: parentZone.defaultSpawn.x,
      y: parentZone.defaultSpawn.y,
      label: ZONE_LABELS[parent] ?? parentZone.name,
    },
    {
      zone: zone.id,
      x: doorSpawn.x,
      y: doorSpawn.y,
      label: ZONE_LABELS[zone.id] ?? zone.name,
    },
    {
      zone: zone.id,
      x: npc.x,
      y: Math.min(npc.y + 1, zone.height - 2),
      label: where.roomName ?? where.roomId,
    },
  ];

  return {
    id: where.roomId,
    title: `${where.roomName ?? where.roomId} — ${ZONE_LABELS[zone.id] ?? zone.name}`,
    steps,
    npc,
    courseId: where.courseId,
    lessonId,
    roomId: where.roomId,
    zoneId: zone.id,
  };
}
