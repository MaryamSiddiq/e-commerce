const express = require('express');
const router = express.Router();
const {
  getAllCategories,
  getCategoryBySlug,
  createCategory,
  
} = require('../controllers/categoryController');

router.get('/', getAllCategories);
router.get('/:slug', getCategoryBySlug);
router.post('/', createCategory); // For testing


module.exports = router;