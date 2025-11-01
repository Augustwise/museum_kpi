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

function mapAdmin(dbRow) {
  if (!dbRow) {
    return null;
  }

  return {
    id: dbRow.id,
    firstName: dbRow.first_name,
    lastName: dbRow.last_name,
    gender: dbRow.gender,
    email: dbRow.email,
    phone: dbRow.phone,
  };
}

function mapExhibition(dbRow) {
  if (!dbRow) {
    return null;
  }

  return {
    id: dbRow.id,
    name: dbRow.name,
    imageUrl: dbRow.image_url,
    startDate: dbRow.start_date,
    endDate: dbRow.end_date,
    availableSeats: dbRow.available_seats,
    adminId: dbRow.admin_id,
    adminName: dbRow.admin_name || null,
  };
}

async function requireAdmin(adminId) {
  if (!adminId) {
    return null;
  }

  const [rows] = await pool.execute(
    `SELECT id, first_name, last_name, gender, email, phone
       FROM Admins
      WHERE id = ?`,
    [adminId]
  );

  return rows.length ? mapAdmin(rows[0]) : null;
}

function parseAdminId(headerValue) {
  if (!headerValue) {
    return null;
  }

  const id = Number(headerValue);
  return Number.isFinite(id) ? id : null;
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
    const [rows] = await pool.execute(
      `SELECT id, first_name, last_name, gender, email, phone, password
         FROM Admins
        WHERE email = ?`,
      [email.trim().toLowerCase()]
    );

    if (!rows.length) {
      return res
        .status(401)
        .json({ error: 'Невірна електронна пошта або пароль.' });
    }

    const adminRow = rows[0];
    const passwordsMatch = await bcrypt.compare(password, adminRow.password);

    if (!passwordsMatch) {
      return res
        .status(401)
        .json({ error: 'Невірна електронна пошта або пароль.' });
    }

    const admin = mapAdmin(adminRow);
    return res.json({ admin });
  } catch (error) {
    console.error('Admin login error:', error);
    return res
      .status(500)
      .json({ error: 'Сталася помилка під час авторизації.' });
  }
});

app.get('/api/admin/exhibitions', async (req, res) => {
  try {
    const adminId = parseAdminId(req.header('x-admin-id'));
    const admin = await requireAdmin(adminId);

    if (!admin) {
      return res.status(401).json({ error: 'Необхідно увійти як адміністратор.' });
    }

    const [rows] = await pool.execute(
      `SELECT e.id, e.name, e.image_url, e.start_date, e.end_date, e.available_seats, e.admin_id,
              CONCAT(a.first_name, ' ', a.last_name) AS admin_name
         FROM Exhibitions e
         JOIN Admins a ON e.admin_id = a.id
        ORDER BY e.start_date, e.id`
    );

    const exhibitions = rows.map(mapExhibition);
    return res.json({ exhibitions });
  } catch (error) {
    console.error('Fetch exhibitions error:', error);
    return res
      .status(500)
      .json({ error: 'Не вдалося отримати список виставок.' });
  }
});

app.post('/api/admin/exhibitions', async (req, res) => {
  const adminId = parseAdminId(req.header('x-admin-id'));

  try {
    const admin = await requireAdmin(adminId);

    if (!admin) {
      return res.status(401).json({ error: 'Необхідно увійти як адміністратор.' });
    }

    const {
      name,
      imageUrl = null,
      startDate,
      endDate,
      availableSeats,
    } = req.body || {};

    if (!name || !startDate || !endDate || availableSeats === undefined) {
      return res
        .status(400)
        .json({ error: 'Будь ласка, заповніть усі обов\'язкові поля.' });
    }

    const trimmedName = name.trim();
    const seatsNumber = Number(availableSeats);

    if (!trimmedName || !Number.isFinite(seatsNumber)) {
      return res
        .status(400)
        .json({ error: 'Перевірте правильність введених даних.' });
    }

    const [result] = await pool.execute(
      `INSERT INTO Exhibitions (name, image_url, start_date, end_date, available_seats, admin_id)
       VALUES (?, ?, ?, ?, ?, ?)`
        .replace(/\s+/g, ' '),
      [trimmedName, imageUrl || null, startDate, endDate, seatsNumber, admin.id]
    );

    const [rows] = await pool.execute(
      `SELECT e.id, e.name, e.image_url, e.start_date, e.end_date, e.available_seats, e.admin_id,
              CONCAT(a.first_name, ' ', a.last_name) AS admin_name
         FROM Exhibitions e
         JOIN Admins a ON e.admin_id = a.id
        WHERE e.id = ?`,
      [result.insertId]
    );

    const exhibition = mapExhibition(rows[0]);
    return res.status(201).json({ exhibition });
  } catch (error) {
    console.error('Create exhibition error:', error);
    return res
      .status(500)
      .json({ error: 'Не вдалося створити виставку.' });
  }
});

