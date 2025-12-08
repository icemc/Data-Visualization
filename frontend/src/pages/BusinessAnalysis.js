import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import LineChart from '../components/charts/LineChart';
import BarChart from '../components/charts/BarChart';
import PieChart from '../components/charts/PieChart';
import { businessAPI, fetchData } from '../services/api';

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

const BusinessAnalysis = () => {
  const [trendsData, setTrendsData] = useState([]);
  const [performanceData, setPerformanceData] = useState([]);
  const [revenueData, setRevenueData] = useState([]);
  const [venueDistribution, setVenueDistribution] = useState([]);
  const [summaryStats, setSummaryStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter states
  const [filters, setFilters] = useState({
    from: '2022-03-01',
    to: '2023-05-31',
    venueType: 'all',
    interval: 'month'
  });

  useEffect(() => {
    loadBusinessData();
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

  const loadBusinessData = async () => {
    try {
      setLoading(true);
      
      // Load all data in parallel
      const [trends, performance, revenue] = await Promise.all([
        fetchData(businessAPI.getTrends({
          from: filters.from,
          to: filters.to,
          venueType: filters.venueType,
          interval: filters.interval
        })),
        fetchData(businessAPI.getPerformance({
          venueType: filters.venueType,
          limit: 20,
          sortBy: 'total_visits'
        })),
        fetchData(businessAPI.getRevenue({
          from: filters.from,
          to: filters.to,
          venueType: filters.venueType
        }))
      ]);

      // Transform trends data for line chart
      const transformedTrends = trends.map(item => ({
        month: item.month,
        total_visits: item.total_visits,
        avg_occupancy: item.avg_occupancy,
        total_revenue: item.total_revenue,
        venueType: item.venueType || 'All',
        category: item.venueType || 'All Venues'
      }));

      // Transform performance data for bar chart (top 10)
      const transformedPerformance = performance
        .slice(0, 10)
        .map(item => ({
          category: `Venue ${item.venueId}`,
          value: item.total_visits,
          venueType: item.venueType
        }));

      // Transform revenue data for revenue chart
      const transformedRevenue = revenue.map(item => ({
        month: item.month,
        total_revenue: item.total_revenue || (item.total_visits * 50), // Estimate if not available
        venueType: item.venueType || 'All',
        visits: item.total_visits
      }));

      // Create venue type distribution for pie chart using trends data for complete coverage
      const venueTypes = {};
      trends.forEach(item => {
        const type = item.venueType || 'Other';
        venueTypes[type] = (venueTypes[type] || 0) + (item.total_visits || 0);
      });

      const distributionData = Object.entries(venueTypes)
        .filter(([type, visits]) => visits > 0)
        .map(([type, visits]) => ({
          category: type,
          value: visits
        }))
        .sort((a, b) => b.value - a.value);

      // Calculate summary statistics
      const totalVisits = performance.reduce((sum, item) => sum + item.total_visits, 0);
      const avgOccupancy = trends.length > 0 
        ? trends.reduce((sum, item) => sum + (item.avg_occupancy || 0), 0) / trends.length 
        : 0;
      const totalRevenue = transformedRevenue.reduce((sum, item) => sum + (item.total_revenue || 0), 0);
      const activeVenues = performance.length;

      setSummaryStats({
        totalVisits,
        avgOccupancy,
        totalRevenue,
        activeVenues
      });

      setTrendsData(transformedTrends);
      setPerformanceData(transformedPerformance);
      setRevenueData(transformedRevenue);
      setVenueDistribution(distributionData);
      setError(null);
    } catch (err) {
      console.error('Failed to load business data:', err);
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
        <PageTitle>Business Prosperity Analysis</PageTitle>
        <PageDescription>
          Examine business performance trends, venue occupancy patterns, and revenue indicators 
          across different business types and time periods.
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
          <FilterLabel>Venue Type</FilterLabel>
          <FilterSelect
            value={filters.venueType}
            onChange={(e) => handleFilterChange('venueType', e.target.value)}
          >
            <option value="all">All Venue Types</option>
            <option value="Restaurant">Restaurants</option>
            <option value="Pub">Pubs</option>
            <option value="Workplace">Workplaces</option>
            <option value="Apartment">Apartments</option>
          </FilterSelect>
        </FilterGroup>

        <FilterGroup>
          <FilterLabel>Interval</FilterLabel>
          <FilterSelect
            value={filters.interval}
            onChange={(e) => handleFilterChange('interval', e.target.value)}
          >
            <option value="month">Monthly</option>
            <option value="quarter">Quarterly</option>
            <option value="year">Yearly</option>
          </FilterSelect>
        </FilterGroup>
      </ControlsPanel>

      {/* Summary Statistics Cards */}
      {!loading && !error && summaryStats && (
        <StatsGrid>
          <StatCard>
            <StatValue>{summaryStats.totalVisits.toLocaleString()}</StatValue>
            <StatLabel>Total Visits</StatLabel>
          </StatCard>
          <StatCard>
            <StatValue>{summaryStats.avgOccupancy.toFixed(1)}%</StatValue>
            <StatLabel>Average Occupancy</StatLabel>
          </StatCard>
          <StatCard>
            <StatValue>${summaryStats.totalRevenue.toLocaleString('en-US', { maximumFractionDigits: 0 })}</StatValue>
            <StatLabel>Total Revenue</StatLabel>
          </StatCard>
          <StatCard>
            <StatValue>{summaryStats.activeVenues}</StatValue>
            <StatLabel>Active Venues</StatLabel>
          </StatCard>
        </StatsGrid>
      )}

      <ChartsGrid>
        {/* Top Performing Venues */}
        <div className="chart-container">
          <h3 className="chart-title">Top Performing Venues</h3>
          <p className="chart-subtitle">
            Venues with highest total visits
          </p>
          
          {loading && <LoadingMessage>Loading venue performance...</LoadingMessage>}
          {error && <ErrorMessage>Error: {error}</ErrorMessage>}
          {!loading && !error && performanceData.length > 0 && (
            <BarChart
              data={performanceData}
              width={550}
              height={350}
              xKey="category"
              yKey="value"
              xLabel="Venue"
              yLabel="Total Visits"
              color="#3182ce"
            />
          )}
          {!loading && !error && performanceData.length === 0 && (
            <LoadingMessage>No performance data available for the selected filters.</LoadingMessage>
          )}
        </div>

        {/* Venue Type Distribution */}
        <div className="chart-container">
          <h3 className="chart-title">Business Type Distribution</h3>
          <p className="chart-subtitle">
            Proportion of visits by venue type
          </p>
          
          {loading && <LoadingMessage>Loading venue distribution...</LoadingMessage>}
          {error && <ErrorMessage>Error: {error}</ErrorMessage>}
          {!loading && !error && venueDistribution.length > 0 && (
            <PieChart
              data={venueDistribution}
              width={550}
              height={400}
              labelKey="category"
              valueKey="value"
              colors={['#3182ce', '#38b2ac', '#d69e2e', '#e53e3e', '#9f7aea']}
              showLegend={true}
              animate={true}
            />
          )}
          {!loading && !error && venueDistribution.length === 0 && (
            <LoadingMessage>No distribution data available for the selected filters.</LoadingMessage>
          )}
        </div>

        {/* Monthly Revenue Trends */}
        <div className="chart-container">
          <h3 className="chart-title">Revenue Trends</h3>
          <p className="chart-subtitle">
            Monthly revenue patterns by venue type
          </p>
          
          {loading && <LoadingMessage>Loading revenue data...</LoadingMessage>}
          {error && <ErrorMessage>Error: {error}</ErrorMessage>}
          {!loading && !error && revenueData.length > 0 && (
            <LineChart
              data={revenueData}
              width={550}
              height={350}
              xKey="month"
              yKey="total_revenue"
              colorKey="venueType"
              xLabel="Month"
              yLabel="Revenue ($)"
              colors={['#3182ce', '#38b2ac', '#d69e2e', '#e53e3e', '#9f7aea']}
              showLegend={true}
              showDots={true}
              animate={true}
            />
          )}
          {!loading && !error && revenueData.length === 0 && (
            <LoadingMessage>No revenue data available for the selected filters.</LoadingMessage>
          )}
        </div>

        {/* Visit Volume Trends */}
        <div className="chart-container">
          <h3 className="chart-title">Business Visit Trends</h3>
          <p className="chart-subtitle">
            Total visits over time by venue type
          </p>
          
          {loading && <LoadingMessage>Loading business trends...</LoadingMessage>}
          {error && <ErrorMessage>Error: {error}</ErrorMessage>}
          {!loading && !error && trendsData.length > 0 && (
            <LineChart
              data={trendsData}
              width={550}
              height={350}
              xKey="month"
              yKey="total_visits"
              colorKey="venueType"
              xLabel="Month"
              yLabel="Total Visits"
              colors={['#3182ce', '#38b2ac', '#d69e2e', '#e53e3e', '#9f7aea']}
              showLegend={true}
              showDots={true}
              animate={true}
            />
          )}
          {!loading && !error && trendsData.length === 0 && (
            <LoadingMessage>No trends data available for the selected filters.</LoadingMessage>
          )}
        </div>
      </ChartsGrid>
    </PageContainer>
  );
};

export default BusinessAnalysis;