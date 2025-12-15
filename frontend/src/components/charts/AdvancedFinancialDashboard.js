import React, { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';
import styled from 'styled-components';

const FinancialDashboardContainer = styled.div`
  background: var(--bg-primary);
  border-radius: var(--radius-lg);
  padding: 1.5rem;
  box-shadow: var(--shadow-md);
`;

const DashboardTitle = styled.h3`
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 0.5rem;
`;

const DashboardSubtitle = styled.p`
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin-bottom: 1.5rem;
  line-height: 1.5;
`;

const MetricsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
`;

const MetricCard = styled.div`
  background: var(--bg-secondary, #f8f9fa);
  padding: 1rem;
  border-radius: var(--radius-md);
  text-align: center;
  border: 1px solid var(--border-color, #e2e8f0);
`;

const MetricValue = styled.div`
  font-size: 1.5rem;
  font-weight: 700;
  color: ${props => props.color || 'var(--primary-color)'};
  margin-bottom: 0.25rem;
`;

const MetricLabel = styled.div`
  font-size: 0.75rem;
  color: var(--text-secondary);
  font-weight: 500;
`;

const ChartContainer = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 1.5rem;
  margin-bottom: 1rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const ChartSection = styled.div`
  background: var(--bg-secondary, #f8f9fa);
  padding: 1rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color, #e2e8f0);
`;

const ChartTitle = styled.h4`
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 1rem;
  text-align: center;
`;

const TooltipContainer = styled.div`
  position: absolute;
  background: rgba(0, 0, 0, 0.9);
  color: white;
  padding: 0.75rem;
  border-radius: 6px;
  font-size: 0.8rem;
  pointer-events: none;
  z-index: 1000;
  opacity: 0;
  transition: opacity 0.2s ease;

  &.show {
    opacity: 1;
  }
`;

const AdvancedFinancialDashboard = ({ 
  data = [], 
  width = 500, 
  height = 300,
  title = "Financial Health Overview",
  subtitle = "Comprehensive analysis of financial patterns and trends"
}) => {
  const timelineRef = useRef();
  const distributionRef = useRef();
  const tooltipRef = useRef();
  const [processedData, setProcessedData] = useState([]);
  const [metrics, setMetrics] = useState({});

  // Generate comprehensive mock financial data
  const generateFinancialData = () => {
    const months = ['2022-03', '2022-04', '2022-05', '2022-06', '2022-07', '2022-08', '2022-09', '2022-10', '2022-11', '2022-12', '2023-01', '2023-02', '2023-03', '2023-04', '2023-05'];
    const educationLevels = ['HighSchoolOrCollege', 'Bachelors', 'Graduate', 'Low'];
    
    const financialData = [];
    
    months.forEach(month => {
      educationLevels.forEach(education => {
        // Simulate realistic financial patterns
        const baseBalance = education === 'Graduate' ? 8000 : 
                           education === 'Bachelors' ? 5000 : 
                           education === 'HighSchoolOrCollege' ? 3000 : 2000;
        
        const monthIndex = months.indexOf(month);
        const seasonalFactor = 1 + 0.1 * Math.sin((monthIndex / 12) * 2 * Math.PI); // Seasonal variation
        const growthFactor = 1 + (monthIndex * 0.02); // Gradual growth over time
        
        const avgBalance = baseBalance * seasonalFactor * growthFactor + (Math.random() - 0.5) * 1000;
        const income = avgBalance * 0.3 + Math.random() * 1000;
        const expenses = income * 0.8 + Math.random() * 500;
        const savings = income - expenses;
        
        financialData.push({
          month,
          education,
          avgBalance: Math.max(0, avgBalance),
          income,
          expenses,
          savings,
          participants: Math.floor(Math.random() * 100 + 50),
          transactions: Math.floor(Math.random() * 500 + 200),
          debtRatio: Math.random() * 0.3,
          savingsRate: savings / income
        });
      });
    });
    
    return financialData;
  };

  // Calculate summary metrics
  const calculateMetrics = (data) => {
    if (!data || data.length === 0) return {};

    const totalBalance = d3.sum(data, d => d.avgBalance * d.participants);
    const totalParticipants = d3.sum(data, d => d.participants);
    const avgBalance = totalBalance / totalParticipants;
    
    const totalIncome = d3.sum(data, d => d.income * d.participants);
    const totalExpenses = d3.sum(data, d => d.expenses * d.participants);
    const avgIncome = totalIncome / totalParticipants;
    const avgExpenses = totalExpenses / totalParticipants;
    
    const avgSavingsRate = d3.mean(data, d => d.savingsRate) * 100;
    const avgDebtRatio = d3.mean(data, d => d.debtRatio) * 100;
    
    return {
      avgBalance,
      avgIncome,
      avgExpenses,
      avgSavingsRate,
      avgDebtRatio,
      totalTransactions: d3.sum(data, d => d.transactions)
    };
  };

  useEffect(() => {
    const financialData = data && data.length > 0 ? data : generateFinancialData();
    // Ensure all data has proper string values
    const cleanedData = financialData.map(d => ({
      ...d,
      month: d.month || 'N/A',
      education: d.education || d.educationLevel || 'Unknown',
      avgBalance: Number(d.avgBalance) || 0,
      income: Number(d.income) || 0,
      expenses: Number(d.expenses) || 0,
      savings: Number(d.savings) || 0,
      participants: Number(d.participants) || 0,
      transactions: Number(d.transactions) || 0,
      debtRatio: Number(d.debtRatio) || 0,
      savingsRate: Number(d.savingsRate) || 0
    }));
    setProcessedData(cleanedData);
    setMetrics(calculateMetrics(cleanedData));
  }, [data]);

  // Timeline Chart
  useEffect(() => {
    if (!processedData.length) return;

    const svg = d3.select(timelineRef.current);
    // Complete cleanup of all SVG content
    svg.selectAll("*").remove();

    const margin = { top: 20, right: 20, bottom: 40, left: 60 };
    const innerWidth = (width * 0.65) - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const g = svg.append("g")
      .attr("transform", `translate(${margin.left}, ${margin.top})`);

    // Group data by month
    const monthlyData = d3.groups(processedData, d => d.month)
      .map(([month, records]) => ({
        month: month || 'N/A',
        avgBalance: d3.mean(records, d => Number(d.avgBalance) || 0) || 0,
        totalIncome: d3.sum(records, d => (Number(d.income) || 0) * (Number(d.participants) || 0)) || 0,
        totalExpenses: d3.sum(records, d => (Number(d.expenses) || 0) * (Number(d.participants) || 0)) || 0,
        participants: d3.sum(records, d => Number(d.participants) || 0) || 1
      }))
      .filter(d => d.month !== 'N/A');

    // Scales
    const xScale = d3.scaleBand()
      .domain(monthlyData.map(d => d.month))
      .range([0, innerWidth])
      .padding(0.1);

    const yScale = d3.scaleLinear()
      .domain([0, d3.max(monthlyData, d => Math.max(d.avgBalance, d.totalIncome / d.participants, d.totalExpenses / d.participants))])
      .range([innerHeight, 0])
      .nice();

    // Add axes
    g.append("g")
      .attr("class", "axis x-axis")
      .attr("transform", `translate(0, ${innerHeight})`)
      .call(d3.axisBottom(xScale).tickFormat(d => d && typeof d === 'string' ? d.substring(5) : d))
      .selectAll("text")
      .style("font-size", "10px");

    g.append("g")
      .attr("class", "axis y-axis")
      .call(d3.axisLeft(yScale).tickFormat(d3.format(".0s")))
      .selectAll("text")
      .style("font-size", "10px");

    // Line generators
    const balanceLine = d3.line()
      .x(d => xScale(d.month) + xScale.bandwidth() / 2)
      .y(d => yScale(d.avgBalance))
      .curve(d3.curveMonotoneX);

    const incomeLine = d3.line()
      .x(d => xScale(d.month) + xScale.bandwidth() / 2)
      .y(d => yScale(d.totalIncome / d.participants))
      .curve(d3.curveMonotoneX);

    const expenseLine = d3.line()
      .x(d => xScale(d.month) + xScale.bandwidth() / 2)
      .y(d => yScale(d.totalExpenses / d.participants))
      .curve(d3.curveMonotoneX);

    // Add lines
    g.append("path")
      .datum(monthlyData)
      .attr("fill", "none")
      .attr("stroke", "#2563eb")
      .attr("stroke-width", 2)
      .attr("d", balanceLine);

    g.append("path")
      .datum(monthlyData)
      .attr("fill", "none")
      .attr("stroke", "#16a34a")
      .attr("stroke-width", 2)
      .attr("d", incomeLine);

    g.append("path")
      .datum(monthlyData)
      .attr("fill", "none")
      .attr("stroke", "#dc2626")
      .attr("stroke-width", 2)
      .attr("d", expenseLine);

    // Add data points with hover
    g.selectAll(".balance-dot")
      .data(monthlyData)
      .join("circle")
      .attr("class", "balance-dot")
      .attr("cx", d => xScale(d.month) + xScale.bandwidth() / 2)
      .attr("cy", d => yScale(d.avgBalance))
      .attr("r", 4)
      .attr("fill", "#2563eb")
      .style("cursor", "pointer")
      .on("mouseover", function(event, d) {
        const tooltip = d3.select(tooltipRef.current);
        tooltip.classed("show", true)
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 10) + "px")
          .html(`
            <div><strong>${d.month}</strong></div>
            <div>Avg Balance: $${d.avgBalance.toLocaleString()}</div>
            <div>Avg Income: $${(d.totalIncome / d.participants).toLocaleString()}</div>
            <div>Avg Expenses: $${(d.totalExpenses / d.participants).toLocaleString()}</div>
            <div>Participants: ${d.participants.toLocaleString()}</div>
          `);
      })
      .on("mouseout", function() {
        d3.select(tooltipRef.current).classed("show", false);
      });

    // Legend
    const legend = g.append("g")
      .attr("transform", `translate(${innerWidth - 120}, 20)`);

    const legendData = [
      { label: "Balance", color: "#2563eb" },
      { label: "Income", color: "#16a34a" },
      { label: "Expenses", color: "#dc2626" }
    ];

    legend.selectAll(".legend-item")
      .data(legendData)
      .join("g")
      .attr("class", "legend-item")
      .attr("transform", (d, i) => `translate(0, ${i * 15})`)
      .each(function(d) {
        const item = d3.select(this);
        item.append("line")
          .attr("x1", 0)
          .attr("x2", 15)
          .attr("stroke", d.color)
          .attr("stroke-width", 2);
        item.append("text")
          .attr("x", 20)
          .attr("y", 4)
          .text(d.label)
          .style("font-size", "10px")
          .style("fill", "var(--text-secondary)");
      });

  }, [processedData, width, height]);

  // Distribution Chart (Education Level Breakdown)
  useEffect(() => {
    if (!processedData.length) return;

    const svg = d3.select(distributionRef.current);
    // Complete cleanup of all SVG content
    svg.selectAll("*").remove();

    const margin = { top: 20, right: 20, bottom: 40, left: 40 };
    const innerWidth = (width * 0.35) - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const g = svg.append("g")
      .attr("transform", `translate(${margin.left}, ${margin.top})`);

    // Aggregate by education level
    const educationData = d3.groups(processedData, d => d.education)
      .map(([education, records]) => ({
        education: education || 'Unknown',
        avgBalance: d3.mean(records, d => Number(d.avgBalance) || 0) || 0,
        participants: d3.sum(records, d => Number(d.participants) || 0) || 1
      }))
      .filter(d => d.education !== 'Unknown')
      .sort((a, b) => b.avgBalance - a.avgBalance);

    // Scales
    const xScale = d3.scaleBand()
      .domain(educationData.map(d => d.education))
      .range([0, innerWidth])
      .padding(0.2);

    const yScale = d3.scaleLinear()
      .domain([0, d3.max(educationData, d => d.avgBalance)])
      .range([innerHeight, 0])
      .nice();

    const colorScale = d3.scaleOrdinal()
      .domain(educationData.map(d => d.education))
      .range(['#3b82f6', '#10b981', '#f59e0b', '#ef4444']);

    // Add bars
    g.selectAll(".bar")
      .data(educationData)
      .join("rect")
      .attr("class", "bar")
      .attr("x", d => xScale(d.education))
      .attr("y", d => yScale(d.avgBalance))
      .attr("width", xScale.bandwidth())
      .attr("height", d => innerHeight - yScale(d.avgBalance))
      .attr("fill", d => colorScale(d.education))
      .attr("rx", 4)
      .style("cursor", "pointer")
      .on("mouseover", function(event, d) {
        d3.select(this).attr("opacity", 0.8);
        const tooltip = d3.select(tooltipRef.current);
        tooltip.classed("show", true)
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 10) + "px")
          .html(`
            <div><strong>${d.education}</strong></div>
            <div>Avg Balance: $${d.avgBalance.toLocaleString()}</div>
            <div>Participants: ${d.participants.toLocaleString()}</div>
          `);
      })
      .on("mouseout", function() {
        d3.select(this).attr("opacity", 1);
        d3.select(tooltipRef.current).classed("show", false);
      });

    // Add axes
    g.append("g")
      .attr("class", "axis x-axis")
      .attr("transform", `translate(0, ${innerHeight})`)
      .call(d3.axisBottom(xScale).tickFormat(d => d && typeof d === 'string' ? d.substring(0, 8) : d))
      .selectAll("text")
      .style("font-size", "9px")
      .attr("transform", "rotate(-45)")
      .style("text-anchor", "end");

    g.append("g")
      .attr("class", "axis y-axis")
      .call(d3.axisLeft(yScale).tickFormat(d3.format(".0s")))
      .selectAll("text")
      .style("font-size", "10px");

  }, [processedData, width, height]);

  const formatCurrency = (value) => `$${Math.round(value).toLocaleString()}`;
  const formatPercent = (value) => `${value.toFixed(1)}%`;

  return (
    <FinancialDashboardContainer>
      <DashboardTitle>{title}</DashboardTitle>
      <DashboardSubtitle>{subtitle}</DashboardSubtitle>
      
      <MetricsGrid>
        <MetricCard>
          <MetricValue color="#2563eb">{formatCurrency(metrics.avgBalance || 0)}</MetricValue>
          <MetricLabel>Avg Balance</MetricLabel>
        </MetricCard>
        <MetricCard>
          <MetricValue color="#16a34a">{formatCurrency(metrics.avgIncome || 0)}</MetricValue>
          <MetricLabel>Avg Income</MetricLabel>
        </MetricCard>
        <MetricCard>
          <MetricValue color="#dc2626">{formatCurrency(metrics.avgExpenses || 0)}</MetricValue>
          <MetricLabel>Avg Expenses</MetricLabel>
        </MetricCard>
        <MetricCard>
          <MetricValue color="#7c3aed">{formatPercent(metrics.avgSavingsRate || 0)}</MetricValue>
          <MetricLabel>Savings Rate</MetricLabel>
        </MetricCard>
        <MetricCard>
          <MetricValue color="#ea580c">{formatPercent(metrics.avgDebtRatio || 0)}</MetricValue>
          <MetricLabel>Debt Ratio</MetricLabel>
        </MetricCard>
      </MetricsGrid>

      <ChartContainer>
        <ChartSection>
          <ChartTitle>Financial Trends Over Time</ChartTitle>
          <svg ref={timelineRef} width={width * 0.65} height={height}></svg>
        </ChartSection>
        
        <ChartSection>
          <ChartTitle>Balance by Education Level</ChartTitle>
          <svg ref={distributionRef} width={width * 0.35} height={height}></svg>
        </ChartSection>
      </ChartContainer>

      <TooltipContainer ref={tooltipRef} />
    </FinancialDashboardContainer>
  );
};

export default AdvancedFinancialDashboard;