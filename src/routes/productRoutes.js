const express = require('express');
const router = express.Router();
const {
  getAllProducts,
  getProductById,
  getProductsByCategory,
  searchProducts,
  addReview,
  createProduct
} = require('../controllers/productController');
const { protect } = require('../middleware/authMiddleware');

router.get('/', getAllProducts);
router.get('/search', searchProducts);
router.get('/category/:categorySlug', getProductsByCategory);
router.get('/:id', getProductById);
router.post('/:id/reviews', protect, addReview);
router.post('/', createProduct); // For testing - add admin middleware later

module.exports = router;