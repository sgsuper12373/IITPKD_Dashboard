import axios from '../utils/cachedAxios';

const API_BASE_URL = `${import.meta.env.VITE_API_BASE_URL}/api/mou-partners`;

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

export const fetchMouPartners = async (token) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/`, authHeaders(token));
    return response.data;
  } catch (error) {
    handleError(error, 'Failed to fetch MOU partners.');
  }
};

export const addMouPartner = async (formData, token) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/`, formData, authHeaders(token));
    return response.data;
  } catch (error) {
    handleError(error, 'Failed to add MOU partner.');
  }
};

export const updateMouPartner = async (id, formData, token) => {
  try {
    const response = await axios.put(`${API_BASE_URL}/${id}`, formData, authHeaders(token));
    return response.data;
  } catch (error) {
    handleError(error, 'Failed to update MOU partner.');
  }
};

export const deleteMouPartner = async (id, token) => {
  try {
    const response = await axios.delete(`${API_BASE_URL}/${id}`, authHeaders(token));
    return response.data;
  } catch (error) {
    handleError(error, 'Failed to delete MOU partner.');
  }
};

export const reorderMouPartners = async (items, token) => {
  try {
    const response = await axios.put(`${API_BASE_URL}/reorder`, { items }, authHeaders(token));
    return response.data;
  } catch (error) {
    handleError(error, 'Failed to reorder MOU partners.');
  }
};
