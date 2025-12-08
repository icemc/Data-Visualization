const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');
const swaggerSpecs = require('./docs/swagger');
require('dotenv').config();

const businessRoutes = require('./routes/business');
const financialRoutes = require('./routes/financial');
const employmentRoutes = require('./routes/employment');
const summaryRoutes = require('./routes/summary');

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Compression middleware
app.use(compression());

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use(morgan('combined'));

// Swagger API documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Economic Analysis API Documentation'
}));

/**
 * @swagger
 * /health:
 *   get:
 *     tags:
 *       - System
 *     summary: Health check endpoint
 *     description: Returns the current health status of the API server
 *     responses:
 *       200:
 *         description: Server is healthy
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthStatus'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

/**
 * @swagger
 * /:
 *   get:
 *     tags:
 *       - System
 *     summary: Redirect to API documentation
 *     description: Redirects to the OpenAPI documentation interface
 *     responses:
 *       302:
 *         description: Redirect to API docs
 */
app.get('/', (req, res) => {
  res.redirect('/api-docs');
});

// API routes
app.use('/api/business', businessRoutes);
app.use('/api/financial', financialRoutes);
app.use('/api/employment', employmentRoutes);
app.use('/api/summary', summaryRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message,
    timestamp: new Date().toISOString()
  });
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Received SIGINT. Graceful shutdown...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Received SIGTERM. Graceful shutdown...');
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`Economic Analysis API server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Database: ${process.env.DB_PATH || '/app/data/economic.duckdb'}`);
});