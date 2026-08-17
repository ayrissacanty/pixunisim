import { useState } from "react";
import { Contrast, Settings2, Vibrate, X } from "lucide-react";
import {
  CONTROL_SIZE_LABELS,
  useControlsStore,
  type ControlSize,
} from "@/lib/a11y/controls";
import { ASSIST_LABEL, useAssistStore } from "@/lib/a11y/assist";
import { MOTION_LABELS, useMotionStore } from "@/lib/a11y/motion";

const SIZES: ControlSize[] = ["standard", "large", "xl"];

/** Player-facing accessibility panel for touch controls (mobile only). */
export function MobileA11ySettings() {
  const [open, setOpen] = useState(false);
  const size = useControlsStore((s) => s.size);
  const setSize = useControlsStore((s) => s.setSize);
  const hc = useControlsStore((s) => s.highContrast);
  const toggleHc = useControlsStore((s) => s.toggleHighContrast);
  const haptics = useControlsStore((s) => s.haptics);
  const toggleHaptics = useControlsStore((s) => s.toggleHaptics);
  const assist = useAssistStore((s) => s.assist);
  const toggleAssist = useAssistStore((s) => s.toggle);
  const motion = useMotionStore((s) => s.setting);
  const cycleMotion = useMotionStore((s) => s.cycle);

  return (
    <div className="pointer-events-auto md:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        data-testid="a11y-open"
        aria-label="Accessibility and control settings"
        className="flex size-12 items-center justify-center rounded-full border-2 border-accent bg-sidebar/90 text-sidebar-foreground shadow-lg"
      >
        <Settings2 className="size-5" aria-hidden="true" />
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Control accessibility settings"
          data-testid="a11y-panel"
          className="fixed inset-0 z-50 flex items-end bg-background/70 p-3"
        >
          <div className="w-full rounded-xl border-2 border-accent bg-card p-4 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-base font-bold text-foreground">
                Controls &amp; accessibility
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close settings"
                className="flex size-11 items-center justify-center rounded-md border border-border text-foreground"
              >
                <X className="size-5" aria-hidden="true" />
              </button>
            </div>

            <p className="mb-1.5 text-xs font-semibold text-muted-foreground">Button size</p>
            <div className="mb-4 grid grid-cols-3 gap-2">
              {SIZES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSize(s)}
                  aria-pressed={size === s}
                  data-testid={`a11y-size-${s}`}
                  className={`min-h-12 rounded-md border-2 px-2 text-sm font-semibold ${
                    size === s
                      ? "border-accent bg-primary text-primary-foreground"
                      : "border-border bg-background text-foreground"
                  }`}
                >
                  {CONTROL_SIZE_LABELS[s]}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={toggleHc}
              aria-pressed={hc}
              data-testid="a11y-contrast"
              className="mb-2 flex min-h-12 w-full items-center gap-2 rounded-md border-2 border-border bg-background px-3 text-sm font-semibold text-foreground"
            >
              <Contrast className="size-4" aria-hidden="true" />
              High-contrast controls: {hc ? "On" : "Off"}
            </button>

            <button
              type="button"
              onClick={() => {
                toggleHaptics();
              }}
              aria-pressed={haptics}
              data-testid="a11y-haptics"
              className="mb-2 flex min-h-12 w-full items-center gap-2 rounded-md border-2 border-border bg-background px-3 text-sm font-semibold text-foreground"
            >
              <Vibrate className="size-4" aria-hidden="true" />
              Haptic feedback: {haptics ? "On" : "Off"}
            </button>

            <button
              type="button"
              onClick={toggleAssist}
              aria-pressed={assist}
              className="mb-2 flex min-h-12 w-full items-center rounded-md border-2 border-border bg-background px-3 text-sm font-semibold text-foreground"
            >
              {ASSIST_LABEL(assist)}
            </button>

            <button
              type="button"
              onClick={cycleMotion}
              className="flex min-h-12 w-full items-center rounded-md border-2 border-border bg-background px-3 text-sm font-semibold text-foreground"
            >
              {MOTION_LABELS[motion]}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
