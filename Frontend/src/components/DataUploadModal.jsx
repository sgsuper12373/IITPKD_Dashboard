import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import cachedAxios from '../utils/cachedAxios';
import { fetchUploadSchema } from '../services/uploadSchema';
import { parseCSVToRecords, rowsToCSV } from '../utils/csvParse';
import UploadErrorTable from './UploadErrorTable';
import './DataUploadModal.css';

// Tables where the backend accepts alternate/renamed CSV headers (see the
// _preprocess_* functions in Backend/app/upload.py) in addition to the
// canonical DB column names. For these tables we skip the client-side
// "missing/extra column" check entirely — we can't safely re-derive the
// backend's renaming rules here, and a false "missing column" warning would
// be actively misleading. Per-cell checks (blank/enum/length) still run
// normally for whichever columns happen to match verbatim.
const PREPROCESSED_TABLES = new Set([
    'employees', 'student_table', 'uba_events', 'nptel_enrollments',
    'research_publications', 'iar_mous', 'faculty_engagement',
    'outreach', 'outreach_science_quest', 'outreach_math_circle',
    'outreach_pale_blue_dot', 'outreach_institute_visits', 'outreach_nss_activities',
]);

const MAX_CLIENT_ISSUES = 100;

function sampleValueFor(col) {
    if (col.allowed_values && col.allowed_values.length > 0) return col.allowed_values[0];
    const t = (col.data_type || '').toLowerCase();
    if (t.includes('bool')) return 'TRUE';
    if (t.includes('date') || t.includes('timestamp')) return '2024-01-01';
    if (t.includes('int') || t.includes('numeric') || t.includes('double') || t.includes('real') || t.includes('decimal')) return '1';
    return `Sample ${col.name}`;
}

// Mirrors the handful of value aliases upload.py accepts before checking an
// enum column, so a legitimate value like 'General' isn't flagged here as
// invalid just because the client doesn't know the backend will rewrite it
// to 'Gen' first.
function aliasForEnumCheck(colName, value) {
    if (colName.toLowerCase() === 'category' && value.toLowerCase() === 'general') return 'Gen';
    return value;
}

function validateRecordsAgainstSchema(headers, records, schema) {
    const headerIssues = [];
    const cellIssues = [];
    if (!schema) return { headerIssues, cellIssues, truncated: false };

    const colByLower = new Map((schema.columns || []).map(c => [c.name.toLowerCase(), c]));
    const csvHeaderLower = headers.map(h => h.toLowerCase());

    if (!PREPROCESSED_TABLES.has(schema.table_name)) {
        const missing = (schema.required_columns || []).filter(
            rc => !csvHeaderLower.includes(rc.toLowerCase())
        );
        if (missing.length > 0) {
            headerIssues.push(`Missing required column(s): ${missing.join(', ')}.`);
        }
        const known = new Set([
            ...(schema.required_columns || []),
            ...(schema.optional_columns || []),
        ].map(c => c.toLowerCase()));
        const extra = headers.filter(h => !known.has(h.toLowerCase()));
        if (extra.length > 0) {
            headerIssues.push(`Column(s) not recognised for this table: ${extra.join(', ')}.`);
        }
    }

    outer:
    for (let idx = 0; idx < records.length; idx++) {
        const record = records[idx];
        const rowNum = idx + 1;
        const isEmptyRow = Object.values(record).every(v => (v ?? '').toString().trim() === '');
        if (isEmptyRow) continue;

        for (const h of headers) {
            const col = colByLower.get(h.toLowerCase());
            if (!col) continue;
            const raw = record[h];
            const val = (raw ?? '').toString().trim();

            if (val === '') {
                if (col.required) {
                    cellIssues.push({ row: rowNum, column: col.name, reason: 'This field is required and cannot be left empty.' });
                    if (cellIssues.length >= MAX_CLIENT_ISSUES) break outer;
                }
                continue;
            }

            if (col.allowed_values && col.allowed_values.length > 0) {
                const checkVal = aliasForEnumCheck(col.name, val);
                const matched = col.allowed_values.some(a => a.toLowerCase() === checkVal.toLowerCase());
                if (!matched) {
                    cellIssues.push({
                        row: rowNum, column: col.name, value: val,
                        reason: `'${val}' is not an accepted value for '${col.name}'.`,
                        allowed_values: col.allowed_values,
                    });
                    if (cellIssues.length >= MAX_CLIENT_ISSUES) break outer;
                }
            }

            if (col.max_length && val.length > col.max_length) {
                cellIssues.push({
                    row: rowNum, column: col.name,
                    value: val.length > 80 ? val.slice(0, 80) + '…' : val,
                    reason: `This value is ${val.length} characters long, but '${col.name}' allows at most ${col.max_length}.`,
                });
                if (cellIssues.length >= MAX_CLIENT_ISSUES) break outer;
            }
        }
    }

    return { headerIssues, cellIssues, truncated: cellIssues.length >= MAX_CLIENT_ISSUES };
}

