import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { db } from "@/lib/offline/db";

export interface LessonSection {
  heading: string;
  type: "concept" | "example" | "activity";
  body: string;
}

export interface Course {
  id: string;
  title: string;
  subject: string;
  description: string;
  sort_order: number;
}

export interface Lesson {
  id: string;
  course_id: string;
  title: string;
  summary: string;
  sort_order: number;
  sections: LessonSection[];
}

export interface Question {
  id: string;
  lesson_id: string;
  kind: "practice" | "check";
  prompt: string;
  choices: string[];
  answer: string;
  explanation: string;
  sort_order: number;
}

export interface Progress {
  lesson_id: string;
  course_id: string;
  status: "in_progress" | "completed";
  score: number | null;
  sections_read: number;
}

/* --------------------------------- reads ---------------------------------- */

export function useCourses() {
  return useQuery({
    queryKey: ["courses"],
    queryFn: async (): Promise<Course[]> => {
      const local = db();
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error || !data) {
        const cached = await local?.courses.orderBy("sort_order").toArray();
        if (cached?.length) return cached;
        throw error ?? new Error("Courses unavailable");
      }
      await local?.courses.bulkPut(data as Course[]);
      return data as Course[];
    },
  });
}

export function useLessons(courseId?: string) {
  return useQuery({
    queryKey: ["lessons", courseId ?? "all"],
    queryFn: async (): Promise<Lesson[]> => {
      const local = db();
      let q = supabase.from("lessons").select("*").order("sort_order", { ascending: true });
      if (courseId) q = q.eq("course_id", courseId);
      const { data, error } = await q;
      if (error || !data) {
        const cached = courseId
          ? await local?.lessons.where("course_id").equals(courseId).toArray()
          : await local?.lessons.toArray();
        if (cached?.length) return cached.sort((a, b) => a.sort_order - b.sort_order);
        throw error ?? new Error("Lessons unavailable");
      }
      const lessons = data as unknown as Lesson[];
      await local?.lessons.bulkPut(lessons);
      return lessons;
    },
  });
}

export function useLesson(lessonId?: string) {
  return useQuery({
    enabled: !!lessonId,
    queryKey: ["lesson", lessonId],
    queryFn: async (): Promise<Lesson> => {
      const local = db();
      const { data, error } = await supabase
        .from("lessons")
        .select("*")
        .eq("id", lessonId!)
        .maybeSingle();
      if (error || !data) {
        const cached = await local?.lessons.get(lessonId!);
        if (cached) return cached;
        throw error ?? new Error("Lesson not found");
      }
      const lesson = data as unknown as Lesson;
      await local?.lessons.put(lesson);
      return lesson;
    },
  });
}

export function useQuestions(lessonId?: string) {
  return useQuery({
    enabled: !!lessonId,
    queryKey: ["questions", lessonId],
    queryFn: async (): Promise<Question[]> => {
      const local = db();
      const { data, error } = await supabase
        .from("questions")
        .select("*")
        .eq("lesson_id", lessonId!)
        .order("sort_order", { ascending: true });
      if (error || !data) {
        const cached = await local?.questions.where("lesson_id").equals(lessonId!).toArray();
        if (cached?.length) return cached.sort((a, b) => a.sort_order - b.sort_order);
        throw error ?? new Error("Questions unavailable");
      }
      const questions = data as unknown as Question[];
      await local?.questions.bulkPut(questions);
      return questions;
    },
  });
}

export function useProgress() {
  return useQuery({
    queryKey: ["progress"],
    queryFn: async (): Promise<Progress[]> => {
      const local = db();
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id;
      if (!userId) return [];
      const { data, error } = await supabase
        .from("student_progress")
        .select("lesson_id, course_id, status, score, sections_read");
      if (error || !data) {
        const cached = await local?.progress.where("user_id").equals(userId).toArray();
        return (cached ?? []) as Progress[];
      }
      const rows = data as Progress[];
      await local?.progress.bulkPut(rows.map((r) => ({ ...r, user_id: userId })));
      return rows;
    },
  });
}

/* --------------------------------- writes --------------------------------- */

export function useSaveProgress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Progress) => {
      const local = db();
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id;
      if (!userId) throw new Error("Sign in to save progress");

      const cached = await local?.progress.get(input.lesson_id);
      const merged = mergeProgress(input, cached ?? null);
      const row = { ...merged, user_id: userId };
      await local?.progress.put(row);

      const { data: remote } = await supabase
        .from("student_progress")
        .select("lesson_id, course_id, status, score, sections_read")
        .eq("lesson_id", input.lesson_id)
        .maybeSingle();

      const resolved = { ...mergeProgress(merged, (remote as Progress | null) ?? null), user_id: userId };
      await local?.progress.put(resolved);

      const { error } = await supabase
        .from("student_progress")
        .upsert(
          { ...resolved, updated_at: new Date().toISOString() },
          { onConflict: "user_id,lesson_id" },
        );
      if (error) {
        await local?.pending.put({
          key: input.lesson_id,
          payload: resolved,
          queuedAt: Date.now(),
        });
      }
      return resolved;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["progress"] });
    },
  });
}

/** Flushes locally recorded progress to the cloud once the connection returns. */
export function useOfflineSync() {
  const qc = useQueryClient();
  useEffect(() => {
    const flush = async () => {
      const local = db();
      if (!local) return;
      const queued = await local.pending.toArray();
      if (!queued.length) return;
      let synced = false;
      for (const item of queued) {
        const { data: remote, error: readError } = await supabase
          .from("student_progress")
          .select("lesson_id, course_id, status, score, sections_read")
          .eq("lesson_id", item.payload.lesson_id)
          .maybeSingle();
        if (readError) continue;
        const resolved = {
          ...mergeProgress(item.payload, (remote as Progress | null) ?? null),
          user_id: item.payload.user_id,
        };
        const { error } = await supabase
          .from("student_progress")
          .upsert(
            { ...resolved, updated_at: new Date().toISOString() },
            { onConflict: "user_id,lesson_id" },
          );
        if (!error) {
          await local.progress.put(resolved);
          await local.pending.delete(item.key);
          synced = true;
        }
      }
      if (synced) void qc.invalidateQueries({ queryKey: ["progress"] });
    };
    void flush();
    window.addEventListener("online", flush);
    return () => window.removeEventListener("online", flush);
  }, [qc]);
}


/* --------------------------------- campus --------------------------------- */

export interface CampusRoom {
  id: string;
  building_id: string;
  name: string;
  kind: string;
  course_id: string | null;
  lesson_id: string | null;
}

export function useCampusRooms() {
  return useQuery({
    queryKey: ["campus-rooms"],
    queryFn: async (): Promise<CampusRoom[]> => {
      const { data, error } = await supabase.from("campus_rooms").select("*");
      if (error) throw error;
      return (data ?? []) as CampusRoom[];
    },
    staleTime: 5 * 60_000,
  });
}

export function progressFor(list: Progress[] | undefined, lessonId: string) {
  return list?.find((p) => p.lesson_id === lessonId);
}
