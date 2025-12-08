import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

// Create axios instance with default config
const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 30000, // 30 seconds timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for debugging
api.interceptors.request.use(
  (config) => {
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error('API Response Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// Financial API endpoints
export const financialAPI = {
  getTrajectories: (params = {}) => api.get('/financial/trajectories', { params }),
  getKPIs: (params = {}) => api.get('/summary/kpis', { params }),
};

// Business API endpoints
export const businessAPI = {
  getTrends: (params = {}) => api.get('/business/trends', { params }),
  getPerformance: (params = {}) => api.get('/business/performance', { params }),
  getRevenue: (params = {}) => api.get('/business/revenue', { params }),
  getPatterns: (params = {}) => api.get('/business/patterns', { params }),
};

// Employment API endpoints
export const employmentAPI = {
  getFlows: (params = {}) => api.get('/employment/flows', { params }),
  getHealth: (params = {}) => api.get('/employment/health', { params }),
  getTurnover: (params = {}) => api.get('/employment/turnover', { params }),
  getStability: (params = {}) => api.get('/employment/stability', { params }),
  getTrends: (params = {}) => api.get('/employment/trends', { params }),
};

// Summary API endpoints  
export const summaryAPI = {
  getKPIs: (params = {}) => api.get('/summary/kpis', { params }),
  getOverview: (params = {}) => api.get('/summary/overview', { params }),
};

// Generic data fetcher with error handling
export const fetchData = async (apiCall, defaultValue = []) => {
  try {
    const response = await apiCall;
    return response.data || defaultValue;
  } catch (error) {
    console.error('Data fetch error:', error);
    throw new Error(error.response?.data?.error || error.message || 'Failed to fetch data');
  }
};

export default api;