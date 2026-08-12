import { createFileRoute } from "@tanstack/react-router";
import { CampusView } from "@/components/campus/CampusView";

export const Route = createFileRoute("/_authenticated/campus")({
  head: () => ({
    meta: [
      { title: "Campus World — Unify University" },
      {
        name: "description",
        content: "Explore the pixel-art Unify University campus, meet faculty, and attend class.",
      },
      { property: "og:title", content: "Campus World — Unify University" },
      {
        property: "og:description",
        content: "Explore the pixel-art Unify University campus, meet faculty, and attend class.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <CampusView initialZone="welcome-plaza" />,
});
