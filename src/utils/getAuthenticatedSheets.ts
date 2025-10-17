import { google, sheets_v4, Auth } from 'googleapis';
import * as path from "path";

// src/utils/getAuthenticatedSheets.ts
// Path to your service account key file
const GOOGLE_APPLICATION_CREDENTIALS = process.env.GOOGLE_APPLICATION_CREDENTIALS;

if (!GOOGLE_APPLICATION_CREDENTIALS) {
    throw new Error('GOOGLE_APPLICATION_CREDENTIALS environment variable is not defined');
}

const SERVICE_ACCOUNT_FILE = path.join(__dirname, "..", "..", GOOGLE_APPLICATION_CREDENTIALS);

export default async function getAuthenticatedSheets(): Promise<sheets_v4.Sheets> {
    const auth: Auth.GoogleAuth = new google.auth.GoogleAuth({
      keyFile: SERVICE_ACCOUNT_FILE,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    // Create Sheets API instance with authenticated client
    const sheets = google.sheets({ version: "v4", auth });
    return sheets;
}