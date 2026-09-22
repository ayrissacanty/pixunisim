import { describe, expect, it } from "vitest";
import { levelForXp, levelProgress, xpForLevel, AWARD_VALUES } from "@/lib/progression";

describe("progression curve", () => {
  it("starts every student at level 1", () => {
    expect(levelForXp(0)).toBe(1);
    expect(xpForLevel(1)).toBe(0);
  });

  it("levels up at the published thresholds", () => {
    expect(xpForLevel(2)).toBe(100);
    expect(levelForXp(99)).toBe(1);
    expect(levelForXp(100)).toBe(2);
    expect(levelForXp(xpForLevel(5))).toBe(5);
  });

  it("reports progress inside the current level", () => {
    const p = levelProgress(150);
    expect(p.level).toBe(2);
    expect(p.into).toBe(50);
    expect(p.span).toBe(200);
  });

  it("rewards mastery and quests more than exploring", () => {
    expect(AWARD_VALUES.quest.xp).toBeGreaterThan(AWARD_VALUES.mastery.xp);
    expect(AWARD_VALUES.mastery.xp).toBeGreaterThan(AWARD_VALUES.lesson.xp);
    expect(AWARD_VALUES.lesson.xp).toBeGreaterThan(AWARD_VALUES.discovery.xp);
  });
});
