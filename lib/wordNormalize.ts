/** Canonical form for duplicate detection (apple / Apple / APPLE → same). */
export function normalizeEnglishKey(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’'`]/g, "")
    .replace(/[-_./]+/g, " ")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Likely spellings stored in DB for the same lemma. */
export function englishLookupVariants(raw: string): string[] {
  const key = normalizeEnglishKey(raw);
  if (!key) return [];

  const out = new Set<string>([key]);

  if (key.includes(" ")) {
    out.add(key.replace(/ /g, "-"));
    out.add(key.replace(/ /g, ""));
  } else if (key.includes("-")) {
    out.add(key.replace(/-/g, " "));
    out.add(key.replace(/-/g, ""));
  }

  // Light plural / singular probes (not a full stemmer).
  if (key.endsWith("ies") && key.length > 4) {
    out.add(`${key.slice(0, -3)}y`);
  } else if (key.endsWith("es") && key.length > 3) {
    out.add(key.slice(0, -2));
    out.add(key.slice(0, -1));
  } else if (key.endsWith("s") && key.length > 2 && !key.endsWith("ss")) {
    out.add(key.slice(0, -1));
  } else {
    out.add(`${key}s`);
    out.add(`${key}es`);
    if (key.endsWith("y") && key.length > 2) {
      out.add(`${key.slice(0, -1)}ies`);
    }
  }

  return Array.from(out).filter((v) => v.length > 0).slice(0, 12);
}

export function englishKeysMatch(a: string, b: string): boolean {
  const ka = normalizeEnglishKey(a);
  const kb = normalizeEnglishKey(b);
  if (!ka || !kb) return false;
  if (ka === kb) return true;
  const va = new Set(englishLookupVariants(a));
  return va.has(kb) || englishLookupVariants(b).some((v) => va.has(v));
}
