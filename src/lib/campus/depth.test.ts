import { describe, expect, it } from "vitest";
import { TILE } from "./tiles";
import { DEPTH_BIAS, actorDepth, footprintDepth, tileDepth } from "./depth";
import { isoLayerFor, isoObjectsFor } from "./isoprops";
import { getZone } from "./world";

describe("isometric depth model", () => {
  it("sorts tiles further along x+y in front", () => {
    expect(tileDepth(2, 2)).toBeGreaterThan(tileDepth(1, 2));
    expect(tileDepth(2, 2)).toBeGreaterThan(tileDepth(2, 1));
    expect(tileDepth(0, 5)).toBeCloseTo(tileDepth(5, 0));
  });

  it("draws an actor in front of the tile it stands on and behind the next row", () => {
    const tx = 6;
    const ty = 4;
    const standing = actorDepth(tx * TILE + TILE / 2, ty * TILE + TILE / 2);
    expect(standing).toBeGreaterThan(tileDepth(tx, ty - 1));
    expect(standing).toBeLessThan(tileDepth(tx, ty + 1));
  });

  it("keeps labels above their own actor but below the next row", () => {
    const px = 100;
    const py = 100;
    expect(actorDepth(px, py, DEPTH_BIAS.label)).toBeGreaterThan(actorDepth(px, py));
    expect(actorDepth(px, py, DEPTH_BIAS.label)).toBeLessThan(actorDepth(px + TILE, py));
  });

  it("anchors multi-tile footprints on their near corner", () => {
    expect(footprintDepth(2, 2, 3, 3)).toBeCloseTo(tileDepth(4, 4));
  });

  it("classifies building tiles as blocks and furniture as props", () => {
    expect(isoLayerFor("buildingWall")).toBe("block");
    expect(isoLayerFor("window")).toBe("block");
    expect(isoLayerFor("desk")).toBe("prop");
    expect(isoLayerFor("tree")).toBe("prop");
    expect(isoLayerFor("grass")).toBe("ground");
    expect(isoLayerFor("path")).toBe("ground");
  });

  it("collects depth-sorted objects for a real zone in painter order", () => {
    const zone = getZone("welcome-plaza");
    const objects = isoObjectsFor(zone);
    expect(objects.length).toBeGreaterThan(0);
    for (let i = 1; i < objects.length; i += 1) {
      const prev = objects[i - 1]!;
      const cur = objects[i]!;
      expect(prev.x + prev.y).toBeLessThanOrEqual(cur.x + cur.y);
      expect(footprintDepth(prev.x, prev.y)).toBeLessThanOrEqual(footprintDepth(cur.x, cur.y));
    }
  });
});
