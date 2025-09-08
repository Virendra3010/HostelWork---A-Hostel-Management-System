const mongoose = require('mongoose');

// Disable mongoose debug logging
mongoose.set('debug', false);

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('Database connection error:', error.message);
    console.log('Running in offline mode - some features may be limited');
  }
};

module.exports = connectDB;