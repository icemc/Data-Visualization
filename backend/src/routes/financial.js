const express = require('express');
const { getDatabase } = require('../database/connection');
const { getCache } = require('../cache/manager');
const { convertBigIntToNumber } = require('../utils/dataConversion');

const router = express.Router();
const db = getDatabase();
const cache = getCache();

/**
 * @swagger
 * /api/financial/trajectories:
 *   get:
 *     tags:
 *       - Financial
 *     summary: Get participant financial trajectories over time
 *     description: Returns financial trajectory data for participants grouped by demographics
 *     parameters:
 *       - $ref: '#/components/parameters/fromDate'
 *       - $ref: '#/components/parameters/toDate'
 *       - $ref: '#/components/parameters/educationLevel'
 *       - name: ageGroup
 *         in: query
 *         description: Filter by age group
 *         schema:
 *           type: string
 *           enum: [all, young, middle, senior]
 *           default: all
 *       - name: groupBy
 *         in: query
 *         description: Grouping method
 *         schema:
 *           type: string
 *           enum: [month, quarter]
 *           default: month
 *     responses:
 *       200:
 *         description: Financial trajectory data
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/FinancialTrajectory'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/trajectories', async (req, res) => {
  try {
    const {
      from = '2022-01-01',
      to = '2023-12-31',
      groupBy = 'month',
      educationLevel = 'all',
      ageGroup = 'all'
    } = req.query;

    // Input validation and sanitization
    const fromMonth = from.substring(0, 7).replace(/[^0-9-]/g, ''); // "2022-01-01" -> "2022-01"
    const toMonth = to.substring(0, 7).replace(/[^0-9-]/g, '');     // "2023-12-31" -> "2023-12"
    
    // Validate month format (YYYY-MM)
    const monthPattern = /^\d{4}-\d{2}$/;
    if (!monthPattern.test(fromMonth) || !monthPattern.test(toMonth)) {
      return res.status(400).json({ error: 'Invalid date format. Expected YYYY-MM-DD' });
    }

    // Sanitize education level (whitelist approach)
    const validEducationLevels = ['all', 'HighSchoolOrCollege', 'Bachelors', 'Graduate'];
    const sanitizedEducationLevel = validEducationLevels.includes(educationLevel) ? educationLevel : 'all';

    // Sanitize age group (whitelist approach)
    const validAgeGroups = ['all', 'young', 'middle', 'senior'];
    const sanitizedAgeGroup = validAgeGroups.includes(ageGroup) ? ageGroup : 'all';

    const cacheKey = cache.generateKey('financial_trajectories', { 
      from: fromMonth, to: toMonth, groupBy, educationLevel: sanitizedEducationLevel, ageGroup: sanitizedAgeGroup 
    });
    
    const cached = await cache.get(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    // Convert YYYY-MM to integer format for comparison (YYYYMM)
    const fromMonthInt = parseInt(fromMonth.replace('-', ''));  // "2022-01" -> 202201
    const toMonthInt = parseInt(toMonth.replace('-', ''));      // "2023-12" -> 202312

    let query = `
      SELECT 
        month,
        educationLevel,
        age,
        AVG(avg_balance) as avg_balance,
        MEDIAN(avg_balance) as median_balance,
        STDDEV(avg_balance) as balance_std_dev,
        AVG(total_budget) as avg_budget,
        COUNT(DISTINCT participantId) as participant_count,
        COUNT(CASE WHEN avg_balance < 0 THEN 1 END) as participants_in_debt
      FROM financial.participant_trajectories 
      WHERE CAST(month AS VARCHAR) >= '${fromMonth}' AND CAST(month AS VARCHAR) <= '${toMonth}'
    `;

    if (sanitizedEducationLevel !== 'all') {
      query += ` AND educationLevel = '${sanitizedEducationLevel}'`;
    }

    if (sanitizedAgeGroup !== 'all') {
      // Define age groups
      const ageRanges = {
        'young': [18, 30],
        'middle': [31, 50], 
        'senior': [51, 100]
      };
      
      if (ageRanges[sanitizedAgeGroup]) {
        query += ` AND age >= ${ageRanges[sanitizedAgeGroup][0]} AND age <= ${ageRanges[sanitizedAgeGroup][1]}`;
      }
    }

    query += ' GROUP BY month, educationLevel, age ORDER BY month ASC';

    const results = await db.query(query, []);
    const convertedResults = convertBigIntToNumber(results);
    
    await cache.set(cacheKey, convertedResults, 600);

    res.json(convertedResults);
  } catch (error) {
    console.error('Financial trajectories error:', error);
    res.status(500).json({ error: 'Failed to fetch financial trajectories' });
  }
});

/**
 * GET /api/financial/groups
 * Get financial health by demographic groups
 * Query params: month, groupBy
 */
