const { validationResult } = require('express-validator');
const User = require('../models/User.model');

// ─── Get Profile ──────────────────────────────────────────────────────────────
const getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    res.status(200).json({ user: user.publicProfile });
  } catch (error) {
    next(error);
  }
};

// ─── Update Profile ───────────────────────────────────────────────────────────
const updateProfile = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
      });
    }

    const { name, bio, avatar } = req.body;

    const updatedFields = {};
    if (name) updatedFields.name = name.trim();
    if (bio !== undefined) updatedFields.bio = bio;
    if (avatar !== undefined) updatedFields.avatar = avatar;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updatedFields },
      { new: true, runValidators: true }
    );

    if (!user) return res.status(404).json({ message: 'User not found' });

    res.status(200).json({
      message: 'Profile updated successfully',
      user: user.publicProfile,
    });
  } catch (error) {
    next(error);
  }
};

// ─── Change Password ──────────────────────────────────────────────────────────
const changePassword = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
      });
    }

    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user.id).select('+password');
    if (!user) return res.status(404).json({ message: 'User not found' });

    const isCurrentValid = await user.comparePassword(currentPassword);
    if (!isCurrentValid) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({ message: 'New password must be different from current' });
    }

    user.password = newPassword;
    // Invalidate all other sessions when password changes
    user.refreshTokens = [];
    await user.save();

    res.status(200).json({ message: 'Password changed successfully. Please login again.' });
  } catch (error) {
    next(error);
  }
};

// ─── Get Active Sessions ──────────────────────────────────────────────────────
const getSessions = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const sessions = user.refreshTokens.map((t, idx) => ({
      id: idx,
      deviceInfo: t.deviceInfo,
      createdAt: t.createdAt,
    }));

    res.status(200).json({ sessions, count: sessions.length });
  } catch (error) {
    next(error);
  }
};

// ─── Get All Users (Admin only) ───────────────────────────────────────────────
const getAllUsers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      User.find().select('-password -refreshTokens').skip(skip).limit(limit).sort({ createdAt: -1 }),
      User.countDocuments(),
    ]);

    res.status(200).json({
      users,
      pagination: {
        current: page,
        total: Math.ceil(total / limit),
        count: users.length,
        totalUsers: total,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getProfile, updateProfile, changePassword, getSessions, getAllUsers };
