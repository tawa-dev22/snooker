import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/db.js';

// Route Imports
import authRoutes from './routes/authRoutes.js';
import tournamentRoutes from './routes/tournamentRoutes.js';
import matchRoutes from './routes/matchRoutes.js';

// Initialize env
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB Atlas Database
connectDB();

// CORS dynamic configuration supporting standard headers, credentials, and Vercel domains
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:5173'];

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, or server-to-server calls)
    if (!origin) return callback(null, true);
    
    const isAllowedLocalOrProd = allowedOrigins.includes(origin);
    const isAllowedVercelBranch = origin.endsWith('.vercel.app');

    if (isAllowedLocalOrProd || isAllowedVercelBranch) {
      callback(null, true);
    } else {
      console.warn(`Origin '${origin}' blocked by CORS policy.`);
      callback(new Error('Blocked by CORS policy'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
app.use(express.json());

// Request logging middleware for server health monitoring
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Register Api Routes
app.use('/api/auth', authRoutes);
app.use('/api/tournaments', tournamentRoutes);
app.use('/api/matches', matchRoutes); // Also hosts player registry & SSE endpoints

// Root Landing verification path
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    message: 'Snooker League & Tournament Management Live Server is active.',
    environment: process.env.NODE_ENV || 'development',
  });
});

// Global Fallback Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Error encountered:', err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`SNOOKER LEAGUE BACKEND RUNNING IN PORT: ${PORT}`);
  console.log(`Active Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`====================================================`);
});
