import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { CHARACTER_IDS, CHARACTERS, type CharacterId } from "@/lib/characters";
import {
  useAvatar,
  useMascot,
  usePortrait,
  useSaveAvatar,
  useSaveMascot,
  useSavePortrait,
} from "@/lib/profile";
import { MASCOT_ACCESSORIES, MASCOT_COLORS, type Mascot } from "@/lib/mascot";
import { MascotView } from "@/components/campus/MascotView";
import { CharacterStage } from "@/components/three/CharacterStage";
import { PortraitView } from "@/components/campus/PortraitView";
import {
  PORTRAIT_LAYERS,
  PORTRAIT_LAYER_ORDER,
  type Portrait,
  type PortraitLayer,
} from "@/lib/portrait";
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

      <MascotCustomizer />
      <PortraitCustomizer />
    </main>
  );
}

/**
 * Light personalization: one base colour + one accessory slot. Intentionally
 * small — not a full character creator.
 */
function MascotCustomizer() {
  const savedMascot = useMascot();
  const [draft, setDraft] = useState<Mascot | null>(null);
  const mascot = draft ?? savedMascot;
  const save = useSaveMascot();
  const dirty =
    mascot.color !== savedMascot.color || mascot.accessory !== savedMascot.accessory;

  return (
    <section className="mt-10 border-t border-border pt-8">
      <h2 className="text-2xl font-bold">Your mascot</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Pick a base colour and one accessory. Your colour also tints your student sprite out on
        campus. (Placeholder art — final mascot pieces drop in later.)
      </p>

      <div className="mt-6 grid gap-6 md:grid-cols-[220px_1fr]">
        <div className="flex items-center justify-center rounded-md border border-border bg-card p-4">
          <MascotView mascot={mascot} size={140} />
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-accent">
              Base colour
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {MASCOT_COLORS.map((c) => {
                const active = mascot.color === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    data-testid={`mascot-color-${c.id}`}
                    data-active={active}
                    aria-pressed={active}
                    title={c.label}
                    onClick={() => setDraft({ ...mascot, color: c.id })}
                    className={`flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs transition ${
                      active
                        ? "border-accent bg-accent/10 text-foreground"
                        : "border-border bg-card text-muted-foreground hover:border-accent/60"
                    }`}
                  >
                    <span
                      aria-hidden
                      className="size-4 rounded-full border border-border"
                      style={{ backgroundColor: c.css }}
                    />
                    {c.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-accent">
              Accessory
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {MASCOT_ACCESSORIES.map((a) => {
                const active = mascot.accessory === a.id;
                return (
                  <button
                    key={a.id}
                    type="button"
                    data-testid={`mascot-accessory-${a.id}`}
                    data-active={active}
                    aria-pressed={active}
                    onClick={() => setDraft({ ...mascot, accessory: a.id })}
                    className={`rounded-md border px-3 py-1.5 text-xs transition ${
                      active
                        ? "border-accent bg-accent/10 text-foreground"
                        : "border-border bg-card text-muted-foreground hover:border-accent/60"
                    }`}
                  >
                    {a.glyph ? `${a.glyph} ` : ""}
                    {a.label}
                  </button>
                );
              })}
            </div>
          </div>

          <Button
            data-testid="save-mascot"
            disabled={save.isPending || !dirty}
            onClick={() =>
              save.mutate(mascot, {
                onSuccess: () => toast.success("Mascot saved."),
                onError: () => toast.error("Could not save your mascot."),
              })
            }
          >
            {dirty ? "Save mascot" : "Saved"}
          </Button>
        </div>
      </div>
    </section>
  );
}


const LAYER_LABELS: Record<PortraitLayer, string> = {
  skin: "Skin",
  clothes: "Outfit",
  eyes: "Eyes",
  hair: "Hair",
};

/** 2D paper-doll portrait used by campus dialogue, alongside the 3D model. */
function PortraitCustomizer() {
  const savedPortrait = usePortrait();
  const [draft, setDraft] = useState<Portrait | null>(null);
  const portrait = draft ?? savedPortrait;
  const save = useSavePortrait();
  const dirty = PORTRAIT_LAYER_ORDER.some((l) => portrait[l] !== savedPortrait[l]);

  return (
    <section className="mt-10 border-t border-border pt-8">
      <h2 className="text-2xl font-bold">Your dialogue portrait</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        This 2D portrait appears when you speak with faculty and staff around campus.
      </p>

      <div className="mt-6 grid gap-6 md:grid-cols-[220px_1fr]">
        <div className="rounded-md border border-border bg-card p-3">
          <PortraitView portrait={portrait} />
        </div>

        <div className="space-y-4">
          {PORTRAIT_LAYER_ORDER.map((layer) => (
            <div key={layer}>
              <p className="text-xs font-semibold uppercase tracking-widest text-accent">
                {LAYER_LABELS[layer]}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {PORTRAIT_LAYERS[layer].map((option) => {
                  const active = portrait[layer] === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      data-testid={`portrait-${layer}-${option.id}`}
                      data-active={active}
                      onClick={() => setDraft({ ...portrait, [layer]: option.id })}
                      className={`rounded-md border px-3 py-1.5 text-xs transition ${
                        active
                          ? "border-accent bg-accent/10 text-foreground"
                          : "border-border bg-card text-muted-foreground hover:border-accent/60"
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          <Button
            data-testid="save-portrait"
            disabled={save.isPending || !dirty}
            onClick={() =>
              save.mutate(portrait, {
                onSuccess: () => toast.success("Portrait saved."),
                onError: () => toast.error("Could not save your portrait."),
              })
            }
          >
            {dirty ? "Save portrait" : "Saved"}
          </Button>
        </div>
      </div>
    </section>
  );
}
