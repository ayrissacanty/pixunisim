import { useEffect, useMemo, useRef, useState } from "react";

/* Locked palette from the UNIFY School Bible. */
const P = {
  warm: "#FFF9F0", ivory: "#F7EEDF", hall: "#F5F7F4",
  oak: "#DDAA68", oakHi: "#F1C887", oakMid: "#C98B4D", oakSh: "#9A653D",
  sky: "#A9DDF2", powder: "#8FC9E8", blue: "#4F91C7", deepBlue: "#326C9E",
  mint: "#A9DCC0", sage: "#88B89A", leaf: "#5E9C72", darkLeaf: "#3F7655",
  yellow: "#F8D977", gold: "#EAB94E", coral: "#F28F7E", peach: "#F6B294",
  pink: "#EAA5B2", lav: "#B8A8DA", deepLav: "#8173AE",
  lgray: "#DDE2E3", mgray: "#9DA7AA", line: "#455057", dark: "#313A3F", shadow: "#596267",
};

export type LessonKind = "math" | "ela";
type View = "iso" | "flat";
type Pt = { x: number; y: number };

const W = 9; // classroom width in tiles
const ROOM_D = 8; // classroom depth
const H = 11; // incl. 3-tile hallway

function projector(view: View) {
  return (x: number, y: number, z = 0): [number, number] =>
    view === "iso" ? [(x - y) * 48, (x + y) * 24 - z] : [x * 48, y * 48 - z * 0.5];
}
type Proj = ReturnType<typeof projector>;
const pts = (a: [number, number][]) => a.map((p) => p.join(",")).join(" ");

function shade(hex: string, f: number) {
  const n = parseInt(hex.slice(1), 16);
  const c = [n >> 16, (n >> 8) & 255, n & 255].map((v) => Math.max(0, Math.min(255, Math.round(v * f))));
  return `rgb(${c.join(",")})`;
}

/** Outlined, lit iso box: light from upper-left, so the right face is darker. */
function Box({ p, x, y, w, d, h, color, z = 0, top }: { p: Proj; x: number; y: number; w: number; d: number; h: number; color: string; z?: number; top?: string }) {
  const t = (a: number, b: number) => p(a, b, z + h);
  const g = (a: number, b: number) => p(a, b, z);
  return (
    <g stroke={P.line} strokeWidth={1.6} strokeLinejoin="round">
      <polygon points={pts([g(x, y + d), g(x + w, y + d), t(x + w, y + d), t(x, y + d)])} fill={shade(color, 0.9)} />
      <polygon points={pts([g(x + w, y), g(x + w, y + d), t(x + w, y + d), t(x + w, y)])} fill={shade(color, 0.76)} />
      <polygon points={pts([t(x, y), t(x + w, y), t(x + w, y + d), t(x, y + d)])} fill={top ?? shade(color, 1.08)} />
    </g>
  );
}

function Shadow({ p, x, y, rx = 22, ry = 7 }: { p: Proj; x: number; y: number; rx?: number; ry?: number }) {
  const [sx, sy] = p(x, y);
  return <ellipse cx={sx + 4} cy={sy + 3} rx={rx} ry={ry} fill={P.shadow} opacity={0.18} />;
}

type Pose = "stand" | "sit" | "write" | "raise" | "point" | "walk";
interface Person { skin: string; hair: string; shirt: string; pants: string; height: number; pose: Pose; facing: -1 | 1 }

