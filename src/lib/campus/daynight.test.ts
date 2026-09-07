import { describe, expect, it } from "vitest";
import { ambientAt, clockLabel, phaseAt } from "./daynight";
import { createBrain, scheduleFor, stepBrain } from "./npc-brain";
import type { NpcSpawn } from "./world";

const spawn: NpcSpawn = {
  id: "npc-test",
  name: "Test Student",
  role: "Student",
  x: 10,
  y: 10,
  behavior: "walk",
  lines: [],
} as unknown as NpcSpawn;

describe("day/night cycle", () => {
  it("maps hours onto phases", () => {
    expect(phaseAt(2 * 60)).toBe("night");
    expect(phaseAt(6 * 60)).toBe("dawn");
    expect(phaseAt(12 * 60)).toBe("midday");
    expect(phaseAt(19 * 60)).toBe("dusk");
    expect(phaseAt(23 * 60)).toBe("night");
  });

  it("is darker at night than at midday", () => {
    expect(ambientAt(1 * 60).alpha).toBeGreaterThan(ambientAt(12 * 60).alpha);
  });

  it("formats a 12-hour clock", () => {
    expect(clockLabel(0)).toBe("12:00 AM");
    expect(clockLabel(13 * 60 + 5)).toBe("1:05 PM");
  });
});

describe("npc state machine", () => {
  it("parks characters at their station in the morning", () => {
    expect(scheduleFor(spawn, "morning").mode).toBe("station");
    expect(scheduleFor(spawn, "night").mode).toBe("idle");
  });

  it("freezes while in dialogue and resumes afterwards", () => {
    const brain = createBrain(spawn, 320, 320);
    const ctx = {
      spawn,
      phase: "afternoon" as const,
      homeX: 320,
      homeY: 320,
      x: 320,
      y: 320,
      delta: 16,
      talking: true,
      motion: 1,
      canStand: () => true,
    };
    expect(stepBrain(brain, ctx)).toBeNull();
    expect(brain.state).toBe("IN_DIALOGUE");
    stepBrain(brain, { ...ctx, talking: false });
    expect(brain.state).not.toBe("IN_DIALOGUE");
  });

  it("only wanders to points it can stand on", () => {
    const brain = createBrain(spawn, 320, 320);
    const target = stepBrain(brain, {
      spawn,
      phase: "dusk",
      homeX: 320,
      homeY: 320,
      x: 320,
      y: 320,
      delta: 5000,
      talking: false,
      motion: 1,
      canStand: () => false,
    });
    expect(target).toBeNull();
    expect(brain.state).toBe("IDLE");
  });
});
