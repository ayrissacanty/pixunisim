import { useEffect, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCampusStore } from "@/lib/campus/store";
import { useLessons, useProgress } from "@/lib/data";
import {
  allStepsDone,
  buildQuests,
  lessonItemId,
  questItemFor,
  TUTOR_ITEM,
  tutorItemId,
  type QuestDef,
  type QuestRecord,
} from "@/lib/campus/quests";

export interface InventoryItem {
  item_id: string;
  quantity: number;
  used_count: number;
  source: string;
  acquired_at: string;
}

async function currentUserId() {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

/* ---------------------------------- reads --------------------------------- */

/** Every quest the world offers, authored from the campus lesson index. */
export function useQuestCatalog(): QuestDef[] {
  const { data: lessons } = useLessons();
  return useMemo(() => (lessons?.length ? buildQuests(lessons) : []), [lessons]);
}

export function useQuestRecords() {
  return useQuery({
    queryKey: ["quests"],
    queryFn: async (): Promise<QuestRecord[]> => {
      const userId = await currentUserId();
      if (!userId) return [];
      const { data, error } = await supabase
        .from("student_quests")
        .select("quest_id, status, steps")
        .eq("user_id", userId);
      if (error || !data) return [];
      return data.map((r) => ({
        quest_id: r.quest_id as string,
        status: (r.status as QuestRecord["status"]) ?? "accepted",
        steps: (r.steps as Record<string, boolean>) ?? {},
      }));
    },
  });
}

export function useInventory() {
  return useQuery({
    queryKey: ["inventory"],
    queryFn: async (): Promise<InventoryItem[]> => {
      const userId = await currentUserId();
      if (!userId) return [];
      const { data, error } = await supabase
        .from("student_inventory")
        .select("item_id, quantity, used_count, source, acquired_at")
        .eq("user_id", userId)
        .order("acquired_at", { ascending: false });
      if (error || !data) return [];
      return data as InventoryItem[];
    },
  });
}

/* --------------------------------- writes --------------------------------- */

export function useAcceptQuest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (questId: string) => {
      const userId = await currentUserId();
      if (!userId) throw new Error("Sign in to accept quests");
      const { error } = await supabase
        .from("student_quests")
        .upsert(
          { user_id: userId, quest_id: questId, status: "accepted" },
          { onConflict: "user_id,quest_id", ignoreDuplicates: true },
        );
      if (error) throw error;
      return questId;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["quests"] }),
  });
}

export function useAbandonQuest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (questId: string) => {
      const userId = await currentUserId();
      if (!userId) return;
      await supabase
        .from("student_quests")
        .delete()
        .eq("user_id", userId)
        .eq("quest_id", questId);
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["quests"] }),
  });
}

/** Marks one step of an accepted quest, completing the quest on the last step. */
export function useMarkQuestStep() {
  const qc = useQueryClient();
  const catalog = useQuestCatalog();
  const logEvent = useCampusStore((s) => s.logEvent);

  return useMutation({
    mutationFn: async ({ questId, stepId }: { questId: string; stepId: string }) => {
      const userId = await currentUserId();
      if (!userId) return null;
      const { data: row } = await supabase
        .from("student_quests")
        .select("quest_id, status, steps")
        .eq("quest_id", questId)
        .maybeSingle();
      if (!row) return null; // not accepted yet — nothing to track

      const steps = { ...((row.steps as Record<string, boolean>) ?? {}), [stepId]: true };
      const quest = catalog.find((q) => q.id === questId);
      const finished = quest
        ? allStepsDone(quest, { quest_id: questId, status: "accepted", steps })
        : false;
      if ((row.steps as Record<string, boolean>)?.[stepId] && !finished) return null;

      const { error } = await supabase
        .from("student_quests")
        .update({
          steps,
          status: finished ? "completed" : "accepted",
          completed_at: finished ? new Date().toISOString() : null,
        })
        .eq("user_id", userId)
        .eq("quest_id", questId);
      if (error) throw error;

      if (finished && quest) {
        await grantItem(userId, quest.reward.itemId, "quest");
        logEvent("assessment", `Quest complete: ${quest.title}`);
      }
      return { questId, finished };
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["quests"] });
      void qc.invalidateQueries({ queryKey: ["inventory"] });
    },
  });
}

