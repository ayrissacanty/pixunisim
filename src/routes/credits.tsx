import { createFileRoute, Link } from "@tanstack/react-router";
import { ASSET_CREDITS } from "@/lib/campus/credits";

export const Route = createFileRoute("/credits")({
  head: () => ({
    meta: [
      { title: "Asset Credits — Unify University" },
      {
        name: "description",
        content:
          "Attributions for the third-party art packs used across the Unify University campus, including the Penzilla Design isometric collections.",
      },
      { property: "og:title", content: "Asset Credits — Unify University" },
      {
        property: "og:description",
        content:
          "Attributions for the third-party art packs used across the Unify University campus, including the Penzilla Design isometric collections.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CreditsPage,
});

const STATUS_LABEL: Record<string, string> = {
  licensed: "Licensed",
  "free-commercial": "Free for commercial use",
  unverified: "License unverified — reference only",
  original: "Original UNIFY art",
};

function CreditsPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12 text-foreground">
      <h1 className="font-display text-3xl">Asset Credits</h1>
      <p className="mt-3 text-sm opacity-80">
        Unify University's campus mixes original UNIFY art with licensed third-party packs. Every
        pack in use is listed below with its license terms; packs whose licenses are still being
        verified are kept out of the production renderer.
      </p>

      {/* Penzilla's license requires this exact line to be visible. */}
      <p className="mt-6 rounded-lg border-2 border-accent bg-accent/15 px-4 py-3 font-display text-lg">
        Graphics created by Penzilla Design.
      </p>

      <ul className="mt-8 space-y-6">
        {ASSET_CREDITS.map((credit) => (
          <li
            key={credit.creator}
            className="rounded-xl border-2 border-sidebar-border bg-card p-5 shadow-sm"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-display text-xl">{credit.creator}</h2>
              <span className="rounded-full border border-sidebar-border px-2.5 py-0.5 text-xs">
                {STATUS_LABEL[credit.status] ?? credit.status}
              </span>
            </div>
            <p className="mt-1 text-sm font-semibold">{credit.packs.join(" · ")}</p>
            {credit.requiredLine && credit.requiredLine !== "Graphics created by Penzilla Design." ? (
              <p className="mt-1 text-sm font-semibold">{credit.requiredLine}</p>
            ) : null}
            <p className="mt-2 text-sm opacity-80">{credit.usedFor}</p>
            <p className="mt-1 text-xs opacity-60">{credit.license}</p>
          </li>
        ))}
      </ul>

      <p className="mt-10 text-center text-xs opacity-60">
        <Link to="/" className="underline underline-offset-2">
          Back to Unify University
        </Link>
      </p>
    </main>
  );
}
