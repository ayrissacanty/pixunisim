import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { FamilyNews } from "@/components/family/FamilyNews";
import { FamilyCode } from "@/components/family/FamilyCode";


export const Route = createFileRoute("/_authenticated/family")({
  head: () => ({
    meta: [
      { title: "Family News — Unify University" },
      {
        name: "description",
        content:
          "A daily briefing of your family's lessons, scores, streaks and campus objectives, read aloud by your mascot news anchor.",
      },
      { property: "og:title", content: "Family News — Unify University" },
      {
        property: "og:description",
        content:
          "A daily briefing of your family's lessons, scores, streaks and campus objectives.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: FamilyDashboard,
});

function FamilyDashboard() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Family dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Everything your household accomplished on campus, in one daily broadcast.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link to="/ledger">Parent ledger</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/workspace">Workspace</Link>
          </Button>
          <Button asChild>
            <Link to="/campus">Enter campus</Link>
          </Button>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        <FamilyCode />
        <FamilyNews />
      </div>

    </main>
  );
}
