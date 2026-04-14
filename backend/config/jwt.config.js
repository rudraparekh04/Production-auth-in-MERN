const jwt = require('jsonwebtoken');
const crypto = require('crypto');

/**
 * TWO-TOKEN AUTHENTICATION SYSTEM
 * ================================
 * Access Token  → Short-lived (15 min), stored in memory (React state)
 * Refresh Token → Long-lived (7 days), stored in HttpOnly cookie + DB
 *
 * Flow:
 * 1. Login → receive both tokens
 * 2. Access token expires → use refresh token to get new access token
 * 3. Refresh token expires/invalid → force re-login
 * 4. Logout → invalidate refresh token from DB + clear cookie
 */

// ─── Generate Access Token ──────────────────────────────────────────────────
const generateAccessToken = (userId, role) => {
  if (!process.env.JWT_ACCESS_SECRET) {
    throw new Error('JWT_ACCESS_SECRET is not defined');
  }

  return jwt.sign(
    {
      id: userId,
      role,
      type: 'access',
      iat: Math.floor(Date.now() / 1000),
    },
    process.env.JWT_ACCESS_SECRET,
    {
      expiresIn: process.env.JWT_ACCESS_EXPIRY || '15m',
      issuer: 'mern-auth-api',
      audience: 'mern-auth-client',
    }
  );
};

// ─── Generate Refresh Token ─────────────────────────────────────────────────
const generateRefreshToken = (userId) => {
  if (!process.env.JWT_REFRESH_SECRET) {
    throw new Error('JWT_REFRESH_SECRET is not defined');
  }

  // Include a random nonce so each refresh token is unique
  const nonce = crypto.randomBytes(16).toString('hex');

  return jwt.sign(
    {
      id: userId,
      type: 'refresh',
      nonce,
      iat: Math.floor(Date.now() / 1000),
    },
    process.env.JWT_REFRESH_SECRET,
    {
      expiresIn: process.env.JWT_REFRESH_EXPIRY || '7d',
      issuer: 'mern-auth-api',
      audience: 'mern-auth-client',
    }
  );
};

// ─── Verify Access Token ─────────────────────────────────────────────────────
const verifyAccessToken = (token) => {
  return jwt.verify(token, process.env.JWT_ACCESS_SECRET, {
    issuer: 'mern-auth-api',
    audience: 'mern-auth-client',
  });
};

// ─── Verify Refresh Token ────────────────────────────────────────────────────
const verifyRefreshToken = (token) => {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET, {
    issuer: 'mern-auth-api',
    audience: 'mern-auth-client',
  });
};

// ─── Set Refresh Token Cookie ─────────────────────────────────────────────────
const setRefreshTokenCookie = (res, refreshToken) => {
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,        // Not accessible via JS (XSS protection)
    secure: process.env.NODE_ENV === 'production', // HTTPS only in prod
    sameSite: 'None',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
    path: '/api/auth',     // Only sent to auth endpoints
  });
};

// ─── Clear Refresh Token Cookie ───────────────────────────────────────────────
const clearRefreshTokenCookie = (res) => {
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    path: '/api/auth',
  });
};

// ─── Hash token for DB storage ────────────────────────────────────────────────
const hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  setRefreshTokenCookie,
  clearRefreshTokenCookie,
  hashToken,
};
