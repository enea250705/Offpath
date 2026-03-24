const express = require('express');
const cors = require('cors');
const { pool, initDb } = require('./db');

const authRoutes  = require('./routes/auth');
const tripsRoutes = require('./routes/trips');
const guideRoutes = require('./routes/guide');

const app = express();

app.use(cors());
app.use(express.json());

// Health check — Render uses this to confirm the service is up
app.get('/health', (req, res) => res.json({ status: 'ok', commit: 'bcce5f1' }));

// Google Places API diagnostic
app.get('/diag/places', async (req, res) => {
  const city = req.query.city || 'Lisbon';
  const key  = process.env.GOOGLE_MAPS_API_KEY || '';
  if (!key) return res.json({ error: 'GOOGLE_MAPS_API_KEY is not set', keyPresent: false });

  try {
    const raw = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type':     'application/json',
        'X-Goog-Api-Key':   key,
        'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.location,places.rating',
      },
      body: JSON.stringify({ textQuery: `restaurants in ${city}`, maxResultCount: 3, languageCode: 'en' }),
      signal: AbortSignal.timeout(8000),
    });
    const body = await raw.json();
    res.json({
      keyPresent: true,
      keyPrefix:  key.slice(0, 8) + '...',
      httpStatus: raw.status,
      ok:         raw.ok,
      results:    body.places?.length ?? 0,
      sample:     body.places?.[0] ?? body,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// Routes
app.use('/v1/auth',  authRoutes);
app.use('/v1/trips', tripsRoutes);
app.use('/v1/guide', guideRoutes);

// Start
const PORT = process.env.PORT || 3000;

initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`Offpath API running on port ${PORT}`);
  });
}).catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});
