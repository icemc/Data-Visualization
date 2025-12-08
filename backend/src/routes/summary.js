const express = require('express');
const { getDatabase } = require('../database/connection');
const { getCache } = require('../cache/manager');
const { convertBigIntToNumber } = require('../utils/dataConversion');

const router = express.Router();
const db = getDatabase();
const cache = getCache();

/**
 * @swagger
 * /api/summary:
 *   get:
 *     tags:
 *       - Summary
 *     summary: Get overall economic summary statistics
 *     description: Returns aggregated summary statistics across all business, financial, and employment metrics
 *     responses:
 *       200:
 *         description: Economic summary data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SummaryData'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/', async (req, res) => {
  try {
    const cacheKey = cache.generateKey('summary_all', {});
    
    const cached = await cache.get(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    // Get all summary data in parallel
    const [businessSummary, financialSummary, employmentSummary] = await Promise.all([
      db.queryOne('SELECT * FROM summaries.business_summary'),
      db.queryOne('SELECT * FROM summaries.financial_summary'),
      db.queryOne('SELECT * FROM summaries.employment_summary')
    ]);

    const summary = {
      business: convertBigIntToNumber(businessSummary || {}),
      financial: convertBigIntToNumber(financialSummary || {}),
      employment: convertBigIntToNumber(employmentSummary || {}),
      timestamp: new Date().toISOString()
    };

    await cache.set(cacheKey, summary, 1800); // 30 minutes cache

    res.json(summary);
  } catch (error) {
    console.error('Summary error:', error);
    res.status(500).json({ error: 'Failed to fetch summary data' });
  }
});

/**
 * GET /api/summary/trends
 * Get monthly trend summary across all metrics
 */
