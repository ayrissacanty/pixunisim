import { characterOf } from "@/lib/characters";
import { cn } from "@/lib/utils";

/**
 * Blocky 2D character chip.
 *
 * Draws a chunky storybook student from the shared character palette as plain
 * SVG — no 3D, no downloads. Used wherever the campus needs to show a cast
 * member (classroom beat, lesson panel, avatar picker, dorm room).
 */
const hex = (n: number) => `#${n.toString(16).padStart(6, "0")}`;

export function CharacterAvatar({
  character,
  size = 96,
  className,
  facing = "front",
}: {
  character: string | null | undefined;
  size?: number;
  className?: string;
  facing?: "front" | "side";
}) {
  const def = characterOf(character);
  const p = def.palette;
  const wide = def.build === "sturdy" ? 4 : def.build === "slim" ? -3 : 0;

  return (
    <svg
      data-testid="character-avatar"
      data-character={def.id}
      role="img"
      aria-label={def.name}
      viewBox="0 0 64 96"
      width={size}
      height={(size * 96) / 64}
      shapeRendering="crispEdges"
      className={cn("block", className)}
    >
      {/* shadow */}
      <ellipse cx="32" cy="92" rx={18 + wide / 2} ry="4" fill="#000" opacity="0.18" />
      {/* legs */}
      <rect x="22" y="66" width="8" height="20" fill={hex(p.bottom)} />
      <rect x="34" y="66" width="8" height="20" fill={hex(p.bottom)} />
      <rect x="21" y="85" width="10" height="5" fill={hex(p.shoes)} />
      <rect x="33" y="85" width="10" height="5" fill={hex(p.shoes)} />
      {/* body */}
      <rect x={20 - wide / 2} y="40" width={24 + wide} height="28" rx="3" fill={hex(p.top)} />
      <rect x={20 - wide / 2} y="58" width={24 + wide} height="4" fill={hex(p.accent)} opacity="0.7" />
      {/* arms */}
      <rect x={13 - wide / 2} y="42" width="7" height="22" rx="2" fill={hex(p.top)} />
      <rect x={44 + wide / 2} y="42" width="7" height="22" rx="2" fill={hex(p.top)} />
      <rect x={13 - wide / 2} y="62" width="7" height="6" rx="2" fill={hex(p.skin)} />
      <rect x={44 + wide / 2} y="62" width="7" height="6" rx="2" fill={hex(p.skin)} />
      {/* neck + head */}
      <rect x="29" y="35" width="6" height="6" fill={hex(p.skin)} />
      <rect x="21" y="14" width="22" height="22" rx="4" fill={hex(p.skin)} />
      {/* hair */}
      <HairShape style={def.hairStyle} color={hex(p.hair)} />
      {/* eyes */}
      {facing === "front" ? (
        <>
          <rect x="26" y="24" width="3" height="4" fill="#2b2118" />
          <rect x="35" y="24" width="3" height="4" fill="#2b2118" />
        </>
      ) : (
        <rect x="34" y="24" width="3" height="4" fill="#2b2118" />
      )}
      <rect x="29" y="31" width="6" height="2" rx="1" fill="#2b2118" opacity="0.55" />
    </svg>
  );
}

function HairShape({ style, color }: { style: string; color: string }) {
  switch (style) {
    case "bun":
      return (
        <>
          <rect x="20" y="12" width="24" height="9" rx="4" fill={color} />
          <circle cx="32" cy="9" r="5" fill={color} />
        </>
      );
    case "crop":
      return <rect x="20" y="12" width="24" height="8" rx="3" fill={color} />;
    case "curls":
      return (
        <>
          <rect x="19" y="11" width="26" height="10" rx="5" fill={color} />
          <circle cx="21" cy="15" r="4" fill={color} />
          <circle cx="43" cy="15" r="4" fill={color} />
        </>
      );
    case "ponytail":
      return (
        <>
          <rect x="20" y="12" width="24" height="9" rx="4" fill={color} />
          <rect x="43" y="17" width="6" height="18" rx="3" fill={color} />
        </>
      );
    case "wrap":
      return (
        <>
          <rect x="19" y="11" width="26" height="12" rx="5" fill={color} />
          <rect x="19" y="20" width="6" height="4" fill={color} />
        </>
      );
    case "bob":
    default:
      return (
        <>
          <rect x="19" y="11" width="26" height="10" rx="4" fill={color} />
          <rect x="19" y="18" width="5" height="12" fill={color} />
          <rect x="40" y="18" width="5" height="12" fill={color} />
        </>
      );
  }
}
