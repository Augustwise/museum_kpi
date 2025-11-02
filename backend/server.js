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

const PHONE_REGEX = /^\+380\d{9}$/;

function normalizePhone(phone) {
  if (typeof phone !== 'string') {
    return null;
  }

  const cleaned = phone.replace(/\s+/g, '');
  return cleaned.length ? cleaned : null;
}

function isValidPhone(phone) {
  if (typeof phone !== 'string') {
    return false;
  }

  return PHONE_REGEX.test(phone);
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

    if (normalizedPhone && !isValidPhone(normalizedPhone)) {
      return res
        .status(400)
        .json({ error: 'Номер телефону має бути у форматі +380XXXXXXXXX.' });
    }

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

app.put('/api/users/:id', async (req, res) => {
  const userId = Number(req.params.id);

  if (!Number.isInteger(userId) || userId <= 0) {
    return res
      .status(400)
      .json({ error: 'Некоректний ідентифікатор користувача.' });
  }

  const { email, phone, password, currentPassword } = req.body || {};

  if (
    email === undefined &&
    phone === undefined &&
    password === undefined
  ) {
    return res
      .status(400)
      .json({ error: 'Не вказано даних для оновлення.' });
  }

  try {
    const [rows] = await pool.execute(
      `SELECT id, first_name, last_name, birth_date, gender, email, phone, password
         FROM Users
        WHERE id = ?`,
      [userId]
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'Користувача не знайдено.' });
    }

    const dbUser = rows[0];
    const updates = [];
    const params = [];

    if (email !== undefined) {
      if (typeof email !== 'string') {
        return res.status(400).json({ error: 'Некоректна електронна пошта.' });
      }

      const normalizedEmail = email.trim().toLowerCase();

      if (!normalizedEmail) {
        return res.status(400).json({ error: 'Некоректна електронна пошта.' });
      }

      if (normalizedEmail !== dbUser.email) {
        const [existingEmailRows] = await pool.execute(
          `SELECT id FROM Users WHERE email = ? AND id <> ?`,
          [normalizedEmail, userId]
        );

        if (existingEmailRows.length) {
          return res
            .status(409)
            .json({ error: 'Користувач з такою електронною поштою вже існує.' });
        }

        updates.push('email = ?');
        params.push(normalizedEmail);
      }
    }

    if (phone !== undefined) {
      let normalizedPhone = null;

      if (phone === null) {
        normalizedPhone = null;
      } else if (typeof phone === 'string') {
        normalizedPhone = normalizePhone(phone);

        if (normalizedPhone && !isValidPhone(normalizedPhone)) {
          return res
            .status(400)
            .json({ error: 'Номер телефону має бути у форматі +380XXXXXXXXX.' });
        }
      } else {
        return res.status(400).json({ error: 'Некоректний номер телефону.' });
      }

      const currentPhone =
        typeof dbUser.phone === 'string' ? normalizePhone(dbUser.phone) : null;

      if (normalizedPhone !== currentPhone) {
        updates.push('phone = ?');
        params.push(normalizedPhone);
      }
    }

    if (password !== undefined) {
      if (typeof password !== 'string' || !password.trim()) {
        return res
          .status(400)
          .json({ error: 'Новий пароль не може бути порожнім.' });
      }

      if (password.trim().length < 6) {
        return res
          .status(400)
          .json({ error: 'Пароль має містити щонайменше 6 символів.' });
      }

      if (!currentPassword || typeof currentPassword !== 'string') {
        return res
          .status(400)
          .json({ error: 'Поточний пароль є обов\'язковим.' });
      }

      let passwordsMatch = false;

      try {
        passwordsMatch = await bcrypt.compare(currentPassword, dbUser.password);
      } catch (compareError) {
        console.warn('User password compare warning:', compareError);
      }

      if (!passwordsMatch) {
        return res
          .status(400)
          .json({ error: 'Поточний пароль вказано невірно.' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      updates.push('password = ?');
      params.push(hashedPassword);
    }

    if (!updates.length) {
      return res.json({ user: mapUser(dbUser) });
    }

    const updateQuery = `UPDATE Users SET ${updates.join(', ')} WHERE id = ?`;
    params.push(userId);

    await pool.execute(updateQuery, params);

    const [updatedRows] = await pool.execute(
      `SELECT id, first_name, last_name, birth_date, gender, email, phone
         FROM Users
        WHERE id = ?`,
      [userId]
    );

    return res.json({ user: mapUser(updatedRows[0]) });
  } catch (error) {
    console.error('User update error:', error);
    return res
      .status(500)
      .json({ error: 'Не вдалося оновити дані акаунту.' });
  }
});

app.delete('/api/users/:id', async (req, res) => {
  const userId = Number(req.params.id);

  if (!Number.isInteger(userId) || userId <= 0) {
    return res
      .status(400)
      .json({ error: 'Некоректний ідентифікатор користувача.' });
  }

  try {
    const [result] = await pool.execute(`DELETE FROM Users WHERE id = ?`, [
      userId,
    ]);

    if (!result.affectedRows) {
      return res.status(404).json({ error: 'Користувача не знайдено.' });
    }

    return res.status(204).send();
  } catch (error) {
    console.error('User delete error:', error);
    return res
      .status(500)
      .json({ error: 'Не вдалося видалити акаунт.' });
  }
});

app.get('/api/exhibitions', async (_req, res) => {
  try {
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
        WHERE e.available_seats > 0
        ORDER BY e.start_date, e.end_date, e.name`
    );

    const exhibitions = rows.map(mapExhibition);
    return res.json({ exhibitions });
  } catch (error) {
    console.error('Public exhibitions fetch error:', error);
    return res
      .status(500)
      .json({ error: 'Не вдалося отримати список виставок.' });
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
