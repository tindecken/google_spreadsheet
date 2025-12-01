import { Hono } from "hono";
import { getTransactionColumn } from '../utils/getTransactionColumn';
import { getFirstEmptyCellInColumn } from '../utils/getFirstEmptyCellInColumn'
import getAuthenticatedSheets from '../utils/getAuthenticatedSheets';
import getPerDay from '../utils/getPerDay';
import { tbValidator } from '@hono/typebox-validator'
import Type from 'typebox'
import type { GenericResponseInterface } from '../models/GenericResponseInterface';

export const last5Transactions = new Hono();

// ID of your target spreadsheet (the long ID from the URL)
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const transactionSheet = "T"

last5Transactions.get('/last5Transactions', async (c) => {
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

// Helper function to convert column letter to index (A -> 0, B -> 1, etc.)
const letterToColumn = (letters: string): number => {
  let column = 0;
  const upperLetters = letters.toUpperCase();
  for (let i = 0; i < upperLetters.length; i++) {
    column = column * 26 + (upperLetters.charCodeAt(i) - 64);
  }
  return column - 1; // Convert to 0-based index
};