import { describe, expect, it } from "vitest";
import { campusLessonIndex } from "@/lib/campus/lesson-index";
import { mergeProgress } from "@/lib/offline/merge";

describe("campus ↔ workspace shared ids", () => {
  const index = campusLessonIndex();

  it("exposes classrooms that carry both a course and lesson id", () => {
    expect(index.length).toBeGreaterThan(0);
    for (const loc of index) {
      expect(loc.lessonId).toMatch(/^[a-z0-9-]+$/);
      expect(loc.courseId).toMatch(/^[a-z0-9-]+$/);
    }
  });

  it("teaches Algebra 204 with the shared foundations-algebra / algebra-lesson-2 ids", () => {
    const room = index.find((l) => l.roomId === "algebra-204");
    expect(room).toBeDefined();
    expect(room!.courseId).toBe("foundations-algebra");
    expect(room!.lessonId).toBe("algebra-lesson-2");
  });

  it("never maps one lesson id to two different course ids", () => {
    const byLesson = new Map<string, string>();
    for (const loc of index) {
      const seen = byLesson.get(loc.lessonId);
      if (seen) expect(seen).toBe(loc.courseId);
      byLesson.set(loc.lessonId, loc.courseId);
    }
  });
});

describe("offline progress merge", () => {
  const base = {
    lesson_id: "algebra-lesson-2",
    course_id: "foundations-algebra",
    status: "in_progress" as const,
    score: null,
    sections_read: 1,
  };

  it("keeps completion sticky and takes the best score", () => {
    const merged = mergeProgress(
      { ...base, status: "in_progress", score: 60, sections_read: 3 },
      { ...base, status: "completed", score: 80, sections_read: 2 },
    );
    expect(merged.status).toBe("completed");
    expect(merged.score).toBe(80);
    expect(merged.sections_read).toBe(3);
  });

  it("returns the local record when there is nothing remote", () => {
    expect(mergeProgress(base, null)).toEqual(base);
  });
});
