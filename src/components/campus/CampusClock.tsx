import { Clock, Moon, Sun, Sunrise, Sunset } from "lucide-react";
import { clockLabel, phaseAt, useClockStore } from "@/lib/campus/daynight";

const ICONS = {
  dawn: Sunrise,
  morning: Sun,
  midday: Sun,
  afternoon: Sun,
  dusk: Sunset,
  night: Moon,
} as const;

const LABELS = {
  dawn: "Dawn",
  morning: "Morning",
  midday: "Midday",
  afternoon: "Afternoon",
  dusk: "Dusk",
  night: "Night",
} as const;

/** Small campus clock chip: time of day drives the world's ambient light. */
export function CampusClock() {
  const minutes = useClockStore((s) => s.minutes);
  const phase = phaseAt(minutes);
  const Icon = ICONS[phase] ?? Clock;
  return (
    <div className="block-chip flex items-center gap-2 border-amber/60 bg-ink-night/90 px-3 py-1.5">
      <Icon className="size-3.5 shrink-0 text-amber" aria-hidden="true" />
      <span className="font-display text-xs font-black uppercase tracking-wide text-parchment-warm">
        {LABELS[phase]}
      </span>
      <span className="text-[11px] font-semibold tabular-nums text-parchment-warm/75">
        {clockLabel(minutes)}
      </span>
    </div>
  );
}
