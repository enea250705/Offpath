// Offpath — Pexels Photo Service
// Fetches city/travel photos from Pexels API
const PEXELS_API_KEY = 'QCmAX3HTR34UQot3oFNKLCM3relwXHGS4O7lW8Eh5P7t6l9j3LhjEVJ4';

const PEXELS_BASE = 'https://api.pexels.com/v1';

export interface PexelsPhoto {
  id: number;
  url: string;
  src: {
    original: string;
    large2x: string;
    large: string;
    medium: string;
    small: string;
    portrait: string;
    landscape: string;
    tiny: string;
  };
  photographer: string;
  alt: string;
}

interface PexelsResponse {
  photos: PexelsPhoto[];
  total_results: number;
}

// Cache to avoid re-fetching
const photoCache = new Map<string, PexelsPhoto[]>();

async function fetchPexels(query: string, perPage = 15): Promise<PexelsPhoto[]> {
  const cacheKey = `${query}:${perPage}`;
  if (photoCache.has(cacheKey)) {
    return photoCache.get(cacheKey)!;
  }

  try {
    const url = `${PEXELS_BASE}/search?query=${encodeURIComponent(query)}&per_page=${perPage}&orientation=portrait`;
    console.log('[Pexels] Searching:', query);
    const res = await fetch(url, {
      headers: { Authorization: PEXELS_API_KEY },
    });

    if (!res.ok) {
      console.warn('[Pexels] API error:', res.status, await res.text());
      return [];
    }

    const data: PexelsResponse = await res.json();
    const photos = data.photos || [];
    console.log('[Pexels] Got', photos.length, 'results for:', query);
    photoCache.set(cacheKey, photos);
    return photos;
  } catch (err) {
    console.warn('[Pexels] Fetch failed:', err);
    return [];
  }
}

/**
 * Get story photos for a city.
 * Strategy: ONE search for the exact city name to get relevant photos,
 * then distribute across 6 slides. This ensures all photos are actually
 * of the destination city.
 */
export async function getStoryPhotos(city: string): Promise<(string | null)[]> {
  // Add positive aesthetic keywords to block noisy random photos (like news/protests)
  let photos = await fetchPexels(`${city} travel architecture city landmarks`, 15);

  // If not enough results, try a slightly broader search but maintain scenery focus
  if (photos.length < 3) {
    const fallback = await fetchPexels(`${city} city view landscape`, 15);
    photos = [...photos, ...fallback];
  }

  // If still not enough, try exact city name
  if (photos.length < 3) {
    const fallback = await fetchPexels(`${city}`, 10);
    photos = [...photos, ...fallback];
  }

  if (photos.length === 0) {
    console.warn('[Pexels] No photos found for:', city);
    return new Array(6).fill(null);
  }

  // Distribute unique photos across 6 slides
  // Deduplicate by ID
  const seen = new Set<number>();
  const unique = photos.filter((p) => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });

  console.log('[Pexels] Using', unique.length, 'unique photos for', city);

  return Array.from({ length: 6 }, (_, i) => {
    const photo = unique[i % unique.length];
    return photo?.src?.large || photo?.src?.medium || null;
  });
}

/**
 * Get a single city photo (for use outside stories)
 */
export async function getCityPhoto(city: string): Promise<string | null> {
  const photos = await fetchPexels(`${city} travel architecture skyline`, 5);
  if (photos.length === 0) return null;
  return photos[0].src.portrait || photos[0].src.large;
}

/**
 * Check if API key is configured
 */
export function isPexelsConfigured(): boolean {
  return PEXELS_API_KEY.length > 10;
}
