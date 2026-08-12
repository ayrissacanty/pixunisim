import { describe, expect, it } from "vitest";
import { WALKTHROUGHS, buildWalkthrough } from "./walkthrough";

describe("campus walkthrough presets", () => {
  it("routes Welcome Plaza → Mathematics Hall → Algebra 204", () => {
    const walk = buildWalkthrough(WALKTHROUGHS["algebra-204"]!.lessonId);
    expect(walk.roomId).toBe("algebra-204");
    expect(walk.zoneId).toBe("math-tech-hall");
    expect(walk.steps.map((s) => s.zone)).toEqual([
      "welcome-plaza",
      "central-quad",
      "math-tech-hall",
      "math-tech-hall",
    ]);
  });

  it("asserts the classroom carries the shared course_id and lesson_id", () => {
    const walk = buildWalkthrough("algebra-lesson-2");
    expect(walk.courseId).toBe("foundations-algebra");
    expect(walk.lessonId).toBe("algebra-lesson-2");
    expect(walk.npc.courseId).toBe(walk.courseId);
    expect(walk.npc.lessonId).toBe(walk.lessonId);
  });

  it("throws for a lesson with no classroom", () => {
    expect(() => buildWalkthrough("not-a-lesson")).toThrow();
  });
});
