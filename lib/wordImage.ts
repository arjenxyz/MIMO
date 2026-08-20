/**
 * Word → clear, learner-friendly image URL (no Supabase storage).
 *
 * Cascade: Wikidata (strict P31 + P18) → Wikipedia summary → Openverse.
 * Abstract / unmatched words return null so UI can show a placeholder.
 */

const UA = { "User-Agent": "MIMO-LanguageApp/1.0 (english-vocabulary-learning)" };
const FETCH_MS = 8_000;

/** Concrete / teachable instance-of (P31) — real Wikidata IDs (+ new fruit class). */
const ALLOW_P31 = new Set([
  "Q3314483", // fruit
  "Q140646522", // fruit (newer Wikidata class used by apple etc.)
  "Q11093", // vegetable
  "Q2095", // food
  "Q25403900", // food ingredient
  "Q729", // animal
  "Q16521", // taxon (species etc.)
  "Q55983715", // organisms known by a particular common name
  "Q39546", // vehicle
  "Q1420", // automobile
  "Q11460", // clothing
  "Q41176", // building
  "Q35140", // utensil / tool-like
  "Q11019", // machine
  "Q34379", // musical instrument
  "Q488383", // object
  "Q223557", // physical object
  "Q4406616", // concrete object
  "Q8205328", // artificial physical object
  "Q2424752", // product
  "Q756", // plant
  "Q918890", // plant structure
  "Q1310239", // food product
  "Q19861951", // type of food or dish
]);

/** Never use these senses for vocabulary images. */
const DENY_P31 = new Set([
  "Q5", // human
  "Q215627", // person
  "Q43229", // organization
  "Q4830453", // business enterprise
  "Q783794", // company
  "Q6881511", // enterprise
  "Q431289", // brand
  "Q167270", // trademark
  "Q17141", // brand (user)
  "Q11635", // company (user-listed)
  "Q202444", // given name
  "Q3409032", // unisex given name
  "Q101352", // family name
  "Q4167410", // disambiguation page
  "Q11424", // film
  "Q5398426", // television series
  "Q482994", // album
  "Q7366", // song
  "Q7889", // video game
  "Q215380", // musical group / band
  "Q7397", // software
  "Q35127", // website
  "Q11032", // newspaper
  "Q486972", // human settlement
  "Q515", // city
  "Q3957", // town
  "Q19307174", // streaming media
  "Q15590336", // music streaming service
]);

const CONCRETE_DESC =
  /\b(fruit|vegetable|food|animal|mammal|bird|fish|insect|dog|cat|vehicle|car|automobile|building|house|home|clothing|garment|tool|plant|tree|flower|object|device|furniture|kitchen|toy)\b/;

const ABSTRACT_DESC =
  /\b(emotion|feeling|concept|philosophy|quality|abstract|idea|principle|virtue|love|luck|chance|coincidence)\b/;

export async function findWordImageUrl(english: string): Promise<string | null> {
  const candidates = await findWordImageCandidates(english, { limit: 1 });
  return candidates[0] ?? null;
}

/** Ranked image URLs for a word — used to let learners swap mismatched photos. */
export async function findWordImageCandidates(
  english: string,
  opts?: { exclude?: string[]; limit?: number }
): Promise<string[]> {
  const query = normalizeQuery(english);
  if (!query) return [];

  const exclude = new Set((opts?.exclude ?? []).map(normalizeUrlKey).filter(Boolean));
  const limit = Math.min(12, Math.max(1, opts?.limit ?? 8));

  const scored: Array<{ url: string; score: number }> = [];

  const wikidata = await withTimeout(searchWikidataCandidates(query), FETCH_MS);
  if (wikidata) scored.push(...wikidata);

  const wiki = await withTimeout(searchWikipediaSummary(query), FETCH_MS);
  if (wiki) scored.push({ url: wiki, score: 55 });

  const openverse = await withTimeout(searchOpenverseCandidates(query), FETCH_MS);
  if (openverse) scored.push(...openverse);

  scored.sort((a, b) => b.score - a.score);

  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of scored) {
    const key = normalizeUrlKey(item.url);
    if (!key || seen.has(key) || exclude.has(key)) continue;
    seen.add(key);
    out.push(item.url);
    if (out.length >= limit) break;
  }
  return out;
}

function normalizeUrlKey(url: string) {
  return url.trim().split("?")[0].toLowerCase();
}

function normalizeQuery(raw: string) {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z\s'-]/gi, "")
    .replace(/\s+/g, " ")
    .slice(0, 60);
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  try {
    return await Promise.race([
      promise,
      new Promise<null>((resolve) => {
        setTimeout(() => resolve(null), ms);
      }),
    ]);
  } catch {
    return null;
  }
}

