const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const UserModel = require('../models/userModel');

const router = express.Router();

const REQUIRED_REGISTRATION_FIELDS = ['email', 'password', 'firstName', 'lastName', 'birthDate', 'phone'];

/**
 * Utility helpers keep the route handlers short and descriptive.
 */
function toCleanString(value) {
  return String(value ?? '').trim();
}

function normalizeEmail(email) {
  return toCleanString(email).toLowerCase();
}

function parseBirthDate(rawBirthDate) {
  const birthDate = new Date(rawBirthDate);
  return Number.isNaN(birthDate.getTime()) ? null : birthDate;
}

function extractTokenFromHeader(headerValue = '') {
  return headerValue.startsWith('Bearer ') ? headerValue.slice(7) : '';
}

function buildUserResponse(user) {
  return {
    id: String(user.id),
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    middleName: user.middleName || '',
    gender: user.gender || null,
    birthDate: user.birthDate,
    phone: user.phone,
  };
}

function signToken(user) {
  const secret = process.env.JWT_SECRET || 'dev_secret_change_me';
  const payload = { id: String(user.id), email: user.email };
  return jwt.sign(payload, secret, { expiresIn: '7d' });
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const body = req.body || {};

    // Gather and normalize every field we care about.
    const registrationInput = {
      email: normalizeEmail(body.email),
      password: toCleanString(body.password),
      firstName: toCleanString(body.firstName),
      lastName: toCleanString(body.lastName),
      middleName: toCleanString(body.middleName),
      phone: toCleanString(body.phone),
      gender: body.gender ? toCleanString(body.gender) : undefined,
      birthDate: parseBirthDate(body.birthDate),
    };

    // Make sure the basics are present before we continue.
    for (const fieldName of REQUIRED_REGISTRATION_FIELDS) {
      if (!registrationInput[fieldName]) {
        return res.status(400).json({
          message: 'Please provide all required fields: email, password, first name, last name, birth date and phone.',
        });
      }
    }

    const allowedGenders = ['male', 'female'];
    if (registrationInput.gender && !allowedGenders.includes(registrationInput.gender)) {
      return res.status(400).json({ message: 'Gender must be either "male" or "female".' });
    }

    const existingUser = await UserModel.getUserByEmail(registrationInput.email);
    if (existingUser) {
      return res.status(409).json({ message: 'A user with this email already exists.' });
    }

    const passwordHash = await bcrypt.hash(registrationInput.password, 10);

    const user = await UserModel.createUser({
      email: registrationInput.email,
      passwordHash,
      firstName: registrationInput.firstName,
      lastName: registrationInput.lastName,
      middleName: registrationInput.middleName,
      gender: registrationInput.gender,
      birthDate: registrationInput.birthDate,
      phone: registrationInput.phone,
    });

    const token = signToken(user);

    return res.status(201).json({
      message: 'User created successfully.',
      token,
      user: buildUserResponse(user),
    });
  } catch (error) {
    console.error('Register error:', error);
    return res.status(500).json({ message: 'Server error while registering user.' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const body = req.body || {};
    const email = normalizeEmail(body.email);
    const password = toCleanString(body.password);

    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide both email and password.' });
    }

    const user = await UserModel.getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ message: 'Incorrect email or password.' });
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) {
      return res.status(401).json({ message: 'Incorrect email or password.' });
    }

    const token = signToken(user);

    return res.json({
      message: 'Logged in successfully.',
      token,
      user: buildUserResponse(user),
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Server error while logging in.' });
  }
});

// GET /api/auth/verify
router.get('/verify', (req, res) => {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);

    if (!token) {
      return res.status(401).json({ message: 'Authorization token is missing.' });
    }

    const secret = process.env.JWT_SECRET || 'dev_secret_change_me';
    const payload = jwt.verify(token, secret);

    return res.json({ message: 'Token is valid.', payload });
  } catch (error) {
    console.error('Verify error:', error);
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
});

module.exports = router;
