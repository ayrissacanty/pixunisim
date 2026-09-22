import { useCampusStore } from "@/lib/campus/store";
import { useLesson, useProgress, progressFor } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { classroomConfig, subjectLabel } from "@/lib/campus/classroom-config";
import { BookOpenCheck, GraduationCap, ListChecks, PencilLine, X } from "lucide-react";

/**
 * The chalkboard is the gateway into the lesson. Everything it shows comes
 * from the assigned lesson record — nothing about the lesson is written into
 * the room itself.
 */
export function BoardPanel() {
  const board = useCampusStore((s) => s.board);
  const setBoard = useCampusStore((s) => s.setBoard);
  const openLesson = useCampusStore((s) => s.openLesson);
  const { data: lesson } = useLesson(board?.lessonId);
  const { data: progress } = useProgress();

  if (!board) return null;

  const row = progressFor(progress, board.lessonId);
  const config = classroomConfig({
    subject: lesson?.subject ?? null,
    grade: lesson?.grade ?? null,
    roomId: board.roomId,
    roomName: board.roomName,
  });
  const objective = lesson?.sections?.[0]?.heading ?? lesson?.summary ?? "Today's work";

  const start = () => {
    setBoard(undefined);
    openLesson(board.lessonId, board.courseId, board.roomId);
  };

  return (
    <div
      data-testid="board-panel"
      data-room={board.roomId}
      className="absolute inset-0 z-40 grid place-items-center bg-background/70 p-4 backdrop-blur-sm"
    >
      <div className="block-panel-lg w-full max-w-md border-accent bg-sidebar/95 p-4 text-sidebar-foreground">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-display text-[11px] uppercase tracking-[0.2em] text-accent">
              {subjectLabel(config.subject)}
            </p>
            <h2 className="font-display text-lg font-bold">{lesson?.title ?? board.roomName}</h2>
          </div>
          <button
            type="button"
            aria-label="Close the board"
            className="rounded-md p-1 hover:bg-accent/20"
            onClick={() => setBoard(undefined)}
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="mt-3 rounded-md border-2 border-warm-brown bg-deep-green p-3 text-linen">
          <p className="text-[11px] uppercase tracking-wide opacity-80">Today's objective</p>
          <p className="mt-1 text-sm leading-snug">{objective}</p>
          {lesson?.standard_code && (
            <p className="mt-2 text-[11px] opacity-75">Standard {lesson.standard_code}</p>
          )}
        </div>

        <p className="mt-3 text-xs text-sidebar-foreground/75">
          {board.teacher} teaches here ·{" "}
          {row?.status === "completed"
            ? `completed${row.score != null ? ` at ${row.score}%` : ""}`
            : row
              ? "in progress"
              : "not started yet"}
        </p>

        <div className="mt-3 grid gap-2">
          <Button data-testid="board-start" onClick={start}>
            <BookOpenCheck className="size-4" /> Start lesson
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <Button size="sm" variant="secondary" onClick={start}>
              <PencilLine className="size-4" /> Practice
            </Button>
            <Button size="sm" variant="secondary" onClick={start}>
              <ListChecks className="size-4" /> Quick check
            </Button>
          </div>
          <Button size="sm" variant="outline" onClick={start}>
            <GraduationCap className="size-4" /> Mastery check
          </Button>
        </div>

        <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Room details">
          {config.decorations.map((d) => (
            <li
              key={d}
              className="block-chip border-accent/40 bg-background/40 px-2 py-0.5 text-[10px] font-semibold"
            >
              {d}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
