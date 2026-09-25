import { useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Lightformer, OrbitControls, RoundedBox, Text } from "@react-three/drei";
import * as THREE from "three";
import { Eye, MousePointer2, Rotate3D } from "lucide-react";
import { lessonWorldFor, type LessonWorld } from "./subject-world";

interface SubjectWorldProps {
  subject?: string | null | undefined;
  title: string;
  sectionHeading?: string | undefined;
  reducedMotion?: boolean;
}

const COLORS = {
  ink: "#17151f",
  paper: "#fff4d6",
  coral: "#ff4d6d",
  violet: "#6c5ce7",
  green: "#6ab04c",
  yellow: "#f9ca24",
  sky: "#66c7f2",
  teal: "#27ae9b",
  wood: "#8b5a3c",
};

function Ground({ color }: { color: string }) {
  return (
    <mesh rotation-x={-Math.PI / 2} position={[0, -1.25, 0]} receiveShadow>
      <cylinderGeometry args={[4.6, 4.6, 0.45, 12]} />
      <meshStandardMaterial color={color} roughness={0.9} />
    </mesh>
  );
}

function DiscoveryObject({
  position,
  color,
  label,
  shape = "box",
  onDiscover,
}: {
  position: [number, number, number];
  color: string;
  label: string;
  shape?: "box" | "sphere" | "cone" | "torus";
  onDiscover: (label: string) => void;
}) {
  const ref = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  useFrame((_, rawDelta) => {
    if (!ref.current) return;
    const dt = Math.min(rawDelta, 0.05);
    ref.current.rotation.y += dt * (hovered ? 1.15 : 0.28);
    const target = hovered ? 1.12 : 1;
    ref.current.scale.lerp(new THREE.Vector3(target, target, target), 1 - Math.exp(-8 * dt));
  });
  return (
    <mesh
      ref={ref}
      position={position}
      castShadow
      onPointerEnter={(event) => {
        event.stopPropagation();
        setHovered(true);
      }}
      onPointerLeave={() => setHovered(false)}
      onClick={(event) => {
        event.stopPropagation();
        onDiscover(label);
      }}
    >
      {shape === "sphere" && <sphereGeometry args={[0.72, 24, 16]} />}
      {shape === "cone" && <coneGeometry args={[0.72, 1.5, 6]} />}
      {shape === "torus" && <torusGeometry args={[0.65, 0.2, 12, 28]} />}
      {shape === "box" && <boxGeometry args={[1.15, 1.15, 1.15]} />}
      <meshStandardMaterial color={color} roughness={0.4} metalness={shape === "sphere" ? 0.25 : 0.05} />
    </mesh>
  );
}

function MathWorld({ onDiscover }: { onDiscover: (label: string) => void }) {
  return (
    <group>
      <Ground color={COLORS.green} />
      <DiscoveryObject position={[-2.1, -0.25, 0]} color={COLORS.yellow} label="Golden sphere" shape="sphere" onDiscover={onDiscover} />
      <DiscoveryObject position={[0, -0.35, -0.5]} color={COLORS.coral} label="Fraction tower" onDiscover={onDiscover} />
      <DiscoveryObject position={[2.1, -0.15, 0]} color={COLORS.violet} label="Coordinate arch" shape="torus" onDiscover={onDiscover} />
      <gridHelper args={[10, 10, COLORS.paper, COLORS.teal]} position={[0, -1, 0]} />
    </group>
  );
}

function ScienceWorld({ onDiscover }: { onDiscover: (label: string) => void }) {
  const orbit = useRef<THREE.Group>(null);
  useFrame((_, rawDelta) => {
    if (orbit.current) orbit.current.rotation.y += Math.min(rawDelta, 0.05) * 0.45;
  });
  return (
    <group>
      <Ground color={COLORS.teal} />
      <group ref={orbit}>
        <DiscoveryObject position={[2.3, 0, 0]} color={COLORS.yellow} label="Orbiting electron" shape="sphere" onDiscover={onDiscover} />
      </group>
      <DiscoveryObject position={[-2, -0.35, 0.35]} color={COLORS.violet} label="Crystal sample" shape="cone" onDiscover={onDiscover} />
      <DiscoveryObject position={[0, 0, 0]} color={COLORS.coral} label="Energy core" shape="sphere" onDiscover={onDiscover} />
      <mesh rotation-x={Math.PI / 2}><torusGeometry args={[2.3, 0.035, 8, 48]} /><meshBasicMaterial color={COLORS.paper} /></mesh>
    </group>
  );
}

