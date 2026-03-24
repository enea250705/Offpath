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
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Foursquare diagnostic — shows raw API response status and body
app.get('/diag/foursquare', async (req, res) => {
  const city = req.query.city || 'Lisbon';
  const key = process.env.FOURSQUARE_API_KEY || '';
  if (!key) return res.json({ error: 'FOURSQUARE_API_KEY is not set', keyPresent: false });

  const params = new URLSearchParams({
    near: city, categories: '13065', limit: '3', sort: 'RATING',
    fields: 'name,location,geocodes,rating,popularity',
  });
  try {
    const raw = await fetch(`https://api.foursquare.com/v3/places/search?${params}`, {
      headers: { Authorization: key, Accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
    });
    const body = await raw.json();
    res.json({
      keyPresent: true,
      keyPrefix: key.slice(0, 6) + '...',
      httpStatus: raw.status,
      ok: raw.ok,
      body,
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
