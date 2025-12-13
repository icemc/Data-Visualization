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
    stroke-width: 2px;
    opacity: 0.8;
  }
  
  .line:hover {
    opacity: 1;
    stroke-width: 3px;
  }
  
  .axis line,
  .axis path {
    stroke: #666;
    stroke-width: 1;
  }
  
  .axis text {
    fill: #333;
  }
  
  .reference-line {
    stroke: #999;
    stroke-width: 2;
    stroke-dasharray: 5,5;
    opacity: 0.7;
  }
  
  .legend {
    font-size: 12px;
  }
  
  .legend-item {
    cursor: pointer;
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

const ComparativeParallelCoordinatesChart = ({ 
  data = [], 
  width = 800, 
  height = 400, 
  margin = { top: 60, right: 150, bottom: 60, left: 60 },
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

    // Calculate overall averages for comparison
    const validData = data.filter(d => 
      d.avg_employment_rate != null && 
      d.avg_stability_score != null &&
      d.avg_financial_balance != null &&
      d.avg_jobs_per_participant != null
    );
    
    const overallAverages = {
      employment_rate: d3.mean(validData, d => Number(d.avg_employment_rate) || 0),
      stability_score: d3.mean(validData, d => Number(d.avg_stability_score) || 0),
      financial_balance: d3.mean(validData, d => Number(d.avg_financial_balance) || 0),
      jobs_per_participant: d3.mean(validData, d => Number(d.avg_jobs_per_participant) || 0)
    };

    // Transform data for comparative analysis (vs average)
    const groupedData = d3.group(validData, d => d[colorKey]);
    const comparativeData = [];
    
    groupedData.forEach((values, key) => {
      if (values.length === 0) return;
      
      const avgMetrics = {
        employment_rate: d3.mean(values, d => Number(d.avg_employment_rate) || 0),
        stability_score: d3.mean(values, d => Number(d.avg_stability_score) || 0),
        financial_balance: d3.mean(values, d => Number(d.avg_financial_balance) || 0),
        jobs_per_participant: d3.mean(values, d => Number(d.avg_jobs_per_participant) || 0)
      };

      const profileData = {
        [colorKey]: key,
        employment_vs_avg: overallAverages.employment_rate > 0 ? ((avgMetrics.employment_rate / overallAverages.employment_rate) * 100) - 100 : 0,
        stability_vs_avg: overallAverages.stability_score > 0 ? ((avgMetrics.stability_score / overallAverages.stability_score) * 100) - 100 : 0,
        financial_vs_avg: overallAverages.financial_balance > 0 ? ((avgMetrics.financial_balance / overallAverages.financial_balance) * 100) - 100 : 0,
        jobs_vs_avg: overallAverages.jobs_per_participant > 0 ? ((avgMetrics.jobs_per_participant / overallAverages.jobs_per_participant) * 100) - 100 : 0
      };
      
      comparativeData.push(profileData);
    });

    // Define comparative dimensions
    const comparativeDimensions = ['employment_vs_avg', 'stability_vs_avg', 'financial_vs_avg', 'jobs_vs_avg'];
    
    // Set up scales for each comparative metric
    const scales = {};
    comparativeDimensions.forEach(metric => {
      const values = comparativeData.map(d => d[metric]).filter(v => v !== undefined && !isNaN(v) && isFinite(v));
      
      if (values.length === 0) {
        // Fallback to a default scale if no valid values
        scales[metric] = d3.scaleLinear()
          .domain([-20, 20])
          .range([innerHeight, 0]);
      } else {
        const extent = d3.extent(values);
        // Ensure the scale includes 0 (average line) and has reasonable bounds
        const minValue = Math.min(extent[0] || -20, -20);
        const maxValue = Math.max(extent[1] || 20, 20);
        scales[metric] = d3.scaleLinear()
          .domain([minValue, maxValue])
          .nice()
          .range([innerHeight, 0]);
      }
    });

    // Set up x scale for positioning axes
    const xScale = d3.scalePoint()
      .domain(comparativeDimensions)
      .range([0, innerWidth]);

    // Color scale
    const colorScale = d3.scaleOrdinal(colors)
      .domain([...groupedData.keys()]);

    // Create tooltip
    const tooltip = d3.select(tooltipRef.current)
      .style('opacity', 0)
      .attr('class', 'tooltip');

    // Comparative labels for display
    const comparativeLabels = {
      'employment_vs_avg': 'Employment Rate vs Avg',
      'stability_vs_avg': 'Stability vs Avg',
      'financial_vs_avg': 'Financial Balance vs Avg',
      'jobs_vs_avg': 'Job Mobility vs Avg'
    };

    // Draw axes
    comparativeDimensions.forEach(metric => {
      const axis = g.append('g')
        .attr('class', 'axis')
        .attr('transform', `translate(${xScale(metric)}, 0)`)
        .call(d3.axisLeft(scales[metric]).ticks(8).tickFormat(d => `${d > 0 ? '+' : ''}${d.toFixed(0)}%`));

      // Add axis labels
      axis.append('text')
        .attr('class', 'axis-label')
        .attr('y', -20)
        .attr('x', 0)
        .style('text-anchor', 'middle')
        .text(comparativeLabels[metric]);

      // Add reference line at 0 (average)
      g.append('line')
        .attr('class', 'reference-line')
        .attr('x1', xScale(metric) - 5)
        .attr('x2', xScale(metric) + 5)
        .attr('y1', scales[metric](0))
        .attr('y2', scales[metric](0));
    });

    // Draw horizontal reference line connecting all averages
    g.append('path')
      .datum(comparativeDimensions.map(metric => ({ metric, value: 0 })))
      .attr('class', 'reference-line')
      .attr('d', d3.line()
        .x(point => xScale(point.metric))
        .y(point => scales[point.metric](point.value))
      );

    // Draw lines for each education level
    comparativeData.forEach(d => {
      const lineData = comparativeDimensions.map(metric => ({
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
          d3.select(this).style('opacity', 1).style('stroke-width', '4px');
          
          // Show tooltip with comparative performance
          const tooltipContent = `<strong>${d[colorKey]} vs Average Performance</strong><br/>` +
            `Employment Rate: ${d.employment_vs_avg > 0 ? '+' : ''}${d.employment_vs_avg.toFixed(1)}%<br/>` +
            `Stability Score: ${d.stability_vs_avg > 0 ? '+' : ''}${d.stability_vs_avg.toFixed(1)}%<br/>` +
            `Financial Balance: ${d.financial_vs_avg > 0 ? '+' : ''}${d.financial_vs_avg.toFixed(1)}%<br/>` +
            `Job Mobility: ${d.jobs_vs_avg > 0 ? '+' : ''}${d.jobs_vs_avg.toFixed(1)}%`;
          
          tooltip.transition().duration(200).style('opacity', .9);
          tooltip.html(tooltipContent)
          .style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY - 28) + 'px');
        })
        .on('mouseout', function() {
          // Restore normal opacity
          d3.selectAll('.line').style('opacity', 0.8).style('stroke-width', '2px');
          
          tooltip.transition().duration(500).style('opacity', 0);
        });

      // Add dots at intersections
      comparativeDimensions.forEach(metric => {
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
            d3.select(`.line-${d[colorKey].replace(/[^a-zA-Z0-9-_]/g, '-')}`).style('opacity', 1).style('stroke-width', '4px');
            
            // Show tooltip
            tooltip.transition().duration(200).style('opacity', .9);
            tooltip.html(`
              <strong>${d[colorKey]}</strong><br/>
              ${comparativeLabels[metric]}: ${value > 0 ? '+' : ''}${value.toFixed(1)}%
            `)
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 28) + 'px');
          })
          .on('mouseout', function() {
            // Restore normal opacity
            d3.selectAll('.line').style('opacity', 0.8).style('stroke-width', '2px');
            
            tooltip.transition().duration(500).style('opacity', 0);
          });
      });
    });

    // Add legend
    const legend = g.append('g')
      .attr('class', 'legend')
      .attr('transform', `translate(${innerWidth + 20}, 20)`);

    const legendItems = legend.selectAll('.legend-item')
      .data(comparativeData)
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

    // Add legend for reference line
    legend.append('g')
      .attr('transform', `translate(0, ${comparativeData.length * 25 + 20})`)
      .call(g => {
        g.append('line')
          .attr('x1', 0)
          .attr('x2', 15)
          .attr('y1', 7)
          .attr('y2', 7)
          .attr('class', 'reference-line');
        
        g.append('text')
          .attr('x', 20)
          .attr('y', 12)
          .style('font-size', '12px')
          .text('Average');
      });

  }, [data, width, height, margin, colorKey, colors]);

  return (
    <ChartContainer>
      <svg ref={svgRef}></svg>
      <div ref={tooltipRef} className="tooltip"></div>
    </ChartContainer>
  );
};

export default ComparativeParallelCoordinatesChart;