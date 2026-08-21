import { createFileRoute } from "@tanstack/react-router";
import { CharacterStage } from "@/components/three/CharacterStage";
import {
  CLASSROOM_PROPS,
  COMPUTER_LAB_PROPS,
  CAFETERIA_PROPS,
  DORM_PROPS,
} from "@/lib/props3d";
import { useDebugMode } from "@/lib/debug";
import { PROP_MODELS, type PropId } from "@/lib/props3d";

export const Route = createFileRoute("/dev/rooms")({
  component: RoomPreview,
  head: () => ({
    meta: [
      { title: "Room set preview — Unify University" },
      {
        name: "description",
        content: "Developer preview of the 3D furnishing sets used inside Unify University classrooms.",
      },
      { property: "og:title", content: "Room set preview — Unify University" },
      {
        property: "og:description",
        content: "Developer preview of the 3D furnishing sets used inside Unify University classrooms.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const SETS = [
  { id: "classroom", label: "Classroom", props: CLASSROOM_PROPS },
  { id: "computer-lab", label: "Computer lab", props: COMPUTER_LAB_PROPS },
  { id: "cafeteria", label: "Dining hall", props: CAFETERIA_PROPS },
  { id: "dorm", label: "Student room", props: DORM_PROPS },
];

/** Dev-only visual check for the 3D furnishing sets. */
function RoomPreview() {
  const debug = useDebugMode();
  if (!debug) {
    return (
      <main className="p-8 font-display text-sm text-muted-foreground">
        Not available.
      </main>
    );
  }
  const single = (Object.keys(PROP_MODELS) as PropId[]).filter((k) =>
    /^(cls|pc|caf)/.test(k),
  );
  return (
    <main className="space-y-6 p-6">
      <div className="grid grid-cols-4 gap-2" data-testid="single-props">
        {single.map((id) => (
          <div key={id}>
            <p className="text-[10px] uppercase text-muted-foreground">{id}</p>
            <CharacterStage
              actors={[]}
              props={[{ model: id, x: 0, z: 0, targetHeight: 1 }]}
              camera={{ y: 1.1, z: 2.4, lookY: 0.5, fov: 45 }}
              background={0x8a6a45}
              floorColor={0x6b4a2f}
              height={150}
            />
          </div>
        ))}
      </div>
      {SETS.map((set) => (
        <section key={set.id} data-testid={`room-set-${set.id}`}>
          <h2 className="mb-2 font-display text-sm uppercase tracking-wide text-accent">
            {set.label}
          </h2>
          <CharacterStage
            actors={[]}
            props={set.props}
            camera={{ y: 2.4, z: 7.2, lookY: 1, fov: 44 }}
            floorColor={0x8a6a45}
            background={0x8a6a45}
            height={420}
          />
        </section>
      ))}
    </main>
  );
}
