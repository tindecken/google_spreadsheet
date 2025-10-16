import getAuthenticatedSheets from './getAuthenticatedSheets';

const SPREADSHEET_ID = process.env.SPREADSHEET_ID || "";

interface GetPreviousColumnResult {
  previousColumn: string;
  cellAddress: string;
  rowNumber: number;
}

/**
 * Helper function to convert column index to letter (0 -> A, 1 -> B, etc.)
 */
const columnToLetter = (column: number): string => {
  let temp: number;
  let letter = '';
  while (column >= 0) {
    temp = column % 26;
    letter = String.fromCharCode(temp + 65) + letter;
    column = Math.floor(column / 26) - 1;
  }
  return letter;
};

/**
 * Search for a value in a Google Sheet and return the previous column letter
 * @param sheetName - The name of the sheet/tab to search in
 * @param searchValue - The value to search for
 * @param spreadsheetId - Optional spreadsheet ID (defaults to env variable)
 * @returns Object containing previous column letter, cell address, and row number
 * @throws Error if value not found, in column A, or operation fails
 */
export async function getPreviousColumnByValue(
  sheetName: string = "T",
  searchValue: string,
  spreadsheetId: string = SPREADSHEET_ID
): Promise<GetPreviousColumnResult> {
  // Validate required parameters
  if (!sheetName || searchValue === undefined || searchValue === null) {
    throw new Error("Missing required parameters: sheetName and searchValue");
  }
  
  // Get authenticated sheets instance
  const sheets = await getAuthenticatedSheets();

  // Get all values from the sheet
  const result = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}`,
  });

  const rows = result.data.values;
  
  if (!rows || rows.length === 0) {
    throw new Error(`Sheet "${sheetName}" is empty or not found`);
  }

  // Search for the value in the sheet
  for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex];
    for (let colIndex = 0; colIndex < row.length; colIndex++) {
      const cellValue = row[colIndex];
      // Convert cell value to string for comparison
      const cellValueStr = cellValue !== null && cellValue !== undefined ? String(cellValue).trim() : '';
      const searchValueStr = String(searchValue).trim();
      
      if (cellValueStr === searchValueStr) {
        // Found the value, now get the previous column
        if (colIndex === 0) {
          // Cell is in column A, no previous column
          throw new Error(`Value "${searchValue}" found in column A (no previous column exists)`);
        }
        
        // Get previous column letter
        const previousColumnIndex = colIndex - 1;
        const previousColumnLetter = columnToLetter(previousColumnIndex);
        const currentColumnLetter = columnToLetter(colIndex);
        const rowNumber = rowIndex + 1; // 1-based row number
        const cellAddress = `${currentColumnLetter}${rowNumber}`;
        
        return {
          previousColumn: previousColumnLetter,
          cellAddress,
          rowNumber
        };
      }
    }
  }

  // Value not found
  throw new Error(`Value "${searchValue}" not found in sheet "${sheetName}"`);
}

export default getPreviousColumnByValue;