import axios from 'axios';

const API_BASE_URL = `${import.meta.env.VITE_API_BASE_URL}/api/innovation`;

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

export const fetchInnovationSummary = async (token) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/summary`, authHeaders(token));
    return response.data;
  } catch (error) {
    handleError(error, 'Failed to fetch innovation summary');
  }
};

export const fetchYearlyGrowth = async (token) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/yearly-growth`, authHeaders(token));
    return response.data;
  } catch (error) {
    handleError(error, 'Failed to fetch yearly growth data');
  }
};

export const fetchSectorDistribution = async (token) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/sector-distribution`, authHeaders(token));
    return response.data;
  } catch (error) {
    handleError(error, 'Failed to fetch sector distribution');
  }
};

export const fetchStartups = async (filters, page = 1, perPage = 50, token) => {
  try {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '' && value !== 'All') {
        params.append(key, value);
      }
    });
    params.append('page', page);
    params.append('per_page', perPage);
    
    const response = await axios.get(
      `${API_BASE_URL}/startups?${params.toString()}`,
      authHeaders(token)
    );
    return response.data;
  } catch (error) {
    handleError(error, 'Failed to fetch startups list');
  }
};

export const fetchFilterOptions = async (filters, token) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/filter-options${buildQuery(filters)}`, authHeaders(token));
    return response.data;
  } catch (error) {
    handleError(error, 'Failed to fetch filter options');
  }
};

