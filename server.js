const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const connectDB = require('./config/db');

dotenv.config();
const app = express();

// ✅ Connect to MongoDB
connectDB();

// ✅ Allowed origins for both local and live frontend
const allowedOrigins = [
  "http://localhost:5173",
  "https://nashma-agribusness.netlify.app"
];

// ✅ Middleware
app.use(cors({
  origin: allowedOrigins,
  methods: ["GET", "POST"],
  credentials: true,
}));
app.use(express.json());

// ✅ API Routes
app.use('/api/contact', require('./routes/contactRoutes'));
app.use('/api/newsletter', require('./routes/newsletterRoutes'));

// ✅ Serve static files from public folder (for health check or test page)
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ✅ Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
