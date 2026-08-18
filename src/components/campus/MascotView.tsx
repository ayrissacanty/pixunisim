import { mascotAccessoryOf, mascotColorOf, type Mascot } from "@/lib/mascot";
import { cn } from "@/lib/utils";

/**
 * Placeholder mascot render: a simple colour-swapped vector body plus the
 * chosen accessory badge. Swaps to final art once the mascot sprites land —
 * the stored ids do not change.
 */
export function MascotView({
  mascot,
  size = 96,
  className,
}: {
  mascot: Mascot;
  size?: number;
  className?: string;
}) {
  const color = mascotColorOf(mascot.color);
  const accessory = mascotAccessoryOf(mascot.accessory);

  return (
    <div
      data-testid="mascot"
      data-color={color.id}
      data-accessory={accessory.id}
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`Mascot in ${color.label}${
        accessory.id === "none" ? "" : ` wearing ${accessory.label}`
      }`}
    >
      <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true">
        <ellipse cx="32" cy="58" rx="18" ry="4" fill="rgba(0,0,0,0.18)" />
        <rect x="20" y="32" width="24" height="22" rx="8" fill={color.css} />
        <rect x="12" y="34" width="8" height="16" rx="4" fill={color.css} />
        <rect x="44" y="34" width="8" height="16" rx="4" fill={color.css} />
        <circle cx="32" cy="22" r="14" fill={color.css} />
        <circle cx="20" cy="12" r="5" fill={color.css} />
        <circle cx="44" cy="12" r="5" fill={color.css} />
        <circle cx="27" cy="21" r="2.4" fill="#2b1e18" />
        <circle cx="37" cy="21" r="2.4" fill="#2b1e18" />
        <path
          d="M27 28 q5 4 10 0"
          stroke="#2b1e18"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
        />
      </svg>

      {accessory.id !== "none" && (
        <span
          data-testid="mascot-accessory"
          className="absolute left-1/2 top-0 -translate-x-1/2 rounded-full border-2 px-1 leading-none"
          style={{
            borderColor: accessory.css,
            backgroundColor: "rgba(255,255,255,0.85)",
            fontSize: Math.max(14, size * 0.28),
          }}
        >
          {accessory.glyph}
        </span>
      )}
    </div>
  );
}
