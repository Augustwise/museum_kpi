const express = require('express');
const Expo = require('../models/Expo');
const auth = require('../middleware/auth');

const router = express.Router();
router.use(auth);

// GET /api/expos
router.get('/', async (req, res) => {
  try {
    const expos = await Expo.find({}).sort({ date: 1 });
    res.json(expos);
  } catch (err) {
    console.error('List expos error:', err);
    res.status(500).json({ message: 'Помилка сервера' });
  }
});

// GET /api/expos/:expoId
// Get expo by business key "expoId"
router.get('/:expoId', async (req, res) => {
  try {
    const { expoId } = req.params;
    const expo = await Expo.findOne({ expoId: String(expoId).trim() });
    if (!expo) {
      return res.status(404).json({ message: 'Виставку не знайдено' });
    }
    res.json(expo);
  } catch (err) {
    console.error('Get expo error:', err);
    res.status(500).json({ message: 'Помилка сервера' });
  }
});

// POST /api/expos
// Create new expo
router.post('/', async (req, res) => {
  try {
    const { expoId, title, description, date, author = '', photoUrl = '' } = req.body;

    if (!expoId || !title || !description || !date) {
      return res.status(400).json({ message: 'Вкажіть назву, опис та дату' });
    }

    const exists = await Expo.findOne({ expoId: String(expoId).trim() });
    if (exists) {
      return res.status(409).json({ message: 'Виставка з таким expoId вже існує' });
    }

    const expo = new Expo({
      expoId: String(expoId).trim(),
      title: String(title).trim(),
      description: String(description).trim(),
      author: String(author || '').trim(),
      photoUrl: String(photoUrl || '').trim(),
      date: new Date(date),
    });

    await expo.save();
    res.status(201).json({ message: 'Виставку створено', expo });
  } catch (err) {
    console.error('Create expo error:', err);
    res.status(500).json({ message: 'Помилка сервера' });
  }
});

// PUT /api/expos/:expoId
// Update expo by business key "expoId"
router.put('/:expoId', async (req, res) => {
  try {
    const { expoId } = req.params;
    const updates = {};
    const allowed = ['title', 'description', 'date', 'author', 'photoUrl'];

    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        if (key === 'date') {
          updates[key] = new Date(req.body[key]);
        } else {
          updates[key] = String(req.body[key]).trim();
        }
      }
    }

    const updated = await Expo.findOneAndUpdate(
      { expoId: String(expoId).trim() },
      { $set: updates },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: 'Виставку не знайдено' });
    }

    res.json({ message: 'Виставку оновлено', expo: updated });
  } catch (err) {
    console.error('Update expo error:', err);
    res.status(500).json({ message: 'Помилка сервера' });
  }
});

// DELETE /api/expos/:expoId
// Delete expo by business key "expoId"
router.delete('/:expoId', async (req, res) => {
  try {
    const { expoId } = req.params;
    const deleted = await Expo.findOneAndDelete({ expoId: String(expoId).trim() });
    if (!deleted) {
      return res.status(404).json({ message: 'Виставку не знайдено' });
    }
    res.json({ message: 'Виставку видалено' });
  } catch (err) {
    console.error('Delete expo error:', err);
    res.status(500).json({ message: 'Помилка сервера' });
  }
});

module.exports = router;