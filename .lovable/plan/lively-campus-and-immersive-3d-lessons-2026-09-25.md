# Lively campus and immersive 3D lessons

## Goal
Keep the campus as a handcrafted 2D pixel RPG, brighten it with the selected vibrant pixel-academia palette, and open lessons inside interactive 3D subject worlds.

## Build
- Enrich the campus and classroom colors with balanced coral, sunflower, grass, sky, violet, teal, and warm wood accents while preserving contrast and the existing pixel-art layout.
- Add scrapbook character through taped notes, pinned labels, and polaroid-like lesson details without obscuring movement or controls.
- Replace the existing static “3D lesson” illustration with a client-only interactive 3D subject world shown when a lesson starts.
- Give math, science, literature, and writing distinct scenes, objects, lighting, interaction prompts, and visual identities; derive the scene from each lesson’s subject.
- Keep lesson text, checks, saved progress, tutoring, and completion controls accessible beside or over the scene.
- Preserve mobile controls and provide reduced-motion behavior plus a graceful non-WebGL fallback.

## Technical details
- Use React Three Fiber with procedural low-poly subject objects; no external model downloads are needed.
- Retire the old project-wide “2D-only” build guard because 3D is now intentionally limited to lesson immersion; the 2D campus remains unchanged.
- Mount the scene only after the browser loads to avoid server-rendering conflicts.
- Cap rendering density and shadow costs for phones.
- Add focused tests for subject selection and lesson integration, then verify campus and lesson views at desktop and mobile sizes.