function Human({ p, at, who, phase }: { p: Proj; at: Pt; who: Person; phase: number }) {
  const [sx, sy] = p(at.x, at.y);
  const s = who.height / 86;
  const seated = who.pose !== "stand" && who.pose !== "point" && who.pose !== "walk";
  const bob = who.pose === "walk" ? Math.abs(Math.sin(phase * 8)) * 2 : Math.sin(phase * 3) * 0.8;
  const leg = who.pose === "walk" ? Math.sin(phase * 8) * 5 : 0;
  const writeArm = who.pose === "write" ? Math.sin(phase * 10) * 2 : 0;
  const f = who.facing;
  return (
    <g transform={`translate(${sx},${sy}) scale(${s})`}>
      <ellipse cx={3} cy={2} rx={20} ry={5} fill={P.shadow} opacity={0.18} />
      <g transform={`translate(0,${-bob + (seated ? 14 : 0)})`} stroke={P.line} strokeWidth={1.8} strokeLinejoin="round" strokeLinecap="round">
        {!seated && (
          <>
            <path d={`M-6,-34 L${-6 - leg},-2`} stroke={who.pants} strokeWidth={8} />
            <path d={`M6,-34 L${6 + leg},-2`} stroke={who.pants} strokeWidth={8} />
          </>
        )}
        {seated && <path d="M-9,-30 h18 v8 h-18z" fill={who.pants} />}
        <path d="M-13,-36 Q-14,-62 0,-64 Q14,-62 13,-36 Z" fill={who.shirt} />
        {/* arms */}
        {who.pose === "raise" ? (
          <path d={`M${10 * f},-58 L${14 * f},-86`} stroke={who.skin} strokeWidth={6} />
        ) : who.pose === "point" ? (
          <path d={`M${11 * f},-58 L${30 * f},-66`} stroke={who.skin} strokeWidth={6} />
        ) : (
          <path d={`M${12 * f},-58 L${14 * f + writeArm},-38`} stroke={who.skin} strokeWidth={6} />
        )}
        <path d={`M${-12 * f},-58 L${-13 * f},-38`} stroke={who.skin} strokeWidth={6} />
        <circle cx={0} cy={-76} r={12} fill={who.skin} />
        <path d="M-12,-78 Q-12,-92 0,-91 Q13,-92 12,-76 Q6,-84 -12,-78Z" fill={who.hair} />
        <circle cx={4 * f} cy={-76} r={1.3} fill={P.dark} stroke="none" />
        <circle cx={-3 * f + 3 * f} cy={-76} r={0} />
        <path d={`M${2 * f},-70 q3,2 5,0`} fill="none" strokeWidth={1.2} />
      </g>
    </g>
  );
}

const STUDENTS: Person[] = [
  { skin: "#8D5A3B", hair: "#2B2320", shirt: P.coral, pants: P.deepBlue, height: 66, pose: "write", facing: 1 },
  { skin: "#F2C9A5", hair: "#C98B4D", shirt: P.mint, pants: P.charcoal ?? P.line, height: 64, pose: "sit", facing: -1 },
  { skin: "#C68E63", hair: "#3B2A22", shirt: P.lav, pants: P.deepBlue, height: 66, pose: "raise", facing: 1 },
  { skin: "#E7B48A", hair: "#6B3F24", shirt: P.yellow, pants: P.line, height: 62, pose: "write", facing: -1 },
  { skin: "#5E3A26", hair: "#1E1816", shirt: P.powder, pants: P.oakSh, height: 66, pose: "sit", facing: 1 },
  { skin: "#F5D2B5", hair: "#E0B45A", shirt: P.pink, pants: P.deepBlue, height: 64, pose: "write", facing: -1 },
];
const DESKS: Pt[] = [
  { x: 1.6, y: 3.2 }, { x: 3.9, y: 3.2 }, { x: 6.2, y: 3.2 },
  { x: 1.6, y: 5.4 }, { x: 3.9, y: 5.4 }, { x: 6.2, y: 5.4 },
];

interface Obstacle { x: number; y: number; w: number; d: number }
const OBSTACLES: Obstacle[] = [
  ...DESKS.map((d) => ({ x: d.x, y: d.y, w: 1.2, d: 0.7 })),
  ...DESKS.map((d) => ({ x: d.x + 0.3, y: d.y + 0.8, w: 0.6, d: 0.6 })),
  { x: 5.8, y: 0.9, w: 2.2, d: 0.9 }, // teacher desk
  { x: 0.2, y: 1.5, w: 0.7, d: 2.4 }, // bookshelf
  { x: 0.2, y: 5.2, w: 0.7, d: 1.6 }, // math/reading center
  { x: 7.9, y: 6.6, w: 0.8, d: 0.8 }, // plant
  { x: 0.2, y: 10.2, w: 8.6, d: 0.6 }, // lockers
];

