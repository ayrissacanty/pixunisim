import { describe, expect, it } from "vitest";
import { getZone, ZONE_IDS } from "./world";
import { buildWalkMask, isWalkableTile, reachabilityReport } from "./walkable";
import { isSolid } from "./tiles";

describe("walkability mask", () => {
  it("blocks water, hedges and walls in every zone", () => {
    for (const id of ZONE_IDS) {
      const zone = getZone(id);
      const mask = buildWalkMask(zone);
      const doorways = new Set(
        zone.interactables.filter((i) => i.action.kind === "travel").map((i) => `${i.x},${i.y}`),
      );
      for (let y = 0; y < zone.height; y++) {
        for (let x = 0; x < zone.width; x++) {
          const kind = zone.tiles[y]![x]!;
          if (kind === "door" || doorways.has(`${x},${y}`)) continue;
          if (isSolid(kind)) {
            expect(mask.data[y * mask.width + x], `${id} ${kind} @${x},${y}`).toBe(0);
          }
        }
      }
    }
  });

  it("treats out-of-bounds tiles as blocked", () => {
    const zone = getZone("welcome-plaza");
    expect(isWalkableTile(zone, -1, 4)).toBe(false);
    expect(isWalkableTile(zone, zone.width, 4)).toBe(false);
  });

  it("keeps every travel interactable reachable", () => {
    for (const id of ZONE_IDS) {
      const zone = getZone(id);
      for (const i of zone.interactables) {
        if (i.action.kind !== "travel") continue;
        expect(isWalkableTile(zone, i.x, i.y), `${id} door ${i.id}`).toBe(true);
      }
    }
  });

  it("spawn points are walkable", () => {
    for (const id of ZONE_IDS) {
      const zone = getZone(id);
      expect(
        isWalkableTile(zone, zone.defaultSpawn.x, zone.defaultSpawn.y),
        `${id} spawn`,
      ).toBe(true);
    }
  });
});

describe("reachability with prop collision", () => {
  it("every door, interactable, NPC and room is reachable from the spawn", () => {
    for (const id of ZONE_IDS) {
      const report = reachabilityReport(getZone(id));
      expect(
        report.unreachable.map((u) => `${u.kind}:${u.id}@${u.x},${u.y}`),
        `${id} unreachable`,
      ).toEqual([]);
    }
  });
});
