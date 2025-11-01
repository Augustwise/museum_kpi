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

function mapExhibition(dbRow) {
  if (!dbRow) {
    return null;
  }

  const availableSeats = Number(dbRow.available_seats);
  const adminId = Number(dbRow.admin_id);

  const exhibition = {
    id: dbRow.id,
    name: dbRow.name,
    imageUrl: dbRow.image_url,
    startDate: dbRow.start_date,
    endDate: dbRow.end_date,
    availableSeats: Number.isNaN(availableSeats)
      ? dbRow.available_seats
      : availableSeats,
    adminId: Number.isNaN(adminId) ? dbRow.admin_id : adminId,
  };

  if (dbRow.admin_name) {
    exhibition.adminName = dbRow.admin_name;
  }

  return exhibition;
}

function isValidDate(value) {
  if (!value) {
    return false;
  }

  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime());
}

async function findAdminById(adminId) {
  const id = Number(adminId);

  if (!Number.isInteger(id) || id <= 0) {
    return null;
  }

  const [rows] = await pool.execute(
    `SELECT id, first_name, last_name FROM Admins WHERE id = ?`,
    [id]
  );

  return rows[0] || null;
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

app.post('/api/admin/login', async (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res
      .status(400)
      .json({ error: 'Необхідно вказати електронну пошту та пароль.' });
  }

  try {
    const normalizedEmail = email.trim().toLowerCase();

    const [rows] = await pool.execute(
      `SELECT id, first_name, last_name, email, password
         FROM Admins
        WHERE LOWER(email) = ?`,
      [normalizedEmail]
    );

    if (!rows.length) {
      return res
        .status(401)
        .json({ error: 'Невірна електронна пошта або пароль.' });
    }

    const admin = rows[0];

    let passwordsMatch = false;

    try {
      passwordsMatch = await bcrypt.compare(password, admin.password);
    } catch (compareError) {
      console.warn('Admin password compare warning:', compareError);
    }

    if (!passwordsMatch && admin.password === password) {
      passwordsMatch = true;
    }

    if (!passwordsMatch) {
      return res
        .status(401)
        .json({ error: 'Невірна електронна пошта або пароль.' });
    }

    return res.json({
      admin: {
        id: admin.id,
        firstName: admin.first_name,
        lastName: admin.last_name,
        email: admin.email,
      },
    });
  } catch (error) {
    console.error('Admin login error:', error);
    return res
      .status(500)
      .json({ error: 'Сталася помилка під час авторизації адміністратора.' });
  }
});

app.get('/api/admin/exhibitions', async (req, res) => {
  const adminId = Number(req.query.adminId);

  if (!Number.isInteger(adminId) || adminId <= 0) {
    return res
      .status(400)
      .json({ error: 'Не вказано адміністратора.' });
  }

  try {
    const admin = await findAdminById(adminId);

    if (!admin) {
      return res.status(403).json({ error: 'Адміністратора не знайдено.' });
    }

    const [rows] = await pool.execute(
      `SELECT e.id,
              e.name,
              e.image_url,
              e.start_date,
              e.end_date,
              e.available_seats,
              e.admin_id,
              CONCAT(a.first_name, ' ', a.last_name) AS admin_name
         FROM Exhibitions e
         JOIN Admins a ON e.admin_id = a.id
        ORDER BY e.start_date, e.end_date, e.name`,
      []
    );

    const exhibitions = rows.map(mapExhibition);
    return res.json({ exhibitions });
  } catch (error) {
    console.error('Admin exhibitions fetch error:', error);
    return res
      .status(500)
      .json({ error: 'Не вдалося отримати список виставок.' });
  }
});

