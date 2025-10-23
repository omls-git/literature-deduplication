import React, { useState, useEffect, useCallback } from "react";
import * as XLSX from "xlsx"; // For handling Excel files
import { saveAs } from "file-saver";
import Papa from "papaparse";
import Button from "@mui/material/Button";
import { Box } from "@mui/material";
import Grid from "@mui/material/Grid";
import CircularProgress from "@mui/material/CircularProgress";

const Embase = () => {
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [csvData, setCsvData] = useState([]);
  const [duplicateRows, setDuplicateRows] = useState([]);
  const [nonDuplicateRows, setNonDuplicateRows] = useState([]);

  const [masterTrackerData, setMasterTrackerData] = useState(null);
  const [masterTrackerFile, setMasterTrackerFile] = useState(null);
  const [allCsvData, setAllCsvData] = useState([]);
  //const [loading, setLoading] = useState(false);
  const [removedDuplicatePUI, setRemovedDuplicatePUI] = useState([]);
  const [todaysuniques, setTodaysUnique] = useState([]);
  const [currentDateToday, setTodayDate] = useState("")
  const [maserTrackeLegth, setMastertrackerTrackerLength] = useState('')
  const [duplicatePuiLength, setDuplicateUPILength] = useState('')

  const [initialMasterTrackerLength, setInitialMasterTrackerLength] = useState('')
  const [puiCounts, setPuiCounts] = useState([]);
  const [filteredNonDuplicateData, setFilteredNonDuplicateData] = useState([]);


  // ✅ Fix: Move detectDuplicates above useEffect and wrap it with useCallback
  const detectDuplicates = useCallback(() => {
    const seenPUIs = new Set();
    const duplicatesList = [];
    const nonDuplicatesList = [];

    allCsvData.forEach((row) => {
      const pui = row.PUI?.toString().trim().toUpperCase();
      if (pui) {
        if (seenPUIs.has(pui)) {
          duplicatesList.push(row);
        } else {
          seenPUIs.add(pui);
          nonDuplicatesList.push(row);
        }
      }
    });

    setDuplicateRows(duplicatesList);
    setNonDuplicateRows(nonDuplicatesList);
    console.log("Duplicate Rows:", duplicatesList.length);
    console.log("Non-Duplicate Rows:", nonDuplicatesList.length);
  }, [allCsvData]);

  // useEffect(() => {
  //   if (allCsvData.length > 0) {
  //     detectDuplicates();
  //   }
  // }, [allCsvData]);
  useEffect(() => {
    if (allCsvData.length > 0) {
      detectDuplicates();
    }
  }, [allCsvData, detectDuplicates]);

  const exportDuplicatesToCsv = () => {
    if (duplicateRows.length === 0) {
      alert("No duplicate rows available to export.");
      return;
    }

    // Convert the duplicatesList to CSV format
    const csv = Papa.unparse(duplicateRows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, "duplicates.csv"); // Use file-saver to trigger download
  };
  // Merging uploaded CSV files
  const handleEmbaseFileUpload = (event) => {
    const files = event.target.files;
    const uploadedFilesArray = Array.from(files);

    // Track uploaded files
    setUploadedFiles((prev) => [...prev, ...uploadedFilesArray]);

    uploadedFilesArray.forEach((file) => {
      const reader = new FileReader();

      reader.onload = ({ target }) => {
        const parsedData = Papa.parse(target.result, { header: true, skipEmptyLines: true }).data;

        // Normalize PUIs
        const cleanedData = parsedData.map((row) => ({
          ...row,
          PUI: row.PUI ? row.PUI.trim().toUpperCase() : "",
        }));

        // Count unique PUIs in this file
        const uniquePUIs = new Set(cleanedData.map(row => row.PUI).filter(pui => pui)); // Exclude empty PUIs

        // Store PUI count for this file
        setPuiCounts((prev) => [...prev, uniquePUIs.size]);

        // Merge with existing data
        setAllCsvData((prevData) => {
          const newAllData = [...prevData, ...cleanedData];
          setCsvData(newAllData); // Update total CSV data
          console.log("All the csv data", newAllData)
          return newAllData;
        });
      };

      reader.readAsText(file);
    });
  };
  // const detectDuplicates = () => {
  //   const seenPUIs = new Set();
  //   const duplicatesList = [];
  //   const nonDuplicatesList = [];

  //   allCsvData.forEach((row) => {
  //     const pui = row.PUI;
  //     if (pui) {
  //       if (seenPUIs.has(pui)) {
  //         duplicatesList.push(row); // Add only if it appears more than once
  //       } else {
  //         seenPUIs.add(pui);
  //         nonDuplicatesList.push(row);
  //       }
  //     }
  //   });

  //   setDuplicateRows(duplicatesList);
  //   setNonDuplicateRows(nonDuplicatesList);
  //   console.log("Duplicate Rows:", duplicatesList.length);
  //   console.log("Non-Duplicate Rows:", nonDuplicatesList.length);
  // };

  const filterNonDuplicateFullData = () => {
    if (!csvData || !nonDuplicateRows) {
      console.error("CSV data or Non-Duplicate Rows are missing!");
      return;
    }

    console.log("Original CSV Data:", csvData);
    console.log("Non-Duplicate PUIs:", nonDuplicateRows.length);

    const nonDuplicatePUIs = new Set(
      nonDuplicateRows.map(row => row.PUI?.toString().trim().toUpperCase())
    );

    const requiredColumns = [
      "Title", "Original Title", "Author Names", "Author Addresses", "Correspondence Address",
      "Editors", "AiP/IP Entry Date", "Full Record Entry Date", "Source", "Source title",
      "Publication Year", "Volume", "Issue", "First Page", "Last Page", "Date of Publication",
      "Publication Type", "Conference Name", "Conference Location", "Conference Date",
      "Conference Editors", "ISSN", "ISBN", "Book Publisher", "Abstract", "Original Abstract",
      "Author Keywords", "Emtree Drug Index Terms (Major Focus)", "Emtree Drug Index Terms",
      "Emtree Medical Index Terms (Major Focus)", "Emtree Medical Index Terms",
      "Drug Tradenames", "Drug Manufacturer", "Device Tradenames", "Device Manufacturer",
      "CAS Registry Numbers", "Molecular Sequence Numbers", "Embase Classification",
      "Clinical Trial Numbers", "Article Language", "Summary Language", "Embase Accession ID",
      "Medline PMID", "PUI", "DOI", "Full Text Link", "Embase Link", "Open URL Link", "Copyright"
    ];

    const uniqueFilteredData = new Map();

    csvData.forEach(row => {
      const pui = row.PUI?.toString().trim().toUpperCase();
      if (pui && nonDuplicatePUIs.has(pui) && !uniqueFilteredData.has(pui)) {
        uniqueFilteredData.set(pui, row);
      }
    });

    const MAX_CELL_LENGTH = 32767;

    const filteredData = Array.from(uniqueFilteredData.values()).map(row => {
      let selectedRow = {};
      const pui = row.PUI?.toString().trim().toUpperCase() || "UNKNOWN";

      requiredColumns.forEach(col => {
        let value = row[col] || "";

        if (typeof value === "string" && value.length > MAX_CELL_LENGTH) {
          console.warn(`Truncating value in column "${col}" for PUI "${pui}" — length was ${value.length}`);
          value = value.slice(0, MAX_CELL_LENGTH - 3) + "...";
        }

        selectedRow[col] = value;
      });

      return selectedRow;
    });

    console.log("Filtered Unique Data Count:", filteredData.length);

    if (filteredData.length === 0) {
      alert("No data available to export!");
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(filteredData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Filtered_NonDuplicates");
    XLSX.writeFile(workbook, "Filtered_NonDuplicates.xlsx");

    setFilteredNonDuplicateData(filteredData);
    console.log(filteredNonDuplicateData);
  };



  const exportToCsv = (data, filename) => {
    if (data.length === 0) {
      alert(`No data available to export for ${filename}`);
      return;
    }

    // Extract only PUI column
    const puiOnlyData = data.map(row => ({ PUI: row.PUI }));

    const csv = Papa.unparse(puiOnlyData);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, filename);
  };



  const handleMasterTrackerUpload = (e) => {
    const file = e.target.files[0];
    setMasterTrackerFile(file); // Save file reference
    console.log(masterTrackerFile)
    if (!file) {
      console.error("No file selected.");
      return;
    }

    const reader = new FileReader();

    reader.onload = (event) => {
      const data = new Uint8Array(event.target.result);
      if (!data || data.length === 0) {
        console.error("File content is null or empty");
        return;
      }

      const workbook = XLSX.read(data, { type: "array" });
      const sheetName = workbook.SheetNames[0]; // Get first sheet
      const sheet = workbook.Sheets[sheetName];

      if (!sheet) {
        console.error("Failed to read sheet data.");
        return;
      }

      // Convert sheet data to JSON
      const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      console.log("Raw JSON Data:", jsonData);
      // Extract columns A and C

      const columnA = jsonData.map((row) => row[0]).filter((val) => val !== undefined && val !== null && val !== "");
      const columnC = jsonData.map((row) => row[2]).filter((val) => val !== undefined && val !== null && val !== "");

      console.log("Extracted Column A PUI:", columnA.length);
      console.log("Extracted Column C PUI:", columnC.length);
      console.log("Total Combined PUI Before Filtering:", columnA.length + columnC.length);
      // Combine both columns into a single array
      const allPUI = [...columnA, ...columnC];
      setInitialMasterTrackerLength(columnA.length + columnC.length - 2);

      console.log("non duplicate PUI:", nonDuplicateRows.length);
      console.log(" non duplicate PUI:", nonDuplicateRows);
      console.log("Total Combined PUI After Filtering:", allPUI.length);
      console.log("All PUI:", allPUI);

      if (!Array.isArray(allPUI) || allPUI.length === 0) {
        console.error("No valid PUI data found.");
        return;
      }
      // Add nonDuplicateRows PUI values to allPUI
      const nonDuplicatePUI = nonDuplicateRows.map(row => row.PUI).filter(pui => pui);

      // Get the current date in the desired format (e.g., YYYY-MM-DD)
      const currentDate = new Date().toISOString().split('T')[0];  // "YYYY-MM-DD" format
      setTodayDate(currentDate)
      console.log(currentDateToday)
      // Combine all PUI and nonDuplicatePUI
      const combinedPUI = [...allPUI, ...nonDuplicatePUI]; // Append nonDuplicateRows PUI

      if (!Array.isArray(combinedPUI) || combinedPUI.length === 0) {
        console.error("No valid PUI data found.");
        return;
      }

      // Format data with the current date for non-duplicates
      const formattedData = combinedPUI.map(pui => ({
        PUI: pui,
        Date: currentDate  // Add the current date to each PUI entry
      }));

      setMasterTrackerData(formattedData);
      setMastertrackerTrackerLength(formattedData.length)
      console.log("Processed Data Length:", formattedData.length);
      console.log("Processed Data:", masterTrackerData);
      console.log(maserTrackeLegth)

    };

    reader.readAsArrayBuffer(file);
  };

  // const RemoveDuplicatePUI = () => {
  //   if (!masterTrackerData || masterTrackerData.length === 0) {
  //     console.error("No valid data found to update Master Tracker.");
  //     return;
  //   }
  // }
  const RemoveDuplicatePUI = () => {
    if (!masterTrackerData || masterTrackerData.length === 0) {
      console.error("No valid data found to update Master Tracker.");
      return;
    }

    // Step 1: Find duplicates based on PUI
    const seen = new Set();
    const duplicates = [];
    const nonDuplicates = [];

    // Identify duplicates and non-duplicates
    masterTrackerData.forEach((row) => {
      const pui = row.PUI;
      if (pui) {
        if (seen.has(pui)) {
          duplicates.push(row); // Add to duplicates if already seen
        } else {
          seen.add(pui);
          nonDuplicates.push(row); // Add to non-duplicates if not seen
        }
      }
    });

    // Step 2: Remove duplicates from masterTrackerData
    const filteredMasterTrackerData = masterTrackerData.filter((row) => !duplicates.some((duplicate) => duplicate.PUI === row.PUI));

    // Step 3: Set state variables for filtered data and removed duplicates
    setMasterTrackerData(filteredMasterTrackerData); // Update master tracker without duplicates
    setRemovedDuplicatePUI(duplicates); // Store the removed duplicates in the state variable
    setDuplicateUPILength(duplicates.length)
    console.log("Removed Duplicate PUIs:", duplicates.length);
    console.log("Updated Master Tracker Data (without duplicates):", filteredMasterTrackerData);
    console.log(removedDuplicatePUI)
    // Get today's date in the same format (YYYY-MM-DD)
    const currentDate = new Date().toISOString().split('T')[0];  // "YYYY-MM-DD" format

    // Step 1: Filter the masterTrackerData to get the PUIs added today
    const addedTodayPUIs = filteredMasterTrackerData.filter((row) => row.Date === currentDate)
      .map((row) => row.PUI);

    // Step 2: Log or use the addedTodayPUIs
    console.log("PUIs added today:", addedTodayPUIs);
    console.log("Total PUIs added today:", addedTodayPUIs.length);
  };





  const ShowTodaysPUI = () => {
    if (!masterTrackerData || !nonDuplicateRows) {
      console.error("No data to compare.");
      return;
    }

    // Extract the PUIs from both arrays
    const masterTrackerPUIs = masterTrackerData.map(row => row.PUI);
    const nonDuplicatePUIs = nonDuplicateRows.map(row => row.PUI);

    // Find common PUIs
    const commonPUIs = masterTrackerPUIs.filter(pui => nonDuplicatePUIs.includes(pui));

    console.log("Common PUIs:", commonPUIs);
    console.log("Total Common PUIs:", commonPUIs.length);

    setTodaysUnique(commonPUIs)
    console.log("setTodaysUnique", commonPUIs)
    if (commonPUIs.length === 0) {
      console.warn("No common PUIs found.");
      return;
    }

    // Convert commonPUIs array into a format suitable for XLSX
    const worksheetData = commonPUIs.map(pui => ({ PUI: pui }));

    // Create a worksheet
    const worksheet = XLSX.utils.json_to_sheet(worksheetData);

    // Create a workbook
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Common_PUIs");

    // Generate Excel file and trigger download
    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const blob = new Blob([excelBuffer], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);

    // Create a temporary download link
    const a = document.createElement("a");
    a.href = url;
    a.download = "Common_PUIs.xlsx";
    document.body.appendChild(a);
    a.click();

    // Cleanup
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };


  // ✅ Create Unique Full Data (One row per matching PUI)
const getUniqueFullData = () => {
  if (!todaysuniques || todaysuniques.length === 0) {
    alert("No PUIs found. Please run 'Update & Download Master Tracker' first.");
    return;
  }

  if (!csvData || csvData.length === 0) {
    alert("CSV data not available. Please upload Embase files first.");
    return;
  }

  const todaysSet = new Set(
    todaysuniques.map(pui => pui?.toString().trim().toUpperCase())
  );

  const seenPUIs = new Set();
  const matchedData = [];

  for (const row of csvData) {
    const pui = row?.PUI?.toString().trim().toUpperCase();
    if (todaysSet.has(pui) && !seenPUIs.has(pui)) {
      matchedData.push(row);
      seenPUIs.add(pui);
    }
  }

  console.log("✅ Matched PUIs count:", matchedData.length);

  if (matchedData.length === 0) {
    alert("No matching PUIs found in CSV data.");
    return;
  }

  // ✅ Truncate long text values
  const MAX_CELL_LENGTH = 32767;
  const truncatedData = matchedData.map(row => {
    const newRow = {};
    for (const [key, value] of Object.entries(row)) {
      let cellValue = value;
      if (typeof cellValue === "string" && cellValue.length > MAX_CELL_LENGTH) {
        console.warn(`Truncating "${key}" for long value (${cellValue.length} chars)`);
        cellValue = cellValue.slice(0, MAX_CELL_LENGTH - 3) + "...";
      }
      newRow[key] = cellValue;
    }
    return newRow;
  });

  const worksheet = XLSX.utils.json_to_sheet(truncatedData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Unique_Full_Data");

  const today = new Date().toISOString().split("T")[0];
  XLSX.writeFile(workbook, `Unique_Full_Data_${today}.xlsx`);
};


  // ✅ Download the merged CSV data as a file
const downloadMergedCsv = () => {
  if (!csvData || csvData.length === 0) {
    alert("No merged CSV data found. Please upload or merge CSV files first.");
    return;
  }

  console.log("Merged CSV data count:", csvData.length);

  // Create worksheet and workbook
  const worksheet = XLSX.utils.json_to_sheet(csvData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Merged_CSV_Data");

  // Optional: make filename include today’s date
  const today = new Date().toISOString().split("T")[0];
  XLSX.writeFile(workbook, `Merged_CSV_Data_${today}.xlsx`);
};



  return (
    <div>
      <div style={{ backgroundColor: "#FFF3E0", padding: "20px", borderRadius: "10px", marginTop: "20px" }}>
        <h1>Embase</h1>
        <Box sx={{ flexGrow: 1 }}>
          <Grid container spacing={3} pt={1}>
            <Grid item xs>
              <Button variant="contained" component="label">
                Upload CSV Files
                <input type="file" hidden accept=".csv" multiple onChange={handleEmbaseFileUpload} />
              </Button>
            </Grid>
            <Grid item xs>
              <Button variant="contained" onClick={detectDuplicates}>
                Detect Duplicates PUI
              </Button>
            </Grid>
            <Grid item xs>
              <Button variant="contained" onClick={exportDuplicatesToCsv}>
                Export Duplicates to CSV
              </Button>
            </Grid>
            <Grid item xs>
              <Button variant="contained" onClick={filterNonDuplicateFullData}> Filter Non-Duplicate Full Data</Button>
            </Grid>
            <Grid item xs>
              {/* <Button variant="contained" onClick={() => exportToCsv(duplicateRows, "duplicates.csv")}>
                Export Embase DuplicatesPUI
              </Button> */}
              <Button variant="contained" onClick={() => exportToCsv(duplicateRows, "duplicates.csv")}>
                Export Embase Duplicates PUI
              </Button>

            </Grid>
            <Grid item xs>
              {/* <Button variant="contained" onClick={() => exportToCsv(nonDuplicateRows, "non-duplicates.csv")}>
                Export Embase Uniques PUI
              </Button> */}
              <Button variant="contained" onClick={() => exportToCsv(nonDuplicateRows, "non-duplicates.csv")}>
                Export Embase Uniques PUI
              </Button>

            </Grid>

          </Grid>
        </Box>

        <div>
          <h3>Uploaded Files ({uploadedFiles.length}):</h3>
          {uploadedFiles.length > 0 ? (
            <ul>
              {uploadedFiles.map((file, index) => (
                <li key={index}>
                  {file.name} - {file.size} bytes
                  {puiCounts[index] !== undefined && (
                    <> (PUIs: {puiCounts[index]})</>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p>No files uploaded yet.</p>
          )}
        </div>

        <h2>Summary</h2>
        <p>
          Total Number of Hits retrieved: <strong>{csvData.length}</strong>
        </p>
        <p>
          Total Number of duplicates within the Tracker: <strong>{duplicateRows.length}</strong>
        </p>
        <p>
          Total Unique values from the Day Tracker: <strong>{nonDuplicateRows.length}</strong>
        </p>
        <p>
          Total Master tracker records Now: <strong>{initialMasterTrackerLength}</strong>
        </p>
        <p>
          Duplicates with the Master tracker: <strong>{duplicatePuiLength}</strong>
        </p>
        <p>
          Total Unique hits to be assigned for review for The day: <strong>{todaysuniques.length}</strong>
        </p>




        <h3>Upload Master Tracker File (Excel)</h3>
        <Box sx={{ flexGrow: 1 }}>
          <Grid container spacing={3} pt={1}>

            {/* Upload Master Tracker */}
            <Grid item xs>
              <Button variant="contained" component="label" >
                <CircularProgress size={24} />  Upload Master Tracker
                <input type="file" hidden accept=".xlsx" onChange={handleMasterTrackerUpload} />
              </Button>
            </Grid>

            {/* Add Uniques to Master Tracker */}
            <Grid item xs>
              <Button variant="contained" onClick={RemoveDuplicatePUI} >
                <CircularProgress size={24} />  Add Uniques to Master Tracker
              </Button>
            </Grid>

            {/* Update & Download Master Tracker */}
            <Grid item xs>
              <Button variant="contained" onClick={ShowTodaysPUI} >
                <CircularProgress size={24} />  Update & Download Master Tracker
              </Button>
            </Grid>
            <Grid item xs>
              <Button variant="contained" onClick={getUniqueFullData}>
                <CircularProgress size={24} />  Get Unique Full Data
              </Button>
            </Grid>
            <Grid item xs>
              <Button variant="contained" onClick={downloadMergedCsv}>
                Merged CSV Files
              </Button>
            </Grid>


          </Grid>
        </Box>
      </div>
    </div>
  );
};

export default Embase;
