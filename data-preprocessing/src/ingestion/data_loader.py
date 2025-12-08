import polars as pl
from pathlib import Path
from glob import glob
from loguru import logger
from typing import List
from models.data_models import RawData

class DataLoader:
    """Handles loading of all raw CSV data files"""
    
    def __init__(self, input_path: Path):
        self.input_path = input_path
        self.datasets_path = input_path / "Datasets"
    
    def load_participant_status_logs(self) -> pl.DataFrame:
        """Load and combine all participant status log files"""
        logger.info("Loading participant status logs...")
        
        activity_logs_path = self.datasets_path / "Activity Logs"
        log_files = list(activity_logs_path.glob("ParticipantStatusLogs*.csv"))
        
        if not log_files:
            raise FileNotFoundError(f"No participant status logs found in {activity_logs_path}")
        
        logger.info(f"Found {len(log_files)} participant status log files")
        
        # Define consistent schema to handle mixed types - force all to most flexible type
        schema_overrides = {
            "timestamp": pl.String,  # Parse datetime later to avoid timezone issues
            "currentLocation": pl.String,
            "participantId": pl.String,  # Parse to int later  
            "currentMode": pl.String,
            "hungerStatus": pl.String,
            "sleepStatus": pl.String,
            "apartmentId": pl.String,  # Keep as string to handle mixed types
            "availableBalance": pl.String,  # Parse to float later
            "jobId": pl.String,  # Keep as string to handle null/mixed values
            "financialStatus": pl.String,
            "dailyFoodBudget": pl.String,  # Parse to float later
            "weeklyExtraBudget": pl.String  # Parse to float later
        }
        
        # Load all files using lazy loading for memory efficiency
        dfs = []
        for file_path in log_files:
            logger.info(f"Loading {file_path.name}")
            df = pl.scan_csv(
                file_path,
                try_parse_dates=True,
                schema_overrides=schema_overrides,
                infer_schema_length=1000
            )
            dfs.append(df)
        
        # Combine all dataframes with consistent schema
        combined_df = pl.concat(dfs, how="vertical_relaxed").collect()
        
        # Clean up the data types after loading - convert everything to proper types
        combined_df = combined_df.with_columns([
            # Parse timestamp (ISO 8601 format)
            pl.col("timestamp").str.to_datetime(format="%Y-%m-%dT%H:%M:%SZ", strict=False).alias("timestamp"),
            
            # Convert numeric fields
            pl.col("participantId").cast(pl.Int64, strict=False).alias("participantId"),
            pl.col("availableBalance").cast(pl.Float64, strict=False).alias("availableBalance"),
            pl.col("dailyFoodBudget").cast(pl.Float64, strict=False).alias("dailyFoodBudget"),
            pl.col("weeklyExtraBudget").cast(pl.Float64, strict=False).alias("weeklyExtraBudget"),
            
            # Convert apartmentId to int where possible, keep nulls as null
            pl.when(pl.col("apartmentId").is_in(["", "null", "None", None]))
            .then(None)
            .otherwise(pl.col("apartmentId").cast(pl.Int64, strict=False))
            .alias("apartmentId"),
            
            # Convert jobId to int where possible, keep nulls as null  
            pl.when(pl.col("jobId").is_in(["", "null", "None", None]))
            .then(None)
            .otherwise(pl.col("jobId").cast(pl.Int64, strict=False))
            .alias("jobId")
        ])
        
        logger.info(f"Loaded {combined_df.height:,} participant status records")
        
        return combined_df
    
    def load_financial_journal(self) -> pl.DataFrame:
        """Load financial journal data"""
        logger.info("Loading financial journal...")
        
        file_path = self.datasets_path / "Journals" / "FinancialJournal.csv"
        df = pl.read_csv(file_path, try_parse_dates=True)
        
        logger.info(f"Loaded {df.height:,} financial transaction records")
        return df
    
    def load_checkin_journal(self) -> pl.DataFrame:
        """Load check-in journal data"""
        logger.info("Loading check-in journal...")
        
        file_path = self.datasets_path / "Journals" / "CheckinJournal.csv"
        df = pl.read_csv(file_path, try_parse_dates=True)
        
        logger.info(f"Loaded {df.height:,} check-in records")
        return df
    
    def load_travel_journal(self) -> pl.DataFrame:
        """Load travel journal data"""
        logger.info("Loading travel journal...")
        
        file_path = self.datasets_path / "Journals" / "TravelJournal.csv"
        df = pl.read_csv(file_path, try_parse_dates=True)
        
        logger.info(f"Loaded {df.height:,} travel records")
        return df
    
    def load_social_network(self) -> pl.DataFrame:
        """Load social network data"""
        logger.info("Loading social network...")
        
        file_path = self.datasets_path / "Journals" / "SocialNetwork.csv"
        df = pl.read_csv(file_path, try_parse_dates=True)
        
        logger.info(f"Loaded {df.height:,} social network records")
        return df
    
    def load_attributes_data(self) -> dict:
        """Load all attribute files"""
        logger.info("Loading attribute data...")
        
        attributes_path = self.datasets_path / "Attributes"
        
        # Define all attribute files
        attribute_files = {
            'participants': 'Participants.csv',
            'jobs': 'Jobs.csv',
            'employers': 'Employers.csv',
            'apartments': 'Apartments.csv',
            'buildings': 'Buildings.csv',
            'restaurants': 'Restaurants.csv',
            'pubs': 'Pubs.csv',
            'schools': 'Schools.csv'
        }
        
        attributes = {}
        for name, filename in attribute_files.items():
            file_path = attributes_path / filename
            if file_path.exists():
                df = pl.read_csv(file_path, try_parse_dates=True)
                attributes[name] = df
                logger.info(f"Loaded {name}: {df.height:,} records")
            else:
                logger.warning(f"File not found: {file_path}")
                attributes[name] = pl.DataFrame()
        
        return attributes
    
    def load_all_data(self) -> RawData:
        """Load all datasets and return RawData container"""
        logger.info("Starting full data load...")
        
        # Load main datasets
        participant_status_logs = self.load_participant_status_logs()
        financial_journal = self.load_financial_journal()
        checkin_journal = self.load_checkin_journal()
        travel_journal = self.load_travel_journal()
        social_network = self.load_social_network()
        
        # Load attribute data
        attributes = self.load_attributes_data()
        
        # Create RawData container
        raw_data = RawData(
            participant_status_logs=participant_status_logs,
            financial_journal=financial_journal,
            checkin_journal=checkin_journal,
            travel_journal=travel_journal,
            social_network=social_network,
            participants=attributes['participants'],
            jobs=attributes['jobs'],
            employers=attributes['employers'],
            apartments=attributes['apartments'],
            buildings=attributes['buildings'],
            restaurants=attributes['restaurants'],
            pubs=attributes['pubs'],
            schools=attributes['schools']
        )
        
        logger.info("All data loaded successfully!")
        return raw_data