function LiteratureWorld({ onDiscover }: { onDiscover: (label: string) => void }) {
  return (
    <group>
      <Ground color={COLORS.violet} />
      <DiscoveryObject position={[-2, -0.25, 0]} color={COLORS.coral} label="Story arch" shape="torus" onDiscover={onDiscover} />
      <DiscoveryObject position={[0, -0.35, -0.4]} color={COLORS.paper} label="Character volume" onDiscover={onDiscover} />
      <DiscoveryObject position={[2, -0.3, 0.2]} color={COLORS.yellow} label="Plot lantern" shape="cone" onDiscover={onDiscover} />
      {[-1.2, -0.4, 0.4, 1.2].map((x, index) => (
        <RoundedBox key={x} args={[0.55, 1.8 + index * 0.16, 0.8]} radius={0.06} position={[x, -0.18, -2.1]} castShadow>
          <meshStandardMaterial color={index % 2 ? COLORS.teal : COLORS.coral} />
        </RoundedBox>
      ))}
    </group>
  );
}

function WritingWorld({ onDiscover }: { onDiscover: (label: string) => void }) {
  return (
    <group>
      <Ground color={COLORS.coral} />
      <DiscoveryObject position={[-2, -0.3, 0]} color={COLORS.yellow} label="Opening idea" shape="sphere" onDiscover={onDiscover} />
      <DiscoveryObject position={[0, -0.3, -0.4]} color={COLORS.sky} label="Strong detail" onDiscover={onDiscover} />
      <DiscoveryObject position={[2, -0.3, 0]} color={COLORS.green} label="Closing thought" shape="cone" onDiscover={onDiscover} />
      <Text position={[0, 1.75, -1.2]} fontSize={0.62} color={COLORS.paper} anchorX="center" anchorY="middle">
        IDEA → DETAIL → END
      </Text>
    </group>
  );
}

function WorldScene({ world, onDiscover, reducedMotion }: { world: LessonWorld; onDiscover: (label: string) => void; reducedMotion: boolean }) {
  return (
    <>
      <color attach="background" args={[COLORS.ink]} />
      <fog attach="fog" args={[COLORS.ink, 11, 21]} />
      <hemisphereLight intensity={1.05} color={COLORS.paper} groundColor={COLORS.ink} />
      <directionalLight position={[5, 9, 5]} intensity={2.2} castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
      {world === "mathematics" && <MathWorld onDiscover={onDiscover} />}
      {world === "science" && <ScienceWorld onDiscover={onDiscover} />}
      {world === "literature" && <LiteratureWorld onDiscover={onDiscover} />}
      {world === "writing" && <WritingWorld onDiscover={onDiscover} />}
      <Environment>
        <Lightformer intensity={2} color={COLORS.paper} position={[0, 6, 0]} scale={[10, 10, 1]} />
        <Lightformer intensity={1.2} color={COLORS.sky} position={[-6, 1, -2]} rotation-y={Math.PI / 2} scale={[12, 2, 1]} />
      </Environment>
      <OrbitControls enablePan={false} enableDamping={!reducedMotion} minDistance={7} maxDistance={12} minPolarAngle={0.6} maxPolarAngle={1.35} />
    </>
  );
}

export function SubjectWorld({ subject, title, sectionHeading, reducedMotion = false }: SubjectWorldProps) {
  const world = useMemo(() => lessonWorldFor(subject, title), [subject, title]);
  const [found, setFound] = useState<string[]>([]);
  const discover = (label: string) => setFound((items) => (items.includes(label) ? items : [...items, label]));
  const current = found.at(-1);

  return (
    <section className="relative mb-5 h-[19rem] overflow-hidden border-4 border-secondary bg-sidebar shadow-[6px_6px_0_0_var(--block-edge-strong)] sm:h-[24rem]" aria-label={`${world.label} interactive 3D lesson world`}>
      <Canvas dpr={[1, 1.5]} shadows camera={{ position: [7.5, 6.5, 9.5], fov: 46 }} gl={{ antialias: false }}>
        <WorldScene world={world.id} onDiscover={discover} reducedMotion={reducedMotion} />
      </Canvas>
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3">
        <div className="border-2 border-accent bg-sidebar/95 px-3 py-2 text-sidebar-foreground shadow-[3px_3px_0_0_var(--block-edge-strong)]">
          <p className="font-display text-[9px] uppercase text-accent">Immersion · {world.label}</p>
          <p className="mt-1 max-w-56 text-xs text-sidebar-foreground/80">{sectionHeading ?? world.prompt}</p>
        </div>
        <div className="flex items-center gap-1 border-2 border-accent bg-accent px-2 py-1 text-xs font-bold text-accent-foreground">
          <Eye className="size-3.5" /> {found.length}/{world.discoveryLabels.length}
        </div>
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-3">
        <p className="border-2 border-border bg-card/95 px-2 py-1 text-xs font-semibold text-card-foreground">
          {current ? `Discovered: ${current}` : "Tap a lesson object to inspect it"}
        </p>
        <div className="hidden items-center gap-2 border-2 border-border bg-card/95 px-2 py-1 text-[11px] text-card-foreground sm:flex">
          <MousePointer2 className="size-3.5" /> inspect <Rotate3D className="size-3.5" /> drag to orbit
        </div>
      </div>
    </section>
  );
}
