import Dexie, { type Table } from "dexie";
import type { Course, Lesson, Question, Progress } from "@/lib/data";

export interface PendingProgress {
  key: string;
  payload: Progress & { user_id: string };
  queuedAt: number;
}

class UnifyDb extends Dexie {
  courses!: Table<Course, string>;
  lessons!: Table<Lesson, string>;
  questions!: Table<Question, string>;
  progress!: Table<Progress & { user_id: string }, string>;
  pending!: Table<PendingProgress, string>;

  constructor() {
    super("unify-university");
    this.version(1).stores({
      courses: "id, sort_order",
      lessons: "id, course_id, sort_order",
      questions: "id, lesson_id",
      progress: "lesson_id, user_id, course_id",
      pending: "key, queuedAt",
    });
  }
}

let instance: UnifyDb | null = null;

/** Dexie touches IndexedDB, so only create it in the browser. */
export function db(): UnifyDb | null {
  if (typeof window === "undefined") return null;
  if (!instance) instance = new UnifyDb();
  return instance;
}
