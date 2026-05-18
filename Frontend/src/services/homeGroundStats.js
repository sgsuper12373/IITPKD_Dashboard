import axios from '../utils/cachedAxios';

const BASE_URL = `${import.meta.env.VITE_API_BASE_URL}/api/innovation/home-ground`;

const getHeaders = (token) => ({
  headers: { Authorization: `Bearer ${token}` }
});

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

export const fetchHomeGroundSummary = async (token) => {
  try {
    const response = await axios.get(`${BASE_URL}/summary`, getHeaders(token));
    return response.data;
  } catch (error) {
    console.error('Error fetching home ground summary:', error);
    throw new Error(error.response?.data?.message || 'Failed to fetch summary');
  }
};

export const fetchHomeGroundStartups = async (filters, token) => {
  try {
    const query = buildQuery(filters);
    const response = await axios.get(`${BASE_URL}/trends/startups${query}`, getHeaders(token));
    return response.data;
  } catch (error) {
    console.error('Error fetching home ground startups:', error);
    throw new Error(error.response?.data?.message || 'Failed to fetch startups data');
  }
};

export const fetchHomeGroundFilterOptions = async (token) => {
  try {
    const response = await axios.get(`${BASE_URL}/filter-options`, getHeaders(token));
    return response.data;
  } catch (error) {
    console.error('Error fetching home ground filter options:', error);
    throw new Error(error.response?.data?.message || 'Failed to fetch filter options');
  }
};
