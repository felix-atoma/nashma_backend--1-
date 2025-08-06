// seeder.js

const mongoose = require('mongoose');
const dotenv = require('dotenv'); // ✅ You forgot this line before
dotenv.config(); // ✅ Load environment variables first

const connectDB = require('./config/db');
const Product = require('./models/Product');
const products = require('./data/product');

// Add debugging before connecting
console.log('Environment variables loaded...');
console.log('MONGODB_URI exists:', !!process.env.MONGODB_URI);

const importData = async () => {
  try {
    // Connect to database
    await connectDB();
    
    // Clear existing data
    console.log('🗑️ Clearing existing products...');
    await Product.deleteMany();
    
    // Insert new data
    console.log('📦 Inserting products...');
    await Product.insertMany(products);
    
    console.log('✅ Products seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error(`❌ Error seeding data: ${error.message}`);
    process.exit(1);
  }
};

importData();
