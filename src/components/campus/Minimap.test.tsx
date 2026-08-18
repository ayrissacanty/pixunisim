import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { Minimap } from "./Minimap";
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
  const ctx = {
    arcs,
    setTransform: vi.fn(),
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    drawImage: vi.fn(),
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

function cellSize(zoneId: string) {
  const zone = getZone(zoneId);
  return Math.max(1, Math.floor(SIZE / Math.max(zone.width, zone.height)));
}

function markerFor(ctx: ReturnType<typeof stubCanvas>) {
  const dot = ctx.arcs[ctx.arcs.length - 1]!;
  return { x: dot.x, y: dot.y };
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
    const cell = cellSize(zoneId);
    useCampusStore.setState({ playerPosition: { x: 12, y: 9 } });

    render(<Minimap size={SIZE} />);

    expect(markerFor(ctx)).toEqual({ x: 12 * cell, y: 9 * cell });
  });

  it("tracks the player across successive tile positions", () => {
    const ctx = stubCanvas();
    const zoneId = useCampusStore.getState().currentZone;
    const cell = cellSize(zoneId);
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
      expect(markerFor(ctx)).toEqual({ x: tile.x * cell, y: tile.y * cell });
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
    const cell = cellSize(useCampusStore.getState().currentZone);

    useCampusStore.setState({ playerPosition: { x: 4, y: 4 } });
    const view = render(<Minimap size={SIZE} />);
    expect(markerFor(ctx)).toEqual({ x: 4 * cell, y: 4 * cell });

    useCampusStore.setState({ playerPosition: { x: 14, y: 4 } });
    view.rerender(<Minimap size={SIZE} />);

    raf.tick();
    const mid = markerFor(ctx);
    expect(mid.x).toBeGreaterThan(4 * cell);
    expect(mid.x).toBeLessThan(14 * cell);

    // Pumping frames converges on the target and then stops requesting frames.
    let guard = 0;
    while (raf.tick() && guard++ < 200) {
      /* advance until settled */
    }
    expect(markerFor(ctx).x).toBeCloseTo(14 * cell, 5);
    expect(guard).toBeLessThan(200);
  });
});
