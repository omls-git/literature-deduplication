import React from 'react';
import Papa from 'papaparse';

const FileUpload = ({ onFilesProcessed }) => {
  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    const parsedData = [];
    files.forEach((file, index) => {
      Papa.parse(file, {
        header: true,
        complete: (result) => {
          parsedData.push(...result.data);
          if (index === files.length - 1) {
            onFilesProcessed(parsedData);
          }
        },
      });
    });
  };

  return (
    <div>
      <input type="file" accept=".csv" multiple onChange={handleFileChange} />
    </div>
  );
};

export default FileUpload;
