import os
from pathlib import Path
from typing import Optional

class Settings:
    """Application settings"""
    
    def __init__(self):
        # Get the project root directory
        current_dir = Path(__file__).parent.parent.parent.parent.parent
        self.input_path = Path(os.getenv("DATA_INPUT_PATH", str(current_dir / "VAST-Challenge-2022")))
        self.output_path = Path(os.getenv("DATA_OUTPUT_PATH", str(current_dir / "challenge-3" / "data")))
        
        # Data processing settings
        self.chunk_size = int(os.getenv("CHUNK_SIZE", "10000"))
        self.max_workers = int(os.getenv("MAX_WORKERS", "4"))
    
    # File paths
    @property
    def datasets_path(self) -> Path:
        return self.input_path / "Datasets"
    
    @property
    def activity_logs_path(self) -> Path:
        return self.datasets_path / "Activity Logs"
    
    @property
    def attributes_path(self) -> Path:
        return self.datasets_path / "Attributes"
    
    @property
    def journals_path(self) -> Path:
        return self.datasets_path / "Journals"