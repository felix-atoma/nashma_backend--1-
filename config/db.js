// Add this to your main server file (app.js or server.js)
const mongoose = require('mongoose');

// Debug the connection string (hide password)
console.log('🔗 Connecting to:', process.env.MONGODB_URI?.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'));

mongoose.connect(process.env.MONGODB_URI);

// Add connection event listeners
mongoose.connection.on('connected', () => {
  console.log('✅ MongoDB Connected');
  console.log('🔗 Database name:', mongoose.connection.db.databaseName);
  console.log('🔗 Connection ready state:', mongoose.connection.readyState);
});

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('⚠️ MongoDB disconnected');
});