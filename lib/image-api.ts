/** Lorem Picsum — no API key required. Seed keeps the same image on every fetch. */
export function getRandomImage(width = 800, height = 600): string {
  const seed = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  return `https://picsum.photos/seed/${encodeURIComponent(seed)}/${width}/${height}`;
}
