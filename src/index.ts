import { Hono } from 'hono'
import { cors } from 'hono/cors'

import type { GenericResponseInterface } from './models/GenericResponseInterface';
import { tbValidator } from '@hono/typebox-validator'
import Type from 'typebox'
import getAuthenticatedSheets from './utils/getAuthenticatedSheets';
import { getFirstEmptyCellInColumn } from './utils/getFirstEmptyCellInColumn';
import { getTransactionColumn } from './utils/getTransactionColumn';
import getPerDay from './utils/getPerDay';
import { readFileSync } from 'fs';

// ID of your target spreadsheet (the long ID from the URL)
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;

if (!SPREADSHEET_ID) {
  throw new Error('SPREADSHEET_ID environment variable is not defined');
}
const transactionSheet = "T"
const app = new Hono().basePath('/api')
app.use('/*', cors({
  origin: ['https://localhost:57042'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'Accept'],
  credentials: true,
  exposeHeaders: ['Content-Length', 'X-Kuma-Revision', 'X-Retry-After'],
  maxAge: 10 * 60
}))

const updateSchema = Type.Object({
  day: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  note: Type.String({ maxLength: 255 }),
  price: Type.Number(),
  isPaybyCash: Type.Boolean(),
})
app.post('/addTransaction', tbValidator('json', updateSchema), async (c) => {
  try {
    const body = await c.req.json();
    let { day, note, price, isPaybyCash } = body;

    const transactionColumn = await getTransactionColumn(transactionSheet, "Date", SPREADSHEET_ID);
    const transacitonCell = await getFirstEmptyCellInColumn(transactionSheet, transactionColumn, SPREADSHEET_ID);
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
    // Perform the update
    const result = await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${transactionSheet}!${transacitonCell}`,
      valueInputOption: "USER_ENTERED", // use RAW if you don't want Sheets to parse input
      requestBody: resource,
    });
    // get updated per day value
    const perDayAfter = await getPerDay()
    const responseData = {
      sheet: transactionSheet,
      cell: transacitonCell,
      day,
      note,
      price,
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

app.post('/undoTransaction', async (c) => {
  try {
    // Get authenticated sheets instance
    const sheets = await getAuthenticatedSheets();

    // Get the transaction column
    const transactionColumn = await getTransactionColumn(transactionSheet, "Date", SPREADSHEET_ID);

    // Get all values from the transaction sheet
    const result = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${transactionSheet}`,
    });

    const rows = result.data.values;

    if (!rows || rows.length === 0) {
      const response: GenericResponseInterface = {
        success: false,
        message: 'No transactions found to undo',
        data: null,
      };
      return c.json(response, 400);
    }

    // Find the last row with data in the transaction column
    const colIndex = letterToColumn(transactionColumn);
    let lastTransactionRow = -1;

    // Start from the bottom and find the last non-empty cell in the transaction column
    for (let rowIndex = rows.length - 1; rowIndex >= 0; rowIndex--) {
      const row = rows[rowIndex];
      if (row && colIndex < row.length && row[colIndex] !== null && row[colIndex] !== undefined && row[colIndex] !== '') {
        lastTransactionRow = rowIndex;
        break;
      }
    }

    if (lastTransactionRow === -1) {
      const response: GenericResponseInterface = {
        success: false,
        message: 'No transactions found to undo',
        data: null,
      };
      return c.json(response, 400);
    }

    // Get per day value before update
    const perDayBefore = await getPerDay();

    // Clear the entire row of the last transaction
    const rowNumber = lastTransactionRow + 1; // Convert to 1-based row number
    const range = `${transactionSheet}!A${rowNumber}:Z${rowNumber}`;

    // Clear the row values
    await sheets.spreadsheets.values.clear({
      spreadsheetId: SPREADSHEET_ID,
      range: range,
    });

    // Get updated per day value
    const perDayAfter = await getPerDay();

    const responseData = {
      sheet: transactionSheet,
      row: rowNumber,
      perDayBefore,
      perDayAfter
    };

    const res: GenericResponseInterface = {
      success: true,
      message: 'Transaction undone successfully',
      data: responseData,
    };
    return c.json(res, 200);
  } catch (error: any) {
    const response: GenericResponseInterface = {
      success: false,
      message: error
        ? `Error while undoing transaction: ${error}${error.code ? ` - ${error.code}` : ""}`
        : "Error while undoing transaction",
      data: null,
    };
    return c.json(response, 500);
  }
})

