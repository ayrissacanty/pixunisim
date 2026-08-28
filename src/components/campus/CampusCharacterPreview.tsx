import { useEffect, useRef } from "react";
import { FRAME, paintCharacter, type SpriteDirection } from "@/lib/campus/charart";
import { lookFromAppearance, type Appearance } from "@/lib/campus/appearance";

interface Props {
  appearance: Appearance;
  size?: number;
  direction?: SpriteDirection;
  /** Play the walk cycle instead of standing still. */
  animated?: boolean;
}

/**
 * Canvas preview of the exact hand-drawn sprite used out on campus, so the
 * customizer always shows the real character rather than a stand-in.
 */
export function CampusCharacterPreview({
  appearance,
  size = 160,
  direction = "down",
  animated = true,
}: Props) {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const look = lookFromAppearance(appearance);
    let raf = 0;
    let frame = 1;
    let last = 0;

    const draw = (time: number) => {
      if (!animated) {
        ctx.clearRect(0, 0, FRAME, FRAME);
        paintCharacter(ctx, look, direction, 1);
        return;
      }
      if (time - last > 140) {
        last = time;
        frame = (frame + 1) % 4;
        ctx.clearRect(0, 0, FRAME, FRAME);
        paintCharacter(ctx, look, direction, [0, 1, 2, 1][frame]!);
      }
      raf = requestAnimationFrame(draw);
    };
    if (animated) raf = requestAnimationFrame(draw);
    else draw(0);
    return () => cancelAnimationFrame(raf);
  }, [appearance, direction, animated]);

  return (
    <canvas
      ref={ref}
      width={FRAME}
      height={FRAME}
      style={{ width: size, height: size }}
      aria-label="Your campus character"
      data-testid="campus-character-preview"
    />
  );
}
