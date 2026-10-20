// UNIFY News feed service — no dependencies, Node 18+.
//   npm start                  → http://localhost:8787  (academy) and /api/broadcast?city=Atlanta&grade=6
// Optional env: ANTHROPIC_API_KEY (better anchor copy), ANTHROPIC_MODEL, PORT
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const PORT = process.env.PORT || 8787;
const UA = 'Mozilla/5.0 (compatible; UnifyNewsBot/1.0; school-broadcast)';
const CACHE_MS = 10 * 60 * 1000;

/* ---------- Sources: edit freely ---------- */
const enc = encodeURIComponent;
const googleEdition = cc => { const c = (cc || 'US').toUpperCase(); return `hl=en-${c === 'GB' ? 'GB' : 'US'}&gl=${c}&ceid=${c}:en`; };
const GN = (p, cc) => `https://news.google.com/rss${p}${p.includes('?') ? '&' : '?'}${googleEdition(cc)}`;
const GN_TOPICS = ['NATION', 'BUSINESS', 'TECHNOLOGY', 'ENTERTAINMENT', 'SPORTS', 'SCIENCE', 'HEALTH'];
const US_NATIONAL = [
  { name: 'PBS NewsHour', url: 'https://www.pbs.org/newshour/feeds/rss/headlines' }, { name: 'NPR', url: 'https://feeds.npr.org/1001/rss.xml' },
  { name: 'ABC News', url: 'https://abcnews.go.com/abcnews/topstories' }, { name: 'CBS News', url: 'https://www.cbsnews.com/latest/rss/main' },
  { name: 'NBC News', url: 'https://feeds.nbcnews.com/nbcnews/public/news' }, { name: 'The Guardian US', url: 'https://www.theguardian.com/us-news/rss' },
];
const WORLD = [
  { name: 'BBC News', url: 'https://feeds.bbci.co.uk/news/world/rss.xml' }, { name: 'BBC Africa', url: 'https://feeds.bbci.co.uk/news/world/africa/rss.xml' },
  { name: 'BBC Asia', url: 'https://feeds.bbci.co.uk/news/world/asia/rss.xml' }, { name: 'BBC Europe', url: 'https://feeds.bbci.co.uk/news/world/europe/rss.xml' },
  { name: 'BBC Latin America', url: 'https://feeds.bbci.co.uk/news/world/latin_america/rss.xml' }, { name: 'BBC Middle East', url: 'https://feeds.bbci.co.uk/news/world/middle_east/rss.xml' },
  { name: 'Al Jazeera', url: 'https://www.aljazeera.com/xml/rss/all.xml' }, { name: 'DW', url: 'https://rss.dw.com/rdf/rss-en-all' }, { name: 'France 24', url: 'https://www.france24.com/en/rss' },
  { name: 'NPR World', url: 'https://feeds.npr.org/1004/rss.xml' }, { name: 'The Guardian World', url: 'https://www.theguardian.com/world/rss' }, { name: 'UN News', url: 'https://news.un.org/feed/subscribe/en/news/all/rss.xml' },
];
/** Classroom sources by grade band: article feeds for the "learn" tier, plus watch-and-learn sites (CNN 10 and PBS KIDS have no usable feed, so they are links). */
const LEARN = {
  k5: [{ name: 'DOGOnews', url: 'https://www.dogonews.com/articles.rss' }],
  ms: [{ name: 'PBS NewsHour Classroom', url: 'https://www.pbs.org/newshour/classroom/rss/latest-daily-news-lessons' }],
  hs: [{ name: 'PBS NewsHour Classroom', url: 'https://www.pbs.org/newshour/classroom/rss/latest-daily-news-lessons' }, { name: 'PBS Student Reporting Labs', url: 'https://studentreportinglabs.org/feed/' }],
};
const RESOURCES = {
  k5: [{ name: 'DOGOnews', url: 'https://www.dogonews.com', what: 'Kid-friendly articles' }, { name: 'PBS KIDS', url: 'https://pbskids.org', what: 'Videos, games and activities' }],
  ms: [{ name: 'CNN 10', url: 'https://www.cnn.com/cnn10', what: 'Short news videos' }, { name: 'PBS NewsHour Classroom', url: 'https://www.pbs.org/newshour/classroom', what: 'News lessons' }],
  hs: [{ name: 'PBS NewsHour Classroom', url: 'https://www.pbs.org/newshour/classroom', what: 'Current events lessons' }, { name: 'PBS Student Reporting Labs', url: 'https://studentreportinglabs.org', what: 'Journalism and media literacy' }],
};
const band = g => (g <= 5 ? 'k5' : g <= 8 ? 'ms' : 'hs');
const KIDS = [{ name: 'BBC Newsround', url: 'https://feeds.bbci.co.uk/newsround/rss.xml' }];
/** feeds for a place + edition. `when:` narrows Google News searches to the edition's time window. */
function feedsFor(place, edition, kids) {
  const cc = place.cc || 'US', when = edition === 'am' ? 'when:1d' : 'when:12h', where = [place.name, place.admin].filter(Boolean).join(', ');
  const local = [
    { name: 'Local news', url: GN(`/headlines/section/geo/${enc(where)}`, cc), splitSource: true },
    { name: 'Local news', url: GN(`/search?q=${enc(`"${place.name}" ${when}`)}`, cc), splitSource: true },
    { name: 'Local news', url: GN(`/search?q=${enc(`${where} (community OR city OR county OR weather OR traffic OR school OR students) ${when}`)}`, cc), splitSource: true },
  ];
  const national = kids ? [...KIDS] : [{ name: 'Top stories', url: GN('', cc), splitSource: true }, ...GN_TOPICS.map(t => ({ name: t.toLowerCase(), url: GN(`/headlines/section/topic/${t}`, cc), splitSource: true })), ...(cc === 'US' ? US_NATIONAL : [])];
  const world = kids ? [...KIDS] : [{ name: 'World', url: GN('/headlines/section/topic/WORLD', cc), splitSource: true }, ...WORLD];
  return { local, national, world };
}

