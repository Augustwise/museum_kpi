const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const { pool } = require('./db');

const app = express();

app.use(cors());
app.use(express.json());

function mapUser(dbRow) {
  if (!dbRow) {
    return null;
  }

  return {
    id: dbRow.id,
    firstName: dbRow.first_name,
    lastName: dbRow.last_name,
    birthDate: dbRow.birth_date,
    gender: dbRow.gender,
    email: dbRow.email,
    phone: dbRow.phone,
  };
}

function normalizePhone(phone) {
  if (!phone) {
    return null;
  }

  const cleaned = phone.replace(/\s+/g, '');
  return cleaned.length ? cleaned : null;
}

app.post('/api/register', async (req, res) => {
  const {
    firstName,
    lastName,
    birthDate,
    gender = null,
    email,
    phone = null,
    password,
  } = req.body || {};

  if (!firstName || !lastName || !birthDate || !email || !password) {
    return res
      .status(400)
      .json({ error: 'Будь ласка, заповніть усі обов\'язкові поля.' });
  }

  try {
    const trimmedFirstName = firstName.trim();
    const trimmedLastName = lastName.trim();
    const normalizedEmail = email.trim().toLowerCase();

    if (!trimmedFirstName || !trimmedLastName || !normalizedEmail) {
      return res
        .status(400)
        .json({ error: 'Будь ласка, перевірте коректність введених даних.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const normalizedPhone = normalizePhone(phone);

    const [result] = await pool.execute(
      `INSERT INTO Users (first_name, last_name, birth_date, gender, email, phone, password)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
        .replace(/\s+/g, ' '),
      [
        trimmedFirstName,
        trimmedLastName,
        birthDate,
        gender || null,
        normalizedEmail,
        normalizedPhone,
        hashedPassword,
      ]
    );

    const userId = result.insertId;

    const [rows] = await pool.execute(
      `SELECT id, first_name, last_name, birth_date, gender, email, phone
         FROM Users
        WHERE id = ?`,
      [userId]
    );

    const user = mapUser(rows[0]);
    return res.status(201).json({ user });
  } catch (error) {
    if (error && error.code === 'ER_DUP_ENTRY') {
      return res
        .status(409)
        .json({ error: 'Користувач з такою електронною поштою вже існує.' });
    }

    console.error('Register error:', error);
    return res
      .status(500)
      .json({ error: 'Сталася помилка під час створення користувача.' });
  }
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res
      .status(400)
      .json({ error: 'Необхідно вказати електронну пошту та пароль.' });
  }

  try {
    const [rows] = await pool.execute(
      `SELECT id, first_name, last_name, birth_date, gender, email, phone, password
         FROM Users
        WHERE email = ?`,
      [email.trim().toLowerCase()]
    );

    if (!rows.length) {
      return res
        .status(401)
        .json({ error: 'Невірна електронна пошта або пароль.' });
    }

    const dbUser = rows[0];
    const passwordsMatch = await bcrypt.compare(password, dbUser.password);

    if (!passwordsMatch) {
      return res
        .status(401)
        .json({ error: 'Невірна електронна пошта або пароль.' });
    }

    const user = mapUser(dbUser);
    return res.json({ user });
  } catch (error) {
    console.error('Login error:', error);
    return res
      .status(500)
      .json({ error: 'Сталася помилка під час авторизації.' });
  }
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 3000;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

module.exports = { app };
