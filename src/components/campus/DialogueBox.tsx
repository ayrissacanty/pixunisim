import { useCampusStore } from "@/lib/campus/store";
import { Button } from "@/components/ui/button";
import { PortraitView } from "@/components/campus/PortraitView";
import { usePortrait } from "@/lib/profile";
import { npcPortrait } from "@/lib/campus/npc-cast";
import { useMotionStore, transitionsAnimated } from "@/lib/a11y/motion";

export function DialogueBox() {
  const dialogue = useCampusStore((s) => s.dialogue);
  const advance = useCampusStore((s) => s.advanceDialogue);
  const close = useCampusStore((s) => s.closeDialogue);
  const playerPortrait = usePortrait();
  const motionSetting = useMotionStore((s) => s.setting);
  const animated = transitionsAnimated(motionSetting);

  if (!dialogue) return null;

  const last = dialogue.lineIndex >= dialogue.lines.length - 1;
  // Speak-to NPCs show their own cast portrait; narration falls back to you.
  const portrait = dialogue.speakerId ? npcPortrait(dialogue.speakerId) : playerPortrait;

  return (
    <div
      data-testid="dialogue-box"
      data-speaker={dialogue.speaker}
      data-speaker-id={dialogue.speakerId ?? ""}
      className={`pointer-events-auto absolute inset-x-0 bottom-0 z-30 p-3 sm:p-5 ${
        animated ? "animate-fade-in" : ""
      }`}
    >
      <div className="mx-auto flex max-w-3xl items-end gap-3">
        <div className="hidden w-24 shrink-0 sm:block">
          <PortraitView
            portrait={portrait}
            alt={dialogue.speakerId ? `${dialogue.speaker} portrait` : "Your portrait"}
          />
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
  const motionSetting = useMotionStore((s) => s.setting);
  const animated = transitionsAnimated(motionSetting);

  if (!reading) return null;

  return (
    <div
      className={`pointer-events-auto absolute inset-0 z-30 flex items-center justify-center bg-black/50 p-4 ${
        animated ? "animate-fade-in" : ""
      }`}
    >
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
