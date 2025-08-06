const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const { createServer } = require('http');
const { Server } = require('socket.io');

// ============================================
// 🚨 ENVIRONMENT CONFIGURATION
// ============================================
dotenv.config({ path: path.resolve(__dirname, '.env') });

// ✅ FIXED: Changed MONGO_URI to MONGODB_URI to match your .env file
const requiredEnvVars = ['MONGODB_URI', 'JWT_SECRET', 'PORT', 'CLIENT_URLS'];
requiredEnvVars.forEach(envVar => {
  if (!process.env[envVar]) throw new Error(`Missing ${envVar} in .env`);
});

// ============================================
// 🛢️ DATABASE CONNECTION (WITH IMPROVED HANDLING)
// ============================================
const connectDB = async () => {
  const options = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 30000,
    maxPoolSize: 50,
    minPoolSize: 5,
    retryWrites: true,
    w: 'majority'
  };

  try {
    // ✅ FIXED: Changed to use MONGODB_URI
    const conn = await mongoose.connect(process.env.MONGODB_URI, options);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    
    conn.connection.on('error', err => {
      console.error('MongoDB connection error:', err);
      if (err.message.includes('buffering timed out')) {
        mongoose.disconnect();
      }
    });
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error);
    process.exit(1);
  }
};
connectDB();

// ============================================
// 🚀 EXPRESS SERVER CONFIGURATION
// ============================================
const app = express();
const httpServer = createServer(app);

// Add Socket.io support
const io = new Server(httpServer, {
  pingTimeout: 60000,
  cors: {
    origin: process.env.CLIENT_URLS.split(','),
    methods: ['GET', 'POST']
  }
});

// ============================================
// 🔒 SECURITY MIDDLEWARE
// ============================================
app.use(helmet());
app.use(cookieParser());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  skip: req => req.ip === '::1' // Skip for localhost
});

// Request slowing
const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 50, // Allow 50 requests per 15 minutes without delay
  delayMs: () => 500, // Add 500ms delay per request after delayAfter
  maxDelayMs: 20000, // Maximum delay of 20 seconds
  validate: {
    delayMs: false // This will disable the warning
  }
});

app.use(limiter);
app.use(speedLimiter);

// Enhanced CORS
const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = process.env.CLIENT_URLS.split(',');
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Body parsing with size limits
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// ============================================
// ⏱️ REQUEST TIMEOUT HANDLING
// ============================================
app.use((req, res, next) => {
  res.setTimeout(10000, () => {
    if (!res.headersSent) {
      res.status(504).json({ error: 'Request timeout' });
    }
  });
  next();
});

// ============================================
// 📊 LOGGING & MONITORING
// ============================================
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', {
    skip: (req, res) => req.path === '/healthcheck'
  }));
}

// Event loop monitoring (Optional - comment out if blocked-at is not installed)
// require('blocked-at')((time, stack) => {
//   console.error(`Event loop blocked for ${time}ms`, stack);
// }, { threshold: 100 });

// ============================================
// 🛠️ ROUTES SETUP
// ============================================
// Health check endpoint
app.get('/healthcheck', (req, res) => {
  res.json({
    status: 'ok',
    db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    memory: process.memoryUsage(),
    uptime: process.uptime()
  });
});

app.get('/', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Nashma backend running' });
});

// API Routes with error handling
const routes = [
  { path: '/api/auth', route: './routes/authRoutes' },
  { path: '/api/products', route: './routes/productRoutes' },
  { path: '/api/cart', route: './routes/cartRoutes' },
  { path: '/api/contact', route: './routes/contactRoutes' },
  { 
    path: '/api/admin', 
    route: './routes/adminRoutes', 
    middleware: [
      require('./middleware/authMiddleware').protect,
      require('./middleware/authMiddleware').restrictTo('admin')
    ]
  }
];

routes.forEach(({ path, route, middleware = [] }) => {
  try {
    const routeHandler = require(route);
    app.use(path, ...middleware, routeHandler);
  } catch (error) {
    console.warn(`⚠️ Failed to load route ${route}:`, error.message);
  }
});

// ============================================
// 🛑 ERROR HANDLING
// ============================================
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', err => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

// ============================================
// 🚦 SERVER STARTUP
// ============================================
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // Optional: Log memory usage periodically
  setInterval(() => {
    const memory = process.memoryUsage();
    console.log(`💾 Memory usage: ${Math.round(memory.heapUsed / 1024 / 1024)}MB`);
  }, 60000);
});

// Graceful shutdown
['SIGINT', 'SIGTERM'].forEach(signal => {
  process.on(signal, () => {
    console.log(`Received ${signal}, shutting down gracefully...`);
    httpServer.close(() => {
      mongoose.disconnect();
      process.exit(0);
    });
  });
});