import axios from '../utils/cachedAxios';

const API_BASE_URL = `${import.meta.env.VITE_API_BASE_URL}/api/placement`;

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
  if (error?.response?.data?.message) {
    throw new Error(error.response.data.message);
  }
  if (error?.response?.data?.error) {
    throw new Error(error.response.data.error);
  }
  throw new Error(defaultMessage);
};

export const fetchPlacementFilterOptions = async (filters, token) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/filter-options${buildQuery(filters)}`, authHeaders(token));
    return response.data;
  } catch (error) {
    handleError(error, 'Failed to fetch placement filter options');
  }
};

export const fetchPlacementSummary = async (filters, token) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/summary${buildQuery(filters)}`, authHeaders(token));
    return response.data;
  } catch (error) {
    handleError(error, 'Failed to fetch placement summary');
  }
};

export const fetchPlacementTrend = async (filters, token) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/percentage-trend${buildQuery(filters)}`, authHeaders(token));
    return response.data;
  } catch (error) {
    handleError(error, 'Failed to fetch placement percentage trend');
  }
};

export const fetchPlacementGenderBreakdown = async (filters, token) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/gender-breakdown${buildQuery(filters)}`, authHeaders(token));
    return response.data;
  } catch (error) {
    handleError(error, 'Failed to fetch placement gender breakdown');
  }
};

export const fetchPlacementProgramStatus = async (filters, token) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/program-status${buildQuery(filters)}`, authHeaders(token));
    return response.data;
  } catch (error) {
    handleError(error, 'Failed to fetch program-wise placement status');
  }
};

export const fetchPlacementRecruiters = async (filters, token) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/recruiters${buildQuery(filters)}`, authHeaders(token));
    return response.data;
  } catch (error) {
    handleError(error, 'Failed to fetch recruiter statistics');
  }
};

export const fetchPlacementSectorDistribution = async (filters, token) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/sector-distribution${buildQuery(filters)}`, authHeaders(token));
    return response.data;
  } catch (error) {
    handleError(error, 'Failed to fetch sector distribution');
  }
};

export const fetchPlacementPackageTrend = async (filters, token) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/package-trend${buildQuery(filters)}`, authHeaders(token));
    return response.data;
  } catch (error) {
    handleError(error, 'Failed to fetch placement package trend');
  }
};

export const fetchTopRecruiters = async (filters, token) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/top-recruiters${buildQuery(filters)}`, authHeaders(token));
    return response.data;
  } catch (error) {
    handleError(error, 'Failed to fetch top recruiters');
  }
};
