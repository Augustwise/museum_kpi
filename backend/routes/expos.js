const express = require('express');
const {
  selectAllExpos,
  selectExpoByExpoId,
  insertExpo,
  updateExpoByExpoId,
  deleteExpoByExpoId,
} = require('../models/expoModel');
const authenticate = require('../middleware/auth');

const router = express.Router();

// Apply authentication once for the whole router.
router.use(authenticate);

const EXPO_ID_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const TITLE_MIN_LENGTH = 3;
const DESCRIPTION_MIN_LENGTH = 10;
const AUTHOR_MIN_LENGTH = 2;

function toCleanString(value) {
  return String(value ?? '').trim();
}

function parseDate(value) {
  const parsedDate = new Date(value);
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
}

function validateExpoCreation(body = {}) {
  const normalized = {
    expoId: toCleanString(body.expoId),
    title: toCleanString(body.title),
    description: toCleanString(body.description),
    author: toCleanString(body.author),
    photoUrl: toCleanString(body.photoUrl),
    date: toCleanString(body.date),
  };

  const errors = {};

  if (!normalized.expoId) {
    errors.expoId = 'Expo id is required.';
  } else if (!EXPO_ID_REGEX.test(normalized.expoId)) {
    errors.expoId = 'Expo id may only contain lowercase letters, numbers and hyphens.';
  }

  if (!normalized.title) {
    errors.title = 'Title is required.';
  } else if (normalized.title.length < TITLE_MIN_LENGTH) {
    errors.title = `Title must be at least ${TITLE_MIN_LENGTH} characters long.`;
  }

  if (!normalized.description) {
    errors.description = 'Description is required.';
  } else if (normalized.description.length < DESCRIPTION_MIN_LENGTH) {
    errors.description = `Description must be at least ${DESCRIPTION_MIN_LENGTH} characters long.`;
  }

  let parsedDate = null;
  if (!normalized.date) {
    errors.date = 'Date is required.';
  } else {
    parsedDate = parseDate(normalized.date);
    if (!parsedDate) {
      errors.date = 'Date must be a valid date.';
    }
  }

  if (normalized.author && normalized.author.length < AUTHOR_MIN_LENGTH) {
    errors.author = 'Author must be at least two characters long.';
  }

  if (normalized.photoUrl) {
    try {
      const url = new URL(normalized.photoUrl);
      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        errors.photoUrl = 'Photo URL must start with http or https.';
      }
    } catch (error) {
      errors.photoUrl = 'Photo URL must be a valid URL.';
    }
  }

  const sanitized = {
    expoId: normalized.expoId,
    title: normalized.title,
    description: normalized.description,
    author: normalized.author,
    photoUrl: normalized.photoUrl,
    date: parsedDate,
  };

  return { errors, sanitized };
}

function validateExpoUpdate(body = {}) {
  const normalized = {
    title: body.title !== undefined ? toCleanString(body.title) : undefined,
    description: body.description !== undefined ? toCleanString(body.description) : undefined,
    author: body.author !== undefined ? toCleanString(body.author) : undefined,
    photoUrl: body.photoUrl !== undefined ? toCleanString(body.photoUrl) : undefined,
    date: body.date !== undefined ? toCleanString(body.date) : undefined,
  };

  const errors = {};
  const updates = {};

  if (normalized.title !== undefined) {
    if (!normalized.title) {
      errors.title = 'Title cannot be empty.';
    } else if (normalized.title.length < TITLE_MIN_LENGTH) {
      errors.title = `Title must be at least ${TITLE_MIN_LENGTH} characters long.`;
    } else {
      updates.title = normalized.title;
    }
  }

  if (normalized.description !== undefined) {
    if (!normalized.description) {
      errors.description = 'Description cannot be empty.';
    } else if (normalized.description.length < DESCRIPTION_MIN_LENGTH) {
      errors.description = `Description must be at least ${DESCRIPTION_MIN_LENGTH} characters long.`;
    } else {
      updates.description = normalized.description;
    }
  }

  if (normalized.author !== undefined) {
    if (normalized.author && normalized.author.length < AUTHOR_MIN_LENGTH) {
      errors.author = 'Author must be at least two characters long.';
    } else {
      updates.author = normalized.author || '';
    }
  }

  if (normalized.photoUrl !== undefined) {
    if (!normalized.photoUrl) {
      updates.photoUrl = '';
    } else {
      try {
        const url = new URL(normalized.photoUrl);
        if (url.protocol !== 'http:' && url.protocol !== 'https:') {
          errors.photoUrl = 'Photo URL must start with http or https.';
        } else {
          updates.photoUrl = normalized.photoUrl;
        }
      } catch (error) {
        errors.photoUrl = 'Photo URL must be a valid URL.';
      }
    }
  }

  if (normalized.date !== undefined) {
    if (!normalized.date) {
      errors.date = 'Date cannot be empty.';
    } else {
      const parsedDate = parseDate(normalized.date);
      if (!parsedDate) {
        errors.date = 'Date must be a valid date.';
      } else {
        updates.date = parsedDate;
      }
    }
  }

  return { errors, updates };
}

