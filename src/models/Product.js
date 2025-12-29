const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  slug: {
    type: String,
    required: true,
    unique: true
  },
  brand: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  originalPrice: {
    type: Number,
    required: true
  },
  discount: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'unisex'],
    required: true
  },
  images: [{
    type: String,
    required: true
  }],
  colors: [{
    name: String,
    hex: String
  }],
  sizes: [{
    size: {
      type: String,
      enum: ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL']
    },
    stock: {
      type: Number,
      default: 0,
      min: 0
    }
  }],
specifications: {
  fabric: { type: String },
  type: { type: String },
  fit: { type: String },
  occasion: { type: String },
  pattern: { type: String },
  sleeves: { type: String }
},
  rating: {
    average: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    count: {
      type: Number,
      default: 0
    }
  },
  reviews: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    name: String,
    rating: Number,
    comment: String,
    images: [String],
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  totalStock: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  tags: [String]
}, {
  timestamps: true
});

// Index for search
productSchema.index({ name: 'text', brand: 'text', description: 'text' });

// Calculate total stock
productSchema.pre('save', function () {
  this.totalStock = this.sizes.reduce(
    (total, size) => total + size.stock,
    0
  );
});

module.exports = mongoose.model('Product', productSchema);