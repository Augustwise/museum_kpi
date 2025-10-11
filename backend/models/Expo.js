const mongoose = require('mongoose');

/**
 * Minimal schema for an exhibition ("expo"). Keeping the shape narrow makes it
 * easy to seed example data for workshops or demos.
 */
const ExpoSchema = new mongoose.Schema(
  {
    expoId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    author: {
      type: String,
      trim: true,
      default: '',
    },
    photoUrl: {
      type: String,
      trim: true,
      default: '',
    },
    date: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Expo', ExpoSchema);