/**
 * GET /api/expos
 * Returns every expo sorted by date.
 */
router.get('/', async (_req, res) => {
  try {
    const expos = await selectAllExpos();
    return res.json(expos);
  } catch (error) {
    console.error('Failed to list expos:', error);
    return res.status(500).json({ message: 'Server error while fetching expos.' });
  }
});

/**
 * GET /api/expos/:expoId
 * Finds an expo by its human-friendly expoId.
 */
router.get('/:expoId', async (req, res) => {
  try {
    const expoId = toCleanString(req.params.expoId);
    const expo = await selectExpoByExpoId(expoId);

    if (!expo) {
      return res.status(404).json({ message: 'Expo not found.' });
    }

    return res.json(expo);
  } catch (error) {
    console.error('Failed to read expo:', error);
    return res.status(500).json({ message: 'Server error while fetching expo.' });
  }
});

/**
 * POST /api/expos
 * Creates a new expo from the provided payload.
 */
router.post('/', async (req, res) => {
  try {
    const { errors, sanitized } = validateExpoCreation(req.body || {});

    if (Object.keys(errors).length) {
      return res.status(400).json({
        message: 'Please correct the highlighted fields and try again.',
        errors,
      });
    }

    const existingExpo = await selectExpoByExpoId(sanitized.expoId);
    if (existingExpo) {
      return res.status(409).json({
        message: 'An expo with this expoId already exists.',
        errors: { expoId: 'This expo id is already in use.' },
      });
    }

    const expo = await insertExpo(sanitized);

    return res.status(201).json({ message: 'Expo created successfully.', expo });
  } catch (error) {
    console.error('Failed to create expo:', error);
    return res.status(500).json({ message: 'Server error while creating expo.' });
  }
});

/**
 * PUT /api/expos/:expoId
 * Updates selected fields of an expo.
 */
router.put('/:expoId', async (req, res) => {
  try {
    const expoId = toCleanString(req.params.expoId);
    const { errors, updates } = validateExpoUpdate(req.body || {});

    if (Object.keys(errors).length) {
      return res.status(400).json({
        message: 'Please correct the highlighted fields and try again.',
        errors,
      });
    }

    if (!Object.keys(updates).length) {
      return res.status(400).json({ message: 'Please provide at least one field to update.' });
    }

    const updatedExpo = await updateExpoByExpoId(expoId, updates);

    if (!updatedExpo) {
      return res.status(404).json({ message: 'Expo not found.' });
    }

    return res.json({ message: 'Expo updated successfully.', expo: updatedExpo });
  } catch (error) {
    console.error('Failed to update expo:', error);
    return res.status(500).json({ message: 'Server error while updating expo.' });
  }
});

/**
 * DELETE /api/expos/:expoId
 * Deletes an expo entirely.
 */
router.delete('/:expoId', async (req, res) => {
  try {
    const expoId = toCleanString(req.params.expoId);
    const deleted = await deleteExpoByExpoId(expoId);

    if (!deleted) {
      return res.status(404).json({ message: 'Expo not found.' });
    }

    return res.json({ message: 'Expo deleted successfully.' });
  } catch (error) {
    console.error('Failed to delete expo:', error);
    return res.status(500).json({ message: 'Server error while deleting expo.' });
  }
});

module.exports = router;
