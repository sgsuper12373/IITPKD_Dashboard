import axios from '../utils/cachedAxios';

const API_BASE_URL = `${import.meta.env.VITE_API_BASE_URL}/api/grievance`;

const authHeaders = (token) => ({
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const handleError = (error, defaultMessage) => {
  console.error(defaultMessage, error);
  if (error.response) {
    throw new Error(error.response.data.message || defaultMessage);
  }
  throw new Error('Network error. Please check if the backend server is running.');
};

export const fetchIgrcYearly = async (token) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/igrc/yearly`, authHeaders(token));
    return response.data;
  } catch (error) {
    handleError(error, 'Failed to fetch IGRC yearly data');
  }
};

export const fetchIgrcSummary = async (token) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/igrc/summary`, authHeaders(token));
    return response.data;
  } catch (error) {
    handleError(error, 'Failed to fetch IGRC summary data');
  }
};

export const fetchIccYearly = async (token) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/icc/yearly`, authHeaders(token));
    return response.data;
  } catch (error) {
    handleError(error, 'Failed to fetch ICC yearly data');
  }
};

export const fetchIccSummary = async (token) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/icc/summary`, authHeaders(token));
    return response.data;
  } catch (error) {
    handleError(error, 'Failed to fetch ICC summary data');
  }
};

