import polars as pl
import gc
from loguru import logger
from models.data_models import RawData, EmploymentMetrics

class EmploymentProcessor:
    """Processes employment pattern analysis"""
    
    def __init__(self, raw_data: RawData):
        self.raw_data = raw_data
    
    def process(self) -> EmploymentMetrics:
        """Main processing method for employment analysis"""
        logger.info("Starting employment pattern analysis...")
        
        # Generate job flow analysis
        job_flows = self._calculate_job_flows()
        gc.collect()  # Force garbage collection
        
        # Calculate employer health metrics
        employer_health = self._calculate_employer_health()
        gc.collect()  # Force garbage collection
        
        # Calculate turnover rates
        turnover_rates = self._calculate_turnover_rates()
        
        # Analyze employment stability
        employment_stability = self._analyze_employment_stability()
        
        return EmploymentMetrics(
            job_flows=job_flows,
            employer_health=employer_health,
            turnover_rates=turnover_rates,
            employment_stability=employment_stability
        )
    
    def _calculate_job_flows(self) -> pl.DataFrame:
        """Calculate job transition flows between employers"""
        logger.info("Calculating job flows...")
        
        status_logs = self.raw_data.participant_status_logs
        jobs = self.raw_data.jobs
        employers = self.raw_data.employers
        
        # Track job changes over time
        employment_history = (
            status_logs
            .filter(pl.col("jobId").is_not_null())
            .join(jobs, on="jobId", how="left")
            .sort(["participantId", "timestamp"])
            .with_columns([
                pl.col("employerId").shift(1).over("participantId").alias("previous_employer"),
                pl.col("timestamp").dt.strftime("%Y-%m").alias("month")
            ])
        )
        
        # Identify job transitions
        job_transitions = (
            employment_history
            .filter(
                (pl.col("employerId") != pl.col("previous_employer")) &
                (pl.col("previous_employer").is_not_null())
            )
            .group_by(["month", "previous_employer", "employerId"])
            .agg([
                pl.len().alias("transition_count"),
                pl.col("participantId").n_unique().alias("unique_participants")
            ])
        )
        
        return job_transitions
    
    def _calculate_employer_health(self) -> pl.DataFrame:
        """Calculate employer performance metrics"""
        logger.info("Calculating employer health...")
        
        status_logs = self.raw_data.participant_status_logs
        jobs = self.raw_data.jobs
        employers = self.raw_data.employers
        
        # Join employment data
        employment_data = (
            status_logs
            .filter(pl.col("jobId").is_not_null())
            .join(jobs, on="jobId", how="left")
            .join(employers, on="employerId", how="left")
        )
        
        # Calculate monthly employer metrics
        employer_health = (
            employment_data
            .with_columns([
                pl.col("timestamp").dt.strftime("%Y-%m").alias("month")
            ])
            .group_by(["month", "employerId"])
            .agg([
                pl.col("participantId").n_unique().alias("active_employees"),
                pl.col("hourlyRate").mean().alias("avg_wage"),
                pl.col("hourlyRate").median().alias("median_wage"),
                pl.col("hourlyRate").std().alias("wage_std"),
                pl.col("jobId").n_unique().alias("active_positions")
            ])
        )
        
        # Calculate employer growth metrics
        employer_health = employer_health.with_columns([
            (pl.col("active_employees").pct_change().over("employerId")).alias("employee_growth_rate"),
            (pl.col("avg_wage").pct_change().over("employerId")).alias("wage_growth_rate")
        ])
        
        return employer_health
    
    def _calculate_turnover_rates(self) -> pl.DataFrame:
        """Calculate employee turnover rates using batch processing"""
        logger.info("Calculating turnover rates...")
        
        status_logs = self.raw_data.participant_status_logs
        jobs = self.raw_data.jobs
        
        # Process in batches to handle large dataset
        batch_size = 5_000_000  # Process 5M records at a time
        total_records = len(status_logs)
        logger.info(f"Processing {total_records} total records in batches of {batch_size}")
        
        # Get jobs lookup for efficiency
        jobs_lookup = jobs.select(["jobId", "employerId"]).to_pandas().set_index('jobId')['employerId'].to_dict()
        
        all_turnover_data = []
        
        for batch_start in range(0, total_records, batch_size):
            batch_end = min(batch_start + batch_size, total_records)
            logger.info(f"Processing batch {batch_start // batch_size + 1}: records {batch_start} to {batch_end}")
            
            # Get batch of status logs
            batch_logs = status_logs.slice(batch_start, batch_end - batch_start)
            
            # Filter and process employment records
            employed_records = (
                batch_logs
                .filter(pl.col("jobId").is_not_null())
                .select(["participantId", "timestamp", "jobId"])
                .unique()
            )
            
            if len(employed_records) == 0:
                continue
            
            # Add employer info using efficient lookup
            employment_periods = (
                employed_records
                .with_columns([
                    pl.col("jobId").map_elements(
                        lambda x: jobs_lookup.get(x), 
                        return_dtype=pl.Int64
                    ).alias("employerId")
                ])
                .filter(pl.col("employerId").is_not_null())
            )
            
            if len(employment_periods) == 0:
                continue
            
            # Calculate job tenure for this batch
            batch_tenure = (
                employment_periods
                .group_by(["participantId", "jobId", "employerId"])
                .agg([
                    pl.col("timestamp").min().alias("start_date"),
                    pl.col("timestamp").max().alias("end_date")
                ])
                .with_columns([
                    (pl.col("end_date") - pl.col("start_date")).dt.total_days().alias("tenure_days"),
                    pl.col("start_date").dt.strftime("%Y-%m").alias("start_month")
                ])
                .filter(pl.col("tenure_days") >= 0)
            )
            
            if len(batch_tenure) > 0:
                all_turnover_data.append(batch_tenure)
            
            # Force garbage collection
            gc.collect()
        
        # Combine all batches
        if not all_turnover_data:
            logger.warning("No turnover data generated")
            return pl.DataFrame({
                "month": [], "employerId": [], "new_hires": [], 
                "avg_tenure_days": [], "turnover_rate": []
            })
        
        combined_tenure = pl.concat(all_turnover_data)
        logger.info(f"Combined {len(combined_tenure)} job tenure records from all batches")
        
        # Calculate final turnover metrics
        turnover_rates = (
            combined_tenure
            .group_by(["start_month", "employerId"])
            .agg([
                pl.len().alias("new_hires"),
                pl.col("tenure_days").mean().alias("avg_tenure_days"),
                (pl.col("tenure_days") <= 30).sum().alias("short_tenure_count")
            ])
            .with_columns([
                (pl.col("short_tenure_count") / pl.col("new_hires")).alias("turnover_rate"),
                pl.col("start_month").alias("month")
            ])
            .select(["month", "employerId", "new_hires", "avg_tenure_days", "turnover_rate"])
        )
        
        logger.info(f"Generated turnover rates for {len(turnover_rates)} month-employer combinations")
        return turnover_rates
    
    def _analyze_employment_stability(self) -> pl.DataFrame:
        """Analyze employment stability patterns using batch processing"""
        logger.info("Analyzing employment stability...")
        
        status_logs = self.raw_data.participant_status_logs
        total_records = len(status_logs)
        batch_size = 5_000_000  # Process 5M records at a time
        
        logger.info(f"Processing all {total_records} records in batches of {batch_size}")
        
        all_stability_data = []
        
        for batch_start in range(0, total_records, batch_size):
            batch_end = min(batch_start + batch_size, total_records)
            logger.info(f"Processing stability batch {batch_start // batch_size + 1}: records {batch_start} to {batch_end}")
            
            # Get batch of status logs
            batch_logs = status_logs.slice(batch_start, batch_end - batch_start)
            
            # Calculate employment stability for this batch
            batch_stability = (
                batch_logs
                .with_columns([
                    pl.col("timestamp").dt.strftime("%Y-%m").alias("month"),
                    (pl.col("jobId").is_not_null()).alias("is_employed")
                ])
                .group_by(["participantId", "month"])
                .agg([
                    pl.col("is_employed").mean().alias("employment_rate"),
                    pl.col("jobId").n_unique().alias("job_changes"),
                    pl.col("availableBalance").mean().alias("avg_balance")
                ])
                .filter(pl.col("employment_rate").is_not_null())
            )
            
            if len(batch_stability) > 0:
                all_stability_data.append(batch_stability)
            
            # Force garbage collection
            gc.collect()
        
        # Combine all batches and re-aggregate
        if not all_stability_data:
            logger.warning("No employment stability data generated")
            return pl.DataFrame({
                "participantId": [], "month": [], "employment_rate": [], 
                "job_changes": [], "avg_balance": []
            })
        
        # Combine all batch results
        combined_stability = pl.concat(all_stability_data)
        
        # Re-aggregate the combined data to get final metrics
        employment_stability = (
            combined_stability
            .group_by(["participantId", "month"])
            .agg([
                pl.col("employment_rate").mean().alias("employment_rate"),
                pl.col("job_changes").sum().alias("job_changes"),
                pl.col("avg_balance").mean().alias("avg_balance")
            ])
            .filter(pl.col("employment_rate").is_not_null())
        )
        
        # Calculate stability scores based on employment patterns
        employment_stability = employment_stability.with_columns([
            pl.col("employment_rate").alias("stability_score")  # Use employment rate as stability indicator
        ])
        
        logger.info(f"Generated employment stability data for {len(employment_stability)} participant-month combinations")
        return employment_stability