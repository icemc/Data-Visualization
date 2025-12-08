import React from 'react';
import styled from 'styled-components';

const HeaderContainer = styled.header`
  background: var(--bg-primary);
  border-bottom: 1px solid var(--border-color);
  padding: 1rem 2rem;
  box-shadow: var(--shadow-sm);
`;

const HeaderContent = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const Title = styled.h1`
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
`;

const Subtitle = styled.p`
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin: 0.25rem 0 0 0;
`;

const MetaInfo = styled.div`
  text-align: right;
  font-size: 0.75rem;
  color: var(--text-muted);
`;

const Header = () => {
  return (
    <HeaderContainer>
      <HeaderContent>
        <div>
          <Title>Economic Analysis Dashboard</Title>
          <Subtitle>VAST Challenge 2022 - Challenge 3</Subtitle>
        </div>
        <MetaInfo>
          <div>Data Period: March 2022 - May 2023</div>
          <div>113M+ Records • 1,011 Participants • 253 Employers</div>
        </MetaInfo>
      </HeaderContent>
    </HeaderContainer>
  );
};

export default Header;