const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();

const signToken = (user) => {
  const secret = process.env.JWT_SECRET || 'dev_secret_change_me';
  const payload = { sub: String(user._id), email: user.email };
  // 7 days expiry
  return jwt.sign(payload, secret, { expiresIn: '7d' });
};

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { email, password, lastName, firstName, middleName = '', birthDate, gender, phone } = req.body;

    if (!email || !password || !lastName || !firstName || !birthDate || !phone) {
      return res
        .status(400)
        .json({ message: 'Вкажіть email, пароль, прізвище, ім’я, дату народження та номер телефону' });
    }

    const normalizedPhone = String(phone).trim();
    const ukrainePhonePattern = /^\+380 \d{2} \d{3} \d{2} \d{2}$/;
    if (!ukrainePhonePattern.test(normalizedPhone)) {
      return res.status(400).json({ message: 'Номер телефону має бути у форматі +380 00 000 00 00' });
    }

    let normalizedGender;
    if (gender !== undefined && gender !== null && gender !== '') {
      const allowedGenders = ['male', 'female'];
      if (!allowedGenders.includes(gender)) {
        return res.status(400).json({ message: 'Некоректне значення статі' });
      }
      normalizedGender = gender;
    }

    const exists = await User.findOne({ email: email.toLowerCase().trim() });
    if (exists) {
      return res.status(409).json({ message: 'Користувач з таким email вже існує' });
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const userData = {
      email: email.toLowerCase().trim(),
      passwordHash,
      lastName: String(lastName).trim(),
      firstName: String(firstName).trim(),
      middleName: String(middleName || '').trim(),
      birthDate: new Date(birthDate),
      phone: normalizedPhone,
    };

    if (normalizedGender) {
      userData.gender = normalizedGender;
    }

    const user = new User(userData);

    await user.save();

    const token = signToken(user);

    return res.status(201).json({
      message: 'Користувача створено',
      token,
      user: {
        id: user._id,
        email: user.email,
        lastName: user.lastName,
        firstName: user.firstName,
        middleName: user.middleName,
        gender: user.gender || null,
        birthDate: user.birthDate,
        phone: user.phone,
      },
    });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ message: 'Помилка сервера' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Вкажіть email та пароль' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({ message: 'Невірний email або пароль' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ message: 'Невірний email або пароль' });
    }

    const token = signToken(user);

    return res.status(200).json({
      message: 'Успішний вхід',
      token,
      user: {
        id: user._id,
        email: user.email,
        lastName: user.lastName,
        firstName: user.firstName,
        middleName: user.middleName,
        gender: user.gender || null,
        birthDate: user.birthDate,
        phone: user.phone,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ message: 'Помилка сервера' });
  }
});

// GET /api/auth/verify
router.get('/verify', (req, res) => {
  try {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) {
      return res.status(401).json({ message: 'Відсутній токен' });
    }
    const secret = process.env.JWT_SECRET || 'dev_secret_change_me';
    const payload = jwt.verify(token, secret);
    return res.status(200).json({ message: 'OK', payload });
  } catch (err) {
    return res.status(401).json({ message: 'Недійсний токен' });
  }
});

module.exports = router;