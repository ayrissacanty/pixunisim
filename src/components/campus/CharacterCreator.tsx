import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CampusCharacterPreview } from "@/components/campus/CampusCharacterPreview";
import {
  APPEARANCE_SWATCHES,
  DEFAULT_APPEARANCE,
  HAIR_STYLE_LABELS,
  APPEARANCE_STYLES,
  type Appearance,
} from "@/lib/campus/appearance";
import { DEFAULT_MASCOT, MASCOT_ACCESSORIES, MASCOT_COLORS, type Mascot } from "@/lib/mascot";
import { useProfile, useSaveChildSetup } from "@/lib/profile";
import { ZONE_GUIDES, recommendedZones } from "@/lib/campus/zone-guide";
import type { HairStyle } from "@/lib/campus/charart";

export const INTERESTS: { id: string; label: string }[] = [
  { id: "numbers", label: "Numbers & puzzles" },
  { id: "stories", label: "Stories & books" },
  { id: "animals", label: "Animals & plants" },
  { id: "space", label: "Space & nature" },
  { id: "art", label: "Art & music" },
  { id: "building", label: "Building & tinkering" },
  { id: "history", label: "History" },
  { id: "people", label: "People & teamwork" },
];

export const LEARNING_STYLES: { id: string; label: string; blurb: string }[] = [
  { id: "visual", label: "Visual", blurb: "Diagrams, colour, and worked examples." },
  { id: "hands_on", label: "Hands-on", blurb: "Try it first, explain it after." },
  { id: "story", label: "Story-led", blurb: "New ideas arrive inside a narrative." },
  { id: "discussion", label: "Discussion", blurb: "Talk it through with questions." },
];

const GRADE_BANDS = ["K-2", "3-5", "6-8", "9-12"];

/**
 * Parent-run character creator: name, age, interests, learning style and the
 * exact pixel character that then walks the campus.
 */
