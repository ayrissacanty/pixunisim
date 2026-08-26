import { useEffect } from "react";
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { hydrateCampus, startCampusPersistence } from "@/lib/campus/store";
import { useCampusObjectives } from "@/lib/campus/objectives";
import { useOfflineSync } from "@/lib/data";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthenticatedShell,
});

/**
 * Shared shell for every signed-in view. Objectives, offline progress sync and
 * exploration persistence run here — not only inside the campus — so a lesson
 * finished in the Traditional Workspace updates the same objective, tracker
 * feed and progress rows the 2D campus reads.
 */
function AuthenticatedShell() {
  useEffect(() => {
    hydrateCampus();
    return startCampusPersistence();
  }, []);
  useCampusObjectives();
  useOfflineSync();
  return <Outlet />;
}