router.get('/groups', async (req, res) => {
  try {
    const {
      month = 'latest',
      groupBy = 'educationLevel'
    } = req.query;

    const cacheKey = cache.generateKey('financial_groups', { month, groupBy });
    
    const cached = await cache.get(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    let query = `
      SELECT 
        ${groupBy},
        COUNT(*) as group_size,
        AVG(group_avg_balance) as avg_balance,
        MEDIAN(group_median_balance) as median_balance,
        AVG(group_avg_budget) as avg_budget,
        AVG(group_balance_std) as balance_volatility
      FROM financial.groups
    `;

    const params = [];

    if (month !== 'latest') {
      query += ' WHERE month = ?';
      params.push(month);
    } else {
      // Get the latest month
      query += ` WHERE month = (SELECT MAX(month) FROM financial.groups)`;
    }

    // Validate groupBy parameter
    const validGroupColumns = ['educationLevel', 'age', 'householdSize', 'haveKids'];
    if (!validGroupColumns.includes(groupBy)) {
      return res.status(400).json({ error: 'Invalid groupBy parameter' });
    }

    query += ` GROUP BY ${groupBy} ORDER BY avg_balance DESC`;

    const results = await db.query(query, params);
    
    await cache.set(cacheKey, results, 600);

    res.json(results);
  } catch (error) {
    console.error('Financial groups error:', error);
    res.status(500).json({ error: 'Failed to fetch financial groups data' });
  }
});

/**
 * GET /api/financial/wages
 * Get wage analysis data
 * Query params: from, to, educationLevel
 */
router.get('/wages', async (req, res) => {
  try {
    const {
      from = '2022-01-01',
      to = '2023-12-31',
      educationLevel = 'all'
    } = req.query;

    const cacheKey = cache.generateKey('financial_wages', { from, to, educationLevel });
    
    const cached = await cache.get(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    let query = `
      SELECT 
        month,
        educationLevel,
        age,
        avg_hourly_rate,
        median_hourly_rate,
        min_hourly_rate,
        max_hourly_rate,
        employed_count
      FROM financial.wage_analysis 
      WHERE month BETWEEN ? AND ?
    `;

    const params = [from, to];

    if (educationLevel !== 'all') {
      query += ' AND educationLevel = ?';
      params.push(educationLevel);
    }

    query += ' ORDER BY month ASC, educationLevel';

    const results = await db.query(query, params);
    
    await cache.set(cacheKey, results, 600);

    res.json(results);
  } catch (error) {
    console.error('Financial wages error:', error);
    res.status(500).json({ error: 'Failed to fetch wage analysis data' });
  }
});

/**
 * GET /api/financial/cost-of-living
 * Get cost of living trends
 * Query params: from, to, category
 */
router.get('/cost-of-living', async (req, res) => {
  try {
    const {
      from = '2022-01-01',
      to = '2023-12-31',
      category = 'all'
    } = req.query;

    const cacheKey = cache.generateKey('financial_col', { from, to, category });
    
    const cached = await cache.get(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    let query = `
      SELECT 
        month,
        category,
        total_expenses,
        avg_expense,
        participants_with_expense,
        avg_rent,
        median_rent
      FROM financial.cost_living_trends 
      WHERE month BETWEEN ? AND ?
    `;

    const params = [from, to];

    if (category !== 'all') {
      query += ' AND category = ?';
      params.push(category);
    }

    query += ' ORDER BY month ASC, category';

    const results = await db.query(query, params);
    
    await cache.set(cacheKey, results, 600);

    res.json(results);
  } catch (error) {
    console.error('Cost of living error:', error);
    res.status(500).json({ error: 'Failed to fetch cost of living data' });
  }
});

/**
 * GET /api/financial/distribution
 * Get financial balance distribution data
 * Query params: month, metric
 */
router.get('/distribution', async (req, res) => {
  try {
    const {
      month = 'latest',
      metric = 'avg_balance'
    } = req.query;

    const cacheKey = cache.generateKey('financial_distribution', { month, metric });
    
    const cached = await cache.get(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    let monthCondition = '';
    const params = [];

    if (month !== 'latest') {
      monthCondition = 'WHERE month = ?';
      params.push(month);
    } else {
      monthCondition = 'WHERE month = (SELECT MAX(month) FROM financial.participant_trajectories)';
    }

    // Validate metric parameter
    const validMetrics = ['avg_balance', 'total_budget', 'balance_change_pct'];
    if (!validMetrics.includes(metric)) {
      return res.status(400).json({ error: 'Invalid metric parameter' });
    }

    const query = `
      WITH distribution_buckets AS (
        SELECT 
          ${metric},
          CASE 
            WHEN ${metric} < -1000 THEN 'Very Poor'
            WHEN ${metric} BETWEEN -1000 AND 0 THEN 'Poor' 
            WHEN ${metric} BETWEEN 0 AND 1000 THEN 'Low'
            WHEN ${metric} BETWEEN 1000 AND 5000 THEN 'Middle'
            WHEN ${metric} BETWEEN 5000 AND 15000 THEN 'Upper Middle'
            ELSE 'High'
          END as wealth_category,
          educationLevel,
          age,
          householdSize
        FROM financial.participant_trajectories 
        ${monthCondition}
      )
      SELECT 
        wealth_category,
        COUNT(*) as participant_count,
        AVG(${metric}) as avg_value,
        MIN(${metric}) as min_value,
        MAX(${metric}) as max_value
      FROM distribution_buckets
      GROUP BY wealth_category
      ORDER BY avg_value ASC
    `;

    const results = await db.query(query, params);
    
    await cache.set(cacheKey, results, 900); // 15 minutes cache

    res.json(results);
  } catch (error) {
    console.error('Financial distribution error:', error);
    res.status(500).json({ error: 'Failed to fetch financial distribution data' });
  }
});

module.exports = router;