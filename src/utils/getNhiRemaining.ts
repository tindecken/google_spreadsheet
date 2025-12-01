import getAuthenticatedSheets from './getAuthenticatedSheets';
import getFirstSheet from './getFirstSheet';

const SPREADSHEET_ID = process.env.SPREADSHEET_ID;

if (!SPREADSHEET_ID) {
    throw new Error('SPREADSHEET_ID environment variable is not defined');
}

/**
 * Get the "Per Day" value from the first sheet
 * Finds the cell containing "Per Day" and returns the value from the cell directly below it
 * @param spreadsheetId - Optional spreadsheet ID (defaults to env variable)
 * @returns The value from the cell below "Per Day" as a string
 * @throws Error if "Per Day" cell is not found or operation fails
 */
export async function getNhiRemaining(
  spreadsheetId: string = SPREADSHEET_ID!
): Promise<string> {
  // Get authenticated sheets instance
  const sheets = await getAuthenticatedSheets();
  
  // Get the first sheet name
  const sheetName = await getFirstSheet(spreadsheetId);

  // Search for "N Remain" in the entire sheet
  const searchResponse = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: sheetName,
  });

  const values = searchResponse.data.values;

  if (!values || values.length === 0) {
    throw new Error(`Sheet "${sheetName}" is empty`);
  }

  // Search for "N Remain" in the sheet
  let nhiRemainingRow = -1;
  let nhiRmainingCol = -1;

  for (let row = 0; row < values.length; row++) {
    for (let col = 0; col < values[row].length; col++) {
      if (values[row][col]?.toString().trim() === 'N Remain') {
        nhiRemainingRow = row;
        nhiRmainingCol = col;
        break;
      }
    }
    if (nhiRemainingRow !== -1) break;
  }

  if (nhiRemainingRow === -1 || nhiRmainingCol === -1) {
    throw new Error('"N Remain" cell not found in the sheet');
  }

  // Get the value from the cell directly below "N Remain"
  const cellBelowRow = nhiRemainingRow + 1;
  
  // Check if the row exists and has a value at the same column
  if (cellBelowRow >= values.length || !values[cellBelowRow] || values[cellBelowRow][nhiRmainingCol] === undefined) {
    throw new Error('No value found below "N Remain" cell');
  }

  const perDayValue = values[cellBelowRow][nhiRmainingCol];
  
  console.log(`Found "N Remain" at row ${nhiRemainingRow + 1}, col ${nhiRmainingCol + 1}, value below: "${perDayValue}"`);
  
  return perDayValue.toString();
}

export default getNhiRemaining;