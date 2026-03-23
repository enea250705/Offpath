const express = require('express');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const appleSignin = require('apple-signin-auth');
const { OAuth2Client } = require('google-auth-library');
const { pool } = require('../db');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const router = express.Router();

function makeToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '90d' }
  );
}

// POST /v1/auth/email
router.post('/email', async (req, res) => {
  const { email, password, displayName } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }

  try {
    const existing = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (existing.rows.length > 0) {
      const user = existing.rows[0];
      const valid = await bcrypt.compare(password, user.password);
      if (!valid) return res.status(401).json({ error: 'Incorrect password' });

      return res.json({
        id:          user.id,
        email:       user.email,
        displayName: user.display_name,
        token:       makeToken(user)
      });
    }

    const hash = await bcrypt.hash(password, 10);
    const name = displayName?.trim() || email.split('@')[0];
    const result = await pool.query(
      `INSERT INTO users (email, password, display_name, provider)
       VALUES ($1, $2, $3, 'email') RETURNING *`,
      [email.toLowerCase(), hash, name]
    );

    const user = result.rows[0];
    res.status(201).json({
      id:          user.id,
      email:       user.email,
      displayName: user.display_name,
      token:       makeToken(user)
    });
  } catch (err) {
    console.error('[auth/email]', err);
    res.status(500).json({ error: 'Auth failed' });
  }
});

// POST /v1/auth/social
router.post('/social', async (req, res) => {
  const { provider, token, displayName } = req.body;

  if (!provider || !token) {
    return res.status(400).json({ error: 'provider and token are required' });
  }

  try {
    let email;
    let name = displayName?.trim();

    if (provider === 'apple') {
      const payload = await appleSignin.verifyIdToken(token, {
        audience:         process.env.APPLE_CLIENT_ID,
        ignoreExpiration: false
      });
      email = payload.email;
      if (!email) return res.status(400).json({ error: 'Apple token missing email' });
    } else if (provider === 'google') {
      const ticket = await googleClient.verifyIdToken({
        idToken:  token,
        audience: process.env.GOOGLE_CLIENT_ID
      });
      const payload = ticket.getPayload();
      email = payload.email;
      if (!name) name = payload.name;
      if (!email) return res.status(400).json({ error: 'Google token missing email' });
    } else {
      return res.status(400).json({ error: 'Unknown provider' });
    }

    const result = await pool.query(
      `INSERT INTO users (email, display_name, provider)
       VALUES ($1, $2, $3)
       ON CONFLICT (email)
       DO UPDATE SET display_name = COALESCE(NULLIF(EXCLUDED.display_name, ''), users.display_name)
       RETURNING *`,
      [email.toLowerCase(), name || email.split('@')[0], provider]
    );

    const user = result.rows[0];
    res.json({
      id:          user.id,
      email:       user.email,
      displayName: user.display_name,
      token:       makeToken(user)
    });
  } catch (err) {
    console.error('[auth/social]', err);
    res.status(401).json({ error: 'Social auth failed' });
  }
});

module.exports = router;
