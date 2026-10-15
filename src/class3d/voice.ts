/** Spoken lessons with the browser's built-in speech (no network, no keys). Every person keeps ONE voice: the choice is made once from the
 *  device's voices (quality-ranked, so natural voices win), saved, and kept distinct between teachers. Personality sets pitch, pace and
 *  cadence; the teacher's mood only nudges them a little so a voice is always recognisable. Lines are broken into natural chunks
 *  (sentences, commas, dashes) with small pauses and per-chunk pitch/rate variation so speech doesn't sound robotic. Mute is remembered. */
import type { NpcDef } from "../hall3d/roster";
import { personaOf } from "./persona";
import { FACULTY_BY_ID } from "../hall3d/faculty";

const KEY = "unify.voice.on", MAP = "unify.voice.map.v1";
const synth: SpeechSynthesis | null = typeof speechSynthesis !== "undefined" ? speechSynthesis : null;
let voices: SpeechSynthesisVoice[] = [], ranked: SpeechSynthesisVoice[] = [], ready: Promise<void> | null = null;
/** quality score for a voice: natural/neural/online voices first, then en-US, en-GB, any other en */
const GOOD = /google|microsoft|natural|neural|online/i;
const score = (v: SpeechSynthesisVoice): number => {
  let s = 0;
  if (GOOD.test(v.name)) s += 100;
  if (/natural|neural/i.test(v.name)) s += 40;
  if (/online/i.test(v.name) || !v.localService) s += 8;
  const lang = v.lang.toLowerCase().replace("_", "-");
  if (lang === "en-us") s += 30; else if (lang === "en-gb") s += 20; else s += 5;
  return s;
};
const load = () => {
  voices = synth ? synth.getVoices().filter((v) => /^en/i.test(v.lang)).sort((a, b) => (a.name + a.lang).localeCompare(b.name + b.lang)) : [];
  ranked = [...voices].sort((a, b) => score(b) - score(a) || (a.name + a.lang).localeCompare(b.name + b.lang));   // cached quality ranking, refreshed on voiceschanged
};
if (synth) { load(); synth.addEventListener?.("voiceschanged", load); }
/** resolves once the device has reported its voices (or after a short wait), so the first line already uses the final voice */
const whenReady = () => ready ??= new Promise<void>((res) => { if (!synth || voices.length) return res(); let n = 0; const t = setInterval(() => { load(); if (voices.length || ++n > 12) { clearInterval(t); res(); } }, 100); });
const FEM = /(female|zira|samantha|karen|victoria|susan|hazel|aria|jenny|linda|moira|tessa|fiona|allison|ava|serena|catherine|kate|emma|joanna|salli|kendra|kimberly|ivy|libby|sonia)/i;
const MAL = /(\bmale\b|david|mark|daniel|alex|fred|george|guy|ryan|james|tom|oliver|arthur|aaron|matthew|joey|justin|brian|eric|gordon|thomas|rishi)/i;
const hash = (n: number) => { let x = (n * 2654435761) >>> 0; x ^= x >>> 15; return x >>> 0; };
const KIDS: Record<string, number> = { k2: 1.65, g35: 1.45, g68: 1.25, hs: 1.1, adult: 1 };
const store = (): Record<string, string> => { try { return JSON.parse(localStorage.getItem(MAP) || "{}"); } catch { return {}; } };
const save = (m: Record<string, string>) => { try { localStorage.setItem(MAP, JSON.stringify(m)); } catch { /* private mode */ } };
const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));

/* ---- cadence engine: natural chunks, pauses, variation, emphasis ---- */
interface Chunk { text: string; gap: number; q: boolean; ex: boolean; em: boolean }
const GAP_SENT = 260, GAP_CLAUSE = 140;      // base ms of silence; scaled by the persona's pause multiplier
const SENT_END = /^[.!?]+$/, CLAUSE_END = /^[,;:\u2014-]+$/;
/** split a line into speakable chunks at sentence/clause boundaries, tagging questions, exclamations and emphasis (asterisks or CAPS) */
const chunkLine = (line: string): Chunk[] => {
  const raw = (line.match(/[^.,!?;:\u2014—]+[.,!?;:\u2014—-]*/g) ?? [line]).map((p) => p.trim()).filter(Boolean);
  const chunks: Chunk[] = [];
  let sent: { text: string; end: string }[] = [];
  const flush = (endPunct: string) => {          // emit one sentence; the last chunk carries the question/exclamation lift
    for (let i = 0; i < sent.length; i++) {
      const last = i === sent.length - 1, end = last ? endPunct : sent[i].end;
      chunks.push({ text: sent[i].text, gap: SENT_END.test(end) ? GAP_SENT : CLAUSE_END.test(end) ? GAP_CLAUSE : GAP_CLAUSE, q: last && end.includes("?"), ex: last && end.includes("!"), em: false });
    }
    sent = [];
  };
  for (const p of raw) {
    const m = p.match(/([.,!?;:\u2014—-]+)$/); const end = m?.[1] ?? "";
    sent.push({ text: m ? p.slice(0, p.length - end.length).trim() : p, end });
    if (SENT_END.test(end)) flush(end);
  }
  if (sent.length) flush(sent[sent.length - 1].end);
  const out: Chunk[] = [];
  for (const c of chunks) {                       // split very long chunks on words so a single utterance never stalls
    if (c.text.length <= 170) { out.push(c); continue; }
    const w = c.text.split(" "); let cur = "";
    for (const x of w) { if ((cur + " " + x).length > 150) { out.push({ ...c, text: cur, gap: GAP_CLAUSE, q: false, ex: false }); cur = x; } else cur += (cur ? " " : "") + x; }
    if (cur) out.push({ ...c, text: cur });
  }
  for (const c of out) {                          // emphasis: *asterisks* or SHOUTED CAPS words speak slower and higher; markers are stripped
    c.em = /\*[^*]+\*/.test(c.text) || /\b[A-Z]{2,}\b/.test(c.text);
    c.text = c.text.replace(/\*([^*]+)\*/g, "$1");
  }
  return out.filter((c) => c.text);
};

