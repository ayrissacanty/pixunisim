import { useMemo } from "react";
import { CalendarDays, Flame, RotateCcw, Square, Target, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NewsAnchor } from "@/components/family/NewsAnchor";
import { useFamilyReport } from "@/lib/family/queries";
import { useBriefingSpeech } from "@/lib/family/speech";
import { useProfile } from "@/lib/profile";
import { DEFAULT_MASCOT } from "@/lib/mascot";

/** "Today's Report" — the family's daily news broadcast, read aloud. */
export function FamilyNews() {
  const { data: report, isLoading } = useFamilyReport();
  const { data: profile } = useProfile();
  const lines = useMemo(() => report?.script ?? [], [report]);
  const { speak, stop, speaking, lineIndex, muted, setMuted, supported } =
    useBriefingSpeech(lines);

  const mascot = profile?.mascot ?? DEFAULT_MASCOT;

  return (
    <section
      data-testid="family-news"
      data-speaking={speaking ? "yes" : "no"}
      className="block-panel-lg border-accent bg-card p-5"
      aria-label="Family News daily briefing"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="block-chip inline-block border-accent bg-accent px-2 py-0.5 text-[11px] font-black uppercase tracking-widest text-accent-foreground">
            Today&apos;s Report
          </p>
          <h2 className="mt-2 font-display text-2xl font-bold">
            {isLoading ? "Gathering the headlines…" : report?.headline}
          </h2>
          <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <CalendarDays className="size-3.5" aria-hidden="true" />
            {report?.dateLabel ?? ""}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            data-testid="news-play"
            onClick={() => (speaking ? stop() : speak())}
            disabled={!supported || muted || isLoading || lines.length === 0}
          >
            {speaking ? (
              <>
                <Square className="size-4" /> Stop
              </>
            ) : (
              <>
                <RotateCcw className="size-4" /> Play report
              </>
            )}
          </Button>
          <Button
            variant="outline"
            data-testid="news-mute"
            aria-pressed={muted}
            onClick={() => setMuted(!muted)}
          >
            {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
            {muted ? "Muted" : "Sound on"}
          </Button>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-5 sm:flex-row">
        <div className="shrink-0 self-center sm:self-start">
          <NewsAnchor mascot={mascot} speaking={speaking} />
        </div>

        <div className="min-w-0 flex-1">
          <ol data-testid="news-script" className="space-y-1.5">
            {lines.map((line, i) => (
              <li
                key={`${i}-${line.slice(0, 12)}`}
                data-active={i === lineIndex ? "yes" : "no"}
                className={`block-chip px-3 py-2 text-sm ${
                  i === lineIndex
                    ? "border-accent bg-accent/25 font-semibold text-foreground"
                    : "border-border bg-background text-muted-foreground"
                }`}
              >
                {line}
              </li>
            ))}
          </ol>

          {!supported && (
            <p className="mt-3 text-xs font-semibold text-muted-foreground">
              This browser can&apos;t read the report aloud — the written briefing above is the
              full report.
            </p>
          )}
        </div>
      </div>

      {report && report.members.length > 0 && (
        <ul className="mt-5 grid gap-2 sm:grid-cols-2">
          {report.members.map((m) => (
            <li
              key={m.id}
              data-testid="news-member"
              className="block-panel border-border bg-background px-3.5 py-3"
            >
              <p className="font-display text-sm font-bold">{m.name}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {m.completedToday.length} today · {m.completedThisWeek} this week
                {m.averageScore != null ? ` · avg ${m.averageScore}%` : ""}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {m.streakDays >= 2 && (
                  <span className="block-chip inline-flex items-center gap-1 border-accent bg-accent/20 px-2 py-0.5 text-[11px] font-bold">
                    <Flame className="size-3" aria-hidden="true" /> {m.streakDays}-day streak
                  </span>
                )}
                {m.objectivesToday > 0 && (
                  <span className="block-chip inline-flex items-center gap-1 border-secondary-foreground/25 bg-secondary px-2 py-0.5 text-[11px] font-bold text-secondary-foreground">
                    <Target className="size-3" aria-hidden="true" /> {m.objectivesToday} objective
                    {m.objectivesToday === 1 ? "" : "s"}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
