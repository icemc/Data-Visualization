import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as d3 from 'd3';
import styled from 'styled-components';

const ChartContainer = styled.div`
  background: var(--bg-primary);
  border-radius: var(--radius-lg);
  padding: 1.5rem;
  box-shadow: var(--shadow-md);
`;

const ChartTitle = styled.h3`
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 0.5rem;
`;

const ChartSubtitle = styled.p`
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin-bottom: 1.5rem;
  line-height: 1.5;
`;

const ControlsContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  margin-top: 1rem;
  padding: 1rem;
  background: var(--bg-secondary, #f8f9fa);
  border-radius: var(--radius-md);
`;

const PlayButton = styled.button`
  background: var(--primary-color, #3182ce);
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: var(--radius-md);
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
  transition: all 0.2s ease;

  &:hover {
    background: var(--primary-color-dark, #2c5aa0);
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }
`;

const TimeSlider = styled.input`
  width: 300px;
  height: 4px;
  background: var(--border-color, #e2e8f0);
  border-radius: 2px;
  outline: none;
  -webkit-appearance: none;
  
  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 16px;
    height: 16px;
    background: var(--primary-color, #3182ce);
    border-radius: 50%;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  &::-webkit-slider-thumb:hover {
    transform: scale(1.2);
    box-shadow: 0 0 0 4px rgba(49, 130, 206, 0.2);
  }

  &::-moz-range-thumb {
    width: 16px;
    height: 16px;
    background: var(--primary-color, #3182ce);
    border-radius: 50%;
    border: none;
    cursor: pointer;
  }
`;

const TimeDisplay = styled.div`
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-primary);
  min-width: 80px;
  text-align: center;
`;

const LegendContainer = styled.div`
  display: flex;
  justify-content: center;
  gap: 1.5rem;
  margin-top: 1rem;
  flex-wrap: wrap;
`;

const LegendItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
  color: var(--text-secondary);
`;

const LegendColor = styled.div`
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: ${props => props.color};
`;

const TooltipContainer = styled.div`
  position: absolute;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  pointer-events: none;
  z-index: 1000;
  opacity: 0;
  transition: opacity 0.2s ease;

  &.show {
    opacity: 1;
  }
`;

// Helper function to format education level names for display
const formatEducationLevel = (level) => {
  const formatMap = {
    'HighSchoolOrCollege': 'High School/College',
    'Bachelors': 'Bachelor\'s Degree',
    'Graduate': 'Graduate Degree',
    'Low': 'Lower Education'
  };
  return formatMap[level] || level;
};

const AnimatedBubbleChart = ({ 
  data = [], 
  width = 800, 
  height = 500,
  title = "Employment Dynamics Over Time",
  subtitle = "Interactive bubble animation showing employment patterns across different education levels"
}) => {
  const svgRef = useRef();
  const tooltipRef = useRef();
  const [currentTimeIndex, setCurrentTimeIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [timePoints, setTimePoints] = useState([]);
  const [processedData, setProcessedData] = useState([]);

  // Process and structure the data
  useEffect(() => {
    if (!data || data.length === 0) {
      // Generate mock data for demonstration
      const mockData = generateMockData();
      setProcessedData(mockData);
      const uniqueTimePoints = [...new Set(mockData.map(d => d.time))].sort();
      setTimePoints(uniqueTimePoints);
      return;
    }

    // Process real data if provided
    const uniqueTimePoints = [...new Set(data.map(d => d.month || d.time))].sort();
    setTimePoints(uniqueTimePoints);
    setProcessedData(data);
  }, [data]);

  // Generate mock data for demonstration
  const generateMockData = useCallback(() => {
    const educationLevels = ['HighSchoolOrCollege', 'Bachelors', 'Graduate', 'Low'];
    const timePoints = ['2022-03', '2022-06', '2022-09', '2022-12', '2023-03'];
    const mockData = [];

    timePoints.forEach(time => {
      educationLevels.forEach((education, index) => {
        mockData.push({
          time,
          educationLevel: education,
          employmentRate: 60 + Math.random() * 35 + index * 5,
          stabilityScore: 0.4 + Math.random() * 0.5 + index * 0.05,
          participantCount: 50 + Math.random() * 100 + index * 20,
          averageSalary: 30000 + Math.random() * 40000 + index * 15000
        });
      });
    });

    return mockData;
  }, []);

  // Animation effect
  useEffect(() => {
    if (!isPlaying || timePoints.length === 0) return;

    const interval = setInterval(() => {
      setCurrentTimeIndex(prev => {
        const next = (prev + 1) % timePoints.length;
        return next;
      });
    }, 1500); // Change frame every 1.5 seconds

    return () => clearInterval(interval);
  }, [isPlaying, timePoints.length]);

  // D3 visualization effect
  useEffect(() => {
    if (!processedData.length || !timePoints.length) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const margin = { top: 40, right: 60, bottom: 60, left: 80 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const g = svg.append("g")
      .attr("transform", `translate(${margin.left}, ${margin.top})`);

    // Scales
    const xScale = d3.scaleLinear()
      .domain(d3.extent(processedData, d => d.employmentRate || d.avg_employment_rate || 0))
      .range([0, innerWidth])
      .nice();

    const yScale = d3.scaleLinear()
      .domain(d3.extent(processedData, d => d.stabilityScore || d.avg_stability_score || 0))
      .range([innerHeight, 0])
      .nice();

    const sizeScale = d3.scaleSqrt()
      .domain(d3.extent(processedData, d => d.participantCount || d.participant_count || 0))
      .range([8, 40]);

    const colorScale = d3.scaleOrdinal()
      .domain([...new Set(processedData.map(d => d.education || d.educationLevel))])
      .range(['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b', '#e377c2', '#7f7f7f']);

    // Add axes
    g.append("g")
      .attr("transform", `translate(0, ${innerHeight})`)
      .call(d3.axisBottom(xScale).tickFormat(d => `${d}%`))
      .selectAll("text")
      .style("font-size", "12px");

    g.append("g")
      .call(d3.axisLeft(yScale).tickFormat(d3.format(".2f")))
      .selectAll("text")
      .style("font-size", "12px");

    // Axis labels
    g.append("text")
      .attr("transform", `translate(${innerWidth / 2}, ${innerHeight + 40})`)
      .style("text-anchor", "middle")
      .style("font-size", "14px")
      .style("fill", "var(--text-secondary)")
      .text("Employment Rate (%)");

    g.append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", 0 - margin.left + 20)
      .attr("x", 0 - (innerHeight / 2))
      .style("text-anchor", "middle")
      .style("font-size", "14px")
      .style("fill", "var(--text-secondary)")
      .text("Stability Score");

    // Add grid lines
    g.append("g")
      .attr("class", "grid")
      .attr("transform", `translate(0, ${innerHeight})`)
      .call(d3.axisBottom(xScale)
        .tickSize(-innerHeight)
        .tickFormat("")
      )
      .style("stroke-dasharray", "2,2")
      .style("opacity", 0.3);

    g.append("g")
      .attr("class", "grid")
      .call(d3.axisLeft(yScale)
        .tickSize(-innerWidth)
        .tickFormat("")
      )
      .style("stroke-dasharray", "2,2")
      .style("opacity", 0.3);

    // Create bubbles container
    const bubblesContainer = g.append("g").attr("class", "bubbles");

    // Update function
    const updateBubbles = (timeIndex) => {
      const currentTime = timePoints[timeIndex];
      const currentData = processedData.filter(d => 
        (d.time === currentTime) || (d.month === currentTime)
      );

      const bubbles = bubblesContainer.selectAll(".bubble")
        .data(currentData, d => d.education || d.educationLevel);

      // Remove exiting bubbles
      bubbles.exit()
        .transition()
        .duration(500)
        .attr("r", 0)
        .style("opacity", 0)
        .remove();

      // Update existing bubbles
      bubbles.transition()
        .duration(800)
        .attr("cx", d => xScale(d.employmentRate || d.avg_employment_rate || 0))
        .attr("cy", d => yScale(d.stabilityScore || d.avg_stability_score || 0))
        .attr("r", d => sizeScale(d.participantCount || d.participant_count || 0))
        .style("opacity", 0.7);

      // Add new bubbles
      const newBubbles = bubbles.enter()
        .append("circle")
        .attr("class", "bubble")
        .attr("cx", d => xScale(d.employmentRate || d.avg_employment_rate || 0))
        .attr("cy", d => yScale(d.stabilityScore || d.avg_stability_score || 0))
        .attr("r", 0)
        .attr("fill", d => colorScale(d.education || d.educationLevel))
        .attr("stroke", "#fff")
        .attr("stroke-width", 2)
        .style("opacity", 0);

      newBubbles.transition()
        .duration(800)
        .attr("r", d => sizeScale(d.participantCount || d.participant_count || 0))
        .style("opacity", 0.7);

      // Add hover effects
      bubblesContainer.selectAll(".bubble")
        .on("mouseover", function(event, d) {
          d3.select(this)
            .transition()
            .duration(200)
            .attr("stroke-width", 3)
            .style("opacity", 1);

          const tooltip = d3.select(tooltipRef.current);
          tooltip.classed("show", true)
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 10) + "px")
            .html(`
              <div><strong>${formatEducationLevel(d.education || d.educationLevel)}</strong></div>
              <div>Employment Rate: ${(d.employmentRate || d.avg_employment_rate || 0).toFixed(1)}%</div>
              <div>Stability Score: ${(d.stabilityScore || d.avg_stability_score || 0).toFixed(2)}</div>
              <div>Participants: ${d.participantCount || d.participant_count || 0}</div>
              ${d.averageSalary ? `<div>Avg Balance: $${Math.round(d.averageSalary).toLocaleString()}</div>` : ''}
            `);
        })
        .on("mouseout", function() {
          d3.select(this)
            .transition()
            .duration(200)
            .attr("stroke-width", 2)
            .style("opacity", 0.7);

          d3.select(tooltipRef.current).classed("show", false);
        });
    };

    // Initial render
    updateBubbles(currentTimeIndex);

  }, [processedData, currentTimeIndex, width, height, timePoints]);

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleSliderChange = (event) => {
    const value = parseInt(event.target.value);
    setCurrentTimeIndex(value);
    setIsPlaying(false);
  };

  const educationLevels = [...new Set(processedData.map(d => d.education || d.educationLevel))];
  const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

  return (
    <ChartContainer>
      <ChartTitle>{title}</ChartTitle>
      <ChartSubtitle>{subtitle}</ChartSubtitle>
      
      <div style={{ position: 'relative' }}>
        <svg ref={svgRef} width={width} height={height}></svg>
        <TooltipContainer ref={tooltipRef} />
      </div>

      <ControlsContainer>
        <PlayButton onClick={handlePlayPause}>
          {isPlaying ? '⏸️ Pause' : '▶️ Play'}
        </PlayButton>
        
        <TimeSlider
          type="range"
          min="0"
          max={Math.max(0, timePoints.length - 1)}
          value={currentTimeIndex}
          onChange={handleSliderChange}
        />
        
        <TimeDisplay>
          {timePoints[currentTimeIndex] || 'No Data'}
        </TimeDisplay>
      </ControlsContainer>

      {educationLevels.length > 0 && (
        <LegendContainer>
          {educationLevels.map((level, index) => (
            <LegendItem key={level}>
              <LegendColor color={colorScale(level)} />
              <span>{formatEducationLevel(level)}</span>
            </LegendItem>
          ))}
        </LegendContainer>
      )}
    </ChartContainer>
  );
};

export default AnimatedBubbleChart;