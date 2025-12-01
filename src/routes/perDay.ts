import { Hono } from "hono";
import getPerDay from '../utils/getPerDay';
import type { GenericResponseInterface } from '../models/GenericResponseInterface';

export const perDay = new Hono();



perDay.get('/perDay', async (c) => {
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