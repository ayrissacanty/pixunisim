/** Live school sources. The school server is tried first. If it is off, the browser calls the same
 *  free APIs directly. Gutenberg full text needs the server, because that host does not allow the browser. */
export interface SourcePage { heading: string; body: string; image?: string }
export interface SourceBook { title: string; author: string; year?: string | number; gutenberg?: string; pages?: SourcePage[] }
export interface SourceResult { ok: boolean; error?: string; source?: string; books?: SourceBook[]; book?: SourceBook }

const ISO3: Record<string, string> = { "united states": "USA", usa: "USA", us: "USA", america: "USA", france: "FRA", japan: "JPN", kenya: "KEN", brazil: "BRA", india: "IND", canada: "CAN", mexico: "MEX", "united kingdom": "GBR", uk: "GBR", britain: "GBR", england: "GBR", germany: "DEU", italy: "ITA", spain: "ESP", china: "CHN", australia: "AUS", egypt: "EGY", nigeria: "NGA", "south africa": "ZAF", ghana: "GHA", "south korea": "KOR", korea: "KOR", argentina: "ARG", chile: "CHL", peru: "PER", colombia: "COL", ethiopia: "ETH", morocco: "MAR", "new zealand": "NZL", ireland: "IRL", sweden: "SWE", norway: "NOR", greece: "GRC", turkey: "TUR", poland: "POL", ukraine: "UKR", indonesia: "IDN", philippines: "PHL", vietnam: "VNM", thailand: "THA", pakistan: "PAK", bangladesh: "BGD", israel: "ISR", finland: "FIN", portugal: "PRT", netherlands: "NLD", belgium: "BEL", switzerland: "CHE", austria: "AUT", iceland: "ISL" };

export function studentGrade(): string {
  try {
    const age = JSON.parse(localStorage.getItem("unify.social.v1") || "null")?.profile?.avatar?.age;
    return age === "hs" ? "10" : age === "g68" ? "7" : age === "g35" ? "4" : age === "k2" ? "2" : "6";
  } catch { return "6"; }
}
function savedPlace(): { lat?: string; lon?: string } {
  try {
    const l = JSON.parse(localStorage.getItem("unify.loc") || "null");
    if (l && l.lat != null && l.lon != null) return { lat: String(l.lat), lon: String(l.lon) };
  } catch { /* no place saved */ }
  return {};
}
async function getJson(url: string): Promise<any> {
  const ac = new AbortController(), t = setTimeout(() => ac.abort(), 8000);
  try {
    const r = await fetch(url, { signal: ac.signal, headers: { Accept: "application/json" } });
    if (!r.ok) throw new Error(String(r.status));
    return await r.json();
  } finally { clearTimeout(t); }
}
function chunks(text: string, heading: string): SourcePage[] {
  let rest = text.replace(/\s+\n/g, "\n").trim(); const out: SourcePage[] = [];
  while (rest && out.length < 6) {
    let cut = rest.length <= 700 ? rest.length : rest.lastIndexOf(". ", 700);
    if (cut < 200) cut = Math.min(700, rest.length); else cut += 1;
    out.push({ heading: out.length ? "Continued" : heading, body: rest.slice(0, cut).trim() });
    rest = rest.slice(cut).trim();
  }
  return out;
}
const ents = (s: string) => s.replace(/&/g, "&").replace(/"/g, '"').replace(/&#039;|'/g, "'").replace(/</g, "<").replace(/>/g, ">").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n));

