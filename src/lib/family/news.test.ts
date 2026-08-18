import { describe, expect, it } from "vitest";
import { buildFamilyReport, streakFromDays } from "@/lib/family/news";

const now = new Date(2026, 7, 18, 10, 0, 0);
const iso = (dayOffset: number) =>
  new Date(2026, 7, 18 - dayOffset, 9, 0, 0).toISOString();

const members = [
  { id: "a", display_name: "Ada", mascot_color: "ochre", mascot_accessory: "none" },
  { id: "b", display_name: "Ben", mascot_color: "sage", mascot_accessory: "cap" },
];

describe("streakFromDays", () => {
  it("counts consecutive days ending today", () => {
    const days = new Set(["2026-08-18", "2026-08-17", "2026-08-16", "2026-08-14"]);
    expect(streakFromDays(days, now)).toBe(3);
  });

  it("returns 0 when nothing recent", () => {
    expect(streakFromDays(new Set(["2026-08-01"]), now)).toBe(0);
  });
});

describe("buildFamilyReport", () => {
  it("summarises today, this week, scores and streaks", () => {
    const report = buildFamilyReport({
      members,
      progress: [
        { user_id: "a", lesson_id: "l1", status: "completed", score: 90, completed_at: iso(0) },
        { user_id: "a", lesson_id: "l2", status: "completed", score: 80, completed_at: iso(1) },
        { user_id: "b", lesson_id: "l3", status: "completed", score: 70, completed_at: iso(2) },
        { user_id: "b", lesson_id: "l4", status: "in_progress", score: null, completed_at: null },
      ],
      objectives: [
        { user_id: "a", objective_key: "algebra", completed: true, completed_at: iso(0) },
      ],
      lessonTitles: { l1: "Algebra 204", l2: "Fractions", l3: "Ecosystems" },
      now,
    });

    expect(report.lessonsToday).toBe(1);
    expect(report.lessonsThisWeek).toBe(3);
    expect(report.objectivesToday).toBe(1);
    const ada = report.members.find((m) => m.id === "a")!;
    expect(ada.completedToday).toEqual(["Algebra 204"]);
    expect(ada.streakDays).toBe(2);
    expect(ada.averageScore).toBe(85);
    const text = report.script.join(" ");
    expect(text).toContain("Ada");
    expect(text).toContain("Algebra 204");
    expect(text).toContain("2 day learning streak");
  });

  it("handles an empty family week", () => {
    const report = buildFamilyReport({
      members,
      progress: [],
      objectives: [],
      lessonTitles: {},
      now,
    });
    expect(report.headline).toContain("quiet");
    expect(report.script.join(" ")).toContain("No lessons have been completed");
  });
});