app.get('/lastTransaction', async (c) => {
  try {
    // Get authenticated sheets instance
    const sheets = await getAuthenticatedSheets();

    // Get the transaction column
    const transactionColumn = await getTransactionColumn(transactionSheet, "Date", SPREADSHEET_ID);

    // Get all values from the transaction sheet
    const result = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${transactionSheet}`,
    });

    const rows = result.data.values;

    if (!rows || rows.length === 0) {
      const response: GenericResponseInterface = {
        success: false,
        message: 'No transactions found',
        data: null,
      };
      return c.json(response, 404);
    }

    // Find the last row with data in the transaction column
    const colIndex = letterToColumn(transactionColumn);
    let lastTransactionRow = -1;

    // Start from the bottom and find the last non-empty cell in the transaction column
    for (let rowIndex = rows.length - 1; rowIndex >= 0; rowIndex--) {
      const row = rows[rowIndex];
      if (row && colIndex < row.length && row[colIndex] !== null && row[colIndex] !== undefined && row[colIndex] !== '') {
        lastTransactionRow = rowIndex;
        break;
      }
    }

    if (lastTransactionRow === -1) {
      const response: GenericResponseInterface = {
        success: false,
        message: 'No transactions found',
        data: null,
      };
      return c.json(response, 404);
    }

    // Extract the last transaction data
    const lastRow = rows[lastTransactionRow];
    const date = lastRow[colIndex] || '';
    const note = lastRow[colIndex + 1] || '';
    const price = lastRow[colIndex + 2] || 0;
    const isCashed = lastRow[colIndex + 3] === 'x';

    // Get per day value
    const perDay = await getPerDay();

    const lastTransactionData = {
      date,
      note,
      price,
      isCashed,
      perDay
    };

    const res: GenericResponseInterface = {
      success: true,
      message: 'Last transaction retrieved successfully',
      data: lastTransactionData,
    };
    return c.json(res, 200);
  } catch (error: any) {
    const response: GenericResponseInterface = {
      success: false,
      message: error
        ? `Error while retrieving last transaction: ${error}${error.code ? ` - ${error.code}` : ""}`
        : "Error while retrieving last transaction",
      data: null,
    };
    return c.json(response, 500);
  }
})

app.get('/last5Transactions', async (c) => {
  try {
    // Get authenticated sheets instance
    const sheets = await getAuthenticatedSheets();

    // Get the transaction column
    const transactionColumn = await getTransactionColumn(transactionSheet, "Date", SPREADSHEET_ID);

    // Get all values from the transaction sheet
    const result = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${transactionSheet}`,
    });

    const rows = result.data.values;

    if (!rows || rows.length === 0) {
      const response: GenericResponseInterface = {
        success: false,
        message: 'No transactions found',
        data: null,
      };
      return c.json(response, 404);
    }

    // Find all rows with data in the transaction column
    const colIndex = letterToColumn(transactionColumn);
    const transactionRows: number[] = [];

    // Find all non-empty cells in the transaction column
    for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
      const row = rows[rowIndex];
      if (row && colIndex < row.length && row[colIndex] !== null && row[colIndex] !== undefined && row[colIndex] !== '') {
        transactionRows.push(rowIndex);
      }
    }

    if (transactionRows.length === 0) {
      const response: GenericResponseInterface = {
        success: false,
        message: 'No transactions found',
        data: null,
      };
      return c.json(response, 404);
    }

    // Get per day value
    const perDay = await getPerDay();

    // Get the last 5 transactions (or fewer if less than 5 exist)
    const last5Rows = transactionRows.slice(-5).reverse();
    const transactions = last5Rows.map(rowIndex => {
      const row = rows[rowIndex];
      return {
        date: row[colIndex] || '',
        note: row[colIndex + 1] || '',
        price: row[colIndex + 2] || 0,
        isCashed: row[colIndex + 3] === 'x',
        perDay
      };
    });

    const res: GenericResponseInterface = {
      success: true,
      message: 'Last 5 transactions retrieved successfully',
      data: transactions,
    };
    return c.json(res, 200);
  } catch (error: any) {
    const response: GenericResponseInterface = {
      success: false,
      message: error
        ? `Error while retrieving last 5 transactions: ${error}${error.code ? ` - ${error.code}` : ""}`
        : "Error while retrieving last 5 transactions",
      data: null,
    };
    return c.json(response, 500);
  }
})

app.get('/perDay', async (c) => {
  try {
    const perDay = await getPerDay();

    const res: GenericResponseInterface = {
      success: true,
      message: 'Retrieved per day successfully',
      data: {
        perDay
      },
    };
    return c.json(res, 200);
  } catch (error: any) {
    const response: GenericResponseInterface = {
      success: false,
      message: error
        ? `Error while retrieving per day: ${error}${error.code ? ` - ${error.code}` : ""}`
        : "Error while retrieving per day",
      data: null,
    };
    return c.json(response, 500);
  }
})

// Helper function to convert column letter to index (A -> 0, B -> 1, etc.)
const letterToColumn = (letters: string): number => {
  let column = 0;
  const upperLetters = letters.toUpperCase();
  for (let i = 0; i < upperLetters.length; i++) {
    column = column * 26 + (upperLetters.charCodeAt(i) - 64);
  }
  return column - 1; // Convert to 0-based index
};

// Load SSL/TLS certificates
// For development, you can generate self-signed certs using openssl
const isProd = process.env.NODE_ENV === 'production'
console.log('isProd', isProd)
const _options = !isProd
  ? {
    key: readFileSync('./localhost-key.pem'),
    cert: readFileSync('./localhost-cert.pem'),
  }
  : undefined

export default {
  //   hostname: '0.0.0.0',
  port: process.env.PORT || 4000,
  fetch: app.fetch,
  idleTimeout: 60,
  ...(_options ? { tls: _options } : {})
}
