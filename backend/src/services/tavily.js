// Tavily Search API — designed for AI pipelines
// Docs: https://docs.tavily.com/docs/tavily-api/rest_api

const TAVILY_KEY = process.env.TAVILY_API_KEY || '';

// Search for a single venue and return a clean summary.
async function searchVenue(venueName, city) {
  if (!TAVILY_KEY) return null;
  try {
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key:        TAVILY_KEY,
        query:          `${venueName} ${city} — local tips, what to know, what to order or see`,
        search_depth:   'basic',
        max_results:    3,
        include_answer: true,   // Tavily generates a concise AI summary
      }),
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) return null;
    const data = await res.json();

    // Prefer Tavily's generated answer; fall back to first result snippet
    const summary = data.answer
      || data.results?.[0]?.content
      || null;

    return summary ? { venue: venueName, summary } : null;
  } catch {
    return null;
  }
}

// Research the top venues for a destination.
// Selects at most `limit` venues total (to keep Tavily usage reasonable)
// and runs all searches in parallel.
async function researchVenues(venues, city, limit = 8) {
  if (!TAVILY_KEY) return [];

  // Pick the highest-priority venues across categories
  const candidates = [
    ...pick(venues.dining,    2),
    ...pick(venues.cafes,     1),
    ...pick(venues.culture,   2),
    ...pick(venues.landmarks, 2),
    ...pick(venues.nightlife, 1),
  ].slice(0, limit);

  const results = await Promise.all(
    candidates.map(v => searchVenue(v.name, city))
  );

  return results.filter(Boolean);   // drop nulls (failed searches)
}

function pick(list, n) {
  return (list || []).slice(0, n);
}

module.exports = { researchVenues };