/* ---------- Helpers ---------- */
const decode = s => s.replace(/<!\[CDATA\[|\]\]>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&nbsp;/g, ' ');
const strip = s => decode(s).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const tag = (x, t) => { const m = x.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)</${t}>`, 'i')); return m ? m[1] : ''; };

const parseDate = v => { const d = new Date(v); return isNaN(d) ? new Date() : d; };
async function get(url, ms = 7000) {
  if (process.env.UNIFY_MOCK_FEEDS) return mockResponse(url);
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), ms);
  try { const r = await fetch(url, { headers: { 'User-Agent': UA }, signal: ctl.signal }); if (!r.ok) throw new Error(r.status); return r; }
  finally { clearTimeout(t); }
}

async function readFeed(f) {
  try {
    const xml = await (await get(f.url)).text();
    return [...xml.matchAll(/<(?:item|entry)[\s>][\s\S]*?<\/(?:item|entry)>/gi)].slice(0, 120).map(m => {
      const x = m[0]; let title = strip(tag(x, 'title')), source = f.name;
      if (f.splitSource) { const i = title.lastIndexOf(' - '); if (i > 0) { source = title.slice(i + 3); title = title.slice(0, i); } }
      let snippet = strip(tag(x, 'description') || tag(x, 'summary') || tag(x, 'content')); if (snippet.toLowerCase().startsWith(title.toLowerCase().slice(0, 30))) snippet = '';
      return { title, snippet: snippet.slice(0, 400), link: strip(tag(x, 'link')) || ((x.match(/<link[^>]*href="([^"]+)"/i) || [])[1] || ''), source, date: parseDate(strip(tag(x, 'pubDate') || tag(x, 'dc:date') || tag(x, 'published') || tag(x, 'updated'))) };
    }).filter(i => i.title);
  } catch (e) { console.warn('feed failed:', f.name, e.message); return []; }
}

/* ---------- Age-appropriate filtering ---------- */
const HARSH = /\b(kill(ed|ing|s)?|murder\w*|shoot(ing|er|s)?|shot dead|dead|deaths?|die[sd]?|dying|attack(s|ed)?|war|bomb\w*|rape\w*|abus\w+|suicid\w*|terror\w*|massacre|hostage|stabb\w*|gun\w*|sexual\w*|overdose|crash(es|ed)?)\b/i;
const SEVERE = /\b(rape\w*|suicid\w*|sexual\w*|massacre|overdose|graphic)\b/i;
const gradeNum = g => (String(g).toUpperCase() === 'K' ? 0 : parseInt(g, 10) || 6);
const okForGrade = (i, g) => !(g >= 9 ? SEVERE : HARSH).test(i.title + ' ' + i.snippet);
// Local stories should feel like school-community news, not politics or crime.
const LOCAL_LIKE = /\b(school|student|teen|youth|kids?|children|teacher|library|museum|zoo|park|garden|festival|science|stem|robot\w*|art|music|band|choir|theater|team|champion\w*|college|universit\w*|scholar\w*|community|volunteer|food|chef|animal|aquarium|concert|reading|sports?)\b/i;
const LOCAL_SKIP = /\b(elect\w*|endorse\w*|campaign|council|zoning|lawsuit|indict\w*|polic\w*|arrest\w*|court|mayor|vote\w*|poll|governor|senator|sheriff|develop\w*|tax|budget|candidate|editorial|opinion|column|school board|board of)\b/i;
const localScore = i => (LOCAL_SKIP.test(i.title) ? -5 : 0) + (LOCAL_LIKE.test(i.title + ' ' + i.snippet) ? 3 : 0);
const norm = t => t.toLowerCase().replace(/[^a-z0-9 ]/g, '').slice(0, 50);

/** Newest-first, de-duplicated stories inside the edition window (widened until there are `min` of them, up to 4 days). No upper cap. */
function selectTier(items, g, hours, min, filter = () => true) {
  const now = Date.now(), ok = items.filter(i => okForGrade(i, g) && filter(i)).sort((a, b) => b.date - a.date);
  let h = hours, out = [];
  for (let k = 0; k < 4; k++, h *= 2) {
    const seen = new Set(); out = ok.filter(i => now - i.date.getTime() < h * 3600e3).filter(i => { const key = norm(i.title) + '|' + i.title.toLowerCase().split(/\s+/).slice(0, 5).join(' '); if (seen.has(key)) return false; seen.add(key); return true; });
    if (out.length >= min || h >= 96) break;
  }
  return { items: out, hours: h };
}
/** local time pieces for an IANA zone */
function localParts(tz) {
  try { const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: tz || 'UTC', hour: 'numeric', minute: 'numeric', hour12: false, weekday: 'long', month: 'long', day: 'numeric' }).formatToParts(new Date()).map(x => [x.type, x.value]));
    return { h: (+p.hour) % 24, m: +p.minute, weekday: p.weekday, month: p.month, day: p.day }; } catch { const d = new Date(); return { h: d.getUTCHours(), m: d.getUTCMinutes(), weekday: '', month: '', day: '' }; }
}
const editionNow = tz => localParts(tz).h < 12 ? 'am' : 'pm';
/** AM = since 6 pm yesterday, PM = since 6 am today (hours back from now, clamped) */
function windowHours(edition, tz) { const { h, m } = localParts(tz), now = h + m / 60; return Math.max(6, Math.min(30, edition === 'am' ? now + 6 : now - 6)); }

/* ---------- Weather (Open-Meteo, no key) ---------- */
async function geocode(city) {
  const j = await (await get(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`)).json();
  const r = j.results?.[0]; if (!r) throw new Error('city not found: ' + city);
  return { name: r.name, admin: r.admin1 || '', cc: r.country_code || 'US', country: r.country || '', lat: r.latitude, lon: r.longitude, tz: r.timezone };
}
async function reverseGeocode(lat, lon) {
  try { const j = await (await get(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`)).json();
    const name = j.city || j.locality || j.principalSubdivision || 'Your area'; return { name, admin: j.principalSubdivisionCode ? String(j.principalSubdivisionCode).split('-').pop() : (j.principalSubdivision || ''), cc: j.countryCode || 'US', country: j.countryName || '', lat: +lat, lon: +lon };
  } catch { return { name: 'Your area', admin: '', cc: 'US', country: '', lat: +lat, lon: +lon }; }
}
const WX = code => code === 0 ? ['sun', 'Sunny'] : code <= 2 ? ['partly', 'Partly cloudy'] : code === 3 ? ['partly', 'Cloudy'] : code <= 48 ? ['partly', 'Foggy']
  : code <= 67 || (code >= 80 && code <= 82) ? ['rain', 'Rain'] : code <= 77 || code === 85 || code === 86 ? ['rain', 'Snow'] : ['rain', 'Storms'];
async function weather(place) {
  const offs = [[0, 0, place.name], [0.12, 0, 'Northside'], [0, 0.14, 'Eastside'], [-0.12, 0, 'Southside']];
  const lat = offs.map(o => (place.lat + o[0]).toFixed(3)).join(','), lon = offs.map(o => (place.lon + o[1]).toFixed(3)).join(',');
  const j = await (await get(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weather_code,temperature_2m_max,wind_speed_10m_max,precipitation_probability_max&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=auto&forecast_days=1`)).json();
  return (Array.isArray(j) ? j : [j]).map((d, i) => {
    let [type, label] = WX(d.daily.weather_code[0]);
    if (type !== 'rain' && d.daily.wind_speed_10m_max[0] >= 22) { type = 'wind'; label = 'Breezy'; }
    return { name: offs[i][2], type, label, temp: Math.round(d.daily.temperature_2m_max[0]), rainChance: d.daily.precipitation_probability_max[0], windMph: Math.round(d.daily.wind_speed_10m_max[0]) };
  });
}

/* ---------- Anchor copy ---------- */
const firstSentence = s => (s.match(/^.{20,240}?[.!?](\s|$)/) || [s.slice(0, 200)])[0].trim();
function plainCopy(s) { // no-LLM fallback: uses only the feed's own words
  const vo = []; const snip = s.snippet && firstSentence(s.snippet); if (snip) vo.push(snip);
  vo.push(snip ? `That's according to ${s.source}.` : `The story comes from ${s.source}, and there's a link for the full report.`);
  return { intro: `${{ local: 'Close to home', national: 'Nationally', world: 'Around the world' }[s.tier]}: ${s.title}.`, vo };
}
async function llmChunk(stories, grade, offset) {
  const key = process.env.ANTHROPIC_API_KEY; if (!key) return null;
  const prompt = `You write anchor copy for a school news broadcast for grade ${grade} students.
For each story return JSON: {"id":number,"intro":string (<=25 words, anchor lead-in),"vo":[1-3 sentences, <=22 words each]}.
Rules: use ONLY facts present in the title/snippet. Never add names, numbers, places or claims that are not there. If the snippet is thin, use one sentence. Mention the source once ("according to X"). Age-appropriate, calm tone, no graphic detail. Do not copy long phrases from the snippet.
Return ONLY a JSON array.\n\n` + JSON.stringify(stories.map((s, i) => ({ id: offset + i, tier: s.tier, source: s.source, title: s.title, snippet: s.snippet })));
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001', max_tokens: 3000, messages: [{ role: 'user', content: prompt }] }) });
    const j = await r.json(); const txt = j.content?.map(c => c.text || '').join('') || '';
    return JSON.parse(txt.slice(txt.indexOf('['), txt.lastIndexOf(']') + 1));
  } catch (e) { console.warn('LLM copy failed:', e.message); return null; }
}
/** every story gets copy: model chunks of 12 in parallel (4 at a time), the plain fallback for any that fail */
async function llmCopy(stories, grade) {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  const out = [], chunks = []; for (let i = 0; i < stories.length; i += 12) chunks.push([i, stories.slice(i, i + 12)]);
  for (let i = 0; i < chunks.length; i += 4) (await Promise.all(chunks.slice(i, i + 4).map(([o, c]) => llmChunk(c, grade, o)))).forEach(r => r && out.push(...r));
  return out;
}