async function direct(op: string, q: string, extra: { id?: string; grade?: string; lat?: string; lon?: string; author?: string }): Promise<SourceResult> {
  if (op === "read") return { ok: false, error: "This public-domain book needs the school server to copy the opening pages. The shelf still has the school books." };
  if (op === "books") {
    const j = await getJson(`https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&limit=6&fields=title,author_name,first_publish_year,id_project_gutenberg`);
    const books: SourceBook[] = (j.docs || []).map((d: any) => {
      const ids = [].concat(d.id_project_gutenberg || []).map(String).filter((x) => /^\d{1,6}$/.test(x));
      return { title: String(d.title || "Untitled").slice(0, 140), author: d.author_name?.[0] || "Unknown", year: d.first_publish_year || "", gutenberg: ids.sort((a, b) => +a - +b)[0] || "" };
    }).filter((b: SourceBook) => b.title);
    return { ok: true, source: "open-library", books };
  }
  if (op === "topic") {
    const j = await getJson(`https://en.wikipedia.org/w/api.php?action=query&prop=extracts&explaintext=1&exchars=1800&redirects=1&origin=*&titles=${encodeURIComponent(q)}&format=json`);
    const page = Object.values(j.query?.pages || {})[0] as any;
    if (!page?.extract) return { ok: false, error: "Wikimedia had no page for that." };
    return { ok: true, source: "wikimedia", book: { title: page.title, author: "Wikimedia, CC BY-SA", pages: [{ heading: "How to use this", body: "This extract is from the English Wikipedia, shared under CC BY-SA. It is a starting point, not the whole article." }, ...chunks(page.extract, page.title)] } };
  }
  if (op === "word") {
    const word = q.toLowerCase().split(/\s+/)[0] || "";
    if (!/^[a-z][a-z'-]{1,32}$/.test(word)) return { ok: false, error: "Look up one English word." };
    let def = "", phon = "";
    try {
      const j = await getJson(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
      const entries = Array.isArray(j) ? j : [];
      const meanings = entries.flatMap((e: any) => (e.meanings || []).map((m: any) => ({ ...m, phonetic: e.phonetic || "" })));
      const prefer = meanings.find((m: any) => /student|teach|learn|educat|classroom|institution/i.test(JSON.stringify(m.definitions || []))) || meanings[0];
      phon = prefer?.phonetic || ""; def = prefer ? `${prefer.partOfSpeech || "word"}: ${prefer.definitions?.[0]?.definition || ""}` : "";
    } catch { /* Datamuse can still define it */ }
    const syn = await getJson(`https://api.datamuse.com/words?rel_syn=${encodeURIComponent(word)}&max=5`).catch(() => []);
    if (!def) {
      const d = await getJson(`https://api.datamuse.com/words?sp=${encodeURIComponent(word)}&md=d&max=1`);
      def = d[0]?.defs?.[0]?.replace(/^[a-z]+\t/, "") || "";
    }
    if (!def) return { ok: false, error: "No definition came back for that word." };
    const rel = (syn || []).map((x: any) => x.word).filter(Boolean);
    return { ok: true, source: "dictionary", book: { title: word, author: "Free Dictionary and Datamuse", pages: [{ heading: word, body: `${phon ? phon + "\n\n" : ""}${def}${rel.length ? "\n\nNearby words: " + rel.join(", ") + "." : ""}` }] } };
  }
  if (op === "place") {
    const code = ISO3[q.trim().toLowerCase()];
    if (!code) return { ok: false, error: "Try a country name, such as Kenya or Japan." };
    const j = await getJson(`https://api.worldbank.org/v2/country/${code}/indicator/SP.POP.TOTL?format=json&mrv=1`);
    const row = j?.[1]?.[0];
    if (!row || row.value == null) return { ok: false, error: "The World Bank had no recent population for that country." };
    const who = row.country?.value || q, n = Math.round(row.value).toLocaleString("en-US");
    return { ok: true, source: "world-bank", book: { title: who, author: "World Bank", pages: [{ heading: `${who}, ${row.date}`, body: `The World Bank lists the population of ${who} as ${n} for ${row.date}. That is indicator SP.POP.TOTL, not a news story about today.` }] } };
  }
  if (op === "earth") {
    const j = await getJson("https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&limit=1&minmagnitude=4.5&orderby=time");
    const f = j.features?.[0], p = f?.properties;
    const la = extra.lat || "33.75", lo = extra.lon || "-84.39", here = !!extra.lat;
    let sky = "Open-Meteo did not answer.";
    try {
      const w = await getJson(`https://api.open-meteo.com/v1/forecast?latitude=${la}&longitude=${lo}&current=temperature_2m,weather_code&temperature_unit=fahrenheit&timezone=auto`);
      if (w.current) sky = `Open-Meteo reports ${Math.round(w.current.temperature_2m)} F and weather code ${w.current.weather_code} ${here ? "for the place saved on this device" : "over Atlanta, the school default"}.`;
    } catch { /* quake page still opens */ }
    return { ok: true, source: "usgs-quake", book: { title: "Earth desk", author: "USGS and Open-Meteo", pages: [{ heading: p ? "Latest measured quake" : "No recent quake", body: p ? `Magnitude ${Number(p.mag).toFixed(1)} earthquake recorded ${p.place}. The number is the magnitude. This is not a damage report.` : "USGS did not return a recent earthquake." }, { heading: "The sky", body: sky }] } };
  }
  if (op === "quiz") {
    const g = +(extra.grade || "6"), cat = g < 6 ? 17 : g < 9 ? 22 : 23, diff = g < 6 ? "&difficulty=easy" : g < 9 ? "&difficulty=medium" : "";
    const j = await getJson(`https://opentdb.com/api.php?amount=1&type=multiple&category=${cat}${diff}`);
    const row = j.results?.[0]; if (!row) return { ok: false, error: "No question came back." };
    const question = ents(row.question), answer = ents(row.correct_answer), wrong = (row.incorrect_answers || []).map(ents);
    return { ok: true, source: "open-trivia", book: { title: ents(row.category), author: "Open Trivia Database", pages: [{ heading: "Question", body: `${question}\n\n${[answer, ...wrong].sort().map((x, i) => `${i + 1}. ${x}`).join("\n")}` }, { heading: "Decide first", body: "Pick an answer before you turn the page." }, { heading: "Answer", body: `The Open Trivia Database marks this correct: ${answer}.` }] } };
  }
  if (op === "poem") {
    let j = await getJson(`https://poetrydb.org/title/${encodeURIComponent(q)}`);
    if (!Array.isArray(j)) j = await getJson(`https://poetrydb.org/author/${encodeURIComponent(q)}`);
    const p = Array.isArray(j) ? j[0] : null;
    if (!p?.lines?.length) return { ok: false, error: "No public-domain poem came back." };
    const lines = p.lines.slice(0, 24).join("\n");
    return { ok: true, source: "poetrydb", book: { title: p.title, author: p.author || "Public domain", pages: [{ heading: "Public domain", body: `${p.title} by ${p.author}. PoetryDB shares this poem because it is free to read in full.` }, { heading: p.title, body: lines }] } };
  }
  if (op === "art") {
    const j = await getJson(`https://api.artic.edu/api/v1/artworks/search?q=${encodeURIComponent(q)}&limit=1&fields=title,artist_display,date_display,image_id`);
    const d = j.data?.[0];
    if (!d?.title) return { ok: false, error: "No artwork came back." };
    const artist = String(d.artist_display || "Unknown artist").split("\n")[0];
    return { ok: true, source: "artic", book: { title: d.title, author: artist, pages: [{ heading: d.date_display || "Artwork", image: d.image_id ? `https://www.artic.edu/iiif/2/${d.image_id}/full/843,/0/default.jpg` : "", body: `${d.title} is by ${artist}. The Art Institute of Chicago shares this record. This school did not redraw it.` }] } };
  }
  if (op === "chemical") {
    const j = await getJson(`https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encodeURIComponent(q)}/property/Title,MolecularFormula,MolecularWeight/JSON`);
    const row = j.PropertyTable?.Properties?.[0];
    if (!row?.MolecularFormula) return { ok: false, error: "PubChem had no formula for that name." };
    return { ok: true, source: "pubchem", book: { title: row.Title || q, author: "PubChem", pages: [{ heading: row.MolecularFormula, body: `PubChem lists the formula for ${row.Title || q} as ${row.MolecularFormula}. The molecular weight they list is ${row.MolecularWeight}.` }] } };
  }
  if (op === "species") {
    const inn = await getJson(`https://api.inaturalist.org/v1/taxa?q=${encodeURIComponent(q)}&per_page=1`);
    const tax = inn.results?.[0];
    if (!tax?.name) return { ok: false, error: "No species record came back." };
    return { ok: true, source: "inaturalist", book: { title: tax.preferred_common_name || tax.name, author: "iNaturalist", pages: [{ heading: "The name", image: tax.default_photo?.medium_url || "", body: `${tax.preferred_common_name ? tax.preferred_common_name + " is the common name. " : ""}The scientific name on record is ${tax.name}. A record is a name in a database, not permission to touch a wild animal.` }] } };
  }
  if (op === "facts") {
    const j = await getJson(`https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(q)}&language=en&format=json&origin=*&limit=1`);
    const hit = j.search?.[0];
    if (!hit?.description) return { ok: false, error: "Wikidata had no short description for that." };
    return { ok: true, source: "wikidata", book: { title: hit.label || q, author: "Wikidata, CC0", pages: [{ heading: "A short label", body: `Wikidata’s short description of ${hit.label || q} is: ${hit.description}. That label is CC0. It is not a full lesson.` }] } };
  }
  if (op === "sky") {
    const la = extra.lat || "33.75", lo = extra.lon || "-84.39";
    const s = await getJson(`https://api.sunrise-sunset.org/json?lat=${la}&lng=${lo}&formatted=0`);
    const rise = new Date(s.results?.sunrise), set = new Date(s.results?.sunset);
    if (isNaN(+rise)) return { ok: false, error: "Sunrise times did not come back." };
    return { ok: true, source: "sunrise-sunset", book: { title: "The sky", author: "sunrise-sunset.org", pages: [{ heading: "Sun", body: `Sunrise is ${rise.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })} and sunset is ${set.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}. Those times come from sunrise-sunset.org.` }] } };
  }
  return { ok: false, error: "That source did not answer." };
}

export async function askSource(op: string, q = "", extra: { id?: string; author?: string } = {}): Promise<SourceResult> {
  const grade = studentGrade(), place = savedPlace();
  const p = new URLSearchParams({ op, q, grade });
  if (extra.id) p.set("id", extra.id);
  if (extra.author) p.set("author", extra.author);
  if (place.lat) { p.set("lat", place.lat); p.set("lon", place.lon || ""); }
  try {
    const ac = new AbortController(), t = setTimeout(() => ac.abort(), 22000);
    const r = await fetch("/api/sources?" + p.toString(), { cache: "no-store", signal: ac.signal });
    clearTimeout(t);
    if (r.ok) return await r.json();
  } catch { /* static hosting has no school server; call the public APIs */ }
  try { return await direct(op, q, { ...extra, grade, ...place }); }
  catch { return { ok: false, error: "That source did not answer." }; }
}
