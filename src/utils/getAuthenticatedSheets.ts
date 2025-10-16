import { google, sheets_v4 } from 'googleapis';

// src/utils/getAuthenticatedSheets.ts

export default async function getAuthenticatedSheets(): Promise<sheets_v4.Sheets> {
    const scopes = ['https://www.googleapis.com/auth/spreadsheets'];
    const credentialsEnv = process.env.GOOGLE_SERVICE_ACCOUNT_KEY; // optional: JSON string of service account
    const keyFile = process.env.GOOGLE_APPLICATION_CREDENTIALS; // optional: path to service account key file

    const authOptions: Record<string, unknown> = { scopes };

    if (keyFile) {
        authOptions.keyFile = keyFile;
    } else if (credentialsEnv) {
        try {
            authOptions.credentials = JSON.parse(credentialsEnv);
        } catch (err) {
            throw new Error('Invalid JSON in GOOGLE_SERVICE_ACCOUNT_KEY environment variable');
        }
    }
    // GoogleAuth will fall back to Application Default Credentials if neither is provided.
    const auth = new google.auth.GoogleAuth(authOptions);

    return google.sheets({ version: 'v4', auth });
}