async function grantItem(userId: string, itemId: string, source: string) {
  const { data: existing } = await supabase
    .from("student_inventory")
    .select("quantity")
    .eq("item_id", itemId)
    .maybeSingle();
  if (existing) {
    await supabase
      .from("student_inventory")
      .update({ quantity: (existing.quantity as number) + 1 })
      .eq("user_id", userId)
      .eq("item_id", itemId);
    return;
  }
  await supabase
    .from("student_inventory")
    .insert({ user_id: userId, item_id: itemId, quantity: 1, source });
}

/** Adds an item to the backpack (lesson rewards, tutoring insights). */
export function useGrantItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ itemId, source }: { itemId: string; source: string }) => {
      const userId = await currentUserId();
      if (!userId) return;
      await grantItem(userId, itemId, source);
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["inventory"] }),
  });
}

/** Spends one copy of an item — used to satisfy a quest's delivery step. */
export function useUseItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (itemId: string) => {
      const userId = await currentUserId();
      if (!userId) return;
      const { data: row } = await supabase
        .from("student_inventory")
        .select("used_count")
        .eq("item_id", itemId)
        .maybeSingle();
      if (!row) return;
      await supabase
        .from("student_inventory")
        .update({ used_count: (row.used_count as number) + 1 })
        .eq("user_id", userId)
        .eq("item_id", itemId);
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["inventory"] }),
  });
}

/* --------------------------------- syncing -------------------------------- */

/**
 * Keeps quest progress honest: finishing a lesson, passing its check or
 * speaking with the quest giver ticks the matching step automatically.
 */
export function useQuestSync() {
  const catalog = useQuestCatalog();
  const { data: records } = useQuestRecords();
  const { data: progress } = useProgress();
  const mark = useMarkQuestStep();
  const grant = useGrantItem();
  const markMutate = mark.mutate;
  const grantMutate = grant.mutate;

  // Lesson + knowledge-check steps come from stored progress.
  useEffect(() => {
    if (!catalog.length || !records?.length || !progress?.length) return;
    for (const quest of catalog) {
      const record = records.find((r) => r.quest_id === quest.id);
      if (!record || record.status === "completed") continue;
      const row = progress.find((p) => p.lesson_id === quest.lessonId);
      if (!row) continue;
      if (!record.steps["lesson"] && (row.status === "completed" || row.sections_read > 0)) {
        markMutate({ questId: quest.id, stepId: "lesson" });
      }
      if (!record.steps["check"] && (row.score ?? 0) >= 70) {
        markMutate({ questId: quest.id, stepId: "check" });
        grantMutate({ itemId: lessonItemId(quest.lessonId), source: "lesson" });
      }
    }
  }, [catalog, records, progress, markMutate, grantMutate]);

  // Talking to the quest giver ticks the "talk" step.
  useEffect(() => {
    if (!catalog.length) return;
    return useCampusStore.subscribe((state, prev) => {
      const speaker = state.dialogue?.speakerId;
      if (!speaker || speaker === prev.dialogue?.speakerId) return;
      for (const quest of catalog) {
        if (quest.npcId !== speaker) continue;
        markMutate({ questId: quest.id, stepId: "talk" });
      }
    });
  }, [catalog, markMutate]);
}

/** Records a tutoring session as a collectable insight for the module hub. */
export function useRecordTutorSession() {
  const grant = useGrantItem();
  const mutate = grant.mutate;
  return useMemo(
    () => (lessonId: string) => mutate({ itemId: tutorItemId(lessonId), source: "tutor" }),
    [mutate],
  );
}

/* --------------------------------- helpers -------------------------------- */

export interface ResolvedItem {
  itemId: string;
  name: string;
  icon: string;
  quantity: number;
  available: number;
  source: string;
  lessonTitle?: string;
}

/** Turns stored inventory rows into display items using lesson metadata. */
export function resolveItems(
  rows: InventoryItem[] | undefined,
  lessons: { id: string; title: string; subject?: string | null }[] | undefined,
): ResolvedItem[] {
  return (rows ?? []).map((row) => {
    const lessonId = row.item_id.replace(/^(item|insight)-/, "");
    const lesson = lessons?.find((l) => l.id === lessonId);
    const tutor = row.item_id.startsWith("insight-");
    const meta = tutor ? TUTOR_ITEM : questItemFor(lesson?.subject ?? "");
    return {
      itemId: row.item_id,
      name: meta.name,
      icon: meta.icon,
      quantity: row.quantity,
      available: Math.max(0, row.quantity - row.used_count),
      source: row.source,
      ...(lesson ? { lessonTitle: lesson.title } : {}),
    };
  });
}
