import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

describe("2D-only guard", () => {
  it("finds no GLTF/GLB/FBX/three.js references anywhere in the project", () => {
    const out = execFileSync("node", ["scripts/check-no-3d.mjs"], { encoding: "utf8" });
    expect(out).toContain("fully 2D");
  });
});
