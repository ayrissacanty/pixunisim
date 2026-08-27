import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { Minimap, clampMarker } from "./Minimap";
import { useCampusStore } from "@/lib/campus/store";
import { useMotionStore } from "@/lib/a11y/motion";
import { getZone } from "@/lib/campus/world";

type Arc = { x: number; y: number; r: number };

/**
 * Stub 2D context that records the arcs the minimap draws. The last two arcs of
 * a render are the player halo and the player dot.
 */
function stubCanvas() {
  const arcs: Arc[] = [];
  const tri: { x: number; y: number }[] = [];
  const ctx = {
    arcs,
    tri,
    setTransform: vi.fn(),
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    drawImage: vi.fn(),
    moveTo: (x: number, y: number) => tri.push({ x, y }),
    lineTo: (x: number, y: number) => tri.push({ x, y }),
    closePath: vi.fn(),
    beginPath: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    arc: (x: number, y: number, r: number) => arcs.push({ x, y, r }),
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 1,
  };
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
    ctx as unknown as CanvasRenderingContext2D,
  );
  return ctx;
}

const SIZE = 132;

function isoUnit(zoneId: string) {
  const zone = getZone(zoneId);
  return Math.max(1, SIZE / Math.max(zone.width + zone.height, 1));
}

function isoMarker(zoneId: string, tile: { x: number; y: number }) {
  const zone = getZone(zoneId);
  const unit = isoUnit(zoneId);
  // The marker sits on the centre of the tile diamond, matching how the world
  // scene projects the player and how POIs are drawn on the minimap.
  const cx = tile.x + 0.5;
  const cy = tile.y + 0.5;
  return {
    x: (cx - cy + zone.height) * unit,
    y: (cx + cy) * unit / 2,
  };
}


function markerFor(ctx: ReturnType<typeof stubCanvas>) {
  const dot = ctx.arcs[ctx.arcs.length - 1]!;
  return { x: dot.x, y: dot.y };
}

/** Expected on-canvas marker position for a tile, including edge clamping. */
function expectedFor(zoneId: string, tile: { x: number; y: number }) {
  const zone = getZone(zoneId);
  const unit = isoUnit(zoneId);
  const dot = Math.max(2, unit * 0.32);
  const point = isoMarker(zoneId, tile);
  return clampMarker(point.x, point.y, {
    w: (zone.width + zone.height) * unit,
    h: (zone.width + zone.height) * unit / 2,
    radius: dot + 1,
  });
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

/** Manual rAF pump so interpolation can be stepped deterministically. */
function stubRaf() {
  let queued: FrameRequestCallback | null = null;
  let now = 0;
  vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
    queued = cb;
    return 1;
  });
  vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {
    queued = null;
  });
  vi.spyOn(performance, "now").mockImplementation(() => now);
  return {
    tick(ms = 16) {
      now += ms;
      const cb = queued;
      queued = null;
      cb?.(now);
      return cb !== null;
    },
  };
}

