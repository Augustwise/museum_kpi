const { pool } = require('../db');

function toDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function mapUserRow(row) {
  if (!row) return null;

  return {
    id: String(row.id),
    email: row.email,
    passwordHash: row.password_hash,
    firstName: row.first_name,
    lastName: row.last_name,
    middleName: row.middle_name || '',
    gender: row.gender || null,
    birthDate: toDate(row.birth_date),
    phone: row.phone || '',
    createdAt: toDate(row.created_at),
    updatedAt: toDate(row.updated_at),
  };
}

async function getUserByEmail(email) {
  const [rows] = await pool.query('SELECT * FROM users WHERE email = ? LIMIT 1', [email]);
  return mapUserRow(rows[0]);
}

async function getUserById(id) {
  const [rows] = await pool.query('SELECT * FROM users WHERE id = ? LIMIT 1', [id]);
  return mapUserRow(rows[0]);
}

async function createUser({
  email,
  passwordHash,
  firstName,
  lastName,
  middleName,
  gender,
  birthDate,
  phone,
}) {
  const now = new Date();
  const [result] = await pool.query(
    `INSERT INTO users (email, password_hash, first_name, last_name, middle_name, gender, birth_date, phone, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [email, passwordHash, firstName, lastName, middleName || '', gender || null, birthDate || null, phone || '', now, now]
  );

  return getUserById(result.insertId);
}

async function listUsers() {
  const [rows] = await pool.query('SELECT * FROM users ORDER BY created_at DESC');
  return rows.map(mapUserRow);
}

async function deleteUsersByIds(ids = []) {
  if (!ids.length) {
    return { deletedCount: 0 };
  }

  const placeholders = ids.map(() => '?').join(', ');
  const [result] = await pool.query(`DELETE FROM users WHERE id IN (${placeholders})`, ids);
  return { deletedCount: result.affectedRows || 0 };
}

module.exports = {
  mapUserRow,
  getUserByEmail,
  getUserById,
  createUser,
  listUsers,
  deleteUsersByIds,
};
