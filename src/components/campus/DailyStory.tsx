import { useMemo } from "react";
import { useCampusStore } from "@/lib/campus/store";
import { useLessons, useProgress } from "@/lib/data";
import { useQuestCatalog, useQuestRecords } from "@/lib/quests";
import { buildDailyStory } from "@/lib/campus/daily-story";
import { locationForLesson } from "@/lib/campus/lesson-index";
import { getZone } from "@/lib/campus/world";
import { Button } from "@/components/ui/button";
import { Sunrise, X } from "lucide-react";

const KIND_LABEL = {
  continue: "Continue your adventure",
  mission: "Today's mission",
  recommended: "Recommended for you",
  explore: "Explore something new",
} as const;

/** Today's Story — the day's real assignments and quest steps, in order. */
export function DailyStory() {
  const open = useCampusStore((s) => s.dailyOpen);
  const setOpen = useCampusStore((s) => s.setDailyOpen);
  const travel = useCampusStore((s) => s.travel);
  const discovered = useCampusStore((s) => s.discovered);
  const { data: lessons } = useLessons();
  const { data: progress } = useProgress();
  const { data: records } = useQuestRecords();
  const quests = useQuestCatalog();

  const items = useMemo(
    () => buildDailyStory({ lessons, progress, quests, records, discovered }),
    [lessons, progress, quests, records, discovered],
  );

  if (!open) return null;

  const goTo = (zoneId?: string, lessonId?: string) => {
    const target = zoneId ?? (lessonId ? locationForLesson(lessonId)?.zoneId : undefined);
    if (!target) return;
    const zone = getZone(target);
    setOpen(false);
    travel(zone.id, zone.defaultSpawn.x, zone.defaultSpawn.y);
  };

  return (
    <div
      data-testid="daily-story"
      className="absolute inset-0 z-40 grid place-items-center bg-background/70 p-4 backdrop-blur-sm"
    >
      <div className="block-panel-lg w-full max-w-md border-accent bg-sidebar/95 p-4 text-sidebar-foreground">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Sunrise className="size-5 text-accent" />
            <h2 className="font-display text-lg font-bold">Today's story</h2>
          </div>
          <button
            type="button"
            aria-label="Close today's story"
            className="rounded-md p-1 hover:bg-accent/20"
            onClick={() => setOpen(false)}
          >
            <X className="size-4" />
          </button>
        </div>

        {items.length === 0 ? (
          <p className="mt-3 text-sm text-sidebar-foreground/75">
            Nothing is assigned yet — walk into a classroom and speak with the instructor to begin.
          </p>
        ) : (
          <ul className="mt-3 space-y-2" data-testid="daily-story-items">
            {items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => goTo(item.zoneId, item.lessonId)}
                  className="block-panel w-full border-accent/40 bg-background/40 p-3 text-left hover:border-accent"
                >
                  <p className="font-display text-[10px] uppercase tracking-[0.18em] text-accent">
                    {KIND_LABEL[item.kind]}
                  </p>
                  <p className="mt-0.5 text-sm font-semibold">{item.title}</p>
                  <p className="text-[11px] text-sidebar-foreground/70">
                    {item.reason}
                    {item.zoneName ? ` · ${item.zoneName}` : ""}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        )}

        <Button size="sm" variant="ghost" className="mt-3" onClick={() => setOpen(false)}>
          Back to campus
        </Button>
      </div>
    </div>
  );
}
