import { describe, expect, it } from "vitest";
import { buildLedger } from "@/lib/family/ledger";

const profiles = [
  { id: "kid-1", display_name: "Rosa", grade_band: "6-8", learning_style: "visual" },
];
const lessons = [
  {
    id: "algebra-lesson-2",
    title: "Order of Operations",
    subject: "Mathematics",
    standard_code: "HS-ALG.2",
    grade: 7,
  },
];

describe("parent ledger", () => {
  it("summarises completed lessons, standards and minutes", () => {
    const [child] = buildLedger(
      profiles,
      [
        {
          user_id: "kid-1",
          lesson_id: "algebra-lesson-2",
          status: "completed",
          score: 80,
          completed_at: "2026-01-10T10:00:00Z",
          time_spent_seconds: 1800,
        },
        {
          user_id: "kid-1",
          lesson_id: "algebra-lesson-2",
          status: "in_progress",
          score: null,
          completed_at: null,
          time_spent_seconds: 300,
        },
      ],
      lessons,
    );

    expect(child?.completedCount).toBe(1);
    expect(child?.inProgressCount).toBe(1);
    expect(child?.averageScore).toBe(80);
    expect(child?.totalMinutes).toBe(35);
    expect(child?.standardsMet).toEqual(["HS-ALG.2"]);
  });

  it("filters by date range", () => {
    const [child] = buildLedger(
      profiles,
      [
        {
          user_id: "kid-1",
          lesson_id: "algebra-lesson-2",
          status: "completed",
          score: 90,
          completed_at: "2025-12-01T10:00:00Z",
          time_spent_seconds: 600,
        },
      ],
      lessons,
      { from: "2026-01-01" },
    );

    expect(child?.lessons).toHaveLength(0);
    expect(child?.completedCount).toBe(0);
  });
});
