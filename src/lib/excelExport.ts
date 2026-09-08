/**
 * Utility for exporting data to Microsoft Excel-compatible files.
 * Includes UTF-8 BOM so Excel opens Hindi, European characters, and symbols seamlessly.
 */

export interface ExcelColumn<T> {
  header: string;
  key?: keyof T;
  formatter?: (row: T) => string | number;
}

export function exportToExcel<T>(
  filename: string,
  columns: ExcelColumn<T>[],
  data: T[]
) {
  // 1. Build Header Row
  const headers = columns.map((c) => escapeCsvCell(c.header)).join(",");

  // 2. Build Data Rows
  const rows = data.map((row) => {
    return columns
      .map((col) => {
        let val: any = "";
        if (col.formatter) {
          val = col.formatter(row);
        } else if (col.key) {
          val = row[col.key];
        }
        return escapeCsvCell(val ?? "");
      })
      .join(",");
  });

  // 3. Prepend UTF-8 BOM (\uFEFF) for Excel
  const csvContent = "\uFEFF" + [headers, ...rows].join("\r\n");

  // 4. Trigger Browser Download
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute(
    "download",
    filename.endsWith(".csv") ? filename : `${filename}.csv`
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function escapeCsvCell(value: any): string {
  if (value === null || value === undefined) return '""';
  const str = String(value);
  // If string contains comma, double quote, or newline, wrap in quotes and escape quotes
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}