let session = 0;                                  // bumped by cancel(): kills the whole pending chunk queue
const timers = new Set<ReturnType<typeof setTimeout>>();
const later = (fn: () => void, ms: number) => { const t = setTimeout(() => { timers.delete(t); fn(); }, ms); timers.add(t); return t; };

export const voice = {
  get enabled() { try { return localStorage.getItem(KEY) !== "0"; } catch { return true; } },
  set enabled(v: boolean) { try { localStorage.setItem(KEY, v ? "1" : "0"); } catch { /* private mode */ } if (!v) this.cancel(); },
  get available() { return !!synth; },
  /** who is speaking in what mood (the classroom supplies this) */
  mood: ((_d: NpcDef) => "neutral") as (d: NpcDef) => string,
  /** stop everything: the current utterance AND every queued chunk / pending pause */
  cancel() { session++; for (const t of timers) clearTimeout(t); timers.clear(); try { synth?.cancel(); } catch { /* ignore */ } },
  /** the one voice for this person: saved choice first, otherwise the best free voice of the right kind, distinct from other teachers */
  pick(d: NpcDef): SpeechSynthesisVoice | null {
    if (!voices.length) load(); if (!voices.length) return null;
    const m = store(), key = String(d.id), saved = voices.find((v) => v.voiceURI === m[key]); if (saved) return saved;
    const fac = d.faculty ? FACULTY_BY_ID[d.faculty] : null, female = fac ? fac.gender === "F" : /^(ms|mrs|miss)\b/i.test(d.name) || (d.role !== "staff" ? hash(d.id) % 2 === 0 : false);
    const order = ranked.length ? ranked : voices;   // quality-ranked: natural voices are tried first
    const kind = order.filter((v) => (female ? FEM.test(v.name) : MAL.test(v.name)) && !(female ? MAL.test(v.name) : FEM.test(v.name))), pool = kind.length ? kind : order;
    const used = new Set(Object.entries(m).filter(([k]) => k !== key && (d.role === "staff") === (Number(k) >= 100)).map(([, u]) => u));
    for (const c of pool) if (!used.has(c.voiceURI)) { m[key] = c.voiceURI; save(m); return c; }
    const v = pool[hash(d.id + 7) % pool.length]; m[key] = v.voiceURI; save(m); return v;
  },
  /** speak a line as this person; resolves when finished (or after a safe timeout), never rejects */
  async speak(d: NpcDef, text: string, moodIn?: string): Promise<void> {
    const line = text.replace(/\s+/g, " ").replace(/["“”]/g, "").trim();
    if (!synth || !voice.enabled || !line) return;
    await whenReady(); const mood = moodIn ?? voice.mood(d);
    const staff = d.role === "staff";
    const prof = staff ? personaOf(d.faculty ?? d.personality).voice : null;   // read at speak-time: HQ bridge patches PERSONAS live
    const base = staff && prof ? prof : { pitch: KIDS[d.age] ?? 1.1, rate: 1.04 + (hash(d.id) % 10) / 100 };
    const pauseMul = clamp(prof?.pause ?? 1, 0.5, 1.5), warmth = clamp(prof?.warmth ?? 0.5, 0, 1);
    let pitch = base.pitch * (1 + warmth * 0.04), rate = base.rate;   // small, bounded nudges only: the voice stays the same person
    if (mood === "joy") { pitch *= 1.06; rate *= 1.05; } else if (mood === "upset" || mood === "frown") { pitch *= 0.94; rate *= 0.92; } else if (mood === "frustrated") { pitch *= 1.03; rate *= 1.08; } else if (mood === "stern") { pitch *= 0.96; rate *= 0.96; } else if (mood === "surprised") pitch *= 1.08;
    const v = voice.pick(d), chunks = chunkLine(line);
    voice.cancel(); const my = session;
    return new Promise<void>((res) => {
      let done = false; const fin = () => { if (!done) { done = true; res(); } };
      const step = (i: number) => {
        if (my !== session || !synth) return fin();
        if (i >= chunks.length) return fin();
        const c = chunks[i];
        let p = pitch * (1 + (Math.random() - 0.5) * 0.06), r = rate * (1 + (Math.random() - 0.5) * 0.10);   // ±3% pitch, ±5% rate per chunk
        if (c.q) p *= 1.08; if (c.ex) r *= 1.10;                       // question lift on the final chunk, exclamations a touch faster
        if (c.em) { p *= 1.15; r *= 0.90; }                            // *emphasis* / CAPS: higher and slower
        try {
          const u = new SpeechSynthesisUtterance(c.text); if (v) u.voice = v; u.lang = v?.lang ?? "en-US";
          u.pitch = clamp(p, 0.1, 2); u.rate = clamp(r, 0.5, 1.8); u.volume = 1;
          u.onend = u.onerror = () => { if (my !== session) return fin(); later(() => step(i + 1), c.gap * pauseMul); };
          synth.speak(u);
        } catch { fin(); }
      };
      later(fin, Math.min(30000, 2500 + line.length * 95 / Math.max(.7, rate)));   // safety net if the device never fires onend
      step(0);
    });
  },
};