router.get('/trends', async (req, res) => {
  try {
    const {
      from = '2022-01-01',
      to = '2023-12-31'
    } = req.query;

    const cacheKey = cache.generateKey('summary_trends', { from, to });
    
    const cached = await cache.get(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const query = `
      SELECT 
        month,
        active_venues,
        total_visits,
        avg_participant_balance,
        active_employers,
        total_employed
      FROM summaries.monthly_trends 
      WHERE month BETWEEN ? AND ?
      ORDER BY month ASC
    `;

    const results = await db.query(query, [from, to]);
    const convertedResults = convertBigIntToNumber(results);
    
    await cache.set(cacheKey, convertedResults, 900); // 15 minutes cache

    res.json(convertedResults);
  } catch (error) {
    console.error('Summary trends error:', error);
    res.status(500).json({ error: 'Failed to fetch trend summary data' });
  }
});

/**
 * @swagger
 * /api/summary/kpis:
 *   get:
 *     tags:
 *       - Summary
 *     summary: Get key performance indicators
 *     description: Returns calculated KPIs for business, financial, and employment metrics
 *     parameters:
 *       - $ref: '#/components/parameters/month'
 *     responses:
 *       200:
 *         description: Key performance indicators
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 business:
 *                   type: object
 *                   properties:
 *                     total_venues:
 *                       type: integer
 *                     total_visits:
 *                       type: integer
 *                     avg_visits_per_venue:
 *                       type: number
 *                 financial:
 *                   type: object
 *                   properties:
 *                     avg_balance:
 *                       type: number
 *                     participants_in_debt:
 *                       type: integer
 *                     debt_rate:
 *                       type: string
 *                 employment:
 *                   type: object
 *                   properties:
 *                     total_employers:
 *                       type: integer
 *                     total_employed:
 *                       type: integer
 *                     employment_coverage:
 *                       type: string
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 month:
 *                   type: string
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/kpis', async (req, res) => {
  try {
    const { month = 'latest' } = req.query;
    
    const cacheKey = cache.generateKey('summary_kpis', { month });
    
    const cached = await cache.get(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    // Build month condition
    const businessParams = [];
    const financialParams = [];
    const employmentParams = [];
    
    let businessMonthCondition, financialMonthCondition, employmentMonthCondition;
    
    if (month !== 'latest') {
      businessMonthCondition = 'WHERE CAST(month AS VARCHAR) = ?';
      financialMonthCondition = 'WHERE CAST(month AS VARCHAR) = ?';
      employmentMonthCondition = 'WHERE CAST(month AS VARCHAR) = ?';
      businessParams.push(month);
      financialParams.push(month);
      employmentParams.push(month);
    } else {
      businessMonthCondition = 'WHERE month = (SELECT MAX(month) FROM summaries.monthly_trends)';
      financialMonthCondition = 'WHERE month = (SELECT MAX(month) FROM financial.participant_trajectories)';
      employmentMonthCondition = 'WHERE month = (SELECT MAX(month) FROM summaries.monthly_trends)';
    }

    // Get KPIs for the specified month
    const queries = {
      // Business KPIs
      businessKpis: {
        query: `
          SELECT 
            active_venues,
            total_visits,
            (total_visits::float / NULLIF(active_venues, 0)) as avg_visits_per_venue
          FROM summaries.monthly_trends 
          ${businessMonthCondition}
        `,
        params: businessParams
      },
      
      // Financial KPIs
      financialKpis: {
        query: `
          SELECT 
            AVG(avg_balance) as avg_participant_balance,
            COUNT(CASE WHEN avg_balance < 0 THEN 1 END) as participants_in_debt,
            COUNT(*) as total_participants,
            AVG(total_budget) as avg_monthly_budget
          FROM financial.participant_trajectories 
          ${financialMonthCondition}
        `,
        params: financialParams
      },
      
      // Employment KPIs
      employmentKpis: {
        query: `
          SELECT 
            active_employers,
            total_employed,
            (total_employed::float / NULLIF(active_employers, 0)) as avg_employees_per_employer
          FROM summaries.monthly_trends 
          ${employmentMonthCondition}
        `,
        params: employmentParams
      }
    };

    // Execute queries sequentially to avoid transaction conflicts
    const results = {};
    
    try {
      results.businessKpis = await db.queryOne(queries.businessKpis.query, queries.businessKpis.params);
    } catch (err) {
      console.log('Business KPIs query failed:', err.message);
      results.businessKpis = null;
    }
    
    try {
      results.financialKpis = await db.queryOne(queries.financialKpis.query, queries.financialKpis.params);
    } catch (err) {
      console.log('Financial KPIs query failed:', err.message);
      results.financialKpis = null;
    }
    
    try {
      results.employmentKpis = await db.queryOne(queries.employmentKpis.query, queries.employmentKpis.params);
    } catch (err) {
      console.log('Employment KPIs query failed:', err.message);
      results.employmentKpis = null;
    }

    // Calculate derived metrics and convert BigInt values
    const kpis = convertBigIntToNumber({
      business: {
        total_venues: results.businessKpis?.active_venues || 0,
        total_visits: results.businessKpis?.total_visits || 0,
        avg_visits_per_venue: results.businessKpis?.avg_visits_per_venue || 0
      },
      financial: {
        avg_balance: results.financialKpis?.avg_participant_balance || 0,
        participants_in_debt: results.financialKpis?.participants_in_debt || 0,
        total_participants: results.financialKpis?.total_participants || 0,
        debt_rate: results.financialKpis?.total_participants 
          ? (Number(results.financialKpis.participants_in_debt) / Number(results.financialKpis.total_participants) * 100).toFixed(2)
          : 0,
        avg_monthly_budget: results.financialKpis?.avg_monthly_budget || 0
      },
      employment: {
        total_employers: results.employmentKpis?.active_employers || 0,
        total_employed: results.employmentKpis?.total_employed || 0,
        avg_employees_per_employer: results.employmentKpis?.avg_employees_per_employer || 0,
        employment_coverage: results.financialKpis?.total_participants 
          ? (Number(results.employmentKpis?.total_employed) / Number(results.financialKpis.total_participants) * 100).toFixed(2)
          : 0
      },
      timestamp: new Date().toISOString(),
      month: month === 'latest' ? 'latest' : month
    });

    await cache.set(cacheKey, kpis, 900); // 15 minutes cache

    res.json(kpis);
  } catch (error) {
    console.error('Summary KPIs error:', error);
    res.status(500).json({ error: 'Failed to fetch KPI data' });
  }
});

/**
 * GET /api/summary/health
 * Get overall system health and data freshness
 */
router.get('/health', async (req, res) => {
  try {
    const cacheKey = cache.generateKey('summary_health', {});
    
    const cached = await cache.get(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    // Check data availability and freshness
    const healthChecks = {
      database: await db.healthCheck(),
      cache: cache.isAvailable(),
      
      // Data freshness checks
      businessData: await db.queryOne('SELECT COUNT(*) as count, MAX(month) as latest_month FROM business.trends'),
      financialData: await db.queryOne('SELECT COUNT(*) as count, MAX(month) as latest_month FROM financial.participant_trajectories'),
      employmentData: await db.queryOne('SELECT COUNT(*) as count, MAX(month) as latest_month FROM employment.employer_health'),
      
      // Data quality checks
      dataQuality: await db.queryOne(`
        SELECT 
          (SELECT COUNT(DISTINCT participantId) FROM financial.participant_trajectories) as unique_participants,
          (SELECT COUNT(DISTINCT venueId) FROM business.trends) as unique_venues,
          (SELECT COUNT(DISTINCT employerId) FROM employment.employer_health) as unique_employers
      `)
    };

    const health = {
      status: healthChecks.database && healthChecks.businessData?.count > 0 ? 'healthy' : 'degraded',
      database: {
        connected: healthChecks.database,
        status: healthChecks.database ? 'connected' : 'disconnected'
      },
      cache: {
        available: healthChecks.cache,
        status: healthChecks.cache ? 'available' : 'unavailable'
      },
      data: {
        business: {
          records: healthChecks.businessData?.count || 0,
          latest_month: healthChecks.businessData?.latest_month || null
        },
        financial: {
          records: healthChecks.financialData?.count || 0,
          latest_month: healthChecks.financialData?.latest_month || null
        },
        employment: {
          records: healthChecks.employmentData?.count || 0,
          latest_month: healthChecks.employmentData?.latest_month || null
        },
        quality: {
          unique_participants: healthChecks.dataQuality?.unique_participants || 0,
          unique_venues: healthChecks.dataQuality?.unique_venues || 0,
          unique_employers: healthChecks.dataQuality?.unique_employers || 0
        }
      },
      timestamp: new Date().toISOString()
    };

    await cache.set(cacheKey, health, 300); // 5 minutes cache

    res.json(health);
  } catch (error) {
    console.error('Summary health error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch health data',
      status: 'error',
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;