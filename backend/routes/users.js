const express = require('express');
const { selectAdminsOrdered, deleteUsersByIds } = require('../models/userModel');
const authenticate = require('../middleware/auth');

const router = express.Router();

// Protect every route under /api/users.
router.use(authenticate);

function summarizeUser(user) {
  return {
    id: String(user.id),
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    middleName: user.middleName || '',
    gender: user.gender || null,
    createdAt: user.createdAt,
  };
}

/**
 * GET /api/users
 * Returns a simple list of users for the admin table.
 */
router.get('/', async (_req, res) => {
  try {
    const users = await selectAdminsOrdered();
    const simplifiedUsers = users.map(summarizeUser);
    return res.json(simplifiedUsers);
  } catch (error) {
    console.error('Failed to list users:', error);
    return res.status(500).json({ message: 'Server error while fetching users.' });
  }
});

// Normalizes and validates an array of ids supplied by the client.
function normalizeIds(rawIds) {
  if (!Array.isArray(rawIds)) {
    return [];
  }

  return rawIds
    .map((value) => Number.parseInt(String(value ?? '').trim(), 10))
    .filter((value) => Number.isInteger(value) && value > 0);
}

/**
 * DELETE /api/users
 * Deletes the users whose ids are supplied in the request body.
 */
router.delete('/', async (req, res) => {
  try {
    const validIds = normalizeIds(req.body?.ids);

    if (!validIds.length) {
      return res.status(400).json({ message: 'Please provide at least one valid user id.' });
    }

    const deletionResult = await deleteUsersByIds(validIds);

    return res.json({
      message: 'Users deleted successfully.',
      deletedCount: deletionResult.deletedCount || 0,
    });
  } catch (error) {
    console.error('Failed to delete users:', error);
    return res.status(500).json({ message: 'Server error while deleting users.' });
  }
});

module.exports = router;
