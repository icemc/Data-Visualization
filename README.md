# Challenge 3: Economic Analysis Dashboard

A full-stack web application for analyzing economic patterns from VAST Challenge 2022 data.

## Features

- **Financial Analysis**: Interactive charts showing financial trends, balance distributions, and spending patterns
- **Employment Analysis**: Employment stability trends, job turnover rates, and duration analysis by education level
- **Business Analysis**: Business revenue trends, visit patterns, and venue type distributions
- **Multi-dimensional Filtering**: Filter data by education level, age group, date range, and other parameters
- **Real-time Visualizations**: Interactive D3.js charts with animations and tooltips

## Technology Stack

**Frontend:**
- React 18.2.0
- D3.js 7.8.5 for visualizations
- Styled Components for styling
- Axios for API communication

**Backend:**
- Node.js with Express 5.1.0
- DuckDB for high-performance analytics
- Redis for caching (optional)
- Comprehensive API with Swagger documentation

**Data Processing:**
- Python 3.8+ with Polars for high-performance data processing
- DuckDB for analytical database with optimized schemas
- Docker containerization for reproducible processing environment

**Database:**
- DuckDB with optimized schemas for financial, employment, and business data
- Efficient indexing and query optimization for large datasets

## Quick Start

1. **Data Preprocessing (Required First Step):**
   ```bash
   cd data-preprocessing
   pip install -r requirements.txt
   python src/main.py
   ```
   This processes VAST Challenge 2022 CSV files and creates the DuckDB database in `data/economic.duckdb`

2. **Backend Setup:**
   ```bash
   cd backend
   npm install
   npm start
   ```
   Server runs on http://localhost:3001

3. **Frontend Setup:**
   ```bash
   cd frontend
   npm install
   npm start
   ```
   Application runs on http://localhost:3002

4. **Access the Application:**
   - Main Dashboard: http://localhost:3002
   - API Documentation: http://localhost:3001/api-docs

## Project Structure

```
challenge-3/
├── data-preprocessing/  # Data processing scripts (run first)
├── frontend/           # React frontend application
├── backend/            # Node.js backend API
└── data/              # Database and processed data files
```

## API Endpoints

- `GET /api/financial/trends` - Financial trend analysis
- `GET /api/employment/stability` - Employment stability metrics
- `GET /api/employment/turnover` - Job turnover analysis  
- `GET /api/business/revenue` - Business revenue trends
- `GET /api/business/visits` - Business visit patterns

## Education Levels Supported

- **Graduate**: Graduate degree holders
- **Bachelors**: Bachelor's degree holders  
- **HighSchoolOrCollege**: High school or some college education
- **Low**: Below high school education level

## Key Visualizations

1. **Line Charts**: Time-series trends with multi-category support
2. **Bar Charts**: Comparative analysis across categories
3. **Pie Charts**: Distribution and composition analysis
4. **Summary Statistics**: Key metrics and KPI cards

## Development Notes

- All charts support education level and age group filtering
- Backend implements intelligent caching for performance
- Frontend uses consistent color schemes across all visualizations
- Responsive design adapts to different screen sizes

## Data Processing Pipeline

The Python-based data-preprocessing application transforms VAST Challenge 2022 raw datasets into an optimized DuckDB database for analytics:

### Architecture & Technologies
- **Language**: Python 3.8+
- **Data Processing**: Polars 1.35.2 for high-performance DataFrame operations
- **Database**: DuckDB 1.4.2 for analytical workloads
- **Memory Management**: PyArrow 22.0.0 for efficient columnar data handling
- **Configuration**: Pydantic settings with environment variable support
- **Logging**: Structured logging with Loguru and progress tracking with tqdm

### Pipeline Components

#### 1. Data Ingestion (`ingestion/data_loader.py`)
- **Source Files**: Activity Logs (60+ CSV files), Attributes, and Journals from VAST-Challenge-2022/Datasets
- **Processing**: Parallel loading with configurable chunk sizes and worker threads
- **Format Validation**: Schema validation and data type inference
- **Memory Optimization**: Lazy loading with Polars for large dataset handling

#### 2. Specialized Processors
- **Business Processor**: Analyzes venue visits, revenue patterns, and business prosperity metrics
- **Financial Processor**: Calculates participant financial trajectories, balance evolution, and spending patterns
- **Employment Processor**: Derives employment status, job transitions, and stability metrics from transaction patterns

#### 3. Database Management (`database/duckdb_manager.py`)
- **Schema Creation**: Optimized table structures for financial, business, and employment analytics
- **Bulk Loading**: Efficient batch inserts with transaction management
- **Indexing Strategy**: Composite indexes on temporal and categorical dimensions
- **Summary Generation**: Pre-computed aggregations for dashboard performance

#### 4. Data Transformations
- **Temporal Processing**: Conversion from daily transactions to monthly analytical summaries
- **Balance Calculations**: Running financial balance calculations with transaction categorization
- **Employment Inference**: Statistical derivation of employment status from spending and location patterns
- **Business Metrics**: Revenue estimation algorithms based on visit frequency and transaction volumes

### Configuration & Deployment
- **Environment Variables**: Configurable input/output paths, processing parameters
- **Docker Support**: Containerized deployment with Dockerfile
- **Error Handling**: Comprehensive exception handling with detailed logging
- **Performance Tuning**: Configurable chunk sizes and parallel processing workers

## Performance Features

- **Database Optimization**: Efficient DuckDB queries with proper indexing
- **Caching Strategy**: Redis-based caching for frequently accessed data
- **Lazy Loading**: Charts load data on-demand based on user selections
- **Error Handling**: Comprehensive error handling and user feedback