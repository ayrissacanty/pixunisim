import { useCampusStore } from "@/lib/campus/store";
import { Button } from "@/components/ui/button";
import { PortraitView } from "@/components/campus/PortraitView";
import { usePortrait } from "@/lib/profile";

export function DialogueBox() {
  const dialogue = useCampusStore((s) => s.dialogue);
  const advance = useCampusStore((s) => s.advanceDialogue);
  const close = useCampusStore((s) => s.closeDialogue);
  const portrait = usePortrait();
  if (!dialogue) return null;

  const last = dialogue.lineIndex >= dialogue.lines.length - 1;

  return (
    <div
      data-testid="dialogue-box"
      data-speaker={dialogue.speaker}
      className="pointer-events-auto absolute inset-x-0 bottom-0 z-30 p-3 sm:p-5"
    >
      <div className="mx-auto flex max-w-3xl items-end gap-3">
        <div className="hidden w-24 shrink-0 sm:block">
          <PortraitView portrait={portrait} alt="Your portrait" />
        </div>
        <div className="flex-1 rounded-md border-2 border-accent bg-sidebar/95 p-4 shadow-xl backdrop-blur">
        <div className="flex items-baseline gap-2">
          <span className="font-display text-base font-bold text-accent">{dialogue.speaker}</span>
          {dialogue.role && (
            <span className="text-[11px] uppercase tracking-widest text-sidebar-foreground/70">
              {dialogue.role}
            </span>
          )}
        </div>
        <p className="mt-2 min-h-12 text-sm leading-relaxed text-sidebar-foreground">
          {dialogue.lines[dialogue.lineIndex]}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {!last ? (
            <Button size="sm" onClick={advance}>
              Continue
            </Button>
          ) : (
            <>
              {dialogue.choices.map((c) => (
                <Button
                  key={c.label}
                  size="sm"
                  variant={c.variant === "ghost" ? "outline" : "default"}
                  onClick={c.action}
                >
                  {c.label}
                </Button>
              ))}
              <Button size="sm" variant="ghost" onClick={close}>
                Goodbye
              </Button>
            </>
          )}
        </div>
        </div>
      </div>
    </div>
  );
}

export function ReadingBox() {
  const reading = useCampusStore((s) => s.reading);
  const close = useCampusStore((s) => s.closeReading);
  if (!reading) return null;
  return (
    <div className="pointer-events-auto absolute inset-0 z-30 flex items-center justify-center bg-black/50 p-4">
      <div className="max-w-lg rounded-md border-2 border-border bg-card p-5 shadow-xl">
        <h3 className="font-display text-lg font-bold text-foreground">{reading.title}</h3>
        <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-foreground/90">
          {reading.body}
        </p>
        <Button className="mt-4" size="sm" onClick={close}>
          Close
        </Button>
      </div>
    </div>
  );
}
