import React, { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';
import styled from 'styled-components';

const MapContainer = styled.div`
  background: var(--bg-primary);
  border-radius: var(--radius-lg);
  padding: 1.5rem;
  box-shadow: var(--shadow-md);
`;

const MapTitle = styled.h3`
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 0.5rem;
`;

const MapSubtitle = styled.p`
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin-bottom: 1.5rem;
  line-height: 1.5;
`;

const MapControls = styled.div`
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
`;

const FilterButton = styled.button`
  padding: 0.5rem 1rem;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  background: ${props => props.active ? 'var(--primary-color)' : 'var(--bg-secondary)'};
  color: ${props => props.active ? 'white' : 'var(--text-primary)'};
  cursor: pointer;
  font-size: 0.875rem;
  transition: all 0.2s ease;

  &:hover {
    background: ${props => props.active ? 'var(--primary-color-dark)' : 'var(--primary-color)'};
    color: white;
    transform: translateY(-1px);
  }
`;

const LegendContainer = styled.div`
  display: flex;
  justify-content: center;
  gap: 2rem;
  margin-top: 1rem;
  flex-wrap: wrap;
`;

const LegendItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: var(--text-secondary);
`;

const LegendMarker = styled.div`
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: ${props => props.color};
  border: 2px solid white;
  box-shadow: 0 1px 3px rgba(0,0,0,0.3);
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
  max-width: 200px;

  &.show {
    opacity: 1;
  }
`;

const BusinessLocationMap = ({ 
  data = [], 
  width = 800, 
  height = 500,
  title = "Business Locations Map",
  subtitle = "Interactive map showing venue locations across the city"
}) => {
  const svgRef = useRef();
  const tooltipRef = useRef();
  const [activeFilters, setActiveFilters] = useState(new Set(['Restaurant', 'Pub', 'Workplace', 'School']));
  const [processedData, setProcessedData] = useState([]);

  // Generate location data - either from real data or mock
  const generateLocationData = (realData) => {
    if (realData && realData.length > 0) {
      // Process real venue data and generate locations based on type
      return realData.map((venue, index) => {
        let x, y;
        const type = venue.type;

        // Generate clustered locations based on venue type
        if (type === 'Restaurant') {
          x = 400 + Math.random() * 200; 
          y = 300 + Math.random() * 200;
        } else if (type === 'Pub') {
          x = 580 + Math.random() * 200;
          y = 180 + Math.random() * 150;
        } else if (type === 'Workplace') {
          x = Math.random() < 0.7 ? 200 + Math.random() * 300 : 700 + Math.random() * 250;
          y = Math.random() < 0.5 ? 100 + Math.random() * 250 : 450 + Math.random() * 200;
        } else {
          x = 150 + Math.random() * 700;
          y = 500 + Math.random() * 250;
        }

        return {
          id: venue.id,
          type: venue.type,
          name: venue.name,
          x: Math.max(50, Math.min(x, width - 50)),
          y: Math.max(50, Math.min(y, height - 50)),
          visits: venue.visits || 0,
          customers: venue.customers || 0,
          visitsPerCustomer: venue.visitsPerCustomer || 0,
          dailyVisitRate: venue.dailyVisitRate || 0,
          operationDays: venue.operationDays || 0,
        };
      });
    }

    // Generate mock data if no real data provided
    const venueTypes = ['Restaurant', 'Pub', 'Workplace', 'School'];
    const mockData = [];

    venueTypes.forEach(type => {
      const count = type === 'Restaurant' ? 15 : type === 'Pub' ? 8 : type === 'Workplace' ? 25 : 4;
      
      for (let i = 0; i < count; i++) {
        // Generate clustered locations based on venue type
        let x, y;
        if (type === 'Restaurant') {
          // Restaurants clustered in city center and entertainment district
          x = Math.random() < 0.6 ? 
            400 + Math.random() * 200 : // City center
            600 + Math.random() * 150;   // Entertainment district
          y = Math.random() < 0.6 ?
            300 + Math.random() * 200 :
            200 + Math.random() * 100;
        } else if (type === 'Pub') {
          // Pubs in entertainment district
          x = 580 + Math.random() * 200;
          y = 180 + Math.random() * 150;
        } else if (type === 'Workplace') {
          // Workplaces distributed across business districts
          x = Math.random() < 0.7 ? 
            200 + Math.random() * 300 : // Main business district
            700 + Math.random() * 250;  // Secondary business area
          y = Math.random() < 0.5 ?
            100 + Math.random() * 250 :
            450 + Math.random() * 200;
        } else {
          // Schools distributed across residential areas
          x = 150 + Math.random() * 700;
          y = 500 + Math.random() * 250;
        }

        mockData.push({
          id: `${type.toLowerCase()}_${i + 1}`,
          type,
          name: `${type} ${i + 1}`,
          x: Math.max(50, Math.min(x, width - 50)),
          y: Math.max(50, Math.min(y, height - 50)),
          visits: Math.floor(Math.random() * 500) + 50,
          revenue: Math.floor(Math.random() * 50000) + 5000,
          capacity: Math.floor(Math.random() * 100) + 20,
          rating: (Math.random() * 2 + 3).toFixed(1) // 3.0 to 5.0
        });
      }
    });

    return mockData;
  };

  useEffect(() => {
    setProcessedData(generateLocationData(data));
  }, [data, width, height]);

  useEffect(() => {
    if (!processedData.length) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const margin = { top: 20, right: 20, bottom: 20, left: 20 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const g = svg.append("g")
      .attr("transform", `translate(${margin.left}, ${margin.top})`);

    // Color scheme for different venue types
    const colorScale = d3.scaleOrdinal()
      .domain(['Restaurant', 'Pub', 'Workplace', 'School'])
      .range(['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4']);

    // Size scale based on visits
    const sizeScale = d3.scaleSqrt()
      .domain(d3.extent(processedData, d => d.visits || 100))
      .range([4, 12]);

    // Filter data based on active filters
    const filteredData = processedData.filter(d => activeFilters.has(d.type));

    // Add background grid
    const gridSize = 50;
    g.append("g")
      .attr("class", "grid-lines")
      .selectAll("line.horizontal")
      .data(d3.range(0, innerHeight, gridSize))
      .join("line")
      .attr("class", "horizontal")
      .attr("x1", 0)
      .attr("x2", innerWidth)
      .attr("y1", d => d)
      .attr("y2", d => d)
      .attr("stroke", "#f0f0f0")
      .attr("stroke-width", 0.5);

    g.append("g")
      .attr("class", "grid-lines")
      .selectAll("line.vertical")
      .data(d3.range(0, innerWidth, gridSize))
      .join("line")
      .attr("class", "vertical")
      .attr("x1", d => d)
      .attr("x2", d => d)
      .attr("y1", 0)
      .attr("y2", innerHeight)
      .attr("stroke", "#f0f0f0")
      .attr("stroke-width", 0.5);

    // Add neighborhood labels (simulated districts)
    const districts = [
      { name: "City Center", x: 500, y: 400 },
      { name: "Entertainment District", x: 650, y: 250 },
      { name: "Business District", x: 250, y: 200 },
      { name: "Residential Area", x: 400, y: 600 }
    ];

    g.selectAll(".district-label")
      .data(districts)
      .join("text")
      .attr("class", "district-label")
      .attr("x", d => d.x)
      .attr("y", d => d.y)
      .attr("text-anchor", "middle")
      .text(d => d.name)
      .style("font-size", "12px")
      .style("font-weight", "bold")
      .style("fill", "#999")
      .style("opacity", 0.7);

    // Add venue markers
    const venues = g.selectAll(".venue-marker")
      .data(filteredData)
      .join("circle")
      .attr("class", "venue-marker")
      .attr("cx", d => d.x)
      .attr("cy", d => d.y)
      .attr("r", d => sizeScale(d.visits || 100))
      .attr("fill", d => colorScale(d.type))
      .attr("stroke", "#fff")
      .attr("stroke-width", 2)
      .style("opacity", 0.8)
      .style("cursor", "pointer");

    // Add hover effects and tooltips
    venues
      .on("mouseover", function(event, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr("r", d => sizeScale(d.visits || 100) * 1.5)
          .style("opacity", 1)
          .attr("stroke-width", 3);

        const tooltip = d3.select(tooltipRef.current);
        tooltip.classed("show", true)
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 10) + "px")
          .html(`
            <div><strong>${d.name}</strong></div>
            <div>Type: ${d.type}</div>
            <div>Total Visits: ${(d.visits || 0).toLocaleString()}</div>
            <div>Unique Customers: ${(d.customers || 0).toLocaleString()}</div>
            <div>Visits per Customer: ${(d.visitsPerCustomer || 0).toFixed(1)}</div>
            <div>Daily Visit Rate: ${(d.dailyVisitRate || 0).toFixed(1)}</div>
            ${d.operationDays ? `<div>Operation Days: ${d.operationDays}</div>` : ''}
          `);
      })
      .on("mouseout", function(event, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr("r", d => sizeScale(d.visits || 100))
          .style("opacity", 0.8)
          .attr("stroke-width", 2);

        d3.select(tooltipRef.current).classed("show", false);
      })
      .on("click", function(event, d) {
        console.log("Clicked venue:", d);
        // Could add detailed view or navigation here
      });

    // Add zoom and pan behavior
    const zoom = d3.zoom()
      .scaleExtent([0.5, 3])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    svg.call(zoom);

  }, [processedData, activeFilters, width, height]);

  const handleFilterToggle = (venueType) => {
    setActiveFilters(prev => {
      const newFilters = new Set(prev);
      if (newFilters.has(venueType)) {
        newFilters.delete(venueType);
      } else {
        newFilters.add(venueType);
      }
      return newFilters;
    });
  };

  const venueTypes = ['Restaurant', 'Pub', 'Workplace', 'School'];
  const colorScale = d3.scaleOrdinal()
    .domain(venueTypes)
    .range(['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4']);

  return (
    <MapContainer>
      <MapTitle>{title}</MapTitle>
      <MapSubtitle>{subtitle}</MapSubtitle>
      
      <MapControls>
        {venueTypes.map(type => (
          <FilterButton
            key={type}
            active={activeFilters.has(type)}
            onClick={() => handleFilterToggle(type)}
          >
            {type}s ({processedData.filter(d => d.type === type).length})
          </FilterButton>
        ))}
      </MapControls>

      <div style={{ position: 'relative', border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden' }}>
        <svg ref={svgRef} width={width} height={height} style={{ background: '#f8fafb' }}></svg>
        <TooltipContainer ref={tooltipRef} />
      </div>

      <LegendContainer>
        {venueTypes.map(type => (
          <LegendItem key={type}>
            <LegendMarker color={colorScale(type)} />
            <span>{type}</span>
          </LegendItem>
        ))}
      </LegendContainer>
    </MapContainer>
  );
};

export default BusinessLocationMap;