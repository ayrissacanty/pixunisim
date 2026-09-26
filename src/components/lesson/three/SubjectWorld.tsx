import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Lightformer, OrbitControls, RoundedBox, Text } from "@react-three/drei";
import * as THREE from "three";
import { BookOpen, Eye, MousePointer2, Rotate3D, Sparkles } from "lucide-react";
import {
  WORLD_COLORS as C,
  lessonWorldFor,
  sectionForObject,
  type LessonWorld,
  type LessonWorldConfig,
  type WorldObject,
} from "./subject-world";

export interface SubjectWorldProps {
  subject?: string | null | undefined;
  title: string;
  courseId?: string | null | undefined;
  sectionHeading?: string | undefined;
  sectionHeadings?: readonly string[] | undefined;
  activeSection?: number | undefined;
  onJumpToSection?: ((index: number) => void) | undefined;
  reducedMotion?: boolean;
}

function Ground({ color }: { color: string }) {
  return (
    <mesh position={[0, -1.25, 0]} receiveShadow>
      <cylinderGeometry args={[5.2, 5.4, 0.45, 16]} />
      <meshStandardMaterial color={color} roughness={0.9} />
    </mesh>
  );
}

function ShapeGeometry({ shape }: { shape: WorldObject["shape"] }) {
  switch (shape) {
    case "sphere":
      return <sphereGeometry args={[0.62, 24, 16]} />;
    case "cone":
      return <coneGeometry args={[0.62, 1.3, 3]} />;
    case "pyramid":
      return <coneGeometry args={[0.8, 1.2, 4]} />;
    case "torus":
      return <torusGeometry args={[0.55, 0.18, 12, 28]} />;
    case "cylinder":
      return <cylinderGeometry args={[0.45, 0.55, 1, 18]} />;
    case "capsule":
      return <capsuleGeometry args={[0.3, 0.7, 6, 12]} />;
    case "octahedron":
      return <octahedronGeometry args={[0.7]} />;
    default:
      return <boxGeometry args={[1, 1, 1]} />;
  }
}

function DiscoveryObject({
  obj,
  found,
  highlighted,
  reducedMotion,
  onDiscover,
}: {
  obj: WorldObject;
  found: boolean;
  highlighted: boolean;
  reducedMotion: boolean;
  onDiscover: () => void;
}) {
  const ref = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const target = useMemo(() => new THREE.Vector3(), []);
  useFrame((state, rawDelta) => {
    if (!ref.current) return;
    const dt = Math.min(rawDelta, 0.05);
    if (!reducedMotion) {
      ref.current.rotation.y += dt * (hovered ? 1.2 : 0.3);
      ref.current.position.y = obj.position[1] + Math.sin(state.clock.elapsedTime * 1.4 + obj.position[0]) * 0.08;
    }
    const s = hovered ? 1.15 : highlighted ? 1.08 : 1;
    ref.current.scale.lerp(target.set(s, s, s), 1 - Math.exp(-8 * dt));
  });
  return (
    <group ref={ref} position={obj.position}>
      <mesh
        castShadow
        onPointerEnter={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = "pointer";
        }}
        onPointerLeave={() => {
          setHovered(false);
          document.body.style.cursor = "";
        }}
        onClick={(e) => {
          e.stopPropagation();
          onDiscover();
        }}
      >
        <ShapeGeometry shape={obj.shape} />
        <meshStandardMaterial
          color={obj.color}
          roughness={0.4}
          metalness={0.1}
          emissive={highlighted || hovered ? obj.color : "#000000"}
          emissiveIntensity={highlighted ? 0.45 : hovered ? 0.3 : 0}
        />
      </mesh>
      {found && (
        <Text position={[0, 1.15, 0]} fontSize={0.26} color={C.paper} outlineWidth={0.03} outlineColor={C.ink} anchorX="center">
          {obj.label}
        </Text>
      )}
    </group>
  );
}

/* ---------- Per-world set dressing (non-interactive detail) ---------- */

