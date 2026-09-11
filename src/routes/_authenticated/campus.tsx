import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CampusView } from "@/components/campus/CampusView";
import { useProfile } from "@/lib/profile";

export const Route = createFileRoute("/_authenticated/campus")({
  validateSearch: (search: Record<string, unknown>): { tour?: string } =>
    typeof search["tour"] === "string" ? { tour: search["tour"] as string } : {},
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
  component: CampusRoute,
});

function CampusRoute() {
  const { tour } = Route.useSearch();
  const navigate = useNavigate();
  const { data: profile, isSuccess } = useProfile();

  // First visit: send families through the character creator once.
  useEffect(() => {
    if (isSuccess && profile && !profile.setup_complete) {
      void navigate({ to: "/onboarding" });
    }
  }, [isSuccess, profile, navigate]);

  return <CampusView initialZone="welcome-plaza" tour={tour} />;
}