function commonsFileUrl(filename: string, width = 800) {
  const clean = filename.replace(/ /g, "_");
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(clean)}?width=${width}`;
}

function isRasterImageFile(filename: string) {
  return /\.(jpe?g|png|webp)$/i.test(filename);
}

type WikiSearchHit = {
  id: string;
  label?: string;
  description?: string;
  aliases?: string[];
};

type WikidataEntity = {
  labels?: { en?: { value?: string } };
  descriptions?: { en?: { value?: string } };
  aliases?: { en?: Array<{ value?: string }> };
  claims?: {
    P18?: Array<{ mainsnak?: { datavalue?: { value?: string } } }>;
    P31?: Array<{
      mainsnak?: { datavalue?: { value?: { id?: string } } };
    }>;
  };
};

async function searchWikidataCandidates(
  query: string
): Promise<Array<{ url: string; score: number }>> {
  const searchUrl = new URL("https://www.wikidata.org/w/api.php");
  searchUrl.searchParams.set("action", "wbsearchentities");
  searchUrl.searchParams.set("search", query);
  searchUrl.searchParams.set("language", "en");
  searchUrl.searchParams.set("uselang", "en");
  searchUrl.searchParams.set("type", "item");
  searchUrl.searchParams.set("limit", "10");
  searchUrl.searchParams.set("format", "json");
  searchUrl.searchParams.set("origin", "*");

  const searchRes = await fetch(searchUrl.toString(), {
    headers: UA,
    next: { revalidate: 86400 },
  });
  if (!searchRes.ok) return [];

  const searchData = (await searchRes.json()) as { search?: WikiSearchHit[] };
  const hits = searchData.search ?? [];
  if (hits.length === 0) return [];

  const ids = hits.map((h) => h.id);
  const entityUrl = new URL("https://www.wikidata.org/w/api.php");
  entityUrl.searchParams.set("action", "wbgetentities");
  entityUrl.searchParams.set("ids", ids.join("|"));
  entityUrl.searchParams.set("props", "claims|labels|descriptions|aliases");
  entityUrl.searchParams.set("languages", "en");
  entityUrl.searchParams.set("format", "json");
  entityUrl.searchParams.set("origin", "*");

  const entityRes = await fetch(entityUrl.toString(), {
    headers: UA,
    next: { revalidate: 86400 },
  });
  if (!entityRes.ok) return [];

  const entityData = (await entityRes.json()) as {
    entities?: Record<string, WikidataEntity>;
  };

  type Candidate = { id: string; score: number; file: string };
  const candidates: Candidate[] = [];

  for (const hit of hits) {
    const entity = entityData.entities?.[hit.id];
    if (!entity) continue;

    const p31Ids = (entity.claims?.P31 ?? [])
      .map((c) => c.mainsnak?.datavalue?.value?.id)
      .filter((id): id is string => Boolean(id));

    if (p31Ids.length === 0) continue;
    if (p31Ids.some((id) => DENY_P31.has(id))) continue;

    const allowedType = p31Ids.some((id) => ALLOW_P31.has(id));
    const label = (entity.labels?.en?.value ?? hit.label ?? "").toLowerCase().trim();
    const description = (
      entity.descriptions?.en?.value ??
      hit.description ??
      ""
    ).toLowerCase();
    const aliases = (entity.aliases?.en ?? [])
      .map((a) => (a.value ?? "").toLowerCase().trim())
      .filter(Boolean);

    const concreteFallback =
      label === query && CONCRETE_DESC.test(description) && !ABSTRACT_DESC.test(description);
    if (!allowedType && !concreteFallback) continue;
    if (ABSTRACT_DESC.test(description) && !allowedType) continue;

    const filenames = (entity.claims?.P18 ?? [])
      .map((c) => c.mainsnak?.datavalue?.value)
      .filter((f): f is string => typeof f === "string" && isRasterImageFile(f));

    if (filenames.length === 0) continue;

    let score = 0;
    if (label === query) score += 30;
    if (description.includes(query)) score += 20;
    if (aliases.some((a) => a === query || a.includes(query))) score += 10;
    if (CONCRETE_DESC.test(description)) score += 15;
    if (allowedType) score += 10;

    if (score < 50) continue;
    filenames.forEach((file, i) => {
      candidates.push({ id: hit.id, score: score - i, file });
    });
  }

  candidates.sort((a, b) => b.score - a.score);
  return candidates.map((c) => ({ url: commonsFileUrl(c.file), score: c.score }));
}

async function searchWikipediaSummary(query: string): Promise<string | null> {
  const title = query
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join("_");

  const res = await fetch(
    `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
    { headers: UA, next: { revalidate: 86400 } }
  );
  if (!res.ok) return null;

  const data = (await res.json()) as {
    type?: string;
    title?: string;
    description?: string;
    extract?: string;
    thumbnail?: { source?: string; width?: number; height?: number };
    originalimage?: { source?: string; width?: number; height?: number };
  };

  if (data.type && data.type !== "standard") return null;

  const desc = (data.description ?? "").toLowerCase();
  if (
    /\b(company|brand|film|album|given name|disambiguation|human|singer|actor|emotion|concept|philosophy)\b/.test(
      desc
    )
  ) {
    return null;
  }
  if (ABSTRACT_DESC.test(desc)) return null;

  const thumb = data.thumbnail;
  if (!thumb?.source || (thumb.width ?? 0) < 200 || (thumb.height ?? 0) < 200) {
    return null;
  }

  const extract = (data.extract ?? "").toLowerCase();
  const q = query.toLowerCase();
  const occurrences = extract.split(q).length - 1;
  const firstWords = extract.split(/\s+/).slice(0, 100).join(" ");

  let score = 0;
  if (occurrences >= 3) score += 15;
  if (firstWords.includes(q)) score += 10;
  if ((data.title ?? "").toLowerCase() === q) score += 20;
  if (desc.includes(q)) score += 10;

  if (score < 40) return null;

  const src = data.originalimage?.source || thumb.source;
  return src ? src.split("?")[0] : null;
}

