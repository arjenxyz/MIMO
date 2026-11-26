/**
 * Lorem Picsum — no API key.
 * Uses fixed photo IDs so the same URL always returns the same image
 * (important for Gemini seeing what the user saw).
 */
export function getRandomImage(width = 800, height = 600): string {
  // Picsum gallery roughly covers ids 0–1084 (some missing; retries handled by caller if needed)
  const id = Math.floor(Math.random() * 1000);
  return `https://picsum.photos/id/${id}/${width}/${height}`;
}

/** Normalize a loaded image src to a stable absolute URL for the API. */
export function stabilizePicsumUrl(src: string, width = 900, height = 600): string {
  try {
    const url = new URL(src);
    const idMatch = url.pathname.match(/\/id\/(\d+)/);
    if (idMatch) {
      return `https://picsum.photos/id/${idMatch[1]}/${width}/${height}`;
    }
    const seedMatch = url.pathname.match(/\/seed\/([^/]+)/);
    if (seedMatch) {
      return `https://picsum.photos/seed/${seedMatch[1]}/${width}/${height}`;
    }
  } catch {
    // keep original
  }
  return src;
}
