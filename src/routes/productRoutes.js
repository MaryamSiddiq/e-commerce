const express = require('express');
const { protect, admin } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', async (req, res) => {
  res.json({
    success: true,
    message: 'Get all products',
    data: []
  });
});

router.get('/:id', async (req, res) => {
  res.json({
    success: true,
    message: 'Get single product'
  });
});

router.post('/', protect, admin, async (req, res) => {
  res.json({
    success: true,
    message: 'Create product'
  });
});

module.exports = router;