import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import LineChart from '../components/charts/LineChart';
import BarChart from '../components/charts/BarChart';
import PieChart from '../components/charts/PieChart';
import { financialAPI, fetchData } from '../services/api';

const PageContainer = styled.div`
  max-width: 1400px;
  margin: 0 auto;
`;

const PageHeader = styled.div`
  margin-bottom: 2rem;
`;

const PageTitle = styled.h1`
  font-size: 2rem;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 0.5rem;
`;

const PageDescription = styled.p`
  font-size: 1rem;
  color: var(--text-secondary);
  margin-bottom: 1.5rem;
  line-height: 1.6;
`;

const ControlsPanel = styled.div`
  background: var(--bg-primary);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  padding: 1.5rem;
  margin-bottom: 2rem;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
`;

const FilterGroup = styled.div`
  display: flex;
  flex-direction: column;
`;

const FilterLabel = styled.label`
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: 0.5rem;
`;

const FilterSelect = styled.select`
  padding: 0.5rem;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  font-size: 0.875rem;
  background: var(--bg-primary);
  color: var(--text-primary);

  &:focus {
    outline: none;
    border-color: var(--primary-color);
    box-shadow: 0 0 0 3px rgba(49, 130, 206, 0.1);
  }
`;

const FilterInput = styled.input`
  padding: 0.5rem;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  font-size: 0.875rem;
  background: var(--bg-primary);
  color: var(--text-primary);

  &:focus {
    outline: none;
    border-color: var(--primary-color);
    box-shadow: 0 0 0 3px rgba(49, 130, 206, 0.1);
  }
`;

const ChartsGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  margin-bottom: 2rem;

  @media (max-width: 1200px) {
    grid-template-columns: 1fr;
  }
`;

const FullWidthChart = styled.div`
  grid-column: 1 / -1;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
`;

const StatCard = styled.div`
  background: var(--bg-primary);
  border-radius: var(--radius-lg);
  padding: 1.5rem;
  box-shadow: var(--shadow-md);
  text-align: center;
`;

const StatValue = styled.div`
  font-size: 2rem;
  font-weight: 700;
  color: var(--primary-color);
  margin-bottom: 0.5rem;
`;

const StatLabel = styled.div`
  font-size: 0.875rem;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const LoadingMessage = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 400px;
  color: var(--text-muted);
  font-size: 0.875rem;
`;

const ErrorMessage = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 400px;
  color: var(--error-color);
  font-size: 0.875rem;
`;

