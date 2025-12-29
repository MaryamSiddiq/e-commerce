const Favorite = require('../models/Favorite');
const Product = require('../models/Product');

// Get user's favorites
exports.getFavorites = async (req, res) => {
  try {
    let favorite = await Favorite.findOne({ user: req.user.id })
      .populate('products', 'name brand price originalPrice discount images rating');

    if (!favorite) {
      favorite = await Favorite.create({ user: req.user.id, products: [] });
    }

    res.json({
      success: true,
      data: favorite.products
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching favorites',
      error: error.message
    });
  }
};

// Add to favorites
exports.addToFavorites = async (req, res) => {
  try {
    const { productId } = req.params;

    // Check if product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    let favorite = await Favorite.findOne({ user: req.user.id });

    if (!favorite) {
      favorite = new Favorite({ user: req.user.id, products: [] });
    }

    // Check if already in favorites
    if (favorite.products.includes(productId)) {
      return res.status(400).json({
        success: false,
        message: 'Product already in favorites'
      });
    }

    favorite.products.push(productId);
    await favorite.save();
    await favorite.populate('products', 'name brand price originalPrice discount images rating');

    res.json({
      success: true,
      message: 'Added to favorites',
      data: favorite.products
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error adding to favorites',
      error: error.message
    });
  }
};

// Remove from favorites
exports.removeFromFavorites = async (req, res) => {
  try {
    const { productId } = req.params;

    const favorite = await Favorite.findOne({ user: req.user.id });

    if (!favorite) {
      return res.status(404).json({
        success: false,
        message: 'Favorites not found'
      });
    }

    favorite.products = favorite.products.filter(
      id => id.toString() !== productId
    );

    await favorite.save();
    await favorite.populate('products', 'name brand price originalPrice discount images rating');

    res.json({
      success: true,
      message: 'Removed from favorites',
      data: favorite.products
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error removing from favorites',
      error: error.message
    });
  }
};

// Check if product is in favorites
exports.checkFavorite = async (req, res) => {
  try {
    const { productId } = req.params;

    const favorite = await Favorite.findOne({ user: req.user.id });

    const isFavorite = favorite && favorite.products.includes(productId);

    res.json({
      success: true,
      isFavorite
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error checking favorite',
      error: error.message
    });
  }
};