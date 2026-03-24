const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { guideChat } = require('../services/groq');
const { pool } = require('../db');

const router = express.Router();

// POST /v1/guide/chat
// Body: { destination, message, history? }
// Auth: Bearer token (required)
router.post('/chat', requireAuth, async (req, res) => {
  const { destination, message, history } = req.body;

  if (!destination || !message) {
    return res.status(400).json({ error: 'destination and message are required' });
  }

  try {
    const replyText = await guideChat({ destination, message, history: history || [] });

    // Persist the exchange if a tripId is provided
    if (req.body.tripId) {
      await pool.query(
        `INSERT INTO guide_messages (trip_id, user_id, role, text) VALUES
         ($1, $2, 'user', $3),
         ($1, $2, 'assistant', $4)`,
        [req.body.tripId, req.user.id, message, replyText]
      );
    }

    res.json({ role: 'assistant', text: replyText });
  } catch (err) {
    console.error('[guide/chat]', err);
    res.status(500).json({ error: 'Guide is unavailable right now' });
  }
});

// GET /v1/guide/messages/:tripId
// Auth: Bearer token (required)
router.get('/messages/:tripId', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, role, text, created_at AS "timestamp"
       FROM guide_messages
       WHERE trip_id = $1 AND user_id = $2
       ORDER BY created_at ASC`,
      [req.params.tripId, req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error('[guide/messages]', err);
    res.status(500).json({ error: 'Could not load messages' });
  }
});

module.exports = router;
