import { createFileRoute } from "@tanstack/react-router";
import { CharacterCreator } from "@/components/campus/CharacterCreator";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({
    meta: [
      { title: "Create your student — Unify University" },
      {
        name: "description",
        content:
          "Set your child's name, age, interests and learning style, then design the pixel character who walks the Unify campus.",
      },
      { property: "og:title", content: "Create your student — Unify University" },
      {
        property: "og:description",
        content:
          "Name, age, interests, learning style and a custom pixel character for your Unify student.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: OnboardingPage,
});

function OnboardingPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="font-display text-3xl font-bold">Create your student</h1>
      <p className="mt-1 mb-6 text-sm text-muted-foreground">
        Tell us who is learning. Their character, mascot and recommended places on campus all
        follow from these answers — you can change them any time.
      </p>
      <CharacterCreator />
    </main>
  );
}
