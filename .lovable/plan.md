# Four upgrades to Unify University

## 1. Character creator for each child

A guided setup a parent completes once per child, reachable from the family
dashboard and shown automatically the first time a child has no profile set up.

Steps: name → age (sets grade band) → interests (pick a few: numbers, animals,
stories, building, art, space…) → learning style (see it / hear it / do it /
read-write) → look (skin, hair, outfit, mascot — the existing avatar controls).
Final step shows the finished portrait with a "Step into campus" button.

The saved choices are used, not just stored:
- The portrait/avatar appears as the walking character and in every dialogue.
- Interests pick which zones get a "recommended for you" marker on the map.
- Learning style tunes the tutor's tone (visual → sketch-and-diagram wording,
  hands-on → try-it-first wording, etc.).

## 2. All 13 zones fully realised

Today only three rooms have a named faculty member and standards. Each zone gets:
- Its own hand-made pixel illustration used on the map inspector and the
  arrival panel.
- A resident faculty member or steward with a portrait, backstory, philosophy,
  and a 3-step quest.
- The standards codes the zone covers, shown in the map inspector and on arrival.

Zones covered: Welcome Plaza, Central Quad, Student Commons, Outdoor Study
Gardens, Agricultural Science Field, University Library, Student Center, Career
Center, Administration, Personal Student Space, Mathematics & Technology Hall,
Science & Discovery Hall, Humanities Hall, Arts & Creative Center.

## 3. Real lesson content per room

Replace the generic room chatter with authored curriculum stored in the
database, so every classroom teaches something specific:
- Algebra rooms: worked equation exercises with step-by-step checks.
- Literature/humanities rooms: passage-based analysis prompts and evidence
  questions.
- Science rooms: an experiment procedure with observation and explanation steps.
- Arts, agriculture, career and commons rooms get their own short authored
  sessions in the same shape.

Each lesson carries its standard code and grade band, and the in-lesson tutor
answers only from that lesson's material (as it already does) — now with real
material behind every door.

## 4. Parent Ledger dashboard

The landing-page "Parent Ledger" button opens a real dashboard at `/ledger`:
- One card per child: lessons completed, standards met, average score, time
  spent, current streak, last activity.
- A standards table showing which codes are met, in progress, or untouched.
- A date-range filter (this week / this month / all time).
- A "Print report" view: clean page with the household name, date range, per
  child summary and standards list, styled for paper.

## Technical notes

- Schema: add `age`, `grade_band`, `interests text[]`, `learning_style`, and
  `setup_complete` to `profiles`; add `time_spent_seconds` to `student_progress`
  (accumulated as lessons are worked). Keep existing family-scoped RLS pattern;
  add GRANTs for any new table.
- New `src/lib/campus/zone-guide.ts` holds per-zone art, faculty, standards and
  backstory keyed by the existing `ZONE_IDS`; `faculty.ts` folds into it so
  `facultyForRoom` keeps working and unmapped rooms still fall back to the
  room's own teacher.
- Curriculum seeded through one migration with literal INSERTs (courses,
  lessons, questions) so rooms have content on first load.
- Character creator: `src/routes/_authenticated/onboarding.tsx` plus a
  `CharacterCreator` component reusing `appearance.ts` / mascot stores.
- Ledger: `src/routes/_authenticated/ledger.tsx` + `src/lib/family/ledger.ts`
  reading the existing family-scoped queries; print via a `@media print`
  stylesheet, no new dependency.
- Stays 2D-only (the no-3D guard keeps passing); Phaser world logic untouched
  except reading the new profile fields.
