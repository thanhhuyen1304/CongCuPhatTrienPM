const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const passport = require('passport');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Import routes
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const productRoutes = require('./routes/product.routes');
const categoryRoutes = require('./routes/category.routes');
const cartRoutes = require('./routes/cart.routes');
const orderRoutes = require('./routes/order.routes');
const uploadRoutes = require('./routes/upload.routes');
const wishlistRoutes = require('./routes/wishlist.routes');
const shipperRoutes = require('./routes/shipper.routes');

// Import middleware
const errorHandler = require('./middleware/errorHandler');

// Import passport config
require('./config/passport');

const app = express();

/* =======================
   Middleware
======================= */
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
];

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(passport.initialize());

/* =======================
   MongoDB Atlas Connection
======================= */
if (!process.env.MONGO_URI) {
  console.error('❌ MONGO_URI is missing in .env file');
  process.exit(1);
}

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB Atlas Connected Successfully'))
  .catch((err) => {
    console.error('❌ MongoDB Connection Error:', err);
    process.exit(1);
  });

/* =======================
   API Routes
======================= */
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/shipper', shipperRoutes);

/* =======================
   Health Check
======================= */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Server is running',
    environment: process.env.NODE_ENV || 'development',
  });
});

/* =======================
   Error Handling
======================= */
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📡 API available at http://localhost:${PORT}/api`);
});

module.exports = app;
