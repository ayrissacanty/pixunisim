# UNIFY University Premium Campus Rebuild

## Goal
Turn the existing working homeschool platform into a cohesive, handcrafted 2D indie-RPG experience while preserving the real campus movement, curriculum, progress synchronization, family reporting, accessibility, and authentication already in place.

## Experience

### 1. Rebuild the public landing page
- Replace the remaining marketing-template feel with a full-width dark-wood and parchment composition.
- Make the interactive pixel campus window the dominant first-screen experience, using the real campus artwork and clear routes into preview, sign-in, and household setup.
- Add concise philosophy, curriculum guardrails, and parent-led reporting sections without turning the page into a generic card grid.
- Keep the existing responsive navigation and route metadata, with one clear UNIFY identity mark rather than a generic AI symbol.

### 2. Upgrade the 13-zone campus explorer
- Restyle the existing campus map as a tactile parchment atlas with dark timber framing, moss accents, pixel rendering, discovery state, current location, zoom/pan, and click-to-travel.
- Surface all 13 existing zones, with focused inspection details for Classroom #1, Library Stacks, and Science Conservatory.
- Add compact lesson, faculty, standard-code, and progress information before a learner enters a room.
- Preserve actual Phaser movement, door transitions, collision behavior, objective tracking, touch controls, and accessibility settings.

### 3. Create richer faculty-led classroom experiences
- Establish Alley the Owl for Mathematics, Professor Vance for Literature, and Dr. Kaelen for Science as distinct faculty identities with portraits, titles, backstories, subject language, and room-specific introductions.
- Connect each faculty room to real pre-authored lessons and visible step-by-step quest progress.
- Show curriculum standard codes beside lesson progress and completion results.
- Keep the existing shared lesson/progress IDs so campus and Workspace always show the same state.

### 4. Rebuild tutoring chat with AI Elements
- Install and compose the official Conversation, Message, Prompt Input, and Shimmer primitives before changing the tutor UI.
- Give assistant messages an unboxed reading style, user messages a high-contrast moss treatment, and loading states a quiet “Thinking…” shimmer.
- Keep tutoring constrained to the active pre-authored lesson through the existing server function.
- Personalize tutor identity and welcome copy by faculty member without inventing curriculum.

### 5. Strengthen parent guardrails
- Surface standards and completion evidence in the classroom and Workspace.
- Add clear links from learning surfaces to the existing family report/ledger.
- Preserve the current family-news and progress hooks so lesson completion and scores continue feeding parent reporting automatically.

## Visual System
- Refine semantic tokens around espresso `#141210`, dark wood `#1F1A17`, moss `#3A4D39`, soft sage `#84A98C`, parchment, muted brass, and warm readable text.
- Use the existing Fraunces/Karla pairing for elegant academic headers and clean body text.
- Apply pixelated rendering only to game artwork and sprites, not interface text.
- Use tighter radii, framed panels, subtle wood/parchment texture, restrained shadows, and 1px ink-like separators.
- Avoid gradients as decoration, generic SaaS cards, generic Sparkles branding, 3D assets, and unlicensed third-party artwork.
- Generate a cohesive original set of faculty portraits/interior images where existing original assets cannot support the requested fidelity.

## Technical Details
- Keep TanStack Start, React, Phaser, Zustand, Dexie, and Lovable Cloud architecture; the pasted single-component mockup is treated as visual direction, not a replacement architecture.
- Reuse the existing `/`, `/campus`, `/workspace`, `/workspace/lesson/$lessonId`, and `/family` routes rather than duplicating state in a new page switcher.
- Extend existing world metadata and faculty mappings only where needed; no curriculum generation and no unrelated backend schema changes.
- Use semantic design tokens in `src/styles.css` and existing shared Button/UI components.
- Maintain mobile thumb controls, reduced motion, focus mode, safe-area spacing, and readable contrast.

## Verification
- Run the no-3D guard, full typecheck/build, lint, and relevant unit tests.
- Verify landing, campus map, classroom entry, tutor messaging, lesson completion, Workspace progress, and family report links in Chromium.
- Check desktop and 411px mobile layouts for overlap, text clipping, map usability, chat composer spacing, and pixel-art rendering.