function AlgebraDecor({ balance }: { balance: number }) {
  const beam = useRef<THREE.Group>(null);
  useFrame((_, d) => {
    if (!beam.current) return;
    const tilt = (1 - balance) * 0.35;
    beam.current.rotation.z = THREE.MathUtils.lerp(beam.current.rotation.z, tilt, 1 - Math.exp(-4 * Math.min(d, 0.05)));
  });
  return (
    <group>
      <gridHelper args={[10, 20, C.paper, C.teal]} position={[0, -1, 0]} />
      <mesh position={[0, 0, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.3, 2, 8]} />
        <meshStandardMaterial color={C.wood} />
      </mesh>
      <group ref={beam} position={[0, 1.05, 0]}>
        <mesh castShadow>
          <boxGeometry args={[3.6, 0.12, 0.2]} />
          <meshStandardMaterial color={C.yellow} metalness={0.5} roughness={0.3} />
        </mesh>
        {[-1.7, 1.7].map((x) => (
          <mesh key={x} position={[x, -0.35, 0]}>
            <cylinderGeometry args={[0.5, 0.4, 0.1, 16]} />
            <meshStandardMaterial color={C.paper} metalness={0.4} />
          </mesh>
        ))}
      </group>
      <Text position={[0, 2.2, -1.2]} fontSize={0.5} color={C.paper} outlineWidth={0.03} outlineColor={C.ink}>
        {balance >= 1 ? "2x + 3 = 11  ✓  x = 4" : "2x + 3 = 11"}
      </Text>
    </group>
  );
}

function GeometryDecor() {
  const pts: [number, number, number][] = [
    [-1.6, -0.95, 0],
    [1.6, -0.95, 0],
    [-1.6, 1.3, 0],
  ];
  return (
    <group position={[0, 0, -0.4]}>
      {pts.map((a, i) => {
        const b = pts[(i + 1) % 3]!;
        const va = new THREE.Vector3(...a);
        const vb = new THREE.Vector3(...b);
        const mid = va.clone().add(vb).multiplyScalar(0.5);
        const len = va.distanceTo(vb);
        const angle = Math.atan2(vb.y - va.y, vb.x - va.x);
        return (
          <mesh key={i} position={mid} rotation-z={angle - Math.PI / 2}>
            <cylinderGeometry args={[0.06, 0.06, len, 8]} />
            <meshStandardMaterial color={C.paper} />
          </mesh>
        );
      })}
      {pts.map((p, i) => (
        <mesh key={`v${i}`} position={p}>
          <sphereGeometry args={[0.14, 12, 8]} />
          <meshStandardMaterial color={[C.coral, C.yellow, C.sky][i] ?? C.paper} />
        </mesh>
      ))}
      <Text position={[-1.25, -0.6, 0.05]} fontSize={0.24} color={C.coral}>90°</Text>
      <Text position={[0.9, -0.75, 0.05]} fontSize={0.24} color={C.yellow}>35°</Text>
      <Text position={[-1.35, 0.85, 0.05]} fontSize={0.24} color={C.sky}>55°</Text>
      <Text position={[0, 2, 0]} fontSize={0.36} color={C.paper} outlineWidth={0.02} outlineColor={C.ink}>
        90° + 35° + 55° = 180°
      </Text>
    </group>
  );
}

