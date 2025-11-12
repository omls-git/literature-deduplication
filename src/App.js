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
  //const [todaysRemovedPMIDs, setTodaysRemovedPMIDs] = useState([]); // State to store today's removed PMIDs
  const [totalUniques, setTotalUniques] = useState(0);
  //const [combinedData, setCombinedData] = useState([]); // State to store combined data
  //const [totalUniqueHits, setTotalUniqueHits] = useState([]);
  const [todaysCleanedUniques, setTodaysCleanedUniques] = useState([]);
  const [todaysRemovedDuplicates, setTodaysRemovedDuplicates] = useState([]);
  const [removedTodayPMIS, setTodayRemovedPMIDs] = useState([])
  const [todaysUniqueCount, setTodaysUniqueCount] = useState(0);
  const [todaysDuplicateCount, setTodaysDuplicateCount] = useState(0);





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

  // ✅ Add all duplicates (including existing PMIDs) to Master Tracker
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

          const formatDate = (value) => {
            if (typeof value === "number") {
              const excelBaseDate = new Date(1899, 11, 30);
              const formattedDate = new Date(excelBaseDate.getTime() + value * 86400000);
              return formatDate(formattedDate);
            }
            if (value instanceof Date) {
              const day = String(value.getDate()).padStart(2, "0");
              const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
              const month = monthNames[value.getMonth()];
              const year = value.getFullYear();
              return `${day} ${month} ${year}`;
            }
            if (typeof value === "string") return value;
            return null;
          };

          const appendData = (sheetName, rows, allowDuplicates = false) => {
            const worksheet =
              workbook.Sheets[sheetName] ||
              XLSX.utils.aoa_to_sheet([["SNO", "Received Date (DD MMM YYYY)", "PMID"]]);

            let sheetData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
            const today = formatDate(new Date());

            sheetData = sheetData.map((row) => ({
              SNO: row.SNO || "",
              "Received Date (DD MMM YYYY)": row["Received Date (DD MMM YYYY)"]
                ? formatDate(row["Received Date (DD MMM YYYY)"])
                : today,
              PMID: row.PMID || "",
            }));

            const lastSno = sheetData.length > 0 ? parseInt(sheetData[sheetData.length - 1].SNO) || 0 : 0;

            // ✅ Append new rows (optionally allow duplicates)
            rows.forEach((row, index) => {
              if (allowDuplicates || !sheetData.some((r) => r.PMID === row.PMID)) {
                sheetData.push({
                  SNO: lastSno + index + 1,
                  "Received Date (DD MMM YYYY)": row["Received Date (DD MMM YYYY)"]
                    ? formatDate(row["Received Date (DD MMM YYYY)"])
                    : today,
                  PMID: row.PMID,
                });
              }
            });

            // Re-number SNO column
            sheetData.forEach((row, index) => {
              row.SNO = index + 1;
            });

            return XLSX.utils.json_to_sheet(sheetData, { skipHeader: false });
          };

          // ✅ Process Duplicate Hits (allow duplicates)
          const duplicateSheetName = "Duplicate Hits";
          const updatedDuplicateWorksheet = appendData(duplicateSheetName, duplicateRows, true);

          // ✅ Process Unique Hits (do NOT allow duplicates)
          const uniqueSheetName = "Unique Hits";
          const updatedUniqueWorksheet = appendData(uniqueSheetName, nonDuplicateRows, false);

          // ✅ Create a new workbook and append updated sheets
          const updatedWorkbook = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(updatedWorkbook, updatedDuplicateWorksheet, duplicateSheetName);
          XLSX.utils.book_append_sheet(updatedWorkbook, updatedUniqueWorksheet, uniqueSheetName);

          // ✅ Write updated workbook to file
          const updatedExcel = XLSX.write(updatedWorkbook, { bookType: "xlsx", type: "array" });
          const blob = new Blob([updatedExcel], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          });

          saveAs(blob, "Updated_Master_Tracker.xlsx");
          alert("✅ All duplicates and unique records added to Master Tracker successfully!");
        } catch (innerError) {
          console.error("Error processing the Excel file:", innerError);
          alert("An error occurred while processing the Excel file. Check the console for details.");
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
      alert("Please upload or process the Master Tracker file first.");
      return;
    }

    const uniqueSheetName = "Unique Hits";
    const duplicateSheetName = "Duplicate Hits";
    const uniqueWorksheet = workbook.Sheets[uniqueSheetName];
    const duplicateWorksheet = workbook.Sheets[duplicateSheetName];

    if (!uniqueWorksheet) {
      alert("Unique Hits sheet not found in the workbook.");
      return;
    }

    try {
      // Step 1️⃣: Read data from both sheets
      const uniqueData = XLSX.utils.sheet_to_json(uniqueWorksheet, { defval: "" });
      const duplicateData = duplicateWorksheet
        ? XLSX.utils.sheet_to_json(duplicateWorksheet, { defval: "" })
        : [];

      const today = new Date();
      const todayFormatted = today.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });

      // Step 2️⃣: Group Unique Hits by PMID
      const pmidMap = {};
      uniqueData.forEach((row) => {
        const pmid = row.PMID ? String(row.PMID).trim() : "";
        if (!pmid) return;

        if (!pmidMap[pmid]) pmidMap[pmid] = [];
        pmidMap[pmid].push(row);
      });

      // Step 3️⃣: Identify duplicates — only move today's ones if multiple same PMIDs exist
      const cleanedData = [];
      const movedToDuplicate = [];

      Object.keys(pmidMap).forEach((pmid) => {
        const rows = pmidMap[pmid];

        if (rows.length === 1) {
          cleanedData.push(rows[0]);
        } else {
          const todayRows = rows.filter(
            (r) => r["Received Date (DD MMM YYYY)"] === todayFormatted
          );
          const olderRows = rows.filter(
            (r) => r["Received Date (DD MMM YYYY)"] !== todayFormatted
          );

          // Keep one old record (if any)
          if (olderRows.length > 0) {
            cleanedData.push(olderRows[0]);
          } else {
            // If all are from today, keep only one and move rest
            cleanedData.push(todayRows[0]);
            todayRows.shift();
          }

          todayRows.forEach((r) => {
            movedToDuplicate.push({
              ...r,
              "Processed Date": todayFormatted,
            });
          });
        }
      });

      // Step 4️⃣: Ensure today’s rows appear at the bottom of Unique Hits
      const todayRows = cleanedData.filter(
        (r) => r["Received Date (DD MMM YYYY)"] === todayFormatted
      );
      const nonTodayRows = cleanedData.filter(
        (r) => r["Received Date (DD MMM YYYY)"] !== todayFormatted
      );
      const orderedCleanedData = [...nonTodayRows, ...todayRows];

      // Step 5️⃣: Update Duplicate Hits with proper SNo
      // Step 5️⃣: Rebuild Duplicate Hits with proper structure and SNo
      const existingCount = duplicateData.length;

      // Normalize column structure: ensure same columns for all rows
      // const allColumns = [
      //   "SNo",
      //   "Received Date (DD MMM YYYY)",
      //   "PMID",
      //   "Processed Date",
      // ];

      const existingDupes = duplicateData.map((row, index) => ({
        SNo: index + 1,
        "Received Date (DD MMM YYYY)": row["Received Date (DD MMM YYYY)"] || "",
        PMID: row.PMID || "",
        "Processed Date": row["Processed Date"] || "",
      }));

      const newDupes = movedToDuplicate.map((row, index) => ({
        SNo: existingCount + index + 1,
        "Received Date (DD MMM YYYY)": row["Received Date (DD MMM YYYY)"] || todayFormatted,
        PMID: row.PMID,
        "Processed Date": todayFormatted,
      }));

      const updatedDuplicateData = [...existingDupes, ...newDupes];


      // Step 6️⃣: Convert back to worksheets
      const updatedUniqueWorksheet = XLSX.utils.json_to_sheet(orderedCleanedData);
      const updatedDuplicateWorksheet = XLSX.utils.json_to_sheet(updatedDuplicateData);

      // Step 7️⃣: Update workbook
      const wbCopy = { SheetNames: [...workbook.SheetNames], Sheets: { ...workbook.Sheets } };
      wbCopy.Sheets[uniqueSheetName] = updatedUniqueWorksheet;

      if (!wbCopy.SheetNames.includes(duplicateSheetName)) {
        wbCopy.SheetNames.push(duplicateSheetName);
      }
      wbCopy.Sheets[duplicateSheetName] = updatedDuplicateWorksheet;

      // Step 8️⃣: Download updated workbook
      const updatedExcel = XLSX.write(wbCopy, { bookType: "xlsx", type: "array" });
      const blob = new Blob([updatedExcel], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      saveAs(blob, "Cleaned_Unique_Hits.xlsx");

      // Step 9️⃣: Compute today's stats
      const todaysUniqueCount = orderedCleanedData.filter(
        (r) => r["Received Date (DD MMM YYYY)"] === todayFormatted
      ).length;

      const todaysDuplicateCount = updatedDuplicateData.filter(
        (r) =>
          r["Processed Date"] === todayFormatted ||
          r["Received Date (DD MMM YYYY)"] === todayFormatted
      ).length;

      // Step 🔟: Update states
      setWorkbook(wbCopy);
      setRemovedPMIDs(movedToDuplicate.map((r) => r.PMID));
      setTotalUniques(orderedCleanedData.length);
      setTodaysCleanedUniques(orderedCleanedData);
      setTodaysRemovedDuplicates(movedToDuplicate);
      setTodayRemovedPMIDs(movedToDuplicate.map((r) => r.PMID));
      setTodaysUniqueCount(todaysUniqueCount);
      setTodaysDuplicateCount(todaysDuplicateCount);
      console.log("Today's Date:", removedPMIDs);
      console.log("Today's Date:", totalUniques);
      console.log("Today's Date:", todaysCleanedUniques);
      console.log("Today's Date:", todaysRemovedDuplicates);
      alert(
        `✅ File updated successfully!\nMoved ${todaysDuplicateCount} duplicate PMIDs to Duplicate Hits.\nToday's Unique Count: ${todaysUniqueCount}`
      );

      console.log("Moved to Duplicate:", movedToDuplicate);
      console.log("Cleaned Data (Unique Hits):", orderedCleanedData);
      console.log("Today's Unique Count:", todaysUniqueCount);
      console.log("Today's Duplicate Count:", todaysDuplicateCount);
    } catch (error) {
      console.error("Error cleaning Unique Hits:", error);
      alert("An error occurred while cleaning Unique Hits. Check console for details.");
    }
  };


  // // Helper to parse DD MMM YYYY
  // const parseDate = (dateStr) => {
  //   if (!dateStr) return null;
  //   return new Date(Date.parse(dateStr));
  // };

  // Last dated duplicates
  // const getLastDatedDuplicates = () => {
  //   if (!workbook) {
  //     alert("Please upload or process the Master Tracker file first.");
  //     return;
  //   }

  //   const duplicateSheet = workbook.Sheets["Duplicate Hits"];
  //   if (!duplicateSheet) {
  //     alert("Duplicate Hits sheet not found.");
  //     return;
  //   }

  //   const allRows = XLSX.utils.sheet_to_json(duplicateSheet, { defval: "" });
  //   if (allRows.length === 0) return;

  //   const maxDate = allRows.reduce((max, row) => {
  //     const rowDate = parseDate(row["Processed Date"]);
  //     return rowDate > max ? rowDate : max;
  //   }, new Date(0));

  //   const lastDatedRows = allRows.filter(
  //     (row) => parseDate(row["Processed Date"]).getTime() === maxDate.getTime()
  //   );

  //   setCombinedData(lastDatedRows);
  //   alert(`Total duplicates: ${lastDatedRows.length}`);
  // };

  // // Last dated uniques
  // const getLastDatedUniques = () => {
  //   if (!workbook) {
  //     alert("Please upload or process the Master Tracker file first.");
  //     return;
  //   }

  //   const uniqueSheet = workbook.Sheets["Unique Hits"];
  //   if (!uniqueSheet) {
  //     alert("Unique Hits sheet not found.");
  //     return;
  //   }

  //   const allRows = XLSX.utils.sheet_to_json(uniqueSheet, { defval: "" });
  //   if (allRows.length === 0) return;

  //   const maxDate = allRows.reduce((max, row) => {
  //     const rowDate = parseDate(row["Received Date (DD MMM YYYY)"]);
  //     return rowDate > max ? rowDate : max;
  //   }, new Date(0));

  //   const lastDatedRows = allRows.filter(
  //     (row) => parseDate(row["Received Date (DD MMM YYYY)"]).getTime() === maxDate.getTime()
  //   );

  //   setTotalUniqueHits(lastDatedRows);
  //   alert(`Total Uniques: ${lastDatedRows.length}`);
  // };


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
            <p>Removed PMIDs: <strong>{removedTodayPMIS.length}</strong></p>
            {/* <p>Duplicate Hits from the Master tracker: <strong>{todaysRemovedPMIDs.length}</strong></p> */}
            <p>Total duplicates:<strong>{todaysDuplicateCount}</strong> </p>
            <p>Total Uniques : <strong>{todaysUniqueCount}</strong></p>

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

