const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { generateTrip } = require('../services/groq');
const { pool } = require('../db');

const router = express.Router();

// POST /v1/trips/full
// Body: { destination, travelStyle, travelerGroup, tripLength }
// Auth: Bearer token (required)
router.post('/full', requireAuth, async (req, res) => {
  const { destination, travelStyle, travelerGroup, tripLength } = req.body;

  if (!destination || !travelStyle || !travelerGroup || !tripLength) {
    return res.status(400).json({ error: 'destination, travelStyle, travelerGroup, tripLength are required' });
  }

  try {
    const plan = await generateTrip({ destination, travelStyle, travelerGroup, tripLength });

    // Persist the trip so the user can retrieve it later
    const result = await pool.query(
      `INSERT INTO trips (user_id, destination_city, destination_country, intro, share_line, payload)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [
        req.user.id,
        plan.destinationCity,
        plan.destinationCountry,
        plan.intro,
        plan.shareLine,
        JSON.stringify(plan)
      ]
    );

    res.json({ ...plan, tripId: result.rows[0].id });
  } catch (err) {
    console.error('[trips/full]', err);
    res.status(500).json({ error: 'Failed to generate trip' });
  }
});

// GET /v1/trips — list user's past trips
router.get('/', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, destination_city, destination_country, intro, share_line, created_at
       FROM trips WHERE user_id = $1 ORDER BY created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('[trips/list]', err);
    res.status(500).json({ error: 'Failed to fetch trips' });
  }
});

// GET /v1/trips/:id — retrieve a specific trip
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT payload FROM trips WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.user.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Trip not found' });
    res.json(result.rows[0].payload);
  } catch (err) {
    console.error('[trips/get]', err);
    res.status(500).json({ error: 'Failed to fetch trip' });
  }
});

module.exports = router;
