import axios from 'axios';

const API_BASE_URL = `${import.meta.env.VITE_API_BASE_URL}/api/research-module`;

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
  throw new Error('Network error. Please verify the backend server is reachable.');
};

export const fetchResearchFilterOptions = async (token) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/filter-options`, authHeaders(token));
    return response.data;
  } catch (error) {
    handleError(error, 'Failed to fetch research filter options');
  }
};

export const fetchIcsrSummary = async (filters, token) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/summary${buildQuery(filters)}`, authHeaders(token));
    return response.data;
  } catch (error) {
    handleError(error, 'Failed to fetch ICSR summary');
  }
};

export const fetchIcsrProjectTrend = async (filters, token) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/projects/trend${buildQuery(filters)}`, authHeaders(token));
    return response.data;
  } catch (error) {
    handleError(error, 'Failed to fetch funded project trend');
  }
};

export const fetchConsultancyTrend = async (filters, token) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/consultancy/revenue-trend${buildQuery(filters)}`, authHeaders(token));
    return response.data;
  } catch (error) {
    handleError(error, 'Failed to fetch consultancy revenue trend');
  }
};

export const fetchIcsrProjectList = async (filters, token) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/projects/list${buildQuery(filters)}`, authHeaders(token));
    return response.data;
  } catch (error) {
    handleError(error, 'Failed to fetch project records');
  }
};

export const fetchMouTrend = async (filters, token) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/mous/trend${buildQuery(filters)}`, authHeaders(token));
    return response.data;
  } catch (error) {
    handleError(error, 'Failed to fetch MoU trend');
  }
};

export const fetchMouList = async (filters, token) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/mous/list${buildQuery(filters)}`, authHeaders(token));
    return response.data;
  } catch (error) {
    handleError(error, 'Failed to fetch MoU records');
  }
};

export const fetchPatentStats = async (filters, token) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/patents/stats${buildQuery(filters)}`, authHeaders(token));
    return response.data;
  } catch (error) {
    handleError(error, 'Failed to fetch patent statistics');
  }
};

export const fetchPatentList = async (filters, token) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/patents/list${buildQuery(filters)}`, authHeaders(token));
    return response.data;
  } catch (error) {
    handleError(error, 'Failed to fetch patent records');
  }
};

export const fetchExternshipAnalytics = async (filters, token) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/externships/analytics${buildQuery(filters)}`, authHeaders(token));
    return response.data;
  } catch (error) {
    handleError(error, 'Failed to fetch externship analytics');
  }
};

export const fetchExternshipSummary = async (filters, token) => {
  // Deprecated: use fetchExternshipAnalytics instead
  return fetchExternshipAnalytics(filters, token);
};

export const fetchExternshipList = async (filters, token) => {
  // Deprecated: use fetchExternshipAnalytics instead
  return fetchExternshipAnalytics(filters, token);
};

export const fetchPublicationSummary = async (filters, token) => {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/publications/summary${buildQuery(filters)}`,
      authHeaders(token)
    );
    return response.data;
  } catch (error) {
    handleError(error, 'Failed to fetch publication summary');
  }
};

export const fetchPublicationTrend = async (filters, token) => {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/publications/trend${buildQuery(filters)}`,
      authHeaders(token)
    );
    return response.data;
  } catch (error) {
    handleError(error, 'Failed to fetch publication trend');
  }
};

export const fetchPublicationDepartmentBreakdown = async (filters, token) => {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/publications/department${buildQuery(filters)}`,
      authHeaders(token)
    );
    return response.data;
  } catch (error) {
    handleError(error, 'Failed to fetch department-wise publication stats');
  }
};

export const fetchPublicationTypeDistribution = async (filters, token) => {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/publications/type-distribution${buildQuery(filters)}`,
      authHeaders(token)
    );
    return response.data;
  } catch (error) {
    handleError(error, 'Failed to fetch publication type distribution');
  }
};

export const fetchPublicationList = async (filters, token) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/publications/list${buildQuery(filters)}`, authHeaders(token));
    return response.data;
  } catch (error) {
    handleError(error, 'Failed to fetch publication records');
  }
};

