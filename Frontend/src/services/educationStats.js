import axios from 'axios';

const API_BASE_URL = `${import.meta.env.VITE_API_BASE_URL}/api/education`;

const authHeaders = (token) => ({
  headers: {
    Authorization: `Bearer ${token}`
  }
});

const buildQuery = (filters = {}) => {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '' && value !== 'All') {
      params.append(key, value);
    }
  });
  const query = params.toString();
  return query ? `?${query}` : '';
};

const handleError = (error, defaultMessage) => {
  console.error(defaultMessage, error);
  if (error.response) {
    throw new Error(error.response.data.message || defaultMessage);
  }
  throw new Error('Network error. Please check if the backend server is running.');
};

export const fetchFilterOptions = async (filters, token) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/filter-options${buildQuery(filters)}`, authHeaders(token));
    return response.data;
  } catch (error) {
    handleError(error, 'Failed to fetch filter options');
  }
};

export const fetchSummary = async (filters, token) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/summary${buildQuery(filters)}`, authHeaders(token));
    return response.data;
  } catch (error) {
    handleError(error, 'Failed to fetch summary data');
  }
};

export const fetchDepartmentBreakdown = async (filters, token) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/department-breakdown${buildQuery(filters)}`, authHeaders(token));
    return response.data;
  } catch (error) {
    handleError(error, 'Failed to fetch department breakdown');
  }
};

export const fetchYearTrend = async (filters, token) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/year-trend${buildQuery(filters)}`, authHeaders(token));
    return response.data;
  } catch (error) {
    handleError(error, 'Failed to fetch year trend');
  }
};

export const fetchTypeDistribution = async (filters, token) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/type-distribution${buildQuery(filters)}`, authHeaders(token));
    return response.data;
  } catch (error) {
    handleError(error, 'Failed to fetch type distribution');
  }
};

export const fetchFacultyEngagementList = async (filters, token) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/list${buildQuery(filters)}`, authHeaders(token));
    return response.data;
  } catch (error) {
    handleError(error, 'Failed to fetch faculty engagement list');
  }
};