function ScienceDecor({ reducedMotion }: { reducedMotion: boolean }) {
  const ring = useRef<THREE.Group>(null);
  useFrame((_, d) => {
    if (ring.current && !reducedMotion) ring.current.rotation.y += Math.min(d, 0.05) * 0.4;
  });
  return (
    <group>
      <mesh position={[0, 1.2, 0]}>
        <sphereGeometry args={[1.6, 32, 24]} />
        <meshStandardMaterial color={C.sky} transparent opacity={0.22} roughness={0.1} />
      </mesh>
      <group ref={ring} position={[0, 1.2, 0]}>
        {Array.from({ length: 7 }, (_, i) => {
          const a = (i / 7) * Math.PI * 2;
          return (
            <mesh key={i} position={[Math.cos(a) * 1.1, Math.sin(a * 2) * 0.35, Math.sin(a) * 1.1]}>
              <sphereGeometry args={[0.1, 8, 6]} />
              <meshStandardMaterial color={C.green} emissive={C.green} emissiveIntensity={0.3} />
            </mesh>
          );
        })}
      </group>
      {/* Microscope */}
      <group position={[-3.4, -0.6, -1.8]}>
        <mesh><boxGeometry args={[0.9, 0.15, 0.7]} /><meshStandardMaterial color={C.ink} /></mesh>
        <mesh position={[0, 0.7, -0.2]} rotation-x={0.3}><cylinderGeometry args={[0.12, 0.16, 1.2, 10]} /><meshStandardMaterial color={C.paper} metalness={0.5} /></mesh>
      </group>
      {/* Beakers */}
      {[[3.3, C.coral], [3.8, C.yellow]].map(([x, col]) => (
        <mesh key={String(x)} position={[x as number, -0.6, -1.6]}>
          <cylinderGeometry args={[0.22, 0.22, 0.8, 12]} />
          <meshStandardMaterial color={col as string} transparent opacity={0.7} />
        </mesh>
      ))}
    </group>
  );
}

const WORD_TAGS = ["owl", "flies", "silent", "."];
function EnglishDecor() {
  return (
    <group>
      <mesh position={[0, 0.9, -2.6]}>
        <boxGeometry args={[6.4, 2.2, 0.15]} />
        <meshStandardMaterial color="#1f4d3f" />
      </mesh>
      <Text position={[0, 1.25, -2.5]} fontSize={0.38} color={C.paper}>
        The silent owl flies.
      </Text>
      <Text position={[0, 0.6, -2.5]} fontSize={0.2} color={C.yellow}>
        adjective · noun · verb → complete sentence
      </Text>
      {WORD_TAGS.map((w, i) => (
        <Text key={w} position={[-2.7 + i * 1.8, -0.85, 1.8]} fontSize={0.22} color={C.paper} rotation-x={-Math.PI / 2}>
          {w}
        </Text>
      ))}
    </group>
  );
}

function HistoryDecor() {
  return (
    <group>
      <mesh position={[0, -1, 0.3]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[10, 1.1]} />
        <meshStandardMaterial color={C.sky} roughness={0.2} metalness={0.2} />
      </mesh>
      {[[-3.4, -2.6, 1.4], [-1, -3, 0.9]].map(([x, z, s], i) => (
        <mesh key={i} position={[x!, -1 + s! * 0.6, z!]} castShadow rotation-y={Math.PI / 4}>
          <coneGeometry args={[s!, s! * 1.2, 4]} />
          <meshStandardMaterial color="#e3c27d" />
        </mesh>
      ))}
      {[-3.6, 3.6].map((x) => (
        <group key={x} position={[x, -1, 2]}>
          <mesh position={[0, 0.6, 0]}><cylinderGeometry args={[0.05, 0.07, 1.2, 6]} /><meshStandardMaterial color={C.wood} /></mesh>
          <mesh position={[0, 1.3, 0]}><sphereGeometry args={[0.4, 8, 6]} /><meshStandardMaterial color={C.green} /></mesh>
        </group>
      ))}
    </group>
  );
}

