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
