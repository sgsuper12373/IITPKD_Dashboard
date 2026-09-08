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
