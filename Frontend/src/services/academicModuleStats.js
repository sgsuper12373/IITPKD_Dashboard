import axios from '../utils/cachedAxios';

const API_BASE_URL = `${import.meta.env.VITE_API_BASE_URL}/api/academic-module`;

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

/**
 * Retrieves the available filter options (e.g. departments, programs).
 * @param {string} token - The auth token.
 * @returns {Promise<Object>} The filter options.
 */
export const fetchFilterOptions = async (token) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/filter-options`, authHeaders(token));
    return response.data;
  } catch (error) {
    handleError(error, 'Failed to fetch academic module filter options');
  }
};

/**
 * Retrieves top-level academic summary statistics.
 * @param {Object} filters - Active dashboard filters.
 * @param {string} token - The auth token.
 * @returns {Promise<Object>} The summary stats.
 */
export const fetchSummary = async (filters, token) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/summary${buildQuery(filters)}`, authHeaders(token));
    return response.data;
  } catch (error) {
    handleError(error, 'Failed to fetch academic summary');
  }
};

/**
 * Retrieves student counts aggregated by category (Gen, OBC, SC/ST, etc.).
 * @param {Object} filters - Active dashboard filters.
 * @param {string} token - The auth token.
 * @returns {Promise<Object>} Category breakdown.
 */
export const fetchCategoryBreakdown = async (filters, token) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/category-breakdown${buildQuery(filters)}`, authHeaders(token));
    return response.data;
  } catch (error) {
    handleError(error, 'Failed to fetch category breakdown');
  }
};

/**
 * Retrieves student counts aggregated by programme (BTech, MTech, PhD, etc.).
 * @param {Object} filters - Active dashboard filters.
 * @param {string} token - The auth token.
 * @returns {Promise<Object>} Programme breakdown.
 */
export const fetchProgrammeBreakdown = async (filters, token) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/programme-breakdown${buildQuery(filters)}`, authHeaders(token));
    return response.data;
  } catch (error) {
    handleError(error, 'Failed to fetch programme breakdown');
  }
};

/**
 * Retrieves a paginated list of courses.
 * @param {Object} filters - Active dashboard filters.
 * @param {string} search - Text search query.
 * @param {number} page - Result page.
 * @param {number} perPage - Items per page.
 * @param {string} token - The auth token.
 * @returns {Promise<Object>} Paginated courses.
 */
/**
 * Retrieves active/inactive counts for all courses and industry courses.
 * @param {string} token - The auth token.
 * @returns {Promise<Object>} Course counts.
 */
export const fetchCourseCounts = async (token) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/course-counts`, authHeaders(token));
    return response.data;
  } catch (error) {
    handleError(error, 'Failed to fetch course counts');
  }
};

export const fetchCourses = async (filters, search = '', page = 1, perPage = 20, token) => {
  try {
    const queryParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '' && value !== 'All') {
        queryParams.append(key, value);
      }
    });

    if (search) queryParams.append('search', search);
    queryParams.append('page', page);
    queryParams.append('per_page', perPage);

    const qs = queryParams.toString();
    const url = `${API_BASE_URL}/courses${qs ? `?${qs}` : ''}`;

    const response = await axios.get(url, authHeaders(token));
    return response.data;
  } catch (error) {
    handleError(error, 'Failed to fetch course list');
  }
};

