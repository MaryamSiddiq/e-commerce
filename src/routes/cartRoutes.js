const express = require('express');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', protect, async (req, res) => {
  res.json({
    success: true,
    data: { items: [], total: 0 }
  });
});

router.post('/add', protect, async (req, res) => {
  res.json({
    success: true,
    message: 'Add to cart'
  });
});

module.exports = router;