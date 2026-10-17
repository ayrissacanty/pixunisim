// Loads the school pages in headless Chromium and reports script crashes and frame errors.
import http from "node:http";
import path from "node:path";
import { readFile } from "node:fs/promises";
import { chromium } from "playwright";

const PORT = 8792;
const ROOT = path.resolve(".");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".webp": "image/webp", ".webmanifest": "application/manifest+json" };
const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, "http://x");
  let p = decodeURIComponent(u.pathname);
  if (p === "/") p = "/index.html";
  const file = path.normalize(path.join(ROOT, p));
  if (!file.startsWith(ROOT + path.sep) && file !== ROOT) { res.writeHead(403); return res.end(); }
  try {
    const body = await readFile(file);
    res.writeHead(200, { "content-type": TYPES[path.extname(file)] || "application/octet-stream" });
    res.end(body);
  } catch { res.writeHead(404); res.end("missing"); }
});
await new Promise((r) => server.listen(PORT, "127.0.0.1", r));
const browser = await chromium.launch({ args: ["--no-sandbox", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const pages = ["hallway3d.html?v=19", "classroom3d.html", "auditorium3d.html", "dorm.html", "index.html", "fieldtrip.html"];
let failed = 0;
for (const page of pages) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 780 } });
  const p = await ctx.newPage();
  const problems = [];
  const seen = new Set();
  const note = (s) => { const k = s.slice(0, 180); if (seen.has(k)) return; seen.add(k); problems.push(k); };
  p.on("pageerror", (e) => note("CRASH " + e.message));
  p.on("console", (m) => {
    const t = m.text();
    if (m.type() === "error" || /hall frame|failed|TypeError|Cannot read|not a function|WebGL/i.test(t)) note(m.type() + ": " + t);
  });
  try {
    await p.goto(`http://127.0.0.1:${PORT}/${page}`, { waitUntil: "commit", timeout: 20000 });
    await p.waitForTimeout(2500);
    if (page.startsWith("hallway")) {
      const info = await p.evaluate(() => {
        const h = window.__hall;
        if (!h) return "no hall object";
        h.speed = 30;
        return `students ${h.students?.length} px ${!!h.px} bodies ${!!h.bodies}`;
      }).catch((e) => "eval " + e.message);
      note("state: " + info);
      await p.waitForTimeout(8000);
      const after = await p.evaluate(() => {
        const h = window.__hall;
        const gl = document.querySelector("canvas")?.getContext("webgl2") || document.querySelector("canvas")?.getContext("webgl");
        return `clock ${Math.floor(h?.clock ?? -1)} canvases ${document.querySelectorAll("canvas").length} lost ${gl?.isContextLost?.() ?? "n/a"}`;
      }).catch((e) => "eval " + e.message);
      note("after: " + after);
    } else {
      await p.waitForTimeout(4000);
      const n = await p.locator("canvas").count().catch(() => 0);
      note("canvases " + n);
    }
  } catch (e) { note("LOAD " + e.message.split("\n")[0]); }
  const real = problems.filter((x) => !x.startsWith("state:") && !x.startsWith("after:") && !x.startsWith("canvases"));
  console.log((real.length ? "FAIL" : "PASS") + "  " + page);
  for (const x of problems) console.log("    " + x);
  if (real.length) failed++;
  await ctx.close();
}
await browser.close();
server.close();
console.log(failed ? failed + " page(s) crashed" : "no crashes");
process.exit(failed ? 1 : 0);
