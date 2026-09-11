import { describe, expect, it } from "vitest";
import { ZONE_IDS } from "@/lib/campus/world";
import { ZONE_GUIDES, recommendedZones, zoneGuide } from "@/lib/campus/zone-guide";

describe("zone guide", () => {
  it("covers every configured campus zone", () => {
    for (const id of ZONE_IDS) {
      expect(zoneGuide(id), `missing guide for ${id}`).toBeDefined();
    }
  });

  it("gives each zone art, a steward and a three-step quest", () => {
    for (const guide of Object.values(ZONE_GUIDES)) {
      expect(guide.image).toBeTruthy();
      expect(guide.steward).toBeTruthy();
      expect(guide.backstory.length).toBeGreaterThan(20);
      expect(guide.quest).toHaveLength(3);
    }
  });

  it("recommends zones from a child's interests", () => {
    expect(recommendedZones([])).toEqual([]);
    expect(recommendedZones(["numbers"])).toContain("math-tech-hall");
    expect(recommendedZones(["animals"])).toContain("science-hall");
  });
});
