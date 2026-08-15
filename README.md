# UNIFY Campus Explorer

UNIFY UNIVERSITY — RPG CAMPUS BUILD



You are the lead frontend architect, game UX designer, and educational-platform engineer for UNIFY.



We are building UNIFY as a lifelong family education operating system.



IMPORTANT PRODUCT DECISIONS:



1. DO NOT BUILD AN AI STUDIO.

2. DO NOT BUILD A STUDENT-FACING AI CURRICULUM GENERATOR.

3. DO NOT CREATE EMPTY COURSE PLACEHOLDERS.

4. Curriculum is pre-authored and stored in the application/database.

5. The AI Teacher teaches the existing lessons.

6. The university campus should be a playable 2D top-down RPG-style world.

7. The Traditional Workspace is a separate interface.

8. Both experiences MUST use the same course, lesson, assessment, and progress data.



The RPG campus should be inspired by the general interaction model of classic top-down RPG games:



- top-down camera

- tile-based world

- walkable campus

- character sprites

- buildings

- rooms

- doors

- NPCs

- dialogue

- interactive objects

- objectives

- campus map

- personal student room



Do NOT copy any copyrighted game, sprites, maps, characters, UI, or assets.



Create an original UNIFY visual identity.



==================================================

TECH STACK

==================================================



Use:



React

TypeScript

Vite

Tailwind CSS

shadcn/ui where appropriate

Phaser 3 for the 2D RPG campus if supported reliably

Zustand for game state

Dexie.js for local-first persistence

Supabase for authentication, database, and synchronization



Do not use Vercel-specific proprietary backend services.



The application must remain portable.



==================================================

CAMPUS EXPERIENCE

==================================================



Create a walkable university campus.



The student begins at:



UNIFY UNIVERSITY

WELCOME PLAZA



The campus contains:



WELCOME PLAZA

CENTRAL QUAD

MATHEMATICS & TECHNOLOGY HALL

SCIENCE & DISCOVERY HALL

HUMANITIES HALL

ARTS & CREATIVE CENTER

UNIVERSITY LIBRARY

STUDENT CENTER

CAREER CENTER

ADMINISTRATION

OUTDOOR STUDY GARDENS

STUDENT COMMONS

PERSONAL STUDENT SPACE



The campus should feel like a real university.



==================================================

VISUAL STYLE

==================================================



Use an original polished pixel-art-inspired visual style.



The visual language should be:



warm

academic

beautiful

slightly whimsical

mature

inviting

detailed



UNIFY colors:



Bordeaux

Terracotta

Ochre

Warm Linen

Sage

Deep Green

Muted Blue

Warm Brown



Do NOT make it look like a children's game.



Do NOT use excessive neon colors.



Do NOT use generic AI-generated-looking graphics.



Do NOT make the world empty.



==================================================

CAMPUS MAP

==================================================



Create a large campus world.



Use tile-based map architecture.



Suggested logical tile size:



32x32.



The world should contain:



grass

paths

brick

stone

water

trees

flowers

benches

lamps

signs

doors

windows

buildings

furniture



Create collision layers.



The player must not walk through:



walls

buildings

water

furniture

trees

locked areas



==================================================

PLAYER

==================================================



Create a student avatar.



Initial implementation can use a temporary original pixel-art sprite or simple sprite representation, but architect the system so custom sprites can be added later.



Movement:



WASD

Arrow keys



Mobile:



Virtual joystick

Contextual interaction button



Player animations:



idle

walk up

walk down

walk left

walk right



==================================================

WELCOME PLAZA

==================================================



Build:



UNIFY UNIVERSITY entrance



Welcome sign



Fountain



Campus map



Information board



Trees



Flowers



Benches



Student NPCs



Campus guide



First objective:



"Explore UNIFY University."



==================================================

CENTRAL QUAD

==================================================



Create the heart of the university.



Include:



large lawn

paths

fountain

trees

benches

study tables

campus announcements

students

faculty

event board



All major buildings should connect naturally to the Quad.



==================================================