const FinancialAnalysis = () => {
  const [trajectoryData, setTrajectoryData] = useState([]);
  const [summaryData, setSummaryData] = useState([]);
  const [distributionData, setDistributionData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter states
  const [filters, setFilters] = useState({
    from: '2022-03-01',
    to: '2023-05-31',
    educationLevel: 'all',
    ageGroup: 'all',
    groupBy: 'month'
  });

  useEffect(() => {
    loadTrajectoryData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  // Format month from YYYY-MM to YY-MM
  const formatMonth = (month) => {
    if (!month || typeof month !== 'string') return month;
    const match = month.match(/^(\d{4})-(\d{2})$/);
    if (!match) return month;
    const [, fullYear, monthPart] = match;
    const shortYear = fullYear.slice(-2);
    return `${shortYear}-${monthPart}`;
  };

  const loadTrajectoryData = async () => {
    try {
      setLoading(true);
      // Map frontend filter values to backend API values
      const apiFilters = {
        ...filters,
        educationLevel: filters.educationLevel
      };
      const data = await fetchData(financialAPI.getTrajectories(apiFilters));
      
      // Transform data for line chart with display-friendly education level names
      const transformedData = data.map(item => {
        const displayEducationLevel = item.educationLevel === 'HighSchoolOrCollege' 
          ? 'High School' 
          : (item.educationLevel || 'All');
        
        return {
          month: item.month,
          avg_balance: item.avg_balance,
          median_balance: item.median_balance,
          participant_count: item.participant_count,
          educationLevel: displayEducationLevel,
          category: `${displayEducationLevel} (${item.participant_count} participants)`
        };
      });
      
      // Create summary statistics by education level
      const educationSummary = {};
      data.forEach(item => {
        const edu = item.educationLevel === 'HighSchoolOrCollege' 
          ? 'High School' 
          : (item.educationLevel || 'All');
        if (!educationSummary[edu]) {
          educationSummary[edu] = {
            totalBalance: 0,
            totalParticipants: 0,
            count: 0
          };
        }
        educationSummary[edu].totalBalance += item.avg_balance * item.participant_count;
        educationSummary[edu].totalParticipants += item.participant_count;
        educationSummary[edu].count += 1;
      });

      // Transform for bar chart
      const summaryForChart = Object.entries(educationSummary).map(([edu, stats]) => ({
        category: edu,
        value: stats.totalBalance / stats.totalParticipants || 0,
        participants: stats.totalParticipants
      })).sort((a, b) => b.value - a.value);

      // Create balance distribution ranges
      const ranges = [
        { range: '$0-$2K', min: 0, max: 2000 },
        { range: '$2K-$5K', min: 2000, max: 5000 },
        { range: '$5K-$10K', min: 5000, max: 10000 },
        { range: '$10K-$20K', min: 10000, max: 20000 },
        { range: '$20K+', min: 20000, max: Infinity }
      ];

      const distributionForChart = ranges.map(({ range, min, max }) => {
        const count = data.reduce((acc, item) => {
          if (item.avg_balance >= min && item.avg_balance < max) {
            return acc + item.participant_count;
          }
          return acc;
        }, 0);
        return { category: range, value: count };
      });
      
      setTrajectoryData(transformedData);
      setSummaryData(summaryForChart);
      setDistributionData(distributionForChart);
      setError(null);
    } catch (err) {
      console.error('Failed to load financial trajectory data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  return (
    <PageContainer>
      <PageHeader>
        <PageTitle>Financial Health Analysis</PageTitle>
        <PageDescription>
          Analyze financial trajectories, balance patterns, and wealth distribution across 
          different demographics and time periods.
        </PageDescription>
      </PageHeader>

      <ControlsPanel>
        <FilterGroup>
          <FilterLabel>From Date</FilterLabel>
          <FilterInput
            type="date"
            value={filters.from}
            onChange={(e) => handleFilterChange('from', e.target.value)}
          />
        </FilterGroup>

        <FilterGroup>
          <FilterLabel>To Date</FilterLabel>
          <FilterInput
            type="date"
            value={filters.to}
            onChange={(e) => handleFilterChange('to', e.target.value)}
          />
        </FilterGroup>

        <FilterGroup>
          <FilterLabel>Education Level</FilterLabel>
          <FilterSelect
            value={filters.educationLevel}
            onChange={(e) => handleFilterChange('educationLevel', e.target.value)}
          >
            <option value="all">All Education Levels</option>
            <option value="HighSchoolOrCollege">High School</option>
            <option value="Bachelors">Bachelor's Degree</option>
            <option value="Graduate">Graduate Degree</option>
            <option value="Low">Low</option>
          </FilterSelect>
        </FilterGroup>

        <FilterGroup>
          <FilterLabel>Age Group</FilterLabel>
          <FilterSelect
            value={filters.ageGroup}
            onChange={(e) => handleFilterChange('ageGroup', e.target.value)}
          >
            <option value="all">All Age Groups</option>
            <option value="young">Young (18-30)</option>
            <option value="middle">Middle (31-50)</option>
            <option value="senior">Senior (51+)</option>
          </FilterSelect>
        </FilterGroup>
      </ControlsPanel>

      {/* Summary Statistics Cards */}
      {!loading && !error && summaryData.length > 0 && (
        <StatsGrid>
          <StatCard>
            <StatValue>
              ${summaryData.length > 0 ? (summaryData.reduce((sum, item) => sum + item.value, 0) / summaryData.length).toLocaleString('en-US', { maximumFractionDigits: 0 }) : '0'}
            </StatValue>
            <StatLabel>Average Balance</StatLabel>
          </StatCard>
          <StatCard>
            <StatValue>
              {summaryData.reduce((sum, item) => sum + item.participants, 0).toLocaleString()}
            </StatValue>
            <StatLabel>Total Participants</StatLabel>
          </StatCard>
          <StatCard>
            <StatValue>
              {summaryData.length > 0 ? summaryData[0].category : 'N/A'}
            </StatValue>
            <StatLabel>Highest Avg Income</StatLabel>
          </StatCard>
          <StatCard>
            <StatValue>
              ${summaryData.length > 0 ? Math.max(...summaryData.map(s => s.value)).toLocaleString('en-US', { maximumFractionDigits: 0 }) : '0'}
            </StatValue>
            <StatLabel>Peak Balance</StatLabel>
          </StatCard>
        </StatsGrid>
      )}

      <ChartsGrid>
        {/* Average Balance by Education Level */}
        <div className="chart-container">
          <h3 className="chart-title">Average Balance by Education Level</h3>
          <p className="chart-subtitle">
            Comparison of financial standings across education groups
          </p>
          
          {loading && <LoadingMessage>Loading financial data...</LoadingMessage>}
          {error && <ErrorMessage>Error: {error}</ErrorMessage>}
          {!loading && !error && summaryData.length > 0 && (
            <BarChart
              data={summaryData}
              width={550}
              height={400}
              xKey="category"
              yKey="value"
              xLabel="Education Level"
              yLabel="Average Balance ($)"
              color="#3182ce"
            />
          )}
          {!loading && !error && summaryData.length === 0 && (
            <LoadingMessage>No summary data available for the selected filters.</LoadingMessage>
          )}
        </div>

        {/* Balance Distribution */}
        <div className="chart-container">
          <h3 className="chart-title">Balance Distribution</h3>
          <p className="chart-subtitle">
            Proportion of participants in each balance range
          </p>
          
          {loading && <LoadingMessage>Loading distribution data...</LoadingMessage>}
          {error && <ErrorMessage>Error: {error}</ErrorMessage>}
          {!loading && !error && distributionData.length > 0 && (
            <PieChart
              data={distributionData}
              width={550}
              height={400}
              labelKey="category"
              valueKey="value"
              colors={['#3182ce', '#38b2ac', '#d69e2e', '#e53e3e', '#9f7aea']}
              showLegend={true}
              animate={true}
            />
          )}
          {!loading && !error && distributionData.length === 0 && (
            <LoadingMessage>No distribution data available for the selected filters.</LoadingMessage>
          )}
        </div>
      </ChartsGrid>

      {/* Financial Trajectory Over Time - Full Width */}
      <FullWidthChart>
        <div className="chart-container">
          <h3 className="chart-title">Financial Trajectory Analysis</h3>
          <p className="chart-subtitle">
            Average balance trends over time by education level
          </p>
          
          {loading && <LoadingMessage>Loading financial data...</LoadingMessage>}
          {error && <ErrorMessage>Error: {error}</ErrorMessage>}
          {!loading && !error && trajectoryData.length > 0 && (
            <LineChart
              data={trajectoryData}
              width={1200}
              height={500}
              xKey="month"
              yKey="avg_balance"
              colorKey="educationLevel"
              xLabel="Month"
              yLabel="Average Balance ($)"
              colors={['#3182ce', '#38b2ac', '#d69e2e', '#e53e3e']}
              showLegend={true}
              showDots={true}
              animate={true}
            />
          )}
          {!loading && !error && trajectoryData.length === 0 && (
            <LoadingMessage>No financial data available for the selected filters.</LoadingMessage>
          )}
        </div>
      </FullWidthChart>
    </PageContainer>
  );
};

export default FinancialAnalysis;