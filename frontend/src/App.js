import React from 'react';
import { Routes, Route } from 'react-router-dom';
import styled from 'styled-components';
import Header from './components/layout/Header';
import Sidebar from './components/layout/Sidebar';
import Dashboard from './pages/Dashboard';
import FinancialAnalysis from './pages/FinancialAnalysis';
import BusinessAnalysis from './pages/BusinessAnalysis';
import EmploymentAnalysis from './pages/EmploymentAnalysis';

const AppContainer = styled.div`
  display: flex;
  min-height: 100vh;
  background-color: var(--bg-secondary);
`;

const MainContent = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
`;

const ContentArea = styled.main`
  flex: 1;
  padding: 2rem;
  overflow-y: auto;
`;

function App() {
  return (
    <AppContainer>
      <Sidebar />
      <MainContent>
        <Header />
        <ContentArea>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/financial" element={<FinancialAnalysis />} />
            <Route path="/business" element={<BusinessAnalysis />} />
            <Route path="/employment" element={<EmploymentAnalysis />} />
          </Routes>
        </ContentArea>
      </MainContent>
    </AppContainer>
  );
}

export default App;