/* ---------- Build the broadcast ---------- */
const cache = new Map();
/** opts: { city, lat, lon, tz, grade, edition ('am'|'pm'), limit } */
async function build(o) {
  const g = gradeNum(o.grade || 6), kids = g <= 5;
  let place; if (o.lat != null && o.lon != null && !isNaN(+o.lat) && !isNaN(+o.lon)) place = await reverseGeocode(+o.lat, +o.lon); else place = await geocode(o.city || process.env.SCHOOL_CITY || 'Atlanta');
  const tz = o.tz || place.tz, edition = o.edition === 'am' || o.edition === 'pm' ? o.edition : editionNow(tz), win = windowHours(edition, tz);
  const key = `${place.name}|${place.admin}|${place.cc}|${edition}|${g <= 5 ? 'k5' : g <= 8 ? 'ms' : 'hs'}|${Math.floor(Date.now() / CACHE_MS)}`;
  const hit = cache.get(key); if (hit) return withLimit(hit, o.limit);
  const f = feedsFor(place, edition, kids), all = a => Promise.all(a.map(readFeed)).then(r => r.flat());
  const [wx, loc, nat, wor, lrn, quakes, day] = await Promise.all([weather(place).catch(() => []), all(f.local), all(f.national), all(f.world), all(LEARN[band(g)]), liveLearn(g), onThisDay(g)]);
  const Ln = selectTier([...lrn, ...quakes], g, 14 * 24, 1);
  const L = selectTier(loc.filter(i => localScore(i) > -4), g, win, 8), N = selectTier(nat, g, win, 12), Wd = selectTier(wor.filter(w => !nat.some(n => norm(n.title) === norm(w.title))), g, win, 12);
  const chosen = [...L.items.map(i => ({ ...i, tier: 'local' })), ...N.items.map(i => ({ ...i, tier: 'national' })), ...Wd.items.map(i => ({ ...i, tier: 'world' })), ...Ln.items.slice(0, 6).map(i => ({ ...i, tier: 'learn' }))];
  if (day) chosen.push(day);
  const ai = await llmCopy(chosen, g === 0 ? 'K' : g);
  const stories = chosen.map((s, idx) => {
    const c = (ai && ai.find(x => x.id === idx)) || plainCopy(s);
    return { id: createHash(s.link || s.title), tier: s.tier, headline: s.title, source: s.source, link: s.link, published: s.date.toISOString(), snippet: s.snippet.slice(0, 280), intro: c.intro, vo: (c.vo || []).slice(0, 3), place: s.tier === 'local' ? [place.name, place.admin].filter(Boolean).join(', ') : undefined };
  });
  const lp = localParts(tz), data = { generatedAt: new Date().toISOString(), place: [place.name, place.admin].filter(Boolean).join(', '), country: place.country, cc: place.cc, lat: place.lat, lon: place.lon, tz: tz || 'UTC', grade: g, edition,
    editionLabel: `${edition === 'am' ? 'Morning' : 'Evening'} edition`, localDate: `${lp.weekday}, ${lp.month} ${lp.day}`, windowHours: Math.round(Math.max(L.hours, N.hours, Wd.hours)), llm: !!ai, weather: wx, stories,
    local: stories.filter(s => s.tier === 'local'), national: stories.filter(s => s.tier === 'national'), world: stories.filter(s => s.tier === 'world'), learn: stories.filter(s => s.tier === 'learn'), resources: RESOURCES[band(g)] };
  cache.set(key, data); if (cache.size > 40) cache.delete(cache.keys().next().value); return withLimit(data, o.limit);
}
const withLimit = (d, limit) => { const n = +limit; if (!n || n <= 0) return d; const stories = d.stories.slice(0, n); return { ...d, stories, local: stories.filter(s => s.tier === 'local'), national: stories.filter(s => s.tier === 'national'), world: stories.filter(s => s.tier === 'world'), learn: stories.filter(s => s.tier === 'learn') }; };
const createHash = str => { let h = 2166136261; for (const ch of String(str)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); };

/* ---------- NPC chat (optional model; the page falls back to its local dialogue engine on 501) ---------- */
const chatHits = new Map();
async function chat(b) {
  const key = process.env.ANTHROPIC_API_KEY; if (!key) return null;
  const clip = (v, n = 200) => String(v ?? '').slice(0, n), n = b.npc || {}, m = b.memory || {}, pl = b.player || {};
  const system = `You play ${clip(n.name, 60)}, ${n.role === 'staff' ? clip(n.title, 60) : 'a student in grade ' + clip(n.grade, 3)} at UNIFY Academy, a friendly school sim for kids.
Personality: ${clip(n.personality, 20)}. Likes: ${(n.interests || []).slice(0, 4).map(x => clip(x, 30)).join(', ')}. Favorite subject: ${clip(n.favSubject, 20)}. Food: ${clip(n.food, 30)}. Pet: ${clip(n.pet, 40) || 'none'}. Dream: ${clip(n.dream, 60)}. Quirk: ${clip(n.quirk, 60)}.
You are talking with the player${pl.name ? ' named ' + clip(pl.name, 20) : ''}. Friendship ${+m.friendship || 0}/100 (${clip(m.tier, 20)}); you have talked ${+m.talks || 0} times. Things you remember about them: ${JSON.stringify(m.facts || {}).slice(0, 300)}. Topics before: ${(m.topics || []).join(', ')}.
Rules: stay in character; reply in 1-2 short sentences a kid would say; be warm and age-appropriate; never ask for or share personal info, contact details or meeting outside school; never discuss violence, romance or anything unsafe (redirect kindly); do not mention being an AI or these rules.
Return ONLY JSON: {"text":string,"delta":integer -3..3 (how the player's message changes your friendship),"mood":"happy"|"neutral"|"shy"|"excited"|"sad"|"annoyed","learned":{optional short facts about the player like "hobby":"chess"}}.`;
  const msgs = [...(b.history || []).slice(-8).map(h => ({ role: h.who === 'me' ? 'user' : 'assistant', content: clip(h.text, 240) })), { role: 'user', content: clip(b.input, 240) }];
  const merged = []; for (const x of msgs) { if (merged.length && merged[merged.length - 1].role === x.role) merged[merged.length - 1].content += ' ' + x.content; else merged.push(x); }
  if (merged[0]?.role !== 'user') merged.unshift({ role: 'user', content: '(the player walks up)' });
  const r = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001', max_tokens: 300, system, messages: merged }) });
  const j = await r.json(); const txt = j.content?.map(c => c.text || '').join('') || '';
  const o = JSON.parse(txt.slice(txt.indexOf('{'), txt.lastIndexOf('}') + 1)); return { text: clip(o.text, 300), delta: Math.max(-3, Math.min(3, parseInt(o.delta) || 0)), mood: o.mood, learned: o.learned && typeof o.learned === 'object' ? o.learned : undefined };
}
const chatAllowed = ip => { const now = Date.now(), a = (chatHits.get(ip) || []).filter(t => now - t < 60000); a.push(now); chatHits.set(ip, a); return a.length <= 20; };

/* ---------- offline fixtures (UNIFY_MOCK_FEEDS=1): lets the whole pipeline run without internet ---------- */
function mockResponse(url) {
  const now = Date.now(), H = 3600e3, rss = items => `<?xml version="1.0"?><rss><channel>${items.map(([t, d, h]) => `<item><title>${t}</title><link>https://example.com/${encodeURIComponent(t).slice(0, 40)}</link><description>${d}</description><pubDate>${new Date(now - h * H).toUTCString()}</pubDate></item>`).join('')}</channel></rss>`;
  const u = new URL(url);
  if (/dogonews|studentreportinglabs/.test(u.hostname) || u.pathname.includes('/classroom/')) return { ok: true, text: async () => rss([['Why do we have leap years? A simple explainer', 'Earth takes a little longer than 365 days to circle the Sun.', 20], ['Students build a tiny weather station', 'A class shows how to measure rain and wind with simple tools.', 40], ['How to spot a trustworthy news source', 'Check who wrote it, when, and whether others report the same facts.', 60]]) };
  if (u.hostname.startsWith('geocoding-api')) return { ok: true, json: async () => ({ results: [{ name: u.searchParams.get('name'), admin1: 'Georgia', country_code: 'US', country: 'United States', latitude: 33.75, longitude: -84.39, timezone: 'America/New_York' }] }) };
  if (u.hostname.startsWith('api.bigdatacloud')) return { ok: true, json: async () => ({ city: 'Decatur', principalSubdivisionCode: 'US-GA', principalSubdivision: 'Georgia', countryCode: 'US', countryName: 'United States' }) };
  if (u.hostname.startsWith('api.open-meteo')) { const one = { daily: { weather_code: [2], temperature_2m_max: [71], wind_speed_10m_max: [9], precipitation_probability_max: [20] } }; return { ok: true, json: async () => [one, one, one, one] }; }
  const tier = u.hostname.includes('google') ? (u.pathname.includes('/geo/') || u.pathname.includes('/search') ? 'local' : 'nat') : /bbc|jazeera|dw\.com|france24|un\.org|guardian\.com\/world|npr\.org\/1004/.test(u.hostname + u.pathname) ? 'world' : 'nat';
  const seed = [...u.hostname + u.pathname].reduce((a, c) => a + c.charCodeAt(0), 0);
  const L = [['Decatur students win regional robotics title after record build', 'A team from the area took first place and will head to the state finals next month.', 3], ['Library in Decatur opens new maker space for kids', 'The space has 3D printers, art supplies and quiet reading corners.', 5], ['Heavy rain expected across metro Atlanta this evening', 'Forecasters say storms will clear by morning with temperatures near 60.', 2], ['Atlanta farmers market adds weekend hours', 'Vendors will sell fruit, bread and flowers until 4 pm.', 7], ['Local high school choir to perform at the city hall concert series', 'The free concert starts Saturday at noon.', 9]];
  const N = [['NASA announces new moon mission crew', 'Four astronauts will train for a lunar flyby planned for next year.', 2], ['Congress debates school lunch funding bill', 'Lawmakers are weighing a proposal to expand free meals.', 4], ['U.S. economy adds jobs as inflation cools', 'Economists say hiring was steady across several industries.', 6], ['National park service reports record spring visitors', 'Parks in the West saw the busiest season on record.', 8], ['New study links sleep and better grades in teens', 'Researchers followed 2,000 students for two years.', 5], ['Basketball finals begin tonight in Chicago', 'Both teams are healthy and fans filled the arena.', 3], ['Tech company unveils solar powered laptop', 'The battery can run a week on a sunny windowsill.', 10]];
  const W = [['Japan launches new high speed train line', 'The line connects two major cities in under an hour.', 4], ['Floods hit northern India as monsoon arrives early', 'Rescue teams moved families to shelters.', 3], ['Brazil celebrates restored rainforest corridor', 'Conservationists planted a million trees over five years.', 6], ['European leaders meet in Brussels to discuss climate goals', 'Talks focused on clean energy and public transport.', 5], ['Kenya runner breaks marathon record in Berlin', 'The new time is two minutes faster than last year.', 7], ['Australia opens world largest marine reserve expansion', 'The protected waters are home to coral and sea turtles.', 11], ['Egypt museum shows newly found ancient artifacts', 'Visitors can see gold masks and papyrus scrolls.', 9]];
  const src = tier === 'local' ? L : tier === 'world' ? W : N, rot = seed % src.length; const items = [...src.slice(rot), ...src.slice(0, rot)].map(([t, d, h], i) => [`${t}${u.hostname.includes('google') ? ' - ' + ['Daily Courier', 'City Herald', 'Metro Times'][i % 3] : ''}`, d, h + (seed % 3)]);
  return { ok: true, text: async () => rss(items) };
}

