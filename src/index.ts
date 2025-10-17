import { Hono } from 'hono'
import type { GenericResponseInterface } from './models/GenericResponseInterface';
import { tbValidator } from '@hono/typebox-validator'
import Type from 'typebox'
import getAuthenticatedSheets from './utils/getAuthenticatedSheets';
import { getFirstEmptyCellInColumn } from './utils/getFirstEmptyCellInColumn';
import { getTransactionColumn } from './utils/getTransactionColumn';
import getPerDay from './utils/getPerDay';

// ID of your target spreadsheet (the long ID from the URL)
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;

if (!SPREADSHEET_ID) {
    throw new Error('SPREADSHEET_ID environment variable is not defined');
}
const transactionSheet = "T"
const app = new Hono()

const updateSchema = Type.Object({
  note: Type.String(),
  price: Type.Number(),
  isPaybyCash: Type.Boolean(),
})
app.post('/addTransaction', tbValidator('json', updateSchema), async (c) => {
  try {
    const body = await c.req.json();
    const { note, price, isPaybyCash } = body;
    
    const transactionColumn = await getTransactionColumn(transactionSheet, "Date", SPREADSHEET_ID);
    const transacitonCell = await getFirstEmptyCellInColumn(transactionSheet, transactionColumn, SPREADSHEET_ID);
    // Get current day of the month
    const day = new Date().getDate();
    
    // Get authenticated sheets instance
    const sheets = await getAuthenticatedSheets();
    // Data to update
    const values = [[day, note, price, isPaybyCash ? "x" : ""]];

    // Prepare the request body
    const resource = { values };

    // Perform the update
    const result = await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${transactionSheet}!${transacitonCell}`,
      valueInputOption: "USER_ENTERED", // use RAW if you don't want Sheets to parse input
      requestBody: resource,
    });
    const perDay = await getPerDay()
    const responseData = {
      sheet: transactionSheet,
      cell: transacitonCell,
      day,
      note,
      price,
      isPaybyCash,
      perDay
    }
    const res: GenericResponseInterface = {
      success: true,
      message: 'Add transaction successfully.',
      data: responseData,
    };
    return c.json(res, 200);
  } catch (error: any) {
    const response: GenericResponseInterface = {
      success: false,
      message: error
        ? `Error while update cells: ${error}${error.code ? ` - ${error.code}` : ""}`
        : "Error while update cells",
      data: null,
    };
    return c.json(response, 500);
  }
})

export default app
 