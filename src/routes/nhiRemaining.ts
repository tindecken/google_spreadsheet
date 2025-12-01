import { Hono } from "hono";
import type { GenericResponseInterface } from '../models/GenericResponseInterface';
import getNhiRemaining from "../utils/getNhiRemaining";

export const nhiRemaining = new Hono();



nhiRemaining.get('/nhiRemaining', async (c) => {
  try {
    const nhiRemaining = await getNhiRemaining();

    const res: GenericResponseInterface = {
      success: true,
      message: 'Retrieved per day successfully',
      data: {
        nhiRemaining: nhiRemaining
      },
    };
    return c.json(res, 200);
  } catch (error: any) {
    const response: GenericResponseInterface = {
      success: false,
      message: error
        ? `Error while retrieving Nhi remaining: ${error}${error.code ? ` - ${error.code}` : ""}`
        : "Error while retrieving Nhi remaining",
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