import axios from '../utils/cachedAxios';

const API_BASE_URL = `${import.meta.env.VITE_API_BASE_URL}/api/industry-connect`;

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

/**
 * Retrieves the summary statistics for ICSR.
 * @param {Object} filters - Active dashboard filters.
 * @param {string} token - The user's auth token.
 * @returns {Promise<Object>} ICSR summary data.
 */
export const fetchIcsrSummary = async (filters, token) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/icsr/summary${buildQuery(filters)}`, authHeaders(token));
    return response.data;
  } catch (error) {
    handleError(error, 'Failed to fetch ICSR summary');
  }
};

export const fetchIcsrYearlyDistribution = async (filters, token) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/icsr/yearly-distribution${buildQuery(filters)}`, authHeaders(token));
    return response.data;
  } catch (error) {
    handleError(error, 'Failed to fetch ICSR yearly distribution');
  }
};

export const fetchIcsrEventTypes = async (filters, token) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/icsr/event-types${buildQuery(filters)}`, authHeaders(token));
    return response.data;
  } catch (error) {
    handleError(error, 'Failed to fetch ICSR event types');
  }
};

export const fetchIcsrEvents = async (filters, page = 1, perPage = 50, token) => {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/icsr/events${buildQuery(filters)}${buildQuery(filters) ? '&' : '?'}${(new URLSearchParams({page, per_page: perPage})).toString()}`,
      authHeaders(token)
    );
    return response.data;
  } catch (error) {
    handleError(error, 'Failed to fetch ICSR events list');
  }
};

export const fetchIcsrFilterOptions = async (filters, token) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/icsr/filter-options${buildQuery(filters)}`, authHeaders(token));
    return response.data;
  } catch (error) {
    handleError(error, 'Failed to fetch ICSR filter options');
  }
};

// Industry-Academia Conclave APIs
export const fetchConclaveSummary = async (token) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/conclave/summary`, authHeaders(token));
    return response.data;
  } catch (error) {
    handleError(error, 'Failed to fetch conclave summary');
  }
};

export const fetchConclaveList = async (token) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/conclave/list`, authHeaders(token));
    return response.data;
  } catch (error) {
    handleError(error, 'Failed to fetch conclave list');
  }
};

