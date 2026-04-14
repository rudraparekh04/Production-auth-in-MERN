const express = require('express');
const router = express.Router();
const {
  getProfile,
  updateProfile,
  changePassword,
  getSessions,
  getAllUsers,
} = require('../controllers/user.controller');
const { protect, authorize } = require('../middleware/auth.middleware');
const {
  updateProfileValidation,
  changePasswordValidation,
} = require('../middleware/validation.middleware');

// All user routes require authentication
router.use(protect);

router.get('/profile', getProfile);
router.put('/profile', updateProfileValidation, updateProfile);
router.put('/change-password', changePasswordValidation, changePassword);
router.get('/sessions', getSessions);

// Admin only routes
router.get('/all', authorize('admin'), getAllUsers);

module.exports = router;
