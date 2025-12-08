import os
import sys
from pathlib import Path
from loguru import logger
from dotenv import load_dotenv

# Add src to path for imports
sys.path.append(str(Path(__file__).parent))

from config.settings import Settings
from ingestion.data_loader import DataLoader
from processing.business_processor import BusinessProcessor
from processing.financial_processor import FinancialProcessor
from processing.employment_processor import EmploymentProcessor
from database.duckdb_manager import DuckDBManager

def main():
    """Main data processing pipeline"""
    load_dotenv()
    
    # Initialize settings
    settings = Settings()
    logger.info(f"Starting data processing pipeline...")
    logger.info(f"Input path: {settings.input_path}")
    logger.info(f"Output path: {settings.output_path}")
    
    try:
        # Initialize database
        db_manager = DuckDBManager(settings.output_path / "economic.duckdb")
        
        # Initialize data loader
        data_loader = DataLoader(settings.input_path)
        
        # Load raw data
        logger.info("Loading raw data...")
        raw_data = data_loader.load_all_data()
        
        # Initialize processors
        business_processor = BusinessProcessor(raw_data)
        financial_processor = FinancialProcessor(raw_data)
        employment_processor = EmploymentProcessor(raw_data)
        
        # Process business data
        logger.info("Processing business prosperity data...")
        business_metrics = business_processor.process()
        db_manager.save_business_data(business_metrics)
        
        # Process financial data
        logger.info("Processing financial health data...")
        financial_metrics = financial_processor.process()
        db_manager.save_financial_data(financial_metrics)
        
        # Process employment data
        logger.info("Processing employment pattern data...")
        employment_metrics = employment_processor.process()
        db_manager.save_employment_data(employment_metrics)
        
        # Generate summary statistics
        logger.info("Generating summary statistics...")
        db_manager.generate_summaries()
        
        logger.info("Data processing pipeline completed successfully!")
        
    except Exception as e:
        logger.error(f"Pipeline failed: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()