import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import LineChart from '../components/charts/LineChart';
import BarChart from '../components/charts/BarChart';
import { summaryAPI, fetchData } from '../services/api';

const DashboardContainer = styled.div`
  max-width: 1400px;
  margin: 0 auto;
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
  margin-bottom: 2rem;
  line-height: 1.6;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
`;

const StatCard = styled.div`
  background: var(--bg-primary);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  padding: 1.5rem;
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
  font-weight: 500;
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

const Dashboard = () => {
  const [kpiData, setKpiData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        const kpis = await fetchData(summaryAPI.getKPIs());
        setKpiData(kpis);
        setError(null);
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  // Mock data for initial charts (replace with real data when available)
  const mockTrendData = [
    { month: '2022-03', avg_balance: 25000, category: 'Average Balance' },
    { month: '2022-04', avg_balance: 26500, category: 'Average Balance' },
    { month: '2022-05', avg_balance: 28000, category: 'Average Balance' },
    { month: '2022-06', avg_balance: 27200, category: 'Average Balance' },
    { month: '2022-07', avg_balance: 29100, category: 'Average Balance' },
    { month: '2022-08', avg_balance: 30500, category: 'Average Balance' },
  ];

  const mockBusinessData = [
    { category: 'Restaurants', value: 15 },
    { category: 'Pubs', value: 8 },
    { category: 'Workplaces', value: 25 },
    { category: 'Schools', value: 4 },
  ];

  if (loading) {
    return (
      <DashboardContainer>
        <LoadingMessage>Loading dashboard data...</LoadingMessage>
      </DashboardContainer>
    );
  }

  if (error) {
    return (
      <DashboardContainer>
        <ErrorMessage>Error: {error}</ErrorMessage>
      </DashboardContainer>
    );
  }

  return (
    <DashboardContainer>
      <PageTitle>Economic Analysis Dashboard</PageTitle>
      <PageDescription>
        Comprehensive analysis of financial health, business prosperity, and employment patterns 
        based on participant data from March 2022 to May 2023.
      </PageDescription>

      <StatsGrid>
        <StatCard>
          <StatValue>1,011</StatValue>
          <StatLabel>Total Participants</StatLabel>
        </StatCard>
        <StatCard>
          <StatValue>253</StatValue>
          <StatLabel>Employers</StatLabel>
        </StatCard>
        <StatCard>
          <StatValue>113M+</StatValue>
          <StatLabel>Activity Records</StatLabel>
        </StatCard>
        <StatCard>
          <StatValue>15 Months</StatValue>
          <StatLabel>Data Period</StatLabel>
        </StatCard>
      </StatsGrid>

      <ChartsGrid>
        <div className="chart-container">
          <h3 className="chart-title">Financial Trend Overview</h3>
          <p className="chart-subtitle">Average balance trends over time</p>
          <LineChart
            data={mockTrendData}
            width={500}
            height={300}
            xKey="month"
            yKey="avg_balance"
            colorKey="category"
            xLabel="Month"
            yLabel="Average Balance ($)"
            showLegend={false}
          />
        </div>

        <div className="chart-container">
          <h3 className="chart-title">Business Distribution</h3>
          <p className="chart-subtitle">Number of venues by category</p>
          <BarChart
            data={mockBusinessData}
            width={500}
            height={300}
            xKey="category"
            yKey="value"
            xLabel="Venue Type"
            yLabel="Count"
            color="#38b2ac"
          />
        </div>
      </ChartsGrid>
    </DashboardContainer>
  );
};

export default Dashboard;