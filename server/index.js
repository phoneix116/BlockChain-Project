// Load environment variables
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { ethers } = require('ethers');

// Import database connection
const database = require('./config/database');

// Import route handlers
const ipfsRoutes = require('./routes/ipfs');
const contractRoutes = require('./routes/contract');
const invoiceRoutes = require('./routes/invoice');

// Load contract ABI and setup
const contractABI = require('./contracts/InvoiceManager.json').abi;
const contractAddress = '0x5FbDB2315678afecb367f032d93F642f64180aa3';

// Initialize provider and contract
let provider, contract;
try {
  provider = new ethers.JsonRpcProvider('http://localhost:8545');
  contract = new ethers.Contract(contractAddress, contractABI, provider);
  console.log('✅ Contract loaded:', contractAddress);
} catch (error) {
  console.error('❌ Contract setup error:', error.message);
}

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

// Rate limiting - More permissive for development
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 200, // limit each IP to 200 requests per minute
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// CORS configuration
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Request logging
app.use(morgan('combined'));

// Body parsing middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static file serving for uploaded files
app.use('/uploads', express.static('uploads'));

// Make contract available to routes
app.use((req, res, next) => {
  req.contract = contract;
  req.provider = provider;
  next();
});

// API Routes
app.use('/api/ipfs', ipfsRoutes);
app.use('/api/contract', contractRoutes);
app.use('/api/invoice', invoiceRoutes);

// Health check endpoint with database status
app.get('/health', async (req, res) => {
  try {
    const dbHealth = await database.healthCheck();
    res.json({ 
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        blockchain: !!contract,
        ipfs: true,
        database: dbHealth
      }
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message,
      services: {
        blockchain: !!contract,
        ipfs: true,
        database: { status: 'unhealthy', message: error.message }
      }
    });
  }
});

// Root endpoint with API documentation
app.get('/', (req, res) => {
  res.json({
    message: 'Invoice Chain API Server',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      ipfs: '/api/ipfs/*',
      contract: '/api/contract/*',
      invoice: '/api/invoice/*'
    },
    documentation: 'https://localhost:3001'
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: error.message,
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// Start server with database connection
const PORT = process.env.PORT || 3001;

async function startServer() {
  try {
    // Connect to MongoDB first
    console.log('🔄 Connecting to MongoDB Atlas...');
    await database.connect();
    
    // Start Express server
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📖 API Documentation: http://localhost:${PORT}`);
      console.log(`🏥 Health Check: http://localhost:${PORT}/health`);
      console.log(`📊 Database: Connected to MongoDB Atlas`);
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    
    if (error.message.includes('MONGODB_URI')) {
      console.error('💡 Please update your .env file with your MongoDB connection string');
    }
    
    process.exit(1);
  }
}

// Start the server
startServer();

module.exports = app;
