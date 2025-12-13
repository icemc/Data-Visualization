import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import styled from 'styled-components';

const ChartContainer = styled.div`
  .parallel-coords-svg {
    font-family: Arial, sans-serif;
  }
  
  .axis {
    font-size: 12px;
  }
  
  .axis-label {
    font-size: 14px;
    font-weight: 600;
    text-anchor: middle;
  }
  
  .line {
    fill: none;
    stroke-width: 1.5px;
    opacity: 0.7;
  }
  
  .line:hover {
    opacity: 1;
    stroke-width: 2.5px;
  }
  
  .axis line,
  .axis path {
    stroke: #666;
    stroke-width: 1;
  }
  
  .axis text {
    fill: #333;
  }
  
  .legend {
    font-size: 12px;
  }
  
  .legend-item {
    cursor: pointer;
  }
  
  .legend-item.disabled {
    opacity: 0.3;
  }
  
  .tooltip {
    position: absolute;
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 8px 12px;
    border-radius: 4px;
    font-size: 12px;
    pointer-events: none;
    z-index: 1000;
  }
`;

const ParallelCoordinatesChart = ({ 
  data = [], 
  width = 800, 
  height = 400, 
  margin = { top: 60, right: 150, bottom: 60, left: 60 },
  dimensions = ['avg_employment_rate', 'avg_stability_score', 'avg_financial_balance', 'avg_jobs_per_participant'],
  dimensionLabels = {
    'avg_employment_rate': 'Employment Rate (%)',
    'avg_stability_score': 'Stability Score',
    'avg_financial_balance': 'Financial Balance ($)',
    'avg_jobs_per_participant': 'Jobs per Participant'
  },
  colorKey = 'educationLevel',
  colors = ['#3182ce', '#38b2ac', '#d69e2e', '#e53e3e', '#9f7aea', '#f56565']
}) => {
  const svgRef = useRef();
  const tooltipRef = useRef();

  useEffect(() => {
    if (!data || data.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    // Set up dimensions
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Create main group
    const g = svg
      .attr('width', width)
      .attr('height', height)
      .attr('class', 'parallel-coords-svg')
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Transform data for multi-metric employment profiles
    // Group by education level and calculate aggregate metrics
    const groupedData = d3.group(data, d => d[colorKey]);
    const aggregatedData = [];
    
    groupedData.forEach((values, key) => {
      const profileData = {
        [colorKey]: key,
        employment_rate: d3.mean(values, d => d.avg_employment_rate || 0),
        stability_score: d3.mean(values, d => d.avg_stability_score || 0),
        financial_balance: d3.mean(values, d => d.avg_financial_balance || 0),
        job_duration: d3.mean(values, d => d.avg_jobs_per_participant || 0) * 12, // Convert to months
        turnover_rate: Math.max(0, 100 - d3.mean(values, d => d.avg_employment_rate || 0)) / 4 // Derived metric
      };
      
      aggregatedData.push(profileData);
    });

    // Define metrics as dimensions
    const metricDimensions = ['employment_rate', 'stability_score', 'financial_balance', 'job_duration', 'turnover_rate'];
    
    // Set up scales for each metric
    const scales = {};
    metricDimensions.forEach(metric => {
      const values = aggregatedData.map(d => d[metric]).filter(v => v !== undefined && !isNaN(v));
      scales[metric] = d3.scaleLinear()
        .domain(d3.extent(values))
        .nice()
        .range([innerHeight, 0]);
    });

    // Set up x scale for positioning axes
    const xScale = d3.scalePoint()
      .domain(metricDimensions)
      .range([0, innerWidth]);

    // Color scale
    const colorScale = d3.scaleOrdinal(colors)
      .domain([...groupedData.keys()]);

    // Create tooltip
    const tooltip = d3.select(tooltipRef.current)
      .style('opacity', 0)
      .attr('class', 'tooltip');

    // Metric labels for display
    const metricLabels = {
      'employment_rate': 'Employment Rate (%)',
      'stability_score': 'Stability Score',
      'financial_balance': 'Financial Balance ($)',
      'job_duration': 'Job Duration (months)',
      'turnover_rate': 'Turnover Rate (%)'
    };

    // Draw axes
    metricDimensions.forEach(metric => {
      const axis = g.append('g')
        .attr('class', 'axis')
        .attr('transform', `translate(${xScale(metric)}, 0)`)
        .call(d3.axisLeft(scales[metric]).ticks(6));

      // Add axis labels
      axis.append('text')
        .attr('class', 'axis-label')
        .attr('y', -20)
        .attr('x', 0)
        .style('text-anchor', 'middle')
        .text(metricLabels[metric]);
    });

    // Draw lines for each education level
    aggregatedData.forEach(d => {
      const lineData = metricDimensions.map(metric => ({
        metric,
        value: d[metric] || 0
      }));
      
      const path = g.append('path')
        .datum(lineData)
        .attr('class', `line line-${d[colorKey].replace(/[^a-zA-Z0-9-_]/g, '-')}`)
        .attr('d', d3.line()
          .x(point => xScale(point.metric))
          .y(point => scales[point.metric](point.value))
        )
        .style('stroke', colorScale(d[colorKey]))
        .on('mouseover', function(event) {
          // Highlight this line
          d3.selectAll('.line').style('opacity', 0.2);
          d3.select(this).style('opacity', 1).style('stroke-width', '3px');
          
          // Show tooltip with all metrics
          const tooltipContent = `<strong>${d[colorKey]} Employment Profile</strong><br/>` +
            `Employment Rate: ${d.employment_rate.toFixed(1)}%<br/>` +
            `Stability Score: ${d.stability_score.toFixed(1)}<br/>` +
            `Avg Balance: $${d.financial_balance.toLocaleString()}<br/>` +
            `Job Duration: ${d.job_duration.toFixed(1)} months<br/>` +
            `Turnover Rate: ${d.turnover_rate.toFixed(1)}%`;
          
          tooltip.transition().duration(200).style('opacity', .9);
          tooltip.html(tooltipContent)
          .style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY - 28) + 'px');
        })
        .on('mouseout', function() {
          // Restore normal opacity
          d3.selectAll('.line').style('opacity', 0.7).style('stroke-width', '1.5px');
          
          tooltip.transition().duration(500).style('opacity', 0);
        });

      // Add dots at intersections
      metricDimensions.forEach(metric => {
        const value = d[metric] || 0;
        g.append('circle')
          .attr('cx', xScale(metric))
          .attr('cy', scales[metric](value))
          .attr('r', 4)
          .style('fill', colorScale(d[colorKey]))
          .style('stroke', '#fff')
          .style('stroke-width', 2)
          .on('mouseover', function(event) {
            // Highlight corresponding line
            d3.selectAll('.line').style('opacity', 0.2);
            d3.select(`.line-${d[colorKey].replace(/[^a-zA-Z0-9-_]/g, '-')}`).style('opacity', 1).style('stroke-width', '3px');
            
            // Show tooltip
            const formattedValue = metric === 'financial_balance' ? `$${value.toLocaleString()}` :
                                 metric === 'employment_rate' || metric === 'turnover_rate' ? `${value.toFixed(1)}%` :
                                 metric === 'job_duration' ? `${value.toFixed(1)} months` :
                                 value.toFixed(1);
            
            tooltip.transition().duration(200).style('opacity', .9);
            tooltip.html(`
              <strong>${d[colorKey]}</strong><br/>
              ${metricLabels[metric]}: ${formattedValue}
            `)
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 28) + 'px');
          })
          .on('mouseout', function() {
            // Restore normal opacity
            d3.selectAll('.line').style('opacity', 0.7).style('stroke-width', '1.5px');
            
            tooltip.transition().duration(500).style('opacity', 0);
          });
      });
    });

    // Add legend
    const legend = g.append('g')
      .attr('class', 'legend')
      .attr('transform', `translate(${innerWidth + 20}, 20)`);

    const legendItems = legend.selectAll('.legend-item')
      .data(aggregatedData)
      .enter().append('g')
      .attr('class', 'legend-item')
      .attr('transform', (d, i) => `translate(0, ${i * 25})`);

    legendItems.append('rect')
      .attr('width', 15)
      .attr('height', 15)
      .style('fill', d => colorScale(d[colorKey]));

    legendItems.append('text')
      .attr('x', 20)
      .attr('y', 12)
      .style('font-size', '12px')
      .text(d => d[colorKey]);

  }, [data, width, height, margin, dimensions, dimensionLabels, colorKey, colors]);

  return (
    <ChartContainer>
      <svg ref={svgRef}></svg>
      <div ref={tooltipRef} className="tooltip"></div>
    </ChartContainer>
  );
};

export default ParallelCoordinatesChart;