function blocked(x: number, y: number) {
  const r = 0.22;
  if (x < 0.3 || x > W - 0.3 || y < 0.35 || y > H - 0.9) return true;
  if (y > ROOM_D - 0.3 && y < ROOM_D + 0.3 && !(x > 4 && x < 5)) return true;
  return OBSTACLES.some((o) => x + r > o.x && x - r < o.x + o.w && y + r > o.y && y - r < o.y + o.d);
}

const LESSON = {
  math: {
    title: "Grade 4 Math · 4.NF.A.1",
    board: ["Equivalent Fractions", "1/2 = 2/4 = 4/8", "Multiply top & bottom", "by the same number"],
    teacher: "Ms. Alvarez",
    line: "Today we're finding equivalent fractions. Look at the fraction strips on the board!",
    center: "Fraction strips & counters",
    poster: [P.coral, P.yellow, P.powder],
  },
  ela: {
    title: "Grade 4 ELA · RL.4.3",
    board: ["Describe a Character", "What does she SAY?", "What does she DO?", "What does she THINK?"],
    teacher: "Mr. Okafor",
    line: "Let's describe a character using what they say, do and think. Open your novels!",
    center: "Reading nook & anchor charts",
    poster: [P.lav, P.mint, P.peach],
  },
} as const;

interface Interactable { id: string; at: Pt; label: string; text: string }

