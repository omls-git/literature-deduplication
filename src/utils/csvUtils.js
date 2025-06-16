import { saveAs } from 'file-saver';
import Papa from 'papaparse';

export const findDuplicatesAndNonDuplicates = (data) => {
  const rowMap = {};
  const duplicates = [];
  const nonDuplicates = [];

  data.forEach((row) => {
    const pmid = row.PMID || 'Unknown';
    if (rowMap[pmid]) {
      duplicates.push(row);
    } else {
      rowMap[pmid] = true;
      nonDuplicates.push(row);
    }
  });

  return { duplicates, nonDuplicates };
};

export const exportToCsv = (data, filename) => {
  const csvContent = Papa.unparse(data);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  saveAs(blob, filename);
};
