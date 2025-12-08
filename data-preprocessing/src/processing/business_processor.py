import polars as pl
from loguru import logger
from models.data_models import RawData, BusinessMetrics

class BusinessProcessor:
    """Processes business prosperity analysis"""
    
    def __init__(self, raw_data: RawData):
        self.raw_data = raw_data
    
    def process(self) -> BusinessMetrics:
        """Main processing method for business analysis"""
        logger.info("Starting business prosperity analysis...")
        
        # Generate business trends
        business_trends = self._calculate_business_trends()
        
        # Calculate venue performance metrics
        venue_performance = self._calculate_venue_performance()
        
        # Analyze customer patterns
        customer_patterns = self._analyze_customer_patterns()
        
        # Calculate revenue indicators
        revenue_indicators = self._calculate_revenue_indicators()
        
        return BusinessMetrics(
            business_trends=business_trends,
            venue_performance=venue_performance,
            customer_patterns=customer_patterns,
            revenue_indicators=revenue_indicators
        )
    
    def _calculate_business_trends(self) -> pl.DataFrame:
        """Calculate monthly business performance trends"""
        logger.info("Calculating business trends...")
        
        # Combine checkin data with venue information
        checkins = self.raw_data.checkin_journal
        restaurants = self.raw_data.restaurants
        pubs = self.raw_data.pubs
        
        # Create unified venue dataset
        restaurant_venues = restaurants.select([
            pl.col("restaurantId").alias("venueId"),
            pl.lit("Restaurant").alias("venueType"),
            pl.col("foodCost").alias("cost"),
            pl.col("maxOccupancy ").alias("maxOccupancy"),  # Handle trailing space in column name
            pl.col("location"),
            pl.col("buildingId")
        ])
        
        pub_venues = pubs.select([
            pl.col("pubId").alias("venueId"),
            pl.lit("Pub").alias("venueType"),
            pl.col("hourlyCost").alias("cost"),
            pl.col("maxOccupancy"),
            pl.col("location"),
            pl.col("buildingId")
        ])
        
        venues = pl.concat([restaurant_venues, pub_venues])
        
        # Join checkins with venue data
        checkin_data = checkins.join(
            venues,
            left_on=["venueId", "venueType"],
            right_on=["venueId", "venueType"],
            how="left"
        )
        
        # Calculate monthly metrics
        business_trends = (
            checkin_data
            .with_columns([
                pl.col("timestamp").dt.strftime("%Y-%m").alias("month"),
                pl.col("timestamp").dt.strftime("%Y-%m-%d").alias("date")
            ])
            .group_by(["month", "venueId", "venueType"])
            .agg([
                pl.len().alias("visit_count"),
                pl.col("participantId").n_unique().alias("unique_visitors"),
                pl.col("cost").first().alias("venue_cost"),
                pl.col("maxOccupancy").first().alias("max_occupancy")
            ])
            .with_columns([
                (pl.col("visit_count") / pl.col("max_occupancy")).alias("occupancy_rate"),
                (pl.col("visit_count") * pl.col("venue_cost")).alias("revenue_estimate")
            ])
        )
        
        return business_trends
    
    def _calculate_venue_performance(self) -> pl.DataFrame:
        """Calculate overall venue performance metrics"""
        logger.info("Calculating venue performance...")
        
        checkins = self.raw_data.checkin_journal
        
        venue_performance = (
            checkins
            .group_by(["venueId", "venueType"])
            .agg([
                pl.len().alias("total_visits"),
                pl.col("participantId").n_unique().alias("unique_customers"),
                pl.col("timestamp").min().alias("first_visit"),
                pl.col("timestamp").max().alias("last_visit")
            ])
            .with_columns([
                (pl.col("last_visit") - pl.col("first_visit")).dt.total_days().alias("operation_days"),
                (pl.col("total_visits") / pl.col("unique_customers")).alias("visits_per_customer")
            ])
            .with_columns([
                (pl.col("total_visits") / pl.col("operation_days")).alias("daily_visit_rate")
            ])
        )
        
        return venue_performance
    
    def _analyze_customer_patterns(self) -> pl.DataFrame:
        """Analyze customer visit patterns"""
        logger.info("Analyzing customer patterns...")
        
        checkins = self.raw_data.checkin_journal
        
        customer_patterns = (
            checkins
            .with_columns([
                pl.col("timestamp").dt.hour().alias("hour_of_day"),
                pl.col("timestamp").dt.weekday().alias("day_of_week"),
                pl.col("timestamp").dt.strftime("%Y-%m").alias("month")
            ])
            .group_by(["venueId", "venueType", "hour_of_day", "day_of_week"])
            .agg([
                pl.len().alias("visit_count"),
                pl.col("participantId").n_unique().alias("unique_visitors")
            ])
        )
        
        return customer_patterns
    
    def _calculate_revenue_indicators(self) -> pl.DataFrame:
        """Calculate revenue proxy indicators"""
        logger.info("Calculating revenue indicators...")
        
        # Join financial data with checkin data to estimate spending
        financial = self.raw_data.financial_journal
        checkins = self.raw_data.checkin_journal
        
        # Filter for food and recreation spending
        relevant_spending = financial.filter(
            pl.col("category").is_in(["Food", "Recreation"])
        )
        
        # Calculate daily spending by participant
        daily_spending = (
            relevant_spending
            .with_columns([
                pl.col("timestamp").dt.strftime("%Y-%m-%d").alias("date")
            ])
            .group_by(["participantId", "date", "category"])
            .agg([
                pl.col("amount").sum().alias("daily_amount")
            ])
        )
        
        # Join with checkin data to estimate venue revenue
        checkin_dates = (
            checkins
            .with_columns([
                pl.col("timestamp").dt.strftime("%Y-%m-%d").alias("date")
            ])
        )
        
        revenue_indicators = (
            checkin_dates
            .join(daily_spending, on=["participantId", "date"], how="left")
            .group_by(["venueId", "venueType"])
            .agg([
                pl.col("daily_amount").sum().alias("total_estimated_revenue"),
                pl.col("daily_amount").mean().alias("avg_revenue_per_visit"),
                pl.col("daily_amount").count().alias("revenue_transactions")
            ])
        )
        
        return revenue_indicators