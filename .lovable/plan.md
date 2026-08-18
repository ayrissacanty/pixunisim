# Fix campus animation stutter and mobile lag

## Goal
Make the motion setting produce visibly and measurably different rendering paths, and remove unnecessary work from the Phaser and React/Three.js loops—especially on mobile and lower-power devices.

## Changes
1. **Turn Motion into a real performance mode**
   - Keep Full as the complete experience.
   - Reduced will cap the campus loop near 30 FPS, remove NPC idle/walk bob, disable character limb/bob updates, snap or simplify camera follow, shorten transitions, and lower prop streaming density.
   - Off will remove decorative character animation and transition animation entirely, use a static camera response, and render only essential nearby props.
   - Apply changes live when the setting changes, without reloading the scene.

2. **Fix Phaser hot-loop costs**
   - Stop publishing player position to Zustand every rendered frame; update only when the tile/direction changes and at a controlled cadence for minimap/persistence.
   - Throttle interaction, room, and door proximity scans instead of scanning every interactable/NPC/room every frame.
   - Replace repeated `Math.hypot` distance checks with squared-distance comparisons.
   - Stop writing unchanged character-part transforms/visibility every frame, and skip NPC animation work outside the camera or while overlays pause play.
   - Pause the Phaser scene when the page is hidden and resume it when visible.
   - Use lower mobile pixel density / renderer settings and a reduced target FPS where appropriate.

3. **Reduce prop-streaming churn**
   - Use squared distances and a lower-frequency stream pass.
   - Make stream radius depend on motion/performance mode and mobile capability.
   - Hide/reuse streamed prop sprites instead of repeatedly destroying and recreating them at room boundaries where practical.

4. **Fix layered UI and 3D animation work**
   - Ensure transitions use only transform/opacity and respect Reduced/Off.
   - Pause the campus renderer whenever dialogue, maps, classroom, or lesson overlays fully cover/block play.
   - Stop Three.js classroom/avatar render loops when hidden; in Reduced/Off, render static or low-frequency frames rather than continuous idle animation.
   - Avoid repeatedly repainting the entire minimap tile grid when only the player marker moves by caching the static map layer.

5. **Verify behavior**
   - Add focused tests for motion-mode helpers and scene performance decisions.
   - Run typecheck/tests and use browser instrumentation to confirm Reduced/Off change actual renderer behavior, position updates are throttled, hidden/blocked scenes pause, and the production debug UI remains absent without `?debug=1`.

## Technical notes
- No curriculum, navigation, collision rules, or saved progress behavior will change.
- Existing accessibility preferences remain persisted; this work makes those preferences control the full rendering pipeline rather than only camera lerp and player bob.
- On small/coarse-pointer devices, Reduced will be the default only when there is no saved user choice, while honoring `prefers-reduced-motion` first.
