import { Hono } from 'hono'
import { google } from "googleapis";
import * as path from "path";
import type { GenericResponseInterface } from './GenericResponseInterface';
import { tbValidator } from '@hono/typebox-validator'
import Type from 'typebox'

// Path to your service account key file
const SERVICE_ACCOUNT_FILE = path.join(__dirname, "feisty-reef-475204-c1-00d911536c19.json");

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
    
    // Load credentials and authenticate
    const auth = new google.auth.GoogleAuth({
      keyFile: SERVICE_ACCOUNT_FILE,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    // Create Sheets API instance with authenticated client
    const sheets = google.sheets({ version: "v4", auth });
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

export default app
 