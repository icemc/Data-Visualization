import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import * as d3 from 'd3';
import LineChart from '../components/charts/LineChart';
import CombinedParallelCoordinatesChart from '../components/charts/CombinedParallelCoordinatesChart';
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
  const [summaryStats, setSummaryStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter states
  const [filters, setFilters] = useState({
    from: '2022-03-01',
    to: '2023-05-31',
    employerId: 'all'
  });

  useEffect(() => {
    loadEmploymentData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);



  const loadEmploymentData = async () => {
    try {
      setLoading(true);
      
      // Load employment stability data
      const stability = await fetchData(employmentAPI.getStability({
        from: filters.from,
        to: filters.to,
        educationLevel: 'all',
        ageGroup: 'all'
        }));

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
          avg_financial_balance: item.avg_financial_balance,
          avg_jobs_per_participant: item.avg_jobs_per_participant,
          participant_count: item.participant_count,
          educationLevel: displayEducationLevel,
          category: `${displayEducationLevel} Education`
        };
      });



      // Calculate summary statistics
      const totalParticipants = transformedStability.reduce((sum, item) => sum + (item.participant_count || 0), 0);
      const avgEmploymentRate = transformedStability.length > 0 
        ? transformedStability.reduce((sum, item) => sum + (item.avg_employment_rate || 0), 0) / transformedStability.length 
        : 0;
      const avgStabilityScore = transformedStability.length > 0 
        ? transformedStability.reduce((sum, item) => sum + (item.avg_stability_score || 0), 0) / transformedStability.length 
        : 0;
      // Calculate average turnover rate from jobs per participant
      const avgTurnoverRate = transformedStability.length > 0 
        ? d3.mean(transformedStability, d => {
            const jobsPerYear = Number(d.avg_jobs_per_participant) || 1;
            return Math.max(0, (jobsPerYear - 1) * 100);
          }) || 0
        : 0;

      setSummaryStats({
        totalParticipants,
        avgEmploymentRate,
        avgStabilityScore,
        avgTurnoverRate
      });

      setStabilityData(transformedStability);
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
          <h3 className="chart-title">Employment Stability Trends - Time Series</h3>
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

      {/* Combined Parallel Coordinates Analysis */}
      <FullWidthChart>
        <div className="chart-container">
          <h3 className="chart-title">Employment Analysis - Parallel Coordinates</h3>
          <p className="chart-subtitle">
            Interactive analysis showing employment patterns across education levels with switchable views
          </p>
          
          {loading && <LoadingMessage>Loading...</LoadingMessage>}
          {error && <ErrorMessage>Error: {error}</ErrorMessage>}
          {!loading && !error && stabilityData.length > 0 && (
            <CombinedParallelCoordinatesChart
              data={stabilityData}
              width={1200}
              height={450}
              colorKey="educationLevel"
              colors={['#3182ce', '#38b2ac', '#d69e2e', '#e53e3e', '#9f7aea', '#f56565']}
            />
          )}
          {!loading && !error && stabilityData.length === 0 && (
            <LoadingMessage>No data available for the selected filters.</LoadingMessage>
          )}
        </div>
      </FullWidthChart>


    </PageContainer>
  );
};

export default EmploymentAnalysis;