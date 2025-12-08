import polars as pl
from loguru import logger
from models.data_models import RawData, FinancialMetrics

class FinancialProcessor:
    """Processes financial health analysis"""
    
    def __init__(self, raw_data: RawData):
        self.raw_data = raw_data
    
    def process(self) -> FinancialMetrics:
        """Main processing method for financial analysis"""
        logger.info("Starting financial health analysis...")
        
        # Generate participant financial trajectories
        participant_trajectories = self._calculate_participant_trajectories()
        
        # Create financial demographic groups
        financial_groups = self._create_financial_groups()
        
        # Analyze wage patterns
        wage_analysis = self._analyze_wage_patterns()
        
        # Calculate cost of living trends
        cost_living_trends = self._calculate_cost_living_trends()
        
        return FinancialMetrics(
            participant_trajectories=participant_trajectories,
            financial_groups=financial_groups,
            wage_analysis=wage_analysis,
            cost_living_trends=cost_living_trends
        )
    
    def _calculate_participant_trajectories(self) -> pl.DataFrame:
        """Calculate financial trajectories for all participants"""
        logger.info("Calculating participant financial trajectories...")
        
        status_logs = self.raw_data.participant_status_logs
        participants = self.raw_data.participants
        
        # Calculate monthly financial snapshots
        financial_snapshots = (
            status_logs
            .with_columns([
                pl.col("timestamp").dt.strftime("%Y-%m").alias("month"),
                pl.col("timestamp").dt.strftime("%Y-%m-%d").alias("date")
            ])
            .group_by(["participantId", "month"])
            .agg([
                pl.col("availableBalance").mean().alias("avg_balance"),
                pl.col("availableBalance").min().alias("min_balance"),
                pl.col("availableBalance").max().alias("max_balance"),
                pl.col("dailyFoodBudget").mean().alias("avg_food_budget"),
                pl.col("weeklyExtraBudget").mean().alias("avg_extra_budget"),
                pl.col("financialStatus").mode().first().alias("primary_financial_status")
            ])
        )
        
        # Join with participant demographics
        participant_trajectories = financial_snapshots.join(
            participants,
            on="participantId",
            how="left"
        )
        
        # Calculate trajectory metrics
        participant_trajectories = participant_trajectories.with_columns([
            (pl.col("avg_balance").pct_change().over("participantId")).alias("balance_change_pct"),
            (pl.col("avg_food_budget") + pl.col("avg_extra_budget")).alias("total_budget")
        ])
        
        return participant_trajectories
    
    def _create_financial_groups(self) -> pl.DataFrame:
        """Create demographic-based financial groups"""
        logger.info("Creating financial demographic groups...")
        
        trajectories = self._calculate_participant_trajectories()
        
        # Create financial groups based on demographics and financial status
        financial_groups = (
            trajectories
            .group_by(["month", "age", "educationLevel", "householdSize", "haveKids"])
            .agg([
                pl.len().alias("group_size"),
                pl.col("avg_balance").mean().alias("group_avg_balance"),
                pl.col("avg_balance").median().alias("group_median_balance"),
                pl.col("avg_balance").std().alias("group_balance_std"),
                pl.col("total_budget").mean().alias("group_avg_budget"),
                pl.col("primary_financial_status").mode().first().alias("group_financial_status")
            ])
        )
        
        return financial_groups
    
    def _analyze_wage_patterns(self) -> pl.DataFrame:
        """Analyze wage progression and patterns"""
        logger.info("Analyzing wage patterns...")
        
        status_logs = self.raw_data.participant_status_logs
        jobs = self.raw_data.jobs
        participants = self.raw_data.participants
        
        # Join employment data
        employment_data = (
            status_logs
            .filter(pl.col("jobId").is_not_null())
            .join(jobs, on="jobId", how="left")
            .join(participants, on="participantId", how="left")
        )
        
        # Calculate monthly wage statistics
        wage_analysis = (
            employment_data
            .with_columns([
                pl.col("timestamp").dt.strftime("%Y-%m").alias("month")
            ])
            .group_by(["month", "educationLevel", "age"])
            .agg([
                pl.col("hourlyRate").mean().alias("avg_hourly_rate"),
                pl.col("hourlyRate").median().alias("median_hourly_rate"),
                pl.col("hourlyRate").min().alias("min_hourly_rate"),
                pl.col("hourlyRate").max().alias("max_hourly_rate"),
                pl.col("participantId").n_unique().alias("employed_count")
            ])
        )
        
        return wage_analysis
    
    def _calculate_cost_living_trends(self) -> pl.DataFrame:
        """Calculate cost of living indicators"""
        logger.info("Calculating cost of living trends...")
        
        financial_journal = self.raw_data.financial_journal
        apartments = self.raw_data.apartments
        status_logs = self.raw_data.participant_status_logs
        
        # Calculate monthly expenses by category
        monthly_expenses = (
            financial_journal
            .filter(pl.col("amount") < 0)  # Expenses are negative
            .with_columns([
                pl.col("timestamp").dt.strftime("%Y-%m").alias("month"),
                (pl.col("amount") * -1).alias("expense_amount")  # Convert to positive
            ])
            .group_by(["month", "category"])
            .agg([
                pl.col("expense_amount").sum().alias("total_expenses"),
                pl.col("expense_amount").mean().alias("avg_expense"),
                pl.col("participantId").n_unique().alias("participants_with_expense")
            ])
        )
        
        # Calculate housing costs
        housing_costs = (
            status_logs
            .filter(pl.col("apartmentId").is_not_null())
            .join(apartments, left_on="apartmentId", right_on="apartmentId", how="left")
            .with_columns([
                pl.col("timestamp").dt.strftime("%Y-%m").alias("month")
            ])
            .group_by(["month"])
            .agg([
                pl.col("rentalCost").mean().alias("avg_rent"),
                pl.col("rentalCost").median().alias("median_rent"),
                pl.col("participantId").n_unique().alias("housed_participants")
            ])
        )
        
        # Combine expense and housing data
        cost_living_trends = monthly_expenses.join(
            housing_costs,
            on="month",
            how="outer"
        )
        
        return cost_living_trends