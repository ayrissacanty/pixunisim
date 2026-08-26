import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Compass, Map as MapIcon, Minus, Navigation, Plus, RotateCcw, X } from "lucide-react";
import { useCampusStore } from "@/lib/campus/store";
import { ZONE_LABELS, getZone } from "@/lib/campus/world";
import { buildWalkthrough } from "@/lib/campus/walkthrough";
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

const VIEW = 1000;
const MIN_ZOOM = 0.7;
const MAX_ZOOM = 3.2;

interface MapNode {
  id: string;
  label: string;
  x: number;
  y: number;
  interior: boolean;
}

/** One-tap destinations, matching the scripted Algebra 204 route. */
const WAYPOINTS = [
  { id: "math-tech-hall", label: "Mathematics Hall", lessonId: null as string | null },
  { id: "algebra-204", label: "Algebra 204", lessonId: "algebra-lesson-2" },
];

function clamp(v: number, lo: number, hi: number) {
  return Math.min(Math.max(v, lo), hi);
}

/**
 * Illustrated campus map: pinch/wheel zoom, drag to pan, zones highlighted by
 * discovery and current location, plus one-tap wayfinding that draws the route
 * to Mathematics Hall or Algebra 204 and walks you there.
 */
export function CampusMapOverlay() {
  const open = useCampusStore((s) => s.mapOpen);
  const setOpen = useCampusStore((s) => s.setMapOpen);
  const current = useCampusStore((s) => s.currentZone);
  const discovered = useCampusStore((s) => s.discovered);
  const travel = useCampusStore((s) => s.travel);
  const logEvent = useCampusStore((s) => s.logEvent);
  const objectiveZone = useCampusStore((s) => s.objectiveTargetZone);

  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [hover, setHover] = useState<string | null>(null);
  const [routeId, setRouteId] = useState<string | null>(null);
  const view = useRef({ zoom: 1, offset: { x: 0, y: 0 } });
  view.current = { zoom, offset };

  const nodes: MapNode[] = useMemo(
    () =>
      OVERVIEW.map((id) => {
        const zone = getZone(id);
        return {
          id,
          label: ZONE_LABELS[id] ?? zone.name,
          x: zone.mapPos.x * VIEW,
          y: zone.mapPos.y * VIEW,
          interior: zone.kind === "interior",
        };
      }),
    [],
  );

  const nodeById = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);

  /** Zone-by-zone route to the selected waypoint, deduped for drawing. */
  const route = useMemo(() => {
    const wp = WAYPOINTS.find((w) => w.id === routeId);
    if (!wp) return null;
    const zones: string[] = [];
    if (wp.lessonId) {
      for (const step of buildWalkthrough(wp.lessonId).steps) {
        if (zones[zones.length - 1] !== step.zone) zones.push(step.zone);
      }
    } else {
      const zone = getZone(wp.id);
      zones.push("welcome-plaza", zone.parentZone ?? "central-quad", wp.id);
    }
    const from = zones.indexOf(current);
    const trimmed = from > 0 ? zones.slice(from) : zones;
    return { ...wp, zones: trimmed.filter((z) => nodeById.has(z)) };
  }, [routeId, current, nodeById]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  // Reset the camera whenever the map is reopened.
  useEffect(() => {
    if (open) {
      setZoom(1);
      setOffset({ x: 0, y: 0 });
      setRouteId(null);
    }
  }, [open]);

  const zoomAt = useCallback((factor: number, px: number, py: number) => {
    const { zoom: z, offset: o } = view.current;
    const next = clamp(z * factor, MIN_ZOOM, MAX_ZOOM);
    const k = next / z;
    setZoom(next);
    setOffset({ x: px - (px - o.x) * k, y: py - (py - o.y) * k });
  }, []);

  // React's onWheel is passive, so the wheel listener has to be native.
  useEffect(() => {
    const el = surfaceRef.current;
    if (!el || !open) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 100 : 1);
      const rect = el.getBoundingClientRect();
      zoomAt(Math.exp(-dy * 0.0018), e.clientX - rect.left, e.clientY - rect.top);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [open, zoomAt]);

  const drag = useRef<{ id: number; x: number; y: number; moved: boolean } | null>(null);

  const onPointerDown = (e: React.PointerEvent) => {
    drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: false };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (Math.abs(dx) + Math.abs(dy) > 3) d.moved = true;
    d.x = e.clientX;
    d.y = e.clientY;
    setOffset((o) => ({ x: o.x + dx, y: o.y + dy }));
  };
  const endDrag = (e: React.PointerEvent) => {
    if (drag.current?.id === e.pointerId) drag.current = null;
  };

  const goTo = (zoneId: string, label: string) => {
    const zone = getZone(zoneId);
    travel(zoneId, zone.defaultSpawn.x, zone.defaultSpawn.y);
    logEvent("travel", `Set course for ${label}`);
    setOpen(false);
  };

  const followRoute = () => {
    if (!route) return;
    const target = route.zones[route.zones.length - 1] ?? route.id;
    const zone = getZone(target);
    if (route.lessonId) {
      const walk = buildWalkthrough(route.lessonId);
      const last = walk.steps[walk.steps.length - 1]!;
      travel(last.zone, last.x, last.y);
    } else {
      travel(target, zone.defaultSpawn.x, zone.defaultSpawn.y);
    }
    logEvent("travel", `Following the path to ${route.label}`);
    setOpen(false);
  };

  if (!open) return null;

  return (
    <div
      className="pointer-events-auto absolute inset-0 z-40 flex items-center justify-center bg-black/60 p-3"
      onClick={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
    >
      <div className="block-panel-lg flex max-h-[90dvh] w-full max-w-3xl flex-col overflow-hidden border-accent bg-card">
        <div className="flex items-center gap-2 border-b-[3px] border-border px-4 py-3">
          <MapIcon className="size-4 text-primary" />
          <h2 className="font-display text-lg font-bold">Campus Map</h2>
          <span className="block-chip border-border bg-muted px-2 py-0.5 text-[10px] font-bold">
            {discovered.filter((d) => OVERVIEW.includes(d)).length}/{OVERVIEW.length} discovered
          </span>
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

        {/* Wayfinding rail */}
        <div className="flex flex-wrap items-center gap-2 border-b-[3px] border-border bg-muted/40 px-4 py-2">
          <Compass className="size-4 text-accent" aria-hidden="true" />
          <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            Find my way
          </span>
          {WAYPOINTS.map((w) => (
            <button
              key={w.id}
              type="button"
              data-testid={`wayfind-${w.id}`}
              aria-pressed={routeId === w.id}
              onClick={() => setRouteId(routeId === w.id ? null : w.id)}
              className={[
                "block-btn px-2.5 py-1 text-[11px] font-bold",
                routeId === w.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background hover:bg-accent hover:text-accent-foreground",
              ].join(" ")}
            >
              {w.label}
            </button>
          ))}
          {route && (
            <Button size="sm" data-testid="wayfind-go" className="ml-auto" onClick={followRoute}>
              <Navigation className="size-3.5" /> Take me there
            </Button>
          )}
        </div>

        {/* Zoomable illustrated map */}
        <div
          ref={surfaceRef}
          data-testid="map-surface"
          data-zoom={zoom.toFixed(2)}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          className="relative h-[46dvh] min-h-56 cursor-grab touch-none overflow-hidden bg-[var(--sky)]/40 active:cursor-grabbing"
        >
          <div
            className="absolute left-0 top-0 h-full w-full origin-top-left"
            style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})` }}
          >
            <svg viewBox={`0 0 ${VIEW} ${VIEW}`} className="h-full w-full">
              <rect x={0} y={0} width={VIEW} height={VIEW} className="fill-[var(--grass,#7ec850)]" opacity={0.5} />
              {/* Connecting paths between every zone and the quad hub */}
              {nodes
                .filter((n) => n.id !== "central-quad")
                .map((n) => {
                  const hub = nodeById.get("central-quad")!;
                  return (
                    <line
                      key={`p-${n.id}`}
                      x1={hub.x}
                      y1={hub.y}
                      x2={n.x}
                      y2={n.y}
                      stroke="var(--ochre, #d9a441)"
                      strokeWidth={10}
                      strokeLinecap="round"
                      opacity={0.35}
                    />
                  );
                })}

              {/* Highlighted wayfinding route */}
              {route && route.zones.length > 1 && (
                <polyline
                  data-testid="wayfind-path"
                  points={route.zones
                    .map((z) => nodeById.get(z))
                    .filter(Boolean)
                    .map((n) => `${n!.x},${n!.y}`)
                    .join(" ")}
                  fill="none"
                  stroke="var(--primary, #e0553f)"
                  strokeWidth={14}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray="26 18"
                >
                  <animate attributeName="stroke-dashoffset" from="44" to="0" dur="1s" repeatCount="indefinite" />
                </polyline>
              )}

              {nodes.map((n) => {
                const known = discovered.includes(n.id);
                const isCurrent = n.id === current;
                const onRoute = route?.zones.includes(n.id) ?? false;
                const isObjective = n.id === objectiveZone;
                return (
                  <g
                    key={n.id}
                    data-node={n.id}
                    data-known={known}
                    className={known ? "cursor-pointer" : "cursor-not-allowed"}
                    onMouseEnter={() => setHover(n.id)}
                    onMouseLeave={() => setHover((h) => (h === n.id ? null : h))}
                    onClick={() => {
                      if (!drag.current?.moved && known) goTo(n.id, n.label);
                    }}
                  >
                    {(isCurrent || onRoute || isObjective) && (
                      <circle
                        cx={n.x}
                        cy={n.y}
                        r={44}
                        fill="none"
                        stroke={isCurrent ? "var(--primary, #e0553f)" : "var(--accent, #f2b23c)"}
                        strokeWidth={6}
                        opacity={0.85}
                      />
                    )}
                    <rect
                      x={n.x - 34}
                      y={n.y - 30}
                      width={68}
                      height={60}
                      rx={12}
                      fill={
                        !known
                          ? "#8d8574"
                          : n.interior
                            ? "var(--terracotta, #e0644a)"
                            : "var(--sage, #9fbf7e)"
                      }
                      stroke="#3a241c"
                      strokeWidth={5}
                    />
                    {/* roof / canopy detail so buildings read as illustrated blocks */}
                    <rect
                      x={n.x - 34}
                      y={n.y - 30}
                      width={68}
                      height={20}
                      rx={10}
                      fill={known ? "var(--ochre, #f2b23c)" : "#6f6a5e"}
                      stroke="#3a241c"
                      strokeWidth={4}
                    />
                    <text
                      x={n.x}
                      y={n.y + 52}
                      textAnchor="middle"
                      fontSize={24}
                      fontWeight={700}
                      fill="#2f1d14"
                      stroke="#fff3d8"
                      strokeWidth={6}
                      paintOrder="stroke"
                    >
                      {known ? n.label : "???"}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Zoom controls */}
          <div className="pointer-events-auto absolute bottom-2 right-2 flex flex-col gap-1">
            <Button
              size="icon"
              variant="secondary"
              aria-label="Zoom in"
              data-testid="map-zoom-in"
              onClick={() => {
                const r = surfaceRef.current?.getBoundingClientRect();
                zoomAt(1.25, (r?.width ?? 0) / 2, (r?.height ?? 0) / 2);
              }}
            >
              <Plus className="size-4" />
            </Button>
            <Button
              size="icon"
              variant="secondary"
              aria-label="Zoom out"
              data-testid="map-zoom-out"
              onClick={() => {
                const r = surfaceRef.current?.getBoundingClientRect();
                zoomAt(1 / 1.25, (r?.width ?? 0) / 2, (r?.height ?? 0) / 2);
              }}
            >
              <Minus className="size-4" />
            </Button>
            <Button
              size="icon"
              variant="secondary"
              aria-label="Reset map view"
              onClick={() => {
                setZoom(1);
                setOffset({ x: 0, y: 0 });
              }}
            >
              <RotateCcw className="size-4" />
            </Button>
          </div>

          <p className="pointer-events-none absolute bottom-2 left-2 text-[10px] font-semibold text-foreground/70">
            {hover
              ? (ZONE_LABELS[hover] ?? hover)
              : "Drag to pan · scroll or pinch to zoom · tap a place to travel"}
          </p>
        </div>

        {/* Destination list keeps keyboard and screen-reader travel available */}
        <div className="max-h-40 overflow-y-auto border-t-[3px] border-border p-3">
          <div className="grid gap-2 sm:grid-cols-2">
            {OVERVIEW.map((id) => {
              const known = discovered.includes(id);
              const label = ZONE_LABELS[id] ?? getZone(id).name;
              return (
                <button
                  key={id}
                  disabled={!known}
                  onClick={() => goTo(id, label)}
                  className={[
                    "block-btn px-3 py-2 text-left text-sm",
                    id === current
                      ? "border-primary bg-primary/10 font-semibold"
                      : known
                        ? "border-border bg-background hover:bg-muted"
                        : "border-dashed border-border bg-muted/40 text-muted-foreground",
                  ].join(" ")}
                >
                  {known ? label : "Undiscovered"}
                  <span className="block text-[11px] text-muted-foreground">
                    {known ? (id === current ? "You are here" : "Fast travel") : "Explore to reveal"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex justify-end border-t-[3px] border-border px-4 py-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/workspace">Open Workspace</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
