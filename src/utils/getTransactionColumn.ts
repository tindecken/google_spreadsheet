import getAuthenticatedSheets from './getAuthenticatedSheets';

const SPREADSHEET_ID = process.env.SPREADSHEET_ID;

if (!SPREADSHEET_ID) {
    throw new Error('SPREADSHEET_ID environment variable is not defined');
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
 * Search for a value in a Google Sheet and return the last column letter that contains the value
 * @param sheetName - The name of the sheet/tab to search in
 * @param searchValue - The value to search for
 * @param spreadsheetId - Optional spreadsheet ID (defaults to env variable)
 * @returns column letter of the last column containing the value
 * @throws Error if value not found or operation fails
 */
export async function getTransactionColumn(
  sheetName: string = "T",
  searchValue: string = "Date",
  spreadsheetId: string = SPREADSHEET_ID!
): Promise<string> {
  
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

  let lastColumnIndex = -1;

  // Search for the value in the sheet and track the last column containing it
  for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex];
    for (let colIndex = 0; colIndex < row.length; colIndex++) {
      const cellValue = row[colIndex];
      // Convert cell value to string for comparison
      const cellValueStr = cellValue !== null && cellValue !== undefined ? String(cellValue).trim() : '';
      const searchValueStr = String(searchValue).trim();
      
      if (cellValueStr === searchValueStr) {
        // Update lastColumnIndex if this column is further to the right
        if (colIndex > lastColumnIndex) {
          lastColumnIndex = colIndex;
        }
      }
    }
  }

  // Check if we found any matching columns
  if (lastColumnIndex === -1) {
    throw new Error(`Value "${searchValue}" not found in sheet "${sheetName}"`);
  }

  // Convert the column index to letter and return
  const columnLetter = columnToLetter(lastColumnIndex);
  console.log(`Found "${searchValue}" in column ${columnLetter} (index ${lastColumnIndex})`);
  return columnLetter
}

export default getTransactionColumn;