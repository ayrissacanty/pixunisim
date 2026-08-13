import { useCampusStore } from "@/lib/campus/store";

/**
 * Deliberate animated beat between layers — a door swing, a fade or a screen
 * wipe — so moving deeper into the campus never feels like a page swap.
 */
export function LayerTransition() {
  const transition = useCampusStore((s) => s.transition);
  if (!transition) return null;

  return (
    <div
      data-testid="layer-transition"
      data-transition-kind={transition.kind}
      data-to-layer={transition.toLayer}
      className="pointer-events-auto absolute inset-0 z-50 overflow-hidden"
      aria-live="polite"
    >
      {transition.kind === "fade" && <div className="absolute inset-0 animate-fade-in bg-sidebar" />}
      {transition.kind === "wipe" && (
        <div className="absolute inset-0 origin-left animate-[scale-in_0.35s_ease-out] bg-sidebar" />
      )}
      {transition.kind === "door" && (
        <>
          <div className="absolute inset-y-0 left-0 w-1/2 origin-left animate-fade-in border-r-4 border-accent bg-[#6b4a2f]" />
          <div className="absolute inset-y-0 right-0 w-1/2 origin-right animate-fade-in border-l-4 border-accent bg-[#6b4a2f]" />
        </>
      )}
      <p className="absolute inset-x-0 bottom-16 text-center font-display text-sm text-sidebar-foreground">
        {transition.label}
      </p>
    </div>
  );
}
