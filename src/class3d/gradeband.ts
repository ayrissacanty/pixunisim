/** Which grade band this student is in, and which lessons belong to that band.
 *  The phone's grade wins when it has been saved. Otherwise a saved avatar age.
 *  A first visit uses grades 6–8, where the newest seed lessons live. */
import type { LessonDef } from "./curriculum";
import { Social } from "../hall3d/social";

const AGE: Record<string, string> = { k2: "K-2", g35: "3-5", g68: "6-8", hs: "9-12" };

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

export function studentBand(): string {
  try {
    const phone = JSON.parse(localStorage.getItem("flip.settings") || "null") as { grade?: string } | null;
    if (phone && phone.grade != null && String(phone.grade).trim() !== "") {
      const b = gradesLabel(String(phone.grade));
      if (b) return b;
    }
  } catch { /* private mode */ }
  try {
    const raw = JSON.parse(localStorage.getItem("unify.social.v1") || "null") as { profile?: { hasAvatar?: boolean; avatar?: { age?: string } } } | null;
    if (raw?.profile?.hasAvatar) {
      const b = AGE[raw.profile.avatar?.age || ""] || AGE[Social.profile.avatar?.age || ""];
      if (b) return b;
    }
  } catch { /* ignore */ }
  return "6-8";
}

export function lessonsForBand<T extends { grades?: string }>(list: T[], band = studentBand()): T[] {
  const graded = list.filter((l) => l.grades && gradesLabel(l.grades) === band);
  return graded.length ? graded : list.filter((l) => !l.grades);
}

export function bandLessons(list: LessonDef[], band = studentBand()): LessonDef[] {
  return lessonsForBand(list, band);
}
