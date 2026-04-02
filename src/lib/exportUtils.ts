// Utility functions for exporting data
export function exportToCSV(
  headers: string[],
  rows: string[][],
  filename: string
) {
  const csv = [
    headers.map(h => `"${h}"`).join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
  ].join('\n');

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

export function exportToXLSX(
  headers: string[],
  rows: string[][],
  filename: string
) {
  // Simple XLSX export using base64 encoded Excel XML
  const escapedHeaders = headers.map(h => `<c><v>${escapeXML(h)}</v></c>`).join('');
  const escapedRows = rows
    .map((row, idx) =>
      `<row r="${idx + 2}">
        ${row.map((cell, cidx) => `<c r="${String.fromCharCode(65 + cidx)}${idx + 2}"><v>${escapeXML(cell)}</v></c>`).join('')}
      </row>`
    )
    .join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <Worksheet>
    <SheetData>
      <row r="1">
        ${escapedHeaders}
      </row>
      ${escapedRows}
    </SheetData>
  </Worksheet>
</Workbook>`;

  const blob = new Blob([xml], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

function escapeXML(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
