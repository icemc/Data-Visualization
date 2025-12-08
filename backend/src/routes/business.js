const express = require('express');
const { getDatabase } = require('../database/connection');
const { getCache } = require('../cache/manager');
const { convertBigIntToNumber } = require('../utils/dataConversion');

const router = express.Router();
const db = getDatabase();
const cache = getCache();

/**
 * @swagger
 * /api/business/trends:
 *   get:
 *     tags:
 *       - Business
 *     summary: Get business performance trends over time
 *     description: Returns business performance metrics aggregated by month and venue type
 *     parameters:
 *       - $ref: '#/components/parameters/fromDate'
 *       - $ref: '#/components/parameters/toDate'
 *       - $ref: '#/components/parameters/venueType'
 *       - name: interval
 *         in: query
 *         description: Aggregation interval
 *         schema:
 *           type: string
 *           enum: [month, quarter, year]
 *           default: month
 *     responses:
 *       200:
 *         description: Business trends data
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/BusinessTrend'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/trends', async (req, res) => {
  try {
    const {
      from = '2022-01-01',
      to = '2023-12-31', 
      venueType = 'all',
      interval = 'month'
    } = req.query;

    // Generate cache key
    const cacheKey = cache.generateKey('business_trends', { from, to, venueType, interval });
    
    // Check cache first
    const cached = await cache.get(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    // Input validation and sanitization
    const fromMonth = from.substring(0, 7).replace(/[^0-9-]/g, ''); // "2022-01-01" -> "2022-01"
    const toMonth = to.substring(0, 7).replace(/[^0-9-]/g, '');     // "2022-12-21" -> "2022-12"
    
    // Validate month format (YYYY-MM)
    const monthPattern = /^\d{4}-\d{2}$/;
    if (!monthPattern.test(fromMonth) || !monthPattern.test(toMonth)) {
      return res.status(400).json({ error: 'Invalid date format. Expected YYYY-MM-DD' });
    }

    // Sanitize venue type (whitelist approach)
    const validVenueTypes = ['all', 'Restaurant', 'Pub', 'Workplace', 'Apartment'];
    const sanitizedVenueType = validVenueTypes.includes(venueType) ? venueType : 'all';

    // Build query with direct string interpolation
    let query = `
      SELECT 
        month,
        venueType,
        COUNT(DISTINCT venueId) as venue_count,
        SUM(visit_count) as total_visits,
        AVG(occupancy_rate) as avg_occupancy,
        SUM(revenue_estimate) as total_revenue,
        AVG(unique_visitors) as avg_unique_visitors
      FROM business.trends 
      WHERE month >= '${fromMonth}' AND month <= '${toMonth}'
    `;

    // Add venue type filter with sanitized input
    if (sanitizedVenueType !== 'all') {
      query += ` AND venueType = '${sanitizedVenueType}'`;
    }

    query += ' GROUP BY month, venueType ORDER BY month ASC';

    const results = await db.query(query);
    
    // Cache results
    const convertedResults = convertBigIntToNumber(results);
    await cache.set(cacheKey, convertedResults, 600); // 10 minutes cache

    res.json(convertedResults);
  } catch (error) {
    console.error('Business trends error:', error);
    res.status(500).json({ error: 'Failed to fetch business trends' });
  }
});

/**
 * @swagger
 * /api/business/performance:
 *   get:
 *     tags:
 *       - Business
 *     summary: Get venue performance metrics
 *     description: Returns performance metrics for individual venues
 *     parameters:
 *       - $ref: '#/components/parameters/venueType'
 *       - $ref: '#/components/parameters/limit'
 *       - name: sortBy
 *         in: query
 *         description: Sort results by metric
 *         schema:
 *           type: string
 *           enum: [total_visits, unique_customers, visits_per_customer, daily_visit_rate]
 *           default: total_visits
 *     responses:
 *       200:
 *         description: Venue performance data
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/VenuePerformance'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/performance', async (req, res) => {
  try {
    const {
      venueType = 'all',
      limit = 50,
      sortBy = 'total_visits'
    } = req.query;

    const cacheKey = cache.generateKey('business_performance', { venueType, limit, sortBy });
    
    const cached = await cache.get(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    let query = `
      SELECT 
        venueId,
        venueType,
        total_visits,
        unique_customers,
        visits_per_customer,
        daily_visit_rate,
        operation_days
      FROM business.venue_performance
    `;

    // Input validation and sanitization
    const validVenueTypes = ['all', 'Restaurant', 'Pub', 'Workplace', 'Apartment'];
    const sanitizedVenueType = validVenueTypes.includes(venueType) ? venueType : 'all';
    const sanitizedLimit = Math.max(1, Math.min(parseInt(limit) || 50, 1000)); // Between 1 and 1000

    if (sanitizedVenueType !== 'all') {
      query += ` WHERE venueType = '${sanitizedVenueType}'`;
    }

    // Validate sortBy parameter
    const validSortColumns = ['total_visits', 'unique_customers', 'visits_per_customer', 'daily_visit_rate'];
    const orderBy = validSortColumns.includes(sortBy) ? sortBy : 'total_visits';
    
    query += ` ORDER BY ${orderBy} DESC LIMIT ${sanitizedLimit}`;

    const results = await db.query(query);
    const convertedResults = convertBigIntToNumber(results);
    
    await cache.set(cacheKey, convertedResults, 600);

    res.json(convertedResults);
  } catch (error) {
    console.error('Business performance error:', error);
    res.status(500).json({ error: 'Failed to fetch business performance data' });
  }
});

/**
 * GET /api/business/revenue
 * Get monthly revenue trends over time
 * Query params: venueType, from, to
 */
