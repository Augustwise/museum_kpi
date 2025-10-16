const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { findUserByEmail, insertUser } = require('../models/userModel');

const router = express.Router();

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\+380 \d{2} \d{3} \d{2} \d{2}$/;
const NAME_REGEX = /^[A-Za-zА-Яа-яЁёІіЇїЄє'’\-\s]+$/u;
const PASSWORD_MIN_LENGTH = 6;
const NAME_MIN_LENGTH = 2;
const EARLIEST_BIRTH_DATE = new Date('1900-01-01');
const ALLOWED_GENDERS = new Set(['male', 'female']);

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

function normalizeGender(rawGender) {
  const gender = toCleanString(rawGender).toLowerCase();
  return ALLOWED_GENDERS.has(gender) ? gender : '';
}

function validateRegistrationBody(body = {}) {
  const normalized = {
    email: normalizeEmail(body.email),
    password: toCleanString(body.password),
    firstName: toCleanString(body.firstName),
    lastName: toCleanString(body.lastName),
    middleName: toCleanString(body.middleName),
    gender: normalizeGender(body.gender),
    birthDate: toCleanString(body.birthDate),
    phone: toCleanString(body.phone),
  };

  const errors = {};

  if (!normalized.email) {
    errors.email = 'Email is required.';
  } else if (!EMAIL_REGEX.test(normalized.email)) {
    errors.email = 'Email must be valid.';
  }

  if (!normalized.password) {
    errors.password = 'Password is required.';
  } else if (normalized.password.length < PASSWORD_MIN_LENGTH) {
    errors.password = `Password must be at least ${PASSWORD_MIN_LENGTH} characters long.`;
  }

  ['firstName', 'lastName'].forEach((field) => {
    const value = normalized[field];
    const label = field === 'firstName' ? 'First name' : 'Last name';
    if (!value) {
      errors[field] = `${label} is required.`;
      return;
    }
    if (value.length < NAME_MIN_LENGTH) {
      errors[field] = `${label} must be at least ${NAME_MIN_LENGTH} characters.`;
      return;
    }
    if (!NAME_REGEX.test(value)) {
      errors[field] = `${label} may only contain letters, apostrophes and hyphens.`;
    }
  });

  if (normalized.middleName) {
    if (normalized.middleName.length < NAME_MIN_LENGTH) {
      errors.middleName = 'Middle name must be at least two characters.';
    } else if (!NAME_REGEX.test(normalized.middleName)) {
      errors.middleName = 'Middle name may only contain letters, apostrophes and hyphens.';
    }
  }

  if (normalized.gender && !ALLOWED_GENDERS.has(normalized.gender)) {
    errors.gender = 'Gender must be either "male" or "female" if provided.';
  }

  let parsedBirthDate = null;
  if (!normalized.birthDate) {
    errors.birthDate = 'Birth date is required.';
  } else {
    parsedBirthDate = parseBirthDate(normalized.birthDate);
    if (!parsedBirthDate) {
      errors.birthDate = 'Birth date must be a valid date.';
    } else {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (parsedBirthDate > today) {
        errors.birthDate = 'Birth date cannot be in the future.';
      } else if (parsedBirthDate < EARLIEST_BIRTH_DATE) {
        errors.birthDate = 'Birth date must be after 1900-01-01.';
      }
    }
  }

  if (!normalized.phone) {
    errors.phone = 'Phone number is required.';
  } else if (!PHONE_REGEX.test(normalized.phone)) {
    errors.phone = 'Phone number must match the pattern +380 00 000 00 00.';
  }

  const sanitized = {
    email: normalized.email,
    password: normalized.password,
    firstName: normalized.firstName,
    lastName: normalized.lastName,
    middleName: normalized.middleName,
    gender: normalized.gender || null,
    birthDate: parsedBirthDate,
    phone: normalized.phone,
  };

  return { errors, sanitized };
}

function validateLoginBody(body = {}) {
  const normalized = {
    email: normalizeEmail(body.email),
    password: toCleanString(body.password),
  };

  const errors = {};

  if (!normalized.email) {
    errors.email = 'Email is required.';
  } else if (!EMAIL_REGEX.test(normalized.email)) {
    errors.email = 'Email must be valid.';
  }

  if (!normalized.password) {
    errors.password = 'Password is required.';
  } else if (normalized.password.length < PASSWORD_MIN_LENGTH) {
    errors.password = `Password must be at least ${PASSWORD_MIN_LENGTH} characters long.`;
  }

  return { errors, sanitized: normalized };
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
    const { errors, sanitized } = validateRegistrationBody(req.body || {});

    if (Object.keys(errors).length) {
      return res.status(400).json({
        message: 'Please correct the highlighted fields and try again.',
        errors,
      });
    }

    const existingUser = await findUserByEmail(sanitized.email);
    if (existingUser) {
      return res.status(409).json({
        message: 'A user with this email already exists.',
        errors: { email: 'This email is already registered.' },
      });
    }

    const passwordHash = await bcrypt.hash(sanitized.password, 10);

    const user = await insertUser({
      email: sanitized.email,
      passwordHash,
      firstName: sanitized.firstName,
      lastName: sanitized.lastName,
      middleName: sanitized.middleName,
      gender: sanitized.gender,
      birthDate: sanitized.birthDate,
      phone: sanitized.phone,
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
    const { errors, sanitized } = validateLoginBody(req.body || {});

    if (Object.keys(errors).length) {
      return res.status(400).json({
        message: 'Please correct the highlighted fields and try again.',
        errors,
      });
    }

    const user = await findUserByEmail(sanitized.email);
    if (!user) {
      return res.status(401).json({ message: 'Incorrect email or password.' });
    }

    const passwordMatches = await bcrypt.compare(sanitized.password, user.passwordHash);
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
