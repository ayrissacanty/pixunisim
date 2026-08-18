import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  buildFamilyReport,
  type FamilyMember,
  type FamilyObjectiveRow,
  type FamilyProgressRow,
  type FamilyReport,
} from "@/lib/family/news";

/**
 * Family-scoped reads. RLS does the scoping: the "parent reads family
 * profiles / student progress / objectives" policies restrict every row to
 * the caller's own family via profiles.family_id, so the client can query
 * these tables directly with no extra filters.
 */
export function useFamilyReport() {
  return useQuery({
    queryKey: ["family-report"],
    staleTime: 60_000,
    queryFn: async (): Promise<FamilyReport> => {
      const [{ data: profiles }, { data: progress }, { data: objectives }, { data: lessons }] =
        await Promise.all([
          supabase
            .from("profiles")
            .select("id, display_name, mascot_color, mascot_accessory")
            .order("display_name", { ascending: true }),
          supabase
            .from("student_progress")
            .select("user_id, lesson_id, status, score, completed_at"),
          supabase
            .from("campus_objectives")
            .select("user_id, objective_key, completed, completed_at"),
          supabase.from("lessons").select("id, title"),
        ]);

      const lessonTitles: Record<string, string> = {};
      for (const l of (lessons ?? []) as { id: string; title: string }[]) {
        lessonTitles[l.id] = l.title;
      }

      return buildFamilyReport({
        members: (profiles ?? []) as FamilyMember[],
        progress: (progress ?? []) as FamilyProgressRow[],
        objectives: (objectives ?? []) as FamilyObjectiveRow[],
        lessonTitles,
      });
    },
  });
}
