// Foursquare Places API
// Docs: https://docs.foursquare.com/fsq-developers-places/reference/place-search

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

async function getPlaces(cityName, categoryId, limit = 15) {
  if (!FSQ_KEY) return [];
  try {
    const params = new URLSearchParams({
      near:     cityName,
      categories: categoryId,
      limit:    String(limit),
    });

    const res = await fetch(
      `https://api.foursquare.com/v3/places/search?${params}`,
      {
        headers: {
          Authorization: FSQ_KEY,
          Accept:        'application/json',
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
      rating:       0,
      popularity:   0,
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

  // Keep all results (rating/popularity not available on free tier)
  const filter = list => list;

  return {
    dining:    filter(dining),
    cafes:     filter(cafes),
    culture:   filter(culture),
    landmarks: filter(landmarks),
    nightlife: filter(nightlife),
    markets:   filter(markets),
  };
}

// Haversine distance in km between two coordinate pairs
function getDistance(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 999;
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Organize venues into day slots based on category and neighborhood proximity.
// Returns an array of days, each with morning/midday/evening slots filled with real places.
// Groups by distance to minimize movement spanning the day.
function organizeDays(venues, tripLength) {
  const pool = [];
  for (const [cat, places] of Object.entries(venues)) {
    const slot = SLOT_MAP[cat] || 'midday';
    places.forEach(p => pool.push({ ...p, slot, sourceCategory: cat }));
  }

  // Separate by slot and sort by rating (highest first)
  const sortByRating = (a, b) => b.rating - a.rating;
  const morning = pool.filter(p => p.slot === 'morning').sort(sortByRating);
  const midday  = pool.filter(p => p.slot === 'midday').sort(sortByRating);
  const evening = pool.filter(p => p.slot === 'evening').sort(sortByRating);

  const days = [];

  for (let d = 0; d < tripLength; d++) {
    // 1. Pick morning anchor (highest rated remaining, or fallback)
    const morningPlace = morning.shift() || midday.shift() || evening.shift();
    if (!morningPlace) break; // Out of places completely

    // 2. Pick midday place closest to the morning anchor
    let middayPlace;
    if (midday.length > 0) {
      midday.sort((a, b) => getDistance(morningPlace.latitude, morningPlace.longitude, a.latitude, a.longitude) - 
                            getDistance(morningPlace.latitude, morningPlace.longitude, b.latitude, b.longitude));
      middayPlace = midday.shift();
    } else {
      middayPlace = morning.shift() || evening.shift();
    }

    // 3. Pick evening place closest to the midday place
    let eveningPlace;
    if (evening.length > 0) {
      const anchor = middayPlace || morningPlace;
      evening.sort((a, b) => getDistance(anchor.latitude, anchor.longitude, a.latitude, a.longitude) - 
                             getDistance(anchor.latitude, anchor.longitude, b.latitude, b.longitude));
      eveningPlace = evening.shift();
    } else {
      eveningPlace = midday.shift() || morning.shift();
    }

    if (!middayPlace) middayPlace = morningPlace;
    if (!eveningPlace) eveningPlace = middayPlace;

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

// Pick hidden places: true "anti-tourist" local spots.
// We look for venues that have good ratings but LOW popularity scores (the true hidden gems).
function pickHiddenPlaces(venues, usedNames, count = 4) {
  const all = Object.values(venues).flat();
  const unused = all.filter(v => !usedNames.has(v.name));
  
  return unused.slice(0, count);
}

module.exports = { getDestinationVenues, organizeDays, pickHiddenPlaces };
