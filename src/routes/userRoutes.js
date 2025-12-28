const express = require('express');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// Get user profile
router.get('/profile', protect, (req, res) => {
  res.json({
    success: true,
    data: req.user
  });
});

// Update user profile
router.put('/profile', protect, async (req, res) => {
  res.json({
    success: true,
    message: 'Profile update endpoint'
  });
});

module.exports = router;