function GovernmentDecor() {
  return (
    <group>
      <mesh position={[0, -0.9, -1.8]}>
        <boxGeometry args={[4.4, 0.3, 1.8]} />
        <meshStandardMaterial color={C.stone} />
      </mesh>
      {[-1.8, -1.2, -0.6, 0, 0.6, 1.2, 1.8].map((x) => (
        <mesh key={x} position={[x, -0.1, -1.1]} castShadow>
          <cylinderGeometry args={[0.12, 0.14, 1.3, 10]} />
          <meshStandardMaterial color={C.paper} />
        </mesh>
      ))}
      <mesh position={[0, 0.65, -1.8]}>
        <boxGeometry args={[4.4, 0.25, 1.8]} />
        <meshStandardMaterial color={C.paper} />
      </mesh>
      <mesh position={[0, 1.5, -1.8]}>
        <sphereGeometry args={[0.95, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={C.stone} />
      </mesh>
      {["LEGISLATIVE", "EXECUTIVE", "JUDICIAL"].map((t, i) => (
        <Text key={t} position={[[0, -2.7, 2.7][i]!, [2.9, 1.1, 1.1][i]!, [-1.8, 1, 1][i]!]} fontSize={0.22} color={C.yellow} outlineWidth={0.02} outlineColor={C.ink}>
          {t}
        </Text>
      ))}
    </group>
  );
}

function LiteratureDecor() {
  return (
    <group>
      {Array.from({ length: 3 }, (_, shelf) => (
        <group key={shelf} position={[0, -0.7 + shelf * 0.9, -2.6]}>
          <mesh><boxGeometry args={[6, 0.08, 0.7]} /><meshStandardMaterial color={C.wood} /></mesh>
          {Array.from({ length: 14 }, (_, i) => (
            <RoundedBox key={i} args={[0.3, 0.55 + ((i * 7 + shelf) % 4) * 0.06, 0.5]} radius={0.03} position={[-2.7 + i * 0.41, 0.33, 0]}>
              <meshStandardMaterial color={[C.coral, C.teal, C.yellow, C.sky, C.green][(i + shelf) % 5] ?? C.coral} />
            </RoundedBox>
          ))}
        </group>
      ))}
      {/* Open book on a lectern */}
      <group position={[0, -0.5, 0.2]}>
        <mesh position={[0, -0.3, 0]}><cylinderGeometry args={[0.15, 0.3, 0.8, 8]} /><meshStandardMaterial color={C.wood} /></mesh>
        <mesh position={[-0.35, 0.15, 0]} rotation-z={0.15}><boxGeometry args={[0.7, 0.05, 0.9]} /><meshStandardMaterial color={C.paper} /></mesh>
        <mesh position={[0.35, 0.15, 0]} rotation-z={-0.15}><boxGeometry args={[0.7, 0.05, 0.9]} /><meshStandardMaterial color={C.paper} /></mesh>
      </group>
    </group>
  );
}

function Decor({ world, found, reducedMotion }: { world: LessonWorld; found: number; reducedMotion: boolean }) {
  switch (world) {
    case "algebra":
      return <AlgebraDecor balance={found / 4} />;
    case "geometry":
      return <GeometryDecor />;
    case "science":
      return <ScienceDecor reducedMotion={reducedMotion} />;
    case "english":
      return <EnglishDecor />;
    case "history":
      return <HistoryDecor />;
    case "government":
      return <GovernmentDecor />;
    default:
      return <LiteratureDecor />;
  }
}

function WorldScene({
  world,
  found,
  highlighted,
  onDiscover,
  reducedMotion,
}: {
  world: LessonWorldConfig;
  found: readonly number[];
  highlighted: number;
  onDiscover: (i: number) => void;
  reducedMotion: boolean;
}) {
  return (
    <>
      <color attach="background" args={[C.ink]} />
      <fog attach="fog" args={[C.ink, 12, 24]} />
      <hemisphereLight intensity={1.05} color={C.paper} groundColor={C.ink} />
      <directionalLight position={[5, 9, 5]} intensity={2.2} castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
      <Ground color={world.ground} />
      <Decor world={world.id} found={found.length} reducedMotion={reducedMotion} />
      {world.objects.map((obj, i) => (
        <DiscoveryObject
          key={obj.label}
          obj={obj}
          found={found.includes(i)}
          highlighted={i === highlighted}
          reducedMotion={reducedMotion}
          onDiscover={() => onDiscover(i)}
        />
      ))}
      <Environment>
        <Lightformer intensity={2} color={C.paper} position={[0, 6, 0]} scale={[10, 10, 1]} />
        <Lightformer intensity={1.2} color={C.sky} position={[-6, 1, -2]} rotation-y={Math.PI / 2} scale={[12, 2, 1]} />
      </Environment>
      <OrbitControls enablePan={false} enableDamping={!reducedMotion} minDistance={7} maxDistance={13} minPolarAngle={0.6} maxPolarAngle={1.35} />
    </>
  );
}

export function SubjectWorld({
  subject,
  title,
  courseId,
  sectionHeading,
  sectionHeadings = [],
  activeSection = 0,
  onJumpToSection,
  reducedMotion = false,
}: SubjectWorldProps) {
  const world = useMemo(() => lessonWorldFor(subject, title, courseId), [subject, title, courseId]);
  const [found, setFound] = useState<number[]>([]);
  const [inspecting, setInspecting] = useState<number | null>(null);
  const [intro, setIntro] = useState(!reducedMotion);
  const count = sectionHeadings.length;

  useEffect(() => {
    if (!intro) return;
    const t = window.setTimeout(() => setIntro(false), 1100);
    return () => window.clearTimeout(t);
  }, [intro]);

  // The object tied to the section being read glows, so the world follows the lesson.
  const highlighted = count ? world.objects.findIndex((_, i) => sectionForObject(i, count) === activeSection) : -1;
  const discover = (i: number) => {
    setFound((items) => (items.includes(i) ? items : [...items, i]));
    setInspecting(i);
  };
  const obj = inspecting !== null ? world.objects[inspecting] : undefined;
  const objSection = inspecting !== null ? sectionForObject(inspecting, count) : 0;
  const complete = found.length === world.objects.length;

  return (
    <section
      data-testid="lesson-world"
      data-world={world.id}
      data-found={found.length}
      className="relative mb-5 h-[20rem] overflow-hidden border-4 border-secondary bg-sidebar shadow-[6px_6px_0_0_var(--block-edge-strong)] sm:h-[26rem]"
      aria-label={`${world.label} interactive 3D lesson world`}
    >
      <Canvas dpr={[1, 1.5]} shadows camera={{ position: [7, 6, 9], fov: 46 }} gl={{ antialias: false }}>
        <WorldScene world={world} found={found} highlighted={highlighted} onDiscover={discover} reducedMotion={reducedMotion} />
      </Canvas>

      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3">
        <div className="border-2 border-accent bg-sidebar/95 px-3 py-2 text-sidebar-foreground shadow-[3px_3px_0_0_var(--block-edge-strong)]">
          <p className="font-display text-[11px] uppercase text-accent">Immersion · {world.label}</p>
          <p className="mt-1 max-w-60 text-xs text-sidebar-foreground/80">{sectionHeading ?? world.prompt}</p>
        </div>
        <div className="flex items-center gap-1 border-2 border-accent bg-accent px-2 py-1 text-xs font-bold text-accent-foreground">
          {complete ? <Sparkles className="size-3.5" /> : <Eye className="size-3.5" />} {found.length}/{world.objects.length}
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-3">
        {obj ? (
          <div data-testid="world-fact" className="pointer-events-auto max-w-sm border-2 border-accent bg-card/95 px-3 py-2 text-card-foreground shadow-[3px_3px_0_0_var(--block-edge-strong)]">
            <p className="text-xs font-bold">{obj.label}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{obj.fact}</p>
            {onJumpToSection && count > 0 && (
              <button
                type="button"
                data-testid="world-jump"
                onClick={() => onJumpToSection(objSection)}
                className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-bold uppercase text-primary hover:underline"
              >
                <BookOpen className="size-3" /> Read: {sectionHeadings[objSection]}
              </button>
            )}
          </div>
        ) : (
          <p className="pointer-events-none border-2 border-border bg-card/95 px-2 py-1 text-xs font-semibold text-card-foreground">
            {world.prompt}
          </p>
        )}
        <div className="pointer-events-none hidden items-center gap-2 border-2 border-border bg-card/95 px-2 py-1 text-[11px] text-card-foreground sm:flex">
          <MousePointer2 className="size-3.5" /> inspect <Rotate3D className="size-3.5" /> drag to orbit
        </div>
      </div>

      {intro && (
        <div
          data-testid="world-intro"
          className="pointer-events-none absolute inset-0 grid place-items-center bg-sidebar text-sidebar-foreground animate-out fade-out duration-1000 fill-mode-forwards"
        >
          <div className="text-center">
            <p className="font-display text-sm uppercase text-accent">Entering</p>
            <p className="font-display text-3xl">{world.label}</p>
          </div>
        </div>
      )}
    </section>
  );
}
