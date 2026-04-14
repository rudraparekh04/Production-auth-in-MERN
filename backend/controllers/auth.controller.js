const { validationResult } = require('express-validator');
const User = require('../models/User.model');
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  setRefreshTokenCookie,
  clearRefreshTokenCookie,
  hashToken,
} = require('../config/jwt.config');

// ─── Register ──────────────────────────────────────────────────────────────────
const register = async (req, res, next) => {
  try {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
      });
    }

    const { name, email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({
        message: 'An account with this email already exists',
      });
    }

    // Create user
    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase(),
      password,
      avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`,
    });

    // Generate tokens
    const accessToken = generateAccessToken(user._id, user.role);
    const refreshToken = generateRefreshToken(user._id);

    // Store hashed refresh token in DB
    const hashedRefreshToken = hashToken(refreshToken);
    user.refreshTokens.push({
      token: hashedRefreshToken,
      deviceInfo: req.headers['user-agent']?.substring(0, 100) || 'Unknown',
    });
    user.lastLogin = new Date();
    user.loginCount += 1;
    await user.save();

    // Set refresh token in HttpOnly cookie
    setRefreshTokenCookie(res, refreshToken);

    res.status(201).json({
      message: 'Account created successfully',
      accessToken,
      user: user.publicProfile,
    });
  } catch (error) {
    next(error);
  }
};

// ─── Login ────────────────────────────────────────────────────────────────────
const login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
      });
    }

    const { email, password } = req.body;

    // Find user with password field
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: 'Account is deactivated. Contact support.' });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Generate new tokens
    const accessToken = generateAccessToken(user._id, user.role);
    const refreshToken = generateRefreshToken(user._id);

    // Clean expired tokens, then add new refresh token
    user.cleanExpiredTokens();
    // Limit to 5 sessions per user (oldest removed)
    if (user.refreshTokens.length >= 5) {
      user.refreshTokens.shift();
    }

    const hashedRefreshToken = hashToken(refreshToken);
    user.refreshTokens.push({
      token: hashedRefreshToken,
      deviceInfo: req.headers['user-agent']?.substring(0, 100) || 'Unknown',
    });
    user.lastLogin = new Date();
    user.loginCount += 1;
    await user.save();

    // Set refresh token cookie
    setRefreshTokenCookie(res, refreshToken);

    res.status(200).json({
      message: 'Login successful',
      accessToken,
      user: user.publicProfile,
    });
  } catch (error) {
    next(error);
  }
};

// ─── Refresh Access Token ─────────────────────────────────────────────────────
const refreshAccessToken = async (req, res, next) => {
  try {
    // Get refresh token from HttpOnly cookie
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({ message: 'No refresh token provided' });
    }

    // Verify refresh token signature & expiry
    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch (err) {
      clearRefreshTokenCookie(res);
      return res.status(401).json({
        message: err.name === 'TokenExpiredError'
          ? 'Refresh token has expired. Please login again.'
          : 'Invalid refresh token',
      });
    }

    if (decoded.type !== 'refresh') {
      return res.status(401).json({ message: 'Invalid token type' });
    }

    // Find user and verify token exists in DB (token rotation security)
    const hashedToken = hashToken(refreshToken);
    const user = await User.findOne({
      _id: decoded.id,
      'refreshTokens.token': hashedToken,
      isActive: true,
    });

    if (!user) {
      // Token reuse attack detected — clear all tokens for this user
      await User.findByIdAndUpdate(decoded.id, { $set: { refreshTokens: [] } });
      clearRefreshTokenCookie(res);
      return res.status(401).json({
        message: 'Session invalid. Please login again.',
      });
    }

    // ── TOKEN ROTATION ──
    // Remove old refresh token, issue new one (prevents token reuse)
    user.refreshTokens = user.refreshTokens.filter(
      (t) => t.token !== hashedToken
    );

    const newRefreshToken = generateRefreshToken(user._id);
    const newAccessToken = generateAccessToken(user._id, user.role);

    const hashedNewRefreshToken = hashToken(newRefreshToken);
    user.refreshTokens.push({
      token: hashedNewRefreshToken,
      deviceInfo: req.headers['user-agent']?.substring(0, 100) || 'Unknown',
    });
    await user.save();

    // Set new refresh token cookie
    setRefreshTokenCookie(res, newRefreshToken);

    res.status(200).json({
      message: 'Token refreshed successfully',
      accessToken: newAccessToken,
      user: user.publicProfile,
    });
  } catch (error) {
    next(error);
  }
};

// ─── Logout ───────────────────────────────────────────────────────────────────
const logout = async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.refreshToken;

    if (refreshToken) {
      // Remove this specific refresh token from DB
      const hashedToken = hashToken(refreshToken);
      await User.findByIdAndUpdate(req.user?.id, {
        $pull: { refreshTokens: { token: hashedToken } },
      });
    }

    // Clear the cookie
    clearRefreshTokenCookie(res);

    res.status(200).json({ message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
};

// ─── Logout All Devices ───────────────────────────────────────────────────────
const logoutAll = async (req, res, next) => {
  try {
    // Clear ALL refresh tokens for this user
    await User.findByIdAndUpdate(req.user.id, {
      $set: { refreshTokens: [] },
    });

    clearRefreshTokenCookie(res);

    res.status(200).json({ message: 'Logged out from all devices successfully' });
  } catch (error) {
    next(error);
  }
};

// ─── Get Current User ─────────────────────────────────────────────────────────
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user || !user.isActive) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({
      user: user.publicProfile,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { register, login, refreshAccessToken, logout, logoutAll, getMe };
