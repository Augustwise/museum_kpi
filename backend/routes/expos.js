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

const REQUIRED_EXPO_FIELDS = ['expoId', 'title', 'description', 'date'];
const MUTABLE_FIELDS = ['title', 'description', 'date', 'author', 'photoUrl'];

function toCleanString(value) {
  return String(value ?? '').trim();
}

function parseDate(value) {
  const parsedDate = new Date(value);
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
}

// Converts raw request values into neatly trimmed strings and dates.
function readExpoPayload(body = {}) {
  const normalized = {
    expoId: toCleanString(body.expoId),
    title: toCleanString(body.title),
    description: toCleanString(body.description),
    author: toCleanString(body.author),
    photoUrl: toCleanString(body.photoUrl),
    date: parseDate(body.date),
  };

  return normalized;
}

// Builds an update object that only includes fields we allow to change.
function buildExpoUpdate(body = {}) {
  const updates = {};

  for (const field of MUTABLE_FIELDS) {
    if (body[field] === undefined) continue;

    updates[field] = field === 'date' ? parseDate(body[field]) : toCleanString(body[field]);
  }

  return updates;
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
    const payload = readExpoPayload(req.body);

    for (const field of REQUIRED_EXPO_FIELDS) {
      if (!payload[field]) {
        return res.status(400).json({
          message: 'Please provide expoId, title, description and date for the new expo.',
        });
      }
    }

    if (!payload.date) {
      return res.status(400).json({ message: 'The provided date is not valid.' });
    }

    const existingExpo = await selectExpoByExpoId(payload.expoId);
    if (existingExpo) {
      return res.status(409).json({ message: 'An expo with this expoId already exists.' });
    }

    const expo = await insertExpo(payload);

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
    const updates = buildExpoUpdate(req.body);

    if (updates.date === null) {
      return res.status(400).json({ message: 'The provided date is not valid.' });
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
