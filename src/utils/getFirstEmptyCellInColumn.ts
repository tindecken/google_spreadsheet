import { sheets_v4 } from 'googleapis';
import getAuthenticatedSheets from './getAuthenticatedSheets';

const SPREADSHEET_ID = process.env.SPREADSHEET_ID;

if (!SPREADSHEET_ID) {
    throw new Error('SPREADSHEET_ID environment variable is not defined');
}

/**
 * Helper function to convert column letter to index (A -> 0, B -> 1, etc.)
 */
const letterToColumn = (letters: string): number => {
  let column = 0;
  const upperLetters = letters.toUpperCase();
  for (let i = 0; i < upperLetters.length; i++) {
    column = column * 26 + (upperLetters.charCodeAt(i) - 64);
  }
  return column - 1; // Convert to 0-based index
};

/**
 * Find the first empty cell in a specified column of a Google Sheet
 * @param sheetName - The name of the sheet/tab
 * @param column - The column letter (e.g., 'A', 'B', 'AB')
 * @param spreadsheetId - Optional spreadsheet ID (defaults to env variable)
 * @returns Object containing cell address, row number, and column letter
 * @throws Error if parameters are invalid or operation fails
 */
export async function getFirstEmptyCellInColumn(
  sheetName: string = "T",
  column: string,
  spreadsheetId: string = SPREADSHEET_ID!
): Promise<string> {
  // Validate required parameters
  if (!sheetName || !column) {
    throw new Error("Missing required parameters: sheetName and column");
  }
  
  // Validate column format (should be A-Z letters only)
  const columnPattern = /^[A-Z]+$/i;
  if (!columnPattern.test(column)) {
    throw new Error("Invalid column format. Please use column letters (A, B, C, etc.)");
  }
  
  const colIndex = letterToColumn(column);
  
  // Get authenticated sheets instance
  const sheets = await getAuthenticatedSheets();

  // Get spreadsheet metadata to access merge information
  const spreadsheetData = await sheets.spreadsheets.get({
    spreadsheetId,
    includeGridData: false,
  });

  // Find the sheet by name to get its merges
  const targetSheet = spreadsheetData.data.sheets?.find(
    (sheet) => sheet.properties?.title === sheetName
  );
  const merges = targetSheet?.merges || [];

  // Helper function to check if a cell is part of a merged range
  const isCellMerged = (rowIdx: number, colIdx: number): boolean => {
    for (const merge of merges) {
      const startRow = merge.startRowIndex || 0;
      const endRow = merge.endRowIndex || 0;
      const startCol = merge.startColumnIndex || 0;
      const endCol = merge.endColumnIndex || 0;
      
      if (rowIdx >= startRow && rowIdx < endRow &&
          colIdx >= startCol && colIdx < endCol) {
        return true;
      }
    }
    return false;
  };

  // Get all values from the sheet
  const result = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}`,
  });

  const rows = result.data.values;
  
  if (!rows || rows.length === 0) {
    // Sheet is empty, so first empty cell is at row 1
    const cellAddress = `${column.toUpperCase()}1`;
    console.log(`Sheet "${sheetName}" is empty. First empty cell is ${cellAddress}`);
    return cellAddress
  }

  // Find the first empty cell in the specified column
  let firstEmptyRow = 1; // Start at row 1 (1-based)
  
  for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex];
    
    // Skip if this cell is part of a merged range
    if (isCellMerged(rowIndex, colIndex)) {
      firstEmptyRow = rowIndex + 2; // Skip merged cell, continue to next row
      continue;
    }
    
    // Check if the column exists in this row and has a value
    if (colIndex < row.length && row[colIndex] !== null && row[colIndex] !== undefined && row[colIndex] !== '') {
      // Cell has a value, continue to next row
      firstEmptyRow = rowIndex + 2; // Next row (1-based + 1)
    } else {
      // Found an empty cell
      firstEmptyRow = rowIndex + 1;
      break;
    }
  }
  
  const cellAddress = `${column.toUpperCase()}${firstEmptyRow}`;
  console.log(`First empty cell in column ${column} of sheet "${sheetName}" is ${cellAddress}`);
  return cellAddress
}

export default getFirstEmptyCellInColumn;