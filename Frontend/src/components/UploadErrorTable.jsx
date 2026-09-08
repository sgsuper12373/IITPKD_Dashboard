import './UploadErrorTable.css';

// Renders a structured list of upload/validation problems as a table so a
// non-technical user can see exactly which row/column failed, why, what
// they entered, and (for enum/format problems) what's actually accepted —
// instead of a single opaque error sentence.
function UploadErrorTable({ errors, truncated, highlightColor = '#dc3545' }) {
    if (!errors || errors.length === 0) return null;

    const hasColumn = errors.some(e => e.column);
    const hasValue = errors.some(e => e.value !== undefined);
    const hasAllowed = errors.some(e => e.allowed_values);

    return (
        <div className="uet-wrap">
            <div className="uet-scroll">
                <table className="uet-table" style={{ '--uet-accent': highlightColor }}>
                    <thead>
                        <tr>
                            <th>Row</th>
                            {hasColumn && <th>Column</th>}
                            <th>Problem</th>
                            {hasValue && <th>Your value</th>}
                            {hasAllowed && <th>Accepted values</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {errors.map((e, idx) => (
                            <tr key={idx}>
                                <td>{e.row ?? '—'}</td>
                                {hasColumn && <td>{e.column || '—'}</td>}
                                <td>{e.reason}</td>
                                {hasValue && <td>{e.value !== undefined && e.value !== '' ? String(e.value) : '(empty)'}</td>}
                                {hasAllowed && <td>{e.allowed_values ? e.allowed_values.join(', ') : '—'}</td>}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {truncated && (
                <div className="uet-truncated">
                    Showing the first {errors.length} problem{errors.length === 1 ? '' : 's'} found.
                    Fix these and re-upload — more problems may exist further down the file.
                </div>
            )}
        </div>
    );
}

export default UploadErrorTable;
