import { X } from "lucide-react";
import { useCampusStore } from "@/lib/campus/store";
import { LessonPlayer } from "@/components/lesson/LessonPlayer";
import { Button } from "@/components/ui/button";

export function LessonOverlay() {
  const lessonOpen = useCampusStore((s) => s.lessonOpen);
  const close = useCampusStore((s) => s.closeLesson);
  if (!lessonOpen) return null;

  return (
    <div
      data-testid="lesson-overlay"
      data-layer="4"
      className="pointer-events-auto absolute inset-0 z-40 flex items-stretch justify-center bg-black/60 p-2 sm:p-6"
    >
      <div className="flex w-full max-w-3xl flex-col overflow-hidden rounded-md border-2 border-accent bg-background shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <p className="font-display text-sm font-bold">In class</p>
          <Button size="icon" variant="ghost" onClick={close} aria-label="Leave the classroom">
            <X className="size-4" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <LessonPlayer lessonId={lessonOpen.lessonId} compact onComplete={close} />
        </div>
      </div>
    </div>
  );
}
