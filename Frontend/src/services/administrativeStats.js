import axios from 'axios';

const API_BASE_URL = `${import.meta.env.VITE_API_BASE_URL}/api/administrative`;

/**
 * Fetches filter options including distinct values for each filter field.
 * @param {string} token - Authentication token
 * @returns {Promise<Object>} Filter options object
 */
export const fetchFilterOptions = async (token) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/stats/filter-options`, {
      headers: { 'Authorization': `Bearer ${token}` }
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
 * Fetches filter options scoped to active teaching faculty (non-Director).
 * Department, Designation, and Group only include values present in that subset.
 * @param {string} token - Authentication token
 * @returns {Promise<Object>} Filter options object
 */
export const fetchFacultyFilterOptions = async (token) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/stats/filter-options?faculty_only=true`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching faculty filter options:', error);
    if (error.response) {
      throw new Error(error.response.data.message || 'Failed to fetch faculty filter options');
    }
    throw new Error('Network error. Please check if the backend server is running.');
  }
};

/**
 * Fetches employee overview - department-wise breakdown by gender.
 * This is a simplified single-chart view combining all employee data.
 * @param {Object} filters - Filter object with optional fields
 * @param {string} token - Authentication token
 * @returns {Promise<Object>} Employee overview data with total
 */
export const fetchEmployeeOverview = async (filters, token) => {
  try {
    const params = new URLSearchParams();

    Object.keys(filters).forEach(key => {
      const value = filters[key];
      if (value !== null && value !== undefined && value !== '' && value !== 'All') {
        params.append(key, value);
      }
    });

    const response = await axios.get(
      `${API_BASE_URL}/stats/employee-overview?${params.toString()}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching employee overview:', error);
    if (error.response) {
      throw new Error(error.response.data.message || 'Failed to fetch employee overview data');
    }
    throw new Error('Network error. Please check if the backend server is running.');
  }
};

/**
 * Fetches faculty count by department and designation.
 * @param {Object} filters - Filter object with optional fields
 * @param {string} employeeType - 'Faculty', 'Staff', or 'All'
 * @param {string} token - Authentication token
 * @returns {Promise<Object>} Faculty data with total and filters_applied
 */
export const fetchFacultyByDepartmentDesignation = async (filters, employeeType, token) => {
  try {
    const params = new URLSearchParams();

    if (employeeType && employeeType !== 'All') {
      params.append('emp_type', employeeType);
    }

    Object.keys(filters).forEach(key => {
      const value = filters[key];
      if (value !== null && value !== undefined && value !== '') {
        params.append(key, value);
      }
    });

    const response = await axios.get(
      `${API_BASE_URL}/stats/faculty-by-department-designation?${params.toString()}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching faculty data:', error);
    if (error.response) {
      throw new Error(error.response.data.message || 'Failed to fetch faculty data');
    }
    throw new Error('Network error. Please check if the backend server is running.');
  }
};

/**
 * Fetches staff count (technical and administrative).
 * @param {Object} filters - Filter object with optional fields
 * @param {string} employeeType - 'Faculty', 'Staff', or 'All'
 * @param {string} token - Authentication token
 * @returns {Promise<Object>} Staff data with total and filters_applied
 */
export const fetchStaffCount = async (filters, employeeType, token) => {
  try {
    const params = new URLSearchParams();

    if (employeeType && employeeType !== 'All') {
      params.append('emp_type', employeeType);
    }

    Object.keys(filters).forEach(key => {
      const value = filters[key];
      if (value !== null && value !== undefined && value !== '') {
        params.append(key, value);
      }
    });

    const response = await axios.get(
      `${API_BASE_URL}/stats/staff-count?${params.toString()}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching staff data:', error);
    if (error.response) {
      throw new Error(error.response.data.message || 'Failed to fetch staff data');
    }
    throw new Error('Network error. Please check if the backend server is running.');
  }
};

/**
 * Fetches gender-wise distribution for faculty and staff.
 * @param {Object} filters - Filter object with optional fields
 * @param {string} employeeType - 'Faculty', 'Staff', or 'All'
 * @param {string} token - Authentication token
 * @returns {Promise<Object>} Gender distribution data with total
 */
export const fetchGenderDistribution = async (filters, employeeType, token) => {
  try {
    const params = new URLSearchParams();

    if (employeeType && employeeType !== 'All') {
      params.append('emp_type', employeeType);
    }

    Object.keys(filters).forEach(key => {
      const value = filters[key];
      if (value !== null && value !== undefined && value !== '') {
        params.append(key, value);
      }
    });

    const response = await axios.get(
      `${API_BASE_URL}/stats/gender-distribution?${params.toString()}`,
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
 * Fetches category-wise distribution for faculty and staff.
 * @param {Object} filters - Filter object with optional fields
 * @param {string} employeeType - 'Faculty', 'Staff', or 'All'
 * @param {string} token - Authentication token
 * @returns {Promise<Object>} Category distribution data with total
 */
export const fetchCategoryDistribution = async (filters, employeeType, token) => {
  try {
    const params = new URLSearchParams();

    if (employeeType && employeeType !== 'All') {
      params.append('emp_type', employeeType);
    }

    Object.keys(filters).forEach(key => {
      const value = filters[key];
      if (value !== null && value !== undefined && value !== '') {
        params.append(key, value);
      }
    });

    const response = await axios.get(
      `${API_BASE_URL}/stats/category-distribution?${params.toString()}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching category distribution:', error);
    if (error.response) {
      throw new Error(error.response.data.message || 'Failed to fetch category distribution');
    }
    throw new Error('Network error. Please check if the backend server is running.');
  }
};

/**
 * Fetches department-wise breakdown with gender and employee type.
 * @param {Object} filters - Filter object with optional fields
 * @param {string} employeeType - 'Faculty', 'Staff', or 'All'
 * @param {string} token - Authentication token
 * @returns {Promise<Object>} Department breakdown data with total
 */
export const fetchDepartmentBreakdown = async (filters, employeeType, token) => {
  try {
    const params = new URLSearchParams();

    if (employeeType && employeeType !== 'All') {
      params.append('emp_type', employeeType);
    }

    Object.keys(filters).forEach(key => {
      const value = filters[key];
      if (value !== null && value !== undefined && value !== '') {
        params.append(key, value);
      }
    });

    const response = await axios.get(
      `${API_BASE_URL}/stats/department-breakdown?${params.toString()}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching department breakdown:', error);
    if (error.response) {
      throw new Error(error.response.data.message || 'Failed to fetch department breakdown');
    }
    throw new Error('Network error. Please check if the backend server is running.');
  }
};

/**
 * Fetches total employee count grouped by year of joining.
 * @param {Object} filters - Filter object with optional fields
 * @param {string} token - Authentication token
 * @returns {Promise<Object>} Yearwise strength data with total
 */
export const fetchYearwiseStrength = async (filters, token) => {
  try {
    const params = new URLSearchParams();
    Object.keys(filters).forEach(key => {
      const value = filters[key];
      if (value !== null && value !== undefined && value !== '' && value !== 'All') {
        params.append(key, value);
      }
    });
    const response = await axios.get(
      `${API_BASE_URL}/stats/yearwise-strength?${params.toString()}`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching yearwise strength:', error);
    if (error.response) {
      throw new Error(error.response.data.message || 'Failed to fetch yearwise strength data');
    }
    throw new Error('Network error. Please check if the backend server is running.');
  }
};

/**
 * Fetches faculty expertise matrix — Teaching faculty (non-Director) who joined
 * in the current year, grouped by department.
 * @param {Object} filters - Optional filters: department, designation, gender, group_name, appointed_category
 * @param {string} token - Authentication token
 * @returns {Promise<Object>} { data: [{name, count}], total }
 */
export const fetchFacultyExpertiseMatrix = async (filters, token) => {
  try {
    const params = new URLSearchParams();
    Object.keys(filters).forEach(key => {
      const value = filters[key];
      if (value !== null && value !== undefined && value !== '' && value !== 'All') {
        params.append(key, value);
      }
    });
    const response = await axios.get(
      `${API_BASE_URL}/stats/faculty-expertise-matrix?${params.toString()}`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching faculty department wise count:', error);
    if (error.response) {
      throw new Error(error.response.data.message || 'Failed to fetch faculty department wise count');
    }
    throw new Error('Network error. Please check if the backend server is running.');
  }
};

/**
 * Fetches faculty gender distribution for the last five years.
 * @param {string} token - Authentication token
 * @returns {Promise<Object>} Array of year-wise gender counts
 */
export const fetchFacultyGenderLastFiveYears = async (token) => {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/stats/faculty-gender-last-five-years`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching faculty gender last five years:', error);
    if (error.response) {
      throw new Error(error.response.data.message || 'Failed to fetch faculty gender data');
    }
    throw new Error('Network error. Please check if the backend server is running.');
  }
};