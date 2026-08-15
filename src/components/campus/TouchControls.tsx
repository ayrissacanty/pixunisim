import { useCallback, useRef, useState } from "react";

const ZONE = 176; // movement zone size in px
const MAX = 56; // max thumb travel from the joystick origin
const DEAD = 8;

/**
 * Floating virtual joystick: the stick spawns wherever the thumb first lands
 * inside the movement zone, so one-handed play never needs precise aiming.
 */
export function TouchControls({
  onMove,
  onAction,
}: {
  onMove: (x: number, y: number) => void;
  onAction: () => void;
}) {
  const zoneRef = useRef<HTMLDivElement | null>(null);
  const pointerId = useRef<number | null>(null);
  const origin = useRef({ x: 0, y: 0 });
  const [stick, setStick] = useState<{ ox: number; oy: number; dx: number; dy: number } | null>(
    null,
  );

  const update = useCallback(
    (clientX: number, clientY: number) => {
      let dx = clientX - origin.current.x;
      let dy = clientY - origin.current.y;
      const len = Math.hypot(dx, dy);
      if (len > MAX) {
        dx = (dx / len) * MAX;
        dy = (dy / len) * MAX;
      }
      setStick((s) => (s ? { ...s, dx, dy } : s));
      if (len < DEAD) {
        onMove(0, 0);
        return;
      }
      onMove(dx / MAX, dy / MAX);
    },
    [onMove],
  );

  const start = (e: React.PointerEvent<HTMLDivElement>) => {
    if (pointerId.current !== null) return;
    e.preventDefault();
    pointerId.current = e.pointerId;
    e.currentTarget.setPointerCapture(e.pointerId);
    const rect = zoneRef.current?.getBoundingClientRect();
    origin.current = { x: e.clientX, y: e.clientY };
    setStick({
      ox: e.clientX - (rect?.left ?? 0),
      oy: e.clientY - (rect?.top ?? 0),
      dx: 0,
      dy: 0,
    });
  };

  const move = (e: React.PointerEvent<HTMLDivElement>) => {
    if (pointerId.current !== e.pointerId) return;
    e.preventDefault();
    update(e.clientX, e.clientY);
  };

  const end = (e: React.PointerEvent<HTMLDivElement>) => {
    if (pointerId.current !== e.pointerId) return;
    pointerId.current = null;
    setStick(null);
    onMove(0, 0);
  };

  return (
    <>
      <div
        ref={zoneRef}
        data-testid="touch-joystick"
        role="application"
        aria-label="Movement joystick — drag your thumb to walk"
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
        onPointerLeave={end}
        style={{ width: ZONE, height: ZONE, touchAction: "none" }}
        className="pointer-events-auto absolute bottom-6 left-4 rounded-full border border-accent/25 bg-sidebar/25 md:hidden"
      >
        {stick && (
          <>
            <span
              className="pointer-events-none absolute size-28 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-accent/60 bg-sidebar/45"
              style={{ left: stick.ox, top: stick.oy }}
            />
            <span
              className="pointer-events-none absolute size-14 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-accent bg-primary/85 shadow-lg"
              style={{ left: stick.ox + stick.dx, top: stick.oy + stick.dy }}
            />
          </>
        )}
      </div>

      <button
        onClick={onAction}
        aria-label="Interact"
        style={{ touchAction: "none" }}
        className="pointer-events-auto absolute bottom-10 right-5 size-24 rounded-full border-2 border-accent bg-primary text-base font-bold text-primary-foreground shadow-xl active:scale-95 md:hidden"
      >
        ACT
      </button>
    </>
  );
}
