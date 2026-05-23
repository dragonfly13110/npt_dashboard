export function toCsvValue(value) {
    if (value === null || value === undefined) return '';
    const text = String(value);
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function rowsToCsv(rows) {
    return rows.map((row) => row.map(toCsvValue).join(',')).join('\r\n');
}

export function objectsToCsv(rows) {
    const headers = Array.from(rows.reduce((set, row) => {
        Object.keys(row || {}).forEach((key) => set.add(key));
        return set;
    }, new Set()));

    return rowsToCsv([
        headers,
        ...rows.map((row) => headers.map((header) => row?.[header])),
    ]);
}

export function downloadCsv(filename, rowsOrCsv) {
    const csv = Array.isArray(rowsOrCsv) ? rowsToCsv(rowsOrCsv) : rowsOrCsv;
    const blob = new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename.replace(/\.xlsx$/i, '.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

export function parseCsv(text) {
    const rows = [];
    let row = [];
    let value = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i += 1) {
        const char = text[i];
        const next = text[i + 1];

        if (char === '"' && inQuotes && next === '"') {
            value += '"';
            i += 1;
        } else if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            row.push(value);
            value = '';
        } else if ((char === '\n' || char === '\r') && !inQuotes) {
            if (char === '\r' && next === '\n') i += 1;
            row.push(value);
            if (row.some((cell) => cell !== '')) rows.push(row);
            row = [];
            value = '';
        } else {
            value += char;
        }
    }

    row.push(value);
    if (row.some((cell) => cell !== '')) rows.push(row);
    return rows;
}

export function parseCsvFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => resolve(parseCsv(String(event.target.result || '')));
        reader.onerror = () => reject(reader.error || new Error('Unable to read CSV file'));
        reader.readAsText(file, 'utf-8');
    });
}
