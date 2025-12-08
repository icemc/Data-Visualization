import { createGlobalStyle } from 'styled-components';

export const GlobalStyle = createGlobalStyle`
  :root {
    --primary-color: #3182ce;
    --secondary-color: #2d3748;
    --accent-color: #38b2ac;
    --success-color: #38a169;
    --warning-color: #d69e2e;
    --error-color: #e53e3e;
    --bg-primary: #ffffff;
    --bg-secondary: #f7fafc;
    --bg-tertiary: #edf2f7;
    --text-primary: #1a202c;
    --text-secondary: #4a5568;
    --text-muted: #718096;
    --border-color: #e2e8f0;
    --shadow-sm: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
    --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
    --radius-sm: 0.25rem;
    --radius-md: 0.5rem;
    --radius-lg: 0.75rem;
  }

  .chart-container {
    background: var(--bg-primary);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-md);
    padding: 1.5rem;
    margin-bottom: 1.5rem;
  }

  .chart-title {
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 1rem;
  }

  .chart-subtitle {
    font-size: 0.875rem;
    color: var(--text-secondary);
    margin-bottom: 1.5rem;
  }

  .loading-spinner {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 300px;
    font-size: 0.875rem;
    color: var(--text-muted);
  }

  .error-message {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 300px;
    color: var(--error-color);
    font-size: 0.875rem;
  }
`;