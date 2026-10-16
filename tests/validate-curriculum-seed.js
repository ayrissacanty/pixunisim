/* validate-curriculum-seed.js — loads curriculum-seed.js with a window stub and
   validates every lesson + resource against the required schema. Prints pass/fail. */
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm");
const ctx = { window: {} };
vm.createContext(ctx);
for (const part of ["curriculum-seed-1.js","curriculum-seed-2.js","curriculum-seed-3.js","curriculum-seed-4.js","curriculum-seed-5.js","curriculum-seed-6.js","curriculum-seed-7.js","curriculum-seed-8.js","curriculum-seed-9.js"]) vm.runInContext(fs.readFileSync(path.join(__dirname, "..", part), "utf8"), ctx);
const SEED = ctx.window.UNIFY_CURRICULUM_SEED;

let pass = 0, fail = 0;
const bad = (id, msg) => { fail++; console.log("FAIL [" + id + "]: " + msg); };
const ok = () => pass++;

const LESSON_KEYS = ["id","title","gradeBand","subject","topic","durationMin","objectives","vocabulary","resources","segments","questions","homework","extraCredit","teacherId","delivery","assigned","created"];
const BANDS = ["K-2","3-5","6-8","9-12"];
const SUBJECTS = ["Math","English","Science","History","Geography","Life Skills"];
const minFor = b => (b === "K-2" || b === "3-5") ? 15 : 30;

if (!SEED || !Array.isArray(SEED.lessons) || !Array.isArray(SEED.resources)) { console.log("FATAL: seed missing lessons/resources"); process.exit(1); }

const ids = new Set();
for (const L of SEED.lessons) {
  let good = true;
  const g = m => { good = false; bad(L.id || "?", m); };
  for (const k of LESSON_KEYS) if (!(k in L)) g("missing key " + k);
  if (ids.has(L.id)) g("duplicate id"); ids.add(L.id);
  if (!BANDS.includes(L.gradeBand)) g("bad gradeBand " + L.gradeBand);
  if (!SUBJECTS.includes(L.subject)) g("bad subject " + L.subject);
  if (typeof L.durationMin !== "number" || L.durationMin < minFor(L.gradeBand)) g("durationMin under minimum");
  if (!Array.isArray(L.segments) || L.segments.length < 3) g("segments missing/too few");
  else {
    const sum = L.segments.reduce((s, x) => s + (+x.minutes || 0), 0);
    if (sum !== L.durationMin) g("segment minutes (" + sum + ") != durationMin (" + L.durationMin + ")");
    if (sum < minFor(L.gradeBand)) g("segment sum under band minimum");
    for (const s of L.segments) for (const k of ["name","minutes","activity","gesture","expression","media"]) if (!(k in s)) g("segment missing " + k);
  }
  if (!Array.isArray(L.objectives) || L.objectives.length < 2) g("objectives < 2");
  if (!Array.isArray(L.vocabulary) || L.vocabulary.length < 3) g("vocabulary < 3");
  else for (const v of L.vocabulary) if (!v.term || !v.def) g("vocab entry missing term/def");
  if (!Array.isArray(L.questions) || L.questions.length < 3) g("questions < 3");
  if (!Array.isArray(L.resources) || L.resources.length < 1) g("resources < 1");
  if (!L.homework || typeof L.homework !== "string") g("homework missing");
  if (!L.extraCredit || typeof L.extraCredit !== "string") g("extraCredit missing");
  if (L.teacherId !== "") g("teacherId should be ''");
  if (!L.delivery || !Array.isArray(L.delivery.traits) || !L.delivery.traits.length) g("delivery.traits missing");
  if (!L.delivery || typeof L.delivery.guidelines !== "string" || !L.delivery.guidelines.includes("speak naturally in your own words")) g("delivery.guidelines missing/reworded");
  if (!L.delivery || !Array.isArray(L.delivery.engagement) || L.delivery.engagement.length < 3) g("delivery.engagement < 3");
  if (typeof L.assigned !== "boolean") g("assigned not boolean");
  if (!/^2026-10-0[1-9]/.test(L.created)) g("created not early Oct 2026: " + L.created);
  if (good) ok();
}

// coverage: 2+ lessons per band x subject
for (const b of BANDS) for (const s of SUBJECTS) {
  const n = SEED.lessons.filter(l => l.gradeBand === b && l.subject === s).length;
  if (n < 2) { fail++; console.log("FAIL coverage: " + b + "/" + s + " has " + n); } else pass++;
}
// assigned: exactly one per band for Math + English (8 total)
let asg = SEED.lessons.filter(l => l.assigned);
if (asg.length !== 8) bad("assigned", "expected 8 assigned, got " + asg.length); else pass++;
for (const b of BANDS) for (const s of ["Math","English"]) {
  const n = asg.filter(l => l.gradeBand === b && l.subject === s).length;
  if (n !== 1) { fail++; console.log("FAIL assigned coverage " + b + "/" + s + " = " + n); } else pass++;
}

// resources
const rt = new Set();
for (const r of SEED.resources) {
  let good = true;
  const g = m => { good = false; bad(r.title || "?", m); };
  for (const k of ["title","gradeBand","subject","type","source","url","summary","keyFacts","vocabulary","addTo"]) if (!(k in r)) g("missing key " + k);
  if (rt.has(r.title.toLowerCase())) g("duplicate title"); rt.add((r.title||"").toLowerCase());
  if (!["article","video","interactive","game","model"].includes(r.type)) g("bad type");
  if (!/^https:\/\/[a-z0-9.-]+\.[a-z]{2,}(\/[^\s]*)?$/i.test(r.url)) g("bad url " + r.url);
  if (!Array.isArray(r.keyFacts) || r.keyFacts.length !== 3) g("keyFacts != 3");
  if (!Array.isArray(r.vocabulary) || r.vocabulary.length !== 3) g("vocabulary != 3");
  if (!["lessons","resources","games","imagery"].includes(r.addTo)) g("bad addTo " + r.addTo);
  if (good) ok();
}
for (const b of BANDS) for (const s of SUBJECTS) {
  const n = SEED.resources.filter(r => r.gradeBand === b && r.subject === s).length;
  if (n < 1) { fail++; console.log("FAIL resource coverage: " + b + "/" + s); } else pass++;
}

console.log("\nlessons: " + SEED.lessons.length + ", resources: " + SEED.resources.length);
console.log("checks passed: " + pass + ", failed: " + fail);
process.exit(fail ? 1 : 0);