/* ---------- Free school sources. No key. A miss is reported, never filled in. ---------- */
const ISO3 = { 'united states': 'USA', usa: 'USA', us: 'USA', america: 'USA', france: 'FRA', japan: 'JPN', kenya: 'KEN', brazil: 'BRA', india: 'IND', canada: 'CAN', mexico: 'MEX', 'united kingdom': 'GBR', uk: 'GBR', britain: 'GBR', england: 'GBR', germany: 'DEU', italy: 'ITA', spain: 'ESP', china: 'CHN', australia: 'AUS', egypt: 'EGY', nigeria: 'NGA', 'south africa': 'ZAF', ghana: 'GHA', 'south korea': 'KOR', korea: 'KOR', argentina: 'ARG', chile: 'CHL', peru: 'PER', colombia: 'COL', ethiopia: 'ETH', morocco: 'MAR', 'new zealand': 'NZL', ireland: 'IRL', sweden: 'SWE', norway: 'NOR', greece: 'GRC', turkey: 'TUR', poland: 'POL', ukraine: 'UKR', indonesia: 'IDN', philippines: 'PHL', vietnam: 'VNM', thailand: 'THA', pakistan: 'PAK', bangladesh: 'BGD', israel: 'ISR', finland: 'FIN', portugal: 'PRT', netherlands: 'NLD', belgium: 'BEL', switzerland: 'CHE', austria: 'AUT', iceland: 'ISL' };
const clipQ = s => String(s || '').replace(/[^\p{L}\p{N}\s.'-]/gu, ' ').replace(/\s+/g, ' ').trim().slice(0, 80);
const ents = s => String(s || '').replace(/&/g, '&').replace(/"/g, '"').replace(/&#039;|'/g, "'").replace(/</g, '<').replace(/>/g, '>').replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n));
function pageChunks(text, heading) {
  let rest = String(text || '').replace(/\r/g, '').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  const chunks = [];
  while (rest && chunks.length < 8) {
    let cut = rest.length <= 700 ? rest.length : rest.lastIndexOf('\n\n', 700);
    if (cut < 240) cut = rest.lastIndexOf(' ', 700);
    if (cut < 240) cut = Math.min(700, rest.length);
    chunks.push(rest.slice(0, cut).trim()); rest = rest.slice(cut).trim();
  }
  return chunks.filter(Boolean).map((body, i) => ({ heading: i ? 'Continued' : heading, body }));
}
async function textStart(url, max = 100000) {
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 12000);
  try {
    const r = await fetch(url, { headers: { 'User-Agent': UA }, signal: ctl.signal }); if (!r.ok || !r.body) throw new Error(String(r.status));
    const reader = r.body.getReader(), chunks = []; let n = 0;
    while (n < max) { const { done, value } = await reader.read(); if (done) break; chunks.push(Buffer.from(value)); n += value.length; }
    try { await reader.cancel(); } catch { /* already done */ }
    return Buffer.concat(chunks).toString('utf8').slice(0, max);
  } finally { clearTimeout(t); }
}
function pgBody(raw) {
  const parts = String(raw).split(/^\*\*\*\s*START OF THE PROJECT GUTENBERG EBOOK.*$/m);
  let t = (parts.length > 1 ? parts[1] : raw).split(/^\*\*\*\s*END OF THE PROJECT GUTENBERG EBOOK/m)[0];
  return t.replace(/\r/g, '').trim().slice(0, 4500);
}
async function liveLearn(g) {
  if (process.env.UNIFY_MOCK_FEEDS) return [{ title: 'Magnitude 4.2 earthquake recorded near the Pacific', snippet: 'The United States Geological Survey posted the measurement. This is the size and the place, not a damage report.', link: 'https://earthquake.usgs.gov/', source: 'USGS', date: new Date() }];
  try {
    const j = await (await get('https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&limit=3&minmagnitude=4.5&orderby=time', 5000)).json();
    const f = (j.features || []).find(x => x.properties && okForGrade({ title: x.properties.place || '', snippet: '' }, g) && Number.isFinite(+x.properties.mag));
    if (!f) return [];
    const p = f.properties;
    return [{ title: `Magnitude ${Number(p.mag).toFixed(1)} earthquake recorded ${p.place}`, snippet: 'The United States Geological Survey recorded this earthquake. The number is the magnitude. This is not a damage report.', link: p.url || 'https://earthquake.usgs.gov/', source: 'USGS', date: new Date(p.time || Date.now()) }];
  } catch (e) { console.warn('usgs learn', e.message); return []; }
}
async function onThisDay(g) {
  if (process.env.UNIFY_MOCK_FEEDS) return { title: 'On this day: a school science note from Wikimedia', snippet: 'A class can read one safe event from the Wikimedia on-this-day feed. This fixture stands in when the network is off.', link: 'https://en.wikipedia.org', source: 'Wikimedia', date: new Date(), tier: 'learn' };
  try {
    const d = new Date(), j = await (await get(`https://en.wikipedia.org/api/rest_v1/feed/onthisday/events/${d.getUTCMonth() + 1}/${d.getUTCDate()}`, 5000)).json();
    const nice = /\b(school|book|science|invent|discover|artist|music|library|museum|wrote|published|planet|star|animal|painter|composer)\b/i;
    const hit = (j.events || []).find(e => nice.test(e.text || '') && okForGrade({ title: e.text, snippet: e.text }, g));
    if (!hit) return null;
    const page = hit.pages && hit.pages[0];
    return { title: `On this day: ${String(hit.text).slice(0, 110)}`, snippet: `${hit.year ? 'In ' + hit.year + ', ' : ''}${hit.text} This note is from Wikimedia.`, link: page?.content_urls?.desktop?.page || 'https://en.wikipedia.org', source: 'Wikimedia', date: new Date(), tier: 'learn' };
  } catch (e) { console.warn('on this day', e.message); return null; }
}
async function sourceBooks(q) {
  if (process.env.UNIFY_MOCK_FEEDS) return { ok: true, source: 'open-library', books: [{ title: "Alice's Adventures in Wonderland", author: 'Lewis Carroll', year: 1865, gutenberg: '11' }] };
  const j = await (await get(`https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&limit=6&fields=title,author_name,first_publish_year,id_project_gutenberg`, 9000)).json();
  const books = (j.docs || []).map(d => {
    const ids = [].concat(d.id_project_gutenberg || []).map(String).filter(x => /^\d{1,6}$/.test(x));
    return { title: String(d.title || 'Untitled').slice(0, 140), author: (d.author_name && d.author_name[0]) || 'Unknown', year: d.first_publish_year || '', gutenberg: ids.length ? ids.sort((a, b) => +a - +b)[0] : '' };
  }).filter(b => b.title);
  return { ok: true, source: 'open-library', books };
}
async function sourceRead(id, title, author) {
  if (!/^\d{1,6}$/.test(String(id))) return { ok: false, error: 'That is not a Project Gutenberg book number.' };
  if (process.env.UNIFY_MOCK_FEEDS) return { ok: true, source: 'gutenberg', book: { title: title || "Alice's Adventures in Wonderland", author: author || 'Lewis Carroll', pages: [{ heading: 'Public domain', body: 'This fixture page stands in for the Gutenberg text while tests run offline.\n\nAlice was beginning to get very tired of sitting by her sister on the bank.' }] } };
  let raw = '';
  try { raw = await textStart(`https://www.gutenberg.org/cache/epub/${id}/pg${id}.txt`); } catch { raw = await textStart(`https://www.gutenberg.org/files/${id}/${id}-0.txt`); }
  const body = pgBody(raw);
  if (body.length < 80) return { ok: false, error: 'Project Gutenberg did not return a readable text for that book.' };
  const pages = [{ heading: 'Where this text comes from', body: `These pages are the opening of a public-domain book, ebook ${id} at Project Gutenberg. The school copied only the start, so you can read it here. The full book stays at gutenberg.org.` }, ...pageChunks(body, 'The book')];
  return { ok: true, source: 'gutenberg', book: { title: title || `Gutenberg ebook ${id}`, author: author || 'Public domain', pages } };
}
async function sourceTopic(q) {
  if (process.env.UNIFY_MOCK_FEEDS) return { ok: true, source: 'wikimedia', book: { title: q || 'Moon', author: 'Wikimedia', pages: [{ heading: 'Summary', body: 'The Moon is Earth\'s natural satellite. This fixture stands in for a Wikipedia extract.' }] } };
  const j = await (await get(`https://en.wikipedia.org/w/api.php?action=query&prop=extracts&explaintext=1&exchars=2200&redirects=1&titles=${encodeURIComponent(q)}&format=json`, 8000)).json();
  const page = Object.values(j.query?.pages || {})[0];
  if (!page || page.missing || !page.extract) return { ok: false, error: 'Wikimedia had no page for that.' };
  if (!okForGrade({ title: page.title, snippet: page.extract }, 5)) return { ok: false, error: 'That page is not on the school shelf.' };
  return { ok: true, source: 'wikimedia', book: { title: page.title, author: 'Wikimedia, CC BY-SA', pages: [{ heading: 'How to use this', body: 'This is a short extract from the English Wikipedia, shared under CC BY-SA. It is a starting point, not the whole article. The notes in our own school books were written here. This page was not.' }, ...pageChunks(page.extract, page.title)] } };
}
async function sourceWord(q) {
  const word = String(q || '').toLowerCase().split(/\s+/)[0] || '';
  if (!/^[a-z][a-z'-]{1,32}$/.test(word)) return { ok: false, error: 'Look up one English word.' };
  if (process.env.UNIFY_MOCK_FEEDS) return { ok: true, source: 'dictionary', book: { title: word, author: 'Free Dictionary', pages: [{ heading: word, body: 'A place where students come to learn.\n\nA near word from Datamuse: academy.' }] } };
  let def = '', phon = '';
  try {
    const j = await (await get(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`, 7000)).json();
    const entries = Array.isArray(j) ? j : [];
    const meanings = entries.flatMap(e => (e.meanings || []).map(m => ({ ...m, phonetic: e.phonetic || '' })));
    const prefer = meanings.find(m => /student|teach|learn|educat|classroom|institution/i.test(JSON.stringify(m.definitions || []))) || meanings[0];
    phon = prefer?.phonetic || '';
    def = prefer ? `${prefer.partOfSpeech || 'word'}: ${prefer.definitions?.[0]?.definition || ''}` : '';
  } catch { /* try Datamuse */ }
  let rel = [];
  try {
    const d = await (await get(`https://api.datamuse.com/words?sp=${encodeURIComponent(word)}&md=d&max=1`, 7000)).json();
    if (!def && d[0]?.defs?.[0]) def = d[0].defs[0].replace(/^[a-z]+\t/, '');
    const syn = await (await get(`https://api.datamuse.com/words?rel_syn=${encodeURIComponent(word)}&max=5`, 7000)).json();
    rel = (syn || []).map(x => x.word).filter(Boolean);
  } catch { /* one source is enough */ }
  if (!def) return { ok: false, error: 'No definition came back for that word.' };
  const body = `${phon ? phon + '\n\n' : ''}${def}${rel.length ? '\n\nNearby words from Datamuse: ' + rel.join(', ') + '.' : ''}`;
  return { ok: true, source: 'dictionary', book: { title: word, author: 'Free Dictionary and Datamuse', pages: [{ heading: word, body }, { heading: 'Use it', body: `Write one sentence of your own that uses "${word}". Do not copy the definition.` }] } };
}
async function sourcePlace(q) {
  const name = clipQ(q).toLowerCase(); const code = ISO3[name];
  if (!code) return sourceMap(q);
  if (process.env.UNIFY_MOCK_FEEDS) return { ok: true, source: 'world-bank', book: { title: q, author: 'World Bank', pages: [{ heading: 'Population', body: 'The World Bank lists a fixture population for tests. This is not a live number.' }] } };
  const j = await (await get(`https://api.worldbank.org/v2/country/${code}/indicator/SP.POP.TOTL?format=json&mrv=1`, 12000)).json();
  const row = Array.isArray(j) ? j[1]?.[0] : null;
  if (!row || row.value == null) return { ok: false, error: 'The World Bank had no recent population for that country.' };
  const who = row.country?.value || q, year = row.date, n = Math.round(row.value).toLocaleString('en-US');
  let extra = '';
  try { const w = await sourceTopic(who); extra = w.book?.pages?.find(p => p.heading !== 'How to use this')?.body || ''; } catch { /* number still stands */ }
  const pages = [{ heading: `${who}, ${year}`, body: `The World Bank lists the population of ${who} as ${n} for ${year}. That is the number of people the indicator SP.POP.TOTL reported. It is not a news story about today.` }];
  if (extra) pages.push({ heading: 'From Wikimedia', body: extra.slice(0, 900) });
  return { ok: true, source: 'world-bank', book: { title: who, author: 'World Bank and Wikimedia', pages } };
}
async function sourceEarth(lat, lon) {
  if (process.env.UNIFY_MOCK_FEEDS) return { ok: true, source: 'usgs-quake', book: { title: 'Earth desk', author: 'USGS and Open-Meteo', pages: [{ heading: 'Quake', body: 'A fixture magnitude 4.2 earthquake is listed so the desk can open offline.' }, { heading: 'Sky', body: 'Open-Meteo fixture: partly cloudy, 72 F, over the sample city.' }] } };
  const quakes = await liveLearn(6);
  const la = Number(lat), lo = Number(lon), here = Number.isFinite(la) && Number.isFinite(lo);
  const latQ = here ? la.toFixed(2) : '33.75', lonQ = here ? lo.toFixed(2) : '-84.39';
  let sky = `Open-Meteo did not answer. ${here ? '' : 'The school default city is Atlanta until a place is saved on this device.'}`;
  try {
    const w = await (await get(`https://api.open-meteo.com/v1/forecast?latitude=${latQ}&longitude=${lonQ}&current=temperature_2m,weather_code&temperature_unit=fahrenheit&timezone=auto`, 7000)).json();
    const c = w.current;
    if (c) sky = `Open-Meteo reports ${Math.round(c.temperature_2m)} F and weather code ${c.weather_code} ${here ? 'for the place saved on this device' : 'over Atlanta, the school default'}. Weather code 0 is clear. Higher codes mean cloud, rain, or snow.`;
  } catch { /* quake page can still open */ }
  const q = quakes[0];
  const pages = [{ heading: q ? 'Latest measured quake' : 'No recent quake', body: q ? `${q.title}. ${q.snippet} Source: ${q.source}.` : 'USGS did not return a magnitude 4.5 or larger earthquake just now.' }, { heading: 'The sky', body: sky }];
  return { ok: true, source: 'usgs-quake', book: { title: 'Earth desk', author: 'USGS and Open-Meteo', pages } };
}
async function sourceQuiz(grade) {
  const g = gradeNum(grade);
  if (process.env.UNIFY_MOCK_FEEDS) return { ok: true, source: 'open-trivia', book: { title: 'One review question', author: 'Open Trivia Database', pages: [{ heading: 'Question', body: 'Which planet is famous for its rings?' }, { heading: 'Decide first', body: 'Cover the next page until you have an answer.' }, { heading: 'Answer', body: 'Saturn. This fixture is not from the live trivia service.' }] } };
  const cats = g < 6 ? [17, 27, 22] : g < 9 ? [17, 19, 22, 23] : [17, 18, 19, 22, 23];
  const cat = cats[Math.floor(Math.random() * cats.length)], diff = g < 6 ? '&difficulty=easy' : g < 9 ? '&difficulty=medium' : '';
  for (let n = 0; n < 3; n++) {
    const j = await (await get(`https://opentdb.com/api.php?amount=1&type=multiple&category=${cat}${diff}`, 7000)).json();
    const row = j.results?.[0]; if (!row) continue;
    const question = ents(row.question), answer = ents(row.correct_answer), wrong = (row.incorrect_answers || []).map(ents);
    if (!okForGrade({ title: question, snippet: answer + ' ' + wrong.join(' ') }, g)) continue;
    return { ok: true, source: 'open-trivia', book: { title: ents(row.category) || 'Review question', author: 'Open Trivia Database', pages: [{ heading: 'Question', body: `${question}\n\n${[answer, ...wrong].sort().map((x, i) => `${i + 1}. ${x}`).join('\n')}` }, { heading: 'Decide first', body: 'Pick an answer before you turn the page. The next page says which one the source marked correct.' }, { heading: 'Answer', body: `The Open Trivia Database marks this correct: ${answer}.` }] } };
  }
  return { ok: false, error: 'No school-safe question came back. Try again.' };
}
async function sourceMap(q) {
  if (process.env.UNIFY_MOCK_FEEDS) return { ok: true, source: 'nominatim', book: { title: q || 'Atlanta', author: 'OpenStreetMap', pages: [{ heading: 'Where this is', body: 'Atlanta, Georgia. This fixture stands in for OpenStreetMap. Map data is credited to OpenStreetMap contributors.' }] } };
  const j = await (await get(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1`, 8000)).json();
  const hit = Array.isArray(j) ? j[0] : null;
  if (!hit) return { ok: false, error: 'No place came back. For a country population, try Kenya or Japan.' };
  return { ok: true, source: 'nominatim', book: { title: hit.name || q, author: 'OpenStreetMap', pages: [{ heading: 'Where this is', body: `${hit.display_name}.\n\nThis place name comes from OpenStreetMap. The map data is © OpenStreetMap contributors, under ODbL. It is a location, not a lesson written by this school.` }] } };
}
function poemPages(title, author, lines) {
  const pages = [{ heading: 'Public domain', body: `${title} by ${author}. PoetryDB shares this poem because it is old enough to be free to read in full. The line breaks belong to the poet.` }];
  const rows = (lines || []).map(s => String(s).trim()).filter(Boolean).slice(0, 40);
  for (let i = 0; i < rows.length; i += 8) pages.push({ heading: i ? 'Continued' : title, body: rows.slice(i, i + 8).join('\n') });
  return pages;
}
async function sourcePoem(q) {
  if (process.env.UNIFY_MOCK_FEEDS) return { ok: true, source: 'poetrydb', book: { title: 'Hope is the thing with feathers', author: 'Emily Dickinson', pages: poemPages('Hope is the thing with feathers', 'Emily Dickinson', ['Hope is the thing with feathers', 'That perches in the soul.']) } };
  let j = await (await get(`https://poetrydb.org/title/${encodeURIComponent(q)}`, 8000)).json();
  if (!Array.isArray(j)) j = await (await get(`https://poetrydb.org/author/${encodeURIComponent(q)}`, 8000)).json();
  const p = Array.isArray(j) ? j[0] : null;
  if (!p?.lines?.length) return { ok: false, error: 'No public-domain poem came back. Try a title or a poet, such as Emily Dickinson.' };
  return { ok: true, source: 'poetrydb', book: { title: p.title, author: p.author || 'Public domain', pages: poemPages(p.title, p.author || 'Unknown', p.lines) } };
}
async function sourceArt(q) {
  if (process.env.UNIFY_MOCK_FEEDS) return { ok: true, source: 'artic', book: { title: 'A quilt of birds and flowers', author: 'Art Institute of Chicago', pages: [{ heading: 'One artwork', body: 'Fixture artwork. No image is copied while tests run offline.' }] } };
  try {
    const j = await (await get(`https://api.artic.edu/api/v1/artworks/search?q=${encodeURIComponent(q)}&limit=1&fields=title,artist_display,date_display,image_id`, 8000)).json();
    const d = j.data?.[0];
    if (d?.title) {
      const artist = String(d.artist_display || 'Unknown artist').split('\n')[0];
      const image = d.image_id ? `https://www.artic.edu/iiif/2/${d.image_id}/full/843,/0/default.jpg` : '';
      return { ok: true, source: 'artic', book: { title: d.title, author: artist, pages: [{ heading: d.date_display || 'Artwork', image, body: `${d.title} is by ${artist}${d.date_display ? ', ' + d.date_display : ''}. The Art Institute of Chicago shares this record. The picture, when it loads, is theirs. This school did not redraw it.` }] } };
    }
  } catch { /* try the other museum */ }
  const j = await (await get(`https://openaccess-api.clevelandart.org/api/artworks/?q=${encodeURIComponent(q)}&has_image=1&limit=1`, 8000)).json();
  const d = j.data?.[0];
  if (!d?.title) return { ok: false, error: 'Neither museum returned an artwork for that.' };
  const artist = d.creators?.[0]?.description || 'Unknown artist';
  const note = strip(d.did_you_know || d.early_education_description || d.description || '').slice(0, 500);
  return { ok: true, source: 'cleveland-art', book: { title: d.title, author: artist, pages: [{ heading: d.creation_date || 'Artwork', image: d.images?.web?.url || '', body: `${d.title} is by ${artist}${d.creation_date ? ', ' + d.creation_date : ''}. The Cleveland Museum of Art shares it as open access.${note ? '\n\nTheir note: ' + note : ''}` }] } };
}
async function sourcePictures(q) {
  if (process.env.UNIFY_MOCK_FEEDS) return { ok: true, source: 'loc', book: { title: q, author: 'Library of Congress', pages: [{ heading: 'One item', body: 'Fixture record. The Library of Congress item is not copied while tests run offline.' }] } };
  const j = await (await get(`https://www.loc.gov/search/?q=${encodeURIComponent(q)}&fo=json&c=1`, 12000)).json();
  const items = Array.isArray(j.results) ? j.results : (j.results?.results || []);
  const it = items[0];
  if (!it) return { ok: false, error: 'The Library of Congress had no item for that.' };
  const title = strip(Array.isArray(it.title) ? it.title[0] : (it.title || 'Untitled')).slice(0, 140);
  const desc = strip(Array.isArray(it.description) ? it.description[0] : (it.description || '')).slice(0, 500);
  if (!okForGrade({ title, snippet: desc }, 5)) return { ok: false, error: 'That item is not on the school shelf.' };
  const image = Array.isArray(it.image_url) ? it.image_url[0] : (it.image_url || '');
  return { ok: true, source: 'loc', book: { title, author: 'Library of Congress', pages: [{ heading: 'From the Library of Congress', image: typeof image === 'string' ? image : '', body: `${title}.\n\n${desc || 'The record did not include a short description.'}\n\nThis is their catalog note, not a lesson written here.` }] } };
}
async function sourceArchive(q) {
  if (process.env.UNIFY_MOCK_FEEDS) return { ok: true, source: 'internet-archive', book: { title: q, author: 'Internet Archive', pages: [{ heading: 'A scan', body: 'Fixture scan. The full file stays at the Internet Archive.' }] } };
  const j = await (await get(`https://archive.org/advancedsearch.php?q=${encodeURIComponent('title:"' + q + '"')}&fl[]=identifier,title,creator,year&rows=1&output=json`, 9000)).json();
  const d = j.response?.docs?.[0];
  if (!d?.title) return { ok: false, error: 'The Internet Archive had no scan for that.' };
  const who = Array.isArray(d.creator) ? d.creator[0] : (d.creator || 'Unknown');
  return { ok: true, source: 'internet-archive', book: { title: String(d.title).slice(0, 140), author: String(who).slice(0, 80), pages: [{ heading: 'A scan, not a copy', body: `${d.title}${d.year ? ' (' + d.year + ')' : ''} is by ${who}. The Internet Archive keeps the scan under the identifier ${d.identifier}. This school does not copy the file onto the shelf. A teacher can open archive.org/details/${d.identifier} if the class should see the original.` }] } };
}
async function sourceChemical(q) {
  const name = clipQ(q);
  if (!/^[A-Za-z0-9 .'-]{2,40}$/.test(name)) return { ok: false, error: 'Type a chemical name, such as water.' };
  if (process.env.UNIFY_MOCK_FEEDS) return { ok: true, source: 'pubchem', book: { title: 'Water', author: 'PubChem', pages: [{ heading: 'Formula', body: 'The formula for water is H2O. That means 2 hydrogen atoms and 1 oxygen atom. This fixture is not a live PubChem call.' }] } };
  const j = await (await get(`https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encodeURIComponent(name)}/property/Title,MolecularFormula,MolecularWeight/JSON`, 8000)).json();
  const row = j.PropertyTable?.Properties?.[0];
  if (!row?.MolecularFormula) return { ok: false, error: 'PubChem had no formula for that name.' };
  const parts = [...String(row.MolecularFormula).matchAll(/([A-Z][a-z]?)(\d*)/g)].map(m => `${m[2] || '1'} ${m[1]}`);
  return { ok: true, source: 'pubchem', book: { title: row.Title || name, author: 'PubChem', pages: [{ heading: row.MolecularFormula, body: `PubChem lists the formula for ${row.Title || name} as ${row.MolecularFormula}. Read left to right, that is ${parts.join(', ') || row.MolecularFormula}. The molecular weight they list is ${row.MolecularWeight}. Those are measured facts from PubChem, not a lesson copied from a textbook.` }] } };
}
async function sourceSpecies(q) {
  if (process.env.UNIFY_MOCK_FEEDS) return { ok: true, source: 'gbif', book: { title: 'Monarch butterfly', author: 'GBIF and iNaturalist', pages: [{ heading: 'The name', body: 'The scientific name is Danaus plexippus. iNaturalist calls it the monarch butterfly. This fixture is not a live record.' }] } };
  const [gb, inn] = await Promise.all([
    get(`https://api.gbif.org/v1/species/match?name=${encodeURIComponent(q)}`, 8000).then(r => r.json()).catch(() => null),
    get(`https://api.inaturalist.org/v1/taxa?q=${encodeURIComponent(q)}&per_page=1`, 8000).then(r => r.json()).catch(() => null),
  ]);
  const tax = inn?.results?.[0];
  const sci = (gb && gb.matchType !== 'NONE' && gb.scientificName) || tax?.name;
  if (!sci) return { ok: false, error: 'No species record came back. Try a living thing, such as monarch butterfly.' };
  const common = tax?.preferred_common_name || '';
  const image = tax?.default_photo?.medium_url || '';
  const about = strip(tax?.wikipedia_summary || '').slice(0, 600);
  const pages = [{ heading: 'The name', image, body: `${common ? common + ' is the common name. ' : ''}The scientific name on record is ${sci}.${gb?.family ? ' GBIF files the family as ' + gb.family + '.' : ''} ${gb?.kingdom ? 'The kingdom is ' + gb.kingdom + '.' : ''}\n\nA record is a name in a database. It is not a pet, and it is not permission to touch a wild animal.` }];
  if (about && okForGrade({ title: sci, snippet: about }, 5)) pages.push({ heading: 'From iNaturalist', body: about + '\n\nThat paragraph is iNaturalist’s summary, not a page written by this school.' });
  return { ok: true, source: 'gbif', book: { title: common || sci, author: 'GBIF and iNaturalist', pages } };
}
async function sourceRiver(lat, lon) {
  if (process.env.UNIFY_MOCK_FEEDS) return { ok: true, source: 'usgs-water', book: { title: 'A nearby river gauge', author: 'USGS Water', pages: [{ heading: 'Flow', body: 'A fixture gauge reads 1,200 cubic feet per second. This is not a live reading.' }] } };
  const la = Number(lat), lo = Number(lon), here = Number.isFinite(la) && Number.isFinite(lo);
  const lat0 = here ? la : 33.75, lon0 = here ? lo : -84.39;
  const box = [lon0 - 0.2, lat0 - 0.15, lon0 + 0.2, lat0 + 0.15].map(n => n.toFixed(2)).join(',');
  const map = await (await get(`https://waterservices.usgs.gov/nwis/site/?format=mapper&bBox=${box}&siteType=ST&siteStatus=active&parameterCd=00060&outputDataTypeCd=iv`, 12000)).text();
  const site = (map.match(/sno="(\d+)"\s+sna="([^"]+)"/) || []);
  if (!site[1]) return { ok: false, error: 'No stream gauge near that place is reporting right now.' };
  const j = await (await get(`https://waterservices.usgs.gov/nwis/iv/?format=json&sites=${site[1]}&parameterCd=00060`, 10000)).json();
  const hit = (j.value?.timeSeries || []).find(s => s.values?.[0]?.value?.[0]?.value);
  if (!hit) return { ok: false, error: 'The nearest gauge did not include a flow reading.' };
  const name = site[2];
  const reading = hit.values[0].value[0];
  const cfs = Number(reading.value);
  return { ok: true, source: 'usgs-water', book: { title: name, author: 'USGS Water', pages: [{ heading: 'The reading', body: `${name} reported about ${Number.isFinite(cfs) ? Math.round(cfs).toLocaleString('en-US') : reading.value} cubic feet of water passing each second. USGS took that reading at ${reading.dateTime || 'the latest sample'}. ${here ? 'The gauge is near the place saved on this device.' : 'No place was saved, so this is a gauge near Atlanta, the school default.'}\n\nCubic feet per second is how much water passes a line in one second. It is a measurement, not a flood warning by itself.` }] } };
}
async function sourceSky(lat, lon) {
  if (process.env.UNIFY_MOCK_FEEDS) return { ok: true, source: 'nws', book: { title: 'The sky', author: 'National Weather Service', pages: [{ heading: 'Today', body: 'Fixture forecast: partly cloudy. Sunrise and sunset are sample times.' }] } };
  const la = Number(lat), lo = Number(lon), here = Number.isFinite(la) && Number.isFinite(lo);
  const latQ = here ? la.toFixed(2) : '33.75', lonQ = here ? lo.toFixed(2) : '-84.39';
  const where = here ? 'the place saved on this device' : 'Atlanta, the school default';
  const pages = [];
  try {
    const points = await (await get(`https://api.weather.gov/points/${latQ},${lonQ}`, 8000)).json();
    const forecastUrl = points.properties?.forecast;
    if (typeof forecastUrl === 'string' && forecastUrl.startsWith('https://api.weather.gov/')) {
      const fc = await (await get(forecastUrl, 8000)).json();
      const period = fc.properties?.periods?.[0];
      if (period?.detailedForecast) pages.push({ heading: period.name || 'Forecast', body: `The National Weather Service says: ${period.detailedForecast} This is for ${where}. It is their forecast, not a guess written here.` });
    }
  } catch { /* sunrise can still open */ }
  try {
    const s = await (await get(`https://api.sunrise-sunset.org/json?lat=${latQ}&lng=${lonQ}&formatted=0`, 7000)).json();
    const rise = new Date(s.results?.sunrise), set = new Date(s.results?.sunset);
    if (!isNaN(+rise) && !isNaN(+set)) pages.push({ heading: 'Sun', body: `Sunrise is ${rise.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} and sunset is ${set.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} for ${where}. Those times come from sunrise-sunset.org.` });
  } catch { /* forecast may still be there */ }
  if (!pages.length) return { ok: false, error: 'The sky sources did not answer.' };
  return { ok: true, source: 'nws', book: { title: 'The sky', author: 'National Weather Service', pages } };
}
async function sourceFacts(q) {
  if (process.env.UNIFY_MOCK_FEEDS) return { ok: true, source: 'wikidata', book: { title: q, author: 'Wikidata', pages: [{ heading: 'A short label', body: 'Wikidata’s short description is a fixture label. It is CC0 and it is not a full lesson.' }] } };
  const j = await (await get(`https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(q)}&language=en&format=json&limit=1`, 8000)).json();
  const hit = j.search?.[0];
  if (!hit?.description) return { ok: false, error: 'Wikidata had no short description for that.' };
  if (!okForGrade({ title: hit.label || q, snippet: hit.description }, 5)) return { ok: false, error: 'That label is not on the school shelf.' };
  return { ok: true, source: 'wikidata', book: { title: hit.label || q, author: 'Wikidata, CC0', pages: [{ heading: 'A short label', body: `Wikidata’s short description of ${hit.label || q} is: ${hit.description}.\n\nThat is their label, shared as CC0. It is not a lesson written by this school, and it is not the whole story.` }] } };
}
function xmlBits(xml) {
  return [...String(xml).matchAll(/<entry>([\s\S]*?)<\/entry>/g)].slice(0, 2).map(m => {
    const block = m[1];
    const title = strip((block.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || '');
    const summary = strip((block.match(/<summary[^>]*>([\s\S]*?)<\/summary>/i) || [])[1] || '').slice(0, 400);
    const who = strip((block.match(/<name>([\s\S]*?)<\/name>/i) || [])[1] || 'Unknown author');
    return { title, summary, who };
  }).filter(x => x.title && okForGrade({ title: x.title, snippet: x.summary }, 10));
}
async function sourceLaws(q) {
  if (process.env.UNIFY_MOCK_FEEDS) return { ok: true, source: 'federal-register', book: { title: q, author: 'Federal Register', pages: [{ heading: 'One document', body: 'Fixture title only. The school does not copy the rule.' }] } };
  const j = await (await get(`https://www.federalregister.gov/api/v1/documents.json?per_page=3&conditions%5Bterm%5D=${encodeURIComponent(q)}`, 9000)).json();
  const items = (j.results || []).map(it => ({ title: strip(it.title || '').slice(0, 180), abstract: strip(it.abstract || '').slice(0, 400), date: it.publication_date || '' })).filter(it => it.title && okForGrade({ title: it.title, snippet: it.abstract }, 10));
  if (!items.length) return { ok: false, error: 'The Federal Register had no school-safe document for that.' };
  return { ok: true, source: 'federal-register', book: { title: `Documents about ${q}`, author: 'Federal Register', pages: [{ heading: 'Titles, not the rule', body: 'These are official US documents. The school copies the title and a short abstract only. High-school readers should open the full document with a teacher before treating it as the law.' }, ...items.slice(0, 2).map(it => ({ heading: it.date || 'Document', body: `${it.title}${it.abstract ? '\n\n' + it.abstract : ''}` }))] } };
}
async function sourcePapers(q) {
  if (process.env.UNIFY_MOCK_FEEDS) return { ok: true, source: 'crossref', book: { title: 'Research titles', author: 'Crossref', pages: [{ heading: 'One title', body: 'Photosynthesis in school gardens. Fixture metadata only. No paper text is copied.' }] } };
  const pages = [{ heading: 'Titles only', body: 'These are titles from free research desks. The school does not copy the papers. A high-school reader should open the original with a teacher.' }];
  try {
    const j = await (await get(`https://api.crossref.org/works?query=${encodeURIComponent(q)}&rows=2&select=title,author,issued,URL,container-title`, 8000)).json();
    for (const it of j.message?.items || []) {
      const title = ents((it.title && it.title[0]) || '');
      const who = (it.author && it.author[0]) ? [it.author[0].family, it.author[0].given].filter(Boolean).join(', ') : 'Unknown author';
      const year = it.issued?.['date-parts']?.[0]?.[0] || '';
      if (title && okForGrade({ title, snippet: who }, 10)) pages.push({ heading: String(year || 'Crossref'), body: `${title}\n\n${who}. Crossref lists the title only.` });
    }
  } catch { /* the other desks can still answer */ }
  try {
    const xml = await (await get(`https://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(q)}&start=0&max_results=1`, 8000)).text();
    for (const bit of xmlBits(xml)) pages.push({ heading: 'arXiv', body: `${bit.title}\n\n${bit.who}. ${bit.summary}` });
  } catch { /* optional */ }
  try {
    const j = await (await get(`https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=${encodeURIComponent(q)}&format=json&pageSize=1`, 8000)).json();
    const it = j.resultList?.result?.[0];
    const title = strip(it?.title || '');
    const abs = strip(it?.abstractText || '').slice(0, 400);
    if (title && okForGrade({ title, snippet: abs }, 10)) pages.push({ heading: 'Europe PMC', body: `${title}\n\n${it.authorString || 'Unknown author'}. ${abs}` });
  } catch { /* optional */ }
  try {
    const j = await (await get(`https://doaj.org/api/search/articles/${encodeURIComponent(q)}?pageSize=1`, 8000)).json();
    const bib = j.results?.[0]?.bibjson;
    const title = strip(bib?.title || '');
    const abs = strip(bib?.abstract || '').slice(0, 400);
    if (title && okForGrade({ title, snippet: abs }, 10)) pages.push({ heading: 'DOAJ', body: `${title}\n\n${abs || 'DOAJ listed the title. No abstract was included.'}` });
  } catch { /* optional */ }
  if (pages.length < 2) return { ok: false, error: 'No school-safe research titles came back.' };
  return { ok: true, source: 'crossref', book: { title: `Papers about ${q}`, author: 'Open research desks', pages } };
}
async function sourcesQuery(op, q, extra = {}) {
  const query = clipQ(q);
  try {
    if (op === 'books') { if (query.length < 2) return { ok: false, error: 'Type a title or subject.' }; return await sourceBooks(query); }
    if (op === 'read') return await sourceRead(extra.id, query, extra.author || '');
    if (op === 'topic') { if (query.length < 2) return { ok: false, error: 'Type a topic.' }; return await sourceTopic(query); }
    if (op === 'word') return await sourceWord(query);
    if (op === 'place') return await sourcePlace(query);
    if (op === 'earth') return await sourceEarth(extra.lat, extra.lon);
    if (op === 'poem') { if (query.length < 2) return { ok: false, error: 'Type a poem title or a poet.' }; return await sourcePoem(query); }
    if (op === 'art') { if (query.length < 2) return { ok: false, error: 'Type an artwork or a subject, such as sunflower.' }; return await sourceArt(query); }
    if (op === 'pictures') { if (query.length < 2) return { ok: false, error: 'Type what picture or map you want.' }; return await sourcePictures(query); }
    if (op === 'archive') { if (query.length < 2) return { ok: false, error: 'Type a title to look up in the Internet Archive.' }; return await sourceArchive(query); }
    if (op === 'chemical') return await sourceChemical(query);
    if (op === 'species') { if (query.length < 2) return { ok: false, error: 'Type a living thing, such as monarch butterfly.' }; return await sourceSpecies(query); }
    if (op === 'river') return await sourceRiver(extra.lat, extra.lon);
    if (op === 'sky') return await sourceSky(extra.lat, extra.lon);
    if (op === 'facts') { if (query.length < 2) return { ok: false, error: 'Type a thing or a place.' }; return await sourceFacts(query); }
    if (op === 'quiz') return await sourceQuiz(extra.grade || '6');
    if (op === 'papers') { if (gradeNum(extra.grade || '6') < 9) return { ok: false, error: 'Research titles are for high school.' }; if (query.length < 2) return { ok: false, error: 'Type a subject.' }; return await sourcePapers(query); }
    if (op === 'laws') { if (gradeNum(extra.grade || '6') < 9) return { ok: false, error: 'Official documents are for high school.' }; if (query.length < 2) return { ok: false, error: 'Type a subject.' }; return await sourceLaws(query); }
    return { ok: false, error: 'Unknown source.' };
  } catch (e) { console.warn('source', op, e.message); return { ok: false, error: 'That source did not answer.' }; }
}

/* ---------- HTTP ---------- */
// Serves the UNIFY academy (repo root) + the news feed API.
//   /                  -> index.html (academy shell: hallway + auditorium + newsroom)
//   /*.html            -> pages at the repo root
//   /assets/unify/...  -> public/assets/unify/...
//   /demo/dist/...     -> built auditorium bundle (npm run build)
//   /api/broadcast     -> live weather + local/national/world stories
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.css': 'text/css', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json', '.md': 'text/markdown; charset=utf-8' };
function resolveStatic(pathname) {
  let p = decodeURIComponent(pathname);
  if (p === '/') p = '/index.html';
  let file;
  if (p === '/phone') p = '/phone.html';
  if (/^\/[\w-]+\.html$/.test(p) || /^\/[\w-]+\.(webmanifest|js|svg)$/.test(p) || /^\/[\w-]+\.webmanifest$/.test(p) || /^\/icon-(180|192|512)\.png$/.test(p) || /^\/(vendor|curriculum)\/[\w./-]+$/.test(p) && !p.includes('..')) file = path.join(root, p);
  else if (p.startsWith('/assets/')) file = path.join(root, 'public', p);
  else if (p.startsWith('/demo/dist/')) file = path.join(root, p);
  else return null;
  file = path.normalize(file);
  return file.startsWith(root + path.sep) && MIME[path.extname(file)] ? file : null;
}
http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://x'); res.setHeader('Access-Control-Allow-Origin', '*');
  if (u.pathname === '/api/sources') {
    const q = u.searchParams;
    const d = await sourcesQuery(q.get('op') || '', q.get('q') || '', { grade: q.get('grade') || '6', id: q.get('id') || '', author: q.get('author') || '', lat: q.get('lat'), lon: q.get('lon') });
    const status = d.error === 'Unknown source.' ? 400 : 200;
    res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store' }); res.end(JSON.stringify(d));
    return;
  }
  if (u.pathname === '/api/broadcast') {
    try { const q = u.searchParams, d = await build({ city: q.get('city'), lat: q.get('lat'), lon: q.get('lon'), tz: q.get('tz'), grade: q.get('grade') || '6', edition: q.get('edition'), limit: q.get('limit') });
      res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify(d)); }
    catch (e) { res.writeHead(502, { 'content-type': 'application/json' }); res.end(JSON.stringify({ error: String(e.message) })); }
    return;
  }
  if (u.pathname === '/api/chat' && req.method === 'POST') {
    try { const chunks = []; let n = 0; for await (const c of req) { n += c.length; if (n > 16000) throw new Error('too big'); chunks.push(c); }
      if (!chatAllowed(req.socket.remoteAddress || 'x')) { res.writeHead(429); return res.end('slow down'); }
      const r = await chat(JSON.parse(Buffer.concat(chunks).toString())); if (!r) { res.writeHead(501); return res.end('no model'); }
      res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify(r)); }
    catch (e) { res.writeHead(502); res.end('chat failed'); }
    return;
  }
  try {
    const file = resolveStatic(u.pathname);
    if (!file) { res.writeHead(404); return res.end('not found'); }
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': MIME[path.extname(file)], 'cache-control': file.endsWith('.png') ? 'public, max-age=3600' : 'no-cache' });
    res.end(body);
  } catch { res.writeHead(404); res.end('not found'); }
}).listen(PORT, '0.0.0.0', () => console.log(`UNIFY academy on http://0.0.0.0:${PORT}  (feed: /api/broadcast?city=Atlanta&grade=6)`));
