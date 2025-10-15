const { pool } = require('../db');

function toDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function mapExpoRow(row) {
  if (!row) return null;

  return {
    id: String(row.id),
    expoId: row.expo_id,
    title: row.title,
    description: row.description,
    author: row.author || '',
    photoUrl: row.photo_url || '',
    date: toDate(row.date),
    createdAt: toDate(row.created_at),
    updatedAt: toDate(row.updated_at),
  };
}

async function selectAllExpos() {
  const [rows] = await pool.query('SELECT * FROM expos ORDER BY date ASC');
  return rows.map(mapExpoRow);
}

async function selectExpoByExpoId(expoId) {
  const [rows] = await pool.query('SELECT * FROM expos WHERE expo_id = ? LIMIT 1', [expoId]);
  return mapExpoRow(rows[0]);
}

async function insertExpo({ expoId, title, description, author, photoUrl, date }) {
  const now = new Date();
  const [result] = await pool.query(
    `INSERT INTO expos (expo_id, title, description, author, photo_url, date, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [expoId, title, description, author || '', photoUrl || '', date, now, now]
  );

  return selectExpoByExpoId(expoId);
}

async function updateExpoByExpoId(expoId, updates = {}) {
  const allowedColumns = {
    title: 'title',
    description: 'description',
    author: 'author',
    photoUrl: 'photo_url',
    date: 'date',
  };

  const setClauses = [];
  const values = [];

  for (const [key, column] of Object.entries(allowedColumns)) {
    if (updates[key] === undefined) continue;
    setClauses.push(`${column} = ?`);
    values.push(updates[key]);
  }

  if (!setClauses.length) {
    return selectExpoByExpoId(expoId);
  }

  setClauses.push('updated_at = ?');
  values.push(new Date());
  values.push(expoId);

  const sql = `UPDATE expos SET ${setClauses.join(', ')} WHERE expo_id = ?`;
  const [result] = await pool.query(sql, values);

  if (!result.affectedRows) {
    return null;
  }

  return selectExpoByExpoId(expoId);
}

async function deleteExpoByExpoId(expoId) {
  const [result] = await pool.query('DELETE FROM expos WHERE expo_id = ?', [expoId]);
  return result.affectedRows > 0;
}

module.exports = {
  selectAllExpos,
  selectExpoByExpoId,
  insertExpo,
  updateExpoByExpoId,
  deleteExpoByExpoId,
  // Legacy aliases kept for compatibility where needed.
  listExpos: selectAllExpos,
  getExpoByExpoId: selectExpoByExpoId,
  createExpo: insertExpo,
};
