// controllers/categoryController.js
const Category = require('../models/Category');

// Get all categories organized by gender and parent
exports.getAllCategories = async (req, res) => {
  try {
    const { gender } = req.query;
    const filter = { isActive: true };
    
    if (gender) filter.gender = gender;

    const categories = await Category.find(filter)
      .populate('parentCategory', 'name slug gender')
      .sort({ gender: 1, name: 1 });

    // Organize by gender first, then by parent category
    const organized = {
      male: {
        main: [], // Categories without parent (main categories for male)
        subcategories: {} // key: parentCategory slug, value: subcategories
      },
      female: {
        main: [], // Categories without parent (main categories for female)
        subcategories: {}
      },
      unisex: {
        main: [],
        subcategories: {}
      }
    };

    categories.forEach(category => {
      const gender = category.gender;
      
      if (!category.parentCategory) {
        // This is a main category (like "Men's Fashion", "Women's Fashion")
        organized[gender].main.push(category);
      } else {
        // This is a subcategory
        const parentSlug = category.parentCategory.slug;
        
        if (!organized[gender].subcategories[parentSlug]) {
          organized[gender].subcategories[parentSlug] = [];
        }
        
        organized[gender].subcategories[parentSlug].push(category);
      }
    });

    res.json({
      success: true,
      data: categories,
      organized
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching categories',
      error: error.message
    });
  }
};

// Get category by slug with its children
exports.getCategoryBySlug = async (req, res) => {
  try {
    const category = await Category.findOne({ 
      slug: req.params.slug,
      isActive: true 
    }).populate('parentCategory', 'name slug gender');

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // If this category is a main category (no parent), get its subcategories
    let subcategories = [];
    if (!category.parentCategory) {
      subcategories = await Category.find({
        parentCategory: category._id,
        isActive: true
      }).select('name slug image gender');
    }

    res.json({
      success: true,
      data: {
        ...category.toObject(),
        subcategories
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching category',
      error: error.message
    });
  }
};

// Create category (Admin)
exports.createCategory = async (req, res) => {
  try {
    const category = await Category.create(req.body);
    
    // Populate parentCategory if it exists
    const populatedCategory = await Category.findById(category._id)
      .populate('parentCategory', 'name slug gender');

    res.status(201).json({
      success: true,
      data: populatedCategory
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating category',
      error: error.message
    });
  }
};