/** Lorem Picsum — no API key required. */
export function getRandomImage(width = 800, height = 600): string {
  return `https://picsum.photos/${width}/${height}?random=${Date.now()}`;
}
