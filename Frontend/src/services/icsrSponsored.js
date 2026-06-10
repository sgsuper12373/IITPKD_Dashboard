import axios from '../utils/cachedAxios';

const API_BASE_URL = `${import.meta.env.VITE_API_BASE_URL}/api/icsr-sponsored`;

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

// All sponsored projects for the management page (admins / ICSR only).
export const fetchSponsoredProjects = async (token) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/`, authHeaders(token));
    return response.data;
  } catch (error) {
    handleError(error, 'Failed to fetch sponsored projects.');
  }
};

// Inline-create a single sponsored project.
export const createSponsoredProject = async (formData, token) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/`, formData, authHeaders(token));
    axios.clearByPrefix(API_BASE_URL);
    return response.data;
  } catch (error) {
    handleError(error, 'Failed to create sponsored project.');
  }
};

// Edit a single sponsored project's fields / industry / logo.
export const updateSponsoredProject = async (projectId, formData, token) => {
  try {
    const response = await axios.put(`${API_BASE_URL}/${projectId}`, formData, authHeaders(token));
    axios.clearByPrefix(API_BASE_URL); // drop cached list so the next fetch is fresh
    return response.data;
  } catch (error) {
    handleError(error, 'Failed to update sponsored project.');
  }
};
