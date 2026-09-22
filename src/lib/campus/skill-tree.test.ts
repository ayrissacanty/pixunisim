import { describe, expect, it } from "vitest";
import { branchForLesson, buildSkillTrees } from "@/lib/campus/skill-tree";
import type { Lesson, Progress } from "@/lib/data";

const lesson = (id: string, subject: string, order: number): Lesson => ({
  id,
  course_id: `course-${subject}`,
  title: `${subject} lesson ${order}`,
  summary: "",
  sort_order: order,
  sections: [],
  subject,
});

describe("skill trees", () => {
  it("sorts lessons into branches by subject", () => {
    expect(branchForLesson(lesson("a", "Mathematics", 1))).toBe("mathematics");
    expect(branchForLesson(lesson("b", "Science", 1))).toBe("science");
    expect(branchForLesson(lesson("c", "Writing", 1))).toBe("writing");
    expect(branchForLesson(lesson("d", "Literature", 1))).toBe("literature");
  });

  it("fills tiers in order and marks mastery from real progress", () => {
    const lessons = [1, 2, 3].map((n) => lesson(`m${n}`, "Mathematics", n));
    const progress: Progress[] = [
      { lesson_id: "m1", course_id: "course-Mathematics", status: "completed", score: 90, sections_read: 3 },
    ];
    const math = buildSkillTrees(lessons, progress).find((b) => b.id === "mathematics")!;
    expect(math.totalLessons).toBe(3);
    expect(math.masteredLessons).toBe(1);
    expect(math.tiers[0]!.nodes[0]!.status).toBe("mastered");
    expect(math.tiers[0]!.mastered).toBe(true);
    expect(math.tiers[1]!.unlocked).toBe(true);
  });

  it("locks later tiers until the previous tier is mastered", () => {
    const lessons = [1, 2, 3].map((n) => lesson(`s${n}`, "Science", n));
    const sci = buildSkillTrees(lessons, []).find((b) => b.id === "science")!;
    expect(sci.tiers[0]!.unlocked).toBe(true);
    expect(sci.tiers[1]!.unlocked).toBe(false);
    expect(sci.tiers[1]!.nodes[0]!.status).toBe("locked");
  });

  it("returns empty branches when no lessons exist", () => {
    expect(buildSkillTrees([], []).every((b) => b.totalLessons === 0)).toBe(true);
  });
});