describe("Minimap player marker", () => {
  // Snap-position assertions run with motion disabled; interpolation is
  // covered explicitly in its own test below.
  beforeEach(() => useMotionStore.setState({ setting: "off" }));

  it("places the marker at tileCoord * cell, not divided by TILE again", () => {
    const ctx = stubCanvas();
    const zoneId = useCampusStore.getState().currentZone;
    const unit = isoUnit(zoneId);
    useCampusStore.setState({ playerPosition: { x: 12, y: 9 } });

    render(<Minimap size={SIZE} />);

    expect(markerFor(ctx)).toEqual(expectedFor(zoneId, { x: 12, y: 9 }));
    expect(markerFor(ctx)).toEqual(expectedFor(zoneId, { x: 12, y: 9 }));
  });

  it("tracks the player across successive tile positions", () => {
    const ctx = stubCanvas();
    const zoneId = useCampusStore.getState().currentZone;
    const unit = isoUnit(zoneId);
    const path = [
      { x: 0, y: 0 },
      { x: 4, y: 2 },
      { x: 17, y: 21 },
      { x: 23, y: 14 },
    ];

    const view = render(<Minimap size={SIZE} />);
    for (const tile of path) {
      useCampusStore.setState({ playerPosition: tile });
      view.rerender(<Minimap size={SIZE} />);
      expect(markerFor(ctx)).toEqual(expectedFor(zoneId, tile));
    }
  });

  it("never pins the marker to the top-left corner while the player moves", () => {
    const ctx = stubCanvas();
    useCampusStore.setState({ playerPosition: { x: 20, y: 18 } });
    const view = render(<Minimap size={SIZE} />);
    const first = markerFor(ctx);

    useCampusStore.setState({ playerPosition: { x: 3, y: 5 } });
    view.rerender(<Minimap size={SIZE} />);
    const second = markerFor(ctx);

    expect(first).not.toEqual({ x: 0, y: 0 });
    expect(second).not.toEqual(first);
  });

  it("eases toward the new tile over several frames instead of jumping", () => {
    useMotionStore.setState({ setting: "full" });
    const ctx = stubCanvas();
    const raf = stubRaf();
    const zoneId = useCampusStore.getState().currentZone;
    const unit = isoUnit(zoneId);

    useCampusStore.setState({ playerPosition: { x: 4, y: 4 } });
    const view = render(<Minimap size={SIZE} />);
    expect(markerFor(ctx)).toEqual(expectedFor(zoneId, { x: 4, y: 4 }));

    useCampusStore.setState({ playerPosition: { x: 14, y: 4 } });
    view.rerender(<Minimap size={SIZE} />);

    raf.tick();
    const mid = markerFor(ctx);
    expect(mid.x).toBeGreaterThan(expectedFor(zoneId, { x: 4, y: 4 }).x);
    expect(mid.x).toBeLessThan(expectedFor(zoneId, { x: 14, y: 4 }).x);

    // Pumping frames converges on the target and then stops requesting frames.
    let guard = 0;
    while (raf.tick() && guard++ < 200) {
      /* advance until settled */
    }
    expect(markerFor(ctx).x).toBeCloseTo(expectedFor(zoneId, { x: 14, y: 4 }).x, 5);
    expect(guard).toBeLessThan(200);
  });

  it("clamps the marker inside the canvas at map edges and on bad values", () => {
    const bounds = { w: 100, h: 80, radius: 5 };
    expect(clampMarker(0, 0, bounds)).toEqual({ x: 5, y: 5 });
    expect(clampMarker(999, 999, bounds)).toEqual({ x: 95, y: 75 });
    expect(clampMarker(-40, 120, bounds)).toEqual({ x: 5, y: 75 });
    expect(clampMarker(Number.NaN, Number.NaN, bounds)).toEqual({ x: 5, y: 5 });
    expect(clampMarker(50, 40, bounds)).toEqual({ x: 50, y: 40 });
  });

  it("keeps the marker on-map for the extreme corner tiles of the zone", () => {
    const ctx = stubCanvas();
    const zoneId = useCampusStore.getState().currentZone;
    const zone = getZone(zoneId);
    const unit = isoUnit(zoneId);
    const corners = [
      { x: 0, y: 0 },
      { x: zone.width - 1, y: zone.height - 1 },
      { x: zone.width + 6, y: -4 },
    ];

    const view = render(<Minimap size={SIZE} />);
    for (const tile of corners) {
      useCampusStore.setState({ playerPosition: tile });
      view.rerender(<Minimap size={SIZE} />);
      const m = markerFor(ctx);
      expect(m.x).toBeGreaterThan(0);
      expect(m.y).toBeGreaterThan(0);
      expect(m.x).toBeLessThan((zone.width + zone.height) * unit);
      expect(m.y).toBeLessThan((zone.width + zone.height) * unit / 2);
    }
  });

  it("points the facing arrow in the direction the student looks", () => {
    const ctx = stubCanvas();
    useCampusStore.setState({ playerPosition: { x: 12, y: 12 }, playerDirection: "right" });
    const view = render(<Minimap size={SIZE} />);
    const center = markerFor(ctx);
    const rightTip = ctx.tri[ctx.tri.length - 3]!;
    expect(rightTip.x).toBeGreaterThan(center.x);
    expect(rightTip.y).toBeCloseTo(center.y, 5);

    ctx.tri.length = 0;
    useCampusStore.setState({ playerDirection: "up" });
    view.rerender(<Minimap size={SIZE} />);
    const upTip = ctx.tri[ctx.tri.length - 3]!;
    expect(upTip.y).toBeLessThan(markerFor(ctx).y);
  });
});
