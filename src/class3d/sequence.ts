/** Curriculum sequence: one row per subject for the curriculum home page.
 *  The account has one enrollment grade; each subject can sit at a different level.
 *  Next is the first shelf lesson in that level not marked studied. A lesson is ready to teach when it has a script. */
import { CURRICULUM, type LessonDef } from "./curriculum";
import { ELECTIVES } from "./packs";
import { parentGrade, subjectGrade, gradesLabel } from "./gradeband";
import { SUBJECT_NAME, Progress } from "../game/progress";
import type { Subject } from "../game/types";

export interface SequenceRow {
  subject: Subject; name: string;
  /** subject level 0-12 (subject level, else enrollment grade); null when neither is set */
  band: number | null;
  scope: string; prereq: string;
  studied: number; shelf: number; ready: number;
  note: string; next: LessonDef | null;
  /** enrollment grade 0-12 (0 = K), or null */
  official: number | null;
}

const ORDER: Subject[] = ["math", "ela", "science", "history", "careers", "life"];
const gradeName = (g: number) => (g === 0 ? "K" : "grade " + g);

export function layout(): SequenceRow[] {
  const official = parentGrade();
  return ORDER.map((subject) => {
    const shelf: LessonDef[] = [...CURRICULUM[subject], ...ELECTIVES[subject]];
    const done = new Set(Progress.studiedIds(subject));
    const own = Progress.level(subject);
    const level = subjectGrade(subject);
    const span = level == null ? "" : gradesLabel(String(level));
    const inLevel = span ? shelf.filter((l) => l.grades && gradesLabel(l.grades) === span) : shelf;
    const next = inLevel.find((l) => !done.has(l.id)) ?? null;
    return {
      subject, name: SUBJECT_NAME[subject], band: level, official,
      scope: span ? `${inLevel.length} shelf lessons for grades ${span}.` : `${shelf.length} shelf lessons, no level set.`,
      prereq: level == null ? "Set an enrollment grade or a subject level to narrow the sequence."
        : own != null && own !== official ? `Placed at ${gradeName(own)} for this subject${official == null ? "" : `, enrolled in ${gradeName(official)}`}.`
        : `Follows the enrollment grade (${gradeName(level)}).`,
      studied: shelf.filter((l) => done.has(l.id)).length,
      shelf: shelf.length,
      ready: shelf.filter((l) => (l.script?.length ?? 0) > 0).length,
      note: own != null ? "Using the subject level." : official != null ? "Using the enrollment grade." : "No grade set yet.",
      next,
    };
  });
}
