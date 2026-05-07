import axios from 'axios';

const API_BASE_URL = `${import.meta.env.VITE_API_BASE_URL}/api/innovation/iptif`;

const authHeaders = (token) => ({
  headers: {
    Authorization: `Bearer ${token}`
  }
});

const handleError = (error, defaultMessage) => {
  console.error(defaultMessage, error);
  if (error?.response?.data?.message) {
    throw new Error(error.response.data.message);
  }
  throw new Error(defaultMessage);
};

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

// Summary
export const fetchIptifSummary = async (token) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/summary`, authHeaders(token));
    return response.data;
  } catch (error) {
    handleError(error, 'Failed to fetch IPTIF summary');
  }
};

// Trends and Data Lists
export const fetchIptifProjects = async (filters, token) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/trends/projects${buildQuery(filters)}`, authHeaders(token));
    return response.data;
  } catch (error) {
    handleError(error, 'Failed to fetch IPTIF projects');
  }
};

export const fetchIptifPrograms = async (filters, token) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/trends/programs${buildQuery(filters)}`, authHeaders(token));
    return response.data;
  } catch (error) {
    handleError(error, 'Failed to fetch IPTIF programs');
  }
};

export const fetchIptifStartups = async (filters, token) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/trends/startups${buildQuery(filters)}`, authHeaders(token));
    return response.data;
  } catch (error) {
    handleError(error, 'Failed to fetch IPTIF startups');
  }
};

export const fetchIptifFacilities = async (filters, token) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/trends/facilities${buildQuery(filters)}`, authHeaders(token));
    return response.data;
  } catch (error) {
    handleError(error, 'Failed to fetch IPTIF facilities');
  }
};

// Filter Options
export const fetchIptifFilterOptions = async (filters, token) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/filter-options${buildQuery(filters)}`, authHeaders(token));
    return response.data;
  } catch (error) {
    handleError(error, 'Failed to fetch IPTIF filter options');
  }
};
