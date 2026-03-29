const express    = require('express');
const bcrypt     = require('bcryptjs');
const jwt        = require('jsonwebtoken');
const crypto     = require('crypto');
const appleSignin = require('apple-signin-auth');
const { OAuth2Client } = require('google-auth-library');
const { Resend } = require('resend');
const { pool } = require('../db');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const resend = new Resend(process.env.RESEND_API_KEY);

const router = express.Router();

function makeToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '90d' }
  );
}

function generateCode() {
  return String(crypto.randomInt(100000, 999999));
}

async function sendVerificationEmail(email, code) {
  await resend.emails.send({
    from: 'Offpath <info@auditmylanding.com>',
    to: email,
    subject: 'Your Offpath verification code',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;">
        <h2 style="color:#F97316;margin-bottom:8px;">Offpath</h2>
        <p style="color:#555;margin-bottom:24px;">Here's your verification code:</p>
        <div style="background:#f4f4f4;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px;">
          <span style="font-size:40px;font-weight:bold;letter-spacing:12px;color:#111;">${code}</span>
        </div>
        <p style="color:#888;font-size:13px;">This code expires in 10 minutes. If you didn't request this, you can ignore this email.</p>
      </div>
    `,
  });
}

// POST /v1/auth/email — validate credentials, send OTP
router.post('/email', async (req, res) => {
  const { email, password, displayName, mode } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }

  try {
    const existing = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (existing.rows.length > 0) {
      // Login: verify password first
      const user = existing.rows[0];
      const valid = await bcrypt.compare(password, user.password_hash || user.password);
      if (!valid) return res.status(401).json({ error: 'Incorrect password' });
    } else {
      // Signup: just validate that password meets minimum length
      if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
      }
    }

    // Generate OTP, delete any previous codes for this email, store new one
    const code = generateCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await pool.query('DELETE FROM verification_codes WHERE email = $1', [email.toLowerCase()]);
    await pool.query(
      'INSERT INTO verification_codes (email, code, expires_at) VALUES ($1, $2, $3)',
      [email.toLowerCase(), code, expiresAt]
    );

    // Store signup data temporarily so /verify can use it
    // We re-use the code row — store password hash + displayName in the code table
    const hash = existing.rows.length === 0 ? await bcrypt.hash(password, 10) : null;
    const name = displayName?.trim() || email.split('@')[0];

    await pool.query(
      'UPDATE verification_codes SET payload = $1 WHERE email = $2',
      [JSON.stringify({ hash, name, mode: mode || 'login' }), email.toLowerCase()]
    );

    await sendVerificationEmail(email.toLowerCase(), code);

    return res.json({ requiresVerification: true, email: email.toLowerCase() });
  } catch (err) {
    console.error('[auth/email]', err);
    res.status(500).json({ error: 'Auth failed' });
  }
});

// POST /v1/auth/verify — check OTP, return user + token
router.post('/verify', async (req, res) => {
  const { email, code } = req.body;

  if (!email || !code) {
    return res.status(400).json({ error: 'email and code are required' });
  }

  try {
    const result = await pool.query(
      'SELECT * FROM verification_codes WHERE email = $1 ORDER BY created_at DESC LIMIT 1',
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'No verification code found. Please try again.' });
    }

    const row = result.rows[0];

    if (new Date() > new Date(row.expires_at)) {
      await pool.query('DELETE FROM verification_codes WHERE email = $1', [email.toLowerCase()]);
      return res.status(400).json({ error: 'Code expired. Please request a new one.' });
    }

    if (row.code !== code.trim()) {
      return res.status(400).json({ error: 'Incorrect code. Please try again.' });
    }

    // Code is valid — delete it
    await pool.query('DELETE FROM verification_codes WHERE email = $1', [email.toLowerCase()]);

    const payload = row.payload ? JSON.parse(row.payload) : {};

    // Find or create user
    const existing = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    let user;
    if (existing.rows.length > 0) {
      user = existing.rows[0];
    } else {
      const inserted = await pool.query(
        `INSERT INTO users (email, password, display_name, provider)
         VALUES ($1, $2, $3, 'email') RETURNING *`,
        [email.toLowerCase(), payload.hash, payload.name || email.split('@')[0]]
      );
      user = inserted.rows[0];
    }

    return res.json({
      id:          user.id,
      email:       user.email,
      displayName: user.display_name,
      token:       makeToken(user),
    });
  } catch (err) {
    console.error('[auth/verify]', err);
    res.status(500).json({ error: 'Verification failed' });
  }
});

// POST /v1/auth/social
router.post('/social', async (req, res) => {
  const { provider, idToken, displayName } = req.body;

  if (!provider || !idToken) {
    return res.status(400).json({ error: 'provider and idToken are required' });
  }

  try {
    let email;
    let name = displayName?.trim();

    if (provider === 'apple') {
      const applePayload = await appleSignin.verifyIdToken(idToken, {
        audience:         process.env.APPLE_CLIENT_ID,
        ignoreExpiration: false
      });
      email = applePayload.email;
      if (!email) return res.status(400).json({ error: 'Apple token missing email' });
    } else if (provider === 'google') {
      const ticket = await googleClient.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID
      });
      const googlePayload = ticket.getPayload();
      email = googlePayload.email;
      if (!name) name = googlePayload.name;
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
      token:       makeToken(user),
    });
  } catch (err) {
    console.error('[auth/social]', err);
    res.status(401).json({ error: 'Social auth failed' });
  }
});

module.exports = router;
