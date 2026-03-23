// Foursquare Places API v3
// Docs: https://docs.foursquare.com/developer/reference/place-search

const FSQ_KEY = process.env.FOURSQUARE_API_KEY || '';

const CATEGORIES = {
  dining:    '13065',  // Dining and Drinking
  cafe:      '13035',  // Coffee Shop
  culture:   '10000',  // Arts and Entertainment
  landmark:  '16000',  // Landmarks and Outdoors
  nightlife: '10020',  // Nightlife Spot
  historic:  '16032',  // Historic and Protected Site
};

async function getPlaces(cityName, categoryId, limit = 5) {
  if (!FSQ_KEY) return [];
  try {
    const params = new URLSearchParams({
      near:       cityName,
      categories: categoryId,
      limit:      String(limit),
      sort:       'POPULARITY',
      fields:     'name,location,categories',
    });

    const res = await fetch(
      `https://api.foursquare.com/v3/places/search?${params}`,
      {
        headers: {
          Authorization: FSQ_KEY,
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(6000),
      }
    );

    if (!res.ok) return [];
    const data = await res.json();
    return (data.results || []).map(r => ({
      name:         r.name,
      neighborhood: r.location?.locality || r.location?.neighborhood?.[0] || '',
      category:     r.categories?.[0]?.name || '',
    }));
  } catch {
    return [];
  }
}

// Fetch real venues across all relevant categories for a destination city.
// All five category calls run in parallel — total latency = slowest call (~1–2s).
async function getDestinationVenues(cityName) {
  const [dining, cafes, culture, landmarks, nightlife] = await Promise.all([
    getPlaces(cityName, CATEGORIES.dining,    6),
    getPlaces(cityName, CATEGORIES.cafe,      4),
    getPlaces(cityName, CATEGORIES.culture,   4),
    getPlaces(cityName, CATEGORIES.landmark,  4),
    getPlaces(cityName, CATEGORIES.nightlife, 4),
  ]);

  return { dining, cafes, culture, landmarks, nightlife };
}

module.exports = { getDestinationVenues };
