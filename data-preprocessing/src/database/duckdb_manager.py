import duckdb
import polars as pl
from pathlib import Path
from loguru import logger
from models.data_models import BusinessMetrics, FinancialMetrics, EmploymentMetrics

class DuckDBManager:
    """Manages DuckDB database operations for economic analysis data"""
    
    def __init__(self, db_path: Path):
        self.db_path = db_path
        self.conn = duckdb.connect(str(db_path))
        logger.info(f"Connected to DuckDB at {db_path}")
        self._setup_database()
    
    def _setup_database(self):
        """Initialize database schema"""
        logger.info("Setting up database schema...")
        
        # Create schemas for organizing tables
        self.conn.execute("CREATE SCHEMA IF NOT EXISTS business")
        self.conn.execute("CREATE SCHEMA IF NOT EXISTS financial") 
        self.conn.execute("CREATE SCHEMA IF NOT EXISTS employment")
        self.conn.execute("CREATE SCHEMA IF NOT EXISTS summaries")
    
    def save_business_data(self, metrics: BusinessMetrics):
        """Save business analysis results to database"""
        logger.info("Saving business data to database...")
        
        # Convert Polars DataFrames to DuckDB tables
        self.conn.register("business_trends_temp", metrics.business_trends.to_pandas())
        self.conn.register("venue_performance_temp", metrics.venue_performance.to_pandas())
        self.conn.register("customer_patterns_temp", metrics.customer_patterns.to_pandas())
        self.conn.register("revenue_indicators_temp", metrics.revenue_indicators.to_pandas())
        
        # Create permanent tables
        self.conn.execute("CREATE OR REPLACE TABLE business.trends AS SELECT * FROM business_trends_temp")
        self.conn.execute("CREATE OR REPLACE TABLE business.venue_performance AS SELECT * FROM venue_performance_temp")
        self.conn.execute("CREATE OR REPLACE TABLE business.customer_patterns AS SELECT * FROM customer_patterns_temp")
        self.conn.execute("CREATE OR REPLACE TABLE business.revenue_indicators AS SELECT * FROM revenue_indicators_temp")
        
        # Create indexes for better performance
        self.conn.execute("CREATE INDEX IF NOT EXISTS idx_business_trends_month ON business.trends(month)")
        self.conn.execute("CREATE INDEX IF NOT EXISTS idx_business_trends_venue ON business.trends(venueId, venueType)")
        
        logger.info("Business data saved successfully")
    
    def save_financial_data(self, metrics: FinancialMetrics):
        """Save financial analysis results to database"""
        logger.info("Saving financial data to database...")
        
        # Convert Polars DataFrames to DuckDB tables
        self.conn.register("participant_trajectories_temp", metrics.participant_trajectories.to_pandas())
        self.conn.register("financial_groups_temp", metrics.financial_groups.to_pandas())
        self.conn.register("wage_analysis_temp", metrics.wage_analysis.to_pandas())
        self.conn.register("cost_living_trends_temp", metrics.cost_living_trends.to_pandas())
        
        # Create permanent tables
        self.conn.execute("CREATE OR REPLACE TABLE financial.participant_trajectories AS SELECT * FROM participant_trajectories_temp")
        self.conn.execute("CREATE OR REPLACE TABLE financial.groups AS SELECT * FROM financial_groups_temp")
        self.conn.execute("CREATE OR REPLACE TABLE financial.wage_analysis AS SELECT * FROM wage_analysis_temp")
        self.conn.execute("CREATE OR REPLACE TABLE financial.cost_living_trends AS SELECT * FROM cost_living_trends_temp")
        
        # Create indexes
        self.conn.execute("CREATE INDEX IF NOT EXISTS idx_financial_trajectories_participant ON financial.participant_trajectories(participantId)")
        self.conn.execute("CREATE INDEX IF NOT EXISTS idx_financial_trajectories_month ON financial.participant_trajectories(month)")
        
        logger.info("Financial data saved successfully")
    
    def save_employment_data(self, metrics: EmploymentMetrics):
        """Save employment analysis results to database"""
        logger.info("Saving employment data to database...")
        
        # Convert Polars DataFrames to DuckDB tables
        self.conn.register("job_flows_temp", metrics.job_flows.to_pandas())
        self.conn.register("employer_health_temp", metrics.employer_health.to_pandas())
        self.conn.register("turnover_rates_temp", metrics.turnover_rates.to_pandas())
        self.conn.register("employment_stability_temp", metrics.employment_stability.to_pandas())
        
        # Create permanent tables
        self.conn.execute("CREATE OR REPLACE TABLE employment.job_flows AS SELECT * FROM job_flows_temp")
        self.conn.execute("CREATE OR REPLACE TABLE employment.employer_health AS SELECT * FROM employer_health_temp")
        self.conn.execute("CREATE OR REPLACE TABLE employment.turnover_rates AS SELECT * FROM turnover_rates_temp")
        self.conn.execute("CREATE OR REPLACE TABLE employment.stability AS SELECT * FROM employment_stability_temp")
        
        # Create indexes
        self.conn.execute("CREATE INDEX IF NOT EXISTS idx_employment_flows_month ON employment.job_flows(month)")
        self.conn.execute("CREATE INDEX IF NOT EXISTS idx_employment_health_employer ON employment.employer_health(employerId)")
        
        logger.info("Employment data saved successfully")
    
    def generate_summaries(self):
        """Generate summary statistics and aggregated views"""
        logger.info("Generating summary statistics...")
        
        # Business summary
        self.conn.execute("""
            CREATE OR REPLACE TABLE summaries.business_summary AS
            SELECT 
                COUNT(DISTINCT venueId) as total_venues,
                COUNT(DISTINCT CASE WHEN venueType = 'Restaurant' THEN venueId END) as restaurants,
                COUNT(DISTINCT CASE WHEN venueType = 'Pub' THEN venueId END) as pubs,
                AVG(visit_count) as avg_monthly_visits,
                SUM(revenue_estimate) as total_estimated_revenue
            FROM business.trends
        """)
        
        # Financial summary
        self.conn.execute("""
            CREATE OR REPLACE TABLE summaries.financial_summary AS
            SELECT 
                COUNT(DISTINCT participantId) as total_participants,
                AVG(avg_balance) as overall_avg_balance,
                MEDIAN(avg_balance) as overall_median_balance,
                STDDEV(avg_balance) as balance_std_dev,
                COUNT(DISTINCT CASE WHEN avg_balance < 0 THEN participantId END) as participants_in_debt
            FROM financial.participant_trajectories
        """)
        
        # Employment summary
        self.conn.execute("""
            CREATE OR REPLACE TABLE summaries.employment_summary AS
            SELECT 
                COUNT(DISTINCT eh.employerId) as total_employers,
                AVG(eh.active_employees) as avg_employees_per_employer,
                AVG(eh.avg_wage) as overall_avg_wage,
                AVG(tr.turnover_rate) as overall_turnover_rate
            FROM employment.employer_health eh
            LEFT JOIN employment.turnover_rates tr ON eh.employerId = tr.employerId AND CAST(eh.month as VARCHAR) = CAST(tr.month as VARCHAR)
        """)
        
        # Monthly trends summary
        self.conn.execute("""
            CREATE OR REPLACE TABLE summaries.monthly_trends AS
            SELECT 
                COALESCE(CAST(bt.month as VARCHAR), CAST(ft.month as VARCHAR), CAST(eh.month as VARCHAR)) as month,
                COUNT(DISTINCT bt.venueId) as active_venues,
                SUM(bt.visit_count) as total_visits,
                AVG(ft.avg_balance) as avg_participant_balance,
                COUNT(DISTINCT eh.employerId) as active_employers,
                SUM(eh.active_employees) as total_employed
            FROM business.trends bt
            FULL OUTER JOIN financial.participant_trajectories ft ON CAST(bt.month as VARCHAR) = CAST(ft.month as VARCHAR)
            FULL OUTER JOIN employment.employer_health eh ON CAST(bt.month as VARCHAR) = CAST(eh.month as VARCHAR)
            GROUP BY COALESCE(CAST(bt.month as VARCHAR), CAST(ft.month as VARCHAR), CAST(eh.month as VARCHAR))
            ORDER BY COALESCE(CAST(bt.month as VARCHAR), CAST(ft.month as VARCHAR), CAST(eh.month as VARCHAR))
        """)
        
        logger.info("Summary statistics generated successfully")
    
    def close(self):
        """Close database connection"""
        self.conn.close()
        logger.info("Database connection closed")
    
    def __enter__(self):
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()