const { verifyAccessToken } = require('../config/jwt.config');
const User = require('../models/User.model');

// ─── Protect Routes (Access Token required) ────────────────────────────────────
const protect = async (req, res, next) => {
  try {
    let token;

    // Extract from Authorization header: "Bearer <token>"
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    // Verify token
    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
          message: 'Access token has expired',
          code: 'TOKEN_EXPIRED',
        });
      }
      return res.status(401).json({ message: 'Invalid access token' });
    }

    if (decoded.type !== 'access') {
      return res.status(401).json({ message: 'Invalid token type' });
    }

    // Verify user still exists and is active
    const user = await User.findById(decoded.id).select('-password -refreshTokens');
    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'User no longer exists or is deactivated' });
    }

    // Check if password changed after token was issued
    if (user.changedPasswordAfter(decoded.iat)) {
      return res.status(401).json({
        message: 'Password was changed. Please login again.',
        code: 'PASSWORD_CHANGED',
      });
    }

    // Attach user to request
    req.user = { id: user._id.toString(), role: user.role, email: user.email };

    next();
  } catch (error) {
    next(error);
  }
};

// ─── Role-based Authorization ──────────────────────────────────────────────────
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Access denied. Required role: ${roles.join(' or ')}`,
      });
    }

    next();
  };
};

// ─── Optional Auth (doesn't fail if no token) ─────────────────────────────────
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const decoded = verifyAccessToken(token);
        const user = await User.findById(decoded.id).select('-password -refreshTokens');
        if (user && user.isActive) {
          req.user = { id: user._id.toString(), role: user.role, email: user.email };
        }
      } catch {
        // Silently ignore invalid tokens for optional auth
      }
    }
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = { protect, authorize, optionalAuth };
