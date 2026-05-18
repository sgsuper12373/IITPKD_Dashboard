import axios from '../utils/cachedAxios';

const API_BASE_URL = `${import.meta.env.VITE_API_BASE_URL}/api/ewd`;

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

export const fetchEwdYearly = async (token) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/yearly`, authHeaders(token));
    return response.data;
  } catch (error) {
    handleError(error, 'Failed to fetch EWD yearly data');
  }
};

export const fetchEwdSummary = async (token) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/summary`, authHeaders(token));
    return response.data;
  } catch (error) {
    handleError(error, 'Failed to fetch EWD summary data');
  }
};

