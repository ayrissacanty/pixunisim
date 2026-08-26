import { useEffect } from "react";
import { Link } from "@tanstack/react-router";

import { Map, X } from "lucide-react";
import { useCampusStore } from "@/lib/campus/store";
import { ZONE_LABELS, getZone } from "@/lib/campus/world";
import { Button } from "@/components/ui/button";

const OVERVIEW = [
  "welcome-plaza",
  "central-quad",
  "student-commons",
  "study-gardens",
  "math-tech-hall",
  "science-hall",
  "humanities-hall",
  "arts-center",
  "university-library",
  "student-center",
  "career-center",
  "administration",
  "personal-space",
];

export function CampusMapOverlay() {
  const open = useCampusStore((s) => s.mapOpen);
  const setOpen = useCampusStore((s) => s.setMapOpen);
  const current = useCampusStore((s) => s.currentZone);
  const discovered = useCampusStore((s) => s.discovered);
  const travel = useCampusStore((s) => s.travel);

  // Escape closes the map, matching every other overlay in the campus.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  if (!open) return null;

  return (
    <div
      className="pointer-events-auto absolute inset-0 z-40 flex items-center justify-center bg-black/60 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
    >
      <div className="block-panel-lg w-full max-w-2xl border-accent bg-card p-5">

        <div className="flex items-center gap-2">
          <Map className="size-4 text-primary" />
          <h2 className="font-display text-lg font-bold">Campus Map</h2>
          <Button
            size="icon"
            variant="ghost"
            className="ml-auto"
            onClick={() => setOpen(false)}
            aria-label="Close map"
          >
            <X className="size-4" />
          </Button>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {discovered.length} of {OVERVIEW.length} locations discovered. Fast travel to anywhere
          you've already visited.
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {OVERVIEW.map((id) => {
            const known = discovered.includes(id);
            const zone = getZone(id);
            return (
              <button
                key={id}
                disabled={!known}
                onClick={() => {
                  travel(id, zone.defaultSpawn.x, zone.defaultSpawn.y);
                  setOpen(false);
                }}
                className={[
                  "block-btn px-3 py-2 text-left text-sm",
                  id === current
                    ? "border-primary bg-primary/10 font-semibold"
                    : known
                      ? "border-border bg-background hover:bg-muted"
                      : "border-dashed border-border bg-muted/40 text-muted-foreground",
                ].join(" ")}
              >
                {known ? (ZONE_LABELS[id] ?? id) : "Undiscovered"}
                <span className="block text-[11px] text-muted-foreground">
                  {known ? (id === current ? "You are here" : "Fast travel") : "Explore to reveal"}
                </span>
              </button>
            );
          })}
        </div>
        <div className="mt-4 flex justify-end">
          <Button asChild variant="outline" size="sm">
            <Link to="/workspace">Open Workspace</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
