import type { Lesson, Progress } from "@/lib/data";

/**
 * Skill trees. Four authored branches — mathematics, science, literature and
 * writing — each with named tiers. Lessons are sorted into a branch from their
 * stored subject, standard code and title, and a tier is mastered when every
 * lesson placed in it is completed. Nothing is invented: a branch shows only
 * the lessons that actually exist in the curriculum.
 */
export type BranchId = "mathematics" | "science" | "literature" | "writing";

export interface SkillTierDef {
  id: string;
  name: string;
  description: string;
}

export interface BranchDef {
  id: BranchId;
  name: string;
  icon: string;
  blurb: string;
  tiers: SkillTierDef[];
}

export interface SkillNode {
  lessonId: string;
  courseId: string;
  title: string;
  standard: string | null;
  status: "mastered" | "in_progress" | "open" | "locked";
  score: number | null;
}

export interface SkillTier extends SkillTierDef {
  nodes: SkillNode[];
  mastered: boolean;
  unlocked: boolean;
}

export interface SkillBranch extends BranchDef {
  tiers: SkillTier[];
  masteredLessons: number;
  totalLessons: number;
  /** 0-1 share of the branch's lessons completed. */
  progress: number;
}

export const BRANCHES: BranchDef[] = [
  {
    id: "mathematics",
    name: "Mathematics",
    icon: "🔢",
    blurb: "Number sense into algebraic reasoning.",
    tiers: [
      { id: "number", name: "Number Sense", description: "Counting, place value and operations." },
      { id: "patterns", name: "Patterns & Relations", description: "Sequences, ratios and functions." },
      { id: "algebra", name: "Algebraic Reasoning", description: "Equations, variables and proof." },
    ],
  },
  {
    id: "science",
    name: "Science",
    icon: "🔬",
    blurb: "Observation into experiment design.",
    tiers: [
      { id: "observe", name: "Observation", description: "Noticing, recording and classifying." },
      { id: "systems", name: "Systems & Cycles", description: "How living and physical systems work." },
      { id: "inquiry", name: "Experimental Inquiry", description: "Hypothesis, variables and evidence." },
    ],
  },
  {
    id: "literature",
    name: "Literature",
    icon: "📖",
    blurb: "Reading closely, then reading between the lines.",
    tiers: [
      { id: "comprehend", name: "Comprehension", description: "Plot, character and vocabulary." },
      { id: "analysis", name: "Literary Analysis", description: "Theme, symbol and author's craft." },
      { id: "criticism", name: "Critical Response", description: "Argued interpretation with evidence." },
    ],
  },
  {
    id: "writing",
    name: "Writing",
    icon: "✒️",
    blurb: "Sentences into structured argument.",
    tiers: [
      { id: "craft", name: "Sentence Craft", description: "Grammar, clarity and voice." },
      { id: "structure", name: "Composition", description: "Paragraphs, drafts and revision." },
      { id: "argument", name: "Argument & Research", description: "Thesis, sources and citation." },
    ],
  },
];

const BRANCH_PATTERNS: Array<[RegExp, BranchId]> = [
  [/writ|essay|composition|grammar|rhetoric|journal/i, "writing"],
  [/lit|reading|english|language arts|poem|poetry|story|novel/i, "literature"],
  [/math|algebra|geometry|fraction|number|ratio|statistic/i, "mathematics"],
  [/science|biolog|chem|physic|lab|ecosystem|earth|astronom|agri/i, "science"],
];

/** Which branch a lesson belongs to, or undefined when it belongs to none. */
export function branchForLesson(lesson: Lesson): BranchId | undefined {
  const hay = `${lesson.subject ?? ""} ${lesson.standard_code ?? ""} ${lesson.title} ${lesson.summary}`;
  for (const [pattern, id] of BRANCH_PATTERNS) if (pattern.test(hay)) return id;
  return undefined;
}

/** Splits an ordered lesson list evenly across the branch's tiers. */
function splitIntoTiers<T>(items: T[], tiers: number): T[][] {
  const out: T[][] = Array.from({ length: tiers }, () => []);
  if (items.length === 0) return out;
  const per = Math.ceil(items.length / tiers);
  items.forEach((item, i) => {
    out[Math.min(tiers - 1, Math.floor(i / per))]!.push(item);
  });
  return out;
}

export function buildSkillTrees(
  lessons: Lesson[] | undefined,
  progress: Progress[] | undefined,
): SkillBranch[] {
  const rows = [...(lessons ?? [])].sort(
    (a, b) => a.course_id.localeCompare(b.course_id) || a.sort_order - b.sort_order,
  );
  const done = progress ?? [];

  return BRANCHES.map((branch) => {
    const owned = rows.filter((l) => branchForLesson(l) === branch.id);
    const buckets = splitIntoTiers(owned, branch.tiers.length);

    let priorMastered = true;
    const tiers: SkillTier[] = branch.tiers.map((def, i) => {
      const unlocked = priorMastered;
      const nodes: SkillNode[] = (buckets[i] ?? []).map((lesson) => {
        const row = done.find((p) => p.lesson_id === lesson.id);
        const status: SkillNode["status"] = row
          ? row.status === "completed"
            ? "mastered"
            : "in_progress"
          : unlocked
            ? "open"
            : "locked";
        return {
          lessonId: lesson.id,
          courseId: lesson.course_id,
          title: lesson.title,
          standard: lesson.standard_code ?? null,
          status,
          score: row?.score ?? null,
        };
      });
      const mastered = nodes.length > 0 && nodes.every((n) => n.status === "mastered");
      priorMastered = mastered;
      return { ...def, nodes, mastered, unlocked };
    });

    const totalLessons = owned.length;
    const masteredLessons = tiers.reduce(
      (sum, t) => sum + t.nodes.filter((n) => n.status === "mastered").length,
      0,
    );
    return {
      ...branch,
      tiers,
      totalLessons,
      masteredLessons,
      progress: totalLessons === 0 ? 0 : masteredLessons / totalLessons,
    };
  });
}
