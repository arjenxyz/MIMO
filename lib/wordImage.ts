/**
 * Word → related image URL via public search APIs (no Supabase storage).
 * Openverse first, Wikipedia thumbnail as fallback.
 */

export async function findWordImageUrl(english: string): Promise<string | null> {
  const query = normalizeQuery(english);
  if (!query) return null;

  const openverse = await searchOpenverse(query);
  if (openverse) return openverse;

  return searchWikipediaThumb(query);
}

function normalizeQuery(raw: string) {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z\s'-]/gi, "")
    .replace(/\s+/g, " ")
    .slice(0, 60);
}

type OpenverseResult = {
  url?: string;
  thumbnail?: string;
  title?: string;
  mature?: boolean;
  tags?: Array<{ name?: string }>;
};

async function searchOpenverse(query: string): Promise<string | null> {
  const headers = { "User-Agent": "MIMO-LanguageApp/1.0 (word-learning)" };

  try {
    let results = await fetchOpenverseResults(query, true, headers);
    if (results.length === 0) {
      results = await fetchOpenverseResults(query, false, headers);
    }
    if (results.length === 0) return null;

    results.sort((a, b) => scoreResult(query, b) - scoreResult(query, a));
    const best = results[0];
    return best.url || best.thumbnail || null;
  } catch {
    return null;
  }
}

async function fetchOpenverseResults(
  query: string,
  photographsOnly: boolean,
  headers: HeadersInit
) {
  const url = new URL("https://api.openverse.org/v1/images/");
  url.searchParams.set("q", query);
  url.searchParams.set("page_size", "12");
  url.searchParams.set("mature", "false");
  if (photographsOnly) url.searchParams.set("category", "photograph");

  const res = await fetch(url.toString(), {
    headers,
    next: { revalidate: 86400 },
  });
  if (!res.ok) return [] as OpenverseResult[];

  const data = (await res.json()) as { results?: OpenverseResult[] };
  return (data.results ?? []).filter((r) => !r.mature && (r.url || r.thumbnail));
}

function scoreResult(query: string, result: OpenverseResult) {
  const q = query.toLowerCase();
  const title = (result.title ?? "").toLowerCase();
  const tags = (result.tags ?? []).map((t) => (t.name ?? "").toLowerCase());
  let score = 0;
  if (title === q) score += 10;
  if (title.includes(q)) score += 5;
  if (tags.some((t) => t === q)) score += 8;
  if (tags.some((t) => t.includes(q))) score += 3;
  if (result.url) score += 1;
  return score;
}

async function searchWikipediaThumb(query: string): Promise<string | null> {
  try {
    const url = new URL("https://en.wikipedia.org/w/api.php");
    url.searchParams.set("action", "query");
    url.searchParams.set("titles", query);
    url.searchParams.set("prop", "pageimages");
    url.searchParams.set("format", "json");
    url.searchParams.set("pithumbsize", "800");
    url.searchParams.set("origin", "*");

    const res = await fetch(url.toString(), {
      headers: { "User-Agent": "MIMO-LanguageApp/1.0 (word-learning)" },
      next: { revalidate: 86400 },
    });
    if (!res.ok) return null;

    const data = (await res.json()) as {
      query?: {
        pages?: Record<string, { thumbnail?: { source?: string }; missing?: string }>;
      };
    };
    const pages = Object.values(data.query?.pages ?? {});
    const page = pages.find((p) => !("missing" in p && p.missing !== undefined) && p.thumbnail?.source);
    // Wikipedia marks missing pages with "missing" key
    const valid = pages.find((p) => p.thumbnail?.source && !("missing" in p));
    const src = (valid ?? page)?.thumbnail?.source;
    return src ? src.split("?")[0] : null;
  } catch {
    return null;
  }
}
