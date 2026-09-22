# Integrate the UNIFY master guides

Both uploaded guides overlap heavily with what UNIFY University already has (campus world, quests, backpack, offline sync, parent ledger, character creator). The zip contains no artwork — only the same guide plus project config. So this plan picks the four things the guides ask for that the app is still missing, and wires them to the real student data rather than new demo data.

## 1. XP, levels and coins (game progression)

- New table for per-student progression: XP, level, coins, and a small ledger of awards.
- Awards fire on real accomplishments only: finishing a lesson, passing a mastery check, turning in a quest, discovering a new zone or NPC. No rewards for idle time.
- Game level is separate from school grade, as the guide requires.
- HUD shows a compact level bar and coin count; the reward appears as a toast when earned.
- Parent Ledger gains an XP/level line per child.

## 2. Board-driven classroom entry

- Interacting with the classroom board opens a board panel that reads the live assigned lesson: subject, title, today's objective, standards.
- Options: Start Lesson, Vocabulary, Practice, Quick Check, Mastery — each routes into the existing lesson player instead of duplicating it.
- No lesson titles hard-coded into rooms.

## 3. Data-driven classroom configuration

- One classroom config type (grade level, subject, furniture counts, decorations, board, interactables) feeding the existing room builder.
- Subject packs decide decorations and furniture: math (number line, charts), science (lab tables, periodic table), art (easels, color wheel), computing (computers), literature (reading corner, shelves).
- Rooms stay one reusable engine — subject and grade change the configuration, never a new hard-coded room.

## 4. Daily Story / Today's Missions

- A morning panel on the campus listing today's real items: assigned lessons, active quest steps, unfinished work, one explore suggestion.
- Each item carries a short reason ("picks up where you left off", "mastery gap in fractions") and travels the student to the right place on click.
- Generated from assignments and quests already in the database — no invented tasks.

## Notes

- Keeping the current warm walnut/parchment pixel look, which you chose recently, rather than the brighter palette the guide suggests. Say the word if you want the student world brightened.
- Everything stays inside the existing data model: one student record, shared with the Traditional Workspace and Parent Ledger.

## Technical detail

- New Supabase table `student_progression` (user_id, xp, level, coins) plus `student_awards` event rows, RLS scoped to the student with parent family read, GRANTs included.
- `src/lib/progression.ts`: award hooks + React Query cache, called from the quest completion and lesson completion paths in `src/lib/quests.ts` and the lesson player.
- `src/lib/campus/classroom-config.ts`: `ClassroomConfig` type + subject/grade packs; `world.ts` room builder consumes it.
- `src/components/campus/BoardPanel.tsx` and `DailyStory.tsx`, mounted from `CampusView`, using existing store overlay flags.
- Vitest coverage for progression math, config generation and daily-story ranking; walkability tests re-run after furniture changes.
