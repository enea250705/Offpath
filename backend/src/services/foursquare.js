// Google Places API (New)
// Docs: https://developers.google.com/maps/documentation/places/web-service/text-search

const GMAPS_KEY = process.env.GOOGLE_MAPS_API_KEY || '';

// Google Place types per category
const CATEGORY_TYPES = {
  dining:    'restaurant',
  cafe:      'cafe',
  culture:   'museum',
  landmark:  'tourist_attraction',
  nightlife: 'bar',
  market:    'market',
};

// Time-of-day mapping for slot assignment
const SLOT_MAP = {
  cafe:      'morning',
  culture:   'midday',
  landmark:  'midday',
  dining:    'evening',
  nightlife: 'evening',
  market:    'morning',
};

// Fields to request from Google Places API
const FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.location',
  'places.types',
  'places.primaryType',
  'places.rating',
  'places.userRatingCount',
  'places.primaryTypeDisplayName',
].join(',');

async function getPlaces(cityName, placeType, limit = 15) {
  if (!GMAPS_KEY) return [];
  try {
    const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type':    'application/json',
        'X-Goog-Api-Key':  GMAPS_KEY,
        'X-Goog-FieldMask': FIELD_MASK,
      },
      body: JSON.stringify({
        textQuery:      `${placeType} in ${cityName}`,
        maxResultCount: Math.min(limit, 20),
        languageCode:   'en',
      }),
      signal: AbortSignal.timeout(6000),
    });

    if (!res.ok) return [];
    const data = await res.json();

    return (data.places || []).map(p => ({
      name:         p.displayName?.text || '',
      neighborhood: '',
      address:      p.formattedAddress || '',
      category:     p.primaryTypeDisplayName?.text || p.primaryType || placeType,
      latitude:     p.location?.latitude  || 0,
      longitude:    p.location?.longitude || 0,
      rating:       p.rating              || 0,
      popularity:   Math.min((p.userRatingCount || 0) / 5000, 1),
    }));
  } catch {
    return [];
  }
}

// Fetch real venues across all relevant categories for a destination city.
async function getDestinationVenues(cityName) {
  // Increased limits to ensure we don't run out of unused places for smaller cities
  const [dining, cafes, culture, landmarks, nightlife, markets, hidden] = await Promise.all([
    getPlaces(cityName, CATEGORY_TYPES.dining,    12),
    getPlaces(cityName, CATEGORY_TYPES.cafe,      10),
    getPlaces(cityName, CATEGORY_TYPES.culture,   10),
    getPlaces(cityName, CATEGORY_TYPES.landmark,  8),
    getPlaces(cityName, CATEGORY_TYPES.nightlife, 10),
    getPlaces(cityName, CATEGORY_TYPES.market,    8),
    // Extra fetch specifically tailored for local/offbeaten spots
    getPlaces(cityName, 'local favorite', 10),
  ]);

  return { dining, cafes, culture, landmarks, nightlife, markets, hidden };
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

// Organize venues into day slots based on category and geographic proximity.
function organizeDays(venues, tripLength) {
  const pool = [];
  for (const [cat, places] of Object.entries(venues)) {
    const slot = SLOT_MAP[cat] || 'midday';
    places.forEach(p => pool.push({ ...p, slot, sourceCategory: cat }));
  }

  const sortByRating = (a, b) => b.rating - a.rating;
  const morning = pool.filter(p => p.slot === 'morning').sort(sortByRating);
  const midday  = pool.filter(p => p.slot === 'midday').sort(sortByRating);
  const evening = pool.filter(p => p.slot === 'evening').sort(sortByRating);

  const days = [];

  for (let d = 0; d < tripLength; d++) {
    const morningPlace = morning.shift() || midday.shift() || evening.shift();
    if (!morningPlace) break;

    let middayPlace;
    if (midday.length > 0) {
      midday.sort((a, b) =>
        getDistance(morningPlace.latitude, morningPlace.longitude, a.latitude, a.longitude) -
        getDistance(morningPlace.latitude, morningPlace.longitude, b.latitude, b.longitude)
      );
      middayPlace = midday.shift();
    } else {
      middayPlace = morning.shift() || evening.shift();
    }

    let eveningPlace;
    if (evening.length > 0) {
      const anchor = middayPlace || morningPlace;
      evening.sort((a, b) =>
        getDistance(anchor.latitude, anchor.longitude, a.latitude, a.longitude) -
        getDistance(anchor.latitude, anchor.longitude, b.latitude, b.longitude)
      );
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
        { timeLabel: '12:30', place: middayPlace  },
        { timeLabel: '18:45', place: eveningPlace },
      ],
    });
  }

  return days;
}

// Pick hidden gems: lower popularity but 5-star (or very high) rated venues
function pickHiddenPlaces(venues, usedNames, count = 4) {
  const all    = Object.values(venues).flat();
  
  // Deduplicate all places by ID to avoid overlapping categories
  const uniquePlaces = [];
  const seenIds = new Set();
  for (const v of all) {
    if (!seenIds.has(v.name)) {
      seenIds.add(v.name);
      uniquePlaces.push(v);
    }
  }

  // Filter out places already in the itinerary
  const unused = uniquePlaces.filter(v => !usedNames.has(v.name));
  
  // 1. Ideal Hidden Gems: Not much visited by tourists (popularity < 0.2) but 5-stars (>= 4.6)
  const trueGems = unused.filter(v => v.rating >= 4.6 && v.popularity < 0.25);
  
  // 2. Fallbacks: Good rating, slightly more popularity but still not tourist traps
  const backups = unused.filter(v => v.rating >= 4.0 && v.popularity < 0.5);
  
  // 3. Absolute Fallbacks: Whatever is left
  const anyLeft = unused;

  // Combine them in order of priority
  let selected = [
    ...trueGems.sort((a, b) => b.rating - a.rating), 
    ...backups.sort((a, b) => a.popularity - b.popularity), 
    ...anyLeft
  ];

  // Deduplicate just in case
  selected = selected.filter((v, i, arr) => arr.findIndex(x => x.name === v.name) === i);

  return selected.slice(0, count);
}

module.exports = { getDestinationVenues, organizeDays, pickHiddenPlaces };
