/**
 * Word → clear, learner-friendly image URL (no Supabase storage).
 * Prefers Wikidata canonical images (P18), then Wikipedia lead thumb,
 * then strictly scored Openverse illustrations.
 */

const UA = { "User-Agent": "MIMO-LanguageApp/1.0 (english-vocabulary-learning)" };

export async function findWordImageUrl(english: string): Promise<string | null> {
  const query = normalizeQuery(english);
  if (!query) return null;

  const wikidata = await searchWikidataImage(query);
  if (wikidata) return wikidata;

  const wiki = await searchWikipediaSummary(query);
  if (wiki) return wiki;

  const openverse = await searchOpenverseClear(query);
  return openverse;
}

function normalizeQuery(raw: string) {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z\s'-]/gi, "")
    .replace(/\s+/g, " ")
    .slice(0, 60);
}

function commonsFileUrl(filename: string, width = 800) {
  const clean = filename.replace(/ /g, "_");
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(clean)}?width=${width}`;
}

type WikiSearchHit = {
  id: string;
  label?: string;
  description?: string;
};

async function searchWikidataImage(query: string): Promise<string | null> {
  try {
    const searchUrl = new URL("https://www.wikidata.org/w/api.php");
    searchUrl.searchParams.set("action", "wbsearchentities");
    searchUrl.searchParams.set("search", query);
    searchUrl.searchParams.set("language", "en");
    searchUrl.searchParams.set("uselang", "en");
    searchUrl.searchParams.set("type", "item");
    searchUrl.searchParams.set("limit", "8");
    searchUrl.searchParams.set("format", "json");
    searchUrl.searchParams.set("origin", "*");

    const searchRes = await fetch(searchUrl.toString(), {
      headers: UA,
      next: { revalidate: 86400 },
    });
    if (!searchRes.ok) return null;

    const searchData = (await searchRes.json()) as { search?: WikiSearchHit[] };
    const hits = [...(searchData.search ?? [])].sort(
      (a, b) => scoreWikidataHit(query, b) - scoreWikidataHit(query, a)
    );

    const ids = hits
      .filter((h) => scoreWikidataHit(query, h) >= 4)
      .slice(0, 5)
      .map((h) => h.id);

    if (ids.length === 0) return null;

    const entityUrl = new URL("https://www.wikidata.org/w/api.php");
    entityUrl.searchParams.set("action", "wbgetentities");
    entityUrl.searchParams.set("ids", ids.join("|"));
    entityUrl.searchParams.set("props", "claims");
    entityUrl.searchParams.set("format", "json");
    entityUrl.searchParams.set("origin", "*");

    const entityRes = await fetch(entityUrl.toString(), {
      headers: UA,
      next: { revalidate: 86400 },
    });
    if (!entityRes.ok) return null;

    const entityData = (await entityRes.json()) as {
      entities?: Record<
        string,
        {
          claims?: {
            P18?: Array<{ mainsnak?: { datavalue?: { value?: string } } }>;
          };
        }
      >;
    };

    for (const id of ids) {
      const filename = entityData.entities?.[id]?.claims?.P18?.[0]?.mainsnak?.datavalue?.value;
      if (filename) return commonsFileUrl(filename);
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Prefer concrete, teachable senses over companies / people / brands.
 */
function scoreWikidataHit(query: string, hit: WikiSearchHit) {
  const label = (hit.label ?? "").toLowerCase().trim();
  const desc = (hit.description ?? "").toLowerCase();
  const q = query.toLowerCase();

  let score = 0;
  if (label === q) score += 8;
  else if (label.startsWith(q + " ") || label.endsWith(" " + q)) score += 3;
  else if (label.includes(q)) score += 1;
  else return -20;

  const concrete =
    /\b(fruit|vegetable|animal|bird|fish|insect|plant|tree|flower|tool|device|object|vehicle|furniture|food|drink|clothing|garment|building|instrument|body|organ|color|colour|shape|sport|game|kitchen|household|mammal|reptile|metal|material|container|weapon|toy)\b/;
  if (concrete.test(desc)) score += 10;

  const abstractOk = /\b(emotion|feeling|concept|action|activity|process)\b/;
  if (abstractOk.test(desc)) score += 2;

  const bad =
    /\b(company|corporation|brand|business|organization|organisation|band|singer|actor|actress|politician|footballer|athlete|given name|family name|surname|film|movie|album|song|tv series|television|video game|software|website|newspaper|human settlement|city|town|village|river|mountain|disambiguation)\b/;
  if (bad.test(desc)) score -= 15;

  if (desc.includes("species of") || desc.includes("edible")) score += 4;
  if (desc.includes("pedal-driven") || desc.includes("means of transport")) score += 4;

  return score;
}

async function searchWikipediaSummary(query: string): Promise<string | null> {
  try {
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
      thumbnail?: { source?: string };
      originalimage?: { source?: string };
    };

    // Skip disambiguation / meta pages — usually not a clear object photo.
    if (data.type === "disambiguation") return null;
    const desc = (data.description ?? "").toLowerCase();
    if (/\b(company|brand|film|album|given name|disambiguation)\b/.test(desc)) return null;

    const src = data.originalimage?.source || data.thumbnail?.source;
    return src ? src.split("?")[0] : null;
  } catch {
    return null;
  }
}

type OpenverseResult = {
  url?: string;
  thumbnail?: string;
  title?: string;
  mature?: boolean;
  category?: string | null;
  tags?: Array<{ name?: string }>;
};

async function searchOpenverseClear(query: string): Promise<string | null> {
  try {
    const queries = [
      `"${query}"`,
      `${query} object`,
      `${query} illustration`,
      query,
    ];

    let best: { score: number; url: string } | null = null;

    for (const q of queries) {
      for (const category of ["illustration", "photograph", ""] as const) {
        const results = await fetchOpenverseResults(q, category || null);
        for (const r of results) {
          const score = scoreOpenverse(query, r);
          if (score < 12) continue;
          const url = r.url || r.thumbnail;
          if (!url) continue;
          if (!best || score > best.score) best = { score, url };
        }
        if (best && best.score >= 18) return best.url;
      }
    }

    return best ? best.url : null;
  } catch {
    return null;
  }
}

async function fetchOpenverseResults(query: string, category: string | null) {
  const url = new URL("https://api.openverse.org/v1/images/");
  url.searchParams.set("q", query);
  url.searchParams.set("page_size", "20");
  url.searchParams.set("mature", "false");
  if (category) url.searchParams.set("category", category);

  const res = await fetch(url.toString(), {
    headers: UA,
    next: { revalidate: 86400 },
  });
  if (!res.ok) return [] as OpenverseResult[];

  const data = (await res.json()) as { results?: OpenverseResult[] };
  return (data.results ?? []).filter((r) => !r.mature && (r.url || r.thumbnail));
}

function scoreOpenverse(query: string, result: OpenverseResult) {
  const q = query.toLowerCase();
  const title = (result.title ?? "").toLowerCase().replace(/[_-]+/g, " ");
  const tags = (result.tags ?? []).map((t) => (t.name ?? "").toLowerCase());
  const words = new Set(title.split(/\s+/).filter(Boolean));

  let score = 0;
  if (title === q) score += 20;
  else if (words.has(q)) score += 14;
  else if (title.startsWith(q + " ") || title.endsWith(" " + q)) score += 10;
  else if (title.includes(q)) score += 4;
  else score -= 8;

  if (tags.some((t) => t === q)) score += 12;
  else if (tags.some((t) => t.includes(q))) score += 3;

  if (result.category === "illustration") score += 4;
  if (/\b(logo|screenshot|map|chart|graph|poster|advert|banner)\b/.test(title)) score -= 12;
  if (/\b(inc|corp|ltd|company|album|concert)\b/.test(title)) score -= 10;

  return score;
}
