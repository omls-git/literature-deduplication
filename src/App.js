import React, { useState } from "react";
import * as XLSX from "xlsx"; // For handling Excel files
import { saveAs } from "file-saver";
import Papa from "papaparse";

import Button from '@mui/material/Button';
import { Box } from "@mui/material";
import Grid from '@mui/material/Grid';
import YourComponent from "./components/YourComponent";
import Embase from "./components/Embase";


function App() {
  const [csvData, setCsvData] = useState([]);
  const [duplicateRows, setDuplicateRows] = useState([]);
  const [nonDuplicateRows, setNonDuplicateRows] = useState([]);
  const [masterTrackerFile, setMasterTrackerFile] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [workbook, setWorkbook] = useState(null);
  const [removedPMIDs, setRemovedPMIDs] = useState([]); // State to store removed PMIDs
  const [todaysRemovedPMIDs, setTodaysRemovedPMIDs] = useState([]); // State to store today's removed PMIDs
  const [totalUniques, setTotalUniques] = useState(0);
  const [combinedData, setCombinedData] = useState([]); // State to store combined data
  const [totalUniqueHits, setTotalUniqueHits] = useState([]);




  const closeModal = () => {
    setIsModalOpen(false);
  };

  // Handle CSV Upload
  const handleFileUpload = (e) => {
    const files = e.target.files;
    const fileDetails = Array.from(files).map((file) => ({
      name: file.name,
      size: file.size,
    }));

    setUploadedFiles((prev) => [...prev, ...fileDetails]);

    Array.from(files).forEach((file) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: function (results) {
          setCsvData((prev) => [...prev, ...results.data]);
        },
      });
    });
  };

  // Detect Duplicates
  const detectDuplicates = () => {
  const pmidCount = {};
 // const seenFirstInstance = new Set();
  const duplicates = [];
  const nonDuplicates = [];

  csvData.forEach((row) => {
    const pmid = row.PMID?.toString().trim();
    if (!pmid) return;

    pmidCount[pmid] = (pmidCount[pmid] || 0) + 1;

    if (pmidCount[pmid] === 1) {
      nonDuplicates.push(row); // first time seeing this PMID
    } else {
      duplicates.push(row); // second or more = duplicate
    }
  });

  setDuplicateRows(duplicates);         // should be 15 now
  setNonDuplicateRows(nonDuplicates);   // should be 133
};

  // Export to CSV
  const exportToCsv = (data, filename) => {
    if (data.length === 0) {
      alert("No data to export.");
      return;
    }

    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, filename);
  };

  const handleMTracker = (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();

    reader.onload = (evt) => {
      const data = evt.target.result;
      const wb = XLSX.read(data, { type: "binary" });
      setWorkbook(wb);
    };

    if (file) {
      reader.readAsBinaryString(file);
    }
    console.log("File uploades", workbook)
  };
  // Handle Master Tracker File Selection
  const handleMasterTrackerUpload = (e) => {
    const file = e.target.files[0];
    setMasterTrackerFile(file);
  };

  // Add Duplicates to Master Tracker
  const addDuplicatesToMasterTracker = async () => {
    setIsModalOpen(true);
    if (!masterTrackerFile) {
      alert("Please upload the Master Tracker file first.");
      return;
    }

    try {
      const reader = new FileReader();
      reader.readAsArrayBuffer(masterTrackerFile);

      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: "array" });

          // const todayDate = new Date().toLocaleDateString("en-GB", {
          //   day: "2-digit",
          //   month: "short",
          //   year: "numeric",
          // });

          const formatDate = (value) => {
            if (typeof value === "number") {
              // Convert Excel serial number to a date
              const excelBaseDate = new Date(1899, 11, 30); // Excel counts from 30 Dec 1899
              const formattedDate = new Date(excelBaseDate.getTime() + value * 86400000);
              return formatDate(formattedDate); // Format it again using the logic below
            }

            if (value instanceof Date) {
              // Format the date as DD MMM YYYY
              const day = String(value.getDate()).padStart(2, "0");
              const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
              const month = monthNames[value.getMonth()];
              const year = value.getFullYear();
              return `${day} ${month} ${year}`;
            }

            if (typeof value === "string") {
              // Handle already formatted dates or unexpected formats
              return value;
            }

            return null; // Return null for invalid dates
          };

          const appendData = (sheetName, rows) => {
            const worksheet =
              workbook.Sheets[sheetName] ||
              XLSX.utils.aoa_to_sheet([["SNO", "Received Date (DD MMM YYYY)", "PMID"]]);

            // Read current data from the worksheet
            let sheetData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

            // Get today's date
            const today = formatDate(new Date());

            // Clean up existing data:
            // - Format "Received Date" column to DD MMM YYYY
            // - Remove empty columns (__EMPTY, __EMPTY_1, etc.)
            sheetData = sheetData.map((row) => ({
              SNO: row.SNO || "",
              "Received Date (DD MMM YYYY)": row["Received Date (DD MMM YYYY)"]
                ? formatDate(row["Received Date (DD MMM YYYY)"])
                : today, // Fill missing dates with today's date
              PMID: row.PMID || "",
            }));

            // Create a Set to track unique PMIDs
            const uniquePMIDs = new Set(sheetData.map((row) => row.PMID));

            // Get the last SNO value for proper numbering
            const lastSno = sheetData.length > 0 ? parseInt(sheetData[sheetData.length - 1].SNO) || 0 : 0;

            // Append new rows, ensuring proper formatting and avoiding duplicate PMIDs
            rows.forEach((row, index) => {
              if (!uniquePMIDs.has(row.PMID)) {  // ✅ Only add if PMID is unique
                sheetData.push({
                  SNO: lastSno + index + 1,
                  "Received Date (DD MMM YYYY)": row["Received Date (DD MMM YYYY)"]
                    ? formatDate(row["Received Date (DD MMM YYYY)"])
                    : today,
                  PMID: row.PMID,
                });
                uniquePMIDs.add(row.PMID);  // Track this PMID
              }
            });

            // Remove duplicates within the same sheet by filtering the sheetData again
            const seenPMIDs = new Set();
            sheetData = sheetData.filter((row) => {
              if (!seenPMIDs.has(row.PMID)) {
                seenPMIDs.add(row.PMID);
                return true;
              }
              return false;
            });

            // Re-number the SNO column
            sheetData.forEach((row, index) => {
              row.SNO = index + 1;
            });

            // Convert updated data back into a worksheet
            const updatedSheet = XLSX.utils.json_to_sheet(sheetData, {
              skipHeader: false,
            });

            return updatedSheet;
          };
          // Process Duplicate Hits
          const duplicateSheetName = "Duplicate Hits";
          const updatedDuplicateWorksheet = appendData(duplicateSheetName, duplicateRows);

          // Process Unique Hits
          const uniqueSheetName = "Unique Hits";
          const updatedUniqueWorksheet = appendData(uniqueSheetName, nonDuplicateRows);

          // Create a new workbook and append updated sheets
          const updatedWorkbook = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(
            updatedWorkbook,
            updatedDuplicateWorksheet,
            duplicateSheetName
          );
          XLSX.utils.book_append_sheet(
            updatedWorkbook,
            updatedUniqueWorksheet,
            uniqueSheetName
          );

          // Write the updated workbook to a file
          const updatedExcel = XLSX.write(updatedWorkbook, {
            bookType: "xlsx",
            type: "array",
          });
          const blob = new Blob([updatedExcel], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          });

          saveAs(blob, "Updated_Master_Tracker.xlsx");
          alert("Duplicates and Unique records added to Master Tracker successfully!");
        } catch (innerError) {
          console.error("Error processing the Excel file:", innerError);
          alert(
            "An error occurred while processing the Excel file. Check the console for details."
          );
        }
      };

      reader.onerror = () => {
        console.error("Failed to read the file:", reader.error);
        alert("Failed to read the Master Tracker file.");
      };
    } catch (error) {
      console.error("Unexpected error:", error);
      alert("An unexpected error occurred. Check the console for details.");
    }
  };


  const handleDownloadUpdated = () => {
    if (!workbook) {
      alert("Please upload the Master Tracker file first.");
      return;
    }

    const uniqueSheetName = "Unique Hits";
    const uniqueWorksheet = workbook.Sheets[uniqueSheetName];

    if (!uniqueWorksheet) {
      alert("Unique Hits sheet not found in the workbook.");
      return;
    }

    // Read the data from the Unique Hits sheet
    const uniqueData = XLSX.utils.sheet_to_json(uniqueWorksheet, { defval: "" });

    // Create a map to track occurrences of each PMID
    const pmidCount = {};
    const today = new Date();
    const todayFormatted = today.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

    // Count occurrences of each PMID
    uniqueData.forEach((row) => {
      const pmid = row.PMID;
      if (pmid) {
        pmidCount[pmid] = (pmidCount[pmid] || 0) + 1;
      }
    });

    // Initialize arrays to hold removed PMIDs
    const removedPMIDsArray = [];
    const todaysRemovedPMIDsArray = [];

    // Filter out all PMIDs that have duplicates
    const cleanedData = uniqueData.filter((row) => {
      const pmid = row.PMID;
      // Check if the PMID occurs more than once
      if (pmidCount[pmid] > 1) {
        // Add to removed PMIDs
        removedPMIDsArray.push(pmid);
        // Check if it's today's PMID
        if (row["Received Date (DD MMM YYYY)"] === todayFormatted) {
          todaysRemovedPMIDsArray.push(row); // Store the complete row
        }
        return false; // Remove this row
      }
      return true; // Keep this row
    });

    // Update state with removed PMIDs
    setRemovedPMIDs(removedPMIDsArray);
    setTodaysRemovedPMIDs(todaysRemovedPMIDsArray);

    // Calculate total unique PMIDs from cleaned data
    const uniquePMIDsSet = new Set(cleanedData.map(row => row.PMID));
    const totalUniqueCount = uniquePMIDsSet.size; // Count of unique PMIDs
    setTotalUniques(totalUniqueCount); // Store in state

    // Create a new worksheet from the cleaned data
    const updatedUniqueWorksheet = XLSX.utils.json_to_sheet(cleanedData, {
      skipHeader: false,
    });

    // Create a new workbook and append the updated Unique Hits sheet
    const updatedWorkbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(updatedWorkbook, updatedUniqueWorksheet, uniqueSheetName);

    // Write the updated workbook to a file
    const updatedExcel = XLSX.write(updatedWorkbook, {
      bookType: "xlsx",
      type: "array",
    });
    const blob = new Blob([updatedExcel], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    saveAs(blob, "Cleaned_Unique_Hits.xlsx");
    alert("Cleaned Unique Hits file has been downloaded successfully!");

    // Log the counts of removed PMIDs
    console.log(`Total removed PMIDs: ${removedPMIDsArray.length}`);
    console.log(`Today's removed PMIDs: ${todaysRemovedPMIDsArray.length}`);
    console.log(`Total unique PMIDs: ${totalUniqueCount}`);
    console.log(`Total unique PMIDs :${totalUniques}`)
    console.log("Total Unique Hits", duplicateRows)
    console.log("todaysRemovedPMIDs", todaysRemovedPMIDs)
    console.log("nonDuplicateRows", nonDuplicateRows)
  };


  const getTotalUniques = () => {
    // Extract PMIDs from duplicateRows and todaysRemovedPMIDs
    const combinedData = [];

    // Add PMIDs from duplicateRows
    duplicateRows.forEach((row, index) => {
      if (row.PMID) { // Check if PMID exists
        combinedData.push({
          SNO: index + 1, // Serial number starts from 1
          PMID: row.PMID,
        });
      }
    });

    // Add PMIDs from todaysRemovedPMIDs
    todaysRemovedPMIDs.forEach((row, index) => {
      if (row.PMID) { // Check if PMID exists
        combinedData.push({
          SNO: duplicateRows.length + index + 1, // Continue SNO from duplicateRows
          PMID: row.PMID,
        });
      }
    });

    // Log combined data for debugging
    console.log("Combined Data:", combinedData);
    setCombinedData(combinedData); // Store combined data in state for further use


    // Check if combinedData is empty
    if (combinedData.length === 0) {
      alert("No data available to download.");
      return; // Exit the function if there's no data
    }

    // Create a worksheet from the combined data
    const worksheet = XLSX.utils.json_to_sheet(combinedData, {
      header: ["SNO", "PMID"],
    });

    // Create a new workbook and append the worksheet
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Total Duplicate Hits");

    // Write the workbook to a file
    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });
    const blob = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    // Trigger download
    saveAs(blob, "Total_Dulicate_Hits.xlsx");
    alert("Total Unique Hits file has been downloaded successfully!");
  };

  const getTotalUniqueHits = () => {
    // 1. Create a Set of PMIDs to remove
    const removedSet = new Set(todaysRemovedPMIDs.map(row => row.PMID));

    // 2. Filter nonDuplicateRows to exclude removed PMIDs
    const filteredData = nonDuplicateRows
      .filter(row => row.PMID && !removedSet.has(row.PMID))
      .map((row, index) => ({
        SNO: index + 1,
        PMID: row.PMID
      }));

    // 3. Set the result to state (optional)
    setTotalUniqueHits(filteredData); // Use if you need to display this somewhere

    // 4. Handle empty case
    if (filteredData.length === 0) {
      alert("No data available to download.");
      return;
    }
    console.log("Filtered Data:", totalUniqueHits); // For debugging
    // 5. Generate Excel sheet
    const worksheet = XLSX.utils.json_to_sheet(filteredData, {
      header: ["SNO", "PMID"],
    });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Total Unique Hits");

    // 6. Write and download Excel
    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });
    const blob = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    saveAs(blob, "Total_Unique_Hits.xlsx");
    alert("Total Unique Hits file has been downloaded successfully!");
  };


  const downloadCsvData = () => {
    exportToCsv(csvData, "combined_CSV_Data.csv");
  };
  
  return (
    <div className="App">
      <Grid container spacing={3}>
        <Grid item xs>
        </Grid>

        <Grid item xs={9} style={{ backgroundColor: '#F5F5F5' }}>
          {/* <h1>CSV & Master Tracker Handler</h1>
          <img src="/DownloadImage.jpg" alt="Upload" style={{ width: '1150px', height: '500px', marginRight: '10px' }} /> */}

          {/* Pubmet Section */}
          <div style={{ backgroundColor: '#E3F2FD', padding: '20px', borderRadius: '10px' }}>
            <h1>Pubmed</h1>
            {/* Buttons and Upload Section */}
            <Box sx={{ flexGrow: 1 }}>
              <Grid container spacing={3} pt={1}>
                <Grid item xs>
                  <Button variant="contained" component="label">
                    Upload CSV Files
                    <input type="file" hidden accept=".csv" multiple onChange={handleFileUpload} />
                  </Button>
                </Grid>
                <Grid item xs>
                  <Button variant="contained" onClick={detectDuplicates}>Detect Duplicates</Button>
                </Grid>
                <Grid item xs>
                  <Button variant="contained" onClick={() => exportToCsv(duplicateRows, "duplicates.csv")}>Export Duplicates</Button>
                </Grid>
                <Grid item xs>
                  <Button variant="contained" onClick={() => exportToCsv(nonDuplicateRows, "non-duplicates.csv")}>Export Uniques</Button>
                </Grid>
              </Grid>
            </Box>

            {/* Uploaded Files Section */}
            <div>
              <h3>Uploaded Files:</h3>
              {uploadedFiles.length > 0 ? (
                uploadedFiles.map((file, index) => (
                  <div key={index}>
                    <p>{file.name} - {file.size} bytes</p>
                  </div>
                ))
              ) : (
                <p>No files uploaded yet.</p>
              )}
            </div>

            {/* Summary Section */}
            <h2>Summary</h2>
            <p>Total Rows Processed: <strong>{csvData.length}</strong></p>
            <p>Duplicate Rows: <strong>{duplicateRows.length}</strong></p>
            <p>Non-Duplicate Rows: <strong>{nonDuplicateRows.length}</strong></p>
            <p>Removed PMIDs: <strong>{removedPMIDs.length}</strong></p>
            <p>Duplicate Hits from the Master tracker: <strong>{todaysRemovedPMIDs.length}</strong></p>
            <p>Total duplicates:<strong>{combinedData.length}</strong> </p>
            <p>Total Uniques : <strong>{totalUniqueHits.length}</strong></p>

            {/* Upload Master Tracker Section */}
            <h3>Upload Master Tracker File (Excel)</h3>
            <Box sx={{ flexGrow: 1 }}>
              <Grid container spacing={3}>
                {/* First Row */}
                <Grid item xs={4}>
                  <Button variant="contained" component="label">
                    Upload Master Tracker File
                    <input type="file" hidden accept=".xlsx" onChange={handleMasterTrackerUpload} />
                  </Button>
                </Grid>
                <Grid item xs={4}>
                  <Button variant="contained" onClick={addDuplicatesToMasterTracker}>
                    Download Updated Master Tracker
                  </Button>
                </Grid>
                <Grid item xs={4}>
                  <Button variant="contained" component="label" sx={{ marginRight: 2 }}>
                    Upload M-Tracker
                    <input
                      type="file"
                      hidden
                      accept=".xlsx"
                      onChange={handleMTracker}
                    />
                  </Button>
                </Grid>

                {/* Second Row */}
                <Grid item xs={4}>
                  <Button variant="contained" onClick={handleDownloadUpdated}>
                    Download Updated Master Tracker
                  </Button>
                </Grid>
                <Grid item xs={4}>
                  <Button variant="contained" onClick={getTotalUniques}>
                    Total Duplicates
                  </Button>
                </Grid>
                <Grid item xs={4}>
                  <Button variant="contained" onClick={getTotalUniqueHits}>
                    Total Unique Hits
                  </Button>
                </Grid>
                <Grid item xs>
                  <Button variant="contained" onClick={downloadCsvData}>
                    Download Uploaded CSV
                  </Button>
                </Grid>
              </Grid>
            </Box>
          </div>
          <div>
            <Embase />
          </div>
          {/* Embase Section */}


        </Grid>

        <Grid item xs>
        </Grid>
      </Grid>

      <div>
        <YourComponent isOpen={isModalOpen} onClose={closeModal} />
      </div>
    </div>
  );

}

export default App;
