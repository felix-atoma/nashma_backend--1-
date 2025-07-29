const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');

// ============================================
// 🚨 CRITICAL: ENVIRONMENT VARIABLES SETUP
// ============================================
const envPath = path.resolve(__dirname, '.env');
dotenv.config({ path: envPath });

// Verify essential environment variables
const requiredEnvVars = ['MONGO_URI', 'JWT_SECRET', 'PORT', 'CLIENT_URLS'];
requiredEnvVars.forEach(envVar => {
  if (!process.env[envVar]) {
    console.error(`❌ Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
});

// ============================================
// 🛢️ DATABASE CONNECTION (WITH ENHANCED ERROR HANDLING)
// ============================================
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000, // 10 seconds timeout
      socketTimeoutMS: 45000, // 45 seconds socket timeout
    });
    
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`📊 Database Name: ${conn.connection.name}`);
    
    // Monitor connection events
    conn.connection.on('connected', () => {
      console.log('📡 Mongoose default connection open');
    });
    
    conn.connection.on('error', (err) => {
      console.error(`❌ Mongoose connection error: ${err}`);
    });
    
    conn.connection.on('disconnected', () => {
      console.log('🔌 Mongoose default connection disconnected');
    });
    
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    console.error('💡 Troubleshooting Tips:');
    console.error('1. Check if your MongoDB Atlas IP whitelist includes your current IP');
    console.error('2. Verify your MongoDB credentials in the .env file');
    console.error('3. Ensure your internet connection is stable');
    process.exit(1);
  }
};
connectDB();

// ============================================
// 🚀 EXPRESS APPLICATION SETUP
// ============================================
const app = express();

// ============================================
// 🔒 SECURITY & CORS CONFIGURATION
// ============================================
const allowedOrigins = process.env.CLIENT_URLS.split(',').map(url => url.trim());
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.error(`🚨 CORS Violation Attempt from: ${origin}`);
      callback(new Error(`Not allowed by CORS. Allowed origins: ${allowedOrigins.join(', ')}`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Enable pre-flight for all routes

// ============================================
// 🛡️ SECURITY MIDDLEWARE
// ============================================
app.use(express.json({ limit: '10kb' })); // Limit JSON payload size
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

// Remove X-Powered-By header
app.disable('x-powered-by');

// ============================================
// 📊 REQUEST LOGGING
// ============================================
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', {
    skip: (req, res) => req.originalUrl === '/healthcheck'
  }));
}

// ============================================
// 🏠 BASIC ROUTES
// ============================================
app.get('/api/healthcheck', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date(),
    uptime: process.uptime(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

app.get('/', (req, res) => {
  res.json({ 
    message: '🚀 Welcome to Nashma Backend API',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    documentation: '/api-docs' // If you implement Swagger later
  });
});

// ============================================
// 📌 API ROUTES
// ============================================
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/products', require('./routes/productRoutes'));
app.use('/api/cart', require('./routes/cartRoutes'));
app.use('/api/contact', require('./routes/contactRoutes'));
app.use('/api/newsletter', require('./routes/newsletterRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));

// ============================================
// 🗄️ STATIC FILES
// ============================================
app.use(
  express.static(path.join(__dirname, 'public'), {
    maxAge: '1d',
    setHeaders: (res, path) => {
      if (path.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache');
      }
    },
  })
);


// ============================================
// ❌ ERROR HANDLING
// ============================================
// 404 Handler
app.use((req, res, next) => {
  res.status(404).json({
    status: 'error',
    message: `🔍 Not Found - ${req.method} ${req.originalUrl}`
  });
});

// Global Error Handler
const errorHandler = require('./middleware/errorMiddleware');
app.use(errorHandler);

// ============================================
// 🚦 SERVER STARTUP
// ============================================
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`\n✅ Server running in ${process.env.NODE_ENV || 'development'} mode`);
  console.log(`🌐 Access URLs:`);
  console.log(`   Local: http://localhost:${PORT}`);
  console.log(`   Network: http://${require('ip').address()}:${PORT}`);
  console.log(`📅 Started at: ${new Date().toISOString()}`);
  console.log(`🔗 Allowed CORS Origins: ${allowedOrigins.join(', ')}`);
});

// ============================================
// 🛑 GRACEFUL SHUTDOWN HANDLING
// ============================================
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('💤 Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received. Shutting down gracefully...');
  server.close(() => {
    console.log('💤 Process terminated');
    process.exit(0);
  });
});