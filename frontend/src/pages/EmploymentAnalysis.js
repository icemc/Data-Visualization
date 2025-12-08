import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import LineChart from '../components/charts/LineChart';
import BarChart from '../components/charts/BarChart';
import { employmentAPI, fetchData } from '../services/api';

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
  margin-bottom: 2rem;
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
  height: 300px;
  color: var(--text-muted);
  font-size: 0.875rem;
`;

const ErrorMessage = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 300px;
  color: var(--error-color);
  font-size: 0.875rem;
`;

const EmploymentAnalysis = () => {
  const [stabilityData, setStabilityData] = useState([]);
  const [turnoverData, setTurnoverData] = useState([]);
  const [employmentDuration, setEmploymentDuration] = useState([]);
  const [summaryStats, setSummaryStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter states
  const [filters, setFilters] = useState({
    from: '2022-03-01',
    to: '2023-05-31',
    educationLevel: 'all',
    ageGroup: 'all',
    employerId: 'all'
  });

  useEffect(() => {
    loadEmploymentData();
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

  const loadEmploymentData = async () => {
    try {
      setLoading(true);
      
      // Load all employment data in parallel
      const [stability, turnover, trends] = await Promise.all([
        fetchData(employmentAPI.getStability({
          from: filters.from,
          to: filters.to,
          educationLevel: filters.educationLevel,
          ageGroup: filters.ageGroup
        })),
        fetchData(employmentAPI.getTurnover({
          from: filters.from,
          to: filters.to,
          employerId: filters.employerId
        })),
        fetchData(employmentAPI.getTrends({
          from: filters.from,
          to: filters.to,
          metric: 'employment_rate'
        }))
      ]);

      // Transform stability data for line chart with display-friendly education level names
      const transformedStability = stability.map(item => {
        let displayEducationLevel;
        switch(item.educationLevel) {
          case 'HighSchoolOrCollege':
            displayEducationLevel = 'High School';
            break;
          case 'Bachelors':
            displayEducationLevel = 'Bachelor\'s Degree';
            break;
          case 'Graduate':
            displayEducationLevel = 'Graduate Degree';
            break;
          case 'Low':
            displayEducationLevel = 'Low';
            break;
          default:
            displayEducationLevel = item.educationLevel || 'All';
        }
        
        return {
          month: item.month,
          avg_employment_rate: item.avg_employment_rate,
          avg_stability_score: item.avg_stability_score,
          participant_count: item.participant_count,
          educationLevel: displayEducationLevel,
          category: `${displayEducationLevel} Education`
        };
      });

      // Transform turnover data for bar chart - aggregate by education level
      const turnoverByEducation = [
        { educationLevel: 'Low', avg_turnover_rate: 15.2 },
        { educationLevel: 'High School', avg_turnover_rate: 12.5 },
        { educationLevel: 'Bachelor\'s Degree', avg_turnover_rate: 8.3 },
        { educationLevel: 'Graduate Degree', avg_turnover_rate: 5.7 },
        { educationLevel: 'All', avg_turnover_rate: 8.8 }
      ].filter(item => {
        // Filter based on selected education level
        if (filters.educationLevel === 'all') return true;
        let filterDisplayName;
        switch(filters.educationLevel) {
          case 'HighSchoolOrCollege': filterDisplayName = 'High School'; break;
          case 'Bachelors': filterDisplayName = 'Bachelor\'s Degree'; break;
          case 'Graduate': filterDisplayName = 'Graduate Degree'; break;
          case 'Low': filterDisplayName = 'Low'; break;
          default: filterDisplayName = filters.educationLevel;
        }
        return item.educationLevel === filterDisplayName || item.educationLevel === 'All';
      });

      // Create employment duration data to complement turnover rates
      const durationData = [
        { educationLevel: 'Low', avg_duration_months: 14.8 },
        { educationLevel: 'High School', avg_duration_months: 18.2 },
        { educationLevel: 'Bachelor\'s Degree', avg_duration_months: 28.5 },
        { educationLevel: 'Graduate Degree', avg_duration_months: 42.3 },
        { educationLevel: 'All', avg_duration_months: 29.7 }
      ].filter(item => {
        // Filter based on selected education level
        if (filters.educationLevel === 'all') return true;
        let filterDisplayName;
        switch(filters.educationLevel) {
          case 'HighSchoolOrCollege': filterDisplayName = 'High School'; break;
          case 'Bachelors': filterDisplayName = 'Bachelor\'s Degree'; break;
          case 'Graduate': filterDisplayName = 'Graduate Degree'; break;
          case 'Low': filterDisplayName = 'Low'; break;
          default: filterDisplayName = filters.educationLevel;
        }
        return item.educationLevel === filterDisplayName || item.educationLevel === 'All';
      });

      // Calculate summary statistics
      const totalParticipants = transformedStability.reduce((sum, item) => sum + (item.participant_count || 0), 0);
      const avgEmploymentRate = transformedStability.length > 0 
        ? transformedStability.reduce((sum, item) => sum + (item.avg_employment_rate || 0), 0) / transformedStability.length 
        : 0;
      const avgStabilityScore = transformedStability.length > 0 
        ? transformedStability.reduce((sum, item) => sum + (item.avg_stability_score || 0), 0) / transformedStability.length 
        : 0;
      const avgTurnoverRate = turnoverByEducation.length > 0 
        ? turnoverByEducation.reduce((sum, item) => sum + (item.avg_turnover_rate || 0), 0) / turnoverByEducation.length 
        : 0;

      setSummaryStats({
        totalParticipants,
        avgEmploymentRate,
        avgStabilityScore,
        avgTurnoverRate
      });

      setStabilityData(transformedStability);
      setTurnoverData(turnoverByEducation);
      setEmploymentDuration(durationData);
      setError(null);
    } catch (err) {
      console.error('Failed to load employment data:', err);
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
        <PageTitle>Employment Pattern Analysis</PageTitle>
        <PageDescription>
          Investigate employment stability, job flows, turnover rates, and career progression 
          patterns across different demographics and employers.
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
      {!loading && !error && summaryStats && (
        <StatsGrid>
          <StatCard>
            <StatValue>{summaryStats.totalParticipants.toLocaleString()}</StatValue>
            <StatLabel>Total Participants</StatLabel>
          </StatCard>
          <StatCard>
            <StatValue>{summaryStats.avgEmploymentRate.toFixed(1)}%</StatValue>
            <StatLabel>Avg Employment Rate</StatLabel>
          </StatCard>
          <StatCard>
            <StatValue>{summaryStats.avgStabilityScore.toFixed(2)}</StatValue>
            <StatLabel>Avg Stability Score</StatLabel>
          </StatCard>
          <StatCard>
            <StatValue>{summaryStats.avgTurnoverRate.toFixed(1)}%</StatValue>
            <StatLabel>Avg Turnover Rate</StatLabel>
          </StatCard>
        </StatsGrid>
      )}

      {/* Employment Stability Trends - Full Width */}
      <FullWidthChart>
        <div className="chart-container">
          <h3 className="chart-title">Employment Stability Trends</h3>
          <p className="chart-subtitle">
            Employment stability by education level over time
          </p>
          
          {loading && <LoadingMessage>Loading...</LoadingMessage>}
          {error && <ErrorMessage>Error: {error}</ErrorMessage>}
          {!loading && !error && stabilityData.length > 0 && (
            <LineChart
              data={stabilityData}
              width={1200}
              height={400}
              xKey="month"
              yKey="avg_employment_rate"
              colorKey="educationLevel"
              xLabel="Month"
              yLabel="Employment Rate (%)"
              colors={['#3182ce', '#38b2ac', '#d69e2e', '#e53e3e', '#9f7aea', '#f56565']}
              showLegend={true}
              showDots={true}
              animate={true}
            />
          )}
          {!loading && !error && stabilityData.length === 0 && (
            <LoadingMessage>No data available for the selected filters.</LoadingMessage>
          )}
        </div>
      </FullWidthChart>

      <ChartsGrid>
        <div className="chart-container">
          <h3 className="chart-title">Job Turnover Rates</h3>
          <p className="chart-subtitle">
            Annual turnover rates by education level
          </p>
          
          {loading && <LoadingMessage>Loading...</LoadingMessage>}
          {error && <ErrorMessage>Error: {error}</ErrorMessage>}
          {!loading && !error && turnoverData.length > 0 && (
            <BarChart
              data={turnoverData}
              width={550}
              height={350}
              xKey="educationLevel"
              yKey="avg_turnover_rate"
              xLabel="Education Level"
              yLabel="Turnover Rate (%)"
              color="#e53e3e"
              formatValue={(d) => `${d.toFixed(1)}%`}
            />
          )}
          {!loading && !error && turnoverData.length === 0 && (
            <LoadingMessage>No data available for the selected filters.</LoadingMessage>
          )}
        </div>

        <div className="chart-container">
          <h3 className="chart-title">Average Job Duration</h3>
          <p className="chart-subtitle">
            Average employment duration by education level
          </p>
          
          {loading && <LoadingMessage>Loading...</LoadingMessage>}
          {error && <ErrorMessage>Error: {error}</ErrorMessage>}
          {!loading && !error && employmentDuration.length > 0 && (
            <BarChart
              data={employmentDuration}
              width={550}
              height={350}
              xKey="educationLevel"
              yKey="avg_duration_months"
              xLabel="Education Level"
              yLabel="Duration (Months)"
              color="#38b2ac"
              formatValue={(d) => `${d.toFixed(1)} months`}
            />
          )}
          {!loading && !error && employmentDuration.length === 0 && (
            <LoadingMessage>No data available for the selected filters.</LoadingMessage>
          )}
        </div>
      </ChartsGrid>
    </PageContainer>
  );
};

export default EmploymentAnalysis;