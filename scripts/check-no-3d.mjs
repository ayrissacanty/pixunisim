#!/usr/bin/env node
/**
 * Build guard: the campus is 2D-only (Phaser sprite sheets and procedural
 * canvas art). This fails the build if any 3D package, loader or model asset
 * creeps back into the project.
 *
 * Run directly (`node scripts/check-no-3d.mjs`) or import `scanFor3D` from a
 * test.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));

/** Directories that never ship to the browser bundle. */
const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  ".output",
  ".nitro",
  ".vinxi",
  ".lovable",
  "__pycache__",
  ".workspace",
]);

/** Files allowed to mention the forbidden terms (this guard and its test). */
const ALLOWLIST = [
  join("scripts", "check-no-3d.mjs"),
  join("src", "lib", "no-3d.test.ts"),
];

/** Everything that would mean a 3D dependency is back. */
export const FORBIDDEN = [
  { id: "three-package", label: "three.js package import", re: /\bfrom\s+["']three(\/[^"']*)?["']|\brequire\(["']three(\/[^"']*)?["']\)/ },
  { id: "react-three", label: "@react-three / drei", re: /@react-three\/[a-z-]+/ },
  { id: "gltf-loader", label: "GLTF/FBX/OBJ loader", re: /\b(GLTFLoader|FBXLoader|OBJLoader|DRACOLoader|useGLTF|useFBX)\b/ },
  { id: "model-asset", label: "GLB/GLTF/FBX/OBJ model asset", re: /[\w./-]+\.(glb|gltf|fbx)\b/i },
  { id: "three-dep", label: "3D dependency in package.json", re: /"(three|three-stdlib|@react-three\/[a-z-]+|@types\/three)"\s*:/ },
];

const SCANNED_EXT = /\.(ts|tsx|js|jsx|mjs|cjs|json|css|html|md)$/;

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) yield* walk(full);
    else yield full;
  }
}

/** Returns every forbidden 3D reference found under `root`. */
export function scanFor3D(root = ROOT) {
  const hits = [];
  for (const file of walk(root)) {
    const rel = relative(root, file);
    if (ALLOWLIST.includes(rel)) continue;
    // A stray model file itself is a failure, whatever its contents.
    if (/\.(glb|gltf|fbx|obj|bin)$/i.test(rel)) {
      hits.push({ file: rel.split(sep).join("/"), line: 0, rule: "model-asset", text: rel });
      continue;
    }
    if (!SCANNED_EXT.test(rel)) continue;
    let text;
    try {
      text = readFileSync(file, "utf8");
    } catch {
      continue;
    }
    const lines = text.split("\n");
    for (const rule of FORBIDDEN) {
      lines.forEach((line, i) => {
        if (rule.re.test(line)) {
          hits.push({
            file: rel.split(sep).join("/"),
            line: i + 1,
            rule: rule.id,
            text: line.trim().slice(0, 160),
          });
        }
      });
    }
  }
  return hits;
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const hits = scanFor3D();
  if (hits.length) {
    console.error(`\n✖ 3D references found (${hits.length}). This project is 2D-only.\n`);
    for (const h of hits) console.error(`  ${h.file}:${h.line}  [${h.rule}]  ${h.text}`);
    console.error("\nRemove the 3D package/asset or the build cannot proceed.\n");
    process.exit(1);
  }
  console.log("✓ No GLTF/GLB/FBX/three.js references — campus is fully 2D.");
}
