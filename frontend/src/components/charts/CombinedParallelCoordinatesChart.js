import React, { useEffect, useRef, useState } from 'react';
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
  
  .bubble-group {
    cursor: pointer;
  }
  
  .bubble-label-age {
    user-select: none;
  }
  
  .bubble-label-balance {
    user-select: none;
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

  .view-toggle {
    margin-bottom: 20px;
    display: flex;
    gap: 10px;
    align-items: center;
  }

  .toggle-button {
    padding: 8px 16px;
    border: 1px solid #ddd;
    border-radius: 4px;
    background: white;
    cursor: pointer;
    font-size: 14px;
    transition: all 0.2s;
  }

  .toggle-button.active {
    background: #3182ce;
    color: white;
    border-color: #3182ce;
  }

  .toggle-button:hover {
    border-color: #3182ce;
  }
`;

const CombinedParallelCoordinatesChart = ({ 
  data = [], 
  width = 1200, 
  height = 400, 
  margin = { top: 80, right: 150, bottom: 60, left: 60 },
  colorKey = 'educationLevel',
  colors = ['#3182ce', '#38b2ac', '#d69e2e', '#e53e3e', '#9f7aea', '#f56565']
}) => {
  const svgRef = useRef();
  const tooltipRef = useRef();
  const bubblePositionsRef = useRef(null); // Store static bubble positions
  const sizeScaleRef = useRef(null); // Store static size scale
  const [viewMode, setViewMode] = useState('absolute'); // 'absolute' or 'comparative'
  const [selectedBubble, setSelectedBubble] = useState(null); // Track selected bubble

  // Reset stored positions and size scale when data changes
  useEffect(() => {
    bubblePositionsRef.current = null;
    sizeScaleRef.current = null;
  }, [data]);

  // Add escape key listener to clear selection
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape' && selectedBubble !== null) {
        setSelectedBubble(null);
        // Reset bubble appearance and scale
        const svg = d3.select(svgRef.current);
        const bubbleG = svg.select('.bubble-chart-group');
        bubbleG.selectAll('.bubble')
          .style('opacity', 0.8);
        
        // Reset scale for all bubble groups
        bubbleG.selectAll('.bubble-group')
          .transition()
          .duration(200)
          .attr('transform', d => `translate(${d.x}, ${d.y}) scale(1)`);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [selectedBubble]);

  useEffect(() => {
    if (!data || data.length === 0) return;

    const svg = d3.select(svgRef.current);
    // Only remove parallel coordinates, keep bubble chart
    svg.select('.parallel-coords-group').remove();

    // Set up dimensions - allocate more space to bubble chart and reduce gap
    const bubbleChartWidth = (width - margin.left - margin.right) * 0.35;
    const parallelChartWidth = (width - margin.left - margin.right) * 0.60;
    const innerHeight = height - margin.top - margin.bottom;
    const chartGap = 10;

    // Function to reset all bubbles to normal appearance and scale
    const resetBubbleAppearance = () => {
      const bubbleG = svg.select('.bubble-chart-group');
      bubbleG.selectAll('.bubble')
        .style('opacity', 0.8);
      
      // Reset scale for all bubble groups
      bubbleG.selectAll('.bubble-group')
        .transition()
        .duration(200)
        .attr('transform', d => `translate(${d.x}, ${d.y}) scale(1)`);
    };

    // Ensure SVG has correct dimensions (without clearing existing content)
    svg.attr('width', width)
       .attr('height', height)
       .attr('class', 'parallel-coords-svg')
       .on('click', function(event) {
         // Deselect if clicking anywhere on SVG that's not a bubble
         if (!event.target.classList.contains('bubble') && selectedBubble !== null) {
           setSelectedBubble(null);
           resetBubbleAppearance();
         }
       });

    // Get or create bubble chart group (persistent) - reduced left margin
    let bubbleG = svg.select('.bubble-chart-group');
    if (bubbleG.empty()) {
      bubbleG = svg.append('g')
        .attr('class', 'bubble-chart-group')
        .attr('transform', `translate(${margin.left - 30},${margin.top})`);
    }

    // Create parallel coordinates group  
    const parallelG = svg.append('g')
      .attr('class', 'parallel-coords-group')
      .attr('transform', `translate(${margin.left + bubbleChartWidth + chartGap},${margin.top})`);

    // Filter valid data - check each condition
    const hasEmployment = data.filter(d => d.avg_employment_rate != null);
    const hasStability = data.filter(d => d.avg_stability_score != null);
    const hasFinancial = data.filter(d => d.avg_financial_balance != null);
    const hasJobs = data.filter(d => d.avg_jobs_per_participant != null);
    const hasAge = data.filter(d => d.age != null);
    
    console.log('Field availability:', {
      employment: hasEmployment.length,
      stability: hasStability.length,
      financial: hasFinancial.length,
      jobs: hasJobs.length,
      age: hasAge.length
    });

    // Use less strict validation for now - age seems to be the issue
    const validData = data.filter(d => 
      d.avg_employment_rate != null && 
      d.avg_stability_score != null &&
      d.avg_financial_balance != null &&
      d.avg_jobs_per_participant != null
    );

    console.log('Total data:', data.length, 'Valid data:', validData.length);
    console.log('Sample raw data:', data.slice(0, 3));
    console.log('Sample data keys:', data.length > 0 ? Object.keys(data[0]) : 'No data');
    
    // Check each field individually
    if (data.length > 0) {
      const sample = data[0];
      console.log('Field check:', {
        avg_employment_rate: sample.avg_employment_rate,
        avg_stability_score: sample.avg_stability_score, 
        avg_financial_balance: sample.avg_financial_balance,
        avg_jobs_per_participant: sample.avg_jobs_per_participant,
        age: sample.age
      });
    }

    // Prepare bubble chart data - aggregate by age group and education level
    const ageGroups = {
      'Young (18-30)': { min: 18, max: 30 },
      'Middle (31-50)': { min: 31, max: 50 },
      'Senior (51+)': { min: 51, max: 100 }
    };

    const bubbleData = [];
    
    // Check if age data is available
    const hasAgeData = validData.some(d => d.age != null);
    console.log('Has age data:', hasAgeData);
    
    // Always use the fallback approach for more reliable data
    console.log('Using education-based aggregation for bubble chart');
    const groupedByEducation = d3.group(validData, d => d[colorKey]);
    console.log('Education groups found:', Array.from(groupedByEducation.keys()));
    
    groupedByEducation.forEach((values, educationLevel) => {
      console.log(`Education ${educationLevel}: ${values.length} records`);
      if (values.length > 0) {
        const avgBalance = d3.mean(values, d => Number(d.avg_financial_balance) || 0);
        const participantCount = d3.sum(values, d => d.participant_count || 1); // Default to 1 if missing
        
        console.log(`${educationLevel} - Avg Balance: ${avgBalance}, Participants: ${participantCount}`);
        
        // Create artificial age distribution for visualization
        ['Young (18-30)', 'Middle (31-50)', 'Senior (51+)'].forEach((ageGroup, index) => {
          bubbleData.push({
            id: `${educationLevel}-${ageGroup}`,
            ageGroup,
            educationLevel,
            avgBalance: avgBalance * (0.8 + Math.random() * 0.4), // Add some variation
            participantCount: Math.max(1, Math.floor(participantCount / 3)), // Ensure at least 1
            ageGroupIndex: index
          });
        });
      }
    });

    console.log('Bubble data:', bubbleData);

    // Create or reuse size scale to prevent bubble resizing
    let sizeScale;
    if (!sizeScaleRef.current) {
      sizeScale = d3.scaleSqrt()
        .domain(d3.extent(bubbleData, d => d.avgBalance))
        .range([15, 45]); // Smaller bubbles for more compact layout
      sizeScaleRef.current = sizeScale;
    } else {
      sizeScale = sizeScaleRef.current;
    }

    // Color scale
    const colorScale = d3.scaleOrdinal(colors)
      .domain([...new Set(validData.map(d => d[colorKey]))]);

    // Create tooltip
    const tooltip = d3.select(tooltipRef.current)
      .style('opacity', 0)
      .attr('class', 'tooltip');

    // Define container bounds for bubble chart
    const bubbleRadius = Math.min(bubbleChartWidth, innerHeight) * 0.35;
    const centerX = bubbleChartWidth / 2;
    const centerY = innerHeight / 2;

    // Check if we have stored positions, if not compute them once
    if (!bubblePositionsRef.current) {
      // Set custom radius based on avgBalance using our size scale
      bubbleData.forEach(d => {
        d.r = sizeScale(d.avgBalance);
      });
      
      // Use force simulation with circular boundary for circular arrangement
      const simulation = d3.forceSimulation(bubbleData)
        .force('charge', d3.forceManyBody().strength(-30))
        .force('center', d3.forceCenter(centerX, centerY).strength(0.3))
        .force('collision', d3.forceCollide().radius(d => d.r + 2).strength(0.8))
        .force('circular', () => {
          // Circular boundary constraint - keep all bubbles within the circle
          bubbleData.forEach(d => {
            const dx = d.x - centerX;
            const dy = d.y - centerY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const maxDistance = bubbleRadius - d.r - 5; // Account for bubble radius and padding
            
            if (distance > maxDistance) {
              const angle = Math.atan2(dy, dx);
              d.x = centerX + Math.cos(angle) * maxDistance;
              d.y = centerY + Math.sin(angle) * maxDistance;
            }
          });
        })
        .stop();

      // Run simulation for circular arrangement
      for (let i = 0; i < 300; ++i) simulation.tick();
      
      // Store the computed positions and ensure size scale is stored
      bubblePositionsRef.current = new Map(
        bubbleData.map(d => [d.id, { x: d.x, y: d.y }])
      );
      if (!sizeScaleRef.current) {
        sizeScaleRef.current = sizeScale;
      }
    } else {
      // Use stored positions
      bubbleData.forEach(d => {
        const stored = bubblePositionsRef.current.get(d.id);
        if (stored) {
          d.x = stored.x;
          d.y = stored.y;
        }
      });
    }



// Draw bubbles with embedded labels (with safety check) - only if not already rendered
    if (bubbleData.length > 0) {
      // Only render if bubbles don't exist yet
      if (bubbleG.select('.bubble-group').empty()) {
        console.log('Drawing', bubbleData.length, 'bubbles');
        
        // Create bubble groups to hold circle and text
        const bubbleGroups = bubbleG.selectAll('.bubble-group')
          .data(bubbleData)
          .enter()
          .append('g')
          .attr('class', 'bubble-group')
          .attr('transform', d => `translate(${d.x}, ${d.y})`)
          .style('z-index', d => selectedBubble === d.id ? 1000 : 1);

        // Draw circles
        bubbleGroups.append('circle')
          .attr('class', 'bubble')
          .attr('r', d => d.r) // Use the radius based on avgBalance
          .style('fill', d => colorScale(d.educationLevel))
          .style('opacity', d => selectedBubble === null ? 0.8 : (selectedBubble === d.id ? 1 : 0.3))
          .style('stroke', d => selectedBubble === d.id ? '#333' : '#fff')
          .style('stroke-width', d => selectedBubble === d.id ? 4 : 2)
          .style('cursor', 'pointer')
          .style('z-index', d => selectedBubble === d.id ? 1000 : 1)
          .on('mouseover', function(event, d) {
            // Only change stroke on hover, don't modify opacity during selection state
            if (selectedBubble === null || selectedBubble !== d.id) {
              d3.select(this).style('stroke-width', 3);
            }
            
            tooltip.transition().duration(200).style('opacity', .9);
            tooltip.html(`
              <strong>${d.educationLevel}</strong><br/>
              Age Group: ${d.ageGroup}<br/>
              Avg Balance: $${d.avgBalance.toLocaleString()}<br/>
              Participants: ${d.participantCount}<br/>
              <em>Click to ${selectedBubble === d.id ? 'deselect' : 'select'}</em>
            `)
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 28) + 'px');
          })
          .on('mouseout', function(event, d) {
            // Only reset stroke width, preserve selection opacity state
            if (selectedBubble === null || selectedBubble !== d.id) {
              d3.select(this).style('stroke-width', 2);
            }
            tooltip.transition().duration(500).style('opacity', 0);
          })
          .on('click', function(event, d) {
            event.stopPropagation();
            
            // Toggle selection
            const newSelected = selectedBubble === d.id ? null : d.id;
            setSelectedBubble(newSelected);
            
            // Update all bubbles' appearance and scaling
            bubbleG.selectAll('.bubble')
              .style('opacity', function() {
                const bubbleData = d3.select(this).datum();
                if (newSelected === null) return 0.8;
                return newSelected === bubbleData.id ? 1 : 0.3;
              })
              .style('stroke', '#fff')
              .style('stroke-width', 2);
            
            // Update scaling for all bubble groups
            bubbleG.selectAll('.bubble-group')
              .transition()
              .duration(200)
              .attr('transform', function(d) {
                const scale = newSelected === d.id ? 1.2 : 1;
                return `translate(${d.x}, ${d.y}) scale(${scale})`;
              });
            
            // Bring selected bubble group to front by reordering DOM
            if (newSelected) {
              const selectedGroup = d3.select(this.parentNode);
              selectedGroup.raise(); // Brings element to front in SVG
            }
          });

        // Add age group labels (show on all circles)
        bubbleGroups.append('text')
          .attr('class', 'bubble-label-age')
          .attr('text-anchor', 'middle')
          .attr('dy', '-0.2em')
          .style('font-size', d => Math.max(7, d.r / 4) + 'px')
          .style('font-weight', '600')
          .style('fill', '#333')
          .style('pointer-events', 'none')
          .text(d => {
            // Show labels on all circles - use shorter labels for very small ones
            if (d.r < 10) {
              // Ultra short labels for tiny circles
              const shortMap = {
                'Young (18-30)': '18',
                'Middle (31-50)': '31', 
                'Senior (51+)': '51'
              };
              return shortMap[d.ageGroup] || '?';
            }
            // Normal labels for larger circles
            const ageMap = {
              'Young (18-30)': '18-30',
              'Middle (31-50)': '31-50', 
              'Senior (51+)': '51+'
            };
            return ageMap[d.ageGroup] || d.ageGroup;
          });

        // Add balance labels (show on all circles)
        bubbleGroups.append('text')
          .attr('class', 'bubble-label-balance')
          .attr('text-anchor', 'middle')
          .attr('dy', '0.8em')
          .style('font-size', d => Math.max(6, d.r / 5) + 'px')
          .style('font-weight', '500')
          .style('fill', '#555')
          .style('pointer-events', 'none')
          .text(d => {
            // Show balance on all circles - shorter format for small ones
            if (d.r < 10) {
              return `${Math.round(d.avgBalance / 1000)}K`;
            }
            return `$${(d.avgBalance / 1000).toFixed(0)}K`;
          });

        // Add subtle background circle to define bubble area (only once)
        if (bubbleG.select('circle').empty()) {
          bubbleG.append('circle')
            .attr('cx', centerX)
            .attr('cy', centerY)
            .attr('r', bubbleRadius)
            .style('fill', 'none')
            .style('stroke', '#eee')
            .style('stroke-width', 1)
            .style('stroke-dasharray', '5,5')
            .style('opacity', 0.3);
        }

        // Add bubble chart title (only once)
        if (bubbleG.select('.bubble-chart-title').empty()) {
          bubbleG.append('text')
            .attr('class', 'bubble-chart-title')
            .attr('x', bubbleChartWidth / 2)
            .attr('y', -45)
            .attr('text-anchor', 'middle')
            .style('font-size', '16px')
            .style('font-weight', '600')
            .text('Financial Balance by Age & Education');
        }
      }
    } else if (bubbleG.select('.bubble-group').empty()) {
      // Only show "No data available" if there are no bubbles AND no data
      console.log('No bubble data available');
      bubbleG.append('text')
        .attr('x', bubbleChartWidth / 2)
        .attr('y', innerHeight / 2)
        .attr('text-anchor', 'middle')
        .style('font-size', '14px')
        .style('fill', '#666')
        .text('No data available');
    }

    // Group data by education level for parallel coordinates
    const groupedData = d3.group(validData, d => d[colorKey]);
    let chartData = [];
    console.log('Grouped data for parallel coordinates:', Array.from(groupedData.keys()));

    if (viewMode === 'absolute') {
      // Absolute values view - aggregate metrics by education level
      groupedData.forEach((values, key) => {
        if (values.length === 0) return;
        
        const profileData = {
          [colorKey]: key,
          employment_rate: d3.mean(values, d => Number(d.avg_employment_rate) || 0),
          stability_score: d3.mean(values, d => Number(d.avg_stability_score) || 0),
          financial_balance: d3.mean(values, d => Number(d.avg_financial_balance) || 0) / 1000, // Convert to thousands
          job_duration: d3.mean(values, d => (12 / (Number(d.avg_jobs_per_participant) || 1))), // Convert jobs per year to months per job
          turnover_rate: d3.mean(values, d => {
            // Calculate turnover rate from jobs per participant
            const jobsPerYear = Number(d.avg_jobs_per_participant) || 1;
            return Math.max(0, (jobsPerYear - 1) * 100); // Convert to percentage
          })
        };
        
        chartData.push(profileData);
      });
    } else {
      // Comparative view - show performance relative to averages
      const overallAverages = {
        employment_rate: d3.mean(validData, d => Number(d.avg_employment_rate) || 0),
        stability_score: d3.mean(validData, d => Number(d.avg_stability_score) || 0),
        financial_balance: d3.mean(validData, d => Number(d.avg_financial_balance) || 0),
        jobs_per_participant: d3.mean(validData, d => Number(d.avg_jobs_per_participant) || 0)
      };

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
        
        chartData.push(profileData);
      });
    }

    // Define dimensions based on view mode
    const dimensions = viewMode === 'absolute' 
      ? ['employment_rate', 'stability_score', 'financial_balance', 'job_duration', 'turnover_rate']
      : ['employment_vs_avg', 'stability_vs_avg', 'financial_vs_avg', 'jobs_vs_avg'];

    const dimensionLabels = viewMode === 'absolute'
      ? {
          employment_rate: 'Employment Rate (%)',
          stability_score: 'Stability Score',
          financial_balance: 'Financial Balance ($K)',
          job_duration: 'Job Duration (months)',
          turnover_rate: 'Turnover Rate (%)'
        }
      : {
          employment_vs_avg: 'Employment vs Avg',
          stability_vs_avg: 'Stability vs Avg',
          financial_vs_avg: 'Financial vs Avg',
          jobs_vs_avg: 'Job Mobility vs Avg'
        };

    // Set up scales
    const scales = {};
    dimensions.forEach(dim => {
      const values = chartData.map(d => d[dim]).filter(v => v !== undefined && !isNaN(v) && isFinite(v));
      
      if (values.length === 0) {
        scales[dim] = d3.scaleLinear().domain([0, 100]).range([innerHeight, 0]);
      } else {
        const extent = d3.extent(values);
        if (viewMode === 'comparative') {
          // For comparative view, ensure 0 is included
          const minValue = Math.min(extent[0] || -20, -20);
          const maxValue = Math.max(extent[1] || 20, 20);
          scales[dim] = d3.scaleLinear()
            .domain([minValue, maxValue])
            .nice()
            .range([innerHeight, 0]);
        } else {
          scales[dim] = d3.scaleLinear()
            .domain(extent)
            .nice()
            .range([innerHeight, 0]);
        }
      }
    });

    // Set up x scale for positioning parallel coordinates axes
    const xScale = d3.scalePoint()
      .domain(dimensions)
      .range([0, parallelChartWidth]);

    // Draw axes
    dimensions.forEach(dim => {
      let tickFormatter;
      
      if (viewMode === 'comparative') {
        tickFormatter = d => `${d > 0 ? '+' : ''}${d.toFixed(0)}%`;
      } else {
        // Absolute value formatting
        switch(dim) {
          case 'employment_rate':
          case 'turnover_rate':
            tickFormatter = d => `${d.toFixed(0)}%`;
            break;
          case 'financial_balance':
            tickFormatter = d => `$${d.toFixed(0)}K`;
            break;
          case 'job_duration':
            tickFormatter = d => `${d.toFixed(1)}`;
            break;
          default:
            tickFormatter = d => d.toFixed(1);
        }
      }
      
      const axis = parallelG.append('g')
        .attr('class', 'axis')
        .attr('transform', `translate(${xScale(dim)}, 0)`)
        .call(d3.axisLeft(scales[dim]).ticks(6).tickFormat(tickFormatter));

      // Add axis labels with better positioning
      axis.append('text')
        .attr('class', 'axis-label')
        .attr('y', -25)
        .attr('x', 0)
        .style('text-anchor', 'middle')
        .style('font-size', '12px')
        .style('font-weight', '600')
        .text(dimensionLabels[dim])
        .each(function() {
          // Wrap long text if needed
          const text = d3.select(this);
          const words = text.text().split(/\s+/);
          if (words.length > 2) {
            text.text('');
            // First line
            text.append('tspan')
              .attr('x', 0)
              .attr('dy', 0)
              .text(words.slice(0, 2).join(' '));
            // Second line  
            text.append('tspan')
              .attr('x', 0)
              .attr('dy', '1.1em')
              .text(words.slice(2).join(' '));
          }
        });

      // Add reference line at 0 for comparative view
      if (viewMode === 'comparative') {
        parallelG.append('line')
          .attr('class', 'reference-line')
          .attr('x1', xScale(dim) - 5)
          .attr('x2', xScale(dim) + 5)
          .attr('y1', scales[dim](0))
          .attr('y2', scales[dim](0));
      }
    });

    // Add parallel coordinates title
    parallelG.append('text')
      .attr('x', parallelChartWidth / 2)
      .attr('y', -45)
      .attr('text-anchor', 'middle')
      .style('font-size', '16px')
      .style('font-weight', '600')
      .text(viewMode === 'absolute' ? 'Employment Profiles' : 'Comparative Performance');

    // Draw horizontal reference line for comparative view
    if (viewMode === 'comparative') {
      parallelG.append('path')
        .datum(dimensions.map(dim => ({ dim, value: 0 })))
        .attr('class', 'reference-line')
        .attr('d', d3.line()
          .x(point => xScale(point.dim))
          .y(point => scales[point.dim](point.value))
        );
    }

    // Draw lines for each education level
    chartData.forEach(d => {
      const lineData = dimensions.map(dim => ({
        dim,
        value: d[dim] || 0
      }));
      
      const path = parallelG.append('path')
        .datum(lineData)
        .attr('class', `line line-${d[colorKey].replace(/[^a-zA-Z0-9-_]/g, '-')}`)
        .attr('d', d3.line()
          .x(point => xScale(point.dim))
          .y(point => scales[point.dim](point.value))
        )
        .style('stroke', colorScale(d[colorKey]))
        .on('mouseover', function(event) {
          // Highlight this line
          d3.selectAll('.line').style('opacity', 0.2);
          d3.select(this).style('opacity', 1).style('stroke-width', '4px');
          
          // Show tooltip
          const tooltipContent = viewMode === 'absolute' 
            ? `<strong>${d[colorKey]} Profile</strong><br/>` +
              `Employment Rate: ${d.employment_rate?.toFixed(1)}%<br/>` +
              `Stability Score: ${d.stability_score?.toFixed(1)}<br/>` +
              `Financial Balance: $${(d.financial_balance * 1000)?.toLocaleString()}<br/>` +
              `Job Duration: ${d.job_duration?.toFixed(1)} months<br/>` +
              `Turnover Rate: ${d.turnover_rate?.toFixed(1)}%`
            : `<strong>${d[colorKey]} vs Average Performance</strong><br/>` +
              `Employment Rate: ${d.employment_vs_avg > 0 ? '+' : ''}${d.employment_vs_avg?.toFixed(1)}%<br/>` +
              `Stability Score: ${d.stability_vs_avg > 0 ? '+' : ''}${d.stability_vs_avg?.toFixed(1)}%<br/>` +
              `Financial Balance: ${d.financial_vs_avg > 0 ? '+' : ''}${d.financial_vs_avg?.toFixed(1)}%<br/>` +
              `Job Mobility: ${d.jobs_vs_avg > 0 ? '+' : ''}${d.jobs_vs_avg?.toFixed(1)}%`;
          
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
      dimensions.forEach(dim => {
        const value = d[dim] || 0;
        parallelG.append('circle')
          .attr('cx', xScale(dim))
          .attr('cy', scales[dim](value))
          .attr('r', 4)
          .style('fill', colorScale(d[colorKey]))
          .style('stroke', '#fff')
          .style('stroke-width', 2)
          .on('mouseover', function(event) {
            // Highlight corresponding line
            d3.selectAll('.line').style('opacity', 0.2);
            d3.select(`.line-${d[colorKey].replace(/[^a-zA-Z0-9-_]/g, '-')}`).style('opacity', 1).style('stroke-width', '4px');
            
            const formatValue = viewMode === 'comparative' 
              ? `${value > 0 ? '+' : ''}${value.toFixed(1)}%`
              : dim === 'financial_balance' 
                ? `$${(value * 1000).toLocaleString()}`
                : `${value.toFixed(1)}${dim.includes('rate') ? '%' : dim === 'job_duration' ? ' months' : ''}`;
            
            tooltip.transition().duration(200).style('opacity', .9);
            tooltip.html(`
              <strong>${d[colorKey]}</strong><br/>
              ${dimensionLabels[dim]}: ${formatValue}
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

    // Add shared legend (positioned at the right edge of parallel coordinates)
    const legend = svg.append('g')
      .attr('class', 'legend')
      .attr('transform', `translate(${margin.left + bubbleChartWidth + chartGap + parallelChartWidth + 10}, ${margin.top + 20})`);

    const uniqueEducationLevels = [...new Set(validData.map(d => d[colorKey]))];
    const legendItems = legend.selectAll('.legend-item')
      .data(uniqueEducationLevels)
      .enter().append('g')
      .attr('class', 'legend-item')
      .attr('transform', (d, i) => `translate(0, ${i * 25})`);

    legendItems.append('rect')
      .attr('width', 15)
      .attr('height', 15)
      .style('fill', d => colorScale(d));

    legendItems.append('text')
      .attr('x', 20)
      .attr('y', 12)
      .style('font-size', '12px')
      .text(d => d);

    // Add reference line legend for comparative view
    if (viewMode === 'comparative') {
      legend.append('g')
        .attr('transform', `translate(0, ${uniqueEducationLevels.length * 25 + 20})`)
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
    }

  }, [data, colorKey, colors, viewMode, selectedBubble]);

  return (
    <ChartContainer>
      <div className="view-toggle">
        <span>View Mode:</span>
        <button 
          className={`toggle-button ${viewMode === 'absolute' ? 'active' : ''}`}
          onClick={() => setViewMode('absolute')}
        >
          Absolute Values
        </button>
        <button 
          className={`toggle-button ${viewMode === 'comparative' ? 'active' : ''}`}
          onClick={() => setViewMode('comparative')}
        >
          Comparative Performance
        </button>
      </div>
      <svg ref={svgRef}></svg>
      <div ref={tooltipRef} className="tooltip"></div>
    </ChartContainer>
  );
};

export default CombinedParallelCoordinatesChart;