export function CharacterCreator() {
  const navigate = useNavigate();
  const { data: profile } = useProfile();
  const save = useSaveChildSetup();

  const [name, setName] = useState(profile?.display_name ?? "");
  const [age, setAge] = useState(profile?.age ? String(profile.age) : "");
  const [gradeBand, setGradeBand] = useState(profile?.grade_band ?? "6-8");
  const [interests, setInterests] = useState<string[]>(profile?.interests ?? []);
  const [style, setStyle] = useState(profile?.learning_style ?? "visual");
  const [appearance, setAppearance] = useState<Appearance>(
    profile?.appearance ?? DEFAULT_APPEARANCE,
  );
  const [mascot, setMascot] = useState<Mascot>(profile?.mascot ?? DEFAULT_MASCOT);

  const suggestions = recommendedZones(interests).slice(0, 3);

  function toggleInterest(id: string) {
    setInterests((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  }

  function swatchRow(key: keyof typeof APPEARANCE_SWATCHES) {
    const swatches = APPEARANCE_SWATCHES[key] as readonly string[];
    return (
      <div className="flex flex-wrap gap-1.5">
        {swatches.map((color, index) => (
          <button
            key={`${key}-${index}`}
            type="button"
            aria-label={`${key} option ${index + 1}`}
            onClick={() => setAppearance((prev) => ({ ...prev, [key]: index }))}
            className={`size-7 rounded-md border-2 ${
              appearance[key] === index ? "border-accent" : "border-border"
            }`}
            style={{ background: color }}
          />
        ))}
      </div>
    );
  }

  return (
    <form
      data-testid="character-creator"
      className="grid gap-6 lg:grid-cols-[1fr_320px]"
      onSubmit={(event) => {
        event.preventDefault();
        if (!name.trim()) return;
        save.mutate(
          {
            display_name: name.trim(),
            age: age ? Number(age) : null,
            grade_band: gradeBand,
            interests,
            learning_style: style,
            appearance,
            mascot,
          },
          { onSuccess: () => void navigate({ to: "/campus" }) },
        );
      }}
    >
      <div className="grid gap-6">
        <section className="grid gap-3 rounded-xl border-2 border-border bg-card p-4">
          <h2 className="font-display text-lg font-bold">Who is joining campus?</h2>
          <div className="grid gap-3 sm:grid-cols-[1fr_110px]">
            <div className="grid gap-1.5">
              <Label htmlFor="child-name">Child's name</Label>
              <Input
                id="child-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Rosa"
                required
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="child-age">Age</Label>
              <Input
                id="child-age"
                type="number"
                min={4}
                max={19}
                value={age}
                onChange={(e) => setAge(e.target.value)}
              />
            </div>
          </div>
          <div className="grid gap-1.5">
            <span className="text-sm font-medium">Grade band</span>
            <div className="flex flex-wrap gap-2">
              {GRADE_BANDS.map((band) => (
                <button
                  key={band}
                  type="button"
                  onClick={() => setGradeBand(band)}
                  className={`rounded-lg border-2 px-3 py-1.5 text-sm font-semibold ${
                    gradeBand === band ? "border-accent bg-accent/10" : "border-border"
                  }`}
                >
                  {band}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-3 rounded-xl border-2 border-border bg-card p-4">
          <h2 className="font-display text-lg font-bold">What do they love?</h2>
          <div className="flex flex-wrap gap-2">
            {INTERESTS.map((interest) => (
              <button
                key={interest.id}
                type="button"
                aria-pressed={interests.includes(interest.id)}
                onClick={() => toggleInterest(interest.id)}
                className={`rounded-full border-2 px-3 py-1.5 text-sm ${
                  interests.includes(interest.id)
                    ? "border-accent bg-accent/10 font-semibold"
                    : "border-border"
                }`}
              >
                {interest.label}
              </button>
            ))}
          </div>
          {suggestions.length > 0 && (
            <p className="text-xs text-muted-foreground">
              We'll point them toward{" "}
              {suggestions.map((id) => ZONE_GUIDES[id]?.tagline ?? id).join(" · ")}
            </p>
          )}
        </section>

        <section className="grid gap-3 rounded-xl border-2 border-border bg-card p-4">
          <h2 className="font-display text-lg font-bold">How do they learn best?</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {LEARNING_STYLES.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setStyle(option.id)}
                className={`rounded-lg border-2 p-3 text-left ${
                  style === option.id ? "border-accent bg-accent/10" : "border-border"
                }`}
              >
                <span className="block font-semibold">{option.label}</span>
                <span className="block text-xs text-muted-foreground">{option.blurb}</span>
              </button>
            ))}
          </div>
        </section>
      </div>

      <aside className="grid content-start gap-4 rounded-xl border-2 border-border bg-card p-4">
        <h2 className="font-display text-lg font-bold">Their campus character</h2>
        <div className="flex justify-center rounded-lg border-2 border-border bg-muted p-3">
          <CampusCharacterPreview appearance={appearance} size={140} />
        </div>
        <div className="grid gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide">Skin</span>
          {swatchRow("skin")}
          <span className="text-xs font-semibold uppercase tracking-wide">Hair</span>
          {swatchRow("hair")}
          <div className="flex flex-wrap gap-1.5">
            {APPEARANCE_STYLES.map((hairStyle) => (
              <button
                key={hairStyle}
                type="button"
                onClick={() =>
                  setAppearance((prev) => ({ ...prev, hairStyle: hairStyle as HairStyle }))
                }
                className={`rounded-md border-2 px-2 py-1 text-xs ${
                  appearance.hairStyle === hairStyle ? "border-accent" : "border-border"
                }`}
              >
                {HAIR_STYLE_LABELS[hairStyle as HairStyle]}
              </button>
            ))}
          </div>
          <span className="text-xs font-semibold uppercase tracking-wide">Shirt</span>
          {swatchRow("shirt")}
          <span className="text-xs font-semibold uppercase tracking-wide">Trousers</span>
          {swatchRow("pants")}
        </div>
        <div className="grid gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide">Mascot</span>
          <div className="flex flex-wrap gap-1.5">
            {MASCOT_COLORS.map((color) => (
              <button
                key={color.id}
                type="button"
                aria-label={color.label}
                onClick={() => setMascot((prev) => ({ ...prev, color: color.id }))}
                className={`size-7 rounded-full border-2 ${
                  mascot.color === color.id ? "border-accent" : "border-border"
                }`}
                style={{ background: color.hex }}
              />
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {MASCOT_ACCESSORIES.map((accessory) => (
              <button
                key={accessory.id}
                type="button"
                onClick={() => setMascot((prev) => ({ ...prev, accessory: accessory.id }))}
                className={`rounded-md border-2 px-2 py-1 text-xs ${
                  mascot.accessory === accessory.id ? "border-accent" : "border-border"
                }`}
              >
                {accessory.label}
              </button>
            ))}
          </div>
        </div>
        <Button type="submit" disabled={save.isPending || !name.trim()}>
          {save.isPending ? "Saving…" : "Enter the campus"}
        </Button>
        {save.isError && (
          <p className="text-xs text-destructive">
            We couldn't save that. Please check the connection and try again.
          </p>
        )}
      </aside>
    </form>
  );
}
