/** Student speech tools: let the player's avatar SPEAK a typed answer aloud (a youth voice, distinct from the teachers) and TYPE BY VOICE
 *  (mic -> live interim text in the input, final transcript inserted). Everything uses on-device browser APIs only: no audio ever leaves the
 *  page. Both features degrade gracefully: no speechSynthesis -> no speaker button; no SpeechRecognition -> a disabled mic with a tooltip. */
const synth: SpeechSynthesis | null = typeof speechSynthesis !== "undefined" ? speechSynthesis : null;
const REC: (new () => any) | null = typeof window !== "undefined" ? ((window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition ?? null) : null;
export const speechSupported = !!synth;
export const micSupported = !!REC;
/** shares the classroom's Voice on/off switch */
const voiceOn = () => { try { return localStorage.getItem("unify.voice.on") !== "0"; } catch { return true; } };

let voices: SpeechSynthesisVoice[] = [];
const load = () => { voices = synth ? synth.getVoices().filter((v) => /^en/i.test(v.lang)) : []; };
if (synth) { load(); synth.addEventListener?.("voiceschanged", load); }
const whenVoices = () => new Promise<void>((res) => { if (!synth || voices.length) return res(); let n = 0; const t = setInterval(() => { load(); if (voices.length || ++n > 12) { clearInterval(t); res(); } }, 100); });
const YOUNG = /(kid|child|junior|young|ivy|justin|kevin|emma|aria|ana|zoe|mia|samantha|zira|google uk english female|google us english)/i;
/** pick a younger-sounding en voice, avoiding the voices the teachers already claimed (their map lives in localStorage) */
function pickStudentVoice(): SpeechSynthesisVoice | null {
  if (!voices.length) load(); if (!voices.length) return null;
  let used = new Set<string>(); try { used = new Set(Object.values(JSON.parse(localStorage.getItem("unify.voice.map.v1") || "{}") as Record<string, string>)); } catch { /* private mode */ }
  const score = (v: SpeechSynthesisVoice) => (YOUNG.test(v.name) ? 2 : 0) + (/en[-_]US/i.test(v.lang) ? 1 : 0) - (used.has(v.voiceURI) ? 4 : 0);
  return voices.slice().sort((a, b) => score(b) - score(a) || a.name.localeCompare(b.name))[0];
}
/** read the player's text aloud in a youth voice (higher pitch than the teachers); resolves when done, never rejects */
export async function speakStudent(text: string): Promise<void> {
  const line = text.replace(/\s+/g, " ").replace(/["“”]/g, "").trim();
  if (!synth || !voiceOn() || !line) return;
  await whenVoices(); const v = pickStudentVoice();
  return new Promise<void>((res) => {
    let done = false; const fin = () => { if (!done) { done = true; res(); } };
    setTimeout(fin, Math.min(30000, 2500 + line.length * 95));
    try {
      synth.cancel(); const u = new SpeechSynthesisUtterance(line);
      if (v) u.voice = v; u.lang = v?.lang ?? "en-US"; u.pitch = 1.3; u.rate = 1.0; u.volume = 1; u.onend = u.onerror = fin; synth.speak(u);
    } catch { fin(); }
  });
}

/* ------------------------------------------------------------ voice input (mic) */
/** one mic session: continuous=false, interim results streamed into the input, the final transcript is handed to onFinal */
export function startMic(input: HTMLInputElement, onFinal: (t: string) => void, onState?: (listening: boolean) => void): () => void {
  if (!REC) return () => {};
  const rec = new REC(); rec.lang = "en-US"; rec.continuous = false; rec.interimResults = true; rec.maxAlternatives = 1;
  let base = input.value, stopped = false;
  const stop = () => { if (!stopped) { stopped = true; try { rec.stop(); } catch { /* not started */ } } };
  rec.onresult = (e: any) => {
    let interim = "", final = "";
    for (let i = e.resultIndex; i < e.results.length; i++) { const r = e.results[i]; if (r.isFinal) final += r[0].transcript; else interim += r[0].transcript; }
    input.value = (base ? base + " " : "") + (final || interim);           // live preview while speaking
    if (final) { const t = final.trim(); stop(); if (t) onFinal(t); }
  };
  rec.onerror = () => { stop(); onState?.(false); };
  rec.onend = () => { stopped = true; onState?.(false); };
  try { rec.start(); onState?.(true); } catch { stopped = true; onState?.(false); }
  return stop;
}
/** the 🔊 / 🎤 pair for a text form; returns null when neither API exists (nothing to add) */
export function speechButtons(input: HTMLInputElement, onFinal: (t: string) => void, speakText: () => string): HTMLElement | null {
  if (!synth && !REC) return null;
  const box = document.createElement("span"); box.className = "uchat-voice";
  if (synth) {
    const b = document.createElement("button"); b.type = "button"; b.className = "uchat-vbtn"; b.textContent = "\u{1F50A}"; b.title = "Speak my answer aloud"; b.setAttribute("aria-label", "Speak my answer aloud");
    b.onclick = () => { const t = speakText().trim(); if (t) void speakStudent(t); }; box.appendChild(b);
  }
  const mic = document.createElement("button"); mic.type = "button"; mic.className = "uchat-vbtn"; mic.textContent = "\u{1F3A4}";
  if (!REC) { mic.disabled = true; mic.title = "Voice input not supported on this browser"; mic.setAttribute("aria-label", "Voice input not supported on this browser"); }
  else {
    mic.title = "Say it instead of typing"; mic.setAttribute("aria-label", "Say it instead of typing");
    let stop: (() => void) | null = null;
    mic.onclick = () => { if (stop) { stop(); return; } stop = startMic(input, onFinal, (on) => { mic.classList.toggle("rec", on); mic.textContent = on ? "\u{23F9}" : "\u{1F3A4}"; if (!on) stop = null; }); };
  }
  box.appendChild(mic); return box;
}

/* ------------------------------------------------------------ understanding: match a transcript to the known accepted answers */
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
function lev(a: string, b: string): number {
  if (Math.abs(a.length - b.length) > 2) return 3;
  const m = a.length, n = b.length; let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) { const cur = [i]; for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); prev = cur; }
  return prev[n];
}
/** index of the choice the transcript means, or -1: exact / contains-keyword / fuzzy (Levenshtein <= 2), all case-insensitive, punctuation stripped */
export function matchAnswer(text: string, choices: string[]): number {
  const t = norm(text); if (!t) return -1;
  const cs = choices.map(norm);
  let i = cs.indexOf(t); if (i >= 0) return i;
  for (let k = 0; k < cs.length; k++) { const c = cs[k]; if (c.length >= 3 && (t.includes(c) || (t.length >= 3 && c.includes(t)))) return k; }
  let best = -1, bd = 3;
  for (let k = 0; k < cs.length; k++) { const d = lev(t, cs[k]); if (d < bd) { bd = d; best = k; } }
  if (best >= 0) return best;
  const words = t.split(" ");                                                    // single keyword said nearly right (e.g. "mitokondria")
  for (let k = 0; k < cs.length; k++) for (const cw of cs[k].split(" ").filter((w) => w.length >= 4)) if (words.some((w) => lev(w, cw) <= 2)) return k;
  return -1;
}
