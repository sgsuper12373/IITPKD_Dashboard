import axios from '../utils/cachedAxios';

const API_BASE_URL = `${import.meta.env.VITE_API_BASE_URL}/api`;

const handleError = (error, defaultMessage) => {
  console.error(defaultMessage, error);
  if (error.response) {
    throw new Error(error.response.data.message || defaultMessage);
  }
  throw new Error('Network error. Please verify the backend server is reachable.');
};

// Fetches the live column requirements (required/optional columns, accepted
// enum values, max lengths) for a table so the upload UI can build an
// accurate template and check a CSV before it's submitted — this is the
// same information /upload-csv itself enforces, straight from the DB.
export const fetchUploadSchema = async (tableName, token) => {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/upload-schema/${encodeURIComponent(tableName)}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  } catch (error) {
    handleError(error, `Failed to load column requirements for '${tableName}'.`);
  }
};
