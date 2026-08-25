# Go fully 2D: remove the 3D pack, restyle the campus

## What 2D art the project already has (confirmed)

These are all live and stay:

- `punyworld-overworld-tileset.png` — outdoor terrain/paths/water, used by `src/lib/campus/tileset.ts` (the campus base tiles).
- `env_props.png` (+ `src/lib/campus/env-atlas.json`) — outdoor decor scatter, `src/lib/campus/decor.ts`.
- `interiors_demo.png`, `tiles_and_items.png`, `school_interior.png` — building interiors, `src/lib/campus/interiors.ts`.
- `barn.png`, `blade.png`, `water-wheel.png` — Agricultural Science field, `src/lib/campus/farm.ts`.
- `16x16_modern_mixed_*.png`, `16x16_walls_*.png` — extra interior tiles.
- `paperdoll/*` (skin, eyes, hair, clothes) — layered dialogue portraits, `src/lib/portrait.ts`.
- Player + NPC movement sprites are drawn procedurally in `src/game/CampusScene.ts` (4-direction walk cycle), not from a 3D pack.

So: the campus map, buildings, decor, interiors, movement and portraits are already 100% 2D Phaser. No GLTF is used on the campus map itself.

## What actually depends on the 3D pack (what breaks)

The 3D pack is only used *after* you enter a room — Layer 3 and 4 — plus two workspace screens:

| File | Role | Fate |
| --- | --- | --- |
| `src/components/three/CharacterStage.tsx` | Three.js room + character renderer | delete |
| `src/components/lesson/Lesson3DStage.tsx` | 3D lesson visual | delete |
| `src/lib/props3d.ts`, `src/lib/room-assets.ts`, `src/lib/lowpoly.ts` | GLB/FBX registry, loader cache, procedural low-poly bodies | delete |
| `src/routes/dev.rooms.tsx` | 3D room preview route | delete |
| `src/components/campus/ClassroomBeat.tsx` | Layer 3 classroom beat | rebuild as a 2D illustrated scene |
| `src/components/lesson/LessonPlayer.tsx` | Layer 4 lesson | drop 3D stage, keep lesson content + portraits |
| `src/routes/_authenticated/workspace.room.tsx` | 3D dorm room | rebuild as 2D room view |
| `src/routes/_authenticated/workspace.avatar.tsx` | 3D avatar preview | switch to the paperdoll portrait |
| `src/components/campus/CampusView.tsx` | calls `prefetchCharacters` / `prefetchRoomAssets` | remove those calls |
| `src/lib/characters.ts` | character specs feeding the 3D rig | trim to 2D portrait/sprite specs |

Also removed: the `three` dependency, `src/assets/room3d/*` (31 GLB pointers), `src/assets/props/*` (20 FBX), `src/assets/characters/*.fbx`. Character `.png` textures are kept if usable as 2D portraits.

Nothing in the database changes — `campus_zones → campus_buildings → campus_rooms/courses → lessons` is untouched.

## Replacement for the 3D rooms

- **Classroom beat (Layer 3):** a 2D illustrated classroom card — chalkboard header, teacher portrait, classmate portrait row, the existing paced dialogue and "Start the class" button. Same flow, no canvas.
- **Lesson (Layer 4):** lesson content with the teacher portrait panel; no 3D stage.
- **Dorm room:** 2D room panel built from the interior tilesheets already in the project.

## Visual restyle: warm storybook + blocky sandbox

- Retune tokens in `src/styles.css` to a bright saturated base — coral, sunflower yellow, grass green, sky blue — with Bordeaux, Terracotta, Ochre and Sage demoted to accents only.
- Keep the chunky `block-panel` / `block-btn` look (solid drop shadows, thick rounded borders), warmed up: rounder corners, higher-contrast labels.
- Campus map reads as an illustrated Adventure Academy–style board: zone tinting, clear building signposts/labels on the map, bright pathways, and hover/selected states on interactable buildings.
- HUD, minimap, dialogue box and objective tracker restyled to match.

## Technical notes

- Remove `three` from `package.json`; verify no import remains via a repo-wide search.
- Delete stale asset pointers with `lovable-assets delete` so no orphaned CDN objects are left.
- Existing tests (`Minimap.test.tsx`, walkability, walkthrough, Playwright flow) must still pass; the Playwright walkthrough gets updated selectors for the new 2D classroom beat.
