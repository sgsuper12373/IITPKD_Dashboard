import axios from '../utils/cachedAxios';

const API_BASE_URL = `${import.meta.env.VITE_API_BASE_URL}/api/last-updated`;

export const fetchAllLastUpdated = async () => {
  const response = await axios.get(`${API_BASE_URL}/`);
  return response.data.tables; // { tableName: isoString | null, ... }
};

export const fetchTableLastUpdated = async (tableName) => {
  const response = await axios.get(`${API_BASE_URL}/${tableName}`);
  return response.data; // { table, last_updated }
};
