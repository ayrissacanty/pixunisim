import { Crosshair, Hand, Grid3x3, ZoomIn, ZoomOut } from "lucide-react";

/**
 * Pan / zoom cluster for the isometric camera. Works with mouse wheel and
 * pinch in the scene itself; these buttons keep it reachable on touch and
 * give an explicit way back to following the student.
 */
export function CampusCameraControls({
  panMode,
  gridOn,
  onTogglePan,
  onToggleGrid,
  onZoomIn,
  onZoomOut,
  onRecenter,
  showGrid = true,
}: {
  panMode: boolean;
  gridOn: boolean;
  onTogglePan: () => void;
  onToggleGrid: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onRecenter: () => void;
  showGrid?: boolean;
}) {
  const cls =
    "block-btn flex size-10 items-center justify-center border-border bg-card/95 text-foreground hover:bg-accent hover:text-accent-foreground";
  return (
    <div className="pointer-events-auto flex flex-col gap-1.5" data-testid="camera-controls">
      <button type="button" className={cls} onClick={onZoomIn} aria-label="Zoom the camera in" data-testid="cam-zoom-in">
        <ZoomIn className="size-4" />
      </button>
      <button type="button" className={cls} onClick={onZoomOut} aria-label="Zoom the camera out" data-testid="cam-zoom-out">
        <ZoomOut className="size-4" />
      </button>
      <button
        type="button"
        className={cls}
        onClick={onTogglePan}
        aria-pressed={panMode}
        aria-label="Toggle free-look panning of the campus camera"
        data-testid="cam-pan"
        data-pan={panMode ? "on" : "off"}
      >
        <Hand className={`size-4 ${panMode ? "text-accent" : ""}`} />
      </button>
      <button type="button" className={cls} onClick={onRecenter} aria-label="Recenter the camera on your student" data-testid="cam-recenter">
        <Crosshair className="size-4" />
      </button>
      {showGrid && (
        <button
          type="button"
          className={cls}
          onClick={onToggleGrid}
          aria-pressed={gridOn}
          aria-label="Toggle the tile grid, depth and collision debug overlay"
          data-testid="cam-grid"
          data-grid={gridOn ? "on" : "off"}
        >
          <Grid3x3 className={`size-4 ${gridOn ? "text-accent" : ""}`} />
        </button>
      )}
    </div>
  );
}
