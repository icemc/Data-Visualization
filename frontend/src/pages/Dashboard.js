import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import LineChart from '../components/charts/LineChart';
import BarChart from '../components/charts/BarChart';
import AnimatedBubbleChart from '../components/charts/AnimatedBubbleChart';
import BusinessLocationMap from '../components/charts/BusinessLocationMap';
import AdvancedFinancialDashboard from '../components/charts/AdvancedFinancialDashboard';
import { summaryAPI, employmentAPI, businessAPI, financialAPI, fetchData } from '../services/api';

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

const FullWidthChart = styled.div`
  margin-bottom: 2rem;
`;

const TabContainer = styled.div`
  margin-bottom: 2rem;
`;

const TabNavigation = styled.div`
  display: flex;
  border-bottom: 2px solid var(--border-color, #e2e8f0);
  margin-bottom: 2rem;
`;

const TabButton = styled.button`
  padding: 1rem 2rem;
  border: none;
  background: ${props => props.active ? 'var(--primary-color, #3182ce)' : 'transparent'};
  color: ${props => props.active ? 'white' : 'var(--text-secondary, #666)'};
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  border-radius: var(--radius-md) var(--radius-md) 0 0;
  transition: all 0.2s ease;
  position: relative;

  &:hover {
    background: ${props => props.active ? 'var(--primary-color-dark, #2c5aa0)' : 'var(--bg-secondary, #f8f9fa)'};
    color: ${props => props.active ? 'white' : 'var(--text-primary, #333)'};
  }

  ${props => props.active && `
    &::after {
      content: '';
      position: absolute;
      bottom: -2px;
      left: 0;
      right: 0;
      height: 2px;
      background: var(--primary-color, #3182ce);
    }
  `}
`;

const TabContent = styled.div`
  display: ${props => props.active ? 'block' : 'none'};
  animation: ${props => props.active ? 'fadeIn 0.3s ease-in' : 'none'};

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
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
  const [employmentData, setEmploymentData] = useState([]);
  const [businessData, setBusinessData] = useState([]);
  const [financialData, setFinancialData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('financial');

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        
        // Load KPI data
        const kpis = await fetchData(summaryAPI.getKPIs());
        
        // Load real employment stability data from backend
        const employmentStability = await fetchData(
          employmentAPI.getStability({
            from: '2022-03-01',
            to: '2023-05-31',
            educationLevel: 'all',
            ageGroup: 'all'
          })
        );
        
        // Transform the data for the bubble chart
        const transformedData = employmentStability.map(record => ({
          time: record.month,
          educationLevel: record.educationLevel,
          employmentRate: record.avg_employment_rate,
          stabilityScore: record.avg_stability_score / 100, // Convert to 0-1 scale
          participantCount: record.participant_count,
          averageSalary: record.avg_financial_balance // Using balance as salary proxy
        }));

        // Load business performance data for the map
        const businessPerformance = await fetchData(
          businessAPI.getPerformance({
            venueType: 'all',
            limit: 100,
            sortBy: 'total_visits'
          })
        );

        // Transform business data for map visualization
        const transformedBusinessData = businessPerformance.map(venue => ({
          id: venue.venueId,
          type: venue.venueType,
          name: `${venue.venueType} ${venue.venueId}`,
          visits: venue.total_visits,
          customers: venue.unique_customers,
          visitsPerCustomer: venue.visits_per_customer,
          dailyVisitRate: venue.daily_visit_rate,
          operationDays: venue.operation_days,
          // Location will be generated by the component if not provided
        }));

        // Load financial trajectories for the advanced dashboard
        const financialTrajectories = await fetchData(
          financialAPI.getTrajectories({
            from: '2022-03-01',
            to: '2023-05-31',
            educationLevel: 'all'
          })
        );

        // Transform financial data to match dashboard expectations
        const transformedFinancialData = financialTrajectories.map(record => {
          const avgBalance = record.avg_balance || 0;
          const avgBudget = record.avg_budget || 0;
          
          // More realistic financial modeling:
          // Income should be higher than balance, expenses should be most of income
          // Balance represents savings/debt accumulated over time
          
          // Base income estimation: if someone has avgBalance, they likely earn more
          const baseIncome = Math.max(2000, avgBudget * 4); // Minimum $2000 or 4x budget
          
          // If balance is positive, add it as a factor of good income
          // If balance is negative, it suggests income barely covers expenses
          const incomeBonus = avgBalance > 0 ? avgBalance * 0.1 : 0;
          const estimatedIncome = baseIncome + incomeBonus;
          
          // Expenses should be 70-90% of income depending on balance
          const expenseRatio = avgBalance > 0 ? 0.75 : 0.95; // Lower expenses if positive balance
          const estimatedExpenses = estimatedIncome * expenseRatio;
          
          const savings = estimatedIncome - estimatedExpenses;
          
          return {
            month: record.month,
            education: record.educationLevel,
            avgBalance: Math.abs(avgBalance), // Show absolute value for display
            income: Math.max(0, estimatedIncome),
            expenses: Math.max(0, estimatedExpenses),
            savings: savings,
            participants: record.participant_count || 1,
            transactions: record.participant_count * 10, // Estimate transactions
            debtRatio: record.participants_in_debt ? (record.participants_in_debt / record.participant_count) : 0,
            savingsRate: estimatedIncome > 0 ? (savings / estimatedIncome) : 0
          };
        });
        
        setEmploymentData(transformedData);
        setBusinessData(transformedBusinessData);
        setFinancialData(transformedFinancialData);
        setKpiData(kpis);
        setError(null);
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
        setError(err.message);
        // Fallback to mock data if real data fails
        setEmploymentData(mockEmploymentData);
        setBusinessData([]);
        setFinancialData([]);
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

  // Mock data for animated bubble chart
  const mockEmploymentData = [
    // Time point 1: 2022-03
    { time: '2022-03', educationLevel: 'High School', employmentRate: 68, stabilityScore: 0.65, participantCount: 120, averageSalary: 35000 },
    { time: '2022-03', educationLevel: 'Bachelor\'s', employmentRate: 78, stabilityScore: 0.72, participantCount: 200, averageSalary: 55000 },
    { time: '2022-03', educationLevel: 'Master\'s', employmentRate: 85, stabilityScore: 0.80, participantCount: 150, averageSalary: 75000 },
    { time: '2022-03', educationLevel: 'PhD', employmentRate: 88, stabilityScore: 0.85, participantCount: 80, averageSalary: 95000 },
    { time: '2022-03', educationLevel: 'Some College', employmentRate: 72, stabilityScore: 0.68, participantCount: 180, averageSalary: 42000 },
    
    // Time point 2: 2022-06
    { time: '2022-06', educationLevel: 'High School', employmentRate: 71, stabilityScore: 0.68, participantCount: 125, averageSalary: 36000 },
    { time: '2022-06', educationLevel: 'Bachelor\'s', employmentRate: 80, stabilityScore: 0.75, participantCount: 210, averageSalary: 57000 },
    { time: '2022-06', educationLevel: 'Master\'s', employmentRate: 87, stabilityScore: 0.82, participantCount: 160, averageSalary: 78000 },
    { time: '2022-06', educationLevel: 'PhD', employmentRate: 90, stabilityScore: 0.88, participantCount: 85, averageSalary: 98000 },
    { time: '2022-06', educationLevel: 'Some College', employmentRate: 74, stabilityScore: 0.70, participantCount: 185, averageSalary: 43500 },
    
    // Time point 3: 2022-09
    { time: '2022-09', educationLevel: 'High School', employmentRate: 73, stabilityScore: 0.70, participantCount: 130, averageSalary: 37000 },
    { time: '2022-09', educationLevel: 'Bachelor\'s', employmentRate: 82, stabilityScore: 0.77, participantCount: 220, averageSalary: 59000 },
    { time: '2022-09', educationLevel: 'Master\'s', employmentRate: 89, stabilityScore: 0.84, participantCount: 165, averageSalary: 80000 },
    { time: '2022-09', educationLevel: 'PhD', employmentRate: 91, stabilityScore: 0.89, participantCount: 88, averageSalary: 100000 },
    { time: '2022-09', educationLevel: 'Some College', employmentRate: 76, stabilityScore: 0.72, participantCount: 190, averageSalary: 45000 },
    
    // Time point 4: 2022-12
    { time: '2022-12', educationLevel: 'High School', employmentRate: 75, stabilityScore: 0.72, participantCount: 135, averageSalary: 38000 },
    { time: '2022-12', educationLevel: 'Bachelor\'s', employmentRate: 84, stabilityScore: 0.79, participantCount: 225, averageSalary: 61000 },
    { time: '2022-12', educationLevel: 'Master\'s', employmentRate: 90, stabilityScore: 0.86, participantCount: 170, averageSalary: 82000 },
    { time: '2022-12', educationLevel: 'PhD', employmentRate: 93, stabilityScore: 0.91, participantCount: 90, averageSalary: 102000 },
    { time: '2022-12', educationLevel: 'Some College', employmentRate: 78, stabilityScore: 0.74, participantCount: 195, averageSalary: 46500 },
    
    // Time point 5: 2023-03
    { time: '2023-03', educationLevel: 'High School', employmentRate: 77, stabilityScore: 0.74, participantCount: 140, averageSalary: 39000 },
    { time: '2023-03', educationLevel: 'Bachelor\'s', employmentRate: 86, stabilityScore: 0.81, participantCount: 230, averageSalary: 63000 },
    { time: '2023-03', educationLevel: 'Master\'s', employmentRate: 92, stabilityScore: 0.88, participantCount: 175, averageSalary: 84000 },
    { time: '2023-03', educationLevel: 'PhD', employmentRate: 94, stabilityScore: 0.92, participantCount: 92, averageSalary: 105000 },
    { time: '2023-03', educationLevel: 'Some College', employmentRate: 80, stabilityScore: 0.76, participantCount: 200, averageSalary: 48000 }
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

      <TabContainer>
        <TabNavigation>
          <TabButton 
            active={activeTab === 'financial'}
            onClick={() => setActiveTab('financial')}
          >
            Financial Health
          </TabButton>
          <TabButton 
            active={activeTab === 'business'}
            onClick={() => setActiveTab('business')}
          >
            Business Property Overview
          </TabButton>
          <TabButton 
            active={activeTab === 'employment'}
            onClick={() => setActiveTab('employment')}
          >
            Employment Overview
          </TabButton>
        </TabNavigation>

        <TabContent active={activeTab === 'financial'}>
          <FullWidthChart>
            <AdvancedFinancialDashboard
              data={financialData}
              width={1200}
              height={600}
              title="Financial Health Overview"
              subtitle="Comprehensive analysis of income, expenses, and savings patterns across all participants"
            />
          </FullWidthChart>
        </TabContent>

        <TabContent active={activeTab === 'business'}>
          <ChartsGrid>
            <div className="chart-container">
              <BusinessLocationMap
                data={businessData}
                width={500}
                height={300}
                title="Business Locations Map"
                subtitle="Interactive map showing venue distribution across the city"
              />
            </div>
            <div className="chart-container">
              <LineChart
                data={mockTrendData}
                width={500}
                height={300}
                xKey="month"
                yKey="avg_balance"
                colorKey="category"
                xLabel="Month"
                yLabel="Revenue ($)"
                showLegend={false}
              />
            </div>
          </ChartsGrid>
          
          <FullWidthChart>
            <BusinessLocationMap
              data={businessData}
              width={1200}
              height={500}
              title="Comprehensive Business Analysis"
              subtitle="Detailed view of all business locations, performance metrics, and geographic distribution patterns"
            />
          </FullWidthChart>
        </TabContent>

        <TabContent active={activeTab === 'employment'}>
          <FullWidthChart>
            <AnimatedBubbleChart
              data={employmentData}
              width={1200}
              height={600}
              title="Employment Dynamics Over Time"
              subtitle="Interactive animation showing employment rates and stability scores across education levels. Use the controls below to explore different time periods or watch the automated progression."
            />
          </FullWidthChart>
          
          <ChartsGrid>
            <div className="chart-container">
              <LineChart
                data={mockTrendData}
                width={500}
                height={300}
                xKey="month"
                yKey="avg_balance"
                colorKey="category"
                xLabel="Month"
                yLabel="Employment Rate (%)"
                showLegend={false}
              />
            </div>
            <div className="chart-container">
              <BarChart
                data={mockBusinessData}
                width={500}
                height={300}
                xKey="category"
                yKey="value"
                xLabel="Education Level"
                yLabel="Avg Stability Score"
                color="#38b2ac"
              />
            </div>
          </ChartsGrid>
        </TabContent>
      </TabContainer>
    </DashboardContainer>
  );
};

export default Dashboard;