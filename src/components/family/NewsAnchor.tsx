import { useEffect, useState } from "react";
import { mascotAccessoryOf, mascotColorOf, type Mascot } from "@/lib/mascot";
import { motionSetting } from "@/lib/a11y/motion";

/**
 * Family News anchor: the existing mascot art, re-posed behind a blocky desk
 * with a simple mouth-flap + bounce loop while speech is playing. Loose sync
 * only — SpeechSynthesis gives no viseme data, so a timed flap is enough.
 */
export function NewsAnchor({
  mascot,
  speaking,
  size = 168,
}: {
  mascot: Mascot;
  speaking: boolean;
  size?: number;
}) {
  const color = mascotColorOf(mascot.color);
  const accessory = mascotAccessoryOf(mascot.accessory);
  const [frame, setFrame] = useState(0);
  const animated = motionSetting() === "full";

  useEffect(() => {
    if (!speaking) {
      setFrame(0);
      return;
    }
    const id = window.setInterval(() => setFrame((f) => (f + 1) % 4), 140);
    return () => window.clearInterval(id);
  }, [speaking]);

  // 0 closed, 1 half, 2 open, 3 half — a 4-step mouth flap.
  const openness = speaking ? [0, 0.5, 1, 0.5][frame]! : 0;
  const mouthH = 2 + openness * 7;
  const bob = speaking && animated ? (frame % 2 === 0 ? 0 : -3) : 0;

  return (
    <div
      data-testid="news-anchor"
      data-speaking={speaking ? "yes" : "no"}
      className="relative inline-flex flex-col items-center"
      style={{ width: size }}
      role="img"
      aria-label={`${color.label} mascot news anchor${speaking ? ", speaking" : ""}`}
    >
      <svg
        viewBox="0 0 64 64"
        width={size}
        height={size}
        aria-hidden="true"
        style={{
          transform: `translateY(${bob}px)`,
          transition: animated ? "transform 120ms steps(2)" : undefined,
        }}
      >
        {/* body */}
        <rect x="18" y="32" width="28" height="24" rx="7" fill={color.css} />
        <rect x="9" y="35" width="9" height="16" rx="4" fill={color.css} />
        <rect x="46" y="35" width="9" height="16" rx="4" fill={color.css} />
        {/* head */}
        <rect x="17" y="8" width="30" height="28" rx="9" fill={color.css} />
        <rect x="13" y="6" width="10" height="10" rx="4" fill={color.css} />
        <rect x="41" y="6" width="10" height="10" rx="4" fill={color.css} />
        {/* eyes */}
        <rect x="24" y="19" width="4.5" height="4.5" rx="1.4" fill="#2b1e18" />
        <rect x="35.5" y="19" width="4.5" height="4.5" rx="1.4" fill="#2b1e18" />
        {/* mouth (flaps while speaking) */}
        <rect
          x="28"
          y={28 - mouthH / 2 + 1}
          width="8"
          height={mouthH}
          rx="2"
          fill="#2b1e18"
          opacity="0.85"
        />
      </svg>

      {accessory.id !== "none" && (
        <span
          data-testid="anchor-accessory"
          className="block-chip absolute left-1/2 top-1 -translate-x-1/2 bg-card px-1.5 leading-none"
          style={{ borderColor: accessory.css, fontSize: Math.max(14, size * 0.2) }}
        >
          {accessory.glyph}
        </span>
      )}

      {/* blocky news desk */}
      <div
        className="block-panel -mt-8 w-full border-accent bg-primary/90 px-3 py-2 text-center"
        aria-hidden="true"
      >
        <span className="font-display text-xs font-black uppercase tracking-widest text-primary-foreground">
          Family News
        </span>
      </div>
    </div>
  );
}