router.get('/revenue', async (req, res) => {
  try {
    const {
      venueType = 'all',
      from = '2022-03-01',
      to = '2023-05-31'
    } = req.query;

    const cacheKey = cache.generateKey('business_revenue', { venueType, from, to });
    
    const cached = await cache.get(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    // Convert date strings to month format for comparison
    const fromMonth = from.substring(0, 7); // '2022-03-01' -> '2022-03'
    const toMonth = to.substring(0, 7); // '2023-05-31' -> '2023-05'

    // Input validation and sanitization
    const validVenueTypes = ['all', 'Restaurant', 'Pub', 'Workplace', 'Apartment'];
    const sanitizedVenueType = validVenueTypes.includes(venueType) ? venueType : 'all';

    // Get monthly revenue trends from existing business.trends table
    let query = `
      SELECT 
        month,
        venueType,
        SUM(revenue_estimate) as total_revenue,
        SUM(visit_count) as total_visits
      FROM business.trends 
      WHERE month >= '${fromMonth}' AND month <= '${toMonth}'
    `;

    if (sanitizedVenueType !== 'all') {
      query += ` AND venueType = '${sanitizedVenueType}'`;
    }

    query += ' GROUP BY month, venueType ORDER BY month ASC';

    const results = await db.query(query);
    const convertedResults = convertBigIntToNumber(results);
    
    await cache.set(cacheKey, convertedResults, 600);

    res.json(convertedResults);
  } catch (error) {
    console.error('Business revenue error:', error);
    res.status(500).json({ error: 'Failed to fetch business revenue data' });
  }
});

/**
 * GET /api/business/patterns
 * Get customer visit patterns by time of day and day of week
 * Query params: venueId, venueType
 */
router.get('/patterns', async (req, res) => {
  try {
    const {
      venueId,
      venueType = 'all'
    } = req.query;

    const cacheKey = cache.generateKey('business_patterns', { venueId, venueType });
    
    const cached = await cache.get(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    let query = `
      SELECT 
        venueId,
        venueType,
        hour_of_day,
        day_of_week,
        visit_count,
        unique_visitors
      FROM business.customer_patterns
    `;

    // Input validation and sanitization
    const validVenueTypes = ['all', 'Restaurant', 'Pub', 'Workplace', 'Apartment'];
    const sanitizedVenueType = validVenueTypes.includes(venueType) ? venueType : 'all';

    if (venueId) {
      const sanitizedVenueId = parseInt(venueId);
      if (!isNaN(sanitizedVenueId)) {
        query += ` WHERE venueId = ${sanitizedVenueId}`;
      }
    } else if (sanitizedVenueType !== 'all') {
      query += ` WHERE venueType = '${sanitizedVenueType}'`;
    }

    query += ' ORDER BY day_of_week, hour_of_day';

    const results = await db.query(query);
    const convertedResults = convertBigIntToNumber(results);
    
    await cache.set(cacheKey, convertedResults, 1200); // 20 minutes cache

    res.json(convertedResults);
  } catch (error) {
    console.error('Business patterns error:', error);
    res.status(500).json({ error: 'Failed to fetch customer patterns data' });
  }
});

module.exports = router;