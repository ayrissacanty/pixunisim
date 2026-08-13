import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { CHARACTER_IDS, CHARACTERS, type CharacterId } from "@/lib/characters";
import { useAvatar, useSaveAvatar } from "@/lib/profile";
import { CharacterStage } from "@/components/three/CharacterStage";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/workspace/avatar")({
  head: () => ({
    meta: [
      { title: "Choose your character — Unify University" },
      {
        name: "description",
        content:
          "Pick the student character who represents you in Unify University classrooms and 3D lessons.",
      },
      { property: "og:title", content: "Choose your character — Unify University" },
      {
        property: "og:description",
        content: "Pick the student character who represents you across the campus and lessons.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AvatarPicker,
});

function AvatarPicker() {
  const saved = useAvatar();
  const [picked, setPicked] = useState<CharacterId | null>(null);
  const current = picked ?? saved;
  const save = useSaveAvatar();

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Choose your character</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            This is who sits in the classroom with Alley and appears in your 3D lessons.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link to="/workspace">Back to workspace</Link>
        </Button>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-[1fr_320px]">
        <CharacterStage
          actors={[{ character: current }]}
          height={360}
          background={0x2b2118}
          turntable
        />

        <div className="space-y-3">
          {CHARACTER_IDS.map((id) => {
            const def = CHARACTERS[id];
            const active = current === id;
            return (
              <button
                key={id}
                type="button"
                data-testid={`avatar-option-${id}`}
                data-active={active}
                onClick={() => setPicked(id)}
                className={`w-full rounded-md border p-3 text-left transition ${
                  active
                    ? "border-accent bg-accent/10"
                    : "border-border bg-card hover:border-accent/60"
                }`}
              >
                <p className="font-display text-sm font-semibold">{def.name}</p>
                <p className="text-xs text-muted-foreground">{def.blurb}</p>
              </button>
            );
          })}

          <Button
            className="w-full"
            disabled={save.isPending || current === saved}
            onClick={() => {
              save.mutate(current, {
                onSuccess: () => toast.success(`${CHARACTERS[current].name} is now your student.`),
                onError: () => toast.error("Could not save your character."),
              });
            }}
          >
            {current === saved ? "Saved" : "Use this character"}
          </Button>
        </div>
      </div>
    </main>
  );
}
