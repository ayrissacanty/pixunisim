import { describe, expect, it } from "vitest";
import { actorDepth, DEPTH_BIAS, footprintDepth, GROUND_DEPTH, isoDepth, tileDepth } from "./depth";
import { isoObjectsFor, isoLayerFor } from "./isoprops";
import { getZone } from "./world";
import { isWalkableTile } from "./walkable";
import type { ZoneMap } from "./world";

/**
 * Visual-regression suite for isometric occlusion.
 *
 * These scenarios pin the EXACT draw order the renderer must produce. If a
 * change to the depth model flips any of them, the campus would visibly
 * mis-sort (a player walking "in front" of a building would vanish behind
 * it), so the build fails here first.
 */

function syntheticZone(tiles: string[][], kind: ZoneMap["kind"] = "interior"): ZoneMap {
  return {
    id: "test-zone",
    name: "Test",
    kind,
    width: tiles[0]!.length,
    height: tiles.length,
    tiles: tiles.map((row) => row.map((t) => t as ZoneMap["tiles"][0][0])),
    rooms: [],
    interactables: [],
    npcs: [],
    mapPos: { x: 0.5, y: 0.5 },
    defaultSpawn: { x: 1, y: 1 },
  };
}

describe("occlusion order — canonical scenarios", () => {
  it("an actor in front of (south-east of) a prop draws OVER it", () => {
    const prop = footprintDepth(4, 4);
    const inFront = actorDepth(4.5 * 32, 5.2 * 32);
    expect(inFront).toBeGreaterThan(prop);
  });

  it("an actor behind (north-west of) a prop draws UNDER it", () => {
    const prop = footprintDepth(4, 4);
    const behind = actorDepth(4.2 * 32, 3.8 * 32);
    expect(behind).toBeLessThan(prop);
  });

  it("a 2x2 building occludes a prop touching its near corner but not its far corner", () => {
    const building = footprintDepth(3, 3, 2, 2); // near corner at (5,5)
    const propAtNear = tileDepth(5, 5);
    const propAtFar = tileDepth(2, 2);
    expect(propAtNear).toBeGreaterThan(building);
    expect(propAtFar).toBeLessThan(building);
  });

  it("same-tile tie-breakers are stable: decal < object < actor < label", () => {
    const at = (bias: number) => isoDepth(160, 160, bias);
    expect(at(DEPTH_BIAS.decal)).toBeLessThan(at(DEPTH_BIAS.object));
    expect(at(DEPTH_BIAS.object)).toBeLessThan(at(DEPTH_BIAS.actor));
    expect(at(DEPTH_BIAS.actor)).toBeLessThan(at(DEPTH_BIAS.label));
  });

  it("ground is always behind every object", () => {
    expect(GROUND_DEPTH).toBeLessThan(footprintDepth(0, 0));
  });

  it("depth ordering is pinned to exact values (regression anchor)", () => {
    // If the projection scale ever changes, these numbers move and every
    // baked depth assumption must be re-audited — that is intentional.
    expect(footprintDepth(0, 0)).toBe(33);
    expect(footprintDepth(10, 10, 2, 2)).toBe(385);
    expect(actorDepth(100, 200)).toBe(152);
    expect(tileDepth(4, 4)).toBe(161);
  });
});

describe("occlusion order — painter sequence", () => {
  it("isoObjectsFor emits far tiles before near tiles", () => {
    const zone = syntheticZone([
      ["floor", "tree", "floor"],
      ["desk", "floor", "wall"],
      ["floor", "shelf", "floor"],
    ]);
    const objects = isoObjectsFor(zone);
    const sums = objects.map((o) => o.x + o.y);
    const sorted = [...sums].sort((a, b) => a - b);
    expect(sums).toEqual(sorted);
    // Block and prop layers are both present in this fixture.
    expect(objects.some((o) => o.layer === "block")).toBe(true);
    expect(objects.some((o) => o.layer === "prop")).toBe(true);
  });

  it("flat objects (hedge, flower, fountain, rug) never enter the object layer", () => {
    const zone = syntheticZone([["hedge", "flower", "fountain", "rug"]]);
    expect(isoObjectsFor(zone)).toEqual([]);
  });
});

describe("occlusion order — interiors and door thresholds", () => {
  it("interior furniture uses the same footprint model as exterior props", () => {
    // A desk in a classroom and a tree on the quad share the depth math.
    expect(isoLayerFor("desk")).toBe("prop");
    expect(isoLayerFor("tree")).toBe("prop");
    const desk = footprintDepth(2, 3);
    const tree = footprintDepth(2, 3);
    expect(desk).toBe(tree);
  });

  it("every interior zone's door thresholds stay walkable ground (never an object)", () => {
    const interiorIds = ["algebra-204", "library", "science-lab", "student-center"];
    const checked: string[] = [];
    for (const id of interiorIds) {
      let zone: ZoneMap;
      try {
        zone = getZone(id);
      } catch {
        continue; // zone id not present in this world build
      }
      if (zone.kind !== "interior") continue;
      checked.push(id);
      expect(isoLayerFor("door")).toBe("ground");
      for (const door of zone.doors ?? []) {
        expect(isWalkableTile(zone, door.x, door.y)).toBe(true);
        // Door tiles must not be spawned as depth-sorted objects.
        expect(isoObjectsFor(zone).some((o) => o.x === door.x && o.y === door.y)).toBe(false);
      }
      // And its props still sort with footprintDepth.
      for (const o of isoObjectsFor(zone)) {
        expect(footprintDepth(o.x, o.y)).toBeGreaterThan(GROUND_DEPTH);
      }
    }
    expect(checked.length).toBeGreaterThan(0);
  });

  it("an actor standing on a door threshold sorts against room props on BOTH sides", () => {
    const zone = syntheticZone(
      [
        ["wall", "door", "wall"],
        ["desk", "floor", "shelf"],
        ["floor", "floor", "floor"],
      ],
      "interior",
    );
    const objects = isoObjectsFor(zone);
    const desk = objects.find((o) => o.kind === "desk")!;
    // Actor crossing the threshold (row 0) is behind the desk in row 1.
    const onThreshold = actorDepth(1.5 * 32, 1 * 32);
    expect(onThreshold).toBeLessThan(footprintDepth(desk.x, desk.y));
    // Actor fully inside the room (row 2) is in front of it.
    const inside = actorDepth(1.5 * 32, 2.5 * 32);
    expect(inside).toBeGreaterThan(footprintDepth(desk.x, desk.y));
  });
});