// Reshapes a backend error response into a uniform { text, tableErrors,
// truncated } shape, whether it's the newer per-row `details` array or one
// of the older file-level `details` objects (missing/extra columns).
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
            const expected = details.expected_columns || [];
            const shown = expected.slice(0, 15).join(', ') + (expected.length > 15 ? ', …' : '');
            return { text: `${message} Unexpected column(s): ${details.extra_in_csv.join(', ')}. Expected columns: ${shown}.`, tableErrors: null, truncated: false };
        }
        if (typeof details === 'string') {
            return { text: `${message} — ${details}`, tableErrors: null, truncated: false };
        }
        return { text: message, tableErrors: null, truncated: false };
    }
    return { text: message, tableErrors: null, truncated: false };
}

// Combines every issue for the same row into one cell's worth of text (a
// row can fail more than one column at once), keyed by 1-indexed data-row
// number — matching both the backend's `row` numbering and the existing
// preview-highlighting logic below (rowNum = i + 1 over parsedCSV.records).
function groupErrorsByRow(errors) {
    const byRow = new Map();
    for (const e of errors || []) {
        if (!e.row) continue;
        const part = e.column ? `${e.column}: ${e.reason}` : e.reason;
        byRow.set(e.row, byRow.has(e.row) ? `${byRow.get(e.row)} || ${part}` : part);
    }
    return byRow;
}

