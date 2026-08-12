# UNIFY University — RPG Campus

A playable top-down 2D campus that is the real navigation layer for UNIFY, plus a Traditional Workspace, both reading the exact same courses, lessons, questions and progress records.

## What gets built

**Campus world (Phaser 3, tile-based, 32px)**
- Walkable outdoor campus: Welcome Plaza (spawn), Central Quad, Outdoor Study Gardens, Student Commons, with grass/path/brick/stone/water, trees, flowers, benches, lamps, signs, fountains.
- Enterable interiors: Mathematics & Technology Hall (Algebra 101, Algebra 102/204, Computer Lab, Study Room), Science & Discovery Hall (Biology Lab, Science Classroom, Laboratory), Humanities Hall (History 101, Literature Seminar, Writing Studio), Arts & Creative Center, University Library, Student Center, Career Center, Administration, Personal Student Space.
- Collision layers for walls, buildings, water, furniture, trees, locked areas.
- Student avatar with idle + 4-direction walk; WASD/arrows on desktop, virtual joystick + contextual action button on mobile.
- Camera follow, per-scene chunk loading (only the active zone/interior scene is mounted).

**Systems**
- NPCs: types (student, faculty, librarian, advisor, campus guide, administrator) with lightweight behaviors (idle, walk path, sit, study, read, talk).
- Dialogue: bottom-of-screen RPG panel with speaker name, portrait slot, and choice buttons (e.g. START CLASS / ASK TEACHER / NOT YET).
- Interaction: proximity prompt + E key / mobile button, verbs ENTER, TALK, READ, STUDY, OPEN, ATTEND CLASS, SEARCH, EXPLORE.
- Objectives: current objective HUD with target location and distance, completion and "next objective" chaining.
- Map: minimap HUD plus full campus map with current location, buildings, objective marker, discovered locations, and fast travel unlocked per discovery.

**Curriculum (pre-authored, no generator anywhere)**
Seeded with real written content — no placeholders, no "generate lesson" UI:
- `foundations-algebra`: Variables and Expressions, Order of Operations, One-Step Equations
- `world-civilizations`: What Is Civilization?, Ancient River Valley Civilizations, Ancient Egypt
- `intro-life-science`: What Is Life?, Cells, Ecosystems and Interdependence

Each lesson has sections (explanation, worked examples, activity), practice questions, and a knowledge check with graded results.

**Lesson flow**
Walk to room → talk to teacher NPC → ATTEND CLASS → lesson overlay opens → read sections → practice → knowledge check → progress saved → return to campus → teacher acknowledges → objective updates.

**AI Teacher**
An in-lesson tutor panel scoped to the current lesson's stored content. It explains, questions, hints, encourages, and corrects misconceptions; it is prompt-constrained to never author new curriculum and never hand over answers outright.

**Traditional Workspace**
Course list, course detail, lesson reader, transcript, academic plan, achievements — the same lesson IDs and progress rows as the campus. Registrar / Advisor NPCs deep-link into these pages.

**Personal Student Space**
Bed, desk, computer, bookshelf, closet, wall decor, door — computer opens Workspace, bookshelf opens Library, desk studies, wall shows achievements, door returns to campus.

## Technical notes

- Stack is TanStack Start + React 19 + TypeScript + Vite + Tailwind + shadcn/ui (fixed for this project; the Vite/React/TS/Tailwind requirement is satisfied). Phaser 3 is added and mounted client-only behind a hydration gate, since it needs `window`.
- Zustand campus store: `playerPosition`, `playerDirection`, `currentZone`, `currentBuilding`, `currentRoom`, `currentObjective`, `dialogueOpen`, `interactionTarget`, `mapOpen`, `lessonOpen`. React HUD and Phaser scenes communicate only through this store + an event bus.
- Lovable Cloud (Postgres + auth) for accounts, curriculum and progress; RLS scopes progress to the signed-in student. Tables: `campus_zones`, `campus_buildings`, `campus_rooms`, `campus_objects`, `campus_npcs`, `campus_interactions`, `student_campus_discoveries`, `campus_objectives`, `courses`, `course_units`, `lessons`, `lesson_sections`, `questions`, `assessments`, `student_progress`. Content is inserted as literal seed rows in the migration.
- Shared string IDs everywhere (`foundations-algebra`, `algebra-lesson-2`, `algebra-204`); rooms carry the `lesson_id`/`course_id` they teach. Curriculum is stored once and read by both interfaces.
- Dexie.js mirrors courses/lessons/progress for offline read + local progress writes, with a pending-changes queue that flushes to the database on reconnect.
- Original art only: a small hand-generated pixel tileset, building facades, interior furniture, and character sprites in the UNIFY palette (Bordeaux, Terracotta, Ochre, Warm Linen, Sage, Deep Green, Muted Blue, Warm Brown), wired as semantic design tokens. No copyrighted assets or references.
- Routes: `/campus`, `/campus/map`, `/campus/building/$buildingId`, `/campus/room/$roomId`, `/campus/library`, `/campus/career`, `/campus/student-center`, `/campus/personal-space`, plus `/`, `/auth`, and the workspace routes.

## Build order

1. Backend + schema + full curriculum seed + auth + design system/palette.
2. Traditional Workspace (courses, lesson player, practice, knowledge check, progress, transcript) — proves the data layer end to end.
3. Phaser engine shell: player, movement, collision, camera, mobile controls, Welcome Plaza + Central Quad.
4. Interaction, dialogue, NPC, objective, minimap/map/fast-travel systems.
5. All remaining buildings and interiors, including Library, Student Center, Career Center (LifePath), Administration, Personal Student Space.
6. AI Teacher tutor inside the lesson overlay.
7. Dexie offline cache + sync queue.
8. Walk the 21-step acceptance flow in a real browser session and fix what breaks.

This is a large build; expect it to land over several turns following that order rather than in one pass.
