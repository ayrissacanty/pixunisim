import { useMemo } from "react";
import { Backpack, X } from "lucide-react";
import { useCampusStore } from "@/lib/campus/store";
import { useLessons } from "@/lib/data";
import { resolveItems, useInventory } from "@/lib/quests";

const SOURCE_LABEL: Record<string, string> = {
  lesson: "Earned in class",
  quest: "Quest reward",
  tutor: "Tutoring session",
};

/** Backpack: keepsakes earned from lessons, quests and tutoring sessions. */
export function BackpackPanel() {
  const open = useCampusStore((s) => s.backpackOpen);
  const setOpen = useCampusStore((s) => s.setBackpackOpen);
  const { data: rows } = useInventory();
  const { data: lessons } = useLessons();

  const items = useMemo(() => resolveItems(rows, lessons), [rows, lessons]);

  if (!open) return null;

  return (
    <div
      data-testid="backpack-panel"
      data-item-count={items.length}
      className="academy absolute inset-0 z-40 flex items-center justify-center bg-background/80 p-3 backdrop-blur-sm"
    >
      <div className="block-panel flex max-h-full w-full max-w-xl flex-col overflow-hidden border-accent/60 bg-card">
        <div className="flex items-center gap-2 border-b-[3px] border-accent/60 bg-accent px-4 py-2.5">
          <Backpack className="size-4 text-accent-foreground" aria-hidden="true" />
          <h2 className="font-display text-sm font-black uppercase tracking-[0.18em] text-accent-foreground">
            Backpack
          </h2>
          <button
            type="button"
            aria-label="Close the backpack"
            onClick={() => setOpen(false)}
            className="ml-auto rounded-full bg-accent-foreground/15 p-1 text-accent-foreground hover:bg-accent-foreground/30"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="overflow-y-auto p-4">
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Your backpack is empty. Finish a lesson check or a tutoring session to earn your first
              keepsake.
            </p>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {items.map((item) => (
                <li
                  key={item.itemId}
                  data-item={item.itemId}
                  data-available={item.available}
                  className="block-panel flex items-center gap-3 bg-background/60 p-3"
                >
                  <span className="text-2xl" aria-hidden="true">
                    {item.icon}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-foreground">{item.name}</p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {item.lessonTitle ?? "Campus keepsake"}
                    </p>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {SOURCE_LABEL[item.source] ?? item.source} · {item.available} of{" "}
                      {item.quantity} unused
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
