# Doors, room transitions and hand-drawn building facades

## What's wrong today

- **Exterior doors are swallowed by the building volume.** The exterior building helper (`src/lib/campus/world.ts:122`) stamps the door tile on the building's own last wall row (`y + h - 1`). Since the upright renderer now extrudes the whole connected footprint as one solid volume, that door tile sits *under* the 3-storey mass and is invisible from the camera. Interior room doors (`y + h`, outside the room border) are correctly placed, so the problem is specific to exterior buildings.
- Building facades are flat colour blocks with plain rectangle windows — no frames, no sills, no linework variation — so they don't match the hand-drawn look of the props and characters.

Everything else (walk-mask door exceptions, travel triggers, spawn placement) needs verification rather than an assumed fix; that verification is step 1 below.

## Plan

### 1. Door alignment and triggers
- Move exterior door tiles out of the extruded footprint: stamp them on the near-facing apron row directly in front of the building, and mark the corresponding wall tile as a doorway opening so the facade shows a door instead of blank wall.
- Render a drawn door panel (frame, panel, step, small lamp) on the near facade of every building at its door column, so the entrance visually lines up with the walkable tile.
- Re-verify that each `travel` interactable's tile is walkable, adjacent to the door, and reachable from the zone spawn; and that the paired arrival spawn in the destination zone is walkable and clear of furniture.

### 2. Room enter/exit reliability
- Extend the existing walkability/reachability tests into a round-trip test: for every `travel` interactable, the destination zone exists, the arrival spawn is walkable, and a return route back to the origin exists — so no room can be entered without an exit.
- Confirm zone load/unload in the Phaser scene fully tears down building graphics, props, NPCs and decor before rebuilding, so repeated in/out transitions don't leak objects or stale colliders.

### 3. Hand-drawn upright facades
- Consistent linework: darker ink outline on every silhouette edge, lighter interior seams for storey lines and corner joints, matching the prop/character outline weight.
- Window framing: each window gets a frame, mullion cross-bar, sill and a soft glass highlight instead of a flat rectangle.
- Subtle texture variation: deterministic per-building seed drives faint brick/plaster banding, slight per-window tint variation and gentle roof shingle rows, so no two buildings look identical while the palette stays fixed.
- Roof detail pass: ridge cap line, eave shadow under the overhang, and a chimney/vent on larger footprints.

### 4. Verification
- Run the campus test suite plus the new door/round-trip tests.
- Drive the preview in a browser: screenshot each zone, walk through one exterior door and one classroom door, and confirm the entrance reads correctly against the upright massing.

## Technical notes

Files touched: `src/lib/campus/world.ts` (door placement + doorway tile), `src/game/CampusScene.ts` (`drawBuilding` facade/window/roof detail and door panel), `src/lib/campus/walkable.ts` if the doorway tile needs a mask exception, and the test files `walkable.test.ts` / `occlusion.test.ts` for the new assertions. No gameplay logic, curriculum data or schema changes.
