import axios from '../utils/cachedAxios';

const API_BASE_URL = `${import.meta.env.VITE_API_BASE_URL}/api/icsr-consultancy`;

const authHeaders = (token) => ({
  headers: {
    Authorization: `Bearer ${token}`,
  },
});

const handleError = (error, defaultMessage) => {
  console.error(defaultMessage, error);
  if (error.response) {
    throw new Error(error.response.data.error || error.response.data.message || defaultMessage);
  }
  throw new Error('Network error. Please verify the backend server is reachable.');
};

// All consultancy projects for the management page (admins / ICSR only).
export const fetchConsultancyProjects = async (token) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/`, authHeaders(token));
    return response.data;
  } catch (error) {
    handleError(error, 'Failed to fetch consultancy projects.');
  }
};

// Inline-create a single consultancy project.
export const createConsultancyProject = async (formData, token) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/`, formData, authHeaders(token));
    axios.clearByPrefix(API_BASE_URL);
    return response.data;
  } catch (error) {
    handleError(error, 'Failed to create consultancy project.');
  }
};

// Edit a single consultancy project's fields / industry / logo.
export const updateConsultancyProject = async (projectId, formData, token) => {
  try {
    const response = await axios.put(`${API_BASE_URL}/${projectId}`, formData, authHeaders(token));
    axios.clearByPrefix(API_BASE_URL); // drop cached list so the next fetch is fresh
    return response.data;
  } catch (error) {
    handleError(error, 'Failed to update consultancy project.');
  }
};
