// Minimal RFC4180-style CSV parser: handles quoted fields, embedded commas,
// embedded newlines, and doubled-quote ("") escaping — unlike a naive
// line.split(','), which misaligns columns as soon as a field contains a
// comma (e.g. an address like "123 Main St, City").
export function parseCSV(text) {
    const rows = [];
    let row = [];
    let field = '';
    let inQuotes = false;
    let i = 0;
    const len = text.length;

    while (i < len) {
        const char = text[i];

        if (inQuotes) {
            if (char === '"') {
                if (text[i + 1] === '"') {
                    field += '"';
                    i += 2;
                    continue;
                }
                inQuotes = false;
                i += 1;
                continue;
            }
            field += char;
            i += 1;
            continue;
        }

        if (char === '"') {
            inQuotes = true;
            i += 1;
            continue;
        }
        if (char === ',') {
            row.push(field);
            field = '';
            i += 1;
            continue;
        }
        if (char === '\r') {
            i += 1;
            continue;
        }
        if (char === '\n') {
            row.push(field);
            rows.push(row);
            row = [];
            field = '';
            i += 1;
            continue;
        }
        field += char;
        i += 1;
    }

    if (field !== '' || row.length > 0) {
        row.push(field);
        rows.push(row);
    }

    // Drop fully blank trailing lines (e.g. trailing newline in the file).
    return rows.filter(r => !(r.length === 1 && r[0] === ''));
}

// Parses a CSV into { headers, rows } where rows is an array of plain
// objects keyed by header (case preserved as-is, matching backend behaviour).
export function parseCSVToRecords(text) {
    const rows = parseCSV(text);
    if (rows.length === 0) return { headers: [], records: [] };
    const headers = rows[0].map(h => h.trim());
    const records = rows.slice(1).map(cells => {
        const record = {};
        headers.forEach((h, idx) => {
            record[h] = cells[idx] !== undefined ? cells[idx] : '';
        });
        return record;
    });
    return { headers, records };
}

// Characters that make Excel/Sheets interpret a cell as a formula when the
// file is later opened (CWE-1236) — same set the backend neutralizes in
// export_db.py's _csv_safe. A downloaded CSV here can contain values we
// didn't choose (the user's own original cell contents, echoed back inside
// an error message — e.g. "'=HYPERLINK(...)' is not an accepted value"), so
// this is a real, not hypothetical, formula-injection surface, and it's
// neutralized the same way the backend already does for its own exports.
const FORMULA_LEAD_CHARS = ['=', '+', '-', '@', '\t', '\r'];

function csvSafeField(value) {
    const s = value === null || value === undefined ? '' : String(value);
    return FORMULA_LEAD_CHARS.some(c => s.startsWith(c)) ? `'${s}` : s;
}

// Quotes a single field per RFC4180 (wraps in quotes and doubles any
// internal quote) whenever it contains a comma, quote, or newline —
// otherwise returns it unquoted, matching how a spreadsheet app itself
// would write the file.
function toCSVField(value) {
    const safe = csvSafeField(value);
    if (/[",\n\r]/.test(safe)) {
        return `"${safe.replace(/"/g, '""')}"`;
    }
    return safe;
}

// Serializes headers + an array of row-arrays into a single CSV string
// (CRLF line endings, matching the format most spreadsheet apps expect).
export function rowsToCSV(headers, rows) {
    const lines = [headers, ...rows].map(row => row.map(toCSVField).join(','));
    return lines.join('\r\n');
}
