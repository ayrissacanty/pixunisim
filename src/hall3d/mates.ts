/** Who shares the room. A real sibling in the same grade band takes the second bed. Until then it is an NPC from that band. */
import { ROSTER } from "./roster";
import { toLook, type AvatarSpec } from "./avatar";
import type { Look } from "./characters";

const KEY = "unify.dorm.mates";
export interface Mate { id: string; name: string; age: string; avatar?: AvatarSpec }

export function readMates(): Mate[] {
  try { const a = JSON.parse(localStorage.getItem(KEY) || "[]"); return Array.isArray(a) ? a.filter((m) => m && typeof m.id === "string") : []; } catch { return []; }
}
export function rememberMate(m: Mate) {
  if (!m.id) return;
  try {
    const all = readMates().filter((x) => x.id !== m.id);
    all.push({ id: m.id, name: String(m.name || "Student").slice(0, 14), age: m.age || "hs", avatar: m.avatar });
    localStorage.setItem(KEY, JSON.stringify(all.slice(-12)));
  } catch { /* private mode */ }
}
/** save whoever is playing right now, so the next child in the same band can room with them */
export function rememberCurrent() {
  try {
    const link = JSON.parse(localStorage.getItem("unify.family.link") || "null") as { kid?: string; band?: string } | null;
    const fam = JSON.parse(localStorage.getItem("unify.family.v1") || "null") as { kid?: string; kidName?: string } | null;
    const soc = JSON.parse(localStorage.getItem("unify.social.v1") || "null") as { profile?: { name?: string; avatar?: AvatarSpec } } | null;
    const id = link?.kid || fam?.kid; if (!id || !soc?.profile?.avatar) return;
    rememberMate({ id, name: fam?.kidName || soc.profile.name || "Student", age: soc.profile.avatar.age || link?.band || "hs", avatar: soc.profile.avatar });
  } catch { /* none yet */ }
}
export function roommateFor(selfAge: string, selfId: string | null): { name: string; look: Look; spec: AvatarSpec; real: boolean } {
  const mate = readMates().find((m) => m.id !== selfId && m.age === selfAge && m.avatar);
  if (mate?.avatar) return { name: mate.name, look: { ...toLook(mate.avatar, 7), sit: true, tag: false } as Look, spec: mate.avatar, real: true };
  const age = selfAge as Look["age"];
  const npc = (age === "adult" ? ROSTER.find((n) => n.role === "staff") : ROSTER.find((n) => n.role === "student" && n.age === age)) ?? ROSTER.find((n) => n.role === "student")!;
  return { name: npc.first, look: { ...npc.look, sit: true }, spec: npc.spec, real: false };
}
