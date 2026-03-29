const express = require('express');
const router = express.Router();

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

module.exports = router;
