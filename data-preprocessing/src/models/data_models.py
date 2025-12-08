from typing import Dict, Any, List
from dataclasses import dataclass
import polars as pl

@dataclass
class RawData:
    """Container for all raw dataset DataFrames"""
    participant_status_logs: pl.DataFrame
    financial_journal: pl.DataFrame
    checkin_journal: pl.DataFrame
    travel_journal: pl.DataFrame
    social_network: pl.DataFrame
    participants: pl.DataFrame
    jobs: pl.DataFrame
    employers: pl.DataFrame
    apartments: pl.DataFrame
    buildings: pl.DataFrame
    restaurants: pl.DataFrame
    pubs: pl.DataFrame
    schools: pl.DataFrame

@dataclass
class BusinessMetrics:
    """Business prosperity analysis results"""
    business_trends: pl.DataFrame
    venue_performance: pl.DataFrame
    customer_patterns: pl.DataFrame
    revenue_indicators: pl.DataFrame

@dataclass
class FinancialMetrics:
    """Financial health analysis results"""
    participant_trajectories: pl.DataFrame
    financial_groups: pl.DataFrame
    wage_analysis: pl.DataFrame
    cost_living_trends: pl.DataFrame

@dataclass
class EmploymentMetrics:
    """Employment pattern analysis results"""
    job_flows: pl.DataFrame
    employer_health: pl.DataFrame
    turnover_rates: pl.DataFrame
    employment_stability: pl.DataFrame