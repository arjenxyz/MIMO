/**
 * Word → related image URL (no Supabase storage).
 * Uses Lorem Flickr tags; same word always maps to the same lock id.
 */
export function getWordImageUrl(english: string, width = 640, height = 400): string {
  const raw = english.trim().toLowerCase().replace(/[^a-z\s'-]/gi, "");
  const tag = (raw.split(/\s+/)[0] || "nature").replace(/'/g, "");
  const lock = hashString(tag) % 10_000;
  return `https://loremflickr.com/${width}/${height}/${encodeURIComponent(tag)}/all?lock=${lock}`;
}

function hashString(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash || 1;
}
