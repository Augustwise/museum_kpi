const mysql = require('mysql2/promise');

let cachedPool = null;
let cachedConnectionInfo = null;

function buildPoolConfig(connectionString) {
  if (!connectionString) {
    throw new Error('Missing DATABASE_URL in the environment variables.');
  }

  let url;
  try {
    url = new URL(connectionString);
  } catch (error) {
    throw new Error(`Invalid DATABASE_URL provided: ${error.message}`);
  }

  const database = decodeURIComponent(url.pathname.replace(/^\//, ''));
  const sslMode = (url.searchParams.get('ssl-mode') || '').toUpperCase();

  const config = {
    host: url.hostname,
    port: url.port ? Number(url.port) : 3306,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  };

  if (sslMode === 'REQUIRED') {
    config.ssl = { rejectUnauthorized: true };
  }

  cachedConnectionInfo = {
    host: config.host,
    port: config.port,
    database: config.database,
    sslMode: sslMode || 'DISABLED',
  };

  return config;
}

function createPool() {
  if (cachedPool) {
    return cachedPool;
  }

  const connectionString = process.env.DATABASE_URL;
  const poolConfig = buildPoolConfig(connectionString);
  cachedPool = mysql.createPool(poolConfig);
  return cachedPool;
}

function getPool() {
  return cachedPool || createPool();
}

const pool = getPool();

module.exports = {
  pool,
  getPool,
  connectionInfo: () => ({ ...cachedConnectionInfo }),
};