export function IsoClassroom({ lesson, view }: { lesson: LessonKind; view: View }) {
  const L = LESSON[lesson];
  const p = useMemo(() => projector(view), [view]);
  const [player, setPlayer] = useState<Pt>({ x: 4.5, y: 9.4 });
  const [facing, setFacing] = useState<-1 | 1>(1);
  const [moving, setMoving] = useState(false);
  const [phase, setPhase] = useState(0);
  const [bubble, setBubble] = useState<string | null>(null);
  const keys = useRef(new Set<string>());
  const pad = useRef<Pt>({ x: 0, y: 0 });

  const items: Interactable[] = useMemo(
    () => [
      { id: "teacher", at: { x: 4.5, y: 1.3 }, label: `Talk to ${L.teacher}`, text: `${L.teacher}: "${L.line}"` },
      { id: "board", at: { x: 3.2, y: 0.8 }, label: "Read board", text: L.board.join(" · ") },
      { id: "shelf", at: { x: 1.2, y: 2.7 }, label: "Browse shelf", text: "Leveled readers, dictionaries and math journals." },
      { id: "center", at: { x: 1.2, y: 6 }, label: "Learning center", text: L.center },
      ...DESKS.map((d, i) => ({ id: `s${i}`, at: { x: d.x + 0.6, y: d.y + 1.1 }, label: "Chat with classmate", text: STUDENTS[i]!.pose === "raise" ? "Classmate: \"I know the answer! I'm waiting to be called on.\"" : "Classmate: \"Shh — I'm working on today's problem.\"" })),
      { id: "lockers", at: { x: 2.5, y: 9.8 }, label: "Open locker", text: "Your locker: backpack, lunch and a library book." },
    ],
    [L],
  );
  const near = items
    .map((it) => ({ it, d: Math.hypot(it.at.x - player.x, it.at.y - player.y) }))
    .filter((o) => o.d < 1.3)
    .sort((a, b) => a.d - b.d)[0]?.it;

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keys.current.add(e.key.toLowerCase());
      if (e.key === "e" || e.key === " " || e.key === "Enter") act();
    };
    const up = (e: KeyboardEvent) => keys.current.delete(e.key.toLowerCase());
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  });

  function act() {
    if (bubble) return setBubble(null);
    if (near) setBubble(near.text);
  }

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      setPhase((v) => v + dt);
      const k = keys.current;
      let sx = (k.has("arrowright") || k.has("d") ? 1 : 0) - (k.has("arrowleft") || k.has("a") ? 1 : 0) + pad.current.x;
      let sy = (k.has("arrowdown") || k.has("s") ? 1 : 0) - (k.has("arrowup") || k.has("w") ? 1 : 0) + pad.current.y;
      const m = Math.hypot(sx, sy);
      if (m > 0) {
        sx /= m; sy /= m;
        // Screen-relative input: in iso, convert screen axes to grid axes.
        const [gx, gy] = view === "iso" ? [(sx + sy) / 1.41, (sy - sx) / 1.41] : [sx, sy];
        const v = 2.6 * dt;
        setPlayer((pl) => {
          let nx = pl.x + gx * v, ny = pl.y + gy * v;
          if (blocked(nx, pl.y)) nx = pl.x;
          if (blocked(nx, ny)) ny = pl.y;
          return { x: nx, y: ny };
        });
        if (sx !== 0) setFacing(sx > 0 ? 1 : -1);
      }
      setMoving(m > 0);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [view]);

  // Build depth-sorted drawables (floor/walls drawn first, then by grid depth).
  const drawables: { key: number; el: React.ReactNode }[] = [];
  DESKS.forEach((d, i) => {
    drawables.push({
      key: d.x + d.y + 1.2,
      el: (
        <g key={`desk${i}`}>
          <Shadow p={p} x={d.x + 0.7} y={d.y + 0.5} rx={34} ry={10} />
          {[0.1, 1.1].map((ox) => [0.1, 0.6].map((oy) => <Box key={`${ox}${oy}`} p={p} x={d.x + ox} y={d.y + oy} w={0.06} d={0.06} h={26} color={P.mgray} />))}
          <Box p={p} x={d.x} y={d.y} w={1.2} d={0.7} h={6} z={26} color={P.oak} top={P.oakHi} />
          {lesson === "math" ? (
            <Box p={p} x={d.x + 0.3} y={d.y + 0.2} w={0.5} d={0.3} h={2} z={32} color={P.warm} top={i % 2 ? P.yellow : P.warm} />
          ) : (
            <Box p={p} x={d.x + 0.35} y={d.y + 0.15} w={0.45} d={0.35} h={5} z={32} color={[P.coral, P.blue, P.leaf][i % 3]!} />
          )}
        </g>
      ),
    });
    const seat = { x: d.x + 0.6, y: d.y + 1.1 };
    drawables.push({
      key: seat.x + seat.y + 0.3,
      el: (
        <g key={`stu${i}`}>
          <Box p={p} x={d.x + 0.35} y={d.y + 0.85} w={0.5} d={0.5} h={4} z={16} color={P.blue} />
          <Box p={p} x={d.x + 0.35} y={d.y + 1.3} w={0.5} d={0.06} h={22} z={16} color={P.blue} />
          <Human p={p} at={seat} who={STUDENTS[i]!} phase={phase + i} />
        </g>
      ),
    });
  });
  drawables.push({ key: 8.7, el: <g key="tdesk"><Shadow p={p} x={7} y={1.5} rx={50} ry={14} /><Box p={p} x={5.8} y={0.9} w={2.2} d={0.9} h={34} color={P.oakMid} top={P.oak} /><Box p={p} x={6.1} y={1.1} w={0.5} d={0.4} h={12} z={34} color={P.dark} /><Box p={p} x={7.2} y={1.1} w={0.3} d={0.3} h={10} z={34} color={P.coral} /></g> });
  drawables.push({ key: 5.8, el: <Human key="teacher" p={p} at={{ x: 4.5, y: 1.3 }} who={{ skin: lesson === "math" ? "#C68E63" : "#5E3A26", hair: "#2B2320", shirt: P.leaf, pants: P.dark, height: 86, pose: "point", facing: -1 }} phase={phase} /> });
  drawables.push({ key: 4.6, el: <g key="shelf"><Box p={p} x={0.2} y={1.5} w={0.7} d={2.4} h={90} color={P.oakMid} />{[20, 45, 70].map((z, r) => [0, 1, 2, 3, 4, 5].map((b) => <Box key={`${z}${b}`} p={p} x={0.85} y={1.6 + b * 0.37} w={0.05} d={0.3} h={18} z={z} color={[P.coral, P.blue, P.yellow, P.leaf, P.lav, P.peach][(b + r) % 6]!} />))}</g> });
  drawables.push({ key: 7.2, el: <g key="center"><Box p={p} x={0.2} y={5.2} w={0.7} d={1.6} h={40} color={P.mint} top={P.sage} />{lesson === "math" ? [0, 1, 2, 3].map((b) => <Box key={b} p={p} x={0.35} y={5.3 + b * 0.35} w={0.3} d={0.25} h={8 + b * 6} z={40} color={[P.coral, P.yellow, P.blue, P.leaf][b]!} />) : <Box p={p} x={0.3} y={5.5} w={0.5} d={0.9} h={10} z={40} color={P.lav} />}</g> });
  drawables.push({ key: 15.2, el: <g key="plant"><Shadow p={p} x={8.3} y={7.1} rx={20} ry={6} /><Box p={p} x={7.95} y={6.65} w={0.7} d={0.7} h={26} color={P.coral} />{(() => { const [cx, cy] = p(8.3, 7, 60); return <g stroke={P.darkLeaf} strokeWidth={1.6}><ellipse cx={cx - 10} cy={cy + 8} rx={14} ry={20} fill={P.leaf} /><ellipse cx={cx + 10} cy={cy + 6} rx={13} ry={22} fill={P.sage} /><ellipse cx={cx} cy={cy - 6} rx={12} ry={18} fill={P.leaf} /></g>; })()}</g> });
  // lockers on hallway far wall (foreground)
  drawables.push({ key: 30, el: <g key="lockers">{Array.from({ length: 11 }, (_, i) => <Box key={i} p={p} x={0.2 + i * 0.78} y={10.3} w={0.74} d={0.5} h={110} color={[P.blue, P.powder][i % 2]!} />)}</g> });
  drawables.push({
    key: player.x + player.y + 0.35,
    el: <Human key="player" p={p} at={player} who={{ skin: "#E7B48A", hair: "#6B3F24", shirt: P.gold, pants: P.deepBlue, height: 68, pose: moving ? "walk" : "stand", facing }} phase={phase} />,
  });
  drawables.sort((a, b) => a.key - b.key);

  // Floor tiles
  const floor: React.ReactNode[] = [];
  for (let x = 0; x < W; x++)
    for (let y = 0; y < H; y++) {
      const hall = y >= ROOM_D;
      const c = hall ? ((x + y) % 2 ? P.hall : P.lgray) : (x + y) % 2 ? P.oak : P.oakHi;
      floor.push(<polygon key={`${x},${y}`} points={pts([p(x, y), p(x + 1, y), p(x + 1, y + 1), p(x, y + 1)])} fill={c} stroke={hall ? P.mgray : P.oakMid} strokeWidth={0.6} />);
    }
  const rug = pts([p(1.3, 2.8), p(7.6, 2.8), p(7.6, 7.2), p(1.3, 7.2)]);

  const [cx, cy] = p(player.x, player.y);
  const vw = 900, vh = 700;

  const boardCorners = [p(1.8, 0.05, 150), p(5.4, 0.05, 150), p(5.4, 0.05, 70), p(1.8, 0.05, 70)];

  return (
    <div className="relative h-full w-full select-none overflow-hidden" style={{ background: P.sky }}>
      <svg data-testid="iso-classroom" viewBox={`${cx - vw / 2} ${cy - vh / 2} ${vw} ${vh}`} className="h-full w-full" style={{ transition: "none" }}>
        {floor}
        <polygon points={rug} fill={P.powder} stroke={P.deepBlue} strokeWidth={1.5} opacity={0.55} />
        {/* rear walls */}
        <Box p={p} x={0} y={-0.2} w={W} d={0.2} h={160} color={P.ivory} />
        <Box p={p} x={-0.2} y={-0.2} w={0.2} d={ROOM_D + 0.2} h={160} color={P.ivory} />
        <Box p={p} x={0} y={-0.02} w={W} d={0.02} h={7} color={P.oakSh} />
        {/* board */}
        <polygon points={pts(boardCorners as [number, number][])} fill={P.darkLeaf} stroke={P.oakSh} strokeWidth={5} />
        {L.board.map((t, i) => {
          const [bx, by] = p(1.95, 0.05, 138 - i * 18);
          return <text key={i} x={bx} y={by} fill={P.warm} fontSize={i ? 11 : 13} fontFamily="Comic Sans MS, cursive" transform={view === "iso" ? `skewY(26.565) translate(0,${-bx * 0.5})` : undefined}>{t}</text>;
        })}
        {/* wall decor: posters, clock, windows */}
        {L.poster.map((c, i) => <polygon key={i} points={pts([p(6 + i * 0.9, 0.05, 140), p(6.7 + i * 0.9, 0.05, 140), p(6.7 + i * 0.9, 0.05, 95), p(6 + i * 0.9, 0.05, 95)])} fill={c} stroke={P.line} strokeWidth={1.5} />)}
        {(() => { const [x, y] = p(5.7, 0.05, 150); return <g><circle cx={x} cy={y} r={11} fill={P.warm} stroke={P.line} strokeWidth={2} /><path d={`M${x},${y} v-7 M${x},${y} h5`} stroke={P.dark} strokeWidth={1.5} /></g>; })()}
        {[1.5, 4.5].map((yy) => <polygon key={yy} points={pts([p(-0.05, yy, 145), p(-0.05, yy + 2, 145), p(-0.05, yy + 2, 70), p(-0.05, yy, 70)])} fill={P.sky} stroke={P.warm} strokeWidth={4} />)}
        {/* front wall between room and hallway, with door gap (low so it never hides the player) */}
        <Box p={p} x={0} y={ROOM_D - 0.1} w={4} d={0.2} h={36} color={P.ivory} />
        <Box p={p} x={5} y={ROOM_D - 0.1} w={4} d={0.2} h={36} color={P.ivory} />
        {drawables.map((d) => d.el)}
        {near && !bubble && (() => { const [x, y] = p(near.at.x, near.at.y, 110); return <g><circle cx={x} cy={y} r={9} fill={P.yellow} stroke={P.line} strokeWidth={2}><animate attributeName="r" values="8;10;8" dur="1.2s" repeatCount="indefinite" /></circle><text x={x} y={y + 4} textAnchor="middle" fontSize={11} fontWeight="bold" fill={P.dark}>!</text></g>; })()}
      </svg>

      <div className="pointer-events-none absolute left-3 top-3 rounded-md border-2 px-3 py-1 text-sm font-bold" style={{ background: P.warm, borderColor: P.line, color: P.dark }}>{L.title}</div>

      {bubble && (
        <button onClick={() => setBubble(null)} className="absolute inset-x-4 bottom-28 mx-auto max-w-xl rounded-lg border-2 p-4 text-left text-base" style={{ background: P.warm, borderColor: P.line, color: P.dark }}>
          {bubble}
          <span className="mt-1 block text-xs" style={{ color: P.mgray }}>Tap to close</span>
        </button>
      )}

      {/* Mobile controls: translucent 60px pad + action button */}
      <div className="absolute bottom-4 left-4 grid grid-cols-3 gap-1">
        {([["", 0, 0], ["▲", 0, -1], [""], ["◀", -1, 0], [""], ["▶", 1, 0], [""], ["▼", 0, 1], [""]] as [string, number?, number?][]).map(([l, x, y], i) =>
          l ? (
            <button key={i} aria-label={`move ${l}`} className="h-14 w-14 rounded-full border-2 text-lg" style={{ background: "rgba(255,249,240,0.7)", borderColor: P.line, color: P.dark }}
              onPointerDown={() => (pad.current = { x: x ?? 0, y: y ?? 0 })} onPointerUp={() => (pad.current = { x: 0, y: 0 })} onPointerLeave={() => (pad.current = { x: 0, y: 0 })}>{l}</button>
          ) : <span key={i} />,
        )}
      </div>
      <button onClick={act} disabled={!near && !bubble} className="absolute bottom-6 right-4 h-16 min-w-16 rounded-full border-2 px-4 text-sm font-bold disabled:opacity-40" style={{ background: P.yellow, borderColor: P.line, color: P.dark }}>
        {bubble ? "Close" : near?.label ?? "Action"}
      </button>
    </div>
  );
}
