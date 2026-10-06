import axios from '../utils/cachedAxios';

const API_BASE_URL = `${import.meta.env.VITE_API_BASE_URL}/api/nirf`;

// Read-only public endpoint (token optional). The token, when present, rides
// along exactly as in the other service modules; "Bearer null" is stripped by
// the global request interceptor in App.jsx.
const authHeaders = (token) => ({ headers: { Authorization: `Bearer ${token}` } });

export const fetchNirfMetrics = async (token) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/nirf_metrics`, authHeaders(token));
    return response.data;
  } catch (error) {
    console.error('Failed to fetch NIRF metrics', error);
    throw new Error('Failed to fetch NIRF metrics');
  }
};
