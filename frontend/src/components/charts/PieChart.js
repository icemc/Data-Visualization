import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import styled from 'styled-components';

const ChartContainer = styled.div`
  .pie-chart-svg {
    font-family: Arial, sans-serif;
  }
  
  .pie-slice {
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  .pie-slice:hover {
    opacity: 0.8;
    transform: scale(1.02);
  }
  
  .pie-label {
    font-size: 12px;
    font-weight: 500;
    pointer-events: none;
  }
  
  .legend {
    font-size: 12px;
  }
  
  .legend-item {
    display: flex;
    align-items: center;
    margin-bottom: 5px;
  }
  
  .legend-color {
    width: 12px;
    height: 12px;
    margin-right: 8px;
    border-radius: 2px;
  }
`;

const PieChart = ({
  data = [],
  width = 400,
  height = 400,
  margin = { top: 20, right: 20, bottom: 20, left: 20 },
  valueKey = 'value',
  labelKey = 'category',
  colors = ['#3182ce', '#38b2ac', '#d69e2e', '#e53e3e', '#9f7aea', '#f56565', '#48bb78'],
  showLegend = true,
  animate = true
}) => {
  const svgRef = useRef();
  const containerRef = useRef();

  useEffect(() => {
    if (!data || data.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    // Set up dimensions
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    const radius = Math.min(innerWidth, innerHeight) / 2;

    // Create main group
    const g = svg
      .attr('width', width)
      .attr('height', height)
      .attr('class', 'pie-chart-svg')
      .append('g')
      .attr('transform', `translate(${width / 2}, ${height / 2})`);

    // Create color scale
    const colorScale = d3.scaleOrdinal()
      .domain(data.map(d => d[labelKey]))
      .range(colors);

    // Create pie layout
    const pie = d3.pie()
      .value(d => d[valueKey])
      .sort(null);

    // Create arc generator
    const arc = d3.arc()
      .innerRadius(0)
      .outerRadius(radius * 0.8);

    // Create label arc (slightly outside)
    const labelArc = d3.arc()
      .innerRadius(radius * 0.9)
      .outerRadius(radius * 0.9);

    // Create pie slices
    const slices = g.selectAll('.pie-slice')
      .data(pie(data))
      .enter()
      .append('g')
      .attr('class', 'pie-slice');

    // Add paths
    const paths = slices.append('path')
      .attr('fill', d => colorScale(d.data[labelKey]))
      .attr('stroke', 'white')
      .attr('stroke-width', 2);

    if (animate) {
      paths
        .attr('d', arc)
        .transition()
        .duration(750)
        .attrTween('d', function(d) {
          const interpolate = d3.interpolate({ startAngle: 0, endAngle: 0 }, d);
          return function(t) {
            return arc(interpolate(t));
          };
        });
    } else {
      paths.attr('d', arc);
    }

    // Add labels for slices with significant percentages
    const total = d3.sum(data, d => d[valueKey]);
    slices
      .filter(d => (d.data[valueKey] / total) > 0.03) // Show labels for slices > 3%
      .append('text')
      .attr('class', 'pie-label')
      .attr('transform', d => `translate(${labelArc.centroid(d)})`)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .style('font-size', '10px')
      .style('fill', 'var(--text-primary)')
      .style('font-weight', '500')
      .each(function(d) {
        const percentage = ((d.data[valueKey] / total) * 100).toFixed(1);
        const businessType = d.data[labelKey];
        const label = d3.select(this);
        
        // Add business type name
        label.append('tspan')
          .attr('x', 0)
          .attr('dy', '-0.3em')
          .text(businessType);
        
        // Add percentage below
        label.append('tspan')
          .attr('x', 0)
          .attr('dy', '1.2em')
          .text(`${percentage}%`);
      });

    // Create tooltip
    const tooltip = d3.select(containerRef.current)
      .append('div')
      .style('position', 'absolute')
      .style('padding', '10px')
      .style('background', 'var(--bg-secondary)')
      .style('border', '1px solid var(--border-color)')
      .style('border-radius', '4px')
      .style('pointer-events', 'none')
      .style('opacity', 0)
      .style('font-size', '12px')
      .style('z-index', 1000);

    // Add hover effects
    slices
      .on('mouseover', function(event, d) {
        const percentage = ((d.data[valueKey] / total) * 100).toFixed(1);
        tooltip.transition().duration(200).style('opacity', 1);
        tooltip
          .html(`
            <strong>${d.data[labelKey]}</strong><br/>
            Count: ${d.data[valueKey].toLocaleString()}<br/>
            Percentage: ${percentage}%
          `)
          .style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY - 10) + 'px');
      })
      .on('mouseout', function() {
        tooltip.transition().duration(200).style('opacity', 0);
      });

    // Cleanup tooltip on unmount
    return () => {
      d3.select(containerRef.current).select('div').remove();
    };

  }, [data, width, height, valueKey, labelKey, colors, animate]);

  // Create legend data
  const legendData = data.map((d, i) => ({
    label: d[labelKey],
    color: colors[i % colors.length],
    value: d[valueKey]
  }));

  return (
    <ChartContainer ref={containerRef} style={{ position: 'relative' }}>
      <svg ref={svgRef}></svg>
      {showLegend && (
        <div style={{ marginTop: '20px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', justifyContent: 'center' }}>
            {legendData.map((item, index) => (
              <div key={index} className="legend-item">
                <div 
                  className="legend-color" 
                  style={{ backgroundColor: item.color }}
                ></div>
                <span className="legend" style={{ color: 'var(--text-secondary)' }}>
                  {item.label} ({item.value.toLocaleString()})
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </ChartContainer>
  );
};

export default PieChart;