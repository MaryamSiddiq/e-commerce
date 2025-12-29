const express = require('express');
const cors = require('cors');
const errorHandler = require('./middleware/errorHandler');

// Import routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const productRoutes = require('./routes/productRoutes');
const categoryRoutes=require('./routes/categoryRoutes');
const cartRoutes=require('./routes/cartRoutes');
const orderRoutes=require('./routes/orderRoutes');
const favouriteRoutes=require('./routes/favoriteRoutes');
//const categoryRoutes=require('./routes/categoryRoutes')
//const googleAuthRoute = require('./routes/googleAuth');


const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'E-commerce API is running',
    version: '1.0.0'
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/product',productRoutes);
app.use('/api/category',categoryRoutes);
app.use('/api/cart',cartRoutes)
app.use('/api/order',orderRoutes)
app.use('/api/favourite',favouriteRoutes)
//app.use('/api', googleAuthRoute);
// Error handling middleware (must be last)
app.use(errorHandler);

module.exports = app;