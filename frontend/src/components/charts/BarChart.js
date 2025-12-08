import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import styled from 'styled-components';

const ChartContainer = styled.div`
  .bar-chart-svg {
    font-family: Arial, sans-serif;
  }
  
  .bar {
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  .bar:hover {
    opacity: 0.7;
  }
  
  .axis-label {
    font-size: 12px;
    font-weight: 500;
  }
`;

const BarChart = ({
  data = [],
  width = 800,
  height = 400,
  margin = { top: 20, right: 20, bottom: 60, left: 80 },
  xKey = 'category',
  yKey = 'value',
  xLabel = 'Category',
  yLabel = 'Value',
  color = '#3182ce',
  animate = true
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
      .attr('class', 'bar-chart-svg')
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Set up scales
    const xScale = d3.scaleBand()
      .domain(data.map(d => d[xKey]))
      .range([0, innerWidth])
      .padding(0.1);

    const yScale = d3.scaleLinear()
      .domain([0, d3.max(data, d => d[yKey])])
      .nice()
      .range([innerHeight, 0]);

    // Add gridlines
    g.append('g')
      .attr('class', 'grid')
      .call(d3.axisLeft(yScale)
        .tickSize(-innerWidth)
        .tickFormat('')
      );

    // Add axes
    g.append('g')
      .attr('class', 'axis x-axis')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale))
      .selectAll('text')
      .style('text-anchor', 'end')
      .attr('dx', '-.8em')
      .attr('dy', '.15em')
      .attr('transform', 'rotate(-45)');

    g.append('g')
      .attr('class', 'axis y-axis')
      .call(d3.axisLeft(yScale));

    // Add axis labels
    g.append('text')
      .attr('class', 'axis-label')
      .attr('transform', 'rotate(-90)')
      .attr('y', 0 - margin.left)
      .attr('x', 0 - (innerHeight / 2))
      .attr('dy', '1em')
      .style('text-anchor', 'middle')
      .text(yLabel);

    g.append('text')
      .attr('class', 'axis-label')
      .attr('transform', `translate(${innerWidth / 2}, ${innerHeight + margin.bottom - 10})`)
      .style('text-anchor', 'middle')
      .text(xLabel);

    // Create tooltip
    const tooltip = d3.select(tooltipRef.current)
      .style('opacity', 0)
      .attr('class', 'tooltip')
      .style('position', 'absolute')
      .style('background-color', 'rgba(0, 0, 0, 0.8)')
      .style('color', 'white')
      .style('border-radius', '4px')
      .style('padding', '8px 12px')
      .style('font-size', '12px')
      .style('pointer-events', 'none');

    // Add bars
    const bars = g.selectAll('.bar')
      .data(data)
      .enter().append('rect')
      .attr('class', 'bar')
      .attr('x', d => xScale(d[xKey]))
      .attr('width', xScale.bandwidth())
      .attr('y', innerHeight)
      .attr('height', 0)
      .style('fill', color)
      .on('mouseover', function(event, d) {
        tooltip.transition().duration(200).style('opacity', .9);
        tooltip.html(`
          <strong>${d[xKey]}</strong><br/>
          ${yLabel}: ${typeof d[yKey] === 'number' ? d[yKey].toLocaleString() : d[yKey]}
        `)
        .style('left', (event.pageX + 10) + 'px')
        .style('top', (event.pageY - 28) + 'px');
      })
      .on('mouseout', function(d) {
        tooltip.transition().duration(500).style('opacity', 0);
      });

    if (animate) {
      bars.transition()
        .duration(1000)
        .ease(d3.easeElastic)
        .attr('y', d => yScale(d[yKey]))
        .attr('height', d => innerHeight - yScale(d[yKey]));
    } else {
      bars
        .attr('y', d => yScale(d[yKey]))
        .attr('height', d => innerHeight - yScale(d[yKey]));
    }

  }, [data, width, height, margin, xKey, yKey, xLabel, yLabel, color, animate]);

  return (
    <ChartContainer>
      <svg ref={svgRef}></svg>
      <div ref={tooltipRef}></div>
    </ChartContainer>
  );
};

export default BarChart;