app.post('/api/admin/exhibitions', async (req, res) => {
  const {
    adminId,
    name,
    imageUrl = null,
    startDate,
    endDate,
    availableSeats,
  } = req.body || {};

  const trimmedName = typeof name === 'string' ? name.trim() : '';
  const normalizedImageUrl =
    typeof imageUrl === 'string' && imageUrl.trim() ? imageUrl.trim() : null;
  const numericAdminId = Number(adminId);

  if (!Number.isInteger(numericAdminId) || numericAdminId <= 0) {
    return res
      .status(400)
      .json({ error: 'Некоректний ідентифікатор адміністратора.' });
  }

  if (!trimmedName || !startDate || !endDate) {
    return res
      .status(400)
      .json({ error: 'Будь ласка, заповніть усі обов\'язкові поля.' });
  }

  const seats = Number(availableSeats);

  if (!Number.isInteger(seats) || seats < 0) {
    return res
      .status(400)
      .json({ error: 'Кількість місць має бути невід\'ємним цілим числом.' });
  }

  if (!isValidDate(startDate) || !isValidDate(endDate)) {
    return res
      .status(400)
      .json({ error: 'Некоректний формат дати.' });
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (start > end) {
    return res
      .status(400)
      .json({ error: 'Дата початку не може бути пізніше дати завершення.' });
  }

  try {
    const admin = await findAdminById(numericAdminId);

    if (!admin) {
      return res.status(403).json({ error: 'Адміністратора не знайдено.' });
    }

    const [result] = await pool.execute(
      `INSERT INTO Exhibitions (name, image_url, start_date, end_date, available_seats, admin_id)
       VALUES (?, ?, ?, ?, ?, ?)`
        .replace(/\s+/g, ' '),
      [trimmedName, normalizedImageUrl, startDate, endDate, seats, numericAdminId]
    );

    const [rows] = await pool.execute(
      `SELECT e.id,
              e.name,
              e.image_url,
              e.start_date,
              e.end_date,
              e.available_seats,
              e.admin_id,
              CONCAT(a.first_name, ' ', a.last_name) AS admin_name
         FROM Exhibitions e
         JOIN Admins a ON e.admin_id = a.id
        WHERE e.id = ?`,
      [result.insertId]
    );

    return res.status(201).json({ exhibition: mapExhibition(rows[0]) });
  } catch (error) {
    console.error('Admin exhibition create error:', error);
    return res
      .status(500)
      .json({ error: 'Не вдалося створити виставку.' });
  }
});

app.put('/api/admin/exhibitions/:id', async (req, res) => {
  const exhibitionId = Number(req.params.id);

  if (!Number.isInteger(exhibitionId) || exhibitionId <= 0) {
    return res.status(400).json({ error: 'Некоректний ідентифікатор виставки.' });
  }

  const {
    adminId,
    name,
    imageUrl = null,
    startDate,
    endDate,
    availableSeats,
  } = req.body || {};

  const trimmedName = typeof name === 'string' ? name.trim() : '';
  const normalizedImageUrl =
    typeof imageUrl === 'string' && imageUrl.trim() ? imageUrl.trim() : null;
  const numericAdminId = Number(adminId);

  if (!Number.isInteger(numericAdminId) || numericAdminId <= 0) {
    return res
      .status(400)
      .json({ error: 'Некоректний ідентифікатор адміністратора.' });
  }

  if (!trimmedName || !startDate || !endDate) {
    return res
      .status(400)
      .json({ error: 'Будь ласка, заповніть усі обов\'язкові поля.' });
  }

  const seats = Number(availableSeats);

  if (!Number.isInteger(seats) || seats < 0) {
    return res
      .status(400)
      .json({ error: 'Кількість місць має бути невід\'ємним цілим числом.' });
  }

  if (!isValidDate(startDate) || !isValidDate(endDate)) {
    return res
      .status(400)
      .json({ error: 'Некоректний формат дати.' });
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (start > end) {
    return res
      .status(400)
      .json({ error: 'Дата початку не може бути пізніше дати завершення.' });
  }

  try {
    const admin = await findAdminById(numericAdminId);

    if (!admin) {
      return res.status(403).json({ error: 'Адміністратора не знайдено.' });
    }

    const [existingRows] = await pool.execute(
      `SELECT id, admin_id FROM Exhibitions WHERE id = ?`,
      [exhibitionId]
    );

    if (!existingRows.length) {
      return res.status(404).json({ error: 'Виставку не знайдено.' });
    }

    const exhibitionAdminId = Number(existingRows[0].admin_id);

    if (Number.isNaN(exhibitionAdminId) || exhibitionAdminId !== numericAdminId) {
      return res
        .status(403)
        .json({ error: 'Немає прав для редагування цієї виставки.' });
    }

    await pool.execute(
      `UPDATE Exhibitions
          SET name = ?,
              image_url = ?,
              start_date = ?,
              end_date = ?,
              available_seats = ?
        WHERE id = ?`
        .replace(/\s+/g, ' '),
      [trimmedName, normalizedImageUrl, startDate, endDate, seats, exhibitionId]
    );

    const [rows] = await pool.execute(
      `SELECT e.id,
              e.name,
              e.image_url,
              e.start_date,
              e.end_date,
              e.available_seats,
              e.admin_id,
              CONCAT(a.first_name, ' ', a.last_name) AS admin_name
         FROM Exhibitions e
         JOIN Admins a ON e.admin_id = a.id
        WHERE e.id = ?`,
      [exhibitionId]
    );

    return res.json({ exhibition: mapExhibition(rows[0]) });
  } catch (error) {
    console.error('Admin exhibition update error:', error);
    return res
      .status(500)
      .json({ error: 'Не вдалося оновити виставку.' });
  }
});

app.delete('/api/admin/exhibitions/:id', async (req, res) => {
  const exhibitionId = Number(req.params.id);
  const adminId = Number(req.query.adminId);

  if (
    !Number.isInteger(exhibitionId) ||
    exhibitionId <= 0 ||
    !Number.isInteger(adminId) ||
    adminId <= 0
  ) {
    return res.status(400).json({ error: 'Не вказано виставку або адміністратора.' });
  }

  try {
    const admin = await findAdminById(adminId);

    if (!admin) {
      return res.status(403).json({ error: 'Адміністратора не знайдено.' });
    }

    const [existingRows] = await pool.execute(
      `SELECT id, admin_id FROM Exhibitions WHERE id = ?`,
      [exhibitionId]
    );

    if (!existingRows.length) {
      return res.status(404).json({ error: 'Виставку не знайдено.' });
    }

    const exhibitionAdminId = Number(existingRows[0].admin_id);

    if (Number.isNaN(exhibitionAdminId) || exhibitionAdminId !== adminId) {
      return res
        .status(403)
        .json({ error: 'Немає прав для видалення цієї виставки.' });
    }

    await pool.execute(`DELETE FROM Exhibitions WHERE id = ?`, [exhibitionId]);

    return res.status(204).send();
  } catch (error) {
    console.error('Admin exhibition delete error:', error);
    return res
      .status(500)
      .json({ error: 'Не вдалося видалити виставку.' });
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
