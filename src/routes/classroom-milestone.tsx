import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { IsoClassroom, type LessonKind } from "@/components/milestone/IsoClassroom";

export const Route = createFileRoute("/classroom-milestone")({
  head: () => ({
    meta: [
      { title: "Grade 4 Classroom & Hallway — Unify University" },
      { name: "description", content: "Walk a detailed Common Core classroom and hallway with a teacher, classmates and lesson-driven props." },
      { property: "og:title", content: "Grade 4 Classroom & Hallway — Unify University" },
      { property: "og:description", content: "Walk a detailed Common Core classroom and hallway with a teacher, classmates and lesson-driven props." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Milestone,
});

function Milestone() {
  const [lesson, setLesson] = useState<LessonKind>("math");
  const [view, setView] = useState<"iso" | "flat">("iso");
  const btn = "rounded-md border-2 border-foreground/60 bg-card px-3 py-1 text-sm font-bold text-card-foreground";
  return (
    <div className="flex h-dvh flex-col">
      <div className="flex flex-wrap items-center gap-2 bg-card p-2">
        <button className={btn} aria-pressed={lesson === "math"} onClick={() => setLesson(lesson === "math" ? "ela" : "math")}>
          Lesson: {lesson === "math" ? "Math" : "Reading"}
        </button>
        <button className={btn} onClick={() => setView(view === "iso" ? "flat" : "iso")}>
          View: {view === "iso" ? "Slanted" : "Top-down"}
        </button>
        <span className="text-xs text-muted-foreground">Arrows/WASD to walk · E to interact</span>
      </div>
      <div className="flex-1">
        <IsoClassroom lesson={lesson} view={view} />
      </div>
    </div>
  );
}
