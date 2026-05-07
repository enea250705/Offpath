const express = require('express');
const Groq = require('groq-sdk');
const router = express.Router();
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ISO 3166-1 alpha-2 — country name → code
const COUNTRY_CODES = {
  'Afghanistan':'AF','Albania':'AL','Algeria':'DZ','Andorra':'AD','Angola':'AO',
  'Argentina':'AR','Armenia':'AM','Australia':'AU','Austria':'AT','Azerbaijan':'AZ',
  'Bahrain':'BH','Bangladesh':'BD','Belarus':'BY','Belgium':'BE','Bolivia':'BO',
  'Bosnia and Herzegovina':'BA','Brazil':'BR','Bulgaria':'BG','Cambodia':'KH',
  'Canada':'CA','Chile':'CL','China':'CN','Colombia':'CO','Costa Rica':'CR',
  'Croatia':'HR','Cuba':'CU','Cyprus':'CY','Czech Republic':'CZ','Czechia':'CZ',
  'Denmark':'DK','Dominican Republic':'DO','Ecuador':'EC','Egypt':'EG',
  'El Salvador':'SV','Estonia':'EE','Ethiopia':'ET','Finland':'FI','France':'FR',
  'Georgia':'GE','Germany':'DE','Ghana':'GH','Greece':'GR','Guatemala':'GT',
  'Honduras':'HN','Hong Kong':'HK','Hungary':'HU','Iceland':'IS','India':'IN',
  'Indonesia':'ID','Iran':'IR','Iraq':'IQ','Ireland':'IE','Israel':'IL',
  'Italy':'IT','Jamaica':'JM','Japan':'JP','Jordan':'JO','Kazakhstan':'KZ',
  'Kenya':'KE','Kosovo':'XK','Kuwait':'KW','Kyrgyzstan':'KG','Laos':'LA',
  'Latvia':'LV','Lebanon':'LB','Libya':'LY','Lithuania':'LT','Luxembourg':'LU',
  'Macau':'MO','Malaysia':'MY','Maldives':'MV','Malta':'MT','Mexico':'MX',
  'Moldova':'MD','Mongolia':'MN','Montenegro':'ME','Morocco':'MA',
  'Mozambique':'MZ','Myanmar':'MM','Nepal':'NP','Netherlands':'NL',
  'New Zealand':'NZ','Nicaragua':'NI','Nigeria':'NG','North Macedonia':'MK',
  'Norway':'NO','Oman':'OM','Pakistan':'PK','Palestine':'PS','Panama':'PA',
  'Paraguay':'PY','Peru':'PE','Philippines':'PH','Poland':'PL','Portugal':'PT',
  'Puerto Rico':'PR','Qatar':'QA','Romania':'RO','Russia':'RU',
  'Saudi Arabia':'SA','Senegal':'SN','Serbia':'RS','Singapore':'SG',
  'Slovakia':'SK','Slovenia':'SI','South Africa':'ZA','South Korea':'KR',
  'Spain':'ES','Sri Lanka':'LK','Sudan':'SD','Sweden':'SE','Switzerland':'CH',
  'Syria':'SY','Taiwan':'TW','Tajikistan':'TJ','Tanzania':'TZ','Thailand':'TH',
  'Tunisia':'TN','Turkey':'TR','Türkiye':'TR','Turkmenistan':'TM','Uganda':'UG',
  'Ukraine':'UA','United Arab Emirates':'AE','United Kingdom':'GB',
  'United States':'US','Uruguay':'UY','Uzbekistan':'UZ','Venezuela':'VE',
  'Vietnam':'VN','Yemen':'YE','Zambia':'ZM','Zimbabwe':'ZW',
};