ACADEMIC BUILDINGS

==================================================



MATHEMATICS & TECHNOLOGY HALL



Departments:



Mathematics

Computer Science

Technology



Rooms:



Algebra 101

Algebra 102

Computer Lab

Study Room



SCIENCE & DISCOVERY HALL



Departments:



Biology

Chemistry

Earth Science

Physics



Rooms:



Biology Lab

Science Classroom

Laboratory



HUMANITIES HALL



Departments:



History

Literature

Writing

Philosophy

Social Studies



Rooms:



History 101

Literature Seminar

Writing Studio



==================================================

LIBRARY

==================================================



Create a detailed walkable library.



Include:



Entrance

Librarian desk

Bookshelves

Reading tables

Computers

Quiet rooms

Research area

Archives



NPC:



Librarian



Interactions:



Talk to Librarian

Search Library

Browse Resources

Study



==================================================

STUDENT CENTER

==================================================



Create:



Student lounge

Cafeteria

Study tables

Club board

Community board

Events

Social spaces



Populate with NPC students.



==================================================

CAREER CENTER

==================================================



Create:



Career Advisor

Career Boards

Pathway Displays

Career Resources



Categories:



Healthcare

Technology

Construction

Business

Education

Creative Careers

Entrepreneurship

Trades



Interaction:



Explore Careers



This opens the UNIFY LifePath system.



==================================================

ADMINISTRATION

==================================================



Create:



Admissions

Registrar

Academic Advising

Family Services



Interactions can open Traditional Workspace pages.



Example:



Registrar:



VIEW TRANSCRIPT



Academic Advisor:



VIEW ACADEMIC PLAN



==================================================

PERSONAL STUDENT SPACE

==================================================



Create a personal room for the student.



Use:



Bed

Desk

Computer

Bookshelf

Closet

Decorations

Door



Objects should be interactive.



Computer:



OPEN WORKSPACE



Bookshelf:



OPEN LIBRARY



Desk:



STUDY



Wall:



VIEW ACHIEVEMENTS



Door:



GO TO CAMPUS



This is the student's home base.



==================================================

NPC SYSTEM

==================================================



Create reusable NPC architecture.



Types:



student

faculty

librarian

advisor

campus guide

administrator



NPC behaviors:



idle

walk

sit

study

read

talk

enter building

leave building



Use lightweight behavior logic.



==================================================

DIALOGUE SYSTEM

==================================================



Create RPG-style dialogue.



Example:



PROFESSOR MAYA



"Welcome back. Are you ready for today's lesson?"



Buttons:



START CLASS

ASK TEACHER

NOT YET



Dialogue should appear near the bottom of the game screen.



==================================================

INTERACTION SYSTEM

==================================================



Create a reusable interaction system.



Examples:



ENTER

TALK

READ

STUDY

OPEN

ATTEND CLASS

SEARCH

EXPLORE



Desktop:



E key



Mobile:



contextual button



==================================================

CLASSROOM SYSTEM

==================================================



A classroom is an actual physical location.



Example:



Mathematics Hall

→ Algebra 204

→ Professor Maya



When the student approaches:



ATTEND CLASS



Selecting this opens the existing lesson.



==================================================

CURRICULUM

==================================================



The curriculum is pre-rendered.



NO AI STUDIO.



NO GENERATE LESSON BUTTON.



NO EMPTY COURSE.



Initial database/content seed must include:



COURSE 1:

Foundations of Algebra



Lessons:



Lesson 1 — Variables and Expressions

Lesson 2 — Order of Operations

Lesson 3 — One-Step Equations



COURSE 2:

World Civilizations



Lessons:



Lesson 1 — What Is Civilization?

Lesson 2 — Ancient River Valley Civilizations

Lesson 3 — Ancient Egypt



COURSE 3:

Introduction to Life Science



Lessons:



Lesson 1 — What Is Life?

Lesson 2 — Cells: The Building Blocks of Life

Lesson 3 — Ecosystems and Interdependence



Each lesson must contain actual educational content.



Do not use placeholder text.



