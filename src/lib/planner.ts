import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface LessonPlan {
  id: string;
  family_id: string;
  student_id: string;
  lesson_id: string;
  course_id: string;
  scheduled_at: string;
  note: string | null;
}

export interface FamilyMemberRow {
  id: string;
  display_name: string;
  family_role: string | null;
  family_id: string | null;
  login_email: string | null;
}

async function uid() {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

/** Everyone in the caller's household (RLS scopes to the family). */
export function useFamilyMembers() {
  return useQuery({
    queryKey: ["family-members"],
    queryFn: async (): Promise<{ me: FamilyMemberRow | null; members: FamilyMemberRow[] }> => {
      const id = await uid();
      if (!id) return { me: null, members: [] };
      const { data: meRow } = await supabase
        .from("profiles")
        .select("id, display_name, family_role, family_id, login_email")
        .eq("id", id)
        .maybeSingle();
      const me = (meRow as FamilyMemberRow | null) ?? null;
      if (!me?.family_id) return { me, members: me ? [me] : [] };
      const { data } = await supabase
        .from("profiles")
        .select("id, display_name, family_role, family_id, login_email")
        .eq("family_id", me.family_id)
        .order("display_name");
      return { me, members: (data ?? []) as FamilyMemberRow[] };
    },
  });
}

/** Signed-in student's upcoming scheduled lessons (soonest first). */
export function useMyPlans() {
  return useQuery({
    queryKey: ["lesson-plans", "mine"],
    queryFn: async (): Promise<LessonPlan[]> => {
      const id = await uid();
      if (!id) return [];
      const { data } = await supabase
        .from("lesson_plans")
        .select("*")
        .eq("student_id", id)
        .order("scheduled_at");
      return (data ?? []) as LessonPlan[];
    },
  });
}

/** Parent view: the whole family's schedule. */
export function useFamilyPlans() {
  return useQuery({
    queryKey: ["lesson-plans", "family"],
    queryFn: async (): Promise<LessonPlan[]> => {
      const { data } = await supabase.from("lesson_plans").select("*").order("scheduled_at");
      return (data ?? []) as LessonPlan[];
    },
  });
}

export function useAddPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: Omit<LessonPlan, "id">) => {
      const { error } = await supabase.from("lesson_plans").insert(p);
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["lesson-plans"] }),
  });
}

export function useRemovePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("lesson_plans").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["lesson-plans"] }),
  });
}

/** The next plan whose lesson isn't completed yet. */
export function nextPlan(plans: LessonPlan[] | undefined, completed: Set<string>) {
  return (plans ?? []).find((p) => !completed.has(p.lesson_id));
}

export function formatPlanTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
