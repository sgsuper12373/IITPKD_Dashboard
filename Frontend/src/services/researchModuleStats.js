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
  if (error.response?.data?.message) {
    throw new Error(error.response.data.message);
  }
  throw new Error(defaultMessage);
};

export const fetchResearchFilterOptions = async (filters, token) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/filter-options${buildQuery(filters)}`, authHeaders(token));
    return response.data;
  } catch (error) {
    handleError(error, 'Failed to fetch research filters');
  }
};

export const fetchResearchSummary = async (filters, token) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/summary${buildQuery(filters)}`, authHeaders(token));
    return response.data;
  } catch (error) {
    handleError(error, 'Failed to fetch research summary');
  }
};

export const fetchFundedProjectTrend = async (filters, token) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/projects/trend${buildQuery(filters)}`, authHeaders(token));
    return response.data;
  } catch (error) {
    handleError(error, 'Failed to fetch funded project trend');
  }
};

export const fetchResearchProjects = async (filters, token) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/projects/list${buildQuery(filters)}`, authHeaders(token));
    return response.data?.data ?? [];
  } catch (error) {
    handleError(error, 'Failed to fetch project list');
  }
};

export const fetchConsultancyRevenueTrend = async (filters, token) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/consultancy/revenue-trend${buildQuery(filters)}`, authHeaders(token));
    return response.data ?? [];
  } catch (error) {
    handleError(error, 'Failed to fetch consultancy revenue trend');
  }
};

export const fetchMouList = async (filters, token) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/mous/list${buildQuery(filters)}`, authHeaders(token));
    return response.data?.data ?? [];
  } catch (error) {
    handleError(error, 'Failed to fetch MoU data');
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
    return response.data?.data ?? [];
  } catch (error) {
    handleError(error, 'Failed to fetch patent list');
  }
};

export const fetchExternshipSummary = async (filters, token) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/externships/summary${buildQuery(filters)}`, authHeaders(token));
    return response.data;
  } catch (error) {
    handleError(error, 'Failed to fetch externship summary');
  }
};

export const fetchExternshipList = async (filters, token) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/externships/list${buildQuery(filters)}`, authHeaders(token));
    return response.data?.data ?? [];
  } catch (error) {
    handleError(error, 'Failed to fetch externship list');
  }
};

export const fetchPublicationSummary = async (filters, token) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/publications/summary${buildQuery(filters)}`, authHeaders(token));
    return response.data;
  } catch (error) {
    handleError(error, 'Failed to fetch publication summary');
  }
};

export const fetchPublicationTrend = async (filters, token) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/publications/trend${buildQuery(filters)}`, authHeaders(token));
    return response.data?.data ?? [];
  } catch (error) {
    handleError(error, 'Failed to fetch publication trend');
  }
};

export const fetchPublicationByDepartment = async (filters, token) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/publications/department${buildQuery(filters)}`, authHeaders(token));
    return response.data?.data ?? [];
  } catch (error) {
    handleError(error, 'Failed to fetch department-wise publications');
  }
};

export const fetchPublicationTypeDistribution = async (filters, token) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/publications/type-distribution${buildQuery(filters)}`, authHeaders(token));
    return response.data?.data ?? [];
  } catch (error) {
    handleError(error, 'Failed to fetch publication type distribution');
  }
};

export const fetchPublicationList = async (filters, token) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/publications/list${buildQuery(filters)}`, authHeaders(token));
    return response.data?.data ?? [];
  } catch (error) {
    handleError(error, 'Failed to fetch publication list');
  }
};


