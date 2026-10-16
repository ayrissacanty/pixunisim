/** The lesson band comes only from the grade a parent or the account holder saved.
 *  A phone setting or an avatar age never chooses it. No grade means no lesson yet. */
import type { LessonDef } from "./curriculum";

const ACCOUNT_GRADE = "unify.account.grade";

export function gradesLabel(grade: string): string {
  const g = String(grade).trim().toUpperCase();
  if (g === "K" || g === "0" || g === "K-2") return "K-2";
  if (g === "3-5" || g === "6-8" || g === "9-12") return g;
  const n = parseInt(g, 10);
  if (Number.isNaN(n)) return "";
  if (n <= 2) return "K-2";
  if (n <= 5) return "3-5";
  if (n <= 8) return "6-8";
  return "9-12";
}

/** grade 0–12 set by a parent (family link) or the account holder. Null until someone sets it. */
export function parentGrade(): number | null {
  try {
    const link = JSON.parse(localStorage.getItem("unify.family.link") || "null") as { grade?: number } | null;
    if (link && typeof link.grade === "number" && link.grade >= 0 && link.grade <= 12) return link.grade;
  } catch { /* private mode */ }
  try {
    const saved = JSON.parse(localStorage.getItem(ACCOUNT_GRADE) || "null") as { grade?: number } | null;
    if (saved && typeof saved.grade === "number" && saved.grade >= 0 && saved.grade <= 12) return saved.grade;
  } catch { /* private mode */ }
  return null;
}

/** A child signed in under someone else's account cannot pick a grade.
 *  The main account can: a parent, or a student who owns the account. */
export function isMainAccount(): boolean {
  try {
    if (sessionStorage.getItem("unify.family.ci") === "kid") return false;
    const link = JSON.parse(localStorage.getItem("unify.family.link") || "null") as { kidLogin?: boolean } | null;
    if (link?.kidLogin) return false;
  } catch { /* the person at the device is the account holder */ }
  return true;
}

/** only the main account should call this */
export function setParentGrade(grade: number) {
  if (!isMainAccount()) return;
  const g = Math.max(0, Math.min(12, Math.round(grade)));
  try { localStorage.setItem(ACCOUNT_GRADE, JSON.stringify({ grade: g, by: "account" })); } catch { /* private mode */ }
  try {
    const link = JSON.parse(localStorage.getItem("unify.family.link") || "null") as Record<string, unknown> | null;
    if (link && typeof link === "object") { link.grade = g; localStorage.setItem("unify.family.link", JSON.stringify(link)); }
  } catch { /* none */ }
}

export function studentBand(): string {
  const g = parentGrade();
  return g == null ? "" : gradesLabel(String(g));
}

export function lessonsForBand<T extends { grades?: string }>(list: T[], band = studentBand()): T[] {
  if (!band) return [];
  return list.filter((l) => l.grades && gradesLabel(l.grades) === band);
}

export function bandLessons(list: LessonDef[], band = studentBand()): LessonDef[] {
  return lessonsForBand(list, band);
}

/** same grade, same day, same class: the same lesson. A different grade gets a different list, so a different lesson. */
export function gradeLesson<T>(list: T[], grade = parentGrade()): T | null {
  if (grade == null || !list.length) return null;
  const day = Math.floor(Date.now() / 864e5);
  return list[(day + grade) % list.length];
}