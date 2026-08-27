import { createFileRoute } from "@tanstack/react-router";
import { CampusView } from "@/components/campus/CampusView";

/**
 * Public rendering-preview of the isometric campus. It skips the
 * authenticated shell entirely so the world (and its debug tools) can be
 * inspected without signing in. No student progress is read or written here.
 */
export const Route = createFileRoute("/campus-preview")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>): { zone?: string } =>
    typeof search["zone"] === "string" ? { zone: search["zone"] as string } : {},
  head: () => ({
    meta: [
      { title: "Campus Preview — Unify University" },
      {
        name: "description",
        content:
          "Inspect the isometric Unify University campus rendering, tile grid, depth layers and camera controls without signing in.",
      },
      { property: "og:title", content: "Campus Preview — Unify University" },
      {
        property: "og:description",
        content:
          "Inspect the isometric Unify University campus rendering, tile grid, depth layers and camera controls without signing in.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CampusPreviewRoute,
});

function CampusPreviewRoute() {
  const { zone } = Route.useSearch();
  return <CampusView initialZone={zone ?? "welcome-plaza"} preview />;
}
