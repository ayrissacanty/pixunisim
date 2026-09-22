import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCampusStore } from "@/lib/campus/store";
import { useProgress } from "@/lib/data";

/* ------------------------------ level curve ------------------------------- */

/** Total XP needed to reach a level. Level 1 starts at 0, then +100 per step. */
export function xpForLevel(level: number): number {
  const n = Math.max(1, Math.floor(level));
  return (100 * (n - 1) * n) / 2;
}

export function levelForXp(xp: number): number {
  let level = 1;
  while (xpForLevel(level + 1) <= Math.max(0, xp)) level += 1;
  return level;
}

/** Progress through the current level, 0..1, for the HUD bar. */
export function levelProgress(xp: number): { level: number; into: number; span: number } {
  const level = levelForXp(xp);
  const floor = xpForLevel(level);
  const next = xpForLevel(level + 1);
  return { level, into: Math.max(0, xp - floor), span: Math.max(1, next - floor) };
}

export type AwardKind = "lesson" | "mastery" | "quest" | "discovery";

/** Rewards are tied to real accomplishments — never to time spent. */
export const AWARD_VALUES: Record<AwardKind, { xp: number; coins: number }> = {
  lesson: { xp: 40, coins: 5 },
  mastery: { xp: 80, coins: 15 },
  quest: { xp: 120, coins: 25 },
  discovery: { xp: 15, coins: 2 },
};

export interface Progression {
  xp: number;
  level: number;
  coins: number;
}

export interface AwardRow {
  kind: string;
  label: string;
  xp: number;
  coins: number;
  source_id: string | null;
  created_at: string;
}

async function currentUserId() {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

/* --------------------------------- reads ---------------------------------- */

export function useProgression() {
  return useQuery({
    queryKey: ["progression"],
    queryFn: async (): Promise<Progression> => {
      const userId = await currentUserId();
      if (!userId) return { xp: 0, level: 1, coins: 0 };
      const { data } = await supabase
        .from("student_progression")
        .select("xp, level, coins")
        .eq("user_id", userId)
        .maybeSingle();
      return {
        xp: data?.xp ?? 0,
        level: data?.level ?? 1,
        coins: data?.coins ?? 0,
      };
    },
  });
}

export function useAwards(limit = 20) {
  return useQuery({
    queryKey: ["awards", limit],
    queryFn: async (): Promise<AwardRow[]> => {
      const userId = await currentUserId();
      if (!userId) return [];
      const { data } = await supabase
        .from("student_awards")
        .select("kind, label, xp, coins, source_id, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(limit);
      return (data ?? []) as AwardRow[];
    },
  });
}

/* --------------------------------- writes --------------------------------- */

/**
 * Records one award exactly once per (kind, source) and rolls the XP and coins
 * into the student's progression row. Returns null when it was already earned.
 */
async function awardOnce(input: {
  userId: string;
  kind: AwardKind;
  sourceId: string;
  label: string;
}) {
  const { xp, coins } = AWARD_VALUES[input.kind];
  const { data: existing } = await supabase
    .from("student_awards")
    .select("id")
    .eq("user_id", input.userId)
    .eq("kind", input.kind)
    .eq("source_id", input.sourceId)
    .maybeSingle();
  if (existing) return null;

  const { error } = await supabase.from("student_awards").insert({
    user_id: input.userId,
    kind: input.kind,
    source_id: input.sourceId,
    label: input.label,
    xp,
    coins,
  });
  if (error) return null;

  const { data: row } = await supabase
    .from("student_progression")
    .select("xp, coins")
    .eq("user_id", input.userId)
    .maybeSingle();
  const nextXp = (row?.xp ?? 0) + xp;
  const nextCoins = (row?.coins ?? 0) + coins;
  await supabase.from("student_progression").upsert(
    {
      user_id: input.userId,
      xp: nextXp,
      level: levelForXp(nextXp),
      coins: nextCoins,
    },
    { onConflict: "user_id" },
  );
  return { xp, coins, level: levelForXp(nextXp), leveled: levelForXp(nextXp) > levelForXp(nextXp - xp) };
}

export function useAward() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { kind: AwardKind; sourceId: string; label: string }) => {
      const userId = await currentUserId();
      if (!userId) return null;
      return awardOnce({ userId, ...input });
    },
    onSuccess: (result, variables) => {
      if (!result) return;
      toast.success(`${variables.label} · +${result.xp} XP, +${result.coins} coins`, {
        description: result.leveled ? `You reached level ${result.level}!` : undefined,
      });
      void qc.invalidateQueries({ queryKey: ["progression"] });
      void qc.invalidateQueries({ queryKey: ["awards"] });
    },
  });
}

/**
 * Watches real accomplishments and pays them out once: discovering a new place
 * on campus. Lesson, mastery and quest awards are granted where those events
 * are already handled, in `src/lib/quests.ts`.
 */
export function useProgressionSync() {
  const award = useAward();
  const mutate = award.mutate;
  const { data: progress } = useProgress();

  // Finished lessons and passed mastery checks pay out once each.
  useEffect(() => {
    for (const row of progress ?? []) {
      if (row.status === "completed") {
        mutate({ kind: "lesson", sourceId: row.lesson_id, label: "Lesson complete" });
      }
      if ((row.score ?? 0) >= 70) {
        mutate({ kind: "mastery", sourceId: row.lesson_id, label: "Mastery check passed" });
      }
    }
  }, [progress, mutate]);

  useEffect(() => {
    return useCampusStore.subscribe((state, prev) => {
      if (state.discovered.length <= prev.discovered.length) return;
      const found = state.discovered[state.discovered.length - 1];
      if (!found) return;
      mutate({ kind: "discovery", sourceId: found, label: "New place discovered" });
    });
  }, [mutate]);
}
