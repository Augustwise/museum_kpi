const express = require('express');
const mongoose = require('mongoose');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

router.use(auth);

router.get('/', async (req, res) => {
  try {
    const users = await User.find({}).sort({ createdAt: -1 });
    const normalized = users.map((user) => ({
      id: user._id.toString(),
      email: user.email,
      lastName: user.lastName,
      firstName: user.firstName,
      middleName: user.middleName || '',
      gender: user.gender || null,
      createdAt: user.createdAt,
    }));

    return res.json(normalized);
  } catch (err) {
    console.error('List admins error:', err);
    return res.status(500).json({ message: 'Помилка сервера' });
  }
});

router.delete('/', async (req, res) => {
  try {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];
    const validIds = ids
      .map((id) => (typeof id === 'string' || typeof id === 'number' ? String(id) : null))
      .filter((id) => id && mongoose.Types.ObjectId.isValid(id));

    if (!validIds.length) {
      return res.status(400).json({ message: 'Немає користувачів для видалення' });
    }

    const result = await User.deleteMany({ _id: { $in: validIds } });
    return res.json({
      message: 'Користувачів видалено',
      deletedCount: result?.deletedCount || 0,
    });
  } catch (err) {
    console.error('Delete admins error:', err);
    return res.status(500).json({ message: 'Помилка сервера' });
  }
});

module.exports = router;
