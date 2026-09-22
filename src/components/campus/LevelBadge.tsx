import { useProgression, levelProgress } from "@/lib/progression";

/** Compact game level and coin purse for the campus header. */
export function LevelBadge() {
  const { data } = useProgression();
  const xp = data?.xp ?? 0;
  const coins = data?.coins ?? 0;
  const { level, into, span } = levelProgress(xp);

  return (
    <div
      data-testid="level-badge"
      data-level={level}
      data-coins={coins}
      className="flex items-center gap-2"
    >
      <div className="min-w-[4.5rem]">
        <p className="font-display text-[10px] font-black uppercase tracking-[0.18em] text-accent">
          Level {level}
        </p>
        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-background/50">
          <div
            className="h-full rounded-full bg-accent"
            style={{ width: `${Math.min(100, Math.round((into / span) * 100))}%` }}
          />
        </div>
      </div>
      <span className="block-chip border-accent/40 bg-background/40 px-2 py-0.5 text-[11px] font-bold">
        <span aria-hidden="true">🪙</span> {coins}
      </span>
    </div>
  );
}
