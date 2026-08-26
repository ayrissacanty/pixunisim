import { describe, expect, it } from "vitest";
// @ts-expect-error - plain ESM build guard, no types
import { scanFor3D } from "../../scripts/check-no-3d.mjs";

describe("2D-only guard", () => {
  it("finds no GLTF/GLB/FBX/three.js references anywhere in the project", () => {
    const hits = scanFor3D() as { file: string; line: number; rule: string }[];
    expect(hits.map((h) => `${h.file}:${h.line} ${h.rule}`)).toEqual([]);
  });
});
