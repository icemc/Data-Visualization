import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import styled from 'styled-components';

const ChartContainer = styled.div`
  .line-chart-svg {
    font-family: Arial, sans-serif;
  }
  
  .line {
    fill: none;
    stroke-width: 2px;
    cursor: pointer;
    transition: opacity 0.3s ease;
  }
  
  .line.faded {
    opacity: 0.15;
  }
  
  .line.active {
    opacity: 1;
    stroke-width: 3px;
  }
  
  .dot {
    stroke: #fff;
    stroke-width: 2px;
    cursor: pointer;
    transition: opacity 0.3s ease;
  }
  
  .dot:hover {
    r: 6;
  }
  
  .dot.faded {
    opacity: 0.15;
  }
  
  .axis-label {
    font-size: 12px;
    font-weight: 500;
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
  
  .legend-item.faded {
    opacity: 0.3;
  }
  
  .legend-item.active {
    font-weight: bold;
  }
`;

const LineChart = ({ 
  data = [], 
  width = 800, 
  height = 400, 
  margin = { top: 20, right: 120, bottom: 60, left: 80 },
  xKey = 'month',
  yKey = 'value',
  colorKey = 'category',
  xLabel = 'Month',
  yLabel = 'Value',
  colors = d3.schemeCategory10,
  showLegend = true,
  showDots = true,
  animate = true
}) => {
  const svgRef = useRef();
  const tooltipRef = useRef();
  const [selectedCategory, setSelectedCategory] = useState(null);

  // Handle escape key and outside clicks
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && selectedCategory) {
        setSelectedCategory(null);
      }
    };

    const handleClickOutside = (event) => {
      if (selectedCategory && svgRef.current && !svgRef.current.contains(event.target)) {
        // Check if click is outside the entire chart container
        const chartContainer = svgRef.current.closest('.chart-container');
        if (chartContainer && !chartContainer.contains(event.target)) {
          setSelectedCategory(null);
        }
      }
    };

    // Add event listeners
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('click', handleClickOutside);

    // Cleanup
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [selectedCategory]);

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
      .attr('class', 'line-chart-svg')
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Add invisible background for click detection
    g.append('rect')
      .attr('width', innerWidth)
      .attr('height', innerHeight)
      .attr('fill', 'transparent')
      .attr('cursor', 'default')
      .on('click', function() {
        if (selectedCategory) {
          setSelectedCategory(null);
        }
      });

    // Parse dates and group data
    const parseDate = d3.timeParse('%Y-%m');
    const formatDate = d3.timeFormat('%Y-%m');
    
    const processedData = data.map(d => ({
      ...d,
      [xKey]: parseDate(d[xKey]) || new Date(d[xKey])
    }));

    // Group data by color key (category)
    const groupedData = d3.group(processedData, d => d[colorKey]);
    
    // Set up scales
    const xScale = d3.scaleTime()
      .domain(d3.extent(processedData, d => d[xKey]))
      .range([0, innerWidth]);

    const yScale = d3.scaleLinear()
      .domain(d3.extent(processedData, d => d[yKey]))
      .nice()
      .range([innerHeight, 0]);

    const colorScale = d3.scaleOrdinal(colors)
      .domain([...groupedData.keys()]);

    // Create line generator
    const line = d3.line()
      .x(d => xScale(d[xKey]))
      .y(d => yScale(d[yKey]))
      .curve(d3.curveMonotoneX);

    // Add gridlines
    g.append('g')
      .attr('class', 'grid')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale)
        .tickSize(-innerHeight)
        .tickFormat('')
      );

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
      .call(d3.axisBottom(xScale)
        .tickFormat(d3.timeFormat('%Y-%m'))
      )
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

    // Helper function to create valid CSS class names
    const sanitizeClassName = (str) => {
      return str.replace(/[^a-zA-Z0-9-_]/g, '-').replace(/-+/g, '-');
    };

    // Draw lines for each category
    groupedData.forEach((values, key) => {
      const sortedValues = values.sort((a, b) => a[xKey] - b[xKey]);
      const sanitizedKey = sanitizeClassName(key);
      
      // Draw line
      const path = g.append('path')
        .datum(sortedValues)
        .attr('class', `line line-${sanitizedKey}`)
        .attr('d', line)
        .style('stroke', colorScale(key))
        .on('click', function(event) {
          event.stopPropagation(); // Prevent background click
          // Toggle selection
          if (selectedCategory === key) {
            setSelectedCategory(null); // Deselect if already selected
          } else {
            setSelectedCategory(key); // Select this category
          }
        });

      if (animate) {
        const totalLength = path.node().getTotalLength();
        path
          .attr('stroke-dasharray', totalLength + ' ' + totalLength)
          .attr('stroke-dashoffset', totalLength)
          .transition()
          .duration(1500)
          .ease(d3.easeLinear)
          .attr('stroke-dashoffset', 0);
      }

      // Add dots
      if (showDots) {
        g.selectAll(`.dot-${sanitizedKey}`)
          .data(sortedValues)
          .enter().append('circle')
          .attr('class', `dot dot-${sanitizedKey}`)
          .attr('cx', d => xScale(d[xKey]))
          .attr('cy', d => yScale(d[yKey]))
          .attr('r', 4)
          .style('fill', colorScale(key))
          .on('mouseover', function(event, d) {
            tooltip.transition().duration(200).style('opacity', .9);
            tooltip.html(`
              <strong>${key}</strong><br/>
              ${xLabel}: ${formatDate(d[xKey])}<br/>
              ${yLabel}: ${typeof d[yKey] === 'number' ? d[yKey].toLocaleString() : d[yKey]}
            `)
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 28) + 'px');
          })
          .on('mouseout', function(d) {
            tooltip.transition().duration(500).style('opacity', 0);
          });
      }
    });

    // Add legend
    if (showLegend) {
      const legend = g.append('g')
        .attr('class', 'legend')
        .attr('transform', `translate(${innerWidth + 20}, 20)`);

      const legendItems = legend.selectAll('.legend-item')
        .data([...groupedData.keys()])
        .enter().append('g')
        .attr('class', 'legend-item')
        .attr('transform', (d, i) => `translate(0, ${i * 20})`)
        .on('click', function(event, d) {
          event.stopPropagation(); // Prevent background click
          // Toggle selection
          if (selectedCategory === d) {
            setSelectedCategory(null); // Deselect if already selected
          } else {
            setSelectedCategory(d); // Select this category
          }
        });

      legendItems.append('rect')
        .attr('width', 12)
        .attr('height', 12)
        .style('fill', colorScale);

      legendItems.append('text')
        .attr('x', 18)
        .attr('y', 9)
        .attr('dy', '0.35em')
        .style('font-size', '12px')
        .text(d => d);
    }

  }, [data, width, height, margin, xKey, yKey, colorKey, xLabel, yLabel, colors, showLegend, showDots, animate]);

  // Handle selection styling
  useEffect(() => {
    const svg = d3.select(svgRef.current);
    const sanitizeClassName = (str) => {
      return str.replace(/[^a-zA-Z0-9-_]/g, '-').replace(/-+/g, '-');
    };
    
    if (selectedCategory) {
      const selectedSanitized = sanitizeClassName(selectedCategory);
      
      // Fade out all lines except selected one
      svg.selectAll('.line')
        .classed('faded', function() {
          const className = d3.select(this).attr('class');
          return !className.includes(`line-${selectedSanitized}`);
        })
        .classed('active', function() {
          const className = d3.select(this).attr('class');
          return className.includes(`line-${selectedSanitized}`);
        });

      // Fade out dots for unselected categories
      svg.selectAll('.dot')
        .classed('faded', function() {
          const className = d3.select(this).attr('class');
          return !className.includes(`dot-${selectedSanitized}`);
        });

      // Update legend items
      svg.selectAll('.legend-item')
        .classed('faded', function(d) {
          return d !== selectedCategory;
        })
        .classed('active', function(d) {
          return d === selectedCategory;
        });
    } else {
      // Reset all styling
      svg.selectAll('.line')
        .classed('faded', false)
        .classed('active', false);
      
      svg.selectAll('.dot')
        .classed('faded', false);
      
      svg.selectAll('.legend-item')
        .classed('faded', false)
        .classed('active', false);
    }
  }, [selectedCategory]);

  return (
    <ChartContainer>
      <svg ref={svgRef}></svg>
      <div ref={tooltipRef}></div>
    </ChartContainer>
  );
};

export default LineChart;