import { Hono } from "hono";
import { getTransactionColumn } from '../utils/getTransactionColumn';
import { getFirstEmptyCellInColumn } from '../utils/getFirstEmptyCellInColumn'
import getAuthenticatedSheets from '../utils/getAuthenticatedSheets';
import getPerDay from '../utils/getPerDay';
import { tbValidator } from '@hono/typebox-validator'
import Type from 'typebox'
import type { GenericResponseInterface } from '../models/GenericResponseInterface';
import getFirstSheet from "../utils/getFirstSheet";

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
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${transactionSheet}!${transacitonCell}`,
      valueInputOption: "USER_ENTERED", // use RAW if you don't want Sheets to parse input
      requestBody: resource,
    });
    if (isCountForNhi) {
        // TODO: Perform the update in First Sheet, Nhi
        // Get the first sheet name
        const fistSheeName = await getFirstSheet(SPREADSHEET_ID);
        const NhiTransactionCell = await getFirstEmptyCellInColumn(fistSheeName, 'C7', SPREADSHEET_ID);
        await sheets.spreadsheets.values.update({
          spreadsheetId: SPREADSHEET_ID,
          range: `${fistSheeName}!${NhiTransactionCell}`,
          valueInputOption: "USER_ENTERED", // use RAW if you don't want Sheets to parse input
          requestBody: { values: [[note, price, isPaybyCash ? "x" : ""]] },
        });
        // TODO: Perform the update in First Sheet, ta or tv column
        let cell: string = ''
        if (isPaybyCash) {
          cell='D2'
        } else {
          cell='D1'
        }
        const currentCellRes = await sheets.spreadsheets.values.get({
          spreadsheetId: SPREADSHEET_ID,
          range: `${fistSheeName}!${cell}`,
        });
        const currentRaw = (currentCellRes.data.values && currentCellRes.data.values[0]
          && currentCellRes.data.values[0][0]) ?? 0;
        const current = Number(currentRaw) || 0;
        const newValue = current + price;
        await sheets.spreadsheets.values.update({
          spreadsheetId: SPREADSHEET_ID,
          range: `${fistSheeName}!${cell}`,
          valueInputOption: "USER_ENTERED", // use RAW if you don't want Sheets to parse input
          requestBody: { values: [[newValue]] },
        });
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