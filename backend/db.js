require('dotenv').config();

const { URL } = require('url');
const mysql = require('mysql2/promise');

function createPoolFromConnectionString(connectionString) {
  if (!connectionString) {
    throw new Error('DATABASE_URL is not defined');
  }

  const url = new URL(connectionString);
  const sslMode = url.searchParams.get('ssl-mode');

  const shouldUseSsl = sslMode && sslMode.toUpperCase() !== 'DISABLED';

  const pool = mysql.createPool({
    host: url.hostname,
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username || ''),
    password: decodeURIComponent(url.password || ''),
    database: decodeURIComponent(url.pathname.replace(/^\//, '')),
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    dateStrings: true,
    ssl: shouldUseSsl ? { rejectUnauthorized: false } : undefined,
  });

  return pool;
}

const connectionString = process.env.DATABASE_URL;

const pool = createPoolFromConnectionString(connectionString);

module.exports = { pool, createPoolFromConnectionString };