type OpenverseResult = {
  url?: string;
  thumbnail?: string;
  title?: string;
  description?: string | null;
  mature?: boolean;
  category?: string | null;
  license?: string | null;
  width?: number | null;
  height?: number | null;
  tags?: Array<{ name?: string }>;
};

async function searchOpenverseCandidates(
  query: string
): Promise<Array<{ url: string; score: number }>> {
  if (isLikelyAbstract(query)) return [];

  const queries = [
    `"${query} object"`,
    `"${query} illustration"`,
    `"${query} photograph"`,
    `"${query}"`,
  ];

  const scored: Array<{ url: string; score: number }> = [];
  const seen = new Set<string>();

  for (const q of queries) {
    const results = await fetchOpenverseResults(q);
    for (const r of results.slice(0, 12)) {
      const score = scoreOpenverse(query, r);
      if (score < 40) continue;
      const url = r.url || r.thumbnail;
      if (!url) continue;
      const key = normalizeUrlKey(url);
      if (seen.has(key)) continue;
      seen.add(key);
      scored.push({ url, score });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  return scored;
}

function isLikelyAbstract(query: string) {
  return /^(love|hate|hope|fear|luck|fate|serendipity|freedom|justice|peace|anger|joy|sorrow|beauty|truth|faith|courage|wisdom|happiness|sadness|emotion|idea|concept|thought)$/i.test(
    query
  );
}

async function fetchOpenverseResults(query: string) {
  const url = new URL("https://api.openverse.org/v1/images/");
  url.searchParams.set("q", query);
  url.searchParams.set("page_size", "10");
  url.searchParams.set("mature", "false");

  const res = await fetch(url.toString(), {
    headers: UA,
    next: { revalidate: 86400 },
  });
  if (!res.ok) return [] as OpenverseResult[];

  const data = (await res.json()) as { results?: OpenverseResult[] };
  return (data.results ?? []).filter((r) => {
    if (r.mature) return false;
    if (!(r.url || r.thumbnail)) return false;
    const w = r.width ?? 0;
    const h = r.height ?? 0;
    if (w > 0 && h > 0 && (w < 400 || h < 400)) return false;
    return true;
  });
}

function scoreOpenverse(query: string, result: OpenverseResult) {
  const q = query.toLowerCase();
  const title = (result.title ?? "").toLowerCase();
  const description = (result.description ?? "").toLowerCase();
  const tags = (result.tags ?? []).map((t) => (t.name ?? "").toLowerCase());
  const category = (result.category ?? "").toLowerCase();
  const license = (result.license ?? "").toLowerCase();
  const words = new Set(title.split(/[^a-z0-9]+/).filter(Boolean));

  if (/\b(logo|screenshot|map|chart|graph|poster|banner|icon)\b/.test(title)) {
    return -100;
  }
  if (category === "logo" || category === "screenshot" || category === "map") {
    return -100;
  }

  // Require the query as a whole word in title or exact tag.
  const titleHit = title === q || words.has(q);
  const tagHit = tags.some((t) => t === q);
  if (!titleHit && !tagHit) return -100;

  let score = 0;
  if (title === q) score += 25;
  else if (titleHit) score += 20;
  if (tagHit) score += 15;
  if (description.includes(q)) score += 10;

  if (category === "photograph") score += 10;
  else if (category === "illustration") score += 5;

  if (license === "cc0" || license === "cc-by" || license.startsWith("cc-by")) {
    score += 5;
  }

  return score;
}
