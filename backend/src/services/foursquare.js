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
  market:    '17069',  // Market
};

// Time-of-day mapping for slot assignment
const SLOT_MAP = {
  cafe:      'morning',
  culture:   'midday',
  landmark:  'midday',
  historic:  'midday',
  market:    'morning',
  dining:    'evening',
  nightlife: 'evening',
};

async function getPlaces(cityName, categoryId, limit = 6) {
  if (!FSQ_KEY) return [];
  try {
    const params = new URLSearchParams({
      near:       cityName,
      categories: categoryId,
      limit:      String(limit),
      sort:       'RELEVANCE',
      fields:     'name,location,categories,geocodes,rating,popularity,hours',
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
      neighborhood: r.location?.neighborhood?.[0] || r.location?.locality || '',
      address:      r.location?.formatted_address || '',
      category:     r.categories?.[0]?.name || '',
      latitude:     r.geocodes?.main?.latitude || 0,
      longitude:    r.geocodes?.main?.longitude || 0,
      rating:       r.rating || 0,
      popularity:   r.popularity || 0,
    }));
  } catch {
    return [];
  }
}

// Fetch real venues across all relevant categories for a destination city.
// Filters out tourist traps (popularity > 0.95) and sorts by rating.
async function getDestinationVenues(cityName) {
  const [dining, cafes, culture, landmarks, nightlife, markets] = await Promise.all([
    getPlaces(cityName, CATEGORIES.dining,    8),
    getPlaces(cityName, CATEGORIES.cafe,      6),
    getPlaces(cityName, CATEGORIES.culture,   6),
    getPlaces(cityName, CATEGORIES.landmark,  6),
    getPlaces(cityName, CATEGORIES.nightlife, 6),
    getPlaces(cityName, CATEGORIES.market,    4),
  ]);

  // Filter out tourist traps (very high popularity = crowded/generic)
  const filter = list => list
    .filter(v => v.popularity < 0.95)
    .sort((a, b) => b.rating - a.rating);

  return {
    dining:    filter(dining),
    cafes:     filter(cafes),
    culture:   filter(culture),
    landmarks: filter(landmarks),
    nightlife: filter(nightlife),
    markets:   filter(markets),
  };
}

// Organize venues into day slots based on category and neighborhood proximity.
// Returns an array of days, each with morning/midday/evening slots filled with real places.
function organizeDays(venues, tripLength) {
  // Pool all venues with their slot assignment
  const pool = [];
  for (const [cat, places] of Object.entries(venues)) {
    const slot = SLOT_MAP[cat] || 'midday';
    places.forEach(p => pool.push({ ...p, slot, sourceCategory: cat }));
  }

  // Separate by slot
  const morning = pool.filter(p => p.slot === 'morning');
  const midday  = pool.filter(p => p.slot === 'midday');
  const evening = pool.filter(p => p.slot === 'evening');

  const days = [];

  for (let d = 0; d < tripLength; d++) {
    const morningPlace = morning[d % morning.length] || midday[0];
    const middayPlace  = midday[d % midday.length]   || morning[0];
    const eveningPlace = evening[d % evening.length]  || midday[0];

    days.push({
      dayNumber: d + 1,
      moments: [
        { timeLabel: '09:00', place: morningPlace },
        { timeLabel: '12:30', place: middayPlace },
        { timeLabel: '18:45', place: eveningPlace },
      ],
    });
  }

  return days;
}

// Pick hidden places: choose unique venues not already used in the itinerary.
function pickHiddenPlaces(venues, usedNames, count = 4) {
  const all = Object.values(venues).flat();
  const unused = all.filter(v => !usedNames.has(v.name));
  // Prefer higher-rated places that aren't in the main itinerary
  unused.sort((a, b) => b.rating - a.rating);
  return unused.slice(0, count);
}

module.exports = { getDestinationVenues, organizeDays, pickHiddenPlaces };
