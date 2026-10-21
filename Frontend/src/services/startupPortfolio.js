import axios from '../utils/cachedAxios';

const API_BASE_URL = `${import.meta.env.VITE_API_BASE_URL}/api/startup-portfolio`;

const authHeaders = (token) => ({
  headers: {
    Authorization: `Bearer ${token}`,
  },
});

const handleError = (error, defaultMessage) => {
  console.error(defaultMessage, error);
  if (error.response) {
    const data = error.response.data;
    // A non-JSON reply (HTML 404/500) has no message — surface the status so it's diagnosable.
    throw new Error(data?.error || data?.message || `${defaultMessage} (HTTP ${error.response.status})`);
  }
  throw new Error('Network error. Please verify the backend server is reachable.');
};

// Public list of published startups across both incubators.
export const fetchPortfolio = async (token) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/`, token ? authHeaders(token) : {});
    return response.data;
  } catch (error) {
    handleError(error, 'Failed to fetch startup portfolio.');
  }
};

// Admin list: all startups (published + unpublished) for the origins the caller may edit.
export const fetchManageList = async (token) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/manage`, authHeaders(token));
    return response.data;
  } catch (error) {
    handleError(error, 'Failed to fetch startups for management.');
  }
};

// Enrich a single startup's showcase fields / logo / publish state.
export const updateStartupShowcase = async (origin, id, formData, token) => {
  try {
    // IPTIF ids are free text from CSV upload: encode each segment but keep '/' literal
    // (Apache rejects an encoded %2F; the backend route accepts slashes).
    const idPath = String(id).split('/').map(encodeURIComponent).join('/');
    const response = await axios.put(`${API_BASE_URL}/${origin}/${idPath}`, formData, authHeaders(token));
    axios.clearByPrefix(API_BASE_URL); // drop cached lists so the next fetch is fresh
    return response.data;
  } catch (error) {
    handleError(error, 'Failed to update startup.');
  }
};
