import { Hono } from 'hono'
import { cors } from 'hono/cors'

import { readFileSync } from 'fs';
import { addTransaction } from './routes/addTransaction';
import { undoTransaction } from './routes/undoTransaction';
import { lastTransaction } from './routes/lastTransaction';
import { last5Transactions } from './routes/last5Transactions';
import { perDay } from './routes/perDay';

// ID of your target spreadsheet (the long ID from the URL)
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;

if (!SPREADSHEET_ID) {
  throw new Error('SPREADSHEET_ID environment variable is not defined');
}
const transactionSheet = "T"
const app = new Hono().basePath('/api')
app.use('/*', cors({
  origin: ['https://localhost:57042', 'https://d3.tindecken.xyz'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'Accept'],
  credentials: true,
  exposeHeaders: ['Content-Length', 'X-Kuma-Revision', 'X-Retry-After'],
  maxAge: 10 * 60
}))

app.route("/", addTransaction)
app.route("/", undoTransaction)
app.route("/", lastTransaction)
app.route("/", last5Transactions)
app.route("/", perDay)

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
