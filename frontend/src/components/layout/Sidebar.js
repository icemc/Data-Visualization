import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import styled from 'styled-components';

const SidebarContainer = styled.nav`
  width: 280px;
  background: var(--bg-primary);
  border-right: 1px solid var(--border-color);
  box-shadow: var(--shadow-sm);
  padding: 2rem 0;
  display: flex;
  flex-direction: column;
`;

const Logo = styled.div`
  padding: 0 1.5rem 2rem;
  border-bottom: 1px solid var(--border-color);
  margin-bottom: 2rem;
`;

const LogoTitle = styled.h2`
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--primary-color);
  margin: 0;
`;

const LogoSubtitle = styled.p`
  font-size: 0.75rem;
  color: var(--text-muted);
  margin: 0.25rem 0 0;
`;

const NavSection = styled.div`
  padding: 0 1rem;
`;

const NavItem = styled(NavLink)`
  display: flex;
  align-items: center;
  padding: 0.75rem 1rem;
  margin: 0.25rem 0;
  border-radius: var(--radius-md);
  text-decoration: none;
  color: var(--text-secondary);
  font-weight: 500;
  transition: all 0.2s ease;

  &:hover {
    background: var(--bg-tertiary);
    color: var(--text-primary);
  }

  &.active {
    background: var(--primary-color);
    color: white;
  }

  .icon {
    margin-right: 0.75rem;
    width: 20px;
    height: 20px;
  }
`;

const SectionTitle = styled.h3`
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 1rem 1rem 0.5rem;
  margin: 0;
`;

const Sidebar = () => {
  const location = useLocation();

  return (
    <SidebarContainer>
      <Logo>
        <LogoTitle>Economic Analysis</LogoTitle>
        <LogoSubtitle>Interactive Dashboard</LogoSubtitle>
      </Logo>
      
      <NavSection>
        <SectionTitle>Main Views</SectionTitle>
        <NavItem 
          to="/" 
          className={location.pathname === '/' ? 'active' : ''}
        >
          <span className="icon">📊</span>
          Dashboard
        </NavItem>
        
        <SectionTitle>Analysis Modules</SectionTitle>
        <NavItem 
          to="/financial"
          className={location.pathname === '/financial' ? 'active' : ''}
        >
          <span className="icon">💰</span>
          Financial Health
        </NavItem>
        
        <NavItem 
          to="/business"
          className={location.pathname === '/business' ? 'active' : ''}
        >
          <span className="icon">🏢</span>
          Business Prosperity
        </NavItem>
        
        <NavItem 
          to="/employment"
          className={location.pathname === '/employment' ? 'active' : ''}
        >
          <span className="icon">👥</span>
          Employment Patterns
        </NavItem>
      </NavSection>
    </SidebarContainer>
  );
};

export default Sidebar;