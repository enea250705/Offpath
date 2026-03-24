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

// Foursquare diagnostic — tests the API key and returns raw counts per category
app.get('/diag/foursquare', async (req, res) => {
  const { getDestinationVenues } = require('./services/foursquare');
  const city = req.query.city || 'Lisbon';
  try {
    const venues = await getDestinationVenues(city);
    const counts = Object.fromEntries(
      Object.entries(venues).map(([k, v]) => [k, v.length])
    );
    const sample = Object.entries(venues)
      .flatMap(([, v]) => v.slice(0, 2))
      .map(v => ({ name: v.name, rating: v.rating, popularity: v.popularity }));
    res.json({ city, counts, total: Object.values(counts).reduce((a, b) => a + b, 0), sample });
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