// GET /v1/places/city-autocomplete?q=Tirana
router.get('/city-autocomplete', async (req, res) => {
  const q = (req.query.q || '').trim();
  if (q.length < 2) return res.json([]);

  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return res.status(500).json({ error: 'Maps API key not configured' });

  try {
    const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(q)}&types=(cities)&language=en&key=${key}`;
    const data = await fetch(url).then(r => r.json());

    if (!data.predictions) return res.json([]);

    const results = data.predictions.slice(0, 6).map(p => {
      const terms = p.terms || [];
      const city = terms[0]?.value || p.description;
      const country = terms[terms.length - 1]?.value || '';
      const countryCode = (COUNTRY_CODES[country] || '').toLowerCase();
      return { city, country, countryCode };
    });

    res.json(results);
  } catch (err) {
    console.error('[places/city-autocomplete]', err);
    res.status(500).json({ error: 'Autocomplete failed' });
  }
});

// GET /v1/places/nearby?lat=X&lng=Y&radius=1000
router.get('/nearby', async (req, res) => {
  const lat = parseFloat(req.query.lat);
  const lng = parseFloat(req.query.lng);
  const radius = Math.min(parseFloat(req.query.radius) || 1000, 2000);

  if (isNaN(lat) || isNaN(lng)) return res.status(400).json({ error: 'lat and lng required' });

  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return res.status(500).json({ error: 'Maps API key not configured' });

  const FIELD_MASK = [
    'places.id', 'places.displayName', 'places.formattedAddress', 'places.location',
    'places.primaryType', 'places.primaryTypeDisplayName', 'places.rating', 'places.userRatingCount',
  ].join(',');

  try {
    const r = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': key, 'X-Goog-FieldMask': FIELD_MASK },
      body: JSON.stringify({
        includedTypes: ['restaurant', 'tourist_attraction', 'museum', 'cafe', 'bar', 'park', 'art_gallery'],
        maxResultCount: 20,
        locationRestriction: { circle: { center: { latitude: lat, longitude: lng }, radius } },
        rankPreference: 'POPULARITY',
      }),
      signal: AbortSignal.timeout(8000),
    });

    if (!r.ok) return res.status(502).json({ error: 'Places API error' });
    const data = await r.json();

    const places = (data.places || []).map(p => ({
      id: p.id || `${p.location?.latitude},${p.location?.longitude}`,
      name: p.displayName?.text || '',
      address: p.formattedAddress || '',
      category: p.primaryTypeDisplayName?.text || p.primaryType || 'Place',
      latitude: p.location?.latitude || 0,
      longitude: p.location?.longitude || 0,
      rating: p.rating || 0,
      reviewCount: p.userRatingCount || 0,
    }));

    res.json(places);
  } catch (err) {
    console.error('[places/nearby]', err);
    res.status(500).json({ error: 'Nearby search failed' });
  }
});

// POST /v1/places/insight
// Body: { name, address, category, rating, reviewCount }
router.post('/insight', async (req, res) => {
  const { name, address, category, rating, reviewCount } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });

  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{
        role: 'user',
        content: `You are a travel expert. Give a quick, honest insight about this place for a traveler.

Place: ${name}
Type: ${category || 'Place'}
Address: ${address || ''}
Rating: ${rating ? `${rating}/5 (${reviewCount || 0} reviews)` : 'Not rated'}

Return ONLY valid JSON, no markdown:
{
  "summary": "2-3 punchy sentences about the vibe, what makes it special, who it suits",
  "pros": ["max 3 pros, each under 8 words"],
  "cons": ["max 2 cons, each under 8 words"],
  "keyFacts": ["max 3 practical things a visitor should know"]
}`,
      }],
      temperature: 0.6,
      max_tokens: 350,
    });

    const raw = completion.choices[0]?.message?.content || '{}';
    const match = raw.match(/\{[\s\S]*\}/);
    const insight = match ? JSON.parse(match[0]) : { summary: raw.slice(0, 200), pros: [], cons: [], keyFacts: [] };
    res.json(insight);
  } catch (err) {
    console.error('[places/insight]', err);
    res.status(500).json({ error: 'Insight failed' });
  }
});

module.exports = router;
