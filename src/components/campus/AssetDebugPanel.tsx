import { useEffect, useMemo, useState } from "react";
import { Boxes, Check, Copy, RefreshCw, Search, ShieldAlert, X } from "lucide-react";
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

/** In-app proof that Phaser only has the approved 2D texture set in memory. */
export function AssetDebugPanel({ getReport }: { getReport: () => CampusAssetReport | undefined }) {
  const open = useCampusStore((s) => s.assetsOpen);
  const setOpen = useCampusStore((s) => s.setAssetsOpen);
  const [report, setReport] = useState<CampusAssetReport | null>(null);
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState<"all" | (typeof GROUP_ORDER)[number]>("all");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    const read = () => setReport(getReport() ?? null);
    read();
    const timer = window.setInterval(read, 1500);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, getReport, setOpen]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (report?.entries ?? []).filter((entry) => {
      const matchesGroup = group === "all" || entry.group === group;
      return matchesGroup && (!needle || `${entry.key} ${entry.source}`.toLowerCase().includes(needle));
    });
  }, [group, query, report]);

  const exportAssets = async () => {
    if (!report) return;
    const payload = JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        zone: report.zone,
        zoneKind: report.zoneKind,
        blocked3d: { reason: report.blockedReason, keys: report.blockedAssetKeys },
        assets: report.entries.map(({ key, group: assetGroup, width, height, frames, source }) => ({
          key,
          group: assetGroup,
          width,
          height,
          frames,
          source,
        })),
      },
      null,
      2,
    );
    try {
      await navigator.clipboard.writeText(payload);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="pointer-events-auto absolute inset-0 z-50 flex items-center justify-center bg-background/75 p-3 backdrop-blur-sm"
      onClick={(event) => {
        if (event.target === event.currentTarget) setOpen(false);
      }}
    >
      <section
        data-testid="asset-debug"
        data-assets={report?.entries.length ?? 0}
        data-suspect={report?.suspect ?? 0}
        aria-label="Loaded 2D assets"
        className="block-panel-lg flex max-h-[88dvh] w-full max-w-2xl flex-col overflow-hidden border-accent bg-card"
      >
        <header className="flex items-center gap-2 border-b-[3px] border-border px-4 py-3">
          <Boxes className="size-4 text-primary" aria-hidden="true" />
          <h2 className="font-display text-base font-bold">Loaded 2D assets</h2>
          <span className="block-chip border-border bg-muted px-2 py-0.5 text-[10px] font-bold">
            {report?.entries.length ?? 0} textures
          </span>
          <Button size="icon" variant="ghost" className="ml-auto" onClick={() => setReport(getReport() ?? null)} aria-label="Refresh asset list">
            <RefreshCw className="size-4" />
          </Button>
          <Button size="icon" variant="ghost" onClick={() => setOpen(false)} aria-label="Close asset inspector">
            <X className="size-4" />
          </Button>
        </header>

        <div className="space-y-3 overflow-y-auto px-4 py-3 text-xs">
          <div
            data-testid="asset-3d-status"
            className={`block-panel flex gap-2 px-3 py-2 font-semibold ${report?.suspect ? "border-destructive bg-destructive/10 text-destructive" : "border-secondary bg-secondary/20 text-secondary-foreground"}`}
          >
            {report?.suspect ? <ShieldAlert className="mt-0.5 size-4 shrink-0" /> : <Check className="mt-0.5 size-4 shrink-0" />}
            <div>
              <p>{report?.suspect ? "3D loading blocked — unexpected source detected" : "3D loading blocked — 2D-only mode active"}</p>
              <p className="mt-0.5 text-[11px] font-normal opacity-80">
                {report?.blockedReason ?? "GLTF, GLB, FBX, OBJ and Three.js sources are rejected by the build guard."}
              </p>
              {!!report?.blockedAssetKeys.length && <p className="mt-1 font-mono text-[10px]">Blocked keys: {report.blockedAssetKeys.join(", ")}</p>}
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="relative min-w-0 flex-1">
              <span className="sr-only">Search loaded assets</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search textures, sprites, tilemaps…"
                className="h-10 w-full rounded-md border-2 border-input bg-background pl-9 pr-3 text-sm text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring"
              />
            </label>
            <select
              value={group}
              onChange={(event) => setGroup(event.target.value as typeof group)}
              aria-label="Filter asset group"
              className="h-10 rounded-md border-2 border-input bg-background px-3 text-sm text-foreground outline-none focus:border-ring"
            >
              <option value="all">All groups</option>
              {GROUP_ORDER.map((item) => <option key={item} value={item}>{GROUP_LABEL[item]}</option>)}
            </select>
            <Button size="sm" variant="outline" onClick={exportAssets} disabled={!report} aria-label="Export loaded assets as JSON">
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              {copied ? "Copied" : "Export JSON"}
            </Button>
          </div>

          {!report && <p className="text-muted-foreground">Waiting for the campus scene…</p>}
          {report && <>
            <p className="text-muted-foreground">
              Current zone <strong className="text-foreground">{report.zone}</strong> ({report.zoneKind}) · showing {filtered.length} of {report.entries.length}
              {report.rooms.length > 0 && ` · rooms: ${report.rooms.join(", ")}`}
            </p>
            {GROUP_ORDER.map((item) => {
              const rows = filtered.filter((entry) => entry.group === item);
              if (!rows.length) return null;
              return (
                <section key={item} data-group={item}>
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-accent">{GROUP_LABEL[item]} · {rows.length}</h3>
                  <ul className="mt-1 divide-y divide-border/70">
                    {rows.map((entry) => <li key={entry.key} data-asset-key={entry.key} className="flex items-baseline gap-2 py-1.5">
                      <span className="font-mono text-foreground">{entry.key}</span>
                      <span className="text-muted-foreground">{entry.width}×{entry.height}{entry.frames > 1 ? ` · ${entry.frames} frames` : ""}</span>
                      <span className="ml-auto block-chip border-border bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">{entry.source}</span>
                    </li>)}
                  </ul>
                </section>
              );
            })}
            {!filtered.length && <p className="rounded-md border-2 border-dashed border-border px-3 py-4 text-center text-muted-foreground">No loaded assets match this search.</p>}
          </>}
        </div>
      </section>
    </div>
  );
}
