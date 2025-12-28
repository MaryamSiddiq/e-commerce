require('dotenv').config();
const app = require('../src/app');
const connectDB = require('../src/config/database');

// Connect to database
connectDB();

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.log('❌ Unhandled Rejection! Shutting down...');
  console.log(err.name, err.message);
  // Don't use server.close() in serverless
});

// Export the app for Vercel (NO app.listen()!)
module.exports = app;