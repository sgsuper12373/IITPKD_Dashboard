import axios from 'axios';

const API_BASE_URL = `${import.meta.env.VITE_API_BASE_URL}/api/academic`;

/**
 * Fetches filter options including distinct values for each filter field
 * and the latest year of admission.
 * @param {string} token - Authentication token
 * @returns {Promise<Object>} Filter options object
 */
export const fetchFilterOptions = async (token) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/stats/filter-options`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching filter options:', error);
    if (error.response) {
      throw new Error(error.response.data.message || 'Failed to fetch filter options');
    }
    throw new Error('Network error. Please check if the backend server is running.');
  }
};

/**
 * Fetches gender distribution data based on provided filters.
 * @param {Object} filters - Filter object with optional fields
 * @param {string} token - Authentication token
 * @returns {Promise<Object>} Gender distribution data with total and filters_applied
 */
export const fetchGenderDistributionFiltered = async (filters, token) => {
  try {
    const params = new URLSearchParams();

    Object.keys(filters).forEach(key => {
      const value = filters[key];
      if (value !== null && value !== undefined && value !== '') {
        if (key === 'pwd' && typeof value === 'boolean') {
          params.append(key, value.toString());
        } else if (key === 'yearofadmission' && value === 'All') {
          params.append(key, 'All');
        } else {
          params.append(key, value);
        }
      }
    });

    const response = await axios.get(
      `${API_BASE_URL}/stats/gender-distribution-filtered?${params.toString()}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching gender distribution:', error);
    if (error.response) {
      throw new Error(error.response.data.message || 'Failed to fetch gender distribution');
    }
    throw new Error('Network error. Please check if the backend server is running.');
  }
};

/**
 * Fetches student strength data grouped by program based on provided filters.
 * @param {Object} filters - Filter object
 * @param {string} token - Authentication token
 * @returns {Promise<Object>} Student strength data with total and filters_applied
 */
export const fetchStudentStrengthFiltered = async (filters, token) => {
  try {
    const params = new URLSearchParams();

    Object.keys(filters).forEach(key => {
      const value = filters[key];
      if (value !== null && value !== undefined && value !== '') {
        if (key === 'yearofadmission' && value === 'All') {
          params.append(key, 'All');
        } else {
          params.append(key, value);
        }
      }
    });

    const response = await axios.get(
      `${API_BASE_URL}/stats/student-strength?${params.toString()}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    // Log the response to see what data is coming back
    console.log('Student Strength API Response:', JSON.stringify(response.data, null, 2));
    
    return response.data;
  } catch (error) {
    console.error('Error fetching student strength:', error);
    if (error.response) {
      throw new Error(error.response.data.message || 'Failed to fetch student strength');
    }
    throw new Error('Network error. Please check if the backend server is running.');
  }
};

/**
 * Fetches gender distribution trends (grouped by year).
 * @param {Object} filters - Filter object
 * @param {string} token - Authentication token
 * @returns {Promise<Object>} Trend data
 */
export const fetchGenderTrends = async (filters, token) => {
  try {
    const params = new URLSearchParams();

    Object.keys(filters).forEach(key => {
      const value = filters[key];
      if (value !== null && value !== undefined && value !== '' && value !== 'All') {
        if (key === 'pwd' && typeof value === 'boolean') {
          params.append(key, value.toString());
        } else {
          params.append(key, value);
        }
      }
    });

    const response = await axios.get(
      `${API_BASE_URL}/stats/gender-trends?${params.toString()}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching gender trends:', error);
    if (error.response) {
      throw new Error(error.response.data.message || 'Failed to fetch gender trends');
    }
    throw new Error('Network error. Please check if the backend server is running.');
  }
};

/**
 * Fetches student strength by program trends (grouped by year).
 * @param {Object} filters - Filter object
 * @param {string} token - Authentication token
 * @returns {Promise<Object>} Trend data
 */
export const fetchProgramTrends = async (filters, token) => {
  try {
    const params = new URLSearchParams();

    Object.keys(filters).forEach(key => {
      const value = filters[key];
      if (value !== null && value !== undefined && value !== '' && value !== 'All') {
        params.append(key, value);
      }
    });

    const response = await axios.get(
      `${API_BASE_URL}/stats/program-trends?${params.toString()}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching program trends:', error);
    if (error.response) {
      throw new Error(error.response.data.message || 'Failed to fetch program trends');
    }
    throw new Error('Network error. Please check if the backend server is running.');
  }
};

/**
 * Fetches on-roll student counts broken down by program type.
 * UG       : BTech + (On Roll | Slow-Paced)
 * PG       : PG   + (On Roll | Slow-Paced)
 * Research : PHD  + (On Roll | Slow-Paced | Thesis Submitted | Viva Voce Completed)
 * Total    : sum of the three
 * @param {string} token - Authentication token
 * @returns {Promise<Object>} { total_onroll, ug_onroll, pg_onroll, research_onroll }
 */
export const fetchOnrollSummary = async (token) => {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/stats/onroll-summary`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching on-roll summary:', error);
    return { total_onroll: 0, ug_onroll: 0, pg_onroll: 0, research_onroll: 0 };
  }
};

/**
 * Fetches student summary counts (Total / UG / PG / Research) from the
 * academic_program_type column.
 * @param {number|null} year - Admission year to filter by (null = all years)
 * @param {string} token - Authentication token
 * @returns {Promise<Object>} { total_students, ug_total, pg_total, research_total }
 */
export const fetchCumulativeStudentSummary = async (year, token) => {
  try {
    const params = new URLSearchParams();
    if (year && year !== 'All') params.append('year', year);

    const response = await axios.get(
      `${API_BASE_URL}/stats/student-summary${params.toString() ? `?${params}` : ''}`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching student summary:', error);
    return { total_students: 0, ug_total: 0, pg_total: 0, research_total: 0 };
  }
};