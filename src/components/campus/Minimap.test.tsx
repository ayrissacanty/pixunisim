import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { Minimap } from "./Minimap";
import { useCampusStore } from "@/lib/campus/store";
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

describe("Minimap player marker", () => {
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
});
