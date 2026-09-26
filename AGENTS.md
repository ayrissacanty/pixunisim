<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->
- Lesson 3D worlds are data-driven from src/components/lesson/three/subject-world.ts (course id > title > subject); each world object maps to a lesson section. Why: one place to add worlds.
- Family members get their own auth accounts, created by a parent through a server function; lesson_plans is parent-write, student-read. Why: keeps each person's data separate by user id.
