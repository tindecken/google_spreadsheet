import { Hono } from "hono";
import { getTransactionColumn } from '../utils/getTransactionColumn';
import { getFirstEmptyCellInColumn } from '../utils/getFirstEmptyCellInColumn'
import getAuthenticatedSheets from '../utils/getAuthenticatedSheets';
import getPerDay from '../utils/getPerDay';
import { tbValidator } from '@hono/typebox-validator'
import Type from 'typebox'
import type { GenericResponseInterface } from '../models/GenericResponseInterface';

export const addTransaction = new Hono();

// ID of your target spreadsheet (the long ID from the URL)
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const transactionSheet = "T"

const updateSchema = Type.Object({
  day: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  note: Type.String({ maxLength: 255 }),
  price: Type.Number(),
  isCountForNhi: Type.Boolean(),
  isPaybyCash: Type.Boolean(),

})
addTransaction.post('/addTransaction', tbValidator('json', updateSchema), async (c) => {
  try {
    const body = await c.req.json();
    let { day, note, price, isPaybyCash, isCountForNhi } = body;

    const transactionColumn = await getTransactionColumn(transactionSheet, "Date", SPREADSHEET_ID);
    const transacitonCell = await getFirstEmptyCellInColumn(transactionSheet, `${transactionColumn}2`, SPREADSHEET_ID);
    if (day == null || day == undefined || day === "") {
      day = new Date().getDate();
    }

    // Get authenticated sheets instance
    const sheets = await getAuthenticatedSheets();
    // Data to update
    const values = [[day, note, price, isPaybyCash ? "x" : ""]];

    // Prepare the request body
    const resource = { values };

    // get per day value before update
    const perDayBefore = await getPerDay()
    // Perform the update in Transaction Sheet
    const result = await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${transactionSheet}!${transacitonCell}`,
      valueInputOption: "USER_ENTERED", // use RAW if you don't want Sheets to parse input
      requestBody: resource,
    });
    if (isCountForNhi) {
        // TODO: Perform the update in First Sheet, Nhi
        // TODO: Perform the update in First Sheet, ta or tv column
    }
    
    // get updated per day value
    const perDayAfter = await getPerDay()
    const responseData = {
      sheet: transactionSheet,
      cell: transacitonCell,
      day,
      note,
      price,
      isCountForNhi,
      isPaybyCash,
      perDayBefore,
      perDayAfter
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