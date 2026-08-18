import { memo } from "react";
import { CheckCircle2, DoorOpen, GraduationCap, Target } from "lucide-react";
import { useCampusStore, type TrackerEvent } from "@/lib/campus/store";

const ICON: Record<TrackerEvent["kind"], typeof Target> = {
  room: DoorOpen,
  lesson: GraduationCap,
  assessment: CheckCircle2,
  travel: Target,
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
      className="max-w-64 rounded-md border border-border bg-card/95 px-3 py-2 text-xs shadow"
    >
      <p className="font-semibold uppercase tracking-widest text-[10px] text-accent">Objective</p>
      <p className="mt-0.5 text-foreground">{objective ?? "Explore the campus."}</p>
      {(room || lastDoor) && (
        <p className="mt-1 text-[10px] text-muted-foreground">
          {room ? `In ${room}` : `Through ${lastDoor}`}
        </p>
      )}
      {events.length > 0 && (
        <ul className="mt-2 space-y-1 border-t border-border pt-2">
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
