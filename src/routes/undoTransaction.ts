import { Hono } from "hono";
import { getTransactionColumn } from '../utils/getTransactionColumn';
import { getFirstEmptyCellInColumn } from '../utils/getFirstEmptyCellInColumn'
import getAuthenticatedSheets from '../utils/getAuthenticatedSheets';
import getPerDay from '../utils/getPerDay';
import { tbValidator } from '@hono/typebox-validator'
import Type from 'typebox'
import type { GenericResponseInterface } from '../models/GenericResponseInterface';

export const undoTransaction = new Hono();

// ID of your target spreadsheet (the long ID from the URL)
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const transactionSheet = "T"

undoTransaction.post('/undoTransaction', async (c) => {
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

// Helper function to convert column letter to index (A -> 0, B -> 1, etc.)
const letterToColumn = (letters: string): number => {
  let column = 0;
  const upperLetters = letters.toUpperCase();
  for (let i = 0; i < upperLetters.length; i++) {
    column = column * 26 + (upperLetters.charCodeAt(i) - 64);
  }
  return column - 1; // Convert to 0-based index
};