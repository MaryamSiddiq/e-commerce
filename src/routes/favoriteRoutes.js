const express = require('express');
const router = express.Router();
const {
  getFavorites,
  addToFavorites,
  removeFromFavorites,
  checkFavorite
} = require('../controllers/favoriteController');
const { protect } = require('../middleware/authMiddleware');

// All favorite routes require authentication
router.use(protect);

router.get('/', getFavorites);
router.post('/:productId', addToFavorites);
router.delete('/:productId', removeFromFavorites);
router.get('/check/:productId', checkFavorite);

module.exports = router;