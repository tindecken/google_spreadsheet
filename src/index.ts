import { Hono } from 'hono'
import type { GenericResponseInterface } from './models/GenericResponseInterface';
import { tbValidator } from '@hono/typebox-validator'
import Type from 'typebox'
import getAuthenticatedSheets from './utils/getAuthenticatedSheets';
import { getFirstEmptyCellInColumn } from './utils/getFirstEmptyCellInColumn';
import { getPreviousColumnByValue } from './utils/getPreviousColumnByValue';

// ID of your target spreadsheet (the long ID from the URL)
const SPREADSHEET_ID = process.env.SPREADSHEET_ID || "";
const transactionSheet = "T"
const app = new Hono()

const updateSchema = Type.Object({
  range: Type.String(),
  note: Type.String(),
  price: Type.Number(),
  isPaybyCash: Type.Boolean(),
})
app.post('/addTransaction', tbValidator('json', updateSchema), async (c) => {
  try {
    const body = await c.req.json();
    const { range, note, price, isPaybyCash } = body;
    
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
      range: `${transactionSheet}!${range}`,
      valueInputOption: "USER_ENTERED", // use RAW if you don't want Sheets to parse input
      requestBody: resource,
    });
    const res: GenericResponseInterface = {
      success: true,
      message: `${result.data.updatedCells} cell(s) updated.`,
      data: null,
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


const getCellbyValueSchema = Type.Object({
  sheetName: Type.String(),
})
app.get('/getPreviousColumnByValue', tbValidator('query', getCellbyValueSchema), async (c) => {
  try {
    const sheetName = c.req.query("sheetName");
    
    // Get current month and year
    const now = new Date();
    const currentMonth = now.getMonth(); // getMonth() returns 0-11
    const currentYear = now.getFullYear();
    const value = `${currentMonth}/${currentYear}`;
    
    // Call the utility function
    const result = await getPreviousColumnByValue(sheetName!, value, SPREADSHEET_ID);
    
    const res: GenericResponseInterface = {
      success: true,
      message: `Found value "${value}" at cell ${result.cellAddress}, previous column is ${result.previousColumn}`,
      data: result.previousColumn,
    };
    return c.json(res, 200);
  } catch (error: any) {
    const response: GenericResponseInterface = {
      success: false,
      message: error.message || "Error while searching for cell",
      data: null,
    };
    return c.json(response, error.message?.includes("not found") || error.message?.includes("column A") ? 404 : 500);
  }
})

const getFirstEmptyCellSchema = Type.Object({
  sheetName: Type.String(),
  column: Type.String(),
})
app.get('/getFirstEmptyCellInColumn', tbValidator('query', getFirstEmptyCellSchema), async (c) => {
  try {
    const sheetName = c.req.query("sheetName");
    const column = c.req.query("column");
    
    // Call the utility function
    const result = await getFirstEmptyCellInColumn(sheetName!, column!, SPREADSHEET_ID);
    
    const res: GenericResponseInterface = {
      success: true,
      message: `First empty cell in column ${result.column} is ${result.cellAddress}`,
      data: result.cellAddress,
    };
    return c.json(res, 200);
  } catch (error: any) {
    const response: GenericResponseInterface = {
      success: false,
      message: error.message || "Error while finding empty cell",
      data: null,
    };
    return c.json(response, error.message?.includes("Invalid") || error.message?.includes("Missing") ? 400 : 500);
  }
})
export default app
 