==================================================

LESSON FLOW

==================================================



Student:



walks to classroom



↓



talks to teacher



↓



selects ATTEND CLASS



↓



lesson interface opens



↓



AI Teacher teaches existing lesson



↓



student reads/explores content



↓



student completes practice



↓



student completes knowledge check



↓



progress saved



↓



student returns to classroom



↓



teacher responds



↓



objective updates



==================================================

AI TEACHER

==================================================



The AI Teacher is an instructor.



The teacher does NOT create the curriculum.



The teacher explains:



existing lesson content

existing examples

existing activities

existing questions



The teacher can:



explain

ask questions

give hints

provide encouragement

clarify misconceptions



The teacher must not simply give answers.



==================================================

OBJECTIVE SYSTEM

==================================================



Example:



TODAY'S OBJECTIVE



Attend Algebra 204



Distance:

120m



After completion:



✓ Algebra Complete



NEXT:



Attend World History



==================================================

CAMPUS MAP

==================================================



Create:



mini map



full campus map



Current location



Buildings



Objective



Discovered locations



Fast travel



Fast travel should unlock after the student discovers a location.



==================================================

ROUTES

==================================================



Create:



/campus



/campus/map



/campus/building/:buildingId



/campus/room/:roomId



/campus/library



/campus/career



/campus/student-center



/campus/personal-space



==================================================

GAME STATE

==================================================



Create Zustand state:



playerPosition

playerDirection

currentZone

currentBuilding

currentRoom

currentObjective

dialogue

interaction

mapOpen

lessonOpen



Example:



interface CampusState {

  currentZone: string;

  currentBuilding?: string;

  currentRoom?: string;

  currentObjective?: string;

  dialogueOpen: boolean;

  interactionTarget?: string;

  mapOpen: boolean;

}



==================================================

DATABASE

==================================================



Create tables/entities:



campus_zones

campus_buildings

campus_rooms

campus_objects

campus_npcs

campus_interactions

student_campus_discoveries

campus_objectives



Academic tables:



courses

course_units

lessons

lesson_sections

questions

assessments

student_progress



==================================================

SHARED IDs

==================================================



This is extremely important.



The RPG campus and Traditional Workspace MUST use the same IDs.



Example:



course_id:

foundations-algebra



lesson_id:

algebra-lesson-2



room_id:

algebra-204



When the student enters Algebra 204:



lesson_id = algebra-lesson-2



When the student opens Traditional Workspace:



the exact same lesson_id is loaded.



Never duplicate curriculum data.



==================================================

LOCAL-FIRST

==================================================



Use Dexie.js.



The student should be able to:



open cached lessons

view progress

continue lessons

record local progress



while offline.



When internet returns:



sync pending changes to Supabase.



==================================================

PERFORMANCE

==================================================



Use:



lazy loading

map chunking

sprite optimization

asset compression

limited NPC counts

efficient collision

cached maps



Do not load every campus building simultaneously if unnecessary.



==================================================

IMPORTANT

==================================================



Do NOT make the RPG world a decorative animation.



It is the actual navigation layer of UNIFY.



The student should be able to physically:



walk

explore

enter

talk

study

attend

complete

return



==================================================

ACCEPTANCE TEST

==================================================



A student must be able to:



1. Login.

2. Enter 3D/2D Campus mode.

3. Spawn at Welcome Plaza.

4. Walk around.

5. Open the campus map.

6. Find Mathematics Hall.

7. Enter Mathematics Hall.

8. Walk to Algebra 204.

9. Talk to the teacher.

10. Start the class.

11. Complete a real prebuilt lesson.

12. Answer questions.

13. Save progress.

14. Return to the campus.

15. See the objective update.

16. Enter the Library.

17. Talk to the Librarian.

18. Visit the Career Center.

19. Return to the Personal Student Space.

20. Open the Traditional Workspace.

21. See the same lesson progress.



Do not mark this feature complete until this flow works.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://unify-campus-quest.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/d157e89a-a410-4259-bea0-99b95c6a6b77).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
