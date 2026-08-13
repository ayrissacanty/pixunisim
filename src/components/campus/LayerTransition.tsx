import { useCampusStore } from "@/lib/campus/store";
import { transitionsAnimated, useMotionStore } from "@/lib/a11y/motion";

/**
 * Deliberate animated beat between layers — a door swing, a fade or a screen
 * wipe — so moving deeper into the campus never feels like a page swap.
 * With reduced motion the same beat plays as a flat cut, keeping the label.
 */
export function LayerTransition() {
  const transition = useCampusStore((s) => s.transition);
  const setting = useMotionStore((s) => s.setting);
  if (!transition) return null;

  const animated = transitionsAnimated(setting);
  const fade = animated ? "animate-fade-in" : "";
  const wipe = animated ? "animate-[scale-in_0.35s_ease-out]" : "";

  return (
    <div
      data-testid="layer-transition"
      data-transition-kind={transition.kind}
      data-to-layer={transition.toLayer}
      data-motion={setting}
      className="pointer-events-auto absolute inset-0 z-50 overflow-hidden"
      aria-live="polite"
    >
      {transition.kind === "fade" && (
        <div className={`absolute inset-0 bg-sidebar ${fade}`} />
      )}
      {transition.kind === "wipe" && (
        <div className={`absolute inset-0 origin-left bg-sidebar ${wipe}`} />
      )}
      {transition.kind === "door" && (
        <>
          <div
            className={`absolute inset-y-0 left-0 w-1/2 origin-left border-r-4 border-accent bg-[#6b4a2f] ${fade}`}
          />
          <div
            className={`absolute inset-y-0 right-0 w-1/2 origin-right border-l-4 border-accent bg-[#6b4a2f] ${fade}`}
          />
        </>
      )}
      <p className="absolute inset-x-0 bottom-16 text-center font-display text-sm text-sidebar-foreground">
        {transition.label}
      </p>
    </div>
  );
}
