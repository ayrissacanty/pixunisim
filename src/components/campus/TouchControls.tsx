import { useCallback, useRef, useState } from "react";
import { CONTROL_METRICS, useControlsStore } from "@/lib/a11y/controls";
import { haptic } from "@/lib/a11y/haptics";
import { useMotionStore, transitionsAnimated } from "@/lib/a11y/motion";

const DEAD = 8;

/**
 * Floating virtual joystick: the stick spawns wherever the thumb first lands
 * inside the movement zone, so one-handed play never needs precise aiming.
 * Size and contrast follow the mobile accessibility settings.
 */
export function TouchControls({
  onMove,
  onAction,
}: {
  onMove: (x: number, y: number) => void;
  onAction: () => void;
}) {
  const size = useControlsStore((s) => s.size);
  const hc = useControlsStore((s) => s.highContrast);
  const motionSetting = useMotionStore((s) => s.setting);
  const animated = transitionsAnimated(motionSetting);
  const m = CONTROL_METRICS[size];
  const zoneRef = useRef<HTMLDivElement | null>(null);
  const pointerId = useRef<number | null>(null);
  const origin = useRef({ x: 0, y: 0 });
  const maxRef = useRef(m.max);
  maxRef.current = m.max;
  const [stick, setStick] = useState<{ ox: number; oy: number; dx: number; dy: number } | null>(
    null,
  );

  const update = useCallback(
    (clientX: number, clientY: number) => {
      const MAX = maxRef.current;
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
    haptic("engage");
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
    haptic("release");
    setStick(null);
    onMove(0, 0);
  };

  const zoneClass = hc
    ? "border-4 border-foreground bg-background/85"
    : "border-[3px] border-accent/35 bg-sidebar/30";
  const baseClass = hc
    ? "border-4 border-foreground bg-background/90"
    : "border-[3px] border-accent/70 bg-sidebar/55";
  const knobClass = hc
    ? "border-4 border-background bg-foreground"
    : "border-[4px] border-accent bg-primary/90";
  const actionClass = hc
    ? "border-4 border-background bg-foreground text-background"
    : "border-[4px] border-accent bg-primary text-primary-foreground";

  return (
    <>
      <div
        ref={zoneRef}
        data-testid="touch-joystick"
        data-size={size}
        data-contrast={hc ? "high" : "normal"}
        role="application"
        aria-label="Movement joystick — drag your thumb to walk"
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
        onPointerLeave={end}
        style={{ width: m.zone, height: m.zone, touchAction: "none" }}
        className={`pointer-events-auto absolute bottom-6 left-4 rounded-[2rem] md:hidden ${zoneClass}`}
      >
        {stick && (
          <>
            <span
              className={`pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full shadow-[0_4px_0_0_var(--block-edge)] ${baseClass}`}
              style={{ left: stick.ox, top: stick.oy, width: m.base, height: m.base }}
            />
            <span
              className={`pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-[0.9rem] shadow-[0_4px_0_0_var(--block-edge)] ${knobClass}`}
              style={{
                left: stick.ox + stick.dx,
                top: stick.oy + stick.dy,
                width: m.stick,
                height: m.stick,
              }}
            />
          </>
        )}
      </div>

      <button
        onClick={() => {
          haptic("tap");
          onAction();
        }}
        aria-label="Interact"
        data-testid="touch-action"
        style={{ touchAction: "none", width: m.action, height: m.action, fontSize: m.font }}
        className={`block-round pointer-events-auto absolute bottom-10 right-5 font-black tracking-wide md:hidden ${actionClass} ${
          animated ? "" : "transition-none"
        }`}
      >
        ACT
      </button>
    </>
  );
}
