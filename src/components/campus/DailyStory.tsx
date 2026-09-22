import { useMemo } from "react";
import { useCampusStore } from "@/lib/campus/store";
import { useLessons, useProgress } from "@/lib/data";
import { useQuestCatalog, useQuestRecords } from "@/lib/quests";
import { buildDayStory } from "@/lib/campus/daily-story";
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

/** Today's Story — the day's narrative beats, drawn from real assignments. */
export function DailyStory() {
  const open = useCampusStore((s) => s.dailyOpen);
  const setOpen = useCampusStore((s) => s.setDailyOpen);
  const travel = useCampusStore((s) => s.travel);
  const openLesson = useCampusStore((s) => s.openLesson);
  const discovered = useCampusStore((s) => s.discovered);
  const { data: lessons } = useLessons();
  const { data: progress } = useProgress();
  const { data: records } = useQuestRecords();
  const quests = useQuestCatalog();

  const story = useMemo(
    () => buildDayStory({ lessons, progress, quests, records, discovered }),
    [lessons, progress, quests, records, discovered],
  );

  if (!open) return null;

  const goTo = (zoneId?: string, lessonId?: string, courseId?: string) => {
    if (lessonId && courseId) {
      setOpen(false);
      openLesson(lessonId, courseId);
      return;
    }
    const target = zoneId ?? (lessonId ? locationForLesson(lessonId)?.zoneId : undefined);
    if (!target) return;
    const zone = getZone(target);
    setOpen(false);
    travel(zone.id, zone.defaultSpawn.x, zone.defaultSpawn.y);
  };

  return (
    <div
      data-testid="daily-story"
      data-day={story.day}
      className="absolute inset-0 z-40 grid place-items-center bg-background/70 p-4 backdrop-blur-sm"
    >
      <div className="block-panel-lg w-full max-w-md border-accent bg-sidebar/95 p-4 text-sidebar-foreground">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Sunrise className="size-5 text-accent" />
            <div>
              <h2 className="font-display text-lg font-bold leading-none">Today's story</h2>
              <p className="mt-1 font-display text-[10px] uppercase tracking-[0.18em] text-accent">
                Day {story.day} · {story.chapter}
              </p>
            </div>
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

        <p data-testid="daily-opening" className="mt-3 text-sm italic text-sidebar-foreground/85">
          {story.opening}
        </p>

        {story.items.length > 0 && (
          <ul className="mt-3 space-y-2" data-testid="daily-story-items">
            {story.items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => goTo(item.zoneId, item.lessonId, item.courseId)}
                  className="block-panel w-full border-accent/40 bg-background/40 p-3 text-left hover:border-accent"
                >
                  <p className="font-display text-[10px] uppercase tracking-[0.18em] text-accent">
                    {KIND_LABEL[item.kind]}
                  </p>
                  <p className="mt-0.5 text-sm font-semibold">{item.title}</p>
                  <p className="text-[12px] leading-snug text-sidebar-foreground/80">{item.beat}</p>
                  <p className="mt-0.5 text-[11px] text-sidebar-foreground/60">
                    {item.reason}
                    {item.zoneName ? ` · ${item.zoneName}` : ""}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        )}

        <p data-testid="daily-closing" className="mt-3 text-[12px] text-sidebar-foreground/75">
          {story.closing}
        </p>

        <Button size="sm" variant="ghost" className="mt-3" onClick={() => setOpen(false)}>
          Back to campus
        </Button>
      </div>
    </div>
  );
}
