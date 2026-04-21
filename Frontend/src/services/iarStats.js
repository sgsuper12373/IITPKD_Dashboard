import axios from 'axios';

const API_BASE_URL = `${import.meta.env.VITE_API_BASE_URL}/api/iar`;

const authHeaders = (token) => ({
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const buildQueryParams = (filters = {}) => {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '' && value !== 'All') {
      params.append(key, value);
    }
  });
  return params.toString();
};

const handleError = (error, defaultMessage) => {
  console.error(defaultMessage, error);
  if (error.response) {
    throw new Error(error.response.data.message || defaultMessage);
  }
  throw new Error('Network error. Please check if the backend server is running.');
};

export const fetchFilterOptions = async (token) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/filter-options`, authHeaders(token));
    return response.data;
  } catch (error) {
    handleError(error, 'Failed to fetch filter options');
  }
};

export const fetchSummary = async (filters, token) => {
  try {
    const query = buildQueryParams(filters);
    const response = await axios.get(`${API_BASE_URL}/summary?${query}`, authHeaders(token));
    return response.data;
  } catch (error) {
    handleError(error, 'Failed to fetch alumni summary');
  }
};

export const fetchStateDistribution = async (filters, token) => {
  try {
    const query = buildQueryParams(filters);
    const response = await axios.get(`${API_BASE_URL}/state-distribution?${query}`, authHeaders(token));
    return response.data;
  } catch (error) {
    handleError(error, 'Failed to fetch state distribution');
  }
};

export const fetchCountryDistribution = async (filters, token) => {
  try {
    const query = buildQueryParams(filters);
    const response = await axios.get(`${API_BASE_URL}/country-distribution?${query}`, authHeaders(token));
    return response.data;
  } catch (error) {
    handleError(error, 'Failed to fetch country distribution');
  }
};

export const fetchOutcomeBreakdown = async (filters, token) => {
  try {
    const query = buildQueryParams(filters);
    const response = await axios.get(`${API_BASE_URL}/outcome-breakdown?${query}`, authHeaders(token));
    return response.data;
  } catch (error) {
    handleError(error, 'Failed to fetch outcome breakdown');
  }
};

export const fetchIarMouFilterOptions = async (token) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/mous/filter-options`, authHeaders(token));
    return response.data;
  } catch (error) {
    handleError(error, 'Failed to fetch IAR MoU filter options');
  }
};

export const fetchIarMouTrend = async (token) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/mous/trend`, authHeaders(token));
    return response.data;
  } catch (error) {
    handleError(error, 'Failed to fetch IAR MoU trend');
  }
};

export const fetchIarMouList = async (filters, token) => {
  try {
    const query = buildQueryParams(filters);
    const response = await axios.get(`${API_BASE_URL}/mous/list?${query}`, authHeaders(token));
    return response.data;
  } catch (error) {
    handleError(error, 'Failed to fetch IAR MoU records');
  }
};