app.put('/api/admin/exhibitions/:id', async (req, res) => {
  const adminId = parseAdminId(req.header('x-admin-id'));
  const exhibitionId = Number(req.params.id);

  if (!Number.isFinite(exhibitionId)) {
    return res.status(400).json({ error: 'Некоректний ідентифікатор виставки.' });
  }

  try {
    const admin = await requireAdmin(adminId);

    if (!admin) {
      return res.status(401).json({ error: 'Необхідно увійти як адміністратор.' });
    }

    const {
      name,
      imageUrl = null,
      startDate,
      endDate,
      availableSeats,
    } = req.body || {};

    if (!name || !startDate || !endDate || availableSeats === undefined) {
      return res
        .status(400)
        .json({ error: 'Будь ласка, заповніть усі обов\'язкові поля.' });
    }

    const trimmedName = name.trim();
    const seatsNumber = Number(availableSeats);

    if (!trimmedName || !Number.isFinite(seatsNumber)) {
      return res
        .status(400)
        .json({ error: 'Перевірте правильність введених даних.' });
    }

    await pool.execute(
      `UPDATE Exhibitions
          SET name = ?,
              image_url = ?,
              start_date = ?,
              end_date = ?,
              available_seats = ?,
              admin_id = ?
        WHERE id = ?`
        .replace(/\s+/g, ' '),
      [
        trimmedName,
        imageUrl || null,
        startDate,
        endDate,
        seatsNumber,
        admin.id,
        exhibitionId,
      ]
    );

    const [rows] = await pool.execute(
      `SELECT e.id, e.name, e.image_url, e.start_date, e.end_date, e.available_seats, e.admin_id,
              CONCAT(a.first_name, ' ', a.last_name) AS admin_name
         FROM Exhibitions e
         JOIN Admins a ON e.admin_id = a.id
        WHERE e.id = ?`,
      [exhibitionId]
    );

    const exhibition = rows.length ? mapExhibition(rows[0]) : null;

    if (!exhibition) {
      return res.status(404).json({ error: 'Виставку не знайдено.' });
    }

    return res.json({ exhibition });
  } catch (error) {
    console.error('Update exhibition error:', error);
    return res
      .status(500)
      .json({ error: 'Не вдалося оновити виставку.' });
  }
});

app.delete('/api/admin/exhibitions/:id', async (req, res) => {
  const adminId = parseAdminId(req.header('x-admin-id'));
  const exhibitionId = Number(req.params.id);

  if (!Number.isFinite(exhibitionId)) {
    return res.status(400).json({ error: 'Некоректний ідентифікатор виставки.' });
  }

  try {
    const admin = await requireAdmin(adminId);

    if (!admin) {
      return res.status(401).json({ error: 'Необхідно увійти як адміністратор.' });
    }

    const [result] = await pool.execute(
      `DELETE FROM Exhibitions WHERE id = ?`,
      [exhibitionId]
    );

    if (!result.affectedRows) {
      return res.status(404).json({ error: 'Виставку не знайдено.' });
    }

    return res.status(204).send();
  } catch (error) {
    console.error('Delete exhibition error:', error);
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
