import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

// Connection settings, shared by the app and by the db:init script.
// Cloud databases (TiDB Cloud, Aiven, ...) require an encrypted connection: set DB_SSL=true.
export function connectionConfig() {
  const config = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    port: Number(process.env.DB_PORT) || 3306
  };
  if (String(process.env.DB_SSL).toLowerCase() === 'true') {
    config.ssl = {
      minVersion: 'TLSv1.2',
      // Set DB_SSL_REJECT_UNAUTHORIZED=false only if your provider uses its own certificate authority
      rejectUnauthorized: String(process.env.DB_SSL_REJECT_UNAUTHORIZED).toLowerCase() !== 'false'
    };
  }
  return config;
}

export const DB_NAME = process.env.DB_NAME || 'erp_db';

const pool = mysql.createPool({
  ...connectionConfig(),
  database: DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

export default pool;