function DataUploadModal({ isOpen, onClose, tableName, token, onUploadSuccess }) {
    const [selectedFile, setSelectedFile] = useState(null);
    const [parsedCSV, setParsedCSV] = useState(null); // { headers, records }
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState(null);
    const [uploadSuccess, setUploadSuccess] = useState(false);
    const [serverErrors, setServerErrors] = useState(null);   // array | null
    const [serverTruncated, setServerTruncated] = useState(false);

    const [schema, setSchema] = useState(null);
    const [schemaError, setSchemaError] = useState(null);
    const [schemaLoading, setSchemaLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setSelectedFile(null);
            setParsedCSV(null);
            setMessage(null);
            setUploadSuccess(false);
            setIsLoading(false);
            setServerErrors(null);
            setServerTruncated(false);
            setSchema(null);
            setSchemaError(null);

            if (tableName && token) {
                setSchemaLoading(true);
                fetchUploadSchema(tableName, token)
                    .then(data => setSchema(data))
                    .catch(err => setSchemaError(err.message || 'Could not load column requirements.'))
                    .finally(() => setSchemaLoading(false));
            }
        }
    }, [isOpen, tableName, token]);

    const templateColumns = useMemo(() => {
        if (!schema) return [];
        const requiredLower = new Set((schema.required_columns || []).map(c => c.toLowerCase()));
        return (schema.columns || []).map(c => ({ ...c, required: requiredLower.has(c.name.toLowerCase()) }));
    }, [schema]);

    const enumColumns = useMemo(
        () => templateColumns.filter(c => c.allowed_values && c.allowed_values.length > 0),
        [templateColumns]
    );

    const hasDateColumn = useMemo(
        () => templateColumns.some(c => (c.data_type || '').toLowerCase().includes('date') || (c.data_type || '').toLowerCase().includes('timestamp')),
        [templateColumns]
    );

    const clientValidation = useMemo(() => {
        if (!parsedCSV || !schema) return { headerIssues: [], cellIssues: [], truncated: false };
        return validateRecordsAgainstSchema(parsedCSV.headers, parsedCSV.records, schema);
    }, [parsedCSV, schema]);

    const highlightedRows = useMemo(() => {
        const rows = new Set();
        clientValidation.cellIssues.forEach(e => rows.add(e.row));
        (serverErrors || []).forEach(e => { if (e.row) rows.add(e.row); });
        return rows;
    }, [clientValidation, serverErrors]);

    if (!isOpen) return null;

    const resetAndClose = () => {
        const wasSuccess = uploadSuccess;
        setSelectedFile(null);
        setParsedCSV(null);
        setMessage(null);
        setUploadSuccess(false);
        setIsLoading(false);
        setServerErrors(null);
        setServerTruncated(false);
        onClose();

        if (wasSuccess) {
            cachedAxios.clearAll();
            window.dispatchEvent(new CustomEvent('iitpkd:upload-success', { detail: { tableName } }));
            if (onUploadSuccess) {
                onUploadSuccess();
            }
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        setSelectedFile(file);
        setMessage(null);
        setUploadSuccess(false);
        setServerErrors(null);
        setServerTruncated(false);

        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const { headers, records } = parseCSVToRecords(event.target.result);
                    setParsedCSV({ headers, records });
                } catch (err) {
                    console.error('Failed to parse CSV:', err);
                    setParsedCSV(null);
                }
            };
            reader.readAsText(file);
        } else {
            setParsedCSV(null);
        }
    };

    const handleUpload = async () => {
        if (!selectedFile || !token) return;

        setIsLoading(true);
        setMessage(null);
        setServerErrors(null);
        setServerTruncated(false);

        const formData = new FormData();
        formData.append('table_name', tableName);
        formData.append('csv_file', selectedFile);

        try {
            const response = await axios.post(
                `${import.meta.env.VITE_API_BASE_URL}/api/upload-csv`,
                formData,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }
            );

            const successMsg = response.data.message || `Successfully updated table ${tableName}`;
            setMessage({ type: 'success', text: successMsg });
            setUploadSuccess(true);

        } catch (error) {
            if (error.response?.data) {
                const { text, tableErrors, truncated } = formatServerError(error.response.data, 'An error occurred during upload.');
                setMessage({ type: 'error', text });
                setServerErrors(tableErrors);
                setServerTruncated(truncated);
            } else {
                setMessage({ type: 'error', text: error.message || 'An error occurred during upload. Please verify the backend server is reachable.' });
            }
            setUploadSuccess(false);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDownloadTemplate = () => {
        if (templateColumns.length === 0) return;
        const headers = templateColumns.map(c => c.name);
        const sample = templateColumns.map(sampleValueFor);

        const csvContent = [
            headers.join(','),
            sample.join(',')
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${tableName}_template.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    // Downloads the user's own uploaded file back to them with one extra
    // trailing column (Upload_Error) — blank on clean rows, filled in with
    // exactly what's wrong on flagged ones — so problems can be fixed
    // directly in a spreadsheet instead of cross-referencing an on-screen
    // table against the original file row by row.
    const downloadAnnotatedCsv = (errors) => {
        if (!parsedCSV) return;
        const byRow = groupErrorsByRow(errors);
        const headers = [...parsedCSV.headers, 'Upload_Error'];
        const rows = parsedCSV.records.map((record, i) => [
            ...parsedCSV.headers.map(h => record[h] ?? ''),
            byRow.get(i + 1) || '',
        ]);
        const csvContent = rowsToCSV(headers, rows);

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${tableName}_with_errors.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const previewRows = parsedCSV ? parsedCSV.records.slice(0, 50) : [];
    const hasClientIssues = clientValidation.headerIssues.length > 0 || clientValidation.cellIssues.length > 0;

    const modalContent = (
        <div className="modal-overlay" onClick={resetAndClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Upload Data: {tableName}</h2>
                    <button className="close-btn" onClick={resetAndClose}>&times;</button>
                </div>

                <div className="modal-body">
                    {!uploadSuccess ? (
                        <>
                            <div className="warning-box">
                                <span className="warning-icon">⚠️</span>
                                <div>
                                    <strong>Warning:</strong> You are directly modifying the database.
                                    Ensure the CSV format matches the table schema exactly.

                                    <div className="dum-template-mt">
                                        <button
                                            className="download-template-btn"
                                            onClick={handleDownloadTemplate}
                                            disabled={templateColumns.length === 0}
                                        >
                                            Download CSV Template
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {schemaLoading && (
                                <div className="dum-schema-note">Loading column requirements…</div>
                            )}
                            {schemaError && (
                                <div className="dum-schema-note dum-schema-note--warn">
                                    Could not load column requirements ({schemaError}). You can still upload —
                                    any problems will be shown after you submit.
                                </div>
                            )}

                            {templateColumns.length > 0 && (
                                <div className="dum-format-section">
                                    <strong>Required columns:</strong>
                                    <div className="dum-format-code">
                                        {templateColumns.filter(c => c.required).map(c => c.name).join(', ') || '(none)'}
                                    </div>
                                    <strong className="dum-optional-label">Optional columns:</strong>
                                    <div className="dum-format-code">
                                        {templateColumns.filter(c => !c.required).map(c => c.name).join(', ') || '(none)'}
                                    </div>

                                    {enumColumns.length > 0 && (
                                        <div className="dum-enum-legend">
                                            <strong>Accepted values:</strong>
                                            <ul>
                                                {enumColumns.map(c => (
                                                    <li key={c.name}><code>{c.name}</code>: {c.allowed_values.join(', ')}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {hasDateColumn && (
                                        <div className="dum-hint">Dates should be in <code>YYYY-MM-DD</code> format (e.g. 2024-06-01).</div>
                                    )}

                                    {(schema?.notes || []).map((note, i) => (
                                        <div className="dum-hint" key={i}>{note}</div>
                                    ))}
                                </div>
                            )}

                            <div className="file-input-container">
                                <input
                                    type="file"
                                    accept=".csv"
                                    onChange={handleFileChange}
                                    disabled={isLoading}
                                />
                            </div>

                            {hasClientIssues && (
                                <div className="dum-preflight">
                                    <div className="dum-preflight-header">
                                        Heads up — {clientValidation.headerIssues.length + clientValidation.cellIssues.length} potential issue(s) found before uploading.
                                        You can still upload; the server will confirm if anything actually blocks it.
                                    </div>
                                    {clientValidation.headerIssues.map((msg, i) => (
                                        <div className="dum-preflight-item" key={i}>{msg}</div>
                                    ))}
                                    <UploadErrorTable
                                        errors={clientValidation.cellIssues}
                                        truncated={clientValidation.truncated}
                                        highlightColor="#f59e0b"
                                    />
                                    {clientValidation.cellIssues.length > 0 && (
                                        <button
                                            type="button"
                                            className="dum-download-errors-btn"
                                            onClick={() => downloadAnnotatedCsv(clientValidation.cellIssues)}
                                        >
                                            Download CSV with error notes
                                        </button>
                                    )}
                                </div>
                            )}

                            {parsedCSV && (
                                <div className="preview-section">
                                    <h4>CSV Preview (First {previewRows.length} Rows)</h4>
                                    <div className="dum-preview-scroll">
                                        <table className="preview-table">
                                            <thead>
                                                <tr>
                                                    {parsedCSV.headers.map((head, i) => <th key={i}>{head}</th>)}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {previewRows.map((record, i) => {
                                                    const rowNum = i + 1;
                                                    const isServerRow = (serverErrors || []).some(e => e.row === rowNum);
                                                    const isClientRow = !isServerRow && highlightedRows.has(rowNum);
                                                    const rowClass = isServerRow ? 'dum-row--error' : (isClientRow ? 'dum-row--warn' : '');
                                                    return (
                                                        <tr key={i} className={rowClass}>
                                                            {parsedCSV.headers.map((h, j) => <td key={j}>{record[h]}</td>)}
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {message && (
                                <div className={`status-message ${message.type}`}>
                                    <div>{message.text}</div>
                                    {message.type === 'error' && serverErrors && (
                                        <>
                                            <UploadErrorTable errors={serverErrors} truncated={serverTruncated} />
                                            <button
                                                type="button"
                                                className="dum-download-errors-btn"
                                                onClick={() => downloadAnnotatedCsv(serverErrors)}
                                            >
                                                Download CSV with error notes
                                                {serverTruncated ? ` (first ${serverErrors.length} problems)` : ''}
                                            </button>
                                        </>
                                    )}
                                </div>
                            )}

                            <div className="upload-actions">
                                <button className="cancel-btn" onClick={resetAndClose} disabled={isLoading}>
                                    Cancel
                                </button>
                                <button
                                    className="upload-btn"
                                    onClick={handleUpload}
                                    disabled={!selectedFile || isLoading}
                                >
                                    {isLoading ? 'Uploading...' : (hasClientIssues ? 'Upload Anyway' : 'Confirm Upload')}
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="dum-success-view">
                            <div className="dum-success-icon">✅</div>
                            <h3 className="dum-success-h3">Upload Successful!</h3>
                            <p className="dum-success-msg">
                                {message?.text || `Successfully updated table ${tableName}`}
                            </p>
                            <p className="dum-success-hint">
                                Click OK to close this window.
                            </p>
                            <button className="dum-ok-btn" onClick={resetAndClose}>
                                OK
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
}

export default DataUploadModal;
