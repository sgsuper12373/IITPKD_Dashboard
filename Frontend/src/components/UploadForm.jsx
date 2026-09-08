import { useState } from 'react';
import axios from 'axios';
import { parseCSVToRecords } from '../utils/csvParse';
import UploadErrorTable from './UploadErrorTable';
import './UploadForm.css';

// Kept in sync with UPDATABLE_TABLES in Backend/app/upload.py — this used to
// list stale/renamed table names (e.g. 'student', 'alumini', 'employee')
// that never matched the backend whitelist, so uploads for those tables
// always failed with a confusing "not allowed" error regardless of the CSV.
const tableOptions = [
  'department', 'alumni', 'employees', 'courses_table', 'student_table',
  'externship_info', 'igrs_yearwise', 'icc_yearwise', 'ewd_yearwise', 'faculty_engagement',
  'placement_summary', 'placement_companies', 'placement_packages',
  'icsr_sponsered_projects', 'icsr_consultancy_projects', 'icsr_csr',
  'research_mous', 'research_patents', 'research_publications',
  'innovation_projects', 'iptif_startup_table', 'iptif_program_table',
  'iptif_projects_table', 'iptif_facilities_table', 'techin_startup_table',
  'techin_program_table', 'techin_skill_development_program',
  'industry_events', 'industry_conclave', 'open_house',
  'uba_projects', 'uba_events', 'outreach', 'nptel_courses', 'nirf_ranking', 'iar_mous',
];

function formatServerError(data, fallbackText) {
  const message = data?.message || fallbackText;
  const details = data?.details;
  if (Array.isArray(details)) {
    return { text: message, tableErrors: details, truncated: !!data?.truncated };
  }
  if (details && typeof details === 'object') {
    if (data.error_type === 'missing_columns' && details.missing_in_csv) {
      return { text: `${message} Missing: ${details.missing_in_csv.join(', ')}.`, tableErrors: null, truncated: false };
    }
    if (data.error_type === 'extra_columns' && details.extra_in_csv) {
      return { text: `${message} Unexpected column(s): ${details.extra_in_csv.join(', ')}.`, tableErrors: null, truncated: false };
    }
  }
  return { text: message, tableErrors: null, truncated: false };
}

function UploadForm({ token, onLogout }) {
  const [selectedTable, setSelectedTable] = useState(tableOptions[0]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [tableErrors, setTableErrors] = useState(null);
  const [truncated, setTruncated] = useState(false);
  const [previewData, setPreviewData] = useState(null);

  const parseCSVPreview = (csvText) => {
    try {
      const { headers, records } = parseCSVToRecords(csvText);
      setPreviewData({ header: headers, rows: records.slice(0, 5) });
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
    setTableErrors(null);
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
    setTableErrors(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!selectedFile) {
      setMessage('Please select a CSV file to upload.');
      return;
    }

    setIsLoading(true);
    setMessage('');
    setTableErrors(null);

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
      if (error.response?.data) {
        let { text, tableErrors: errs, truncated: trunc } = formatServerError(error.response.data, 'An unknown error occurred.');
        if (error.response.status === 401) {
          text += " Your session may have expired. Please log out and log back in.";
        }
        setMessage(`Error: ${text}`);
        setTableErrors(errs);
        setTruncated(trunc);
      } else {
        setMessage(`Error: ${error.message || 'An unknown error occurred.'}`);
      }
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
                {previewData.rows.map((record, rowIndex) => (
                  <tr key={rowIndex}>
                    {previewData.header.map((col, cellIndex) => (
                      <td key={cellIndex}>{record[col]}</td>
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
      {tableErrors && <UploadErrorTable errors={tableErrors} truncated={truncated} />}
    </div>
  );
}

export default UploadForm;
