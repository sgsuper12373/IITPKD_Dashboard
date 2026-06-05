import axios from '../utils/cachedAxios';

const API_BASE_URL = `${import.meta.env.VITE_API_BASE_URL}/api/iptif-facilities`;

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

export const fetchFacilities = async (token) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/`, authHeaders(token));
    return response.data;
  } catch (error) {
    handleError(error, 'Failed to fetch IPTIF facilities.');
  }
};

export const addFacility = async (formData, token) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/`, formData, authHeaders(token));
    axios.clearByPrefix(API_BASE_URL); // drop the cached list so the next fetch is fresh
    return response.data;
  } catch (error) {
    handleError(error, 'Failed to add facility.');
  }
};

export const updateFacility = async (id, formData, token) => {
  try {
    const response = await axios.put(`${API_BASE_URL}/${id}`, formData, authHeaders(token));
    axios.clearByPrefix(API_BASE_URL);
    return response.data;
  } catch (error) {
    handleError(error, 'Failed to update facility.');
  }
};

export const deleteFacility = async (id, token) => {
  try {
    const response = await axios.delete(`${API_BASE_URL}/${id}`, authHeaders(token));
    axios.clearByPrefix(API_BASE_URL);
    return response.data;
  } catch (error) {
    handleError(error, 'Failed to delete facility.');
  }
};
