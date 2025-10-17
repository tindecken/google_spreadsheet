import getAuthenticatedSheets from './getAuthenticatedSheets';

const SPREADSHEET_ID = process.env.SPREADSHEET_ID;

if (!SPREADSHEET_ID) {
    throw new Error('SPREADSHEET_ID environment variable is not defined');
}

/**
 * Get the first sheet name from a Google Spreadsheet
 * @param spreadsheetId - Optional spreadsheet ID (defaults to env variable)
 * @returns The name of the first sheet in the spreadsheet
 * @throws Error if spreadsheet is empty or operation fails
 */
export async function getFirstSheet(
  spreadsheetId: string = SPREADSHEET_ID!
): Promise<string> {
  // Get authenticated sheets instance
  const sheets = await getAuthenticatedSheets();

  // Get spreadsheet metadata
  const spreadsheetData = await sheets.spreadsheets.get({
    spreadsheetId,
    includeGridData: false,
  });

  const sheetsList = spreadsheetData.data.sheets;

  if (!sheetsList || sheetsList.length === 0) {
    throw new Error(`Spreadsheet "${spreadsheetId}" is empty or has no sheets`);
  }

  // Get the first sheet's title
  const firstSheet = sheetsList[0];
  const sheetName = firstSheet.properties?.title;

  if (!sheetName) {
    throw new Error('First sheet does not have a title');
  }

  console.log(`First sheet name: "${sheetName}"`);
  return sheetName;
}

export default getFirstSheet;