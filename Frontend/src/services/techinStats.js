import axios from 'axios';

const BASE_URL = `${import.meta.env.VITE_API_BASE_URL}/api/innovation/techin`;

const getHeaders = (token) => ({
  headers: { Authorization: `Bearer ${token}` }
});

// Helper for building query strings from filter objects
const buildQuery = (filters) => {
  if (!filters) return '';
  const params = new URLSearchParams();
  Object.keys(filters).forEach(key => {
    if (filters[key] && filters[key] !== 'All') {
      params.append(key, filters[key]);
    }
  });
  const queryString = params.toString();
  return queryString ? `?${queryString}` : '';
};

// ===================
// TechIn API Endpoints
// ===================

export const fetchTechinSummary = async (token) => {
  try {
    const response = await axios.get(`${BASE_URL}/summary`, getHeaders(token));
    return response.data;
  } catch (error) {
    console.error('Error fetching TechIn summary:', error);
    throw new Error(error.response?.data?.message || 'Failed to fetch summary');
  }
};

export const fetchTechinPrograms = async (filters, token) => {
  try {
    const query = buildQuery(filters);
    const response = await axios.get(`${BASE_URL}/trends/programs${query}`, getHeaders(token));
    return response.data;
  } catch (error) {
    console.error('Error fetching TechIn programs data:', error);
    throw new Error(error.response?.data?.message || 'Failed to fetch programs data');
  }
};

export const fetchTechinSkillDev = async (filters, token) => {
  try {
    const query = buildQuery(filters);
    const response = await axios.get(`${BASE_URL}/trends/skill-dev${query}`, getHeaders(token));
    return response.data;
  } catch (error) {
    console.error('Error fetching TechIn skill dev data:', error);
    throw new Error(error.response?.data?.message || 'Failed to fetch skill development data');
  }
};

export const fetchTechinStartups = async (filters, token) => {
  try {
    const query = buildQuery(filters);
    const response = await axios.get(`${BASE_URL}/trends/startups${query}`, getHeaders(token));
    return response.data;
  } catch (error) {
    console.error('Error fetching TechIn startups data:', error);
    throw new Error(error.response?.data?.message || 'Failed to fetch startups data');
  }
};

export const fetchTechinFilterOptions = async (filters, token) => {
  try {
    const query = buildQuery(filters);
    const response = await axios.get(`${BASE_URL}/filter-options${query}`, getHeaders(token));
    return response.data;
  } catch (error) {
    console.error('Error fetching TechIn filter options:', error);
    throw new Error(error.response?.data?.message || 'Failed to fetch filter options');
  }
};
