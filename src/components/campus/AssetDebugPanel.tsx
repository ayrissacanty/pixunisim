import { useEffect, useState } from "react";
import { Boxes, RefreshCw, X } from "lucide-react";
import { useCampusStore } from "@/lib/campus/store";
import { Button } from "@/components/ui/button";
import type { CampusAssetReport } from "@/game/CampusScene";

const GROUP_LABEL: Record<string, string> = {
  zone: "Zones (outdoor maps)",
  interior: "Buildings & rooms (interiors)",
  character: "Characters (sprite sheets)",
  system: "Engine / system textures",
};

const GROUP_ORDER = ["zone", "interior", "character", "system"] as const;

/**
 * In-app asset inspector: every Phaser texture currently loaded, grouped by
 * zone / building interior / character, with its pixel size, frame count and
 * where it came from. Nothing here should ever say anything other than
 * "procedural canvas" or a 2D PNG — a 3D model would be flagged in red.
 */
export function AssetDebugPanel({ getReport }: { getReport: () => CampusAssetReport | undefined }) {
  const open = useCampusStore((s) => s.assetsOpen);
  const setOpen = useCampusStore((s) => s.setAssetsOpen);
  const [report, setReport] = useState<CampusAssetReport | null>(null);

  useEffect(() => {
    if (!open) return;
    const read = () => setReport(getReport() ?? null);
    read();
    const t = window.setInterval(read, 1500);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearInterval(t);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, getReport, setOpen]);

  if (!open) return null;

  const entries = report?.entries ?? [];

  return (
    <div
      className="pointer-events-auto absolute inset-0 z-50 flex items-center justify-center bg-black/60 p-3"
      onClick={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
    >
      <div
        data-testid="asset-debug"
        data-assets={entries.length}
        data-suspect={report?.suspect ?? 0}
        className="block-panel-lg flex max-h-[85dvh] w-full max-w-2xl flex-col overflow-hidden border-accent bg-card"
      >
        <div className="flex items-center gap-2 border-b-[3px] border-border px-4 py-3">
          <Boxes className="size-4 text-primary" />
          <h2 className="font-display text-base font-bold">Loaded 2D assets</h2>
          <span className="block-chip border-border bg-muted px-2 py-0.5 text-[10px] font-bold">
            {entries.length} textures
          </span>
          <Button
            size="icon"
            variant="ghost"
            className="ml-auto"
            onClick={() => setReport(getReport() ?? null)}
            aria-label="Refresh asset list"
          >
            <RefreshCw className="size-4" />
          </Button>
          <Button size="icon" variant="ghost" onClick={() => setOpen(false)} aria-label="Close asset inspector">
            <X className="size-4" />
          </Button>
        </div>

        <div className="overflow-y-auto px-4 py-3 text-xs">
          {!report && <p className="text-muted-foreground">Waiting for the campus scene…</p>}
          {report && (
            <>
              <p
                data-testid="asset-verdict"
                className={
                  report.suspect > 0
                    ? "block-panel border-destructive bg-destructive/10 px-3 py-2 font-bold text-destructive"
                    : "block-panel border-secondary bg-secondary/20 px-3 py-2 font-semibold"
                }
              >
                {report.suspect > 0
                  ? `${report.suspect} texture(s) come from a 3D model file.`
                  : "No GLB / GLTF / FBX sources — every texture is 2D."}
              </p>
              <p className="mt-2 text-muted-foreground">
                Current zone <strong className="text-foreground">{report.zone}</strong> ({report.zoneKind})
                {report.rooms.length > 0 && ` · rooms: ${report.rooms.join(", ")}`}
              </p>

              {GROUP_ORDER.map((group) => {
                const rows = entries.filter((e) => e.group === group);
                if (!rows.length) return null;
                return (
                  <section key={group} className="mt-4" data-group={group}>
                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-accent">
                      {GROUP_LABEL[group]} · {rows.length}
                    </h3>
                    <ul className="mt-1 divide-y divide-border/70">
                      {rows.map((e) => (
                        <li key={e.key} data-asset-key={e.key} className="flex items-baseline gap-2 py-1">
                          <span className="font-mono text-foreground">{e.key}</span>
                          <span className="text-muted-foreground">
                            {e.width}×{e.height}
                            {e.frames > 1 ? ` · ${e.frames} frames` : ""}
                          </span>
                          <span
                            className={[
                              "ml-auto block-chip px-2 py-0.5 text-[10px] font-bold",
                              e.suspect3d
                                ? "border-destructive bg-destructive/15 text-destructive"
                                : "border-border bg-muted text-muted-foreground",
                            ].join(" ")}
                          >
                            {e.suspect3d ? "3D SOURCE" : e.source}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </section>
                );
              })}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
