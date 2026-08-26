import { memo } from "react";
import { CheckCircle2, DoorOpen, GraduationCap, MessageCircle, Target } from "lucide-react";
import { useCampusStore, type TrackerEvent } from "@/lib/campus/store";

const ICON: Record<TrackerEvent["kind"], typeof Target> = {
  room: DoorOpen,
  lesson: GraduationCap,
  assessment: CheckCircle2,
  travel: Target,
  npc: MessageCircle,
};

/**
 * Live objective panel: the current goal plus the last few things the student
 * did (rooms entered, lessons started, assessments recorded).
 */
export const ObjectiveTracker = memo(function ObjectiveTracker() {
  const objective = useCampusStore((s) => s.currentObjective);
  const events = useCampusStore((s) => s.events);
  const room = useCampusStore((s) => s.currentRoomName);
  const lastDoor = useCampusStore((s) => s.lastDoor);

  if (!objective && events.length === 0) return null;

  return (
    <div
      data-testid="objective-tracker"
      data-objective={objective ?? ""}
      data-events={events.length}
      className="block-panel relative max-w-64 overflow-hidden border-accent/70 bg-card/95 pb-2.5 text-xs"
    >
      {/* Chunky game-UI title ribbon. */}
      <div className="flex items-center gap-1.5 border-b-[3px] border-accent/70 bg-accent px-3 py-1.5">
        <Target className="size-3.5 text-accent-foreground" aria-hidden="true" />
        <p className="font-display text-[11px] font-black uppercase tracking-[0.18em] text-accent-foreground">
          Objective
        </p>
      </div>
      <div className="px-3.5 pt-2">
        <p className="font-semibold leading-snug text-foreground">
          {objective ?? "Explore the campus."}
        </p>
        {(room || lastDoor) && (
          <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {room ? `In ${room}` : `Through ${lastDoor}`}
          </p>
        )}
      </div>

      {events.length > 0 && (
        <ul className="mt-2 space-y-1 border-t-[3px] border-border pt-2">
          {events.slice(0, 4).map((e) => {
            const Icon = ICON[e.kind];
            return (
              <li
                key={e.id}
                data-event-kind={e.kind}
                className="flex items-start gap-1.5 text-[11px] text-muted-foreground"
              >
                <Icon className="mt-0.5 size-3 shrink-0 text-accent" aria-hidden="true" />
                <span className="text-foreground/80">{e.text}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
});
