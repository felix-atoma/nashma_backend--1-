const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const connectDB = require('./config/db');
const productRoutes = require('./routes/productRoutes');
const cartRoutes = require('./routes/cartRoutes');

dotenv.config();
const app = express();

// ✅ Connect to MongoDB
connectDB();

// ✅ Parse allowed origins from environment variable
const allowedOrigins = process.env.CLIENT_URLS?.split(',') || [];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.error(`❌ CORS Error: Origin ${origin} not allowed`);
      callback(new Error('Not allowed by CORS: ' + origin));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  credentials: true,
};

// ✅ Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.options('*', cors(corsOptions)); // handle pre-flight across all routes


// ✅ API Routes
app.use('/api/contact', require('./routes/contactRoutes'));
app.use('/api/newsletter', require('./routes/newsletterRoutes'));
app.use('/api/products', productRoutes);
app.use('/cart', cartRoutes);

// ✅ Serve static files from public folder (for health check or test page)
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ✅ Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
