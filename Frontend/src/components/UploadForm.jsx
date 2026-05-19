import { useState } from 'react';
import axios from 'axios';
import './UploadForm.css';

const tableOptions = [
  'student',
  'course',
  'department',
  'alumni',
  'alumini',
  'designation',
  'employee',
  'employment_history',
  'additional_roles',
  'externship_info',
  'igrs_yearwise',
  'icc_yearwise',
  'ewd_yearwise',
  'faculty_engagement',
  'placement_summary',
  'placement_companies',
  'placement_packages',
  'industry_courses',
  'academic_program_launch',
  'research_projects',
  'research_mous',
  'research_patents',
  'research_publications',
  'startups',
  'innovation_projects',
  'industry_events',
  'industry_conclave',
  'open_house',
  'nptel_local_chapters',
  'nptel_courses',
  'nptel_enrollments',
  'uba_projects',
  'uba_events'
];

function UploadForm({ token, onLogout }) {
  const [selectedTable, setSelectedTable] = useState(tableOptions[0]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [previewData, setPreviewData] = useState(null);

  const parseCSVPreview = (csvText) => {
    try {
      const lines = csvText.trim().split('\n');
      const header = lines[0].split(',');
      const rows = lines.slice(1, 6)
        .filter(line => line)
        .map(line => line.split(','));
      setPreviewData({ header, rows });
    } catch (e) {
      console.error("Failed to parse CSV preview:", e);
      setMessage('Error: Could not parse CSV for preview.');
      setPreviewData(null);
    }
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    setSelectedFile(file);
    setMessage('');
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => parseCSVPreview(e.target.result);
      reader.readAsText(file);
    } else {
      setPreviewData(null);
    }
  };

  const handleTableChange = (event) => {
    setSelectedTable(event.target.value);
    setMessage('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!selectedFile) {
      setMessage('Please select a CSV file to upload.');
      return;
    }

    setIsLoading(true);
    setMessage('');

    const formData = new FormData();
    formData.append('table_name', selectedTable);
    formData.append('csv_file', selectedFile);

    if (!token) {
      setMessage('Error: No authentication token found. Please log in again.');
      setIsLoading(false);
      return;
    }

    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/api/upload-csv`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          },
        }
      );

      setMessage(`Success: ${response.data.message}`);
      setSelectedFile(null);
      setPreviewData(null);
      event.target.reset();

    } catch (error) {
      let errorMessage = 'An unknown error occurred.';
      if (error.response) {
        errorMessage = error.response.data.message;
        if (error.response.status === 401) {
           errorMessage += " Your session may have expired. Please log out and log back in.";
        }
        if (error.response.data.details) {
          // details appended server-side
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      setMessage(`Error: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="card">
      <div className="uf-header">
        <h2>Update Database from CSV</h2>
        <button onClick={onLogout} className="uf-logout-btn">
          Logout
        </button>
      </div>
      <p>Select a table, upload a CSV file, and preview it before updating.</p>

      <form onSubmit={handleSubmit} className="uf-form">
        <div>
          <label htmlFor="table-select" className="uf-label">
            Table to Update:
          </label>
          <select
            id="table-select"
            value={selectedTable}
            onChange={handleTableChange}
            disabled={isLoading}
            className="uf-select"
          >
            {tableOptions.map((table) => (
              <option key={table} value={table}>
                {table}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="file-input" className="uf-label">
            Upload CSV File:
          </label>
          <input
            id="file-input"
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            disabled={isLoading}
          />
        </div>

        {previewData && (
          <div className="csv-preview">
            <h4>CSV Preview (First 5 Rows)</h4>
            <table className="uf-preview-table">
              <thead>
                <tr>
                  {previewData.header.map((col, index) => (
                    <th key={index}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewData.rows.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {row.map((cell, cellIndex) => (
                      <td key={cellIndex}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <button
          type="submit"
          disabled={!selectedFile || isLoading}
        >
          {isLoading ? 'Uploading...' : 'Upload and Update'}
        </button>
      </form>

      {message && (
        <p className={`uf-msg ${message.startsWith('Error') ? 'uf-msg--error' : 'uf-msg--success'}`}>
          {message}
        </p>
      )}
    </div>
  );
}

export default UploadForm;
