/**
 * Helpers for showing exercise media when curated `image_url` / `video_url`
 * values aren't set. The fallback is a YouTube search query —
 * imperfect (the first result isn't always the canonical demo) but better
 * than no link at all, and a one-tap path to a how-to video.
 */

export function youtubeSearchUrl(exerciseName: string): string {
  const query = `${exerciseName} how to`.trim();
  const params = new URLSearchParams({ search_query: query });
  return `https://www.youtube.com/results?${params.toString()}`;
}

export function resolveVideoUrl(exerciseName: string, curated: string | null | undefined): string {
  if (curated && curated.trim().length > 0) return curated;
  return youtubeSearchUrl(exerciseName);
}
