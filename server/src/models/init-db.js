// Creates the database tables from db.sql (and the starter data).
//   Manual:     npm run db:init
//   Automatic:  server.js calls initDatabase() when the "users" table does not exist yet.
// Works on XAMPP and on cloud MySQL. Safe to run again: db.sql never drops or duplicates data.
import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';
import { fileURLToPath } from 'url';
import { connectionConfig, DB_NAME } from '../config/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function initDatabase() {
  if (!/^[A-Za-z0-9_]+$/.test(DB_NAME)) throw new Error(`DB_NAME "${DB_NAME}" has unusual characters`);

  // db.sql starts with CREATE DATABASE / USE for XAMPP; here the database comes from DB_NAME instead.
  const sql = fs.readFileSync(path.join(__dirname, 'db.sql'), 'utf8')
    .replace(/^\s*CREATE DATABASE[^;]*;/im, '')
    .replace(/^\s*USE\s+[^;]*;/im, '');

  const connection = await mysql.createConnection({ ...connectionConfig(), multipleStatements: true });
  try {
    try {
      await connection.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\``);
    } catch (err) {
      // Some cloud users may not create databases; that is fine if it already exists.
      console.warn(`Could not create database "${DB_NAME}" (${err.code}); trying to use it anyway.`);
    }
    await connection.query(`USE \`${DB_NAME}\``);
    await connection.query(sql);
    console.log(`Database "${DB_NAME}" is ready.`);
  } finally {
    await connection.end();
  }
}

// Run directly: npm run db:init
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  initDatabase().then(() => process.exit(0)).catch((err) => {
    console.error('db:init failed:', err.message);
    process.exit(